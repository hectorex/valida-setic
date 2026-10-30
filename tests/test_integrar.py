import json
import re

import pytest

LINGUAGENS = ["curl", "python", "javascript", "php", "java", "csharp"]


def exemplo(html, linguagem):
    return re.search(rf'<script type="text/plain" id="exemplo-{linguagem}">\n(.*?)</script>', html, re.S).group(1)


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
    assert "127.0.0.1" not in codigo and "onrender" not in codigo


def test_json_do_exemplo_curl_e_aceito_pela_api(cliente, html):
    # Se o contrato mudar, este teste avisa que os exemplos da página ficaram desatualizados
    corpo = json.loads(re.search(r"-d '(.*?)'", exemplo(html, "curl"), re.S).group(1))
    resposta = cliente.post("/validar", json=corpo).json()
    assert resposta["valido"] is False
    assert [(e["campo"], e["regra"]) for e in resposta["erros"]] == [
        ("email", "dominio_valido"),
        ("data_nascimento", "data_existente"),
    ]


def test_pagina_explica_os_tres_passos(html):
    for trecho in ["Antes de gravar", '"valido": false', '"valido": true', "dados_padronizados"]:
        assert trecho in html
