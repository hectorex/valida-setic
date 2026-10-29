import pytest

from app.validadores.cpf import validar_cpf


def gerar_cpf(nove_digitos):
    """Gera um CPF fictício calculando os dígitos verificadores (independente do validador)."""
    digitos = [int(d) for d in nove_digitos]
    for peso_inicial in (10, 11):
        soma = sum(d * peso for d, peso in zip(digitos, range(peso_inicial, 1, -1)))
        resto = soma * 10 % 11
        digitos.append(0 if resto == 10 else resto)
    return "".join(str(d) for d in digitos)


def pontuar(cpf):
    return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"


def regras(resultado):
    return {falha.regra for falha in resultado.falhas}


CPF_VALIDO = gerar_cpf("123456789")
CPF_DV_ERRADO = CPF_VALIDO[:10] + str((int(CPF_VALIDO[10]) + 1) % 10)


@pytest.mark.parametrize("entrada", [pontuar(CPF_VALIDO), CPF_VALIDO, f"  {CPF_VALIDO}  "])
def test_cpf_valido_volta_so_digitos(entrada):
    resultado = validar_cpf(entrada)
    assert resultado.valido
    assert resultado.valor == CPF_VALIDO


@pytest.mark.parametrize(
    "entrada, regras_esperadas",
    [
        ("123.456.789-0", {"formato"}),  # 10 dígitos: verificações seguintes puladas
        ("1234567890", {"formato"}),
        ("123456789012", {"formato"}),
        ("123.abc.789-09", {"formato"}),
        ("123-456-789.09", {"formato"}),
        ("111.111.111-11", {"digitos_repetidos"}),
        ("00000000000", {"digitos_repetidos"}),
        (pontuar(CPF_DV_ERRADO), {"digitos_verificadores"}),
    ],
)
def test_cpf_invalido(entrada, regras_esperadas):
    resultado = validar_cpf(entrada)
    assert not resultado.valido
    assert resultado.valor is None
    assert regras(resultado) == regras_esperadas


def test_falha_tem_mensagem_e_formato():
    falha = validar_cpf("123").falhas[0]
    assert falha.mensagem
    assert falha.formato_esperado == "000.000.000-00"
