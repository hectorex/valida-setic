"""Regras de formato da CAGD para campos novos: rotas, login, histórico e efeito na validação."""

import pytest

USUARIOS = "banca:Banca Avaliadora:senha-certa"
MATRICULA = {"campo": "matricula", "nome": "Matrícula do servidor", "molde": "RO-000000",
             "mensagem": "Informe a matrícula no formato RO-000000."}
DADOS = {"nome": "Maria da Silva", "cpf": "123.456.789-09", "email": "maria@exemplo.com", "data_nascimento": "28/02/1990"}


@pytest.fixture
def logado(cliente, monkeypatch):
    monkeypatch.setenv("VALIDA_USUARIOS_CAGD", USUARIOS)
    token = cliente.post("/cagd/login", json={"usuario": "banca", "senha": "senha-certa"}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def criar(cliente, cabecalhos, **mudancas):
    return cliente.post("/regras-formato", json={**MATRICULA, **mudancas}, headers=cabecalhos)


def validar(cliente, **extras):
    return cliente.post("/validar", json={"sistema_origem": "sistema_x", "dados": {**DADOS, **extras}}).json()


# --- Criar, listar, mudar, excluir ---


def test_cagd_cria_e_lista_a_regra(cliente, logado):
    resposta = criar(cliente, logado)
    assert resposta.status_code == 201
    regra = resposta.json()
    assert {k: regra[k] for k in ("campo", "molde", "obrigatorio", "ativo")} == \
        {"campo": "matricula", "molde": "RO-000000", "obrigatorio": False, "ativo": True}
    assert [r["campo"] for r in cliente.get("/regras-formato").json()] == ["matricula"]


def test_criar_mudar_e_excluir_exigem_login(cliente, logado):
    id_regra = criar(cliente, logado).json()["id"]
    assert criar(cliente, {}, campo="placa", molde="AAA-0A00").status_code == 401
    assert cliente.put(f"/regras-formato/{id_regra}", json={"ativo": False}).status_code == 401
    assert cliente.delete(f"/regras-formato/{id_regra}").status_code == 401
    assert cliente.get("/regras-formato").status_code == 200  # a lista é pública, como o GET /regras


@pytest.mark.parametrize("campo", ["cpf", "data_nascimento", "nome"])
def test_campo_padrao_nao_recebe_regra_de_formato(cliente, logado, campo):
    resposta = criar(cliente, logado, campo=campo)
    assert resposta.status_code == 409 and "campos padrão" in resposta.json()["detail"]


def test_campo_repetido_da_409(cliente, logado):
    criar(cliente, logado)
    assert criar(cliente, logado, molde="00000").status_code == 409


@pytest.mark.parametrize("mudanca", [
    {"campo": "Matricula"}, {"campo": "matrícula"}, {"campo": "1matricula"}, {"campo": "m"},
    {"molde": "RO-"}, {"molde": " 000"}, {"molde": "0" * 41}, {"nome": ""}, {"mensagem": "x" * 201},
    {"admin": True},  # atributo desconhecido (mass assignment)
])
def test_entrada_invalida_da_422(cliente, logado, mudanca):
    assert criar(cliente, logado, **mudanca).status_code == 422


def test_mudar_e_excluir(cliente, logado):
    id_regra = criar(cliente, logado).json()["id"]
    mudada = cliente.put(f"/regras-formato/{id_regra}", json={"obrigatorio": True, "molde": "RO-00000"}, headers=logado)
    assert mudada.status_code == 200 and mudada.json()["obrigatorio"] is True and mudada.json()["molde"] == "RO-00000"
    assert cliente.put(f"/regras-formato/{id_regra}", json={"campo": "outro"}, headers=logado).status_code == 422
    assert cliente.delete(f"/regras-formato/{id_regra}", headers=logado).status_code == 204
    assert cliente.get("/regras-formato").json() == []
    assert cliente.delete(f"/regras-formato/{id_regra}", headers=logado).status_code == 404
    assert cliente.put("/regras-formato/999", json={"ativo": False}, headers=logado).status_code == 404


def test_historico_registra_quem_criou_mudou_e_excluiu(cliente, logado):
    id_regra = criar(cliente, logado).json()["id"]
    cliente.put(f"/regras-formato/{id_regra}", json={"ativo": False}, headers=logado)
    cliente.put(f"/regras-formato/{id_regra}", json={"ativo": False}, headers=logado)  # mesmo valor: não conta
    cliente.delete(f"/regras-formato/{id_regra}", headers=logado)
    historico = cliente.get("/regras/historico", headers=logado).json()
    assert [(h["campo"], h["atributo"], h["valor_anterior"], h["valor_novo"], h["usuario"]) for h in historico] == [
        ("matricula", "regra_excluida", "RO-000000 (Matrícula do servidor)", None, "Banca Avaliadora"),
        ("matricula", "ativo", "true", "false", "Banca Avaliadora"),
        ("matricula", "regra_criada", None, "RO-000000 (Matrícula do servidor)", "Banca Avaliadora"),
    ]


def test_testar_molde_sem_salvar(cliente):
    aprovado = cliente.post("/regras-formato/testar", json={"molde": "RO-000000", "valor": "ro-123456"}).json()
    assert aprovado == {"valido": True, "valor_padronizado": "RO-123456", "mensagem": None}
    bloqueado = cliente.post("/regras-formato/testar", json={"molde": "RO-000000", "valor": "RO-12"}).json()
    assert bloqueado["valido"] is False and bloqueado["mensagem"] == "Use o formato RO-000000."
    assert cliente.post("/regras-formato/testar", json={"molde": "RO-", "valor": "x"}).status_code == 422
    assert cliente.get("/regras-formato").json() == []  # testar não cria nada


# --- Efeito na validação ---


def test_sem_regra_o_campo_novo_e_ignorado(cliente):
    resposta = validar(cliente, matricula="qualquer coisa")
    assert resposta["valido"] is True and "matricula" not in resposta["dados_padronizados"]


def test_com_regra_o_campo_novo_e_validado_na_hora_para_todos(cliente, logado):
    criar(cliente, logado)
    bloqueado = validar(cliente, matricula="RO-12")
    assert bloqueado["erros"] == [{"campo": "matricula", "regra": "formato",
                                   "mensagem": "Informe a matrícula no formato RO-000000.", "formato_esperado": "RO-000000"}]
    aprovado = validar(cliente, matricula="ro-123456")
    assert aprovado["valido"] is True and aprovado["dados_padronizados"]["matricula"] == "RO-123456"
    # Os backends dos sistemas de exemplo usam o mesmo serviço
    assert cliente.post("/agendamentos", json={**DADOS, "matricula": "RO-12"}).json()["valido"] is False
    gravado = cliente.post("/cadastros", json={**DADOS, "matricula": "ro-123456"})
    assert gravado.status_code == 201  # o campo novo é validado; o banco de exemplo do Sistema A não o guarda


def test_regra_obrigatoria_e_regra_inativa(cliente, logado):
    id_regra = criar(cliente, logado, obrigatorio=True).json()["id"]
    assert [(e["campo"], e["regra"]) for e in validar(cliente)["erros"]] == [("matricula", "obrigatorio")]
    cliente.put(f"/regras-formato/{id_regra}", json={"ativo": False}, headers=logado)
    assert validar(cliente, matricula="RO-12")["valido"] is True  # inativa: não cobra nem valida


def test_falha_do_campo_novo_entra_no_painel_sem_o_valor(cliente, logado):
    criar(cliente, logado)
    validar(cliente, matricula="RO-12345678")
    painel = cliente.get("/painel/erros", headers=logado).json()
    assert {"sistema_origem": "sistema_x", "campo": "matricula", "regra": "formato", "quantidade": 1} in painel["falhas"]
    assert "RO-12345678" not in str(painel)  # LGPD: o painel nunca tem o valor digitado


def test_valor_que_nao_e_texto_no_campo_novo_e_bloqueado_sem_erro_500(cliente, logado):
    criar(cliente, logado)
    resposta = cliente.post("/validar", json={"sistema_origem": "x", "dados": {**DADOS, "matricula": ["RO-123456"]}})
    assert resposta.status_code == 200 and resposta.json()["valido"] is False


def test_tela_da_cagd_tem_o_card_das_regras_de_formato(cliente):
    html = cliente.get("/cagd.html").text
    for trecho in ['id="form-regra-formato"', 'id="rf-molde"', 'id="rf-teste"', 'id="tabela-regras-formato"',
                   "js/regras-formato.js"]:
        assert trecho in html
    # O script novo vem depois do cagd.js (usa o criarSwitch dele)
    assert html.index("js/cagd.js") < html.index("js/regras-formato.js")


def test_sistema_b_manda_o_protocolo_e_passa_a_validar_quando_a_cagd_cria_a_regra(cliente, logado):
    html = cliente.get("/sistema-b.html").text
    assert 'data-campo="protocolo" data-campo-extra' in html and 'name="protocolo"' in html
    # Formato e aviso vêm da regra da CAGD, nunca de texto fixo no HTML
    campo = html[html.index('id="protocolo"') - 40:html.index('id="protocolo"') + 60]
    assert 'placeholder' not in campo and 'class="dica-extra"' in html
    assert "/regras-formato" in cliente.get("/js/formulario.js").text
    assert "data-campo-extra" in cliente.get("/js/formulario.js").text  # o formulário envia os campos extras
    dados = {**DADOS, "telefone": "(69) 99999-1234", "protocolo": "26/1"}
    assert cliente.post("/agendamentos", json=dados).json()["valido"] is True  # sem regra: ignorado
    criar(cliente, logado, campo="protocolo", nome="Número do protocolo", molde="0000/000000",
          mensagem="Informe o protocolo no formato 0000/000000.")
    erros = cliente.post("/agendamentos", json=dados).json()["erros"]
    assert [(e["campo"], e["mensagem"]) for e in erros] == [("protocolo", "Informe o protocolo no formato 0000/000000.")]
