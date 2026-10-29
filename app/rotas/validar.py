from typing import Annotated

from fastapi import APIRouter, Body

from app.schemas import ErroValidacao, RequisicaoValidacao, RespostaValidacao
from app.servicos.validacao import REGRAS_PADRAO, validar_dados

router = APIRouter(tags=["validação"])

# Exemplos do Swagger. tests/test_rota_validar.py confere que cada requisição
# gera exatamente a resposta documentada.
EXEMPLOS_REQUISICAO = {
    "bloqueado": {
        "summary": "Dados com erro (bloqueado, erros em camadas)",
        "value": {
            "sistema_origem": "sistema_a",
            "dados": {
                "nome": "Maria  da silva",
                "cpf": "123.456.789-09",
                "email": "maria",
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

EXEMPLOS_RESPOSTA = {
    "bloqueado": {
        "summary": "Bloqueado: todos os erros de uma vez",
        "value": RespostaValidacao(
            valido=False,
            erros=[
                ErroValidacao(
                    campo="email",
                    regra="possui_arroba",
                    mensagem="O e-mail precisa ter um único @, com o nome antes dele.",
                    formato_esperado="nome@dominio.com",
                ),
                ErroValidacao(
                    campo="email",
                    regra="dominio_valido",
                    mensagem="Informe o domínio depois do @, com ponto e terminação (ex.: exemplo.com.br).",
                    formato_esperado="nome@dominio.com",
                ),
                ErroValidacao(
                    campo="data_nascimento",
                    regra="data_existente",
                    mensagem="Essa data não existe. Confira o dia e o mês.",
                    formato_esperado="DD/MM/AAAA",
                ),
            ],
            dados_padronizados=None,
        ).model_dump(),
    },
    "aprovado": {
        "summary": "Aprovado: dados prontos para gravar",
        "value": RespostaValidacao(
            valido=True,
            erros=[],
            dados_padronizados={
                "nome": "Maria da Silva",
                "cpf": "12345678909",
                "email": "maria@exemplo.com",
                "data_nascimento": "1990-02-28",
            },
        ).model_dump(),
    },
}


@router.post(
    "/validar",
    response_model=RespostaValidacao,
    responses={200: {"content": {"application/json": {"examples": EXEMPLOS_RESPOSTA}}}},
)
def validar(requisicao: Annotated[RequisicaoValidacao, Body(openapi_examples=EXEMPLOS_REQUISICAO)]):
    """Verifica e padroniza os dados antes de o sistema gravar. Não grava nada."""
    return validar_dados(requisicao.dados.model_dump(), REGRAS_PADRAO)
