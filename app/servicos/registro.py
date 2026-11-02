import time
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import FalhaValidacao, Validacao, agora_utc
from app.schemas import RespostaValidacao
from app.servicos.regras import carregar_config
from app.servicos.regras_formato import carregar_regras_formato
from app.servicos.validacao import validar_dados


def registrar_validacao(
    sessao: Session,
    sistema_origem: str,
    resposta: RespostaValidacao,
    data_hora: datetime | None = None,
    duracao_ms: float | None = None,
) -> Validacao:
    """Grava a validação e uma linha por regra violada. LGPD: nunca grava o valor digitado."""
    data_hora = data_hora or agora_utc()
    validacao = Validacao(
        sistema_origem=sistema_origem, aprovado=resposta.valido, data_hora=data_hora, duracao_ms=duracao_ms
    )
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
    """Lê a configuração do banco, valida e registra o resultado (e quanto tempo levou) para o painel."""
    inicio = time.perf_counter()
    resposta = validar_dados(dados, carregar_config(sessao), carregar_regras_formato(sessao))
    duracao_ms = (time.perf_counter() - inicio) * 1000
    registrar_validacao(sessao, sistema_origem, resposta, duracao_ms=duracao_ms)
    return resposta
