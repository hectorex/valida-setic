from fastapi import APIRouter

from app.dados.municipios_ro import MUNICIPIOS_RO
from app.schemas import MunicipioSaida
from app.validadores.municipio import normalizar

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
def listar_municipios():
    """Municípios aceitos no campo `municipio`, para os formulários sugerirem enquanto o usuário digita.

    A sugestão só ajuda: quem garante é o `POST /validar`, que aceita o nome sem acento ou com erro
    de digitação e devolve o nome oficial (ou sugere o mais parecido).
    """
    return MUNICIPIOS
