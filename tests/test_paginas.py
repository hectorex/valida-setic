import pytest


def test_raiz_redireciona_para_a_pagina_inicial(cliente):
    resposta = cliente.get("/", follow_redirects=False)
    assert resposta.status_code == 307
    assert resposta.headers["location"] == "/static/"


@pytest.mark.parametrize("pagina", ["/static/", "/static/sistema-a.html", "/static/sistema-b.html", "/static/cagd.html"])
def test_paginas_do_frontend_abrem(cliente, pagina):
    resposta = cliente.get(pagina)
    assert resposta.status_code == 200
    assert "text/html" in resposta.headers["content-type"]


@pytest.mark.parametrize("script", ["comum.js", "formulario.js", "cagd.js", "banco-sistema-a.js", "painel.js"])
def test_js_nao_fixa_endereco_da_api(cliente, script):
    # O JS chama a API pelo mesmo endereço da página, para funcionar no celular e em outra porta
    resposta = cliente.get(f"/static/js/{script}")
    assert resposta.status_code == 200
    assert "127.0.0.1" not in resposta.text


def test_sistema_a_grava_pelo_proprio_backend(cliente):
    # Sistema A envia para POST /cadastros (valida e grava); a lista do banco simulado fica na mesma página
    html = cliente.get("/static/sistema-a.html").text
    assert 'data-sistema="sistema_a"' in html and 'data-rota="/cadastros"' in html
    assert 'id="tabela-cadastros"' in html and "js/banco-sistema-a.js" in html


def test_cagd_tem_regras_e_painel(cliente):
    html = cliente.get("/static/cagd.html").text
    assert 'id="rules-grid"' in html and 'id="tabela-falhas"' in html
    assert "js/cagd.js" in html and "js/painel.js" in html


def test_sistema_b_so_valida_e_tem_campos_proprios(cliente):
    html = cliente.get("/static/sistema-b.html").text
    tag_form = html[html.index("<form"):].split(">", 1)[0]
    assert 'data-sistema="sistema_b"' in tag_form
    assert "data-rota" not in tag_form  # sem data-rota: envia para POST /validar
    assert 'data-campo="telefone"' in html and 'data-campo="municipio"' not in html
    assert "js/formulario.js" in html and "banco-sistema-a.js" not in html


@pytest.mark.parametrize("pagina", ["/static/", "/static/sistema-a.html", "/static/sistema-b.html", "/static/cagd.html"])
def test_menu_tem_as_tres_paginas(cliente, pagina):
    html = cliente.get(pagina).text
    for destino in ["sistema-a.html", "sistema-b.html", "cagd.html"]:
        assert f'href="{destino}"' in html
