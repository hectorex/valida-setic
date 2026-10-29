from datetime import date

import pytest

from app.validadores.data import validar_data_nascimento

HOJE = date(2026, 10, 29)


def regras(resultado):
    return {falha.regra for falha in resultado.falhas}


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        ("29/02/2024", "2024-02-29"),  # ano bissexto
        ("15/03/1985", "1985-03-15"),
        ("29/10/2026", "2026-10-29"),  # hoje
        ("29/10/1896", "1896-10-29"),  # exatamente 130 anos
        (" 01/01/2000 ", "2000-01-01"),
    ],
)
def test_data_valida_volta_em_iso(entrada, esperado):
    resultado = validar_data_nascimento(entrada, hoje=HOJE)
    assert resultado.valido
    assert resultado.valor == esperado


@pytest.mark.parametrize(
    "entrada, regras_esperadas",
    [
        ("00/00/0000", {"formato"}),
        ("1985-03-15", {"formato"}),
        ("15-3-85", {"formato"}),
        ("15 de março de 1985", {"formato"}),
        ("5/3/1985", {"formato"}),
        ("32/01/1990", {"formato"}),
        ("31/02/1990", {"data_existente"}),  # verificações seguintes puladas
        ("29/02/2023", {"data_existente"}),
        ("31/04/2000", {"data_existente"}),
        ("15/03/0000", {"data_existente"}),
        ("30/10/2026", {"nao_futura"}),  # amanhã
        ("28/10/1896", {"idade_maxima"}),  # 130 anos e 1 dia
    ],
)
def test_data_invalida(entrada, regras_esperadas):
    resultado = validar_data_nascimento(entrada, hoje=HOJE)
    assert not resultado.valido
    assert resultado.valor is None
    assert regras(resultado) == regras_esperadas


def test_idade_maxima_quando_hoje_e_29_de_fevereiro():
    hoje = date(2028, 2, 29)
    assert validar_data_nascimento("28/02/1898", hoje=hoje).valido
    assert regras(validar_data_nascimento("27/02/1898", hoje=hoje)) == {"idade_maxima"}


def test_falha_tem_mensagem_e_formato():
    falha = validar_data_nascimento("31/02/1990", hoje=HOJE).falhas[0]
    assert falha.mensagem
    assert falha.formato_esperado == "DD/MM/AAAA"
