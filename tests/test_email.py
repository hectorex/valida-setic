import pytest

from app.validadores.email import validar_email


def regras(resultado):
    return {falha.regra for falha in resultado.falhas}


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        ("Maria@Exemplo.com", "maria@exemplo.com"),
        ("joao.silva@sefin.ro.gov.br", "joao.silva@sefin.ro.gov.br"),
        ("  ana@exemplo.com.br ", "ana@exemplo.com.br"),
    ],
)
def test_email_valido_e_padronizado(entrada, esperado):
    resultado = validar_email(entrada)
    assert resultado.valido
    assert resultado.valor == esperado


@pytest.mark.parametrize(
    "entrada, regras_esperadas",
    [
        ("maria", {"possui_arroba", "dominio_valido"}),  # erros em camadas (R2)
        ("maria@", {"dominio_valido"}),  # sem domínio
        ("maria@exemplo", {"dominio_valido"}),  # sem TLD
        ("maria@exemplo.c", {"dominio_valido"}),  # TLD de 1 letra
        ("maria silva@exemplo.com", {"sem_espacos"}),
        ("maria@@exemplo.com", {"possui_arroba"}),
        ("@exemplo.com", {"possui_arroba"}),
    ],
)
def test_email_invalido(entrada, regras_esperadas):
    resultado = validar_email(entrada)
    assert not resultado.valido
    assert resultado.valor is None
    assert regras(resultado) == regras_esperadas


def test_falha_tem_mensagem_e_formato():
    falha = validar_email("maria@").falhas[0]
    assert falha.mensagem
    assert falha.formato_esperado == "nome@dominio.com"
