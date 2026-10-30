import pytest


def test_raiz_redireciona_para_a_pagina_inicial(cliente):
    resposta = cliente.get("/", follow_redirects=False)
    assert resposta.status_code == 307
    assert resposta.headers["location"] == "/static/"


@pytest.mark.parametrize("pagina", ["/static/", "/static/sistema-a.html", "/static/cagd.html"])
def test_paginas_do_frontend_abrem(cliente, pagina):
    resposta = cliente.get(pagina)
    assert resposta.status_code == 200
    assert "text/html" in resposta.headers["content-type"]


@pytest.mark.parametrize("script", ["comum.js", "formulario.js", "cagd.js"])
def test_js_nao_fixa_endereco_da_api(cliente, script):
    # O JS chama a API pelo mesmo endereço da página, para funcionar no celular e em outra porta
    resposta = cliente.get(f"/static/js/{script}")
    assert resposta.status_code == 200
    assert "127.0.0.1" not in resposta.text
