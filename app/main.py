from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import models  # noqa: F401  (registra as tabelas no Base)
from app.database import Base, SessionLocal, engine
from app.rotas import regras, validar
from app.servicos.regras import inicializar_regras


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    # Ao subir: cria as tabelas que ainda não existem e a configuração inicial dos campos
    Base.metadata.create_all(engine)
    with SessionLocal() as sessao:
        inicializar_regras(sessao)
    yield


app = FastAPI(
    lifespan=ciclo_de_vida,
    title="Valida SETIC",
    description=(
        "Camada central de qualidade de dados do Governo de Rondônia. "
        "Os sistemas chamam a API antes de gravar: o dado volta aprovado e padronizado, "
        "ou bloqueado com o campo, a regra violada e o formato esperado."
    ),
    version="0.1.0",
)

app.include_router(validar.router)
app.include_router(regras.router)


@app.get("/saude", tags=["sistema"])
def saude():
    return {"status": "ok"}
