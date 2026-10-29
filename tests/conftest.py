import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, obter_sessao
from app.main import app
from app.servicos.regras import inicializar_regras


@pytest.fixture
def sessao():
    """Banco SQLite em memória, novo a cada teste: os testes nunca tocam no valida.db."""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine)() as sessao:
        inicializar_regras(sessao)
        yield sessao


@pytest.fixture
def cliente(sessao):
    app.dependency_overrides[obter_sessao] = lambda: sessao
    # Sem "with": o ciclo de vida do app (que usa o valida.db) não roda nos testes
    yield TestClient(app)
    app.dependency_overrides.clear()
