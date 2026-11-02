import time

import pytest

from app.validadores.molde import compilar_molde, problema_no_molde, validar_molde


@pytest.mark.parametrize("valor, molde, padronizado", [
    ("RO-123456", "RO-000000", "RO-123456"),
    ("ro-123456", "RO-000000", "RO-123456"),  # minúsculas viram maiúsculas, e a parte fixa fica igual à do molde
    ("  RO-123456 ", "RO-000000", "RO-123456"),  # espaços nas pontas
    ("abc-1d23", "AAA-0A00", "ABC-1D23"),  # placa Mercosul
    ("2026/000123", "0000/000000", "2026/000123"),  # protocolo
    ("x9Z", "***", "X9Z"),
    ("João-12", "AAAA-00", None),  # "ã" não é letra do molde (A-Z): bloqueia
])
def test_valores(valor, molde, padronizado):
    resultado = validar_molde(valor, molde)
    assert resultado.valor == padronizado
    assert resultado.valido is (padronizado is not None)


@pytest.mark.parametrize("valor", ["RO-12345", "RO-1234567", "RO123456", "SP-123456", "RO-12345A", "", "RO-123 56"])
def test_formato_errado_bloqueia_com_a_mensagem_e_o_molde(valor):
    resultado = validar_molde(valor, "RO-000000", "Informe a matrícula no formato RO-000000.")
    assert [f.regra for f in resultado.falhas] == ["formato"]
    assert resultado.falhas[0].mensagem == "Informe a matrícula no formato RO-000000."
    assert resultado.falhas[0].formato_esperado == "RO-000000"


def test_sem_mensagem_usa_a_padrao():
    assert validar_molde("x", "000").falhas[0].mensagem == "Use o formato 000."


def test_caracteres_especiais_do_molde_valem_eles_mesmos():
    # ".", "(", "+" etc. não podem virar coringas de expressão regular
    assert validar_molde("(69) 1.2", "(00) 0.0").valido
    assert not validar_molde("(69) 1x2", "(00) 0.0").valido
    assert not validar_molde("A+", "0+").valido


@pytest.mark.parametrize("molde, problema", [
    ("RO-000000", None),
    ("", "vazio"),
    (" 000", "espaço"),
    ("RO-", "pelo menos um"),
    ("0" * 41, "no máximo"),
])
def test_problema_no_molde(molde, problema):
    resposta = problema_no_molde(molde)
    assert (resposta is None) if problema is None else (problema in resposta)


def test_texto_gigante_nao_trava():
    inicio = time.perf_counter()
    assert not validar_molde("a" * 200_000, "*" * 40).valido
    assert time.perf_counter() - inicio < 0.5


def test_molde_compilado_nao_tem_repeticao():
    assert not any(c in compilar_molde("A0*-.()+?").pattern for c in "{}") and "+?" not in compilar_molde("A0").pattern
