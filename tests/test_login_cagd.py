from datetime import datetime, timedelta, timezone

import pytest

from app import seguranca

USUARIOS = "celso:Celso Hector:senha-celso;banca:Banca Avaliadora:senha:com:dois-pontos"


@pytest.fixture
def com_usuarios(monkeypatch):
    monkeypatch.setenv("VALIDA_USUARIOS_CAGD", USUARIOS)
    monkeypatch.delenv("VALIDA_SENHA_CAGD", raising=False)


def entrar(cliente, usuario="celso", senha="senha-celso"):
    return cliente.post("/cagd/login", json={"usuario": usuario, "senha": senha})


def cabecalho(cliente, usuario="celso", senha="senha-celso"):
    return {"Authorization": f"Bearer {entrar(cliente, usuario, senha).json()['token']}"}


# Sem usuários configurados (notebook da demo): tudo aberto


def test_sem_usuarios_tudo_aberto(cliente, monkeypatch):
    monkeypatch.delenv("VALIDA_USUARIOS_CAGD", raising=False)
    monkeypatch.delenv("VALIDA_SENHA_CAGD", raising=False)
    assert cliente.put("/regras/telefone", json={"obrigatorio": True}).status_code == 200
    assert cliente.get("/painel/erros").status_code == 200
    assert cliente.get("/cagd/eu").json() == {"protegido": False, "usuario": None, "nome": None}
    assert entrar(cliente).status_code == 400  # não há login para fazer


# Login


def test_login_devolve_chave_e_nome(cliente, com_usuarios):
    resposta = entrar(cliente)
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["usuario"] == "celso" and corpo["nome"] == "Celso Hector"
    assert len(corpo["token"]) >= 32
    expira = datetime.fromisoformat(corpo["expira_em"].replace("Z", "+00:00"))
    assert timedelta(hours=7) < expira - datetime.now(timezone.utc) <= timedelta(hours=8)


def test_senha_pode_ter_dois_pontos_e_usuario_ignora_maiusculas(cliente, com_usuarios):
    resposta = entrar(cliente, "  BANCA ", "senha:com:dois-pontos")
    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "Banca Avaliadora"


@pytest.mark.parametrize("usuario, senha", [("celso", "errada"), ("ninguem", "senha-celso"), ("celso", "senha-celso ")])
def test_login_errado_e_recusado_sem_dizer_o_que_errou(cliente, com_usuarios, usuario, senha):
    resposta = entrar(cliente, usuario, senha)
    assert resposta.status_code == 401
    assert resposta.json() == {"detail": "Usuário ou senha incorretos."}


def test_eu_diz_quem_esta_logado(cliente, com_usuarios):
    assert cliente.get("/cagd/eu", headers=cabecalho(cliente)).json() == {
        "protegido": True, "usuario": "celso", "nome": "Celso Hector",
    }
    assert cliente.get("/cagd/eu").status_code == 401


# Rotas protegidas


@pytest.mark.parametrize("cabecalhos", [{}, {"Authorization": "Bearer chave-inventada"}, {"Authorization": "Basic abc"}])
def test_mudar_regra_sem_login_e_recusado(cliente, com_usuarios, cabecalhos):
    resposta = cliente.put("/regras/telefone", json={"obrigatorio": True}, headers=cabecalhos)
    assert resposta.status_code == 401
    telefone = next(r for r in cliente.get("/regras").json() if r["campo"] == "telefone")
    assert telefone["obrigatorio"] is False  # a regra não mudou


def test_painel_e_historico_exigem_login(cliente, com_usuarios):
    for rota in ["/painel/erros", "/regras/historico"]:
        assert cliente.get(rota).status_code == 401
        assert cliente.get(rota, headers=cabecalho(cliente)).status_code == 200


@pytest.mark.parametrize("rota", ["/regras", "/municipios"])
def test_o_que_os_sistemas_usam_continua_publico(cliente, com_usuarios, rota):
    assert cliente.get(rota).status_code == 200


def test_validar_e_cadastrar_continuam_publicos(cliente, com_usuarios):
    dados = {"nome": "Maria da Silva", "cpf": "123.456.789-09", "email": "maria@exemplo.com",
             "data_nascimento": "28/02/1990"}
    assert cliente.post("/validar", json={"sistema_origem": "sistema_a", "dados": dados}).json()["valido"] is True
    assert cliente.post("/cadastros", json=dados).status_code == 201


# Auditoria: quem mudou


