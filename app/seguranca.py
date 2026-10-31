"""Login da CAGD: cada pessoa entra com o próprio usuário, e o histórico registra quem mudou cada regra.

Usuários vêm da variável de ambiente VALIDA_USUARIOS_CAGD, no formato
    usuario:Nome para exibir:senha;outro:Outro Nome:outra-senha
(a senha é o que vem depois do segundo ":", então pode conter ":"; não pode conter ";").
No Render a variável é definida no painel do serviço: as senhas nunca ficam no repositório.

Sem VALIDA_USUARIOS_CAGD, vale a senha única antiga (VALIDA_SENHA_CAGD) como o usuário "cagd".
Sem nenhuma das duas (ex.: notebook da demo), a proteção fica desligada.

Ao entrar, a pessoa recebe uma chave temporária (token) que vai no cabeçalho
"Authorization: Bearer <token>". As sessões ficam na memória do servidor: reiniciar pede login de novo.
"""

import os
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

DURACAO_SESSAO = timedelta(hours=8)
# Contra força bruta: 5 senhas erradas seguidas para um usuário bloqueiam o login dele por 5 minutos
MAXIMO_TENTATIVAS = 5
TEMPO_BLOQUEIO = timedelta(minutes=5)


@dataclass
class UsuarioCagd:
    usuario: str
    nome: str


@dataclass
class Sessao:
    usuario: UsuarioCagd
    expira_em: datetime


# token → sessão (na memória: o Render roda um processo só, e reiniciar já apaga o banco também)
SESSOES: dict[str, Sessao] = {}

# usuario → quantas senhas erradas seguidas; usuario → até quando o login está bloqueado.
# Valem também para usuários que não existem, para o bloqueio não revelar quais existem.
TENTATIVAS_ERRADAS: dict[str, int] = {}
BLOQUEADOS_ATE: dict[str, datetime] = {}


def usuarios_configurados() -> dict[str, tuple[str, str]]:
    """usuario → (nome, senha). Lido a cada chamada: trocar a variável vale sem mudar código."""
    usuarios = {}
    for item in (os.getenv("VALIDA_USUARIOS_CAGD") or "").split(";"):
        partes = item.strip().split(":", 2)
        if len(partes) == 3 and all(partes):
            usuario, nome, senha = partes
            usuarios[usuario.strip().lower()] = (nome.strip(), senha)
    if not usuarios and os.getenv("VALIDA_SENHA_CAGD"):
        usuarios["cagd"] = ("CAGD", os.environ["VALIDA_SENHA_CAGD"])
    return usuarios


def protecao_ligada() -> bool:
    return bool(usuarios_configurados())


def autenticar(usuario: str, senha: str) -> UsuarioCagd | None:
    usuario = usuario.strip().lower()
    cadastrado = usuarios_configurados().get(usuario)
    # Compara mesmo quando o usuário não existe, para não dar pista de quais usuários existem pelo tempo
    nome, esperada = cadastrado or ("", secrets.token_urlsafe(16))
    senha_confere = secrets.compare_digest(senha.encode(), esperada.encode())  # tempo constante
    return UsuarioCagd(usuario=usuario, nome=nome) if cadastrado and senha_confere else None


def segundos_de_bloqueio(usuario: str) -> int:
    """Quantos segundos faltam para o usuário poder tentar de novo (0 se não está bloqueado)."""
    usuario = usuario.strip().lower()
    ate = BLOQUEADOS_ATE.get(usuario)
    if ate is None:
        return 0
    restante = (ate - datetime.now(timezone.utc)).total_seconds()
    if restante <= 0:
        BLOQUEADOS_ATE.pop(usuario, None)
        return 0
    return int(restante) + 1


def registrar_tentativa(usuario: str, acertou: bool) -> None:
    """Acertou: zera a contagem. Errou: soma; na 5ª seguida, bloqueia o login por 5 minutos."""
    usuario = usuario.strip().lower()
    if acertou:
        TENTATIVAS_ERRADAS.pop(usuario, None)
        return
    TENTATIVAS_ERRADAS[usuario] = TENTATIVAS_ERRADAS.get(usuario, 0) + 1
    if TENTATIVAS_ERRADAS[usuario] >= MAXIMO_TENTATIVAS:
        TENTATIVAS_ERRADAS.pop(usuario, None)
        BLOQUEADOS_ATE[usuario] = datetime.now(timezone.utc) + TEMPO_BLOQUEIO


def abrir_sessao(usuario: UsuarioCagd) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    expira_em = datetime.now(timezone.utc) + DURACAO_SESSAO
    SESSOES[token] = Sessao(usuario=usuario, expira_em=expira_em)
    return token, expira_em


def encerrar_sessao(token: str) -> None:
    SESSOES.pop(token, None)


esquema_bearer = HTTPBearer(
    auto_error=False,
    description="Chave recebida no POST /cagd/login (no Swagger: botão Authorize).",
)


def usuario_cagd(
    credenciais: HTTPAuthorizationCredentials | None = Depends(esquema_bearer),
) -> UsuarioCagd | None:
    """Quem está fazendo a chamada. None quando a proteção está desligada (sem usuários configurados)."""
    if not protecao_ligada():
        return None
    sessao = SESSOES.get(credenciais.credentials) if credenciais else None
    if sessao is None or sessao.expira_em < datetime.now(timezone.utc):
        if sessao is not None:
            encerrar_sessao(credenciais.credentials)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Faça login na CAGD (sessão ausente ou expirada).",
        )
    # Usuário removido da variável perde o acesso mesmo com sessão aberta
    if sessao.usuario.usuario not in usuarios_configurados():
        encerrar_sessao(credenciais.credentials)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário sem acesso à CAGD.")
    return sessao.usuario


RESPOSTA_401 = {
    401: {
        "description": "Sem login na CAGD ou sessão expirada (só quando o servidor tem usuários configurados)",
        "content": {"application/json": {"example": {"detail": "Faça login na CAGD (sessão ausente ou expirada)."}}},
    }
}
