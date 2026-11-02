from typing import Annotated

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.database import obter_sessao
from app.seguranca import RESPOSTA_401_CHAVE, sistema_chamador
from app.schemas import ErroValidacao, RequisicaoValidacao, RespostaValidacao
from app.servicos.registro import validar_e_registrar

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
                "municipio": "espigao doeste",
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
                "municipio": "Espigão D'Oeste",
                "municipio_codigo_ibge": "1100098",
            },
        ).model_dump(),
    },
}


@router.post(
    "/validar",
    response_model=RespostaValidacao,
    responses={200: {"content": {"application/json": {"examples": EXEMPLOS_RESPOSTA}}}, **RESPOSTA_401_CHAVE},
)
def validar(
    requisicao: Annotated[RequisicaoValidacao, Body(openapi_examples=EXEMPLOS_REQUISICAO)],
    sessao: Session = Depends(obter_sessao),
    sistema_da_chave: str | None = Depends(sistema_chamador),
):
    """Verifica e padroniza os dados antes de o sistema gravar. Não grava os dados.

    A configuração dos campos (obrigatório/ativo) é lida do banco a cada chamada.
    Cada chamada é registrada para o painel de erros só com sistema, campo, regra e data/hora,
    nunca com o valor digitado (LGPD).

    Com chaves configuradas no servidor, exige o cabeçalho `X-API-Key`, e o painel registra o sistema dono da
    chave (o `sistema_origem` enviado é ignorado): ninguém se passa por outro sistema.
    """
    sistema = sistema_da_chave or requisicao.sistema_origem
    return validar_e_registrar(sessao, sistema, requisicao.dados.model_dump())
