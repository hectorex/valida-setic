from datetime import datetime, timedelta

from sqlalchemy import func, select

from app.models import FalhaValidacao, RegraCampo, Validacao
from app.seed import DIAS_DE_HISTORICO, PERFIS, popular

AGORA = datetime(2026, 11, 3, 16, 0)

# ids de regra do CLAUDE.md: o painel só pode mostrar regras que existem
REGRAS_VALIDAS = {
    "obrigatorio", "tamanho_minimo", "caracteres_validos", "formato", "digitos_repetidos",
    "digitos_verificadores", "sem_espacos", "possui_arroba", "dominio_valido", "data_existente",
    "nao_futura", "idade_maxima", "ddd_valido", "celular_com_9", "municipio_ro",
}


def contar(sessao, tabela):
    return sessao.scalar(select(func.count()).select_from(tabela))


def test_cria_o_historico_dos_dois_sistemas(sessao):
    contagem = popular(sessao, agora=AGORA)
    assert contagem["validacoes"] == sum(p["validacoes"] for p in PERFIS.values()) == contar(sessao, Validacao)
    assert contagem["falhas"] == contar(sessao, FalhaValidacao) >= contagem["bloqueadas"] > 0
    sistemas = set(sessao.scalars(select(Validacao.sistema_origem)))
    assert sistemas == {"sistema_a", "sistema_b"}


def test_bloqueadas_tem_falhas_e_aprovadas_nao(sessao):
    popular(sessao, agora=AGORA)
    for validacao in sessao.scalars(select(Validacao)):
        falhas = sessao.scalar(
            select(func.count()).select_from(FalhaValidacao).where(FalhaValidacao.validacao_id == validacao.id)
        )
        assert (falhas > 0) == (not validacao.aprovado)


def test_so_regras_conhecidas_e_datas_dos_ultimos_dias(sessao):
    popular(sessao, agora=AGORA)
    for falha in sessao.scalars(select(FalhaValidacao)):
        assert falha.regra in REGRAS_VALIDAS
    datas = list(sessao.scalars(select(Validacao.data_hora)))
    assert all(AGORA - timedelta(days=DIAS_DE_HISTORICO) <= d <= AGORA for d in datas)


def test_rodar_de_novo_substitui_e_da_o_mesmo_resultado(sessao):
    primeira = popular(sessao, agora=AGORA)
    segunda = popular(sessao, agora=AGORA)
    assert primeira == segunda
    assert contar(sessao, Validacao) == primeira["validacoes"]


def test_nao_mexe_nas_regras_da_cagd(sessao):
    sessao.get(RegraCampo, "telefone").obrigatorio = True
    sessao.commit()
    popular(sessao, agora=AGORA)
    assert sessao.get(RegraCampo, "telefone").obrigatorio is True


def test_painel_com_seed(cliente, sessao):
    popular(sessao, agora=AGORA)
    painel = cliente.get("/painel/erros").json()
    assert [s["sistema_origem"] for s in painel["por_sistema"]] == ["sistema_a", "sistema_b"]
    assert painel["total_validacoes"] == 200
    assert 0 < painel["taxa_bloqueio"] < 100
