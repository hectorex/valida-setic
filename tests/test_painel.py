from app.rotas.painel import EXEMPLO_PAINEL

DADOS_VALIDOS = {
    "nome": "Maria  da silva",
    "cpf": "123.456.789-09",
    "email": "Maria@Exemplo.com",
    "data_nascimento": "28/02/1990",
}


def validar(cliente, sistema, **alteracoes):
    dados = {k: v for k, v in {**DADOS_VALIDOS, **alteracoes}.items() if v is not None}
    return cliente.post("/validar", json={"sistema_origem": sistema, "dados": dados})


def test_painel_vazio(cliente):
    assert cliente.get("/painel/erros").json() == {
        "total_validacoes": 0,
        "total_bloqueadas": 0,
        "taxa_bloqueio": 0.0,
        "por_sistema": [],
        "por_campo": [],
        "falhas": [],
    }


def test_exemplo_do_swagger_bate_com_a_resposta_real(cliente):
    validar(cliente, "sistema_a", email="maria", data_nascimento="31/02/1990")
    validar(cliente, "sistema_a")
    validar(cliente, "sistema_b", cpf=None, email="maria@")
    assert cliente.get("/painel/erros").json() == EXEMPLO_PAINEL


def test_falha_repetida_soma_e_vem_primeiro(cliente):
    validar(cliente, "sistema_a", email="maria@")
    validar(cliente, "sistema_a", email="joao@")
    validar(cliente, "sistema_a", cpf="111.111.111-11")
    painel = cliente.get("/painel/erros").json()
    assert painel["falhas"][0] == {
        "sistema_origem": "sistema_a", "campo": "email", "regra": "dominio_valido", "quantidade": 2,
    }
    assert painel["por_campo"] == [{"campo": "email", "falhas": 2}, {"campo": "cpf", "falhas": 1}]
    assert painel["por_sistema"] == [
        {"sistema_origem": "sistema_a", "validacoes": 3, "bloqueadas": 3, "taxa_bloqueio": 100.0}
    ]


def test_painel_reflete_regra_da_cagd(cliente):
    # Demo, passo 4 → 6: a CAGD torna telefone obrigatório e o painel mostra quem não envia
    cliente.put("/regras/telefone", json={"obrigatorio": True})
    validar(cliente, "sistema_b")
    falhas = cliente.get("/painel/erros").json()["falhas"]
    assert falhas == [{"sistema_origem": "sistema_b", "campo": "telefone", "regra": "obrigatorio", "quantidade": 1}]