def test_historico_registra_quem_mudou(cliente, com_usuarios):
    cliente.put("/regras/telefone", json={"obrigatorio": True}, headers=cabecalho(cliente))
    cliente.put("/regras/municipio", json={"ativo": False}, headers=cabecalho(cliente, "banca", "senha:com:dois-pontos"))
    historico = cliente.get("/regras/historico", headers=cabecalho(cliente)).json()
    assert [(m["usuario"], m["campo"]) for m in historico] == [
        ("Banca Avaliadora", "municipio"),
        ("Celso Hector", "telefone"),
    ]


# Sessão


def test_sair_invalida_a_chave_na_hora(cliente, com_usuarios):
    cabecalhos = cabecalho(cliente)
    assert cliente.post("/cagd/sair", headers=cabecalhos).status_code == 204
    assert cliente.get("/painel/erros", headers=cabecalhos).status_code == 401


def test_sessao_expirada_e_recusada(cliente, com_usuarios):
    cabecalhos = cabecalho(cliente)
    token = cabecalhos["Authorization"].removeprefix("Bearer ")
    seguranca.SESSOES[token].expira_em = datetime.now(timezone.utc) - timedelta(seconds=1)
    assert cliente.get("/painel/erros", headers=cabecalhos).status_code == 401
    assert token not in seguranca.SESSOES


def test_usuario_removido_perde_o_acesso(cliente, com_usuarios, monkeypatch):
    cabecalhos = cabecalho(cliente, "banca", "senha:com:dois-pontos")
    monkeypatch.setenv("VALIDA_USUARIOS_CAGD", "celso:Celso Hector:senha-celso")  # banca saiu da lista
    assert cliente.get("/painel/erros", headers=cabecalhos).status_code == 401


# Senha única antiga continua valendo enquanto a variável nova não existe (sem janela desprotegida no deploy)


def test_senha_unica_antiga_vira_o_usuario_cagd(cliente, monkeypatch):
    monkeypatch.delenv("VALIDA_USUARIOS_CAGD", raising=False)
    monkeypatch.setenv("VALIDA_SENHA_CAGD", "senha-antiga")
    assert cliente.put("/regras/telefone", json={"obrigatorio": True}).status_code == 401
    cabecalhos = cabecalho(cliente, "cagd", "senha-antiga")
    assert cliente.put("/regras/telefone", json={"obrigatorio": True}, headers=cabecalhos).status_code == 200
    assert cliente.get("/regras/historico", headers=cabecalhos).json()[0]["usuario"] == "CAGD"


def test_usuarios_mal_formados_sao_ignorados(monkeypatch):
    monkeypatch.setenv("VALIDA_USUARIOS_CAGD", "semnome;:Sem Usuario:x;ok:Ok Nome:senha;; vazio::")
    monkeypatch.delenv("VALIDA_SENHA_CAGD", raising=False)
    assert seguranca.usuarios_configurados() == {"ok": ("Ok Nome", "senha")}


# Força bruta


def test_cinco_senhas_erradas_bloqueiam_o_login_ate_com_a_senha_certa(cliente, com_usuarios):
    for _ in range(4):
        assert entrar(cliente, senha="chute").status_code == 401
    assert entrar(cliente, senha="chute").status_code == 401  # 5ª errada: bloqueia a partir daqui
    resposta = entrar(cliente)  # senha certa, mas bloqueado
    assert resposta.status_code == 429
    assert resposta.json()["detail"] == "Muitas tentativas erradas. Tente de novo em 5 minutos."
    assert 0 < int(resposta.headers["Retry-After"]) <= 300


def test_bloqueio_acaba_depois_de_5_minutos(cliente, com_usuarios):
    for _ in range(5):
        entrar(cliente, senha="chute")
    seguranca.BLOQUEADOS_ATE["celso"] = datetime.now(timezone.utc) - timedelta(seconds=1)  # simula o tempo passando
    assert entrar(cliente).status_code == 200


def test_acertar_zera_a_contagem(cliente, com_usuarios):
    for _ in range(4):
        entrar(cliente, senha="chute")
    assert entrar(cliente).status_code == 200
    for _ in range(4):
        entrar(cliente, senha="chute")
    assert entrar(cliente).status_code == 200  # 4 + 4 erradas, mas não seguidas: não bloqueou


def test_bloqueio_de_um_usuario_nao_afeta_os_outros(cliente, com_usuarios):
    for _ in range(5):
        entrar(cliente, senha="chute")
    assert entrar(cliente, "banca", "senha:com:dois-pontos").status_code == 200


def test_usuario_inexistente_tambem_bloqueia(cliente, com_usuarios):
    # Mesmo comportamento para quem existe e quem não existe: o bloqueio não revela quais usuários existem
    for _ in range(5):
        assert entrar(cliente, "ninguem", "x").status_code == 401
    assert entrar(cliente, "ninguem", "x").status_code == 429
