"""GET /saude: a API no ar e qual banco está em uso, sem expor endereço nem senha."""


def test_saude_diz_qual_banco_esta_em_uso(cliente):
    resposta = cliente.get("/saude")
    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok", "banco": "sqlite"}  # nos testes, sem VALIDA_DB_URL


def test_saude_nao_expoe_o_endereco_do_banco(cliente):
    texto = cliente.get("/saude").text
    assert "://" not in texto and "valida.db" not in texto and "@" not in texto
