"""Histórico fictício para o painel de erros da demo.

Uso: python -m app.seed

Apaga o histórico de validações e cria um novo, sempre igual (semente fixa).
Não mexe nas regras da CAGD nem nos cadastros. Nenhum dado pessoal é gerado:
o histórico só tem sistema, campo, regra e data/hora, como no uso real.
"""

import random
from datetime import datetime, timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app import models  # noqa: F401  (registra as tabelas no Base)
from app.database import SessionLocal, atualizar_tabelas
from app.models import FalhaValidacao, Validacao, agora_utc
from app.servicos.regras import inicializar_regras

DIAS_DE_HISTORICO = 7

# Para cada sistema: quantas validações, que fração é bloqueada e quais falhas
# aparecem com mais frequência (campo, regra, peso). Cada sistema só erra nos
# campos que tem: o Sistema B não tem município, e erra mais no telefone.
PERFIS = {
    "sistema_a": {
        "validacoes": 120,
        "fracao_bloqueada": 0.35,
        "falhas": [
            ("data_nascimento", "formato", 10),
            ("data_nascimento", "data_existente", 6),
            ("data_nascimento", "nao_futura", 2),
            ("email", "dominio_valido", 8),
            ("email", "possui_arroba", 4),
            ("email", "sem_espacos", 2),
            ("cpf", "digitos_verificadores", 6),
            ("cpf", "formato", 4),
            ("cpf", "digitos_repetidos", 2),
            ("nome", "tamanho_minimo", 4),
            ("nome", "caracteres_validos", 2),
            ("cpf", "obrigatorio", 2),
        ],
    },
    "sistema_b": {
        "validacoes": 80,
        "fracao_bloqueada": 0.5,
        "falhas": [
            ("telefone", "ddd_valido", 8),
            ("telefone", "celular_com_9", 6),
            ("telefone", "formato", 5),
            ("telefone", "obrigatorio", 4),
            ("email", "dominio_valido", 5),
            ("data_nascimento", "formato", 4),
            ("cpf", "digitos_verificadores", 4),
            ("cpf", "formato", 3),
            ("nome", "tamanho_minimo", 2),
        ],
    },
}


def sortear_falhas(rng: random.Random, opcoes: list[tuple[str, str, int]]) -> list[tuple[str, str]]:
    """De 1 a 3 falhas, no máximo uma por campo (como nos erros em camadas mais comuns)."""
    quantidade = rng.choice([1, 1, 1, 2, 2, 3])
    escolhidas = {}
    while len(escolhidas) < quantidade:
        campo, regra, _ = rng.choices(opcoes, weights=[peso for *_, peso in opcoes])[0]
        escolhidas.setdefault(campo, regra)
    return list(escolhidas.items())


def popular(sessao: Session, agora: datetime | None = None, semente: int = 42) -> dict[str, int]:
    """Substitui o histórico de validações por um fictício. Devolve as contagens criadas."""
    agora = agora or agora_utc()
    rng = random.Random(semente)

    sessao.execute(delete(FalhaValidacao))
    sessao.execute(delete(Validacao))

    contagem = {"validacoes": 0, "bloqueadas": 0, "falhas": 0}
    for sistema, perfil in PERFIS.items():
        for _ in range(perfil["validacoes"]):
            data_hora = agora - timedelta(minutes=rng.randint(0, DIAS_DE_HISTORICO * 24 * 60))
            bloqueada = rng.random() < perfil["fracao_bloqueada"]
            validacao = Validacao(sistema_origem=sistema, aprovado=not bloqueada, data_hora=data_hora)
            sessao.add(validacao)
            sessao.flush()
            contagem["validacoes"] += 1
            if not bloqueada:
                continue
            contagem["bloqueadas"] += 1
            for campo, regra in sortear_falhas(rng, perfil["falhas"]):
                sessao.add(
                    FalhaValidacao(
                        validacao_id=validacao.id,
                        sistema_origem=sistema,
                        campo=campo,
                        regra=regra,
                        data_hora=data_hora,
                    )
                )
                contagem["falhas"] += 1

    sessao.commit()
    return contagem


def main() -> None:
    atualizar_tabelas()
    with SessionLocal() as sessao:
        inicializar_regras(sessao)
        contagem = popular(sessao)
    print(
        f"Histórico fictício criado: {contagem['validacoes']} validações, "
        f"{contagem['bloqueadas']} bloqueadas, {contagem['falhas']} falhas."
    )


if __name__ == "__main__":
    main()
