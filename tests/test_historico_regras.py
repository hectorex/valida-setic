from app.rotas.regras import EXEMPLO_HISTORICO


def historico(cliente, **parametros):
    return cliente.get("/regras/historico", params=parametros).json()


def test_comeca_vazio(cliente):
    assert historico(cliente) == []


def test_cada_mudanca_vira_uma_linha_com_antes_e_depois(cliente):
    cliente.put("/regras/telefone", json={"obrigatorio": True})
    [mudanca] = historico(cliente)
    assert {k: mudanca[k] for k in ("campo", "atributo", "valor_anterior", "valor_novo")} == {
        "campo": "telefone", "atributo": "obrigatorio", "valor_anterior": "false", "valor_novo": "true",
    }
    assert mudanca["data_hora"].endswith("Z")  # UTC com fuso, como o criado_em dos cadastros


def test_mais_recentes_primeiro_e_varios_atributos_de_uma_vez(cliente):
    cliente.put("/regras/telefone", json={"obrigatorio": True})
    cliente.put("/regras/cpf", json={"ativo": False, "ajuda": "Texto novo"})
    linhas = [(m["campo"], m["atributo"], m["valor_novo"]) for m in historico(cliente)]
    assert linhas == [
        ("cpf", "ajuda", "Texto novo"),
        ("cpf", "ativo", "false"),
        ("telefone", "obrigatorio", "true"),
    ]


def test_enviar_o_mesmo_valor_nao_entra_no_historico(cliente):
    cliente.put("/regras/nome", json={"obrigatorio": True})  # nome já é obrigatório
    assert historico(cliente) == []


def test_desligar_e_religar_registra_as_duas_mudancas(cliente):
    cliente.put("/regras/telefone", json={"obrigatorio": True})
    cliente.put("/regras/telefone", json={"obrigatorio": False})
    assert [(m["valor_anterior"], m["valor_novo"]) for m in historico(cliente)] == [("true", "false"), ("false", "true")]


def test_campo_inexistente_e_atributo_desconhecido_nao_registram(cliente):
    cliente.put("/regras/apelido", json={"obrigatorio": True})
    cliente.put("/regras/cpf", json={"obrigatoria": True})
    assert historico(cliente) == []


def test_limite(cliente):
    for valor in [True, False, True]:
        cliente.put("/regras/telefone", json={"obrigatorio": valor})
    assert len(historico(cliente, limite=2)) == 2
    assert cliente.get("/regras/historico", params={"limite": 0}).status_code == 422


def test_sem_login_configurado_o_autor_fica_vazio(cliente):
    # Sem usuários (notebook da demo) não há quem registrar; com login, o nome aparece (test_login_cagd.py)
    cliente.put("/regras/telefone", json={"obrigatorio": True})
    assert historico(cliente)[0]["usuario"] is None


def test_exemplo_do_swagger_bate_com_a_resposta_real(cliente):
    cliente.put("/regras/telefone", json={"obrigatorio": True})
    [mudanca] = historico(cliente)
    # data_hora muda a cada execução; usuario é None aqui porque os testes rodam sem login configurado
    sem_hora = lambda d: {k: v for k, v in d.items() if k not in ("data_hora", "usuario")}  # noqa: E731
    assert sem_hora(mudanca) == sem_hora(EXEMPLO_HISTORICO[0])


def test_historico_nao_e_confundido_com_nome_de_campo(cliente):
    # GET /regras/historico existe; PUT /regras/historico é um campo que não existe
    assert cliente.get("/regras/historico").status_code == 200
    assert cliente.put("/regras/historico", json={"obrigatorio": True}).status_code == 404
