# Valida SETIC

**Uma API central que verifica e padroniza os dados antes de qualquer sistema do Estado gravar.**
O sistema envia o dado e recebe na hora: **aprovado**, já no formato padrão, ou **bloqueado**, com o campo,
a regra violada e o formato esperado, todos os erros de uma vez.

Projeto do **Desafio 1 · Qualidade de Dados** do Hackathon SETIC / 3º Conexão Tech.RO, feito pela equipe
**QuemMaisCorp**.

🔗 **Demonstração online:** https://valida-setic.onrender.com
(plano grátis: o primeiro acesso pode levar até 1 minuto para "acordar" · use só dados fictícios)

---

## Sumário
1. [O problema](#1-o-problema)
2. [A solução](#2-a-solução)
3. [O caminho de um dado](#3-o-caminho-de-um-dado)
4. [As telas](#4-as-telas)
5. [Decisões de projeto (e por quê)](#5-decisões-de-projeto-e-por-quê)
6. [Regras de validação](#6-regras-de-validação)
7. [Como integrar um sistema](#7-como-integrar-um-sistema)
8. [Referência da API](#8-referência-da-api)
9. [Segurança e LGPD](#9-segurança-e-lgpd)
10. [Arquitetura](#10-arquitetura)
11. [Como rodar no computador](#11-como-rodar-no-computador)
12. [Testes](#12-testes)
13. [Hospedagem (Render)](#13-hospedagem-render)
14. [Roteiro da demo](#14-roteiro-da-demo)
15. [Limitações e próximos passos](#15-limitações-e-próximos-passos)
16. [Equipe](#16-equipe)

---

## 1. O problema
A SETIC mantém vários sistemas do Estado, cada um feito de um jeito. Cada sistema valida (ou não) do seu próprio
jeito e grava o que o usuário digitar. Resultado: o mesmo campo, "data de nascimento", fica no banco assim:

| Valor gravado | O que aconteceu |
|---|---|
| `15/03/1985` | Formato esperado |
| `1985-03-15` | Outro formato |
| `15-3-85` | Ano com 2 dígitos |
| `31/02/1990` | Data que não existe |
| `00/00/0000` | Valor "coringa" para pular o campo |
| *(vazio)* | Campo em branco |

O erro só aparece quando alguém cruza dados num relatório. Aí ou alguém corrige à mão, ou o resultado sai errado.
O mesmo acontece com CPF, telefone, e-mail e município.

## 2. A solução
Um único lugar onde ficam as regras de qualidade, que **todos os sistemas chamam antes de gravar**:

- **Verifica:** CPF com dígitos certos, data que existe, e-mail com domínio, telefone com DDD real, município de RO.
- **Padroniza:** devolve o dado no formato único (data `AAAA-MM-DD`, CPF só dígitos, nome com maiúsculas certas,
  nome oficial do município com código IBGE).
- **Explica o erro:** campo, regra e formato esperado, com uma mensagem em português simples, para o sistema mostrar
  ao usuário exatamente o que corrigir.
- **Regras centralizadas:** a CAGD (Coordenadoria de Análise e Gestão de Dados) liga e desliga regras num lugar só,
  e a mudança vale na hora para todos os sistemas, **sem mudar uma linha do código deles**.
- **Painel de erros:** mostra quais sistemas e campos mais erram e **sugere onde agir**.

O Valida SETIC **não guarda os dados do cidadão**: quem grava é o próprio sistema, no banco dele, como sempre fez.

## 3. O caminho de um dado

```
   ┌──────────┐  1. define as regras   ┌────────────────────┐
   │   CAGD   │ ─────────────────────▶ │                    │
   │ (login)  │ ◀───────────────────── │    VALIDA SETIC    │
   └──────────┘  5. painel de erros    │  (API central)     │
                                       │                    │
   ┌──────────┐  2. envia o dado       │  3. verifica e     │
   │ Sistema  │ ─────────────────────▶ │     padroniza      │
   │ A, B, ...│ ◀───────────────────── │                    │
   └────┬─────┘  aprovado / bloqueado  └────────────────────┘
        │
        │ 4. grava no PRÓPRIO banco, só se aprovado (o dado padronizado)
        ▼
   ┌──────────┐
   │ banco do │
   │ sistema  │
   └──────────┘
```

É exatamente o fluxo do desafio: **CAGD define a regra → sistema envia o dado → dado é verificado → grava ou
bloqueia → erros no painel.**

Exemplo de verdade: a pessoa digita `31/02/1990` no Sistema A. Antes de gravar, o Sistema A pergunta à API, que
responde *"data_nascimento: Essa data não existe. Confira o dia e o mês. Formato esperado: DD/MM/AAAA"*. O Sistema A
mostra o aviso embaixo do campo e não grava. A pessoa corrige para `28/02/1990`, a API aprova e devolve
`1990-02-28`, que é o que o Sistema A grava. No painel, a CAGD vê que esse campo concentra erros.

## 4. As telas
Abrindo o servidor (ou o link), a página inicial leva a todas:

| Página | Quem usa | O que mostra |
|---|---|---|
| `/` | todos | Página inicial com os atalhos |
| `/sistema-a.html` | cidadão / servidor | **Sistema A · Cadastro de Cidadão** e o "Banco do Sistema A (simulado)" |
| `/sistema-b.html` | cidadão / servidor | **Sistema B · Agendamento de Atendimento**: outro sistema, mesmas regras |
| `/cagd.html` | CAGD (com login) | Regras, painel de erros, Onde agir e histórico de mudanças |
| `/integrar.html` | equipes de TI | Como integrar: exemplos em 6 linguagens e o "Antes e depois" |
| `/docs` | equipes de TI | Swagger: todas as rotas, com exemplos de entrada e saída |

### Sistema A: cadastro de cidadão
- O formulário pergunta à API **quais campos são obrigatórios** (`GET /regras`) e mostra o asterisco e o ícone
  **"i"** com a ajuda e o formato esperado. Nada disso é texto fixo: se a CAGD muda, a tela muda.
- **Máscaras:** CPF, telefone e data ganham a pontuação enquanto a pessoa digita (`12345678909` → `123.456.789-09`).
- **Município:** ao digitar "P", abre a lista de sugestões (Parecis, Pimenta Bueno, Porto Velho…). A partir de 3
  letras também acha palavras do meio ("vel" → Porto Velho).
- Ao salvar, o backend do Sistema A chama a API e **só grava se aprovado**. Os erros aparecem embaixo de cada
  campo, todos de uma vez.
- Embaixo, o **Banco do Sistema A (simulado)** mostra o que foi gravado, já padronizado. Na vida real esse banco
  é do próprio sistema; está aqui só para a demo provar que o dado errado não entra.

### Sistema B: outro sistema, mesmas regras
- Outra cor, outros campos, outra ordem, um campo próprio que a API nem recebe ("Serviço").
- **Sem máscaras, de propósito:** faz o papel de um sistema antigo. É nele que dá para digitar `1985-03-15` e ver a
  API bloquear. *A tela ajuda, mas quem garante é a API.*
- Quando a CAGD torna o telefone obrigatório, o Sistema B passa a exigir telefone **sem mudar o código dele**.

### CAGD: gestão de regras e painel (com login)
- **Login por pessoa:** cada integrante da CAGD entra com o próprio usuário (há também um usuário para a banca
  avaliadora). O campo de senha tem o botão de olho.
- **Regras:** interruptores de **Obrigatório** e **Ativo** para cada campo. Valem na próxima validação de todos os
  sistemas.
- **Painel de erros:** total de validações, bloqueadas, taxa de bloqueio, **tempo médio de verificação** (medido de
  verdade, menos de 1 ms), taxa por sistema, campos que mais erram e falhas mais frequentes.
- **Onde agir:** recomendações geradas das contagens. Ex.: *"Sistema A: 21,9% das falhas são de data de nascimento
  fora do formato. Sugestão: use máscara DD/MM/AAAA no campo de data."* São regras simples no código, sem IA.
- **Histórico de mudanças:** quem mudou, quando, qual campo e o quê (*"Banca Avaliadora · Telefone · Obrigatório:
  não → sim"*).

### Como integrar
- Os três passos da integração e o mesmo exemplo em **curl, Python, JavaScript, PHP, Java e C#**, já com o endereço
  do servidor e botão de copiar.
- **O exemplo JavaScript é editável e roda de verdade no navegador:** troque um valor dentro do código, clique em
  Executar e veja a resposta real da API. As outras linguagens são para copiar e rodar no terminal.
- **Antes e depois:** um cadastro em PHP antes e depois da integração, com as linhas novas destacadas.

## 5. Decisões de projeto (e por quê)

**Verificar e padronizar, mas nunca adivinhar.** Não tentamos "consertar" o que a pessoa digitou errado, porque as
formas erradas são infinitas. Definimos a forma certa e bloqueamos o resto. Só padronizamos o que **já foi aprovado e
tem um único significado**:

| Entrada | O que a API faz | Por quê |
|---|---|---|
| `15-3-85` | **Bloqueia** | 1985 ou 2085? Não adivinhamos |
| `31/02/1990` | **Bloqueia** | Não "corrigimos" para 28/02 |
| `Porto Velo` | **Bloqueia** e sugere "Você quis dizer Porto Velho?" | Sugere, mas quem corrige é a pessoa |
| `123.456.789-09` → `12345678909` | Padroniza | É o mesmo CPF, só muda a pontuação |
| `28/02/1990` → `1990-02-28` | Padroniza | A data já foi aprovada; só muda a forma de guardar |

**Erros em camadas.** Cada campo roda todas as checagens independentes e devolve **todos os erros de uma vez**: a
pessoa corrige tudo numa só tentativa. Uma checagem que depende de outra é pulada se a anterior falhar (os dígitos
verificadores do CPF só são conferidos se ele tiver 11 dígitos). Ex.: o e-mail `maria` gera 2 erros
(`possui_arroba` e `dominio_valido`); `maria@` gera 1.

**Regras técnicas no código, configuração no banco.** Como validar um CPF é sempre igual e fica no código, testado.
O que a CAGD decide (obrigatório? ativo? texto de ajuda?) fica no banco, e o `/validar` lê a cada chamada. Não é um
"editor genérico de regras": é o que a CAGD precisa mudar, com segurança.

**Inativo prevalece.** Campo desativado não é cobrado nem validado, mesmo marcado como obrigatório. Os dois valores
ficam guardados: ao reativar, volta como estava.

**A tela ajuda, a API garante.** Máscaras e sugestões de município facilitam a vida de quem digita, mas a proteção
é a API, porque os outros sistemas podem não ter nada disso.

**API, e não validação dentro do banco.** O desafio pedia escolher uma das duas. Com a API, qualquer sistema, em
qualquer linguagem e com qualquer banco, integra com uma chamada HTTP, sem mexer no banco de ninguém.

**Simples e explicável.** Sem frameworks no frontend, sem IA, sem dependências desnecessárias: a equipe consegue
explicar cada parte, e a SETIC consegue manter.

## 6. Regras de validação
Os ids abaixo aparecem no campo `regra` dos erros e no painel.

| Campo | Regras | Padronização |
|---|---|---|
| todos | `obrigatorio` (vazio ou só espaços) | tira espaços das pontas |
| nome | `tamanho_minimo` (nome e sobrenome), `caracteres_validos` (letras, acentos, espaço, apóstrofo, hífen) | espaços duplicados removidos, iniciais maiúsculas, "da/de/do/das/dos/e" minúsculas |
| cpf | `formato` (11 dígitos, com ou sem pontuação), `digitos_repetidos` (ex.: 111.111.111-11), `digitos_verificadores` | só dígitos |
| email | `sem_espacos`, `possui_arroba`, `dominio_valido` (domínio com ponto e terminação de 2+ letras) | minúsculo |
| data_nascimento | `formato` (DD/MM/AAAA), `data_existente`, `nao_futura`, `idade_maxima` (até 130 anos) | `AAAA-MM-DD` |
| telefone | `formato` (10 ou 11 dígitos, sem +55), `ddd_valido` (os 67 DDDs do Brasil), `celular_com_9` | só dígitos |
| municipio | `municipio_ro` (existe em RO; aceita sem acento, caixa, apóstrofo ou hífen; sugere o mais parecido) | nome oficial + código IBGE |

Configuração inicial: **nome, CPF, e-mail e data de nascimento obrigatórios**; telefone e município opcionais.
E-mails institucionais com subdomínio funcionam (ex.: `aluno@estudante.ifro.edu.br`).

## 7. Como integrar um sistema
Qualquer sistema que faça uma chamada HTTP integra, em qualquer linguagem e sem biblioteca nova:

1. **Antes de gravar**, envie os dados para `POST /validar`, dizendo quem você é (`sistema_origem`).
2. **Bloqueado** (`"valido": false`): mostre cada erro embaixo do campo (`campo` e `mensagem`) e não grave.
3. **Aprovado** (`"valido": true`): grave no **seu** banco os `dados_padronizados`.

```bash
curl -X POST https://valida-setic.onrender.com/validar \
  -H "Content-Type: application/json" \
  -d '{"sistema_origem": "meu_sistema",
       "dados": {"nome": "Maria da Silva", "cpf": "123.456.789-09",
                 "email": "maria@", "data_nascimento": "31/02/1990"}}'
```

Em números: **cerca de 10 linhas** por formulário, **menos de 1 hora** de desenvolvimento para integrar, e
**zero linhas** quando a regra muda. A página `/integrar.html` tem o exemplo em 6 linguagens e o "Antes e depois".

## 8. Referência da API
Documentação interativa completa, com exemplos, em **`/docs`** (Swagger).

| Método | Rota | O que faz | Acesso |
|---|---|---|---|
| `POST` | `/validar` | Verifica e padroniza; registra só o resultado para o painel | público |
| `GET` | `/regras` | Configuração de cada campo (obrigatório, ativo, formato, ajuda) | público |
| `PUT` | `/regras/{campo}` | CAGD altera um campo; vale na próxima validação | 🔒 login |
| `GET` | `/regras/historico` | Mudanças da CAGD: quem, quando, campo, antes e depois | 🔒 login |
| `GET` | `/painel/erros` | Totais, taxa de bloqueio, falhas, tempo médio e Onde agir | 🔒 login |
| `POST` | `/cagd/login` | Login com usuário e senha; devolve a chave (token) | público |
| `POST` | `/cagd/sair` | Encerra a sessão | — |
| `GET` | `/cagd/eu` | Quem está logado | 🔒 login |
| `POST` | `/cadastros` | Backend do Sistema A de exemplo: valida e só grava se aprovado | público |
| `GET` | `/cadastros` | O que o Sistema A gravou, mais recentes primeiro | público |
| `GET` | `/municipios` | Os 52 municípios de RO (nome oficial e código IBGE) | público |
| `GET` | `/saude` | Confirma que a API está no ar | público |

"Público" é o que os sistemas precisam para funcionar. "Login" é só da CAGD.

### `POST /validar`
Entrada:
```json
{"sistema_origem": "sistema_a",
 "dados": {"nome": "Maria  da silva", "cpf": "123.456.789-09",
           "email": "maria@", "data_nascimento": "28/02/1990"}}
```
Bloqueado (HTTP 200):
```json
{"valido": false,
 "erros": [{"campo": "email", "regra": "dominio_valido",
            "mensagem": "Informe o domínio depois do @, com ponto e terminação (ex.: exemplo.com.br).",
            "formato_esperado": "nome@dominio.com"}],
 "dados_padronizados": null}
```
Com o e-mail corrigido (e `"municipio": "espigao doeste"`), aprovado:
```json
{"valido": true, "erros": [],
 "dados_padronizados": {"nome": "Maria da Silva", "cpf": "12345678909",
                        "email": "maria@exemplo.com", "data_nascimento": "1990-02-28",
                        "municipio": "Espigão D'Oeste", "municipio_codigo_ibge": "1100098"}}
```
Campos aceitos em `dados`: `nome`, `cpf`, `email`, `data_nascimento`, `telefone`, `municipio`. Campos desconhecidos são
ignorados; campos ausentes só geram erro se forem obrigatórios. JSON malformado ou sem `sistema_origem` → 422.

### `PUT /regras/{campo}` (com login)
Envie só o que quer mudar:
```json
{"obrigatorio": true}
```
Na próxima chamada, o `/validar` sem telefone volta bloqueado com a regra `obrigatorio`. Campo inexistente → 404;
atributo desconhecido → 422. Cada mudança real vai para o histórico.

### `GET /regras/historico` (com login)
```json
[{"campo": "telefone", "atributo": "obrigatorio", "valor_anterior": "false", "valor_novo": "true",
  "usuario": "Banca Avaliadora", "data_hora": "2026-11-03T20:30:00Z"}]
```
Mais recentes primeiro (`?limite=50`). Mandar o mesmo valor não conta como mudança.

### `GET /painel/erros` (com login)
```json
{"total_validacoes": 3, "total_bloqueadas": 2, "taxa_bloqueio": 66.7,
 "por_sistema": [{"sistema_origem": "sistema_a", "validacoes": 2, "bloqueadas": 1, "taxa_bloqueio": 50.0}],
 "por_campo": [{"campo": "email", "falhas": 3}],
 "falhas": [{"sistema_origem": "sistema_a", "campo": "email", "regra": "dominio_valido", "quantidade": 1}],
 "tempo_medio_ms": 0.82, "medicoes_tempo": 3,
 "onde_agir": [{"sistema_origem": "sistema_a", "campo": "data_nascimento", "regra": "formato",
                "quantidade": 16, "percentual": 21.9,
                "diagnostico": "Sistema A: 21,9% das falhas são de data de nascimento fora do formato (16 de 73).",
                "sugestao": "Sugestão: use máscara DD/MM/AAAA no campo de data, ..."}]}
```
- `tempo_medio_ms` é medido de verdade a cada validação; o histórico fictício do seed fica fora da média.
- `onde_agir` lista, em cada sistema, as falhas com pelo menos 3 ocorrências e 15% dos erros dele (no máximo 2 por
  sistema).

### Login da CAGD
```json
POST /cagd/login   {"usuario": "banca", "senha": "..."}
→ {"token": "...", "usuario": "banca", "nome": "Banca Avaliadora", "expira_em": "2026-11-03T04:30:00Z"}
```
O token vale 8 horas e vai no cabeçalho `Authorization: Bearer <token>`. No Swagger, use o botão **Authorize**.

### `POST /cadastros` (Sistema A de exemplo)
Recebe os campos direto no corpo, sem `sistema_origem`, que é sempre `sistema_a`:
- **Gravado:** HTTP 201, `{"gravado": true, "erros": [], "cadastro": {...}}`.
- **Bloqueado:** HTTP 200, `{"gravado": false, "erros": [...], "cadastro": null}`.

O `cadastro` traz o dado padronizado e o `criado_em` em UTC (`...Z`), que o navegador mostra no horário local.

## 9. Segurança e LGPD
- **Não guardamos dados do cidadão.** O registro do painel tem só sistema, campo, regra, data/hora e tempo da
  verificação: o painel sabe que um e-mail falhou, mas não sabe qual e-mail era. Há testes que garantem que as
  tabelas nem têm coluna para o valor digitado.
- **Quem grava é o sistema**, no banco dele. O "Banco do Sistema A" da demo é simulado.
- **CAGD com login por pessoa:**
  - Usuários e senhas vêm de uma variável de ambiente no servidor, nunca do repositório.
  - O erro de login não diz se errou o usuário ou a senha.
  - A senha é comparada em tempo constante.
  - A sessão expira em 8 horas, e o Sair encerra na hora.
  - Quem sai da lista de usuários perde o acesso na hora.
- **Auditoria:** cada mudança de regra registra quem, quando e o quê.
- **Código digitado na página "Como integrar"** roda só no navegador de quem clicou, nunca no servidor.
- **Só dados fictícios** em testes, seed e demo. Os CPFs de teste são gerados por algoritmo. As telas avisam para
  não digitar dados reais, porque o link é público.

## 10. Arquitetura
**Tecnologias:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2, SQLite, pytest. Frontend em HTML, CSS e
JavaScript puro, sem frameworks e sem etapa de build, servido pelo próprio FastAPI. Trocar SQLite por PostgreSQL é só
mudar a variável `VALIDA_DB_URL`.

```
app/
  main.py                 cria o app, inclui as rotas, serve o frontend, cria as tabelas
  database.py             conexão com o banco; acrescenta colunas novas em bancos antigos
  models.py               tabelas: regras_campo, validacoes, falhas_validacao, historico_regras, cadastros
  schemas.py              formatos de entrada e saída da API
  seguranca.py            login da CAGD (usuários, sessões, token)
  validadores/            uma função por tipo de dado, sem banco: nome, cpf, email, data, telefone, municipio
  dados/municipios_ro.py  os 52 municípios de Rondônia com código IBGE
  servicos/
    validacao.py          roda os validadores conforme a configuração
    regras.py             configuração padrão, leitura e alteração das regras, histórico
    registro.py           valida e registra o resultado (e o tempo) para o painel
    painel.py             contagens do painel
    onde_agir.py          recomendações "Onde agir"
    cadastros.py          backend do Sistema A de exemplo
  rotas/                  validar, regras, painel, cagd (login), cadastros, municipios
  seed.py                 histórico fictício para o painel da demo
static/                   index, sistema-a, sistema-b, cagd, integrar (+ js/ e css/)
tests/                    testes automáticos (pytest)
render.yaml               configuração da hospedagem no Render
```

**Banco:**

| Tabela | O que guarda |
|---|---|
| `regras_campo` | Configuração de cada campo (obrigatório, ativo, formato esperado, ajuda) |
| `validacoes` | Uma linha por chamada ao `/validar`: sistema, aprovado, data/hora, tempo |
| `falhas_validacao` | Uma linha por regra violada: sistema, campo, regra, data/hora |
| `historico_regras` | Cada mudança da CAGD: quem, campo, atributo, antes, depois, data/hora |
| `cadastros` | O que o Sistema A de exemplo gravou (dados fictícios, já padronizados) |

## 11. Como rodar no computador
**Pré-requisitos:** Python 3.11 ou mais novo e git.

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

> No Windows, se o PowerShell bloquear a ativação, rode uma vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
> Com mais de um Python instalado, crie o ambiente com `py -3.12 -m venv .venv`.

Instale as dependências, crie os dados fictícios do painel e suba o servidor:
```bash
python -m pip install -r requirements.txt
python -m app.seed
python -m uvicorn app.main:app --reload
```
Abra **http://127.0.0.1:8000**. O Swagger fica em **http://127.0.0.1:8000/docs**.

- **No celular** (mesma rede Wi-Fi): suba com `--host 0.0.0.0` e abra `http://<IP-do-computador>:8000`.
- **Banco:** na primeira execução é criado o `valida.db` (fora do git). Para recomeçar do zero (regras padrão, sem
  cadastros), pare o servidor, apague o arquivo e rode o seed de novo.
- **Seed:** `python -m app.seed` troca o histórico do painel por 200 validações fictícias dos sistemas A e B (sempre
  as mesmas). Não mexe nas regras nem nos cadastros.
- **Login da CAGD:** sem a variável `VALIDA_USUARIOS_CAGD`, a CAGD fica aberta, o que é prático no notebook da demo.
  Para testar com login:

| Sistema | Comando |
|---|---|
| Windows (PowerShell) | `$env:VALIDA_USUARIOS_CAGD="banca:Banca Avaliadora:teste"; python -m uvicorn app.main:app --reload` |
| Linux / macOS / Git Bash | `VALIDA_USUARIOS_CAGD="banca:Banca Avaliadora:teste" python -m uvicorn app.main:app --reload` |

Formato: `usuario:Nome que aparece no histórico:senha`, vários separados por `;`. A senha pode ter `:`, mas não `;`.

## 12. Testes
```bash
python -m pytest
```
São **266 testes automáticos**, que rodam em poucos segundos num banco em memória, sem tocar no `valida.db`. Cobrem:
- cada validador com casos válidos e inválidos (29/02/2024 aceito; 31/02/1990, 00/00/0000, 1985-03-15, CPF
  111.111.111-11, e-mail sem domínio bloqueados…);
- os erros em camadas e as rotas;
- as regras da CAGD e o histórico;
- o painel, o Onde agir e o tempo;
- o login (senha errada, sessão expirada, usuário removido…);
- a LGPD: as tabelas de log não têm onde guardar o valor digitado;
- as páginas, e se os exemplos do Swagger e da página "Como integrar" batem com a resposta real da API.

## 13. Hospedagem (Render)
O `render.yaml` descreve o serviço (plano grátis). Para publicar pela primeira vez:
1. Em render.com, entre com o GitHub.
2. **New → Blueprint**, escolha o repositório `valida-setic` e confirme (**Apply**).
3. Em **Environment**, crie `VALIDA_USUARIOS_CAGD` com os usuários da CAGD, no formato da seção 11.

Depois disso, **cada merge na `main` publica de novo sozinho**. No plano grátis:
- o site "dorme" após 15 minutos sem acesso e leva de 30 a 60 segundos para acordar (abra o link antes);
- o banco é apagado a cada reinício ou publicação, e volta às regras padrão com o histórico do seed;
- o login da CAGD também cai a cada reinício.

A demo oficial roda no notebook, sem depender de internet. O link serve para testes e para a banca usar pelo celular.

## 14. Roteiro da demo
1. `python -m app.seed` e suba o servidor.
2. **Sistema A:** e-mail `maria@` e data `31/02/1990` → os dois erros embaixo dos campos; o banco continua vazio.
3. Corrija e salve → o cadastro aparece no banco já padronizado (data `1990-02-28`, CPF só dígitos).
4. **CAGD:** entre e ligue "Obrigatório" em telefone.
5. **Sistema B:** o telefone ganhou asterisco e o envio sem ele é bloqueado, sem mudar uma linha do Sistema B.
   Com `(23) 89999-0000` aparecem dois erros de uma vez: DDD inexistente e celular sem o 9.
6. **CAGD:** o painel mostra as falhas novas, o tempo médio e o Onde agir; o histórico mostra quem ligou o telefone.
7. **Como integrar:** o "Antes e depois" e o exemplo JavaScript editado e executado ao vivo.

## 15. Limitações e próximos passos
- **Município só de Rondônia.** Próximo passo: a tabela nacional do IBGE (cerca de 5.570 municípios), com UF opcional,
  sem mudar os sistemas atuais.
- **Usuários da CAGD numa variável de ambiente.** Próximo passo: tela para criar usuários, trocar senha e definir
  permissões.
- **As mesmas regras para todos os sistemas.** Próximo passo: regras diferentes por sistema (ex.: um sistema que não
  coleta e-mail).
- **Sem chave por sistema.** Hoje qualquer um pode chamar `/validar` e dizer qualquer `sistema_origem`. Próximo passo:
  uma chave por sistema (cabeçalho `X-API-Key`), para o painel ter certeza de quem chamou.
- **Implantação gradual.** Uma ideia é começar num sistema piloto em "modo observação" (registra no painel sem
  bloquear) e depois ligar o bloqueio.
- **Dados antigos** já gravados ficam como estão (fora do escopo do desafio): o foco é impedir que dados novos fora do
  padrão entrem.

## 16. Equipe
**QuemMaisCorp**
- Celso Hector Silva Sales
- Luiz Felipe Mâcedo Alencar de Menezes
- Judson Gabriel Ferreira dos Santos
