import os

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Trocar para PostgreSQL é só mudar a URL, ex.: postgresql://usuario:senha@host/valida
URL_BANCO = os.getenv("VALIDA_DB_URL", "sqlite:///./valida.db")

# O SQLite precisa disso para ser usado pelas várias threads do FastAPI
argumentos = {"check_same_thread": False} if URL_BANCO.startswith("sqlite") else {}

engine = create_engine(URL_BANCO, connect_args=argumentos)
SessionLocal = sessionmaker(bind=engine)


def ajustar_sqlite(conexao, _registro) -> None:
    """Deixa o SQLite aguentar várias validações ao mesmo tempo (o teste de carga mostrou o travamento).

    - WAL: ler e gravar ao mesmo tempo, sem um bloquear o outro;
    - synchronous NORMAL: não espera o disco confirmar cada gravação (seguro com WAL);
    - busy_timeout: quem chega enquanto outro grava espera até 30 s na fila, em vez de falhar.
    """
    cursor = conexao.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=30000")
    cursor.close()


if URL_BANCO.startswith("sqlite"):
    event.listen(engine, "connect", ajustar_sqlite)


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
