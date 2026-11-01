"""O script de teste de carga (scripts/teste_carga.py) mede o que diz medir."""

import importlib.util
from pathlib import Path

caminho = Path(__file__).resolve().parent.parent / "scripts" / "teste_carga.py"
especificacao = importlib.util.spec_from_file_location("teste_carga", caminho)
teste_carga = importlib.util.module_from_spec(especificacao)
especificacao.loader.exec_module(teste_carga)


def test_dados_do_teste_sao_um_cadastro_valido_e_um_com_erro_em_todos_os_campos(cliente):
    valido = cliente.post("/validar", json={"sistema_origem": "x", "dados": teste_carga.DADOS_VALIDOS}).json()
    assert valido["valido"] is True
    com_erro = cliente.post("/validar", json={"sistema_origem": "x", "dados": teste_carga.DADOS_COM_ERRO}).json()
    assert {erro["campo"] for erro in com_erro["erros"]} == set(teste_carga.DADOS_COM_ERRO)


def test_medir_conta_as_chamadas_e_registra_no_painel(cliente):
    enviar = lambda corpo: cliente.post("/validar", content=corpo,
                                        headers={"Content-Type": "application/json"}).status_code
    resultado = teste_carga.medir(enviar, total=10, simultaneas=1)
    assert resultado["total"] == 10 and resultado["com_erro_http"] == 0
    assert resultado["por_segundo"] > 0 and resultado["p50_ms"] <= resultado["p99_ms"]

    painel = cliente.get("/painel/erros").json()
    sistema = next(s for s in painel["por_sistema"] if s["sistema_origem"] == "teste_carga")
    assert sistema["validacoes"] == 10 and sistema["bloqueadas"] == 5


def test_chamada_que_falha_e_contada(cliente):
    def enviar(corpo):
        raise ConnectionError("servidor fora do ar")
    assert teste_carga.medir(enviar, total=3, simultaneas=1)["com_erro_http"] == 3
