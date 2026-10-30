from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import FalhaValidacao, Validacao
from app.schemas import CampoPainel, FalhaPainel, RespostaPainel, SistemaPainel


def taxa(bloqueadas: int, total: int) -> float:
    return round(100 * bloqueadas / total, 1) if total else 0.0


def resumo_erros(sessao: Session) -> RespostaPainel:
    """Agrega o histórico de validações: totais, taxa de bloqueio por sistema e contagem de falhas."""
    bloqueada = case((Validacao.aprovado.is_(False), 1), else_=0)
    linhas_sistema = sessao.execute(
        select(Validacao.sistema_origem, func.count(), func.sum(bloqueada))
        .group_by(Validacao.sistema_origem)
        .order_by(Validacao.sistema_origem)
    ).all()
    por_sistema = [
        SistemaPainel(sistema_origem=sistema, validacoes=total, bloqueadas=bloq, taxa_bloqueio=taxa(bloq, total))
        for sistema, total, bloq in linhas_sistema
    ]

    quantidade = func.count().label("quantidade")
    linhas_campo = sessao.execute(
        select(FalhaValidacao.campo, quantidade)
        .group_by(FalhaValidacao.campo)
        .order_by(quantidade.desc(), FalhaValidacao.campo)
    ).all()

    linhas_falha = sessao.execute(
        select(FalhaValidacao.sistema_origem, FalhaValidacao.campo, FalhaValidacao.regra, quantidade)
        .group_by(FalhaValidacao.sistema_origem, FalhaValidacao.campo, FalhaValidacao.regra)
        .order_by(quantidade.desc(), FalhaValidacao.sistema_origem, FalhaValidacao.campo, FalhaValidacao.regra)
    ).all()

    total = sum(s.validacoes for s in por_sistema)
    bloqueadas = sum(s.bloqueadas for s in por_sistema)
    return RespostaPainel(
        total_validacoes=total,
        total_bloqueadas=bloqueadas,
        taxa_bloqueio=taxa(bloqueadas, total),
        por_sistema=por_sistema,
        por_campo=[CampoPainel(campo=campo, falhas=qtd) for campo, qtd in linhas_campo],
        falhas=[
            FalhaPainel(sistema_origem=sistema, campo=campo, regra=regra, quantidade=qtd)
            for sistema, campo, regra, qtd in linhas_falha
        ],
    )
