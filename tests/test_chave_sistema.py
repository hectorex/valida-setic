"""Chave por sistema (X-API-Key): ninguém se passa por outro sistema no POST /validar."""

import pytest

from app import seguranca

DADOS = {"nome": "Maria da Silva", "cpf": "123.456.789-09", "email": "maria@", "data_nascimento": "31/02/1990"}
CHAVES = "sistema_b:chave-do-b;sistema_exemplo:chave-do-exemplo"


@pytest.fixture
def com_chaves(monkeypatch):
    monkeypatch.setenv("VALIDA_CHAVES_SISTEMAS", CHAVES)
    monkeypatch.setenv("VALIDA_USUARIOS_CAGD", "banca:Banca Avaliadora:senha-certa")


def sistemas_no_painel(cliente):
    token = cliente.post("/cagd/login", json={"usuario": "banca", "senha": "senha-certa"}).json()["token"]
    painel = cliente.get("/painel/erros", headers={"Authorization": f"Bearer {token}"}).json()
    return {s["sistema_origem"]: s["validacoes"] for s in painel["por_sistema"]}


def validar(cliente, sistema_origem="sistema_b", chave=None):
    cabecalhos = {"X-API-Key": chave} if chave else {}
    return cliente.post("/validar", json={"sistema_origem": sistema_origem, "dados": DADOS}, headers=cabecalhos)


def test_le_as_chaves_da_variavel(monkeypatch):
    monkeypatch.setenv("VALIDA_CHAVES_SISTEMAS", " sistema_b : chave:com:dois-pontos ; quebrado ; :sem-nome ;")
    assert seguranca.chaves_configuradas() == {"sistema_b": "chave:com:dois-pontos"}


def test_sem_chaves_configuradas_tudo_funciona_como_antes(cliente):
    resposta = validar(cliente, sistema_origem="qualquer_sistema")
    assert resposta.status_code == 200 and resposta.json()["valido"] is False


def test_com_chaves_sem_cabecalho_e_recusado_e_nada_entra_no_painel(cliente, com_chaves):
    resposta = validar(cliente)
    assert resposta.status_code == 401
    assert "X-API-Key" in resposta.json()["detail"]
    assert sistemas_no_painel(cliente) == {}


@pytest.mark.parametrize("chave", ["errada", "chave-do-b ", "CHAVE-DO-B", "chave-do-", "sistema_b"])
def test_chave_errada_e_recusada(cliente, com_chaves, chave):
    assert validar(cliente, chave=chave).status_code == 401


def test_chave_certa_valida_normalmente(cliente, com_chaves):
    resposta = validar(cliente, chave="chave-do-b")
    assert resposta.status_code == 200
    assert [(e["campo"], e["regra"]) for e in resposta.json()["erros"]] == [
        ("email", "dominio_valido"), ("data_nascimento", "data_existente")]


def test_painel_registra_o_dono_da_chave_e_nao_o_que_a_requisicao_diz(cliente, com_chaves):
    validar(cliente, sistema_origem="sistema_a", chave="chave-do-b")  # tenta se passar pelo Sistema A
    validar(cliente, sistema_origem="sistema_b", chave="chave-do-exemplo")
    assert sistemas_no_painel(cliente) == {"sistema_b": 1, "sistema_exemplo": 1}


def test_cadastros_do_sistema_a_nao_precisa_de_chave(cliente, com_chaves):
    # O POST /cadastros é o backend do próprio Sistema A: valida por dentro, sem passar pelo /validar público
    dados = {**DADOS, "email": "maria@exemplo.com", "data_nascimento": "28/02/1990"}
    assert cliente.post("/cadastros", json=dados).status_code == 201
    assert sistemas_no_painel(cliente) == {"sistema_a": 1}


def test_swagger_mostra_o_cabecalho_da_chave(cliente):
    esquema = cliente.get("/openapi.json").json()
    assert esquema["components"]["securitySchemes"]["APIKeyHeader"]["name"] == "X-API-Key"
    assert "401" in esquema["paths"]["/validar"]["post"]["responses"]
