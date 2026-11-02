import difflib
import json
import re
import unicodedata
from functools import cache
from pathlib import Path

from app.dados.municipios_ro import MUNICIPIOS_RO
from app.validadores.resultado import Falha, Resultado

FORMATO_ESPERADO = "Município de Rondônia"
UF_PADRAO = "RO"  # sem "uf" na requisição, vale Rondônia (como sempre foi)

# Os 5.571 municípios do Brasil por UF (nome oficial e código IBGE), gerado uma vez a partir da API de
# localidades do IBGE (https://servicodados.ibge.gov.br/api/v1/localidades/municipios). Funciona offline.
MUNICIPIOS_POR_UF: dict[str, list[list[str]]] = json.loads(
    (Path(__file__).resolve().parent.parent / "dados" / "municipios_brasil.json").read_text(encoding="utf-8")
)
UFS = frozenset(MUNICIPIOS_POR_UF)


def normalizar(texto: str) -> str:
    """Chave de comparação: sem acento, minúsculo, sem apóstrofo, hífen e espaços.

    "Espigão D'Oeste", "espigao doeste" e "ESPIGAO D OESTE" viram "espigaodoeste".
    """
    sem_acento = "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))
    return re.sub(r"[\s'’´`-]", "", sem_acento.lower())


# Chave normalizada -> (nome oficial, código IBGE), montado uma vez
POR_CHAVE = {normalizar(nome): (nome, codigo) for nome, codigo in MUNICIPIOS_RO}


@cache
def por_chave_da_uf(uf: str) -> dict[str, tuple[str, str]]:
    """Índice de uma UF, montado na primeira vez que ela é usada."""
    if uf == UF_PADRAO:
        return POR_CHAVE
    return {normalizar(nome): (nome, codigo) for nome, codigo in MUNICIPIOS_POR_UF[uf]}


def validar_municipio(valor: str, uf: str | None = None) -> Resultado:
    """Sem `uf`, valida em Rondônia (como sempre). Com `uf` (ex.: "SP"), valida naquele estado e devolve a UF."""
    informou_uf = bool(uf and uf.strip())
    uf = uf.strip().upper() if informou_uf else UF_PADRAO
    if uf not in UFS:
        return Resultado(None, [Falha("uf_valida", "Essa UF não existe. Use a sigla do estado (ex.: RO, SP).",
                                      "Sigla da UF (ex.: RO)")])

    indice = por_chave_da_uf(uf)
    chave = normalizar(valor)
    if chave in indice:
        nome, codigo = indice[chave]
        extras = {"municipio_codigo_ibge": codigo}
        if informou_uf:
            extras["municipio_uf"] = uf
        return Resultado(nome, extras=extras)

    parecidos = difflib.get_close_matches(chave, indice, n=1, cutoff=0.75)
    if uf == UF_PADRAO:
        # Mensagem e regra de sempre para Rondônia (o contrato e o painel dependem delas)
        lugar, regra, formato = "Rondônia", "municipio_ro", FORMATO_ESPERADO
    else:
        lugar, regra, formato = uf, "municipio_existente", f"Município de {uf}"
    sufixo = f"Você quis dizer {indice[parecidos[0]][0]}?" if parecidos else "Confira o nome."
    return Resultado(None, [Falha(regra, f"Município não encontrado em {lugar}. {sufixo}", formato)])
