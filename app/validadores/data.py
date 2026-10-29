import re
from datetime import date

from app.validadores.resultado import Falha, Resultado

FORMATO_ESPERADO = "DD/MM/AAAA"
IDADE_MAXIMA = 130
# DD/MM/AAAA estrito: dia 01-31, mês 01-12, ano com 4 dígitos
FORMATO = re.compile(r"(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/([0-9]{4})")


def _subtrair_anos(dia: date, anos: int) -> date:
    try:
        return dia.replace(year=dia.year - anos)
    except ValueError:  # 29/02 num ano que não é bissexto
        return dia.replace(year=dia.year - anos, day=28)


def validar_data_nascimento(valor: str, hoje: date | None = None) -> Resultado:
    hoje = hoje or date.today()
    casamento = FORMATO.fullmatch(valor.strip())
    if not casamento:
        return Resultado(
            None,
            [Falha("formato", "Use o formato DD/MM/AAAA, com dia, mês e ano completos.", FORMATO_ESPERADO)],
        )

    dia, mes, ano = (int(parte) for parte in casamento.groups())
    try:
        data = date(ano, mes, dia)
    except ValueError:
        return Resultado(
            None,
            [Falha("data_existente", "Essa data não existe. Confira o dia e o mês.", FORMATO_ESPERADO)],
        )

    falhas = []
    if data > hoje:
        falhas.append(Falha("nao_futura", "A data de nascimento não pode estar no futuro.", FORMATO_ESPERADO))
    if data < _subtrair_anos(hoje, IDADE_MAXIMA):
        falhas.append(
            Falha("idade_maxima", f"A data indica mais de {IDADE_MAXIMA} anos. Confira o ano.", FORMATO_ESPERADO)
        )

    if falhas:
        return Resultado(None, falhas)
    return Resultado(data.isoformat())
