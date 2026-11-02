"""O painel "Dados fictícios para testar" diz a verdade: o que aprova aprova, e o que bloqueia bloqueia no campo certo.

Os valores são lidos do próprio static/js/dados-ficticios.js, para o teste e a tela nunca ficarem diferentes.
"""

import re
from pathlib import Path

import pytest

SCRIPT = (Path(__file__).resolve().parent.parent / "static" / "js" / "dados-ficticios.js").read_text(encoding="utf-8")
BLOCO_VALIDOS = SCRIPT[SCRIPT.index("const DADOS_VALIDOS"):SCRIPT.index("};", SCRIPT.index("const DADOS_VALIDOS"))]
VALIDOS = dict(re.findall(r"^\s*(\w+): '([^']*)',", BLOCO_VALIDOS, re.M))
COM_ERRO = re.findall(r"\{ campo: '(\w+)', valor: '([^']*)', motivo: '[^']*'(?:, semMascara: true)? \}", SCRIPT)


def test_leu_os_dados_do_script():
    assert set(VALIDOS) == {"nome", "cpf", "data_nascimento", "email", "telefone", "municipio"}
    assert len(COM_ERRO) >= 8 and {campo for campo, _ in COM_ERRO} == set(VALIDOS)


def test_os_dados_validos_aprovam(cliente):
    resposta = cliente.post("/validar", json={"sistema_origem": "x", "dados": VALIDOS}).json()
    assert resposta["valido"] is True, resposta["erros"]


@pytest.mark.parametrize("campo, valor", COM_ERRO)
def test_cada_dado_com_erro_bloqueia_no_campo_dele(cliente, campo, valor):
    resposta = cliente.post("/validar", json={"sistema_origem": "x", "dados": {**VALIDOS, campo: valor}}).json()
    assert resposta["valido"] is False
    assert {erro["campo"] for erro in resposta["erros"]} == {campo}


@pytest.mark.parametrize("pagina", ["/sistema-a.html", "/sistema-b.html"])
def test_paginas_dos_sistemas_tem_o_painel(cliente, pagina):
    html = cliente.get(pagina).text
    assert 'id="dados-ficticios"' in html and "js/dados-ficticios.js" in html
