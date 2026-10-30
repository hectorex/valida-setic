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
Abra **http://127.0.0.1:8000**: a raiz leva à página inicial do frontend, com links para o Sistema A, a CAGD e o Swagger.
A documentação interativa (Swagger) fica em **http://127.0.0.1:8000/docs**.

Para abrir no celular (mesma rede Wi-Fi), suba com `--host 0.0.0.0` e acesse `http://<IP-do-computador>:8000`.

Na primeira execução é criado o banco SQLite `valida.db` (fora do git), já com a configuração
inicial dos campos. Para começar do zero, pare o servidor e apague o arquivo.
Para usar outro banco, defina a variável `VALIDA_DB_URL` (ex.: `postgresql://usuario:senha@host/valida`).

### Dados fictícios para o painel (demo)
```bash
python -m app.seed
```
Substitui o histórico de validações por 200 validações fictícias dos sistemas A e B nos últimos 7 dias
(sempre as mesmas). Não mexe nas regras da CAGD. Rode antes da demo para o painel não começar vazio.

## Como rodar os testes
```bash
python -m pytest
```

## Rotas disponíveis

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/saude` | Confirma que a API está no ar |
| `POST` | `/validar` | Verifica e padroniza os dados; não grava os dados, só registra o resultado para o painel |
| `GET` | `/regras` | Configuração de cada campo (obrigatório, ativo, formato esperado, ajuda) |
| `PUT` | `/regras/{campo}` | CAGD altera a configuração de um campo; vale na próxima validação |
| `GET` | `/painel/erros` | Onde os sistemas mais erram: totais, taxa de bloqueio por sistema e falhas por campo e regra |
| `POST` | `/cadastros` | Backend do Sistema A de exemplo: valida e só grava se aprovado, já padronizado |
| `GET` | `/cadastros` | Cadastros gravados pelo Sistema A, mais recentes primeiro |
| `GET` | `/` | Redireciona para a página inicial do frontend (`/static/`) |
| `GET` | `/static/...` | Páginas do frontend (veja abaixo) |

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

### Exemplo: `GET /painel/erros`
Depois de três validações (Sistema A bloqueado e aprovado, Sistema B bloqueado), a resposta resumida fica:
```json
{"total_validacoes": 3, "total_bloqueadas": 2, "taxa_bloqueio": 66.7,
 "por_sistema": [{"sistema_origem": "sistema_a", "validacoes": 2, "bloqueadas": 1, "taxa_bloqueio": 50.0},
                 {"sistema_origem": "sistema_b", "validacoes": 1, "bloqueadas": 1, "taxa_bloqueio": 100.0}],
 "por_campo": [{"campo": "email", "falhas": 3}, {"campo": "cpf", "falhas": 1}, {"campo": "data_nascimento", "falhas": 1}],
 "falhas": [{"sistema_origem": "sistema_b", "campo": "cpf", "regra": "obrigatorio", "quantidade": 1}, "..."]}
```
O registro guarda só sistema, campo, regra e data/hora, **nunca o valor digitado** (LGPD).

### Exemplo: `POST /cadastros`
Representa o backend de um sistema qualquer (o "Sistema A"): antes de gravar, chama a validação central.
Entrada (os mesmos campos de `dados` do `/validar`, sem `sistema_origem`):
```json
{"nome": "Maria  da silva", "cpf": "123.456.789-09", "email": "maria@", "data_nascimento": "31/02/1990"}
```
Bloqueado (HTTP 200), nada é gravado e o `GET /cadastros` continua vazio:
```json
{"gravado": false,
 "erros": [{"campo": "email", "regra": "dominio_valido", "mensagem": "...", "formato_esperado": "nome@dominio.com"},
           {"campo": "data_nascimento", "regra": "data_existente", "mensagem": "...", "formato_esperado": "DD/MM/AAAA"}],
 "cadastro": null}
```
Com os dados corrigidos (HTTP 201), o registro é gravado já padronizado:
```json
{"gravado": true, "erros": [],
 "cadastro": {"id": 1, "nome": "Maria da Silva", "cpf": "12345678909", "email": "maria@exemplo.com",
              "data_nascimento": "1990-02-28", "telefone": null, "municipio": "Porto Velho",
              "municipio_codigo_ibge": "1100205", "criado_em": "2026-11-03T16:30:00"}}
```
Para zerar os cadastros, pare o servidor e apague o `valida.db` (depois rode o seed de novo).

## Interface web (`/static/`)

Páginas separadas em HTML, CSS e JavaScript puro, servidas pelo próprio FastAPI. O JS chama a API pelo
mesmo endereço da página, então funciona em qualquer porta, IP ou no celular.

| Página | O que é |
|---|---|
| `/static/` (`index.html`) | Página inicial com os links |
| `/static/sistema-a.html` | Sistema A: cadastro de cidadão |
| `/static/cagd.html` | CAGD: gestão de regras |

- **Sistema A**: formulário de cadastro de cidadão que busca a configuração em `GET /regras` (asterisco nos obrigatórios, ajuda + formato esperado no ícone `i` e campos inativos desabilitados) e envia os dados para `POST /validar`, exibindo os erros embaixo de cada campo ou o modal com os dados padronizados.
- **Gestão de Regras (CAGD)**: painel com interruptores de **Obrigatório** e **Ativo** por campo, que chamam `PUT /regras/{campo}` e já valem na próxima validação.
