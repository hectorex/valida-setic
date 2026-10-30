import pytest

from app.validadores.telefone import DDDS_VALIDOS, validar_telefone


def regras(resultado):
    return {falha.regra for falha in resultado.falhas}


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        ("(69) 99999-0000", "69999990000"),  # celular com pontuação
        ("69999990000", "69999990000"),  # celular só dígitos
        ("69 9 9999-0000", "69999990000"),
        ("  (69) 99999.0000 ", "69999990000"),
        ("(69) 3216-0000", "6932160000"),  # fixo, 10 dígitos
        ("1132160000", "1132160000"),
    ],
)
def test_telefone_valido_volta_so_digitos(entrada, esperado):
    resultado = validar_telefone(entrada)
    assert resultado.valido
    assert resultado.valor == esperado


@pytest.mark.parametrize(
    "entrada, regras_esperadas",
    [
        ("99999-0000", {"formato"}),  # sem DDD: verificações seguintes puladas
        ("699999900001", {"formato"}),  # 12 dígitos
        ("+55 69 99999-0000", {"formato"}),  # com +55
        ("(69) 9999A-0000", {"formato"}),  # letra
        ("(20) 99999-0000", {"ddd_valido"}),  # DDD inexistente
        ("(69) 89999-0000", {"celular_com_9"}),  # 11 dígitos sem o 9
        ("(23) 89999-0000", {"ddd_valido", "celular_com_9"}),  # erros em camadas: as duas de uma vez
    ],
)
def test_telefone_invalido(entrada, regras_esperadas):
    resultado = validar_telefone(entrada)
    assert not resultado.valido
    assert resultado.valor is None
    assert regras(resultado) == regras_esperadas
    assert all(falha.formato_esperado == "(00) 00000-0000" for falha in resultado.falhas)


def test_sao_67_ddds_com_dois_digitos():
    assert len(DDDS_VALIDOS) == 67
    assert all(len(ddd) == 2 and ddd.isdigit() and ddd[1] != "0" for ddd in DDDS_VALIDOS)
    assert "69" in DDDS_VALIDOS  # Rondônia


def test_mensagem_do_ddd_diz_qual_e():
    falha = validar_telefone("(20) 99999-0000").falhas[0]
    assert "20" in falha.mensagem
