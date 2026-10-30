from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RegraCampo(Base):
    """Configuração de um campo, alterada pela CAGD. As regras técnicas ficam no código."""

    __tablename__ = "regras_campo"

    campo: Mapped[str] = mapped_column(String(50), primary_key=True)
    obrigatorio: Mapped[bool] = mapped_column(default=False)
    ativo: Mapped[bool] = mapped_column(default=True)
    formato_esperado: Mapped[str | None] = mapped_column(String(100))
    ajuda: Mapped[str | None] = mapped_column(String(300))


# LGPD: as duas tabelas de log nunca guardam o valor digitado, só sistema, campo, regra e data/hora.


class Validacao(Base):
    """Uma chamada ao POST /validar."""

    __tablename__ = "validacoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    sistema_origem: Mapped[str] = mapped_column(String(50), index=True)
    aprovado: Mapped[bool]
    data_hora: Mapped[datetime] = mapped_column(default=datetime.now)


class FalhaValidacao(Base):
    """Uma regra violada numa validação bloqueada."""

    __tablename__ = "falhas_validacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    validacao_id: Mapped[int] = mapped_column(ForeignKey("validacoes.id"), index=True)
    sistema_origem: Mapped[str] = mapped_column(String(50), index=True)
    campo: Mapped[str] = mapped_column(String(50))
    regra: Mapped[str] = mapped_column(String(50))
    data_hora: Mapped[datetime] = mapped_column(default=datetime.now)
