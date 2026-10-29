from app.dados.municipios_ro import MUNICIPIOS_RO


def digito_verificador_ibge(seis_digitos):
    # Pesos 1,2,1,2,1,2; soma os algarismos de cada produto
    soma = 0
    for posicao, digito in enumerate(seis_digitos):
        produto = int(digito) * (1 if posicao % 2 == 0 else 2)
        soma += produto // 10 + produto % 10
    return str((10 - soma % 10) % 10)


def test_sao_52_municipios():
    assert len(MUNICIPIOS_RO) == 52


def test_nomes_e_codigos_unicos():
    assert len({nome for nome, _ in MUNICIPIOS_RO}) == 52
    assert len({codigo for _, codigo in MUNICIPIOS_RO}) == 52


def test_codigos_de_rondonia_com_digito_verificador_correto():
    for nome, codigo in MUNICIPIOS_RO:
        assert len(codigo) == 7 and codigo.isdigit(), nome
        assert codigo.startswith("11"), nome
        assert codigo[6] == digito_verificador_ibge(codigo[:6]), nome
