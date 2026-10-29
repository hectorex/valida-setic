import pytest

from app.validadores.nome import validar_nome


def regras(resultado):
    return {falha.regra for falha in resultado.falhas}


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        ("Maria da Silva", "Maria da Silva"),
        ("  maria   DA  silva ", "Maria da Silva"),
        ("JOSÉ DOS SANTOS", "José dos Santos"),
        ("ana-clara d'ávila", "Ana-Clara D'Ávila"),
        ("joão e maria", "João e Maria"),
        ("da silva maria", "Da Silva Maria"),
    ],
)
def test_nome_valido_e_padronizado(entrada, esperado):
    resultado = validar_nome(entrada)
    assert resultado.valido
    assert resultado.valor == esperado


@pytest.mark.parametrize(
    "entrada, regras_esperadas",
    [
        ("Maria", {"tamanho_minimo"}),
        ("Maria da S1lva", {"caracteres_validos"}),
        ("Maria@ Silva", {"caracteres_validos"}),
        ("M4ria", {"tamanho_minimo", "caracteres_validos"}),
    ],
)
def test_nome_invalido(entrada, regras_esperadas):
    resultado = validar_nome(entrada)
    assert not resultado.valido
    assert resultado.valor is None
    assert regras(resultado) == regras_esperadas


def test_falha_tem_mensagem_e_formato():
    falha = validar_nome("Maria").falhas[0]
    assert falha.mensagem
    assert falha.formato_esperado == "Nome e sobrenome"
