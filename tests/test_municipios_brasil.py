"""Municípios do Brasil inteiro com a UF opcional. Sem UF, tudo continua como antes (Rondônia)."""

import pytest

from app.dados.municipios_ro import MUNICIPIOS_RO
from app.validadores.municipio import MUNICIPIOS_POR_UF, UFS, validar_municipio

DADOS = {"nome": "Maria da Silva", "cpf": "123.456.789-09", "email": "maria@exemplo.com", "data_nascimento": "28/02/1990"}


def test_base_do_ibge_tem_o_brasil_inteiro():
    assert len(UFS) == 27
    assert sum(map(len, MUNICIPIOS_POR_UF.values())) >= 5570
    assert len(MUNICIPIOS_POR_UF["SP"]) == 645
    assert {tuple(m) for m in MUNICIPIOS_POR_UF["RO"]} == set(MUNICIPIOS_RO)  # mesma fonte para Rondônia


@pytest.mark.parametrize("valor, uf, nome, codigo", [
    ("sao paulo", "SP", "São Paulo", "3550308"),
    ("RIO DE JANEIRO", "rj", "Rio de Janeiro", "3304557"),
    ("Brasilia", "DF", "Brasília", "5300108"),
    ("porto velho", "RO", "Porto Velho", "1100205"),
])
def test_valida_na_uf_informada_e_devolve_a_uf(valor, uf, nome, codigo):
    resultado = validar_municipio(valor, uf)
    assert resultado.valor == nome
    assert resultado.extras == {"municipio_codigo_ibge": codigo, "municipio_uf": uf.upper()}


def test_nomes_repetidos_entre_estados_sao_resolvidos_pela_uf():
    # Há "Bom Jesus" em vários estados: a UF decide qual é
    pi = validar_municipio("Bom Jesus", "PI").extras["municipio_codigo_ibge"]
    rs = validar_municipio("Bom Jesus", "RS").extras["municipio_codigo_ibge"]
    assert pi != rs and pi.startswith("22") and rs.startswith("43")


def test_sem_uf_continua_rondonia_exatamente_como_antes():
    assert validar_municipio("porto velho").extras == {"municipio_codigo_ibge": "1100205"}  # sem municipio_uf
    falha = validar_municipio("São Paulo").falhas[0]
    assert falha.regra == "municipio_ro" and falha.mensagem.startswith("Município não encontrado em Rondônia.")


def test_municipio_que_nao_e_da_uf_sugere_o_mais_parecido_dela():
    falha = validar_municipio("Campnas", "SP").falhas[0]
    assert falha.regra == "municipio_existente"
    assert falha.mensagem == "Município não encontrado em SP. Você quis dizer Campinas?"
    assert falha.formato_esperado == "Município de SP"
    assert validar_municipio("Porto Velho", "SP").falhas[0].regra == "municipio_existente"


@pytest.mark.parametrize("uf", ["XX", "São Paulo", "S"])
def test_uf_inexistente_da_erro_claro(uf):
    falha = validar_municipio("Campinas", uf).falhas[0]
    assert falha.regra == "uf_valida" and "sigla do estado" in falha.mensagem


def test_validar_com_uf_pela_api(cliente):
    aprovado = cliente.post("/validar", json={"sistema_origem": "x", "dados": {**DADOS, "municipio": "campinas", "uf": "sp"}}).json()
    padronizados = aprovado["dados_padronizados"]
    assert padronizados["municipio"] == "Campinas"
    assert padronizados["municipio_codigo_ibge"] == "3509502" and padronizados["municipio_uf"] == "SP"
    sem_uf = cliente.post("/validar", json={"sistema_origem": "x", "dados": {**DADOS, "municipio": "campinas"}}).json()
    assert [(e["campo"], e["regra"]) for e in sem_uf["erros"]] == [("municipio", "municipio_ro")]
    uf_errada = cliente.post("/validar", json={"sistema_origem": "x", "dados": {**DADOS, "municipio": "campinas", "uf": "São Paulo"}})
    assert uf_errada.status_code == 200 and uf_errada.json()["erros"][0]["regra"] == "uf_valida"


def test_lista_de_municipios_por_uf(cliente):
    assert len(cliente.get("/municipios").json()) == 52  # padrão: Rondônia, como antes
    sp = cliente.get("/municipios?uf=sp").json()
    assert len(sp) == 645 and {"nome": "Campinas", "codigo_ibge": "3509502"} in sp
    assert cliente.get("/municipios?uf=XX").status_code == 404


def test_uf_e_campo_reservado_para_regra_de_formato(cliente):
    resposta = cliente.post("/regras-formato", json={"campo": "uf", "nome": "UF", "molde": "AA"})
    assert resposta.status_code == 409
