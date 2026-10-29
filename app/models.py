from sqlalchemy import String
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
