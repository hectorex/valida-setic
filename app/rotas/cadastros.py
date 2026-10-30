from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Response, status
from sqlalchemy.orm import Session

from app.database import obter_sessao
from app.schemas import CadastroSaida, DadosEntrada, ErroValidacao, RespostaCadastro
from app.servicos.cadastros import cadastrar, listar_cadastros

router = APIRouter(prefix="/cadastros", tags=["cadastros (Sistema A de exemplo)"])

# Exemplos do Swagger. tests/test_cadastros.py confere cada um contra a resposta real
# (menos id e criado_em, que mudam a cada execução).
EXEMPLOS_REQUISICAO = {
    "bloqueado": {
        "summary": "Dados com erro (nada é gravado)",
        "value": {
            "nome": "Maria  da silva",
            "cpf": "123.456.789-09",
            "email": "maria@",
            "data_nascimento": "31/02/1990",
        },
    },
    "gravado": {
        "summary": "Dados corretos (gravado já padronizado)",
        "value": {
            "nome": "Maria  da silva",
            "cpf": "123.456.789-09",
            "email": "Maria@Exemplo.com",
            "data_nascimento": "28/02/1990",
            "municipio": "porto velho",
        },
    },
}

EXEMPLO_CADASTRO = CadastroSaida(
    id=1,
    nome="Maria da Silva",
    cpf="12345678909",
    email="maria@exemplo.com",
    data_nascimento="1990-02-28",
    telefone=None,
    municipio="Porto Velho",
    municipio_codigo_ibge="1100205",
    criado_em=datetime(2026, 11, 3, 20, 30, tzinfo=timezone.utc),  # 16h30 em Rondônia
)

EXEMPLOS_RESPOSTA = {
    "gravado": RespostaCadastro(gravado=True, erros=[], cadastro=EXEMPLO_CADASTRO).model_dump(mode="json"),
    "bloqueado": RespostaCadastro(
        gravado=False,
        erros=[
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
        cadastro=None,
    ).model_dump(mode="json"),
}


@router.post(
    "",
    response_model=RespostaCadastro,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {
            "description": "Aprovado e gravado",
            "content": {"application/json": {"example": EXEMPLOS_RESPOSTA["gravado"]}},
        },
        200: {
            "description": "Bloqueado: nada foi gravado",
            "model": RespostaCadastro,
            "content": {"application/json": {"example": EXEMPLOS_RESPOSTA["bloqueado"]}},
        },
    },
)
def criar_cadastro(
    dados: Annotated[DadosEntrada, Body(openapi_examples=EXEMPLOS_REQUISICAO)],
    response: Response,
    sessao: Session = Depends(obter_sessao),
):
    """Backend do Sistema A de exemplo: chama a validação central e só grava se aprovado.

    Grava o dado **padronizado** (ex.: data em AAAA-MM-DD, CPF só dígitos). Bloqueado → HTTP 200 com
    `gravado: false` e os mesmos erros do `POST /validar`. A validação entra no painel como `sistema_a`.
    """
    resposta = cadastrar(sessao, dados.model_dump())
    if not resposta.gravado:
        response.status_code = status.HTTP_200_OK
    return resposta


@router.get(
    "",
    response_model=list[CadastroSaida],
    responses={200: {"content": {"application/json": {"example": [EXEMPLO_CADASTRO.model_dump(mode="json")]}}}},
)
def listar(sessao: Session = Depends(obter_sessao)):
    """Cadastros gravados pelo Sistema A, mais recentes primeiro. Na demo: prova que o dado inválido não entrou."""
    return listar_cadastros(sessao)
