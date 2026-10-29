import pytest

from app.servicos.validacao import REGRAS_PADRAO, ConfigCampo, validar_dados

DADOS_VALIDOS = {
    "nome": "Maria  da silva",
    "cpf": "123.456.789-09",
    "email": "Maria@Exemplo.com",
    "data_nascimento": "28/02/1990",
}


def com(**alteracoes):
    return {**DADOS_VALIDOS, **alteracoes}


def regras_por_campo(resposta):
    return [(erro.campo, erro.regra) for erro in resposta.erros]


def test_dados_validos_voltam_padronizados():
    resposta = validar_dados(DADOS_VALIDOS, REGRAS_PADRAO)
    assert resposta.valido
    assert resposta.erros == []
    assert resposta.dados_padronizados == {
        "nome": "Maria da Silva",
        "cpf": "12345678909",
        "email": "maria@exemplo.com",
        "data_nascimento": "1990-02-28",
    }


@pytest.mark.parametrize(
    "email, esperado",
    [
        ("maria", [("email", "possui_arroba"), ("email", "dominio_valido")]),
        ("maria@", [("email", "dominio_valido")]),
    ],
)
def test_erros_em_camadas_do_email(email, esperado):
    resposta = validar_dados(com(email=email), REGRAS_PADRAO)
    assert not resposta.valido
    assert resposta.dados_padronizados is None
    assert regras_por_campo(resposta) == esperado


def test_erros_de_varios_campos_de_uma_vez():
    resposta = validar_dados(com(email="maria@", data_nascimento="31/02/1990"), REGRAS_PADRAO)
    assert regras_por_campo(resposta) == [
        ("email", "dominio_valido"),
        ("data_nascimento", "data_existente"),
    ]


@pytest.mark.parametrize("valor", [None, "", "   "])
def test_campo_obrigatorio_vazio(valor):
    resposta = validar_dados(com(cpf=valor), REGRAS_PADRAO)
    assert regras_por_campo(resposta) == [("cpf", "obrigatorio")]
    assert resposta.erros[0].formato_esperado == "000.000.000-00"


def test_campo_obrigatorio_ausente():
    dados = {k: v for k, v in DADOS_VALIDOS.items() if k != "nome"}
    resposta = validar_dados(dados, REGRAS_PADRAO)
    assert regras_por_campo(resposta) == [("nome", "obrigatorio")]


def test_campo_opcional_vazio_nao_gera_erro_nem_aparece():
    regras = {**REGRAS_PADRAO, "email": ConfigCampo(obrigatorio=False)}
    resposta = validar_dados(com(email="  "), regras)
    assert resposta.valido
    assert "email" not in resposta.dados_padronizados


def test_campo_opcional_preenchido_e_validado():
    regras = {**REGRAS_PADRAO, "email": ConfigCampo(obrigatorio=False)}
    resposta = validar_dados(com(email="maria@"), regras)
    assert regras_por_campo(resposta) == [("email", "dominio_valido")]


def test_campo_inativo_e_ignorado():
    regras = {**REGRAS_PADRAO, "cpf": ConfigCampo(obrigatorio=True, ativo=False)}
    resposta = validar_dados(com(cpf="111.111.111-11"), regras)
    assert resposta.valido
    assert "cpf" not in resposta.dados_padronizados


def test_todo_erro_tem_campo_regra_e_mensagem():
    resposta = validar_dados({"email": "maria"}, REGRAS_PADRAO)
    assert resposta.erros
    for erro in resposta.erros:
        assert erro.campo and erro.regra and erro.mensagem
