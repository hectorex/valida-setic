import pytest

from app.dados.municipios_ro import MUNICIPIOS_RO
from app.validadores.municipio import POR_CHAVE, validar_municipio


@pytest.mark.parametrize(
    "entrada, nome, codigo",
    [
        ("Porto Velho", "Porto Velho", "1100205"),
        ("porto velho", "Porto Velho", "1100205"),
        ("  porto   velho ", "Porto Velho", "1100205"),
        # com e sem acento
        ("Ji-Paraná", "Ji-Paraná", "1100122"),
        ("ji parana", "Ji-Paraná", "1100122"),
        ("PRESIDENTE MEDICI", "Presidente Médici", "1100254"),
        # variações de D'Oeste
        ("Espigão D'Oeste", "Espigão D'Oeste", "1100098"),
        ("espigao doeste", "Espigão D'Oeste", "1100098"),
        ("Espigão D’Oeste", "Espigão D'Oeste", "1100098"),
        ("espigao d oeste", "Espigão D'Oeste", "1100098"),
        ("ESPIGÃO DOESTE", "Espigão D'Oeste", "1100098"),
        # Guajará-Mirim sem hífen
        ("Guajará Mirim", "Guajará-Mirim", "1100106"),
        ("guajaramirim", "Guajará-Mirim", "1100106"),
    ],
)
def test_municipio_valido_volta_nome_oficial_e_codigo(entrada, nome, codigo):
    resultado = validar_municipio(entrada)
    assert resultado.valido
    assert resultado.valor == nome
    assert resultado.extras == {"municipio_codigo_ibge": codigo}


@pytest.mark.parametrize("entrada", ["Manaus", "Cuiabá", "São Paulo"])
def test_municipio_de_outro_estado_e_bloqueado_sem_sugestao(entrada):
    resultado = validar_municipio(entrada)
    assert not resultado.valido
    assert resultado.valor is None
    assert [f.regra for f in resultado.falhas] == ["municipio_ro"]
    assert "Você quis dizer" not in resultado.falhas[0].mensagem


@pytest.mark.parametrize(
    "entrada, sugestao",
    [
        ("Porto Velo", "Porto Velho"),
        ("Ariquems", "Ariquemes"),
        ("vilena", "Vilhena"),
    ],
)
def test_erro_de_digitacao_sugere_o_mais_parecido(entrada, sugestao):
    resultado = validar_municipio(entrada)
    assert [f.regra for f in resultado.falhas] == ["municipio_ro"]
    assert resultado.falhas[0].mensagem.endswith(f"Você quis dizer {sugestao}?")
    assert resultado.falhas[0].formato_esperado == "Município de Rondônia"


def test_todos_os_municipios_tem_chave_unica_e_sao_aceitos():
    assert len(POR_CHAVE) == len(MUNICIPIOS_RO)
    for nome, codigo in MUNICIPIOS_RO:
        assert validar_municipio(nome.upper()).extras == {"municipio_codigo_ibge": codigo}
