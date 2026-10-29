from typing import Annotated

from fastapi import APIRouter, Body

from app.schemas import RequisicaoValidacao, RespostaValidacao
from app.servicos.validacao import REGRAS_PADRAO, validar_dados

router = APIRouter(tags=["validação"])

EXEMPLOS = {
    "bloqueado": {
        "summary": "Dados com erro (bloqueado)",
        "value": {
            "sistema_origem": "sistema_a",
            "dados": {
                "nome": "Maria  da silva",
                "cpf": "123.456.789-09",
                "email": "maria@",
                "data_nascimento": "31/02/1990",
            },
        },
    },
    "aprovado": {
        "summary": "Dados corretos (aprovado e padronizado)",
        "value": {
            "sistema_origem": "sistema_a",
            "dados": {
                "nome": "Maria  da silva",
                "cpf": "123.456.789-09",
                "email": "Maria@Exemplo.com",
                "data_nascimento": "28/02/1990",
            },
        },
    },
}


@router.post("/validar", response_model=RespostaValidacao)
def validar(requisicao: Annotated[RequisicaoValidacao, Body(openapi_examples=EXEMPLOS)]):
    """Verifica e padroniza os dados antes de o sistema gravar. Não grava nada."""
    return validar_dados(requisicao.dados.model_dump(), REGRAS_PADRAO)
