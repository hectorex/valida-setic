from fastapi import APIRouter, HTTPException, Query

from app.dados.municipios_ro import MUNICIPIOS_RO
from app.schemas import MunicipioSaida
from app.validadores.municipio import MUNICIPIOS_POR_UF, UF_PADRAO, UFS, normalizar

router = APIRouter(prefix="/municipios", tags=["municípios"])

# Em ordem alfabética ignorando acentos (ex.: "Ji-Paraná" antes de "Machadinho D'Oeste")
MUNICIPIOS = [
    MunicipioSaida(nome=nome, codigo_ibge=codigo)
    for nome, codigo in sorted(MUNICIPIOS_RO, key=lambda municipio: normalizar(municipio[0]))
]


@router.get(
    "",
    response_model=list[MunicipioSaida],
    responses={200: {"content": {"application/json": {"example": [m.model_dump() for m in MUNICIPIOS[:3]]}}}},
)
def listar_municipios(
    uf: str = Query(default=UF_PADRAO, min_length=2, max_length=2, description="Sigla do estado (padrão: RO).",
                    examples=["SP"]),
):
    """Municípios aceitos no campo `municipio`, para os formulários sugerirem enquanto o usuário digita.

    Sem `uf`, os 52 de Rondônia; com `uf` (ex.: `?uf=SP`), os daquele estado (5.571 no Brasil, dados do IBGE).
    A sugestão só ajuda: quem garante é o `POST /validar`, que aceita o nome sem acento ou com erro
    de digitação e devolve o nome oficial (ou sugere o mais parecido).
    """
    uf = uf.upper()
    if uf == UF_PADRAO:
        return MUNICIPIOS
    if uf not in UFS:
        raise HTTPException(status_code=404, detail="UF não encontrada. Use a sigla do estado (ex.: RO, SP).")
    return [MunicipioSaida(nome=nome, codigo_ibge=codigo) for nome, codigo in MUNICIPIOS_POR_UF[uf]]
