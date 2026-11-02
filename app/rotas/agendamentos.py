"""Backend do Sistema B de exemplo (Agendamento de Atendimento).

Como o /cadastros é para o Sistema A: o formulário do Sistema B fala só com este backend, e é o servidor que chama a
validação. Num sistema real, a chave do Sistema B ficaria guardada aqui, no servidor: o navegador nunca a vê.
O Sistema B não grava nada: só valida antes de seguir com o agendamento.
"""

from typing import Annotated

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.database import obter_sessao
from app.schemas import DadosEntrada, RespostaValidacao
from app.servicos.registro import validar_e_registrar

router = APIRouter(prefix="/agendamentos", tags=["agendamentos (Sistema B de exemplo)"])

EXEMPLOS_REQUISICAO = {
    "bloqueado": {
        "summary": "Data em outro formato (o Sistema B não tem máscara)",
        "value": {"nome": "João Pereira", "cpf": "123.456.789-09", "email": "joao@exemplo.com",
                  "data_nascimento": "1985-03-15", "telefone": "69999991234"},
    },
}


@router.post("", response_model=RespostaValidacao)
def validar_agendamento(
    dados: Annotated[DadosEntrada, Body(openapi_examples=EXEMPLOS_REQUISICAO)],
    sessao: Session = Depends(obter_sessao),
):
    """Valida os dados do agendamento como `sistema_b`, no servidor, e devolve a mesma resposta do `POST /validar`.

    Recebe os campos direto no corpo (sem `sistema_origem`). Não pede chave: é o backend do próprio Sistema B.
    """
    return validar_e_registrar(sessao, "sistema_b", dados.model_dump())
