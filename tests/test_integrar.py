import json
import re
from pathlib import Path

import pytest

LINGUAGENS = ["curl", "python", "javascript", "php", "java", "csharp"]


def exemplo(html, linguagem):
    # \r?\n: no Windows o git pode trazer o arquivo com quebras de linha CRLF
    return re.search(rf'<script type="text/plain" id="exemplo-{linguagem}">\r?\n(.*?)</script>', html, re.S).group(1)


@pytest.fixture
def html(cliente):
    resposta = cliente.get("/integrar.html")
    assert resposta.status_code == 200
    return resposta.text


@pytest.mark.parametrize("linguagem", LINGUAGENS)
def test_cada_linguagem_chama_o_validar_no_endereco_do_servidor(html, linguagem):
    codigo = exemplo(html, linguagem)
    assert "{{URL}}/validar" in codigo  # o JS troca {{URL}} pelo endereço de onde a página foi aberta
    assert "sistema_origem" in codigo and "sistema_exemplo" in codigo
    assert "X-API-Key" in codigo and "demo-exemplo" in codigo  # a chave do sistema vai em todo exemplo
    assert "127.0.0.1" not in codigo and "onrender" not in codigo


def chaves_de_demonstracao():
    """As chaves que o render.yaml configura no site hospedado (sistema → chave)."""
    render = (Path(__file__).resolve().parent.parent / "render.yaml").read_text(encoding="utf-8")
    valor = re.search(r"key: VALIDA_CHAVES_SISTEMAS\s+value: (\S+)", render).group(1)
    return dict(item.split(":", 1) for item in valor.split(";"))


def test_json_e_chave_do_exemplo_curl_sao_aceitos_pela_api(cliente, html, monkeypatch):
    # Se o contrato mudar, este teste avisa que os exemplos da página ficaram desatualizados.
    # Roda com as mesmas chaves do site hospedado: o exemplo precisa funcionar lá.
    monkeypatch.setenv("VALIDA_CHAVES_SISTEMAS", ";".join(f"{s}:{c}" for s, c in chaves_de_demonstracao().items()))
    codigo = exemplo(html, "curl")
    corpo = json.loads(re.search(r"-d '(.*?)'", codigo, re.S).group(1))
    chave = re.search(r'-H "X-API-Key: (.*?)"', codigo).group(1)
    assert cliente.post("/validar", json=corpo).status_code == 401  # sem a chave, recusado
    resposta = cliente.post("/validar", json=corpo, headers={"X-API-Key": chave}).json()
    assert resposta["valido"] is False
    assert [(e["campo"], e["regra"]) for e in resposta["erros"]] == [
        ("email", "dominio_valido"),
        ("data_nascimento", "data_existente"),
    ]


def test_pagina_explica_os_tres_passos(html):
    for trecho in ["Antes de gravar", '"valido": false', '"valido": true', "dados_padronizados"]:
        assert trecho in html


def test_codigo_javascript_e_editavel_e_executavel(html):
    # A pessoa edita valores dentro do código JS e executa de verdade no navegador
    assert '<textarea id="codigo-js"' in html
    assert 'id="btn-executar"' in html
    assert "requisicao-exemplo" not in html  # a caixa de JSON solto saiu: agora é código de verdade


def test_exemplo_javascript_roda_sem_modulo(html):
    # O editor executa o texto como corpo de uma função async: não pode ter import/export
    codigo = exemplo(html, "javascript")
    assert "import " not in codigo and "export " not in codigo
    assert "await fetch('{{URL}}/validar'" in codigo


def test_api_responde_ao_que_foi_digitado(cliente):
    # O mesmo que a caixa editável faz: dados que nenhum botão prevê geram os erros desses dados
    resposta = cliente.post("/validar", json={
        "sistema_origem": "sistema_exemplo",
        "dados": {"nome": "Judson", "cpf": "123.456.789-09", "email": "celso@ifro", "data_nascimento": "15/03/1985"},
    }).json()
    assert [(e["campo"], e["regra"]) for e in resposta["erros"]] == [
        ("nome", "tamanho_minimo"),
        ("email", "dominio_valido"),
    ]


def test_antes_e_depois_destaca_as_linhas_novas(html):
    assert "antes e depois" in html
    assert html.count('class="linha-nova"') == 9  # o texto da página diz "+9 linhas"
    assert html.count('class="linha-alterada"') == 3  # e "3 alteradas"
    assert "+9 linhas" in html and "3 alteradas" in html


def test_funcao_usada_no_depois_existe_na_aba_php(html):
    # O "Antes e depois" chama valida_setic(): a aba PHP precisa definir essa função, senão o exemplo não roda
    assert "valida_setic(" in html.split("antes e depois")[1]
    php = exemplo(html, "php")
    assert "function valida_setic(array $dados)" in php
    assert "$resposta = valida_setic([" in php


def test_so_a_chave_de_testes_fica_publica(cliente, html):
    # A página Como integrar usa a chave de testes (sistema_exemplo). Os Sistemas A e B validam pelo próprio
    # backend, no servidor: nenhuma chave de sistema real aparece no render.yaml nem no navegador.
    assert chaves_de_demonstracao() == {"sistema_exemplo": "demo-exemplo"}
    for pagina in ["/sistema-a.html", "/sistema-b.html", "/js/formulario.js", "/js/comum.js"]:
        assert "X-API-Key" not in cliente.get(pagina).text, pagina
