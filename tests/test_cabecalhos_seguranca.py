import pytest

from app.main import CABECALHOS_DE_SEGURANCA


@pytest.mark.parametrize("rota", ["/", "/cagd.html", "/js/login-cagd.js", "/regras", "/saude", "/docs", "/rota-que-nao-existe"])
def test_toda_resposta_traz_os_cabecalhos_de_seguranca(cliente, rota):
    cabecalhos = cliente.get(rota).headers
    for nome, valor in CABECALHOS_DE_SEGURANCA.items():
        assert cabecalhos[nome] == valor, f"{rota} sem {nome}"


def test_erro_de_login_tambem_traz_os_cabecalhos(cliente, monkeypatch):
    monkeypatch.setenv("VALIDA_USUARIOS_CAGD", "banca:Banca Avaliadora:x")
    resposta = cliente.get("/painel/erros")
    assert resposta.status_code == 401
    assert resposta.headers["X-Frame-Options"] == "DENY"


def test_nada_de_cache_continua_nos_arquivos(cliente):
    # Os cabeçalhos novos não podem apagar o no-cache que faz o navegador pegar a versão nova depois do deploy
    assert cliente.get("/js/formulario.js").headers["Cache-Control"] == "no-cache"
