# Valida SETIC

API central de qualidade de dados para os sistemas do Governo de Rondônia.
Antes de gravar, o sistema envia os dados para a API, que verifica e padroniza na hora:
devolve o dado **aprovado** já no formato padrão, ou **bloqueado** com o campo, a regra violada e o formato esperado.

Projeto do Desafio 1 (Qualidade de Dados) do Hackathon SETIC / 3º Conexão Tech.RO.

## Pré-requisitos
- Python 3.11 ou mais novo
- git

## Instalação
```bash
git clone https://github.com/hectorex/valida-setic.git
cd valida-setic
python -m venv .venv
```

Ative o ambiente virtual:

| Sistema | Comando |
|---|---|
| Windows (PowerShell) | `.venv\Scripts\Activate.ps1` |
| Windows (Git Bash) | `source .venv/Scripts/activate` |
| Linux / macOS | `source .venv/bin/activate` |

Depois instale as dependências:
```bash
python -m pip install -r requirements.txt
```

> No Windows, se o PowerShell bloquear a ativação, rode uma vez
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
> Se tiver mais de um Python instalado, crie o ambiente com `py -3.12 -m venv .venv`.

## Como rodar
Com o ambiente ativado:
```bash
python -m uvicorn app.main:app --reload
```
A interface web fica em **http://127.0.0.1:8000/static/** e a documentação interativa (Swagger) em **http://127.0.0.1:8000/docs**.

Na primeira execução é criado o banco SQLite `valida.db` (fora do git), já com a configuração
inicial dos campos. Para começar do zero, pare o servidor e apague o arquivo.
Para usar outro banco, defina a variável `VALIDA_DB_URL` (ex.: `postgresql://usuario:senha@host/valida`).

## Como rodar os testes
```bash
python -m pytest
```

## Rotas disponíveis

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/saude` | Confirma que a API está no ar |
| `POST` | `/validar` | Verifica e padroniza os dados; não grava nada |
| `GET` | `/regras` | Configuração de cada campo (obrigatório, ativo, formato esperado, ajuda) |
| `PUT` | `/regras/{campo}` | CAGD altera a configuração de um campo; vale na próxima validação |
| `GET` | `/static/` | Interface web (SPA): formulário do Sistema A e painel de regras da CAGD |

### Exemplo: `POST /validar`
Entrada:
```json
{"sistema_origem": "sistema_a",
 "dados": {"nome": "Maria  da silva", "cpf": "123.456.789-09",
           "email": "maria@", "data_nascimento": "28/02/1990"}}
```
Saída (bloqueado):
```json
{"valido": false,
 "erros": [{"campo": "email", "regra": "dominio_valido",
            "mensagem": "Informe o domínio depois do @, com ponto e terminação (ex.: exemplo.com.br).",
            "formato_esperado": "nome@dominio.com"}],
 "dados_padronizados": null}
```
Com o e-mail corrigido para `Maria@Exemplo.com` (e, se quiser, `"municipio": "espigao doeste"`),
a saída é aprovada:
```json
{"valido": true, "erros": [],
 "dados_padronizados": {"nome": "Maria da Silva", "cpf": "12345678909",
                        "email": "maria@exemplo.com", "data_nascimento": "1990-02-28",
                        "municipio": "Espigão D'Oeste", "municipio_codigo_ibge": "1100098"}}
```
O município é aceito sem acento, caixa, apóstrofo ou hífen e volta com o nome oficial e o código IBGE.
Se não for de Rondônia, é bloqueado; com erro de digitação, a mensagem sugere o mais parecido
(ex.: "Porto Velo" → "Você quis dizer Porto Velho?").

Na configuração inicial, nome, CPF, e-mail e data de nascimento são obrigatórios; telefone e município, opcionais.

### Exemplo: `PUT /regras/telefone`
Envie só o que quer mudar:
```json
{"obrigatorio": true}
```
A partir da próxima chamada, o `POST /validar` sem telefone volta bloqueado com a regra `obrigatorio`.

Campo com `"ativo": false` não é cobrado nem validado, mesmo que esteja obrigatório (inativo prevalece).
Ao reativar, ele volta com a configuração que tinha.
Mais exemplos estão no `/docs`.

## Interface web (`/static/`)

Página única em HTML, CSS e JavaScript puro, servida pelo próprio FastAPI, com duas abas:
- **Sistema A**: formulário de cadastro de cidadão que busca a configuração em `GET /regras` (asterisco nos obrigatórios, ajuda + formato esperado no ícone `i` e campos inativos desabilitados) e envia os dados para `POST /validar`, exibindo os erros embaixo de cada campo ou o modal com os dados padronizados.
- **Gestão de Regras (CAGD)**: painel com interruptores de **Obrigatório** e **Ativo** por campo, que chamam `PUT /regras/{campo}` e já valem na próxima validação.
