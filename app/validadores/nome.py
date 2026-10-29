import re

from app.validadores.resultado import Falha, Resultado

FORMATO_ESPERADO = "Nome e sobrenome"
PREPOSICOES = {"da", "de", "do", "das", "dos", "e"}
# Letras (inclusive acentuadas), espaço, apóstrofo e hífen
CARACTERES_VALIDOS = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ'’ -]+")


def _capitalizar(palavra: str) -> str:
    # Maiúscula no início de cada parte: "ana-clara" -> "Ana-Clara", "d'ávila" -> "D'Ávila"
    partes = re.split(r"([-'’])", palavra.lower())
    return "".join(parte[:1].upper() + parte[1:] for parte in partes)


def _padronizar(palavras: list[str]) -> str:
    padronizadas = []
    for posicao, palavra in enumerate(palavras):
        if posicao > 0 and palavra.lower() in PREPOSICOES:
            padronizadas.append(palavra.lower())
        else:
            padronizadas.append(_capitalizar(palavra))
    return " ".join(padronizadas)


def validar_nome(valor: str) -> Resultado:
    palavras = valor.split()
    falhas = []

    palavras_com_letra = [p for p in palavras if any(c.isalpha() for c in p)]
    if len(palavras_com_letra) < 2:
        falhas.append(Falha("tamanho_minimo", "Informe o nome e o sobrenome.", FORMATO_ESPERADO))

    if not CARACTERES_VALIDOS.fullmatch(valor.strip()):
        falhas.append(
            Falha(
                "caracteres_validos",
                "Use só letras, espaços, apóstrofo e hífen. Números e símbolos não são aceitos.",
                FORMATO_ESPERADO,
            )
        )

    if falhas:
        return Resultado(None, falhas)
    return Resultado(_padronizar(palavras))
