"""POST /agendamentos: o backend do Sistema B de exemplo valida no servidor, sem chave no navegador."""

import pytest

DADOS_LEGADO = {"nome": "João Pereira", "cpf": "123.456.789-09", "email": "joao@exemplo.com",
                "data_nascimento": "1985-03-15", "telefone": "69999991234"}


@pytest.fixture
def logado(cliente, monkeypatch):
    monkeypatch.setenv("VALIDA_USUARIOS_CAGD", "banca:Banca Avaliadora:senha-certa")
    token = cliente.post("/cagd/login", json={"usuario": "banca", "senha": "senha-certa"}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_responde_igual_ao_validar(cliente):
    pelo_backend = cliente.post("/agendamentos", json=DADOS_LEGADO).json()
    direto = cliente.post("/validar", json={"sistema_origem": "sistema_b", "dados": DADOS_LEGADO}).json()
    assert pelo_backend == direto
    assert [(e["campo"], e["regra"]) for e in pelo_backend["erros"]] == [("data_nascimento", "formato")]


def test_registra_como_sistema_b_mesmo_com_chaves_configuradas_e_sem_cabecalho(cliente, logado, monkeypatch):
    monkeypatch.setenv("VALIDA_CHAVES_SISTEMAS", "sistema_exemplo:demo-exemplo")
    corrigido = {**DADOS_LEGADO, "data_nascimento": "15/03/1985"}
    resposta = cliente.post("/agendamentos", json=corrigido)
    assert resposta.status_code == 200 and resposta.json()["valido"] is True
    painel = cliente.get("/painel/erros", headers=logado).json()
    assert [(s["sistema_origem"], s["validacoes"]) for s in painel["por_sistema"]] == [("sistema_b", 1)]


def test_segue_a_regra_da_cagd(cliente):
    cliente.put("/regras/telefone", json={"obrigatorio": True})
    sem_telefone = {k: v for k, v in DADOS_LEGADO.items() if k != "telefone"}
    erros = cliente.post("/agendamentos", json={**sem_telefone, "data_nascimento": "15/03/1985"}).json()["erros"]
    assert [(e["campo"], e["regra"]) for e in erros] == [("telefone", "obrigatorio")]


def test_nao_aceita_mudar_o_sistema_pelo_corpo(cliente, logado):
    cliente.post("/agendamentos", json={**DADOS_LEGADO, "sistema_origem": "sistema_a"})
    painel = cliente.get("/painel/erros", headers=logado).json()
    assert [s["sistema_origem"] for s in painel["por_sistema"]] == ["sistema_b"]
