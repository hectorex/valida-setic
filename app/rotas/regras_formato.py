from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import obter_sessao
from app.schemas import (
    RegraFormatoAtualizacao,
    RegraFormatoEntrada,
    RegraFormatoSaida,
    RespostaTesteMolde,
    TesteMolde,
)
from app.seguranca import RESPOSTA_401, UsuarioCagd, usuario_cagd
from app.servicos.regras_formato import (
    CampoInvalido,
    atualizar_regra_formato,
    criar_regra_formato,
    excluir_regra_formato,
    listar_regras_formato,
)
from app.validadores.molde import validar_molde

router = APIRouter(prefix="/regras-formato", tags=["regras de formato da CAGD (campos novos)"])

EXEMPLOS_CRIACAO = {
    "matricula": {
        "summary": "Matrícula do servidor (RO- e 6 dígitos)",
        "value": {"campo": "matricula", "nome": "Matrícula do servidor", "molde": "RO-000000",
                  "mensagem": "Informe a matrícula no formato RO-000000.", "obrigatorio": False},
    },
    "placa": {
        "summary": "Placa de veículo no padrão Mercosul",
        "value": {"campo": "placa", "nome": "Placa do veículo", "molde": "AAA-0A00"},
    },
}

RESPOSTA_409 = {409: {"description": "O campo é um dos 6 padrão ou já tem regra de formato",
                      "content": {"application/json": {"example": {
                          "detail": "O campo 'matricula' já tem uma regra de formato. Edite a regra existente."}}}}}


def autor(quem: UsuarioCagd | None) -> str | None:
    return quem.nome if quem else None  # vai para o histórico: quem fez a mudança


@router.get("", response_model=list[RegraFormatoSaida])
def listar(sessao: Session = Depends(obter_sessao)):
    """Regras de formato que a CAGD criou para campos novos dos sistemas (ex.: matrícula, protocolo)."""
    return listar_regras_formato(sessao)


@router.post("/testar", response_model=RespostaTesteMolde)
def testar(teste: Annotated[TesteMolde, Body(openapi_examples={
    "aprovado": {"summary": "Valor no formato (padronizado)", "value": {"molde": "RO-000000", "valor": "ro-123456"}},
    "bloqueado": {"summary": "Valor fora do formato", "value": {"molde": "RO-000000", "valor": "RO-12"}},
})]):
    """Testa um valor contra um molde, sem salvar nada (a tela da CAGD usa antes de criar a regra).

    No molde: `0` = um dígito, `A` = uma letra, `*` = letra ou dígito; os outros caracteres valem eles mesmos.
    """
    resultado = validar_molde(teste.valor, teste.molde, teste.mensagem)
    return RespostaTesteMolde(valido=resultado.valido, valor_padronizado=resultado.valor,
                              mensagem=resultado.falhas[0].mensagem if resultado.falhas else None)


@router.post("", response_model=RegraFormatoSaida, status_code=status.HTTP_201_CREATED,
             responses={**RESPOSTA_401, **RESPOSTA_409})
def criar(
    regra: Annotated[RegraFormatoEntrada, Body(openapi_examples=EXEMPLOS_CRIACAO)],
    sessao: Session = Depends(obter_sessao),
    quem: UsuarioCagd | None = Depends(usuario_cagd),
):
    """A CAGD cria uma regra de formato para um campo novo. Vale na hora, para todos os sistemas.

    Exige login na CAGD. A criação entra no histórico (`GET /regras/historico`) com o nome de quem criou.
    """
    try:
        return criar_regra_formato(sessao, regra.model_dump(), autor(quem))
    except CampoInvalido as erro:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro)) from erro


@router.put("/{id_regra}", response_model=RegraFormatoSaida, responses=RESPOSTA_401)
def atualizar(
    id_regra: int,
    alteracoes: Annotated[RegraFormatoAtualizacao, Body(openapi_examples={
        "desativar": {"summary": "Desativar a regra", "value": {"ativo": False}},
        "obrigatorio": {"summary": "Tornar o campo obrigatório", "value": {"obrigatorio": True}},
    })],
    sessao: Session = Depends(obter_sessao),
    quem: UsuarioCagd | None = Depends(usuario_cagd),
):
    """Altera só o que for enviado (nome, molde, mensagem, obrigatório, ativo). Cada mudança entra no histórico."""
    regra = atualizar_regra_formato(sessao, id_regra, alteracoes.model_dump(exclude_unset=True), autor(quem))
    if regra is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regra de formato não encontrada.")
    return regra


@router.delete("/{id_regra}", status_code=status.HTTP_204_NO_CONTENT, responses=RESPOSTA_401)
def excluir(
    id_regra: int,
    sessao: Session = Depends(obter_sessao),
    quem: UsuarioCagd | None = Depends(usuario_cagd),
):
    """Exclui a regra (o campo volta a ser ignorado). A exclusão entra no histórico, com quem excluiu."""
    if not excluir_regra_formato(sessao, id_regra, autor(quem)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regra de formato não encontrada.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
