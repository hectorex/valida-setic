import pytest

from app.schemas import FalhaPainel
from app.servicos.onde_agir import (
    DESCRICOES,
    SUGESTOES,
    formatar_percentual,
    gerar_recomendacoes,
    nome_sistema,
)


def falha(sistema, campo, regra, quantidade):
    return FalhaPainel(sistema_origem=sistema, campo=campo, regra=regra, quantidade=quantidade)


def test_recomenda_a_falha_que_mais_pesa_com_diagnostico_e_sugestao():
    falhas = [
        falha("sistema_a", "data_nascimento", "formato", 16),
        falha("sistema_a", "email", "dominio_valido", 4),
    ]
    [recomendacao] = [r for r in gerar_recomendacoes(falhas) if r.regra == "formato"]
    assert recomendacao.percentual == 80.0
    assert recomendacao.diagnostico == (
        "Sistema A: 80% das falhas são de data de nascimento fora do formato (16 de 20)."
    )
    assert recomendacao.sugestao.startswith("Sugestão: use máscara DD/MM/AAAA")


def test_ignora_o_que_e_pouco_relevante():
    falhas = [
        falha("sistema_a", "cpf", "formato", 2),  # menos de 3 ocorrências
        falha("sistema_b", "cpf", "formato", 10),
        *[falha("sistema_b", f"campo_{i}", "obrigatorio", 9) for i in range(10)],  # cada uma < 15% do sistema
    ]
    recomendacoes = gerar_recomendacoes(falhas)
    assert all(r.sistema_origem != "sistema_a" for r in recomendacoes)
    assert recomendacoes == []


def test_no_maximo_duas_por_sistema_e_cada_sistema_tem_as_suas():
    falhas = [
        falha("sistema_a", "data_nascimento", "formato", 10),
        falha("sistema_a", "cpf", "formato", 10),
        falha("sistema_a", "email", "dominio_valido", 10),
        falha("sistema_b", "telefone", "celular_com_9", 5),
    ]
    sistemas = [r.sistema_origem for r in gerar_recomendacoes(falhas)]
    assert sistemas.count("sistema_a") == 2
    assert sistemas.count("sistema_b") == 1


def test_sem_falhas_sem_recomendacoes():
    assert gerar_recomendacoes([]) == []


def test_obrigatorio_e_regra_sem_sugestao_propria_tem_texto_generico():
    falhas = [falha("portal_saude", "telefone", "obrigatorio", 5), falha("portal_saude", "campo_novo", "regra_nova", 5)]
    obrigatorio, generica = gerar_recomendacoes(falhas)
    assert "destaque o campo telefone como obrigatório" in obrigatorio.sugestao
    assert "regra_nova" in generica.sugestao
    assert generica.diagnostico.startswith("portal_saude:")  # nome fora do padrão sistema_<letra> fica como veio


@pytest.mark.parametrize("valor, texto", [(21.9, "21,9%"), (25.0, "25%"), (100.0, "100%")])
def test_percentual_em_portugues(valor, texto):
    assert formatar_percentual(valor) == texto


def test_nome_do_sistema():
    assert nome_sistema("sistema_b") == "Sistema B"
    assert nome_sistema("sistema_exemplo") == "sistema_exemplo"


def test_toda_regra_com_sugestao_tem_descricao():
    # Se alguém acrescentar uma sugestão para uma regra nova, o diagnóstico também precisa saber descrevê-la
    for _, regra in SUGESTOES:
        assert regra in DESCRICOES


def test_painel_traz_onde_agir_com_o_historico_do_seed(cliente, sessao):
    from app.seed import popular

    popular(sessao)
    onde_agir = cliente.get("/painel/erros").json()["onde_agir"]
    assert onde_agir, "o histórico do seed deveria gerar recomendações para a demo"
    for recomendacao in onde_agir:
        assert recomendacao["percentual"] >= 15 and recomendacao["quantidade"] >= 3
        assert recomendacao["sugestao"].startswith("Sugestão: ")
