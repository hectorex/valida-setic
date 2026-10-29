import re

from app.validadores.resultado import Falha, Resultado

FORMATO_ESPERADO = "000.000.000-00"
# 11 dígitos, com ou sem a pontuação padrão
FORMATO = re.compile(r"[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2}")


def _digitos_verificadores(nove_digitos: str) -> str:
    # Algoritmo da Receita: soma ponderada, resto da divisão por 11
    digitos = [int(d) for d in nove_digitos]
    for peso_inicial in (10, 11):
        soma = sum(d * peso for d, peso in zip(digitos, range(peso_inicial, 1, -1)))
        resto = soma * 10 % 11
        digitos.append(0 if resto == 10 else resto)
    return f"{digitos[9]}{digitos[10]}"


def validar_cpf(valor: str) -> Resultado:
    valor = valor.strip()
    if not FORMATO.fullmatch(valor):
        return Resultado(
            None,
            [Falha("formato", "O CPF deve ter 11 dígitos, com ou sem pontos e traço.", FORMATO_ESPERADO)],
        )

    digitos = re.sub(r"[.-]", "", valor)
    falhas = []

    if len(set(digitos)) == 1:
        falhas.append(
            Falha("digitos_repetidos", "CPF com todos os dígitos iguais não é válido.", FORMATO_ESPERADO)
        )

    if _digitos_verificadores(digitos[:9]) != digitos[9:]:
        falhas.append(
            Falha(
                "digitos_verificadores",
                "CPF inválido: os dois últimos dígitos não conferem. Confira o número digitado.",
                FORMATO_ESPERADO,
            )
        )

    if falhas:
        return Resultado(None, falhas)
    return Resultado(digitos)
