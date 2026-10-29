import pytest

from app.rotas.validar import EXEMPLOS_REQUISICAO, EXEMPLOS_RESPOSTA

DADOS_VALIDOS = {
    "nome": "Maria  da silva",
    "cpf": "123.456.789-09",
    "email": "Maria@Exemplo.com",
    "data_nascimento": "28/02/1990",
}


def validar(cliente, dados):
    return cliente.post("/validar", json={"sistema_origem": "sistema_a", "dados": dados})


def test_aprovado_no_formato_do_contrato(cliente):
    resposta = validar(cliente, DADOS_VALIDOS)
    assert resposta.status_code == 200
    assert resposta.json() == {
        "valido": True,
        "erros": [],
        "dados_padronizados": {
            "nome": "Maria da Silva",
            "cpf": "12345678909",
            "email": "maria@exemplo.com",
            "data_nascimento": "1990-02-28",
        },
    }


def test_bloqueado_no_formato_do_contrato(cliente):
    resposta = validar(cliente, {**DADOS_VALIDOS, "data_nascimento": "31/02/1990"})
    assert resposta.status_code == 200
    assert resposta.json() == {
        "valido": False,
        "erros": [
            {
                "campo": "data_nascimento",
                "regra": "data_existente",
                "mensagem": "Essa data não existe. Confira o dia e o mês.",
                "formato_esperado": "DD/MM/AAAA",
            }
        ],
        "dados_padronizados": None,
    }


def test_campo_desconhecido_e_ignorado(cliente):
    resposta = validar(cliente, {**DADOS_VALIDOS, "apelido": "Mari"})
    assert resposta.json()["valido"] is True
    assert "apelido" not in resposta.json()["dados_padronizados"]


def test_sem_sistema_origem_retorna_422(cliente):
    resposta = cliente.post("/validar", json={"dados": DADOS_VALIDOS})
    assert resposta.status_code == 422


def test_corpo_que_nao_e_json_retorna_422(cliente):
    resposta = cliente.post("/validar", content="isso não é json", headers={"Content-Type": "application/json"})
    assert resposta.status_code == 422


def test_municipio_volta_com_codigo_ibge(cliente):
    resposta = validar(cliente, {**DADOS_VALIDOS, "municipio": "Guajara Mirim"}).json()
    assert resposta["valido"] is True
    assert resposta["dados_padronizados"]["municipio"] == "Guajará-Mirim"
    assert resposta["dados_padronizados"]["municipio_codigo_ibge"] == "1100106"


@pytest.mark.parametrize("nome", ["bloqueado", "aprovado"])
def test_exemplos_do_swagger_batem_com_a_resposta_real(cliente, nome):
    resposta = cliente.post("/validar", json=EXEMPLOS_REQUISICAO[nome]["value"])
    assert resposta.json() == EXEMPLOS_RESPOSTA[nome]["value"]


# R6: a mudança da CAGD vale na chamada seguinte, sem reiniciar


def test_cagd_torna_telefone_obrigatorio(cliente):
    assert validar(cliente, DADOS_VALIDOS).json()["valido"] is True

    cliente.put("/regras/telefone", json={"obrigatorio": True})

    erros = validar(cliente, DADOS_VALIDOS).json()["erros"]
    assert [(e["campo"], e["regra"]) for e in erros] == [("telefone", "obrigatorio")]
    assert erros[0]["formato_esperado"] == "(00) 00000-0000"


def test_cagd_torna_email_opcional(cliente):
    sem_email = {k: v for k, v in DADOS_VALIDOS.items() if k != "email"}
    assert validar(cliente, sem_email).json()["valido"] is False

    cliente.put("/regras/email", json={"obrigatorio": False})

    assert validar(cliente, sem_email).json()["valido"] is True


def test_inativo_prevalece_sobre_obrigatorio_e_reativar_restaura(cliente):
    sem_cpf = {k: v for k, v in DADOS_VALIDOS.items() if k != "cpf"}

    regra = cliente.put("/regras/cpf", json={"ativo": False}).json()
    assert regra["obrigatorio"] is True  # o valor fica guardado
    assert validar(cliente, sem_cpf).json()["valido"] is True  # mas não é cobrado

    cliente.put("/regras/cpf", json={"ativo": True})
    erros = validar(cliente, sem_cpf).json()["erros"]
    assert [(e["campo"], e["regra"]) for e in erros] == [("cpf", "obrigatorio")]


def test_cagd_desativa_cpf(cliente):
    cliente.put("/regras/cpf", json={"ativo": False})
    resposta = validar(cliente, {**DADOS_VALIDOS, "cpf": "111.111.111-11"}).json()
    assert resposta["valido"] is True
    assert "cpf" not in resposta["dados_padronizados"]
