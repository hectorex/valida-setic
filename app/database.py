import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Trocar para PostgreSQL é só mudar a URL, ex.: postgresql://usuario:senha@host/valida
URL_BANCO = os.getenv("VALIDA_DB_URL", "sqlite:///./valida.db")

# O SQLite precisa disso para ser usado pelas várias threads do FastAPI
argumentos = {"check_same_thread": False} if URL_BANCO.startswith("sqlite") else {}

engine = create_engine(URL_BANCO, connect_args=argumentos)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


# Colunas acrescentadas depois que a tabela já existia nos bancos de quem rodava o projeto
COLUNAS_NOVAS = [
    ("validacoes", "duracao_ms", "FLOAT"),
    ("historico_regras", "usuario", "VARCHAR(100)"),
]


def atualizar_tabelas() -> None:
    """Cria as tabelas que faltam e acrescenta colunas novas em bancos criados antes delas.

    O create_all não altera tabelas que já existem; sem isso, o valida.db de quem já rodava o projeto
    quebraria ao gravar uma coluna nova.
    """
    Base.metadata.create_all(engine)
    for tabela, coluna, tipo in COLUNAS_NOVAS:
        colunas = {c["name"] for c in inspect(engine).get_columns(tabela)}
        if coluna not in colunas:
            with engine.begin() as conexao:
                conexao.execute(text(f"ALTER TABLE {tabela} ADD COLUMN {coluna} {tipo}"))


def obter_sessao():
    """Dependência das rotas: abre uma sessão por requisição e fecha no fim."""
    sessao = SessionLocal()
    try:
        yield sessao
    finally:
        sessao.close()
