from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import obter_sessao
from app.seguranca import RESPOSTA_401, exigir_senha_cagd
from app.schemas import RegraAtualizacao, RegraSaida
from app.servicos.regras import REGRAS_PADRAO, atualizar_regra, listar_regras

router = APIRouter(prefix="/regras", tags=["regras"])

# Exemplos do Swagger, montados com os modelos de schemas
EXEMPLO_LISTA = [RegraSaida(campo=campo, ativo=True, **padrao).model_dump() for campo, padrao in REGRAS_PADRAO.items()]

EXEMPLOS_ATUALIZACAO = {
    "tornar_obrigatorio": {
        "summary": "Tornar o campo obrigatório (interruptor da CAGD)",
        "value": {"obrigatorio": True},
    },
    "desativar": {
        "summary": "Desativar a validação do campo",
        "value": {"ativo": False},
    },
    "mudar_ajuda": {
        "summary": "Trocar o texto do ícone de ajuda",
        "value": {"ajuda": "Informe o celular com DDD. Ex.: (69) 99999-0000."},
    },
}

EXEMPLO_ATUALIZADO = RegraSaida(campo="telefone", ativo=True, **{**REGRAS_PADRAO["telefone"], "obrigatorio": True})


@router.get(
    "",
    response_model=list[RegraSaida],
    responses={200: {"content": {"application/json": {"example": EXEMPLO_LISTA}}}},
)
def listar(sessao: Session = Depends(obter_sessao)):
    """Configuração de cada campo. Os formulários montam asteriscos e textos de ajuda a partir daqui.

    O asterisco aparece só quando o campo está ativo **e** obrigatório: inativo prevalece.
    """
    return listar_regras(sessao)


@router.put(
    "/{campo}",
    response_model=RegraSaida,
    dependencies=[Depends(exigir_senha_cagd)],
    responses={
        **RESPOSTA_401,
        200: {
            "description": "Configuração do campo depois da alteração (exemplo: PUT /regras/telefone)",
            "content": {"application/json": {"example": EXEMPLO_ATUALIZADO.model_dump()}},
        },
        404: {
            "description": "Campo inexistente",
            "content": {
                "application/json": {
                    "example": {"detail": f"Campo 'apelido' não existe. Campos: {', '.join(REGRAS_PADRAO)}."}
                }
            },
        },
    },
)
def atualizar(
    campo: str,
    alteracoes: Annotated[RegraAtualizacao, Body(openapi_examples=EXEMPLOS_ATUALIZACAO)],
    sessao: Session = Depends(obter_sessao),
):
    """Altera a configuração de um campo. Só os atributos enviados mudam; vale na próxima validação.

    Protegido pela senha da CAGD (cabeçalho `X-Senha-CAGD`) quando o servidor tem `VALIDA_SENHA_CAGD`.

    Desativar não apaga o `obrigatorio`: ao reativar, o campo volta como estava.
    """
    regra = atualizar_regra(sessao, campo, alteracoes.model_dump(exclude_none=True))
    if regra is None:
        campos = ", ".join(REGRAS_PADRAO)
        raise HTTPException(status_code=404, detail=f"Campo '{campo}' não existe. Campos: {campos}.")
    return regra
