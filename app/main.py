from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app import models  # noqa: F401  (registra as tabelas no Base)
from app.database import SessionLocal, atualizar_tabelas
from app.rotas import cadastros, cagd, municipios, painel, regras, validar
from app.servicos.regras import inicializar_regras


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    # Ao subir: cria as tabelas (e colunas novas) que ainda não existem e a configuração inicial dos campos
    atualizar_tabelas()
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
app.include_router(painel.router)
app.include_router(cadastros.router)
app.include_router(municipios.router)
app.include_router(cagd.router)


# Cabeçalhos de segurança em todas as respostas (API, páginas e arquivos)
CABECALHOS_DE_SEGURANCA = {
    # Nenhum outro site pode abrir nossas telas dentro dele (evita clickjacking na CAGD)
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "frame-ancestors 'none'",
    # O navegador não "adivinha" o tipo do arquivo: um texto nunca é executado como script
    "X-Content-Type-Options": "nosniff",
    # Ao seguir um link para outro site, não envia o endereço da nossa página
    "Referrer-Policy": "same-origin",
    # As telas não usam câmera, microfone nem localização
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    # Com HTTPS (Render), o navegador passa a usar só HTTPS neste endereço
    "Strict-Transport-Security": "max-age=31536000",
}


@app.middleware("http")
async def cabecalhos_de_seguranca(requisicao, chamar_proximo):
    resposta = await chamar_proximo(requisicao)
    for nome, valor in CABECALHOS_DE_SEGURANCA.items():
        resposta.headers.setdefault(nome, valor)
    return resposta


@app.get("/saude", tags=["sistema"])
def saude():
    return {"status": "ok"}


# Frontend (HTML/CSS/JS) servido pelo próprio FastAPI: mesma origem, sem problema de CORS.
# As páginas ficam na raiz (/sistema-a.html); /static/... continua valendo para links antigos.
# Os mounts ficam por último: as rotas da API e o /docs, declarados antes, têm prioridade.
PASTA_STATIC = Path(__file__).resolve().parent.parent / "static"


class ArquivosDoFrontend(StaticFiles):
    """Manda o navegador conferir se há versão nova a cada acesso (no-cache).

    Sem isso o navegador guardava o JS antigo depois de um deploy. Se nada mudou, o servidor responde
    304 (não modificado) sem reenviar o arquivo, então não fica mais lento.
    """

    def file_response(self, *args, **kwargs):
        resposta = super().file_response(*args, **kwargs)
        resposta.headers["Cache-Control"] = "no-cache"
        return resposta


app.mount("/static", ArquivosDoFrontend(directory=PASTA_STATIC, html=True), name="static")
app.mount("/", ArquivosDoFrontend(directory=PASTA_STATIC, html=True), name="frontend")
