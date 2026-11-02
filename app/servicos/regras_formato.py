"""Regras de formato que a CAGD cadastra pela tela, para campos novos dos sistemas (ex.: matrícula, protocolo).

Os 6 campos padrão (nome, cpf…) têm regras técnicas no código; estas regras valem para os outros campos que os
sistemas mandarem. Toda criação, mudança e exclusão vai para o histórico, com o autor (mesmo histórico das regras).
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import HistoricoRegra, RegraFormato, agora_utc
from app.servicos.regras import REGRAS_PADRAO, como_texto


@dataclass
class ConfigRegraFormato:
    campo: str
    molde: str
    mensagem: str | None
    obrigatorio: bool


class CampoInvalido(ValueError):
    """Campo que não pode receber regra de formato (é um dos padrão ou já tem regra)."""


def listar_regras_formato(sessao: Session) -> list[RegraFormato]:
    return list(sessao.scalars(select(RegraFormato).order_by(RegraFormato.campo)))


def carregar_regras_formato(sessao: Session) -> list[ConfigRegraFormato]:
    """Só as ativas, para o /validar (lidas a cada chamada: a mudança da CAGD vale na hora)."""
    regras = sessao.scalars(select(RegraFormato).where(RegraFormato.ativo.is_(True)).order_by(RegraFormato.campo))
    return [ConfigRegraFormato(r.campo, r.molde, r.mensagem, r.obrigatorio) for r in regras]


def _historico(sessao: Session, campo: str, atributo: str, anterior, novo, autor: str | None, agora) -> None:
    sessao.add(HistoricoRegra(campo=campo, atributo=atributo, valor_anterior=como_texto(anterior),
                              valor_novo=como_texto(novo), usuario=autor, data_hora=agora))


def criar_regra_formato(sessao: Session, dados: dict, autor: str | None = None) -> RegraFormato:
    campo = dados["campo"]
    if campo in REGRAS_PADRAO:
        raise CampoInvalido(f"O campo '{campo}' é um dos campos padrão, que já têm regras próprias.")
    if sessao.scalar(select(RegraFormato).where(RegraFormato.campo == campo)):
        raise CampoInvalido(f"O campo '{campo}' já tem uma regra de formato. Edite a regra existente.")
    agora = agora_utc()
    regra = RegraFormato(**dados, criado_em=agora, atualizado_em=agora)
    sessao.add(regra)
    _historico(sessao, campo, "regra_criada", None, f"{dados['molde']} ({dados['nome']})", autor, agora)
    sessao.commit()  # a regra e o histórico entram juntos
    return regra


def atualizar_regra_formato(sessao: Session, id_regra: int, alteracoes: dict, autor: str | None = None) -> RegraFormato | None:
    """Altera só o que foi enviado; cada mudança real vira uma linha no histórico. None se não existir."""
    regra = sessao.get(RegraFormato, id_regra)
    if regra is None:
        return None
    agora = agora_utc()
    mudou = False
    for atributo, valor in alteracoes.items():
        anterior = getattr(regra, atributo)
        if anterior == valor:
            continue
        setattr(regra, atributo, valor)
        _historico(sessao, regra.campo, atributo, anterior, valor, autor, agora)
        mudou = True
    if mudou:
        regra.atualizado_em = agora
    sessao.commit()
    return regra


def excluir_regra_formato(sessao: Session, id_regra: int, autor: str | None = None) -> bool:
    regra = sessao.get(RegraFormato, id_regra)
    if regra is None:
        return False
    _historico(sessao, regra.campo, "regra_excluida", f"{regra.molde} ({regra.nome})", None, autor, agora_utc())
    sessao.delete(regra)
    sessao.commit()
    return True
