import re

from app.validadores.resultado import Falha, Resultado

FORMATO_ESPERADO = "(00) 00000-0000"
# Só dígitos e a pontuação comum de telefone: espaço, parênteses, hífen e ponto
CARACTERES_PERMITIDOS = re.compile(r"[0-9\s().-]+")

# Os 67 DDDs em uso no Brasil (Anatel)
DDDS_VALIDOS = {
    "11", "12", "13", "14", "15", "16", "17", "18", "19",
    "21", "22", "24", "27", "28",
    "31", "32", "33", "34", "35", "37", "38",
    "41", "42", "43", "44", "45", "46", "47", "48", "49",
    "51", "53", "54", "55",
    "61", "62", "63", "64", "65", "66", "67", "68", "69",
    "71", "73", "74", "75", "77", "79",
    "81", "82", "83", "84", "85", "86", "87", "88", "89",
    "91", "92", "93", "94", "95", "96", "97", "98", "99",
}


def validar_telefone(valor: str) -> Resultado:
    valor = valor.strip()
    digitos = re.sub(r"\D", "", valor)
    if not CARACTERES_PERMITIDOS.fullmatch(valor) or len(digitos) not in (10, 11):
        return Resultado(
            None,
            [
                Falha(
                    "formato",
                    "Informe o DDD e o número: 10 dígitos para fixo ou 11 para celular, sem o +55.",
                    FORMATO_ESPERADO,
                )
            ],
        )

    falhas = []
    ddd = digitos[:2]
    if ddd not in DDDS_VALIDOS:
        falhas.append(Falha("ddd_valido", f"O DDD {ddd} não existe. Confira os dois primeiros números.", FORMATO_ESPERADO))

    if len(digitos) == 11 and digitos[2] != "9":
        falhas.append(
            Falha(
                "celular_com_9",
                "Celular com 11 dígitos deve começar com 9 depois do DDD. Ex.: (69) 99999-0000.",
                FORMATO_ESPERADO,
            )
        )

    if falhas:
        return Resultado(None, falhas)
    return Resultado(digitos)
