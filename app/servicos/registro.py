from datetime import datetime

from sqlalchemy.orm import Session

from app.models import FalhaValidacao, Validacao
from app.schemas import RespostaValidacao
from app.servicos.regras import carregar_config
from app.servicos.validacao import validar_dados


def registrar_validacao(
    sessao: Session, sistema_origem: str, resposta: RespostaValidacao, data_hora: datetime | None = None
) -> Validacao:
    """Grava a validação e uma linha por regra violada. LGPD: nunca grava o valor digitado."""
    data_hora = data_hora or datetime.now()
    validacao = Validacao(sistema_origem=sistema_origem, aprovado=resposta.valido, data_hora=data_hora)
    sessao.add(validacao)
    sessao.flush()  # gera o id da validação para ligar as falhas
    for erro in resposta.erros:
        sessao.add(
            FalhaValidacao(
                validacao_id=validacao.id,
                sistema_origem=sistema_origem,
                campo=erro.campo,
                regra=erro.regra,
                data_hora=data_hora,
            )
        )
    sessao.commit()
    return validacao


def validar_e_registrar(sessao: Session, sistema_origem: str, dados: dict) -> RespostaValidacao:
    """Lê a configuração do banco, valida e registra o resultado para o painel."""
    resposta = validar_dados(dados, carregar_config(sessao))
    registrar_validacao(sessao, sistema_origem, resposta)
    return resposta
