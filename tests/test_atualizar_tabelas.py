from sqlalchemy import create_engine, inspect, text

import app.database as database


def test_banco_antigo_ganha_a_coluna_duracao(tmp_path, monkeypatch):
    # Um valida.db criado antes da coluna duracao_ms não pode quebrar ao subir a versão nova
    engine = create_engine(f"sqlite:///{tmp_path / 'antigo.db'}")
    with engine.begin() as conexao:
        conexao.execute(text(
            "CREATE TABLE validacoes (id INTEGER PRIMARY KEY, sistema_origem VARCHAR(50), "
            "aprovado BOOLEAN, data_hora DATETIME)"
        ))
        conexao.execute(text("INSERT INTO validacoes (sistema_origem, aprovado) VALUES ('sistema_a', 1)"))
    monkeypatch.setattr(database, "engine", engine)

    database.atualizar_tabelas()
    database.atualizar_tabelas()  # rodar de novo não pode dar erro

    colunas = {c["name"] for c in inspect(engine).get_columns("validacoes")}
    assert "duracao_ms" in colunas
    with engine.connect() as conexao:
        assert conexao.execute(text("SELECT COUNT(*) FROM validacoes")).scalar() == 1  # dados preservados


def test_historico_antigo_ganha_a_coluna_usuario(tmp_path, monkeypatch):
    # Bancos criados no D5 já tinham historico_regras, mas sem quem fez a mudança
    engine = create_engine(f"sqlite:///{tmp_path / 'antigo.db'}")
    with engine.begin() as conexao:
        conexao.execute(text(
            "CREATE TABLE historico_regras (id INTEGER PRIMARY KEY, campo VARCHAR(50), atributo VARCHAR(30), "
            "valor_anterior VARCHAR(300), valor_novo VARCHAR(300), data_hora DATETIME)"
        ))
    monkeypatch.setattr(database, "engine", engine)

    database.atualizar_tabelas()

    assert "usuario" in {c["name"] for c in inspect(engine).get_columns("historico_regras")}
