"""Regra de formato que a CAGD cadastra pela tela, descrita por um molde (sem precisar saber programar).

No molde, `0` é um dígito, `A` é uma letra e `*` é letra ou dígito; qualquer outro caractere vale ele mesmo.
Ex.: `RO-000000` aceita `RO-123456`; `AAA-0A00` aceita a placa `ABC-1D23`.

O molde vira uma expressão sem repetições (um caractere por posição), então a checagem é sempre rápida: um molde
mal escrito pela CAGD não tem como travar o servidor, ao contrário de uma expressão regular livre.
"""

import re

from app.validadores.resultado import Falha, Resultado

TAMANHO_MAXIMO_MOLDE = 40
CURINGAS = {"0": "[0-9]", "A": "[A-Za-z]", "*": "[A-Za-z0-9]"}


def problema_no_molde(molde: str) -> str | None:
    """Explica por que o molde não serve (para a tela da CAGD), ou None se ele estiver certo."""
    if not molde or molde != molde.strip():
        return "O molde não pode ficar vazio nem começar ou terminar com espaço."
    if len(molde) > TAMANHO_MAXIMO_MOLDE:
        return f"O molde pode ter no máximo {TAMANHO_MAXIMO_MOLDE} caracteres."
    if not any(c in CURINGAS for c in molde):
        return "Use pelo menos um 0 (dígito), A (letra) ou * (letra ou dígito) no molde."
    return None


def compilar_molde(molde: str) -> re.Pattern:
    """Transforma o molde numa expressão: cada posição do molde casa exatamente um caractere."""
    partes = (CURINGAS.get(c) or re.escape(c) for c in molde)
    return re.compile("^" + "".join(partes) + "$", re.IGNORECASE)


def validar_molde(valor: str, molde: str, mensagem: str | None = None) -> Resultado:
    """Confere o valor contra o molde e padroniza: letras em maiúsculas e partes fixas iguais às do molde."""
    valor = valor.strip()
    if len(valor) != len(molde) or not compilar_molde(molde).fullmatch(valor):
        return Resultado(None, [Falha("formato", mensagem or f"Use o formato {molde}.", molde)])
    padronizado = "".join(v.upper() if m in CURINGAS else m for v, m in zip(valor, molde))
    return Resultado(padronizado)
