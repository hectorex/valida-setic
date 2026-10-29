from app.models import RegraCampo
from app.rotas.regras import EXEMPLO_ATUALIZADO, EXEMPLO_LISTA
from app.servicos.regras import inicializar_regras

CAMPOS = ["nome", "cpf", "email", "data_nascimento", "telefone", "municipio"]


def test_get_regras_lista_os_campos_com_a_configuracao_inicial(cliente):
    regras = cliente.get("/regras").json()
    assert [regra["campo"] for regra in regras] == CAMPOS
    obrigatorios = {regra["campo"] for regra in regras if regra["obrigatorio"]}
    assert obrigatorios == {"nome", "cpf", "email", "data_nascimento"}
    for regra in regras:
        assert regra["ativo"] is True
        assert regra["formato_esperado"] and regra["ajuda"]


def test_put_altera_so_o_que_foi_enviado(cliente):
    antes = next(r for r in cliente.get("/regras").json() if r["campo"] == "telefone")
    resposta = cliente.put("/regras/telefone", json={"obrigatorio": True})
    assert resposta.status_code == 200
    assert resposta.json() == {**antes, "obrigatorio": True}


def test_put_vale_no_proximo_get(cliente):
    cliente.put("/regras/cpf", json={"ativo": False, "ajuda": "Texto novo"})
    cpf = next(r for r in cliente.get("/regras").json() if r["campo"] == "cpf")
    assert cpf["ativo"] is False
    assert cpf["ajuda"] == "Texto novo"


def test_put_campo_inexistente_retorna_404(cliente):
    resposta = cliente.put("/regras/apelido", json={"obrigatorio": True})
    assert resposta.status_code == 404


def test_put_com_atributo_desconhecido_retorna_422(cliente):
    resposta = cliente.put("/regras/cpf", json={"obrigatoria": True})
    assert resposta.status_code == 422


def test_exemplos_do_swagger_batem_com_a_resposta_real(cliente):
    assert cliente.get("/regras").json() == EXEMPLO_LISTA
    resposta = cliente.put("/regras/telefone", json={"obrigatorio": True})
    assert resposta.json() == EXEMPLO_ATUALIZADO.model_dump()


def test_inicializar_nao_sobrescreve_alteracoes_da_cagd(sessao):
    sessao.get(RegraCampo, "email").obrigatorio = False
    sessao.commit()
    inicializar_regras(sessao)  # como se o servidor reiniciasse
    assert sessao.get(RegraCampo, "email").obrigatorio is False
