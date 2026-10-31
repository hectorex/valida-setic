from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from app.schemas import EuSaida, LoginEntrada, LoginSaida
from app.seguranca import (
    RESPOSTA_401,
    UsuarioCagd,
    abrir_sessao,
    autenticar,
    encerrar_sessao,
    esquema_bearer,
    protecao_ligada,
    registrar_tentativa,
    segundos_de_bloqueio,
    usuario_cagd,
)

router = APIRouter(prefix="/cagd", tags=["login da CAGD"])


@router.post(
    "/login",
    response_model=LoginSaida,
    responses={
        401: {"content": {"application/json": {"example": {"detail": "Usuário ou senha incorretos."}}}},
        429: {
            "description": "5 senhas erradas seguidas: login do usuário bloqueado por 5 minutos",
            "content": {"application/json": {"example": {"detail": "Muitas tentativas erradas. Tente de novo em 5 minutos."}}},
        },
    },
)
def login(entrada: LoginEntrada):
    """Entra na CAGD com usuário e senha. Devolve a chave (token) que vai nas chamadas da CAGD.

    Cada mudança de regra fica registrada no histórico com o nome de quem estava logado.
    Contra força bruta: 5 senhas erradas seguidas bloqueiam o login daquele usuário por 5 minutos (429).
    """
    if not protecao_ligada():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este servidor está sem login na CAGD.")
    espera = segundos_de_bloqueio(entrada.usuario)
    if espera:
        # Bloqueado: nem confere a senha (até a senha certa é recusada enquanto durar o bloqueio)
        minutos = -(-espera // 60)  # arredonda para cima
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Muitas tentativas erradas. Tente de novo em {minutos} minuto{'s' if minutos > 1 else ''}.",
            headers={"Retry-After": str(espera)},
        )
    usuario = autenticar(entrada.usuario, entrada.senha)
    registrar_tentativa(entrada.usuario, acertou=usuario is not None)
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário ou senha incorretos.")
    token, expira_em = abrir_sessao(usuario)
    return LoginSaida(token=token, usuario=usuario.usuario, nome=usuario.nome, expira_em=expira_em)


@router.post("/sair", status_code=status.HTTP_204_NO_CONTENT)
def sair(credenciais: HTTPAuthorizationCredentials | None = Depends(esquema_bearer)):
    """Encerra a sessão: a chave deixa de valer na hora."""
    if credenciais:
        encerrar_sessao(credenciais.credentials)


@router.get("/eu", response_model=EuSaida, responses=RESPOSTA_401)
def quem_sou(usuario: UsuarioCagd | None = Depends(usuario_cagd)):
    """Quem está logado. Com o servidor sem usuários configurados, responde protegido=false (CAGD aberta)."""
    if usuario is None:
        return EuSaida(protegido=False, usuario=None, nome=None)
    return EuSaida(protegido=True, usuario=usuario.usuario, nome=usuario.nome)
