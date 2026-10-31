"""Senha simples da CAGD (não é login completo).

A senha vem da variável de ambiente VALIDA_SENHA_CAGD e é enviada no cabeçalho X-Senha-CAGD.
Sem a variável (ex.: no notebook da demo), a proteção fica desligada. No Render a variável é
definida no painel do serviço, porque o link é público.
"""

import os
import secrets

from fastapi import Header, HTTPException, status

CABECALHO = "X-Senha-CAGD"


def senha_configurada() -> str | None:
    # Lida a cada requisição: trocar a variável vale sem mudar código (e os testes conseguem ligar/desligar)
    return os.getenv("VALIDA_SENHA_CAGD") or None


def exigir_senha_cagd(
    senha: str | None = Header(
        default=None,
        alias=CABECALHO,
        description="Senha da CAGD. Obrigatória quando o servidor tem VALIDA_SENHA_CAGD definida.",
    ),
) -> None:
    esperada = senha_configurada()
    if esperada is None:
        return
    # compare_digest: compara em tempo constante, sem dar pista de quantos caracteres acertou
    if senha is None or not secrets.compare_digest(senha.encode(), esperada.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha da CAGD ausente ou incorreta.",
        )


RESPOSTA_401 = {
    401: {
        "description": "Senha da CAGD ausente ou incorreta (só quando o servidor tem senha configurada)",
        "content": {"application/json": {"example": {"detail": "Senha da CAGD ausente ou incorreta."}}},
    }
}
