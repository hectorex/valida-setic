import pytest


def test_raiz_abre_a_pagina_inicial(cliente):
    # Quem abre só o endereço do servidor (ex.: pelo QR code) já cai na página inicial
    resposta = cliente.get("/")
    assert resposta.status_code == 200
    assert 'href="sistema-a.html"' in resposta.text


@pytest.mark.parametrize("pagina", ["/static/", "/static/sistema-a.html", "/static/js/comum.js"])
def test_links_antigos_com_static_continuam_valendo(cliente, pagina):
    assert cliente.get(pagina).status_code == 200


@pytest.mark.parametrize("rota", ["/regras", "/painel/erros", "/municipios", "/cadastros", "/saude", "/docs", "/openapi.json"])
def test_frontend_na_raiz_nao_esconde_a_api(cliente, rota):
    resposta = cliente.get(rota)
    assert resposta.status_code == 200
    assert "text/html" not in resposta.headers["content-type"] or rota == "/docs"


@pytest.mark.parametrize("pagina", ["/", "/sistema-a.html", "/sistema-b.html", "/cagd.html"])
def test_paginas_do_frontend_abrem(cliente, pagina):
    resposta = cliente.get(pagina)
    assert resposta.status_code == 200
    assert "text/html" in resposta.headers["content-type"]


@pytest.mark.parametrize("script", ["comum.js", "formulario.js", "cagd.js", "banco-sistema-a.js", "painel.js", "integrar.js", "senha-cagd.js", "historico.js"])
def test_js_nao_fixa_endereco_da_api(cliente, script):
    # O JS chama a API pelo mesmo endereço da página, para funcionar no celular e em outra porta
    resposta = cliente.get(f"/js/{script}")
    assert resposta.status_code == 200
    assert "127.0.0.1" not in resposta.text


def test_sistema_a_grava_pelo_proprio_backend(cliente):
    # Sistema A envia para POST /cadastros (valida e grava); a lista do banco simulado fica na mesma página
    html = cliente.get("/sistema-a.html").text
    assert 'data-sistema="sistema_a"' in html and 'data-rota="/cadastros"' in html
    assert 'id="tabela-cadastros"' in html and "js/banco-sistema-a.js" in html


def test_cagd_tem_regras_e_painel(cliente):
    html = cliente.get("/cagd.html").text
    assert 'id="rules-grid"' in html and 'id="tabela-falhas"' in html
    assert "js/cagd.js" in html and "js/painel.js" in html


def test_sistema_b_so_valida_e_tem_campos_proprios(cliente):
    html = cliente.get("/sistema-b.html").text
    tag_form = html[html.index("<form"):].split(">", 1)[0]
    assert 'data-sistema="sistema_b"' in tag_form
    assert "data-rota" not in tag_form  # sem data-rota: envia para POST /validar
    assert 'data-campo="telefone"' in html and 'data-campo="municipio"' not in html
    assert "js/formulario.js" in html and "banco-sistema-a.js" not in html


@pytest.mark.parametrize("pagina", ["/", "/sistema-a.html", "/sistema-b.html", "/cagd.html", "/integrar.html"])
def test_menu_tem_todas_as_paginas(cliente, pagina):
    html = cliente.get(pagina).text
    for destino in ["sistema-a.html", "sistema-b.html", "cagd.html", "integrar.html"]:
        assert f'href="{destino}"' in html


@pytest.mark.parametrize("pagina", ["/sistema-a.html", "/sistema-b.html"])
def test_formularios_pedem_dados_ficticios(cliente, pagina):
    # LGPD: com a demo hospedada, ninguém deve digitar dados reais
    assert "use apenas dados fictícios" in cliente.get(pagina).text


def test_mascaras_so_no_sistema_a(cliente):
    # Sistema A ajuda o usuário com a pontuação; o Sistema B fica sem, como um sistema legado
    html_a = cliente.get("/sistema-a.html").text
    for mascara in ["cpf", "telefone", "data"]:
        assert f'data-mascara="{mascara}"' in html_a
    assert "data-mascara" not in cliente.get("/sistema-b.html").text


@pytest.mark.parametrize("pagina", ["/", "/sistema-a.html", "/sistema-b.html", "/cagd.html"])
def test_rodape_com_a_equipe(cliente, pagina):
    html = cliente.get(pagina).text
    assert "QuemMaisCorp" in html
    for nome in ["Celso Hector Silva Sales", "Luiz Felipe Mâcedo Alencar de Menezes", "Judson Gabriel Ferreira dos Santos"]:
        assert nome in html


@pytest.mark.parametrize("arquivo", ["/", "/sistema-a.html", "/js/formulario.js", "/css/style.css", "/static/js/comum.js"])
def test_navegador_confere_versao_nova(cliente, arquivo):
    # Depois de um deploy o navegador não pode continuar usando o JS antigo
    assert cliente.get(arquivo).headers["cache-control"] == "no-cache"


def test_arquivo_sem_mudanca_responde_304(cliente):
    primeira = cliente.get("/js/formulario.js")
    segunda = cliente.get("/js/formulario.js", headers={"If-None-Match": primeira.headers["etag"]})
    assert segunda.status_code == 304


def test_painel_da_cagd_mostra_o_tempo_medio(cliente):
    html = cliente.get("/cagd.html").text
    assert 'id="painel-tempo"' in html


def test_painel_da_cagd_tem_onde_agir(cliente):
    assert 'id="painel-onde-agir"' in cliente.get("/cagd.html").text


def test_cagd_pede_senha_antes_de_mostrar(cliente):
    html = cliente.get("/cagd.html").text
    assert 'id="form-login-cagd"' in html and 'type="password"' in html
    assert '<body class="cagd-verificando">' in html  # nada aparece até a verificação da senha
    # senha-cagd.js precisa vir antes das telas que usam cabecalhosCagd() e quandoLiberada()
    assert html.index("js/senha-cagd.js") < html.index("js/cagd.js") < html.index("js/painel.js")


def test_cagd_mostra_o_historico_de_mudancas(cliente):
    html = cliente.get("/cagd.html").text
    assert 'id="tabela-historico"' in html
    assert html.index("js/senha-cagd.js") < html.index("js/historico.js")


def test_senha_da_cagd_tem_botao_de_olho(cliente):
    html = cliente.get("/cagd.html").text
    assert 'id="btn-mostrar-senha"' in html and 'aria-label="Mostrar senha"' in html
