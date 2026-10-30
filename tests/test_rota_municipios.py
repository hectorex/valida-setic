from app.dados.municipios_ro import MUNICIPIOS_RO
from app.validadores.municipio import validar_municipio


def test_lista_os_52_municipios_com_codigo(cliente):
    municipios = cliente.get("/municipios").json()
    assert len(municipios) == 52
    assert {(m["nome"], m["codigo_ibge"]) for m in municipios} == set(MUNICIPIOS_RO)


def test_ordem_alfabetica_comeca_e_termina_certo(cliente):
    nomes = [m["nome"] for m in cliente.get("/municipios").json()]
    assert nomes[0] == "Alta Floresta D'Oeste"
    assert nomes[-1] == "Vilhena"
    assert nomes.index("Ji-Paraná") < nomes.index("Machadinho D'Oeste")


def test_todo_nome_da_lista_e_aprovado_pelo_validador(cliente):
    # A lista e o validador usam a mesma fonte: escolher uma sugestão nunca dá erro
    for municipio in cliente.get("/municipios").json():
        resultado = validar_municipio(municipio["nome"])
        assert resultado.valor == municipio["nome"]
        assert resultado.extras == {"municipio_codigo_ibge": municipio["codigo_ibge"]}
