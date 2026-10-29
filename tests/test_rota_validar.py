from fastapi.testclient import TestClient

from app.main import app

cliente = TestClient(app)

DADOS_VALIDOS = {
    "nome": "Maria  da silva",
    "cpf": "123.456.789-09",
    "email": "Maria@Exemplo.com",
    "data_nascimento": "28/02/1990",
}


def test_aprovado_no_formato_do_contrato():
    resposta = cliente.post("/validar", json={"sistema_origem": "sistema_a", "dados": DADOS_VALIDOS})
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


def test_bloqueado_no_formato_do_contrato():
    dados = {**DADOS_VALIDOS, "data_nascimento": "31/02/1990"}
    resposta = cliente.post("/validar", json={"sistema_origem": "sistema_a", "dados": dados})
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


def test_campo_desconhecido_e_ignorado():
    dados = {**DADOS_VALIDOS, "apelido": "Mari"}
    resposta = cliente.post("/validar", json={"sistema_origem": "sistema_a", "dados": dados})
    assert resposta.json()["valido"] is True
    assert "apelido" not in resposta.json()["dados_padronizados"]


def test_sem_sistema_origem_retorna_422():
    resposta = cliente.post("/validar", json={"dados": DADOS_VALIDOS})
    assert resposta.status_code == 422


def test_corpo_que_nao_e_json_retorna_422():
    resposta = cliente.post("/validar", content="isso não é json", headers={"Content-Type": "application/json"})
    assert resposta.status_code == 422
