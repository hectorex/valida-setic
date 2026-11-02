"""Teste de invasão: ataques clássicos contra a API, que precisam continuar falhando.

Se uma mudança futura reabrir alguma destas portas, o teste correspondente quebra.
"""

import pytest

from app import seguranca

DADOS_ERRO = {"nome": "Maria da Silva", "cpf": "123.456.789-09", "email": "maria@", "data_nascimento": "31/02/1990"}
DADOS_OK = {"nome": "Maria da Silva", "cpf": "123.456.789-09", "email": "maria@exemplo.com", "data_nascimento": "28/02/1990"}


@pytest.fixture
def logado(cliente, monkeypatch):
    monkeypatch.setenv("VALIDA_USUARIOS_CAGD", "banca:Banca Avaliadora:senha-certa")
    token = cliente.post("/cagd/login", json={"usuario": "banca", "senha": "senha-certa"}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


# 1. Mass assignment ("admin": true e parecidos)


@pytest.mark.parametrize("corpo", [
    {"obrigatorio": True, "admin": True},
    {"campo": "cpf", "ativo": False},  # tentar trocar qual campo está sendo editado
    {"obrigatorio": True, "usuario": "outra pessoa"},  # tentar forjar o autor no histórico
])
def test_mudar_regra_so_aceita_os_atributos_conhecidos(cliente, logado, corpo):
    assert cliente.put("/regras/telefone", json=corpo, headers=logado).status_code == 422
    assert cliente.get("/regras/historico", headers=logado).json() == []  # nada mudou


def test_resultado_da_validacao_nao_pode_ser_forjado(cliente):
    corpo = {"sistema_origem": "x", "dados": {**DADOS_ERRO, "valido": True}, "valido": True, "aprovado": True}
    resposta = cliente.post("/validar", json=corpo).json()
    assert resposta["valido"] is False and resposta["dados_padronizados"] is None


def test_cadastro_grava_so_o_que_a_api_calculou(cliente):
    resposta = cliente.post("/cadastros", json={**DADOS_OK, "id": 999, "criado_em": "2000-01-01T00:00:00Z"}).json()
    assert resposta["cadastro"]["id"] != 999
    assert not resposta["cadastro"]["criado_em"].startswith("2000")


def test_login_nao_aceita_virar_admin_nem_trocar_o_nome(cliente, monkeypatch):
    monkeypatch.setenv("VALIDA_USUARIOS_CAGD", "banca:Banca Avaliadora:senha-certa")
    assert cliente.post("/cagd/login", json={"usuario": "banca", "senha": "errada", "admin": True}).status_code == 401
    resposta = cliente.post("/cagd/login", json={"usuario": "banca", "senha": "senha-certa", "nome": "Hacker"}).json()
    assert resposta["nome"] == "Banca Avaliadora"


def test_autor_do_historico_vem_do_login_e_nao_da_requisicao(cliente, logado):
    cliente.put("/regras/telefone", json={"obrigatorio": True}, headers={**logado, "X-Usuario": "Outra Pessoa"})
    assert cliente.get("/regras/historico", headers=logado).json()[0]["usuario"] == "Banca Avaliadora"


# 2. Chave (token) forjada


@pytest.mark.parametrize("autorizacao", ["Bearer admin", "Bearer " + "a" * 43, "Basic YWRtaW46YWRtaW4=", "admin", ""])
def test_chave_forjada_e_recusada(cliente, logado, autorizacao):
    assert cliente.get("/painel/erros", headers={"Authorization": autorizacao}).status_code == 401


def test_chave_verdadeira_com_um_caractere_trocado_e_recusada(cliente, logado):
    token = logado["Authorization"].removeprefix("Bearer ")
    trocada = token[:-1] + ("a" if token[-1] != "a" else "b")
    assert cliente.get("/painel/erros", headers={"Authorization": f"Bearer {trocada}"}).status_code == 401


def test_chaves_sao_aleatorias_e_longas(cliente, monkeypatch):
    monkeypatch.setenv("VALIDA_USUARIOS_CAGD", "banca:Banca Avaliadora:senha-certa")
    chaves = {cliente.post("/cagd/login", json={"usuario": "banca", "senha": "senha-certa"}).json()["token"] for _ in range(3)}
    assert len(chaves) == 3 and all(len(chave) >= 40 for chave in chaves)


# 3. SQL injection


def test_sql_injection_no_login(cliente, monkeypatch):
    monkeypatch.setenv("VALIDA_USUARIOS_CAGD", "banca:Banca Avaliadora:senha-certa")
    assert cliente.post("/cagd/login", json={"usuario": "' OR '1'='1", "senha": "' OR '1'='1"}).status_code == 401


def test_sql_injection_no_nome_do_campo(cliente, logado):
    assert cliente.put("/regras/x' OR '1'='1", json={"obrigatorio": True}, headers=logado).status_code == 404


def test_sql_injection_em_sistema_origem_e_gravado_como_texto(cliente, logado):
    malicioso = "a'; DROP TABLE validacoes; --"
    cliente.post("/validar", json={"sistema_origem": malicioso, "dados": DADOS_ERRO})
    painel = cliente.get("/painel/erros", headers=logado).json()  # a tabela continua lá
    assert malicioso in [s["sistema_origem"] for s in painel["por_sistema"]]


# 4. XSS (script disfarçado de dado, para rodar na tela de outra pessoa)


def test_xss_volta_como_texto_e_as_telas_nao_usam_innerhtml_com_dados(cliente, logado):
    payload = "<img src=x onerror=alert(1)>"
    cliente.post("/validar", json={"sistema_origem": payload, "dados": DADOS_ERRO})
    assert payload in [s["sistema_origem"] for s in cliente.get("/painel/erros", headers=logado).json()["por_sistema"]]
    # A defesa é na tela: dado vindo da API entra sempre por textContent. O único innerHTML é de um ícone fixo.
    for script in ["comum.js", "formulario.js", "cagd.js", "painel.js", "historico.js", "banco-sistema-a.js",
                   "login-cagd.js", "integrar.js", "dados-ficticios.js", "regras-formato.js"]:
        codigo = cliente.get(f"/js/{script}").text
        usos = [linha.strip() for linha in codigo.splitlines() if "innerHTML" in linha]
        assert all("ICONE_" in uso for uso in usos), f"{script}: {usos}"


# 5. Ler arquivos do servidor pelo frontend


@pytest.mark.parametrize("caminho", ["/../app/seguranca.py", "/static/../app/seguranca.py", "/%2e%2e/app/seguranca.py",
                                     "/.env", "/../valida.db", "/../render.yaml"])
def test_nao_da_para_ler_arquivos_fora_da_pasta_do_frontend(cliente, caminho):
    resposta = cliente.get(caminho)
    assert resposta.status_code == 404
    assert "VALIDA_USUARIOS_CAGD" not in resposta.text


# 6. Força bruta e textos gigantes


def test_forca_bruta_e_bloqueada(cliente, monkeypatch):
    monkeypatch.setenv("VALIDA_USUARIOS_CAGD", "banca:Banca Avaliadora:senha-certa")
    codigos = [cliente.post("/cagd/login", json={"usuario": "banca", "senha": f"chute{i}"}).status_code for i in range(20)]
    assert codigos[:5] == [401] * 5 and set(codigos[5:]) == {429}
    assert cliente.post("/cagd/login", json={"usuario": "banca", "senha": "senha-certa"}).status_code == 429
    assert seguranca.BLOQUEADOS_ATE["banca"]  # e o bloqueio está registrado


@pytest.mark.parametrize("campo", ["nome", "municipio", "email", "cpf", "telefone", "data_nascimento"])
def test_texto_gigante_nao_trava_a_api(cliente, campo):
    resposta = cliente.post("/validar", json={"sistema_origem": "x", "dados": {**DADOS_OK, campo: "a" * 200_000}})
    assert resposta.status_code == 200
    assert resposta.json()["valido"] is False  # e é bloqueado, não aceito
