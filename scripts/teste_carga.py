"""Teste de carga do POST /validar: quantas validações por segundo a API aguenta.

Uso (com a API rodando):
    python scripts/teste_carga.py                      # 2000 chamadas, 20 ao mesmo tempo, em http://127.0.0.1:8000
    python scripts/teste_carga.py --total 5000 --simultaneas 50

Cada chamada é um cadastro fictício de verdade (metade válido, metade com erro), e fica registrada no painel
como "teste_carga". Por isso, rode num banco de teste, nunca contra o site hospedado.
Só usa a biblioteca padrão do Python.
"""

import argparse
import json
import statistics
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

DADOS_VALIDOS = {"nome": "Maria da Silva", "cpf": "123.456.789-09", "email": "maria@exemplo.com",
                 "data_nascimento": "15/03/1985", "telefone": "(69) 99999-1234", "municipio": "Porto Velho"}
DADOS_COM_ERRO = {"nome": "Maria", "cpf": "111.111.111-11", "email": "maria@",
                  "data_nascimento": "31/02/1990", "telefone": "(00) 1234-5678", "municipio": "Porto Velo"}


def corpo_da_chamada(numero):
    """Alterna cadastro válido e cadastro com erro, para medir os dois caminhos."""
    dados = DADOS_VALIDOS if numero % 2 == 0 else DADOS_COM_ERRO
    return json.dumps({"sistema_origem": "teste_carga", "dados": dados}).encode()


def enviar_por_http(url):
    """Devolve uma função que faz um POST /validar e retorna o código HTTP."""
    def enviar(corpo):
        requisicao = urllib.request.Request(f"{url}/validar", data=corpo, method="POST",
                                            headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(requisicao, timeout=30) as resposta:
            resposta.read()
            return resposta.status
    return enviar


def medir(enviar, total, simultaneas):
    """Dispara `total` chamadas, `simultaneas` de cada vez, e devolve as medidas."""
    def uma_chamada(numero):
        inicio = time.perf_counter()
        try:
            codigo = enviar(corpo_da_chamada(numero))
        except Exception:
            codigo = None
        return codigo, (time.perf_counter() - inicio) * 1000

    inicio = time.perf_counter()
    with ThreadPoolExecutor(max_workers=simultaneas) as executor:
        resultados = list(executor.map(uma_chamada, range(total)))
    segundos = time.perf_counter() - inicio

    tempos = sorted(ms for _, ms in resultados)
    percentil = lambda p: tempos[min(len(tempos) - 1, int(len(tempos) * p))]
    return {
        "total": total,
        "simultaneas": simultaneas,
        "com_erro_http": sum(1 for codigo, _ in resultados if codigo != 200),
        "segundos": round(segundos, 2),
        "por_segundo": round(total / segundos, 1),
        "media_ms": round(statistics.mean(tempos), 1),
        "p50_ms": round(percentil(0.50), 1),
        "p95_ms": round(percentil(0.95), 1),
        "p99_ms": round(percentil(0.99), 1),
    }


def main():
    argumentos = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    argumentos.add_argument("--url", default="http://127.0.0.1:8000")
    argumentos.add_argument("--total", type=int, default=2000)
    argumentos.add_argument("--simultaneas", type=int, default=20)
    opcoes = argumentos.parse_args()

    print(f"Enviando {opcoes.total} validações para {opcoes.url}, {opcoes.simultaneas} ao mesmo tempo...")
    r = medir(enviar_por_http(opcoes.url), opcoes.total, opcoes.simultaneas)
    print(f"  {r['por_segundo']} validações por segundo ({r['total']} em {r['segundos']} s)")
    print(f"  tempo de resposta: média {r['media_ms']} ms, p50 {r['p50_ms']} ms, p95 {r['p95_ms']} ms, "
          f"p99 {r['p99_ms']} ms")
    print(f"  chamadas que falharam: {r['com_erro_http']}")


if __name__ == "__main__":
    main()
