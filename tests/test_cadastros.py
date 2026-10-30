import pytest
from sqlalchemy import func, select

from app.models import Cadastro, FalhaValidacao, Validacao
from app.rotas.cadastros import EXEMPLOS_REQUISICAO, EXEMPLOS_RESPOSTA

DADOS_VALIDOS = {
    "nome": "Maria  da silva",
    "cpf": "123.456.789-09",
    "email": "Maria@Exemplo.com",
    "data_nascimento": "28/02/1990",
}


def contar(sessao, tabela):
    return sessao.scalar(select(func.count()).select_from(tabela))


def sem_variaveis(resposta):
    # id e criado_em mudam a cada execução
    resposta = dict(resposta)
    if resposta["cadastro"]:
        resposta["cadastro"] = {k: v for k, v in resposta["cadastro"].items() if k not in ("id", "criado_em")}
    return resposta


# Demo, passos 1 a 3


def test_dado_invalido_nao_e_gravado(cliente, sessao):
    resposta = cliente.post("/cadastros", json={**DADOS_VALIDOS, "email": "maria@", "data_nascimento": "31/02/1990"})
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["gravado"] is False and corpo["cadastro"] is None
    assert [(e["campo"], e["regra"]) for e in corpo["erros"]] == [
        ("email", "dominio_valido"),
        ("data_nascimento", "data_existente"),
    ]
    assert contar(sessao, Cadastro) == 0
    assert cliente.get("/cadastros").json() == []


def test_dado_valido_e_gravado_padronizado(cliente):
    resposta = cliente.post("/cadastros", json={**DADOS_VALIDOS, "municipio": "ji parana"})
    assert resposta.status_code == 201
    cadastro = resposta.json()["cadastro"]
    assert cadastro["nome"] == "Maria da Silva"
    assert cadastro["cpf"] == "12345678909"
    assert cadastro["email"] == "maria@exemplo.com"
    assert cadastro["data_nascimento"] == "1990-02-28"
    assert cadastro["municipio"] == "Ji-Paraná"
    assert cadastro["municipio_codigo_ibge"] == "1100122"
    assert cadastro["telefone"] is None
    assert cliente.get("/cadastros").json() == [cadastro]


def test_listagem_mais_recentes_primeiro(cliente):
    cliente.post("/cadastros", json=DADOS_VALIDOS)
    cliente.post("/cadastros", json={**DADOS_VALIDOS, "nome": "joão dos santos"})
    nomes = [c["nome"] for c in cliente.get("/cadastros").json()]
    assert nomes == ["João dos Santos", "Maria da Silva"]


def test_cadastro_entra_no_painel_como_sistema_a(cliente, sessao):
    cliente.post("/cadastros", json=DADOS_VALIDOS)
    cliente.post("/cadastros", json={**DADOS_VALIDOS, "cpf": "111.111.111-11"})
    assert set(sessao.scalars(select(Validacao.sistema_origem))) == {"sistema_a"}
    falha = sessao.scalars(select(FalhaValidacao)).one()
    assert (falha.campo, falha.regra) == ("cpf", "digitos_repetidos")


def test_cadastro_obedece_a_regra_da_cagd(cliente, sessao):
    cliente.put("/regras/telefone", json={"obrigatorio": True})
    resposta = cliente.post("/cadastros", json=DADOS_VALIDOS).json()
    assert resposta["gravado"] is False
    assert [e["regra"] for e in resposta["erros"]] == ["obrigatorio"]
    assert contar(sessao, Cadastro) == 0


def test_campo_inativo_nao_e_gravado(cliente):
    cliente.put("/regras/email", json={"ativo": False})
    cadastro = cliente.post("/cadastros", json=DADOS_VALIDOS).json()["cadastro"]
    assert cadastro["email"] is None


@pytest.mark.parametrize("nome", ["bloqueado", "gravado"])
def test_exemplos_do_swagger_batem_com_a_resposta_real(cliente, nome):
    resposta = cliente.post("/cadastros", json=EXEMPLOS_REQUISICAO[nome]["value"]).json()
    assert sem_variaveis(resposta) == sem_variaveis(EXEMPLOS_RESPOSTA[nome])


def test_criado_em_vem_em_utc_com_fuso(cliente):
    # O navegador converte para o horário local; sem o fuso, o horário do servidor (UTC no Render)
    # aparecia como se fosse local: 4 h adiantado em Rondônia
    from datetime import datetime, timedelta, timezone

    criado_em = cliente.post("/cadastros", json=DADOS_VALIDOS).json()["cadastro"]["criado_em"]
    assert criado_em.endswith("Z")
    momento = datetime.fromisoformat(criado_em.replace("Z", "+00:00"))
    assert abs(datetime.now(timezone.utc) - momento) < timedelta(minutes=1)
    assert cliente.get("/cadastros").json()[0]["criado_em"] == criado_em
