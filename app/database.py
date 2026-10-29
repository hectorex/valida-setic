import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Trocar para PostgreSQL é só mudar a URL, ex.: postgresql://usuario:senha@host/valida
URL_BANCO = os.getenv("VALIDA_DB_URL", "sqlite:///./valida.db")

# O SQLite precisa disso para ser usado pelas várias threads do FastAPI
argumentos = {"check_same_thread": False} if URL_BANCO.startswith("sqlite") else {}

engine = create_engine(URL_BANCO, connect_args=argumentos)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def obter_sessao():
    """Dependência das rotas: abre uma sessão por requisição e fecha no fim."""
    sessao = SessionLocal()
    try:
        yield sessao
    finally:
        sessao.close()
