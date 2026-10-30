from sqlalchemy import inspect, select

from app.models import FalhaValidacao, Validacao

CPF_FICTICIO = "123.456.789-09"
DADOS_VALIDOS = {
    "nome": "Maria  da silva",
    "cpf": CPF_FICTICIO,
    "email": "Maria@Exemplo.com",
    "data_nascimento": "28/02/1990",
}


def validar(cliente, dados, sistema="sistema_a"):
    return cliente.post("/validar", json={"sistema_origem": sistema, "dados": dados})


def test_aprovado_registra_validacao_sem_falhas(cliente, sessao):
    validar(cliente, DADOS_VALIDOS)
    validacao = sessao.scalars(select(Validacao)).one()
    assert validacao.sistema_origem == "sistema_a"
    assert validacao.aprovado is True
    assert validacao.data_hora is not None
    assert sessao.scalars(select(FalhaValidacao)).all() == []


def test_bloqueado_registra_uma_falha_por_regra(cliente, sessao):
    validar(cliente, {**DADOS_VALIDOS, "email": "maria", "data_nascimento": "31/02/1990"}, "sistema_b")
    validacao = sessao.scalars(select(Validacao)).one()
    assert validacao.aprovado is False
    falhas = sessao.scalars(select(FalhaValidacao)).all()
    assert [(f.sistema_origem, f.campo, f.regra) for f in falhas] == [
        ("sistema_b", "email", "possui_arroba"),
        ("sistema_b", "email", "dominio_valido"),
        ("sistema_b", "data_nascimento", "data_existente"),
    ]
    assert all(f.validacao_id == validacao.id for f in falhas)


def test_payload_malformado_nao_registra(cliente, sessao):
    cliente.post("/validar", json={"dados": DADOS_VALIDOS})
    assert sessao.scalars(select(Validacao)).all() == []


# LGPD: as tabelas de log não têm onde guardar o valor digitado


def test_tabelas_de_log_so_tem_sistema_campo_regra_e_data(sessao):
    colunas = lambda tabela: {c["name"] for c in inspect(sessao.bind).get_columns(tabela)}  # noqa: E731
    # duracao_ms é só o tempo da verificação em milissegundos: nenhum dado do cidadão
    assert colunas("validacoes") == {"id", "sistema_origem", "aprovado", "data_hora", "duracao_ms"}
    assert colunas("falhas_validacao") == {"id", "validacao_id", "sistema_origem", "campo", "regra", "data_hora"}


def test_valor_digitado_nao_aparece_no_log(cliente, sessao):
    validar(cliente, {**DADOS_VALIDOS, "cpf": "111.111.111-11", "email": "maria@"})
    for tabela in (Validacao, FalhaValidacao):
        for linha in sessao.scalars(select(tabela)):
            textos = " ".join(str(v) for v in vars(linha).values())
            assert "111.111.111-11" not in textos and "11111111111" not in textos
            assert "maria@" not in textos and "Maria" not in textos


def test_sistema_origem_muito_longo_retorna_422(cliente):
    assert validar(cliente, DADOS_VALIDOS, "s" * 51).status_code == 422
