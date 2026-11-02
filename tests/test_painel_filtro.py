"""Filtro por sistema nas falhas mais frequentes (cagd.html + painel.js)."""

import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def test_cagd_tem_o_filtro_de_sistema_nas_falhas(cliente):
    html = cliente.get("/cagd.html").text
    assert 'id="filtro-falhas"' in html and "Todos os sistemas" in html
    assert 'id="falhas-resumo"' in html


def test_toda_regra_dos_validadores_tem_nome_legivel_no_painel():
    # Regra nova sem nome legível apareceria como código técnico na tabela da CAGD
    codigo = "".join(p.read_text(encoding="utf-8") for p in (RAIZ / "app").rglob("*.py"))
    regras = set(re.findall(r'Falha\(\s*"([a-z_0-9]+)"', codigo)) | set(re.findall(r'regra="([a-z_0-9]+)"', codigo))
    painel = (RAIZ / "static" / "js" / "painel.js").read_text(encoding="utf-8")
    bloco = painel[painel.index("const REGRAS_LEGIVEIS"):painel.index("};", painel.index("const REGRAS_LEGIVEIS"))]
    legiveis = set(re.findall(r"^\s*([a-z_0-9]+):", bloco, re.M))
    assert regras, "não achou as regras dos validadores"
    assert regras <= legiveis, f"sem nome legível: {sorted(regras - legiveis)}"


def test_api_devolve_todas_as_falhas_para_o_filtro_da_tela(cliente):
    # O filtro por sistema roda na tela: a API não pode cortar a lista de falhas
    dados_com_erro = [
        {"nome": "M", "cpf": "1", "email": "a", "data_nascimento": "x", "telefone": "1", "municipio": "Xyz"},
        {"nome": "Maria 2", "cpf": "111.111.111-11", "email": "a b@c", "data_nascimento": "31/02/1990",
         "telefone": "(00) 1234-5678", "municipio": "Porto Velo"},
    ]
    for sistema in ["sistema_a", "sistema_b", "sistema_c"]:
        for dados in dados_com_erro:
            cliente.post("/validar", json={"sistema_origem": sistema, "dados": dados})
    falhas = cliente.get("/painel/erros").json()["falhas"]
    assert len(falhas) > 10
    assert {f["sistema_origem"] for f in falhas} == {"sistema_a", "sistema_b", "sistema_c"}
