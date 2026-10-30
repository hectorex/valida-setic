from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

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


# Frontend (HTML/CSS/JS) servido pelo próprio FastAPI: mesma origem, sem problema de CORS
PASTA_STATIC = Path(__file__).resolve().parent.parent / "static"
app.mount("/static", StaticFiles(directory=PASTA_STATIC, html=True), name="static")


@app.get("/", include_in_schema=False)
def inicio():
    # Quem abre só o endereço do servidor (ex.: pelo QR code) cai na página inicial
    return RedirectResponse("/static/")


@app.get("/saude", tags=["sistema"])
def saude():
    return {"status": "ok"}
