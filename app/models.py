from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def agora_utc() -> datetime:
    """Horário em UTC. O servidor pode estar em qualquer fuso (o Render usa UTC); quem mostra converte
    para o fuso de quem está vendo. Sem isso, o horário aparecia 4 h adiantado em Rondônia."""
    return datetime.now(timezone.utc)


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
    data_hora: Mapped[datetime] = mapped_column(default=agora_utc)
    # Tempo que a verificação levou (ler a configuração + rodar os validadores). Nulo no histórico do seed:
    # o painel só mostra tempos medidos de verdade, nunca inventados.
    duracao_ms: Mapped[float | None]


class FalhaValidacao(Base):
    """Uma regra violada numa validação bloqueada."""

    __tablename__ = "falhas_validacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    validacao_id: Mapped[int] = mapped_column(ForeignKey("validacoes.id"), index=True)
    sistema_origem: Mapped[str] = mapped_column(String(50), index=True)
    campo: Mapped[str] = mapped_column(String(50))
    regra: Mapped[str] = mapped_column(String(50))
    data_hora: Mapped[datetime] = mapped_column(default=agora_utc)


class Cadastro(Base):
    """Cidadão gravado pelo Sistema A de exemplo. Só entra aqui o dado aprovado, já padronizado."""

    __tablename__ = "cadastros"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Todos opcionais: a CAGD pode tornar qualquer campo opcional ou inativo
    nome: Mapped[str | None] = mapped_column(String(200))
    cpf: Mapped[str | None] = mapped_column(String(11))
    email: Mapped[str | None] = mapped_column(String(200))
    data_nascimento: Mapped[str | None] = mapped_column(String(10))  # AAAA-MM-DD
    telefone: Mapped[str | None] = mapped_column(String(20))
    municipio: Mapped[str | None] = mapped_column(String(100))
    municipio_codigo_ibge: Mapped[str | None] = mapped_column(String(7))
    criado_em: Mapped[datetime] = mapped_column(default=agora_utc)


class HistoricoRegra(Base):
    """Uma mudança feita pela CAGD numa regra (auditoria): o que mudou, de quê para quê e quando."""

    __tablename__ = "historico_regras"

    id: Mapped[int] = mapped_column(primary_key=True)
    campo: Mapped[str] = mapped_column(String(50), index=True)
    atributo: Mapped[str] = mapped_column(String(30))  # obrigatorio, ativo, formato_esperado ou ajuda
    # Como texto: "true"/"false" para os interruptores, o próprio texto para formato e ajuda
    valor_anterior: Mapped[str | None] = mapped_column(String(300))
    valor_novo: Mapped[str | None] = mapped_column(String(300))
    data_hora: Mapped[datetime] = mapped_column(default=agora_utc)
