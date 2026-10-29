from fastapi import FastAPI

app = FastAPI(
    title="Valida SETIC",
    description=(
        "Camada central de qualidade de dados do Governo de Rondônia. "
        "Os sistemas chamam a API antes de gravar: o dado volta aprovado e padronizado, "
        "ou bloqueado com o campo, a regra violada e o formato esperado."
    ),
    version="0.1.0",
)


@app.get("/saude", tags=["sistema"])
def saude():
    return {"status": "ok"}
