"""Ajustes do SQLite para aguentar várias validações ao mesmo tempo (ver scripts/teste_carga.py)."""

from sqlalchemy import create_engine, event, text

from app.database import ajustar_sqlite


def test_sqlite_usa_wal_e_espera_na_fila_em_vez_de_falhar(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'teste.db'}")
    event.listen(engine, "connect", ajustar_sqlite)
    with engine.connect() as conexao:
        assert conexao.execute(text("PRAGMA journal_mode")).scalar() == "wal"
        assert conexao.execute(text("PRAGMA synchronous")).scalar() == 1  # NORMAL
        assert conexao.execute(text("PRAGMA busy_timeout")).scalar() == 30000
    engine.dispose()
