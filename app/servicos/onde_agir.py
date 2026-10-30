"""Onde agir: recomendações para a CAGD a partir das contagens do painel.

São regras simples e explicáveis, sem IA: para cada sistema, as falhas que mais pesam viram uma
sugestão concreta de ajuste no formulário daquele sistema.
"""

import re

from app.schemas import FalhaPainel, Recomendacao

# Só recomenda o que é relevante: pelo menos 3 ocorrências e 15% das falhas do sistema
MINIMO_OCORRENCIAS = 3
PERCENTUAL_MINIMO = 15.0
MAXIMO_POR_SISTEMA = 2

NOMES_CAMPOS = {
    "nome": "nome",
    "cpf": "CPF",
    "email": "e-mail",
    "data_nascimento": "data de nascimento",
    "telefone": "telefone",
    "municipio": "município",
}

# O que aconteceu, em português simples (completa a frase "falhas de <campo> <descrição>")
DESCRICOES = {
    "obrigatorio": "em branco",
    "formato": "fora do formato",
    "tamanho_minimo": "sem sobrenome",
    "caracteres_validos": "com números ou símbolos",
    "digitos_repetidos": "com todos os dígitos iguais",
    "digitos_verificadores": "com dígitos verificadores errados",
    "sem_espacos": "com espaços",
    "possui_arroba": "sem o @",
    "dominio_valido": "sem domínio completo",
    "data_existente": "com data que não existe",
    "nao_futura": "com data no futuro",
    "idade_maxima": "com idade acima de 130 anos",
    "ddd_valido": "com DDD inexistente",
    "celular_com_9": "de celular sem o 9",
    "municipio_ro": "com município fora de RO ou digitado errado",
}

# Sugestão de ajuste no formulário do sistema, por campo e regra
SUGESTOES = {
    ("data_nascimento", "formato"): "use máscara DD/MM/AAAA no campo de data, para o usuário digitar só os números.",
    ("data_nascimento", "data_existente"): "use um seletor de data, que não deixa escolher dias como 31/02.",
    ("data_nascimento", "nao_futura"): "limite o seletor de data até o dia de hoje.",
    ("data_nascimento", "idade_maxima"): "confira se o formulário não está gravando o ano com 2 dígitos.",
    ("cpf", "formato"): "use máscara 000.000.000-00 e aceite só números no campo.",
    ("cpf", "digitos_verificadores"): "mostre o CPF formatado enquanto o usuário digita, para ele conferir antes de enviar.",
    ("cpf", "digitos_repetidos"): "há CPFs coringa (ex.: 111.111.111-11) para pular o campo: avalie se o CPF é mesmo necessário nesse sistema.",
    ("email", "dominio_valido"): "mostre o exemplo nome@dominio.com ao lado do campo e use campo do tipo e-mail.",
    ("email", "possui_arroba"): "use campo do tipo e-mail: no celular, o teclado já mostra o @.",
    ("email", "sem_espacos"): "remova os espaços automaticamente enquanto o usuário digita.",
    ("telefone", "formato"): "use máscara (00) 00000-0000 e aceite só números.",
    ("telefone", "ddd_valido"): "use máscara com o DDD entre parênteses, para o usuário não esquecer ou trocar os dígitos.",
    ("telefone", "celular_com_9"): "escreva no rótulo \"celular com 9 dígitos\" e use máscara (00) 00000-0000.",
    ("nome", "tamanho_minimo"): "escreva \"nome completo\" no rótulo do campo: muitos informam só o primeiro nome.",
    ("nome", "caracteres_validos"): "não deixe digitar números e símbolos no campo de nome.",
    ("municipio", "municipio_ro"): "ofereça a lista de municípios com sugestão ao digitar (GET /municipios).",
}


def nome_sistema(sistema: str) -> str:
    """'sistema_a' → 'Sistema A'; outros nomes ficam como vieram."""
    casa = re.fullmatch(r"sistema_([a-z])", sistema, re.IGNORECASE)
    return f"Sistema {casa.group(1).upper()}" if casa else sistema


def formatar_percentual(valor: float) -> str:
    """21.3 → '21,3%'; 25.0 → '25%' (vírgula, como se escreve em português)."""
    texto = f"{valor:.1f}".replace(".", ",")
    return f"{texto.removesuffix(',0')}%"


def sugestao(campo: str, regra: str) -> str:
    if (campo, regra) in SUGESTOES:
        return SUGESTOES[(campo, regra)]
    nome = NOMES_CAMPOS.get(campo, campo)
    if regra == "obrigatorio":
        return (f"destaque o campo {nome} como obrigatório no formulário; se ele não for essencial nesse "
                "sistema, avalie torná-lo opcional na CAGD.")
    return f"revise o campo {nome} no formulário desse sistema: a regra {regra} concentra os erros."


def gerar_recomendacoes(falhas: list[FalhaPainel]) -> list[Recomendacao]:
    """As falhas que mais pesam em cada sistema viram recomendações, da mais frequente para a menos."""
    total_por_sistema: dict[str, int] = {}
    for falha in falhas:
        total_por_sistema[falha.sistema_origem] = total_por_sistema.get(falha.sistema_origem, 0) + falha.quantidade

    recomendacoes = []
    usadas_por_sistema: dict[str, int] = {}
    for falha in falhas:  # já vêm da mais frequente para a menos
        sistema = falha.sistema_origem
        percentual = round(100 * falha.quantidade / total_por_sistema[sistema], 1)
        if falha.quantidade < MINIMO_OCORRENCIAS or percentual < PERCENTUAL_MINIMO:
            continue
        if usadas_por_sistema.get(sistema, 0) >= MAXIMO_POR_SISTEMA:
            continue
        usadas_por_sistema[sistema] = usadas_por_sistema.get(sistema, 0) + 1

        campo = NOMES_CAMPOS.get(falha.campo, falha.campo)
        descricao = DESCRICOES.get(falha.regra, f"na regra {falha.regra}")
        recomendacoes.append(
            Recomendacao(
                sistema_origem=sistema,
                campo=falha.campo,
                regra=falha.regra,
                quantidade=falha.quantidade,
                percentual=percentual,
                diagnostico=(f"{nome_sistema(sistema)}: {formatar_percentual(percentual)} das falhas são de "
                             f"{campo} {descricao} "
                             f"({falha.quantidade} de {total_por_sistema[sistema]})."),
                sugestao=f"Sugestão: {sugestao(falha.campo, falha.regra)}",
            )
        )
    return recomendacoes
