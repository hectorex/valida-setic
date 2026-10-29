import re

from app.validadores.resultado import Falha, Resultado

FORMATO_ESPERADO = "nome@dominio.com"
# Partes separadas por ponto, terminando num TLD de 2 letras ou mais
DOMINIO = re.compile(r"[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}", re.IGNORECASE)


def validar_email(valor: str) -> Resultado:
    valor = valor.strip()
    falhas = []

    if any(c.isspace() for c in valor):
        falhas.append(Falha("sem_espacos", "Remova os espaços do e-mail.", FORMATO_ESPERADO))

    if valor.count("@") != 1 or valor.startswith("@"):
        falhas.append(
            Falha("possui_arroba", "O e-mail precisa ter um único @, com o nome antes dele.", FORMATO_ESPERADO)
        )

    dominio = valor.rsplit("@", 1)[1] if "@" in valor else ""
    if not DOMINIO.fullmatch(dominio):
        falhas.append(
            Falha(
                "dominio_valido",
                "Informe o domínio depois do @, com ponto e terminação (ex.: exemplo.com.br).",
                FORMATO_ESPERADO,
            )
        )

    if falhas:
        return Resultado(None, falhas)
    return Resultado(valor.lower())
