"""PostgreSQL: a URL do Render, os limites de tamanho e o fluxo inteiro num PostgreSQL de verdade.

O último teste só roda com VALIDA_TESTE_PG_URL apontando para um banco de teste (ele apaga e recria as tabelas):
    VALIDA_TESTE_PG_URL=postgresql://postgres@127.0.0.1:5433/teste python -m pytest tests/test_banco_postgresql.py
"""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, normalizar_url, obter_sessao
from app.main import app
from app.servicos.regras import inicializar_regras

DADOS_OK = {"nome": "Maria da Silva", "cpf": "123.456.789-09", "email": "Maria@Exemplo.com",
            "data_nascimento": "28/02/1990", "municipio": "espigao doeste"}


@pytest.mark.parametrize("entrada, saida", [
    ("postgres://u:s@host:5432/valida", "postgresql+psycopg://u:s@host:5432/valida"),  # como o Render entrega
    ("postgresql://u:s@host/valida", "postgresql+psycopg://u:s@host/valida"),
    ("postgresql+psycopg://u:s@host/valida", "postgresql+psycopg://u:s@host/valida"),  # já no formato
    ("sqlite:///./valida.db", "sqlite:///./valida.db"),
])
def test_normaliza_a_url_do_banco(entrada, saida):
    assert normalizar_url(entrada) == saida


def test_cadastro_com_nome_e_email_longos_e_gravado(cliente):
    # O validador aceita; o PostgreSQL recusaria se a coluna tivesse limite (o SQLite ignora limites)
    nome = " ".join(["Maria"] * 60)
    email = "a" * 250 + "@exemplo.com"
    resposta = cliente.post("/cadastros", json={**DADOS_OK, "nome": nome, "email": email})
    assert resposta.status_code == 201 and len(resposta.json()["cadastro"]["nome"]) == len(nome)


@pytest.mark.parametrize("corpo", [{"ajuda": "a" * 301}, {"formato_esperado": "a" * 101}])
def test_texto_da_cagd_maior_que_a_coluna_volta_422(cliente, corpo):
    assert cliente.put("/regras/telefone", json=corpo).status_code == 422


@pytest.mark.skipif(not os.getenv("VALIDA_TESTE_PG_URL"), reason="sem PostgreSQL de teste (VALIDA_TESTE_PG_URL)")
def test_fluxo_completo_num_postgresql_de_verdade():
    engine = create_engine(normalizar_url(os.environ["VALIDA_TESTE_PG_URL"]), pool_pre_ping=True)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine)() as sessao:
        inicializar_regras(sessao)
        app.dependency_overrides[obter_sessao] = lambda: sessao
        try:
            cliente = TestClient(app)
            # validar: bloqueado e aprovado, com padronização
            bloqueado = cliente.post("/validar", json={"sistema_origem": "sistema_b",
                                                       "dados": {**DADOS_OK, "email": "maria@"}}).json()
            assert [(e["campo"], e["regra"]) for e in bloqueado["erros"]] == [("email", "dominio_valido")]
            aprovado = cliente.post("/validar", json={"sistema_origem": "sistema_b", "dados": DADOS_OK}).json()
            assert aprovado["dados_padronizados"]["municipio_codigo_ibge"] == "1100098"
            # cadastro gravado padronizado, inclusive com nome longo
            nome_longo = " ".join(["Maria"] * 60)
            assert cliente.post("/cadastros", json={**DADOS_OK, "nome": nome_longo}).status_code == 201
            assert cliente.get("/cadastros").json()[0]["data_nascimento"] == "1990-02-28"
            # regra muda e vale na hora, com histórico
            assert cliente.put("/regras/telefone", json={"obrigatorio": True}).status_code == 200
            sem_telefone = cliente.post("/validar", json={"sistema_origem": "sistema_b", "dados": DADOS_OK}).json()
            assert ("telefone", "obrigatorio") in [(e["campo"], e["regra"]) for e in sem_telefone["erros"]]
            assert cliente.get("/regras/historico").json()[0]["valor_novo"] == "true"
            # painel com as contagens e o tempo
            painel = cliente.get("/painel/erros").json()
            assert painel["total_validacoes"] == 4 and painel["total_bloqueadas"] == 2
            assert painel["tempo_medio_ms"] is not None
        finally:
            app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()
