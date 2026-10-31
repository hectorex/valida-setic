import pytest

SENHA = "senha-de-teste"


@pytest.fixture
def com_senha(monkeypatch):
    monkeypatch.setenv("VALIDA_SENHA_CAGD", SENHA)


def test_sem_senha_configurada_tudo_aberto(cliente):
    # No notebook da demo (sem a variável), a CAGD funciona sem senha
    assert cliente.put("/regras/telefone", json={"obrigatorio": True}).status_code == 200
    assert cliente.get("/painel/erros").status_code == 200


@pytest.mark.parametrize("cabecalhos", [{}, {"X-Senha-CAGD": "errada"}, {"X-Senha-CAGD": ""}])
def test_mudar_regra_sem_a_senha_certa_e_recusado(cliente, com_senha, cabecalhos):
    resposta = cliente.put("/regras/telefone", json={"obrigatorio": True}, headers=cabecalhos)
    assert resposta.status_code == 401
    assert resposta.json() == {"detail": "Senha da CAGD ausente ou incorreta."}
    # e a regra não mudou
    telefone = next(r for r in cliente.get("/regras").json() if r["campo"] == "telefone")
    assert telefone["obrigatorio"] is False


def test_com_a_senha_certa_muda_a_regra(cliente, com_senha):
    resposta = cliente.put("/regras/telefone", json={"obrigatorio": True}, headers={"X-Senha-CAGD": SENHA})
    assert resposta.status_code == 200
    assert resposta.json()["obrigatorio"] is True


def test_painel_exige_a_senha(cliente, com_senha):
    assert cliente.get("/painel/erros").status_code == 401
    assert cliente.get("/painel/erros", headers={"X-Senha-CAGD": SENHA}).status_code == 200


@pytest.mark.parametrize("rota", ["/regras", "/municipios"])
def test_o_que_os_sistemas_usam_continua_publico(cliente, com_senha, rota):
    # Os formulários precisam do GET /regras para montar asteriscos e ajuda
    assert cliente.get(rota).status_code == 200


def test_validar_e_cadastrar_continuam_publicos(cliente, com_senha):
    dados = {"nome": "Maria da Silva", "cpf": "123.456.789-09", "email": "maria@exemplo.com",
             "data_nascimento": "28/02/1990"}
    assert cliente.post("/validar", json={"sistema_origem": "sistema_a", "dados": dados}).json()["valido"] is True
    assert cliente.post("/cadastros", json=dados).status_code == 201
