from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import obter_sessao
from app.schemas import RegraAtualizacao, RegraSaida
from app.servicos.regras import REGRAS_PADRAO, atualizar_regra, listar_regras

router = APIRouter(prefix="/regras", tags=["regras"])


@router.get("", response_model=list[RegraSaida])
def listar(sessao: Session = Depends(obter_sessao)):
    """Configuração de cada campo. Os formulários montam asteriscos e textos de ajuda a partir daqui."""
    return listar_regras(sessao)


@router.put("/{campo}", response_model=RegraSaida)
def atualizar(campo: str, alteracoes: RegraAtualizacao, sessao: Session = Depends(obter_sessao)):
    """Altera a configuração de um campo. Só os atributos enviados mudam; vale na próxima validação."""
    regra = atualizar_regra(sessao, campo, alteracoes.model_dump(exclude_none=True))
    if regra is None:
        campos = ", ".join(REGRAS_PADRAO)
        raise HTTPException(status_code=404, detail=f"Campo '{campo}' não existe. Campos: {campos}.")
    return regra
