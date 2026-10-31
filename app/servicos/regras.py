from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import HistoricoRegra, RegraCampo, agora_utc
from app.servicos.validacao import ConfigCampo

# Configuração inicial de cada campo. A ordem aqui é a ordem dos campos
# no GET /regras e dos erros no POST /validar.
REGRAS_PADRAO = {
    "nome": {
        "obrigatorio": True,
        "formato_esperado": "Nome e sobrenome",
        "ajuda": "Nome completo, sem abreviações. Ex.: Maria da Silva.",
    },
    "cpf": {
        "obrigatorio": True,
        "formato_esperado": "000.000.000-00",
        "ajuda": "Os 11 números do CPF, com ou sem pontos e traço.",
    },
    "email": {
        "obrigatorio": True,
        "formato_esperado": "nome@dominio.com",
        "ajuda": "E-mail para contato. Ex.: maria@exemplo.com.",
    },
    "data_nascimento": {
        "obrigatorio": True,
        "formato_esperado": "DD/MM/AAAA",
        "ajuda": "Dia, mês e ano com 4 dígitos. Ex.: 15/03/1985.",
    },
    "telefone": {
        "obrigatorio": False,
        "formato_esperado": "(00) 00000-0000",
        "ajuda": "DDD e número. Celular tem 9 dígitos e começa com 9.",
    },
    "municipio": {
        "obrigatorio": False,
        "formato_esperado": "Município de Rondônia",
        "ajuda": "Nome do município em Rondônia. Ex.: Porto Velho.",
    },
}


def config_padrao() -> dict[str, ConfigCampo]:
    """Configuração inicial sem banco (usada em testes do serviço de validação)."""
    return {
        campo: ConfigCampo(obrigatorio=padrao["obrigatorio"], formato_esperado=padrao["formato_esperado"])
        for campo, padrao in REGRAS_PADRAO.items()
    }


def inicializar_regras(sessao: Session) -> None:
    """Cria os campos que ainda não estão no banco. Nunca sobrescreve o que a CAGD alterou."""
    for campo, padrao in REGRAS_PADRAO.items():
        if sessao.get(RegraCampo, campo) is None:
            sessao.add(RegraCampo(campo=campo, ativo=True, **padrao))
    sessao.commit()


def listar_regras(sessao: Session) -> list[RegraCampo]:
    regras = {regra.campo: regra for regra in sessao.scalars(select(RegraCampo))}
    return [regras[campo] for campo in REGRAS_PADRAO if campo in regras]


def carregar_config(sessao: Session) -> dict[str, ConfigCampo]:
    return {
        regra.campo: ConfigCampo(
            obrigatorio=regra.obrigatorio, ativo=regra.ativo, formato_esperado=regra.formato_esperado
        )
        for regra in listar_regras(sessao)
    }


def como_texto(valor) -> str | None:
    """Valor de um atributo como texto para o histórico: True → "true", textos ficam como estão."""
    if valor is None:
        return None
    if isinstance(valor, bool):
        return "true" if valor else "false"
    return str(valor)


def atualizar_regra(sessao: Session, campo: str, alteracoes: dict) -> RegraCampo | None:
    """Altera só os atributos enviados e registra cada mudança no histórico. None se o campo não existir."""
    regra = sessao.get(RegraCampo, campo)
    if regra is None:
        return None
    agora = agora_utc()
    for atributo, valor in alteracoes.items():
        anterior = getattr(regra, atributo)
        if anterior == valor:
            continue  # enviar o mesmo valor não é mudança: não entra no histórico
        setattr(regra, atributo, valor)
        sessao.add(
            HistoricoRegra(
                campo=campo,
                atributo=atributo,
                valor_anterior=como_texto(anterior),
                valor_novo=como_texto(valor),
                data_hora=agora,
            )
        )
    sessao.commit()  # a mudança e o histórico entram juntos (ou nenhum dos dois)
    return regra


def listar_historico(sessao: Session, limite: int = 50) -> list[HistoricoRegra]:
    """Mudanças mais recentes primeiro."""
    return list(sessao.scalars(select(HistoricoRegra).order_by(HistoricoRegra.id.desc()).limit(limite)))
