import difflib
import re
import unicodedata

from app.dados.municipios_ro import MUNICIPIOS_RO
from app.validadores.resultado import Falha, Resultado

FORMATO_ESPERADO = "Município de Rondônia"


def normalizar(texto: str) -> str:
    """Chave de comparação: sem acento, minúsculo, sem apóstrofo, hífen e espaços.

    "Espigão D'Oeste", "espigao doeste" e "ESPIGAO D OESTE" viram "espigaodoeste".
    """
    sem_acento = "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))
    return re.sub(r"[\s'’´`-]", "", sem_acento.lower())


# Chave normalizada -> (nome oficial, código IBGE), montado uma vez
POR_CHAVE = {normalizar(nome): (nome, codigo) for nome, codigo in MUNICIPIOS_RO}


def validar_municipio(valor: str) -> Resultado:
    chave = normalizar(valor)
    if chave in POR_CHAVE:
        nome, codigo = POR_CHAVE[chave]
        return Resultado(nome, extras={"municipio_codigo_ibge": codigo})

    parecidos = difflib.get_close_matches(chave, POR_CHAVE, n=1, cutoff=0.75)
    if parecidos:
        sugestao = POR_CHAVE[parecidos[0]][0]
        mensagem = f"Município não encontrado em Rondônia. Você quis dizer {sugestao}?"
    else:
        mensagem = "Município não encontrado em Rondônia. Confira o nome."
    return Resultado(None, [Falha("municipio_ro", mensagem, FORMATO_ESPERADO)])
