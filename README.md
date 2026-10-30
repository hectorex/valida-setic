# Valida SETIC

API central de qualidade de dados para os sistemas do Governo de Rondônia.
Antes de gravar, o sistema envia os dados para a API, que verifica e padroniza na hora:
devolve o dado **aprovado** já no formato padrão, ou **bloqueado** com o campo, a regra violada e o formato esperado.

Projeto do Desafio 1 (Qualidade de Dados) do Hackathon SETIC / 3º Conexão Tech.RO.

## Equipe QuemMaisCorp
- Celso Hector Silva Sales
- Luiz Felipe Mâcedo Alencar de Menezes
- Judson Gabriel Ferreira dos Santos

Demonstração online: https://valida-setic.onrender.com (plano grátis: o primeiro acesso pode levar até 1 minuto).

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

## Hospedagem (Render, plano grátis)
O `render.yaml` da raiz descreve o serviço. Para publicar pela primeira vez:
1. Em render.com, entre com o GitHub.
2. **New → Blueprint**, escolha o repositório `valida-setic` e confirme (**Apply**).
3. Ao terminar, o endereço aparece no topo do serviço (ex.: `https://valida-setic.onrender.com`).

Depois disso, cada merge na `main` publica de novo sozinho. No plano grátis:
- o site "dorme" após 15 min sem acesso e leva uns 30 a 60 s para acordar (abra o link um pouco antes);
- o banco é apagado a cada reinício ou publicação: volta com as regras padrão e o histórico do seed;
- qualquer pessoa com o link pode usar a tela da CAGD. Use apenas dados fictícios.

A demo oficial roda no notebook (funciona sem internet); o link serve para testes e para a banca pelo QR code.

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
| `GET` | `/municipios` | Os 52 municípios aceitos (nome oficial e código IBGE), para sugestão nos formulários |
| `GET` | `/`, `/sistema-a.html`... | Páginas do frontend (veja abaixo); `/static/...` também funciona |

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

### Telefone
Aceita 10 dígitos (fixo) ou 11 (celular), com ou sem parênteses, espaço, hífen ou ponto, e devolve só os dígitos:
`(69) 99999-0000` → `69999990000`. Regras: `formato` (sem DDD, com `+55` ou com letras é bloqueado),
`ddd_valido` (um dos 67 DDDs do Brasil) e `celular_com_9` (celular de 11 dígitos começa com 9 depois do DDD).

## Interface web

Páginas separadas em HTML, CSS e JavaScript puro, servidas pelo próprio FastAPI. O JS chama a API pelo
mesmo endereço da página, então funciona em qualquer porta, IP ou no celular.

| Página | O que é |
|---|---|
| `/` (`index.html`) | Página inicial com os links |
| `/sistema-a.html` | Sistema A: cadastro de cidadão + banco do Sistema A (simulado) |
| `/sistema-b.html` | Sistema B: agendamento de atendimento (outro sistema, mesmas regras) |
| `/cagd.html` | CAGD: gestão de regras + painel de erros |
| `/integrar.html` | Como integrar: o mesmo exemplo em curl, Python, JavaScript, PHP, Java e C# |

- **Sistema A**: formulário de cadastro de cidadão que busca a configuração em `GET /regras` (asterisco nos
  obrigatórios, ajuda + formato esperado no ícone `i` e campos inativos desabilitados) e envia os dados para o
  próprio backend, `POST /cadastros`, que valida e só grava se aprovado. Os erros aparecem embaixo de cada campo;
  se gravar, abre o modal com o dado padronizado. Abaixo, **Banco do Sistema A (simulado)** lista o
  `GET /cadastros`: na vida real esse banco é do próprio sistema, o Valida SETIC não guarda dados do cidadão.
- **Sistema B**: outro sistema (Agendamento de Atendimento), com cor, campos e ordem próprios, sem município e
  com um campo que a API não conhece ("Serviço", que não é enviado). Usa o mesmo `formulario.js`, mas só chama
  `POST /validar`. Serve para mostrar que uma regra mudada pela CAGD vale nele sem mudar o código dele.
- **Município** (Sistema A): ao digitar, abre uma lista do tamanho do campo com sugestões do `GET /municipios`
  (digite "P" e surgem Parecis, Pimenta Bueno, Porto Velho...; a partir de 3 letras também acha palavras do meio,
  "vel" → Porto Velho). Setas, Enter e toque escolhem. O campo continua livre: quem valida é a API.
- **Máscaras** (Sistema A): CPF, telefone e data ganham a pontuação enquanto o usuário digita (`12345678909` →
  `123.456.789-09`, `31021990` → `31/02/1990`). A máscara só formata: `31/02/1990` continua bloqueado pela API.
  O Sistema B fica sem máscara de propósito, como um sistema legado: a API protege igual.
- **Como integrar**: os três passos (chamar antes de gravar, mostrar os erros, gravar os `dados_padronizados`)
  e o mesmo exemplo de chamada em curl, Python, JavaScript, PHP, Java e C#, já com o endereço do servidor de onde
  a página foi aberta e botão de copiar. Em "Teste você mesmo", a requisição fica numa caixa editável: troque
  qualquer valor e envie, e a resposta vem da API para os dados digitados (prova de que não é resposta pronta).
- **CAGD**: interruptores de **Obrigatório** e **Ativo** por campo (`PUT /regras/{campo}`, valem na próxima
  validação) e o **Painel de Erros** (`GET /painel/erros`): totais, taxa de bloqueio por sistema, campos que mais
  erram e as falhas mais frequentes. O painel se atualiza ao voltar para a aba.

### Roteiro da demo pela interface
1. `python -m app.seed` (painel com histórico) e suba o servidor.
2. **Sistema A**: e-mail `maria@` e data `31/02/1990` → erros embaixo dos campos; o banco continua vazio.
3. Corrija e salve → o cadastro aparece no banco já padronizado (data `1990-02-28`, CPF só dígitos).
4. **CAGD**: ligue "Obrigatório" em telefone.
5. **Sistema B**: o telefone ganhou asterisco e o envio sem ele é bloqueado, sem mudar uma linha do Sistema B.
   Com `(23) 89999-0000` aparecem dois erros de uma vez: DDD inexistente e celular sem o 9.
6. **CAGD**: o painel mostra as falhas novas somadas ao histórico.

Para recomeçar do zero (regras padrão, sem cadastros), pare o servidor, apague o `valida.db` e rode o seed.
