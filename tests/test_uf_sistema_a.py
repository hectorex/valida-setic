"""UF do município no Sistema A: o seletor manda "uf" e o banco do Sistema A guarda a UF."""
import re

from app.models import Cadastro
from app.validadores.municipio import UFS

DADOS = {
    "nome": "Maria da Silva",
    "cpf": "123.456.789-09",
    "email": "maria@exemplo.com",
    "data_nascimento": "28/02/1990",
}


def test_cadastro_com_uf_grava_municipio_de_outro_estado(cliente, sessao):
    resposta = cliente.post("/cadastros", json={**DADOS, "municipio": "campinas", "uf": "SP"})
    assert resposta.status_code == 201
    cadastro = resposta.json()["cadastro"]
    assert (cadastro["municipio"], cadastro["municipio_uf"], cadastro["municipio_codigo_ibge"]) == (
        "Campinas", "SP", "3509502")
    assert sessao.get(Cadastro, cadastro["id"]).municipio_uf == "SP"
    assert cliente.get("/cadastros").json()[0]["municipio_uf"] == "SP"


def test_cadastro_com_uf_bloqueia_municipio_de_outro_estado(cliente, sessao):
    corpo = cliente.post("/cadastros", json={**DADOS, "municipio": "Porto Velho", "uf": "SP"}).json()
    assert corpo["gravado"] is False
    assert [(e["campo"], e["regra"]) for e in corpo["erros"]] == [("municipio", "municipio_existente")]
    assert sessao.query(Cadastro).count() == 0


def test_cadastro_com_ro_continua_igual(cliente):
    cadastro = cliente.post("/cadastros", json={**DADOS, "municipio": "porto velho", "uf": "RO"}).json()["cadastro"]
    assert (cadastro["municipio"], cadastro["municipio_uf"]) == ("Porto Velho", "RO")


def test_cadastro_sem_uf_deixa_a_uf_vazia(cliente):
    cadastro = cliente.post("/cadastros", json={**DADOS, "municipio": "Porto Velho"}).json()["cadastro"]
    assert cadastro["municipio_uf"] is None


def test_sistema_a_tem_seletor_com_as_27_ufs_e_ro_marcada(cliente):
    html = cliente.get("/sistema-a.html").text
    seletor = re.search(r'<select id="uf" name="uf"[^>]*>(.*?)</select>', html, re.S).group(1)
    assert set(re.findall(r'<option value="([A-Z]{2})"', seletor)) == UFS
    assert re.findall(r'<option value="([A-Z]{2})" selected', seletor) == ["RO"]


def test_sistema_b_nao_manda_uf(cliente):
    # O Sistema B não tem município: continua igual
    assert 'name="uf"' not in cliente.get("/sistema-b.html").text
