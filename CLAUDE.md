# Valida SETIC

Camada central de qualidade de dados para os sistemas do Governo de Rondônia
(Desafio 1 – Qualidade de Dados, Hackathon SETIC / 3º Conexão Tech.RO).

**Problema:** cada sistema valida (ou não) do seu jeito e grava o que o usuário digitar.
O banco fica com "31/02/1990", "00/00/0000", CPFs inválidos e campos vazios.

**Solução:** uma API única que todos os sistemas chamam ANTES de gravar. Ela
**verifica e padroniza** o dado e responde na hora: aprovado (com o dado padronizado)
ou bloqueado (com campo, regra violada e formato esperado).

Fluxo do desafio, que a demo precisa mostrar de ponta a ponta:
`CAGD define a regra → sistema envia o dado → dado é verificado → grava ou bloqueia → erros no painel`

## Atores
- **Sistemas consumidores**: qualquer sistema do Estado, em qualquer linguagem. Chamam a API via HTTP/JSON.
  Na demo são dois formulários fictícios ("Sistema A" e "Sistema B").
- **CAGD** (Coordenadoria de Análise e Gestão de Dados): administra as regras e acompanha o painel de erros.
- **Cidadão/servidor**: digita os dados no formulário do sistema.

## Stack
- Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2, PostgreSQL (psycopg) ou SQLite, pytest.
- Frontend: HTML, CSS e JavaScript puro com `fetch` (sem frameworks nem Bootstrap), servido pelo próprio FastAPI
  na raiz (`/`, `/sistema-a.html`...). `/static/...` também funciona. Os mounts ficam no fim do `main.py`, depois
  das rotas da API, para não escondê-las. Os arquivos vão com `Cache-Control: no-cache` (`ArquivosDoFrontend`), para
  o navegador pegar a versão nova logo depois de cada deploy.
- Um único comando sobe tudo: `uvicorn app.main:app --reload`.
- O mesmo código roda em PostgreSQL e SQLite, escolhidos pela URL (`VALIDA_DB_URL`). Testado num PostgreSQL 18 de
  verdade em 01/11 (argumento de viabilidade).

## Estrutura de pastas
```
app/
  main.py              # cria o app, inclui rotas, monta static/, cria tabelas
  seguranca.py         # login da CAGD: usuários de VALIDA_USUARIOS_CAGD, sessões com token Bearer
  database.py          # engine, sessão, Base
  models.py            # tabelas SQLAlchemy
  schemas.py           # modelos Pydantic de entrada e saída
  validadores/         # uma função pura por tipo de dado, sem acesso a banco
    nome.py  cpf.py  email.py  data.py  telefone.py  municipio.py
  dados/municipios_ro.py   # lista oficial dos 52 municípios de Rondônia (IBGE)
  servicos/validacao.py    # validar_dados: roda os validadores conforme a configuração (sem banco)
  servicos/regras.py       # REGRAS_PADRAO e leitura/alteração de regras_campo
  servicos/registro.py     # validar_e_registrar: lê a config, valida e grava em validacoes/falhas_validacao
  servicos/painel.py       # agregações do GET /painel/erros
  servicos/onde_agir.py    # recomendações "Onde agir" a partir das contagens (regras simples, sem IA)
  rotas/               # validar.py, regras.py, painel.py, cadastros.py (Sistema A), agendamentos.py (Sistema B),
                       #   municipios.py, cagd.py (login)
  seed.py              # histórico fictício para o painel (as regras padrão são criadas na subida do app)
static/
  index.html           # página inicial com links para as outras
  sistema-a.html       # cadastro de cidadão
  sistema-b.html       # segundo sistema, campos diferentes, mesmas regras
  cagd.html            # regras + painel de erros
  integrar.html        # como integrar: exemplos em várias linguagens (em <script type="text/plain">)
  js/comum.js          # chamadas à API (endereço relativo), toasts, alertas
  js/formulario.js     # formulário genérico: <form data-sistema="sistema_a" data-rota="/cadastros">
                       #   data-rota opcional; sem ela envia para POST /validar (Sistema B)
  js/banco-sistema-a.js  # lista "Banco do Sistema A (simulado)" (GET /cadastros)
  js/dados-ficticios.js  # painel "Dados fictícios para testar" (copiar/preencher) nos Sistemas A e B
  js/login-cagd.js     # login da CAGD (usuário e senha), guarda o token na aba e libera a tela (vem antes de cagd/painel/historico)
  js/cagd.js           # interruptores das regras (dispara o evento regra-alterada)
  js/historico.js      # histórico de mudanças das regras (GET /regras/historico)
  js/painel.js         # painel de erros da CAGD (GET /painel/erros)
  js/integrar.js       # abas de linguagem, copiar, editar e executar o exemplo JS; troca {{URL}} por location.origin
  css/style.css
tests/
scripts/teste_carga.py # teste de carga do POST /validar (só biblioteca padrão; nunca contra o site hospedado)
apresentacao/          # slides do pitch (React + Vite, do Judson), independente da API; no ar na Vercel
```

## Contrato da API (não mudar sem combinar com a equipe: o frontend depende dele)

### `POST /validar` — valida e padroniza, não grava nada além do registro de falhas
Entrada:
```json
{"sistema_origem": "sistema_a",
 "dados": {"nome": "Maria  da silva", "cpf": "123.456.789-09",
           "email": "Maria@Exemplo.com", "data_nascimento": "31/02/1990"}}
```
Campos aceitos em `dados`: `nome`, `cpf`, `email`, `data_nascimento`, `telefone`, `municipio`.
Campos ausentes só geram erro se a regra do campo estiver como obrigatória. Campos desconhecidos são ignorados.

Saída bloqueada (HTTP 200):
```json
{"valido": false,
 "erros": [{"campo": "data_nascimento", "regra": "data_existente",
            "mensagem": "Data inexistente.", "formato_esperado": "DD/MM/AAAA"}],
 "dados_padronizados": null}
```
Saída aprovada (HTTP 200):
```json
{"valido": true, "erros": [],
 "dados_padronizados": {"nome": "Maria da Silva", "cpf": "12345678909",
                        "email": "maria@exemplo.com", "data_nascimento": "1990-02-28",
                        "municipio": "Espigão D'Oeste", "municipio_codigo_ibge": "1100098"}}
```
`dados_padronizados` traz só os campos preenchidos, mais campos derivados que o validador calcula.
Hoje o único derivado é `municipio_codigo_ibge` (código IBGE de 7 dígitos, como texto), presente quando
`municipio` é aprovado.
Payload malformado (não é JSON, falta `sistema_origem`) → 422 normal do FastAPI.

**Chave por sistema (`X-API-Key`):** com `VALIDA_CHAVES_SISTEMAS` = `sistema:chave;outro:chave` (`seguranca.py`,
`sistema_chamador`), o `/validar` exige o cabeçalho; sem ele ou com chave errada → 401 "Chave do sistema ausente ou
inválida (cabeçalho X-API-Key).", e nada é registrado. Com a chave certa, o painel registra o **sistema dono da
chave** (o `sistema_origem` do corpo continua obrigatório, mas é ignorado). Sem a variável (notebook), não exige
chave e vale o `sistema_origem`. **Nenhuma chave de sistema real vai para o navegador:** os Sistemas A e B de
exemplo validam pelo próprio backend (`/cadastros` e `/agendamentos`), no servidor, sem chave. O `render.yaml` só
define a chave de **testes** `sistema_exemplo:demo-exemplo`, pública de propósito, para a página Como integrar rodar os
exemplos (como as chaves de teste de serviços de pagamento). `tests/test_integrar.py` confere que é a única chave
pública e que nenhuma página dos sistemas tem `X-API-Key`.

### `POST /agendamentos` (backend do Sistema B de exemplo)
Recebe os campos de `dados` direto no corpo (sem `sistema_origem`), valida no servidor como `sistema_b` e devolve a
mesma resposta do `POST /validar` (`{valido, erros, dados_padronizados}`). Não grava nada e não pede chave: é o backend
do próprio Sistema B, como o `/cadastros` é do Sistema A. Representa a arquitetura certa de produção: o navegador fala
com o servidor do sistema, e só o servidor conhece a chave.

### `GET /regras` e `PUT /regras/{campo}`
Configuração por campo: `obrigatorio`, `ativo`, `formato_esperado`, `ajuda` (texto do ícone "i").
O formulário monta asteriscos e textos de ajuda a partir do `GET /regras`, nunca de texto fixo.
O `PUT` é parcial: só os atributos enviados mudam (ex.: `{"obrigatorio": true}`). Campo inexistente → 404;
atributo desconhecido → 422. Não cria campos novos. O `/validar` lê a configuração do banco a cada chamada.
**Histórico:** cada atributo que o `PUT` realmente muda vira uma linha em `historico_regras` (gravada junto com a
mudança; mandar o mesmo valor não conta). `GET /regras/historico?limite=50` devolve
`[{"campo": "telefone", "atributo": "obrigatorio", "valor_anterior": "false", "valor_novo": "true",
"usuario": "Banca Avaliadora", "data_hora": "2026-11-03T20:30:00Z"}]`, mais recentes primeiro. `usuario` é o nome de
quem estava logado (null com a CAGD sem login).

### Login da CAGD (`POST /cagd/login`, `POST /cagd/sair`, `GET /cagd/eu`)
- Usuários em `VALIDA_USUARIOS_CAGD` = `usuario:Nome para exibir:senha;outro:Outro Nome:senha` (a senha é o que vem
  depois do 2º ":"; não pode ter ";"). Definida no painel do Render, nunca no repositório. Hoje: celso, felipe,
  judson e banca (Banca Avaliadora, para o jurado testar).
- `POST /cagd/login {"usuario", "senha"}` → `{"token", "usuario", "nome", "expira_em"}` (8 h); errado → 401 "Usuário ou
  senha incorretos." (sem dizer qual errou; comparação em tempo constante, inclusive para usuário inexistente).
- Força bruta: 5 senhas erradas seguidas para um usuário (inclusive inexistente) → bloqueio de 5 min, HTTP 429 com
  `Retry-After`, até para a senha certa (`TENTATIVAS_ERRADAS`/`BLOQUEADOS_ATE` em `seguranca.py`, na memória).
  Na tela (`login-cagd.js`), o 429 desativa o botão Entrar para aquele usuário com contagem regressiva (lida do
  `Retry-After`, exposto pelo `apiFetch` em `erro.esperarSegundos`); trocar o usuário no campo libera o botão.
- O token vai em `Authorization: Bearer <token>` (no Swagger: botão Authorize). Sessões na memória do servidor:
  reiniciar pede login de novo. `POST /cagd/sair` invalida na hora; usuário tirado da variável perde o acesso.
- Exigem login: `PUT /regras/{campo}`, `GET /regras/historico`, `GET /painel/erros`, `GET /cagd/eu`. Públicos sempre:
  `GET /regras`, `/municipios`, `/validar`, `/cadastros` (os sistemas dependem deles).
- Sem `VALIDA_USUARIOS_CAGD`, vale a senha única antiga `VALIDA_SENHA_CAGD` como usuário `cagd` (nome "CAGD"), para o
  deploy não deixar a CAGD aberta. Sem nenhuma das duas (notebook da demo), tudo aberto e `GET /cagd/eu` →
  `{"protegido": false}`.
**Inativo prevalece:** com `ativo=false` o campo não é cobrado nem validado, mesmo com `obrigatorio=true`.
Os dois valores ficam guardados de forma independente, para que reativar restaure a configuração anterior.

### `GET /municipios`
Lista `[{"nome": "Alta Floresta D'Oeste", "codigo_ibge": "1100015"}, ...]` (os 52 de RO, ordem alfabética sem
acento), da mesma fonte do validador. Serve para o formulário sugerir enquanto o usuário digita (`<datalist>`);
o campo continua livre e quem valida é o `POST /validar`.

### `GET /painel/erros`
Agrega falhas por sistema, campo e regra (contagem), mais totais de validações e taxa de bloqueio por sistema.
Todo `POST /validar` com payload válido é registrado (aprovado ou não); 422 não é registrado.
```json
{"total_validacoes": 3, "total_bloqueadas": 2, "taxa_bloqueio": 66.7,
 "por_sistema": [{"sistema_origem": "sistema_a", "validacoes": 2, "bloqueadas": 1, "taxa_bloqueio": 50.0}],
 "por_campo": [{"campo": "email", "falhas": 3}],
 "falhas": [{"sistema_origem": "sistema_a", "campo": "email", "regra": "dominio_valido", "quantidade": 1}],
 "tempo_medio_ms": 0.82, "medicoes_tempo": 3,
 "onde_agir": [{"sistema_origem": "sistema_a", "campo": "data_nascimento", "regra": "formato", "quantidade": 16,
                "percentual": 21.9, "diagnostico": "Sistema A: 21,9% das falhas são de data de nascimento fora do formato (16 de 73).",
                "sugestao": "Sugestão: use máscara DD/MM/AAAA no campo de data, ..."}]}
```
`onde_agir` (`servicos/onde_agir.py`): em cada sistema, as falhas com ≥ 3 ocorrências e ≥ 15% das falhas dele
(no máximo 2 por sistema) viram diagnóstico + sugestão de ajuste no formulário, por um dicionário (campo, regra) →
sugestão no código. Sem IA. Regra nova sem sugestão própria recebe um texto genérico.
`tempo_medio_ms`: média do tempo da verificação (ler a configuração + validar), duas casas, só de validações medidas
de verdade (`null` sem medições; o seed não inventa tempos). `taxa_bloqueio` é percentual (0 a 100, uma casa). `por_sistema` em ordem alfabética; `por_campo` e `falhas`
do mais frequente para o menos (empate em ordem alfabética). `sistema_origem` tem no máximo 50 caracteres.

### `POST /cadastros` e `GET /cadastros`
Representam o backend do "Sistema A" de exemplo: chamam o serviço de validação e só gravam se aprovado,
gravando o dado **padronizado**. Existe só para provar na demo que o dado inválido não entra no banco.
- Entrada do `POST`: os campos de `dados` do `/validar` direto no corpo (sem `sistema_origem`, que é sempre
  `sistema_a`; a validação entra no painel como `sistema_a`).
- Gravado → HTTP 201 `{"gravado": true, "erros": [], "cadastro": {...}}`.
- Bloqueado → HTTP 200 `{"gravado": false, "erros": [...mesmos do /validar], "cadastro": null}`.
- `cadastro`: id, nome, cpf, email, data_nascimento, telefone, municipio, municipio_codigo_ibge, criado_em
  (campos não enviados ou inativos vêm `null`). `GET /cadastros` devolve a lista, mais recentes primeiro.
- Sem checagem de CPF repetido, de propósito: a demo é ensaiada várias vezes com os mesmos dados.

## Regras de validação (ids usados no campo `regra`)

Princípio dos **erros em camadas**: cada campo roda todas as checagens independentes e devolve todas as
falhas de uma vez. Uma checagem que depende de outra é pulada se a anterior falhar
(ex.: dígitos verificadores só rodam se o CPF tiver 11 dígitos). Campo vazio e não obrigatório: nenhuma checagem.

| Campo | Regras | Padronização |
|---|---|---|
| todos | `obrigatorio` (vazio ou só espaços) | trim |
| nome | `tamanho_minimo` (≥ 2 palavras), `caracteres_validos` (letras, acentos, espaço, apóstrofo, hífen) | espaços duplicados removidos, iniciais maiúsculas, preposições (da, de, do, das, dos, e) minúsculas |
| cpf | `formato` (11 dígitos, com ou sem pontuação), `digitos_repetidos`, `digitos_verificadores` | só dígitos |
| email | `sem_espacos`, `possui_arroba`, `dominio_valido` (domínio com ponto e TLD ≥ 2 letras) | minúsculo |
| data_nascimento | `formato` (DD/MM/AAAA estrito), `data_existente`, `nao_futura`, `idade_maxima` (≤ 130 anos) | ISO `AAAA-MM-DD` |
| telefone | `formato` (10 ou 11 dígitos), `ddd_valido`, `celular_com_9` (11 dígitos começa com 9 após DDD) | só dígitos |
| municipio | `municipio_ro` (existe em RO; compara ignorando acento, caixa, apóstrofo, hífen e espaços; se não achar, sugere o mais parecido na mensagem) | nome oficial + `municipio_codigo_ibge` |

Mensagens em português simples, dizendo o que corrigir. `formato_esperado` sempre preenchido quando fizer sentido.
Formatos alternativos ("1985-03-15", "15-3-85", "15 de março de 1985", "00/00/0000") são **bloqueados** com
`formato`: o objetivo é que todos os sistemas gravem no mesmo padrão.

## Banco (PostgreSQL no Render; SQLite `valida.db` no notebook, fora do git)
- URL pela variável `VALIDA_DB_URL` (padrão `sqlite:///./valida.db`). Tabelas criadas na subida do app.
  `normalizar_url` (`database.py`) aceita a URL do Render (`postgres://` ou `postgresql://`) e usa o driver psycopg;
  no PostgreSQL, `pool_pre_ping=True`. Diferença que importa: o PostgreSQL recusa texto maior que a coluna (o SQLite
  ignora). Por isso `cadastros.nome`/`email` não têm limite e `RegraAtualizacao` limita `formato_esperado` (100) e
  `ajuda` (300) na entrada (422). Coluna nova com limite: limitar também na entrada.
- `tests/test_banco_postgresql.py`: com `VALIDA_TESTE_PG_URL`, roda o fluxo completo num PostgreSQL de verdade (apaga
  e recria as tabelas: só banco de teste). Carga medida no PostgreSQL local: ~240 validações/s, p99 0,3 s, 0 falhas
  com 50 simultâneas.
- `regras_campo`: campo (pk), obrigatorio, ativo, formato_esperado, ajuda. A configuração inicial fica em
  `REGRAS_PADRAO` (`app/servicos/regras.py`) e é inserida na subida só para os campos que faltam, sem
  sobrescrever o que a CAGD mudou. Obrigatórios: nome, cpf, email, data_nascimento; opcionais: telefone, municipio.
  Todos os campos têm validador; um campo configurado sem validador passaria só por `obrigatorio` e trim.
- Testes usam SQLite em memória (`tests/conftest.py`), nunca o `valida.db`.
- SQLite em modo WAL, `synchronous=NORMAL` e `busy_timeout` de 30 s (`ajustar_sqlite` em `database.py`): sem isso, o
  teste de carga dava "database is locked" a partir de 20 chamadas simultâneas. Medido num notebook, um processo:
  ~145 validações/s, 0 falhas com 50 simultâneas. Os arquivos `valida.db-wal`/`-shm` ficam fora do git.
- Hospedagem: `render.yaml` (Render, plano grátis). O start roda `python -m app.seed` e o uvicorn em `$PORT`;
  sem `VALIDA_DB_URL`, o disco é apagado a cada reinício (volta às regras padrão + seed). Com o PostgreSQL do Render
  (`VALIDA_DB_URL` só no painel, porque tem senha), regras e cadastros sobrevivem; o seed só refaz o painel. Antes da
  demo, conferir as regras (telefone não obrigatório).
  Os formulários mostram o aviso "use apenas dados fictícios" (o link é público).
- Horários (`data_hora`, `criado_em`) gravados em UTC (`agora_utc()` em `models.py`); a API devolve com fuso
  (`...Z`) e o navegador converte para o horário local. O servidor do Render está em UTC.
- `validacoes`: id, sistema_origem, aprovado, data_hora, duracao_ms (nulo no histórico do seed).
- Colunas novas em tabela existente: `atualizar_tabelas()` (`database.py`) faz o `create_all` e acrescenta a
  coluna que faltar (`ALTER TABLE`), para o `valida.db` de quem já rodava o projeto não quebrar.
- `falhas_validacao`: id, validacao_id, sistema_origem, campo, regra, data_hora.
- `historico_regras`: id, campo, atributo, valor_anterior, valor_novo (texto: "true"/"false" ou o texto), data_hora.
- `cadastros`: id, nome, cpf, email, data_nascimento, telefone, municipio, municipio_codigo_ibge, criado_em.
  Dados padronizados do Sistema A de exemplo (fictícios).
- `python -m app.seed` apaga só `validacoes`/`falhas_validacao` e recria 200 validações fictícias (semente fixa).
  Não mexe em `regras_campo` nem em `cadastros`.

## Segurança
- Cabeçalhos de segurança em todas as respostas (`CABECALHOS_DE_SEGURANCA` em `main.py`): X-Frame-Options DENY,
  CSP `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, HSTS. Não pôr CSP de scripts: a página
  Como integrar executa o JS editado (precisaria de `unsafe-eval`).
- Schemas de entrada que alteram dados com `extra="forbid"` (ex.: `RegraAtualizacao`); valores calculados (resultado
  da validação, cadastro, autor do histórico) nunca vêm do cliente.
- Telas: dado vindo da API entra só por `textContent`; `innerHTML` só para ícones fixos (`ICONE_*`).
- Chave por sistema no `/validar` (ver o contrato): chaves comparadas em tempo constante; o sistema registrado
  vem da chave, nunca do corpo da requisição.
- `tests/test_seguranca_ataques.py` é o teste de invasão: ataques que precisam continuar falhando.

## LGPD (inegociável)
- `validacoes` e `falhas_validacao` **nunca** guardam o valor digitado: só sistema, campo, regra e data/hora.
- Não logar payloads em `print`/logger.
- Só dados fictícios em seed, testes e demo. CPFs de teste gerados por algoritmo, nunca reais.

## Frontend
- Responsivo (abrir no celular). Uma página por ator (Sistema A, Sistema B, CAGD), sem build e sem bibliotecas externas.
  Nenhuma página pode ficar mais larga que a tela (conferido em 360, 390, 412, 768, 1280, 1366 e 1536 px em 01/11):
  abas com `white-space: nowrap` (até 480 px, sem ícone); ações do cabeçalho (`.acoes-cabecalho`) quebram linha; até
  900 px o balão de ajuda abre acima do campo, na largura dele (`.field` com `position: relative`). Tabelas largas
  ficam dentro de caixa com rolagem própria. Elemento escondido (`visibility: hidden`) também alarga a página.
- O JS chama a API por caminho relativo (`API_BASE_URL = ''`), nunca por endereço fixo, para funcionar no celular.
- Erros aparecem embaixo de cada campo, todos de uma vez, vindos da API.
- Sistemas A e B têm, abaixo do aviso de dados fictícios, o painel recolhível "Dados fictícios para testar"
  (`js/dados-ficticios.js`, em `<div id="dados-ficticios">`): valores que aprovam e que bloqueiam (com o motivo),
  Copiar e Preencher. `tests/test_dados_ficticios.py` lê os valores do script e confere na API: mudar uma regra que
  invalide um exemplo quebra o teste.
- Ícone "i" ao lado de cada campo com `ajuda` + `formato_esperado` (tooltip no desktop, toque no celular).
- `sistema-a.html` envia para `POST /cadastros` (o backend dele) e mostra a lista "Banco do Sistema A (simulado)",
  deixando claro que esse banco é do sistema, não do Valida SETIC.
- `sistema-b.html` (Agendamento de Atendimento): envia para `POST /agendamentos` (o backend dele, que só valida;
  `data-rota="/agendamentos"`), campos nome, cpf, telefone, data_nascimento,
  email e um campo próprio não enviado ("Serviço"); cor própria (`body.tema-sistema-b`). Precisa ter todos os
  campos obrigatórios por padrão, senão seria sempre bloqueado (as regras valem para todos os sistemas).
- Campo município com lista própria de sugestões do `GET /municipios` (não `<datalist>`, que não dá para
  estilizar), montada pelo `formulario.js`.
- Máscaras por `data-mascara="cpf"`/`"telefone"`/`"data"` no input, só no Sistema A. O Sistema B fica sem, de
  propósito (sistema legado): é nele que a demo mostra a API bloqueando `1985-03-15`.
- `cagd.html` começa com `body.cagd-verificando` (nada aparece); `login-cagd.js` pergunta `GET /cagd/eu`:
  liberado → mostra tudo (com "Conectado como <nome>" e Sair); 401 → card de login (usuário, senha e olho). O token
  fica no `sessionStorage` (some ao fechar a aba). As telas registram o carregamento com `quandoLiberada()` e tratam
  401 com `tratarLoginRecusado()`. O histórico tem a coluna Quem.
- `cagd.html`: tabela de regras com interruptores (chama `PUT /regras/{campo}`) e painel com contagens.
  O interruptor de obrigatório fica desabilitado enquanto o campo estiver inativo.
- Formulários: asterisco só quando `ativo && obrigatorio`.
- `integrar.html` tem também o "Antes e depois" (cadastro em PHP: +9 linhas, 3 alteradas, destacadas) com os
  números do pitch: ~10 linhas por formulário, menos de 1 hora de desenvolvimento, zero linhas quando a regra muda.
- `integrar.html`: o exemplo JavaScript fica num editor e roda de verdade no navegador (`FuncaoAssincrona`, com
  o `console.log` mostrado na tela), para a banca editar valores dentro do código. Só no navegador de quem clicou,
  nunca no servidor: executar no servidor código digitado na página seria uma falha de segurança grave. As outras
  linguagens são só leitura ("copie e rode no terminal"); não fingir execução delas. Exemplos com `{{URL}}` (trocado pelo endereço de onde a página foi aberta) e
  `sistema_origem: "sistema_exemplo"`, com o cabeçalho `X-API-Key: demo-exemplo`. `tests/test_integrar.py` manda o JSON do exemplo curl para a API: se o
  contrato mudar, o teste avisa que a página ficou desatualizada. Executados de verdade (com a chave, em 01/11): curl,
  Python, JavaScript (Node) e Java.
- Outros integrantes editam `static/`. Não reescrever arquivos de `static/` inteiros sem pedir.

## Fora do escopo
- Corrigir dados antigos já gravados (o próprio desafio exclui).
- Editor genérico de regras (regras técnicas ficam no código; o banco guarda só a configuração).
- Validação dentro do banco (o desafio pede escolher API **ou** banco; escolhemos API).
- Gestão de usuários pela tela (criar, trocar senha, permissões): os usuários vêm da variável de ambiente.
  Cadastro de sistemas e troca de chave pela tela (as chaves vêm da variável `VALIDA_CHAVES_SISTEMAS`).

## Como trabalhar neste repositório
1. Uma etapa por vez. Antes de codar uma etapa, apresente o plano e espere aprovação.
2. Toda função de `validadores/` tem testes em `tests/` com casos válidos e inválidos, incluindo:
   29/02/2024 (válido), 29/02/2023, 31/02/1990, data futura, 00/00/0000, 1985-03-15,
   CPF 111.111.111-11, CPF com 10 dígitos, e-mail sem domínio, município com e sem acento.
3. Rode `pytest` antes de dizer que terminou. Não marque como pronto com teste falhando.
4. Cada etapa numa branch `<tipo>/<o-que-entrega>`, com o mesmo tipo do Conventional Commits
   (ex.: `feat/validadores`, `docs/readme-swagger`, `fix/...`), integrada à `main` por PR.
   Commits pequenos e com testes passando, no padrão Conventional Commits: tipo em inglês e descrição
   em português no imperativo (`feat(validadores): adiciona validação de CPF`, `chore: ...`, `docs: ...`).
5. Não adicione dependências sem perguntar. Não apague arquivos sem perguntar.
6. Código e nomes em português (variáveis, funções, rotas), comentários curtos só onde ajudam.
7. Ao final de cada etapa, explique em poucas linhas o que mudou e como testar no Swagger (`/docs`).
8. Prefira simples e legível a esperto: a equipe precisa explicar cada parte para a banca.
9. Ao fechar cada etapa: atualize o README.md (como instalar, rodar, testar e rotas disponíveis),
   adicione exemplos de entrada e saída nas rotas novas do Swagger, e atualize este CLAUDE.md se alguma
   decisão mudou. A documentação vai num commit próprio do tipo docs, na mesma branch e PR da etapa.

## Etapas (ordem de prioridade)
1. ✅ Validadores puros + testes (nome, cpf, email, data).
2. ✅ `POST /validar` com erros em camadas e `dados_padronizados`.
3. ✅ Banco + `regras_campo` + `GET/PUT /regras`; validação passa a ler a configuração.
4. ✅ Registro em `validacoes`/`falhas_validacao` + `GET /painel/erros` + `seed.py`.
5. ✅ `POST/GET /cadastros` (Sistema A grava só se aprovado).
6. ✅ Frontend: `sistema-a.html`, `cagd.html`.
7. ✅ telefone + municipio + `sistema-b.html` (dois sistemas, mesmas regras). Também prontos: hospedagem no
   Render, páginas na raiz, máscaras, lista de municípios e identidade da equipe.
8. **Diferenciais (objetivo atual, não é extra: vamos fazer).** Escolhidos pela equipe em 30/10, nesta ordem:
   1. ✅ **Página "Como integrar"**: o mesmo exemplo de chamada ao `POST /validar` em curl, Python, JavaScript,
      PHP e Java/C#, para mostrar que qualquer sistema legado integra em poucas linhas (restrições "sistemas
      legados" e "tecnologias variadas" do desafio).
   2. ✅ **Tempo de resposta no painel**: medir cada `/validar` e mostrar o tempo médio (restrição "desempenho":
      a verificação não pode deixar o cadastro lento).
   3. ✅ **"Onde agir" no painel**: recomendações a partir das contagens, por regras simples no código, sem IA
      (ex.: "Sistema A: a maioria das falhas de data é de formato; sugestão: máscara DD/MM/AAAA").
   4. ✅ **Senha simples na CAGD** (evoluiu para login por pessoa, ver abaixo): proteger o `PUT /regras/{campo}` e a tela da CAGD, porque o link hospedado é
      público. Não é login completo: uma senha só, configurada por variável de ambiente.
   5. ✅ **Histórico de mudanças de regra**: cada alteração da CAGD registrada (campo, atributo, valor anterior,
      valor novo, data/hora) e exibida na tela da CAGD (governança e auditoria).
   - ✅ Botão de olho no campo de senha da CAGD, para mostrar/esconder a senha (pedido em 31/10).
   - ✅ **Login por pessoa na CAGD** (31/10): cada um entra com o próprio usuário e o histórico registra quem
     mudou cada regra (modelo do IXC). Inclui o usuário "banca" para o jurado testar.
9. **Em espera (decisão de 30/10):** só depois da etapa 8 pronta e estável, e se houver tempo.
   - **Municípios do Brasil inteiro.** Hoje o município é só de RO, o que vale para cadastros estaduais
     (residência, atendimento), mas bloqueia, por exemplo, cidadão de outro estado atendido em RO ou
     naturalidade. Como fazer:
     - tabela nacional do IBGE (cerca de 5.570 municípios) em `app/dados/`, com nome oficial, UF e código;
       continua offline;
     - campo opcional `uf` em `dados`; sem `uf`, vale RO, então a demo e os sistemas atuais não mudam;
     - a UF é necessária porque há nomes repetidos entre estados (ex.: vários "Bom Jesus");
     - saída mantém `municipio` e `municipio_codigo_ibge`, e ganha `municipio_uf`;
     - mesma comparação (sem acento, caixa, apóstrofo, hífen e espaços) e sugestão por `difflib` dentro da UF;
     - `GET /municipios` passa a aceitar `?uf=`.
   - **Dockerfile**: "roda em qualquer servidor da SETIC com um comando" (argumento de viabilidade).
10. ✅ Chave por sistema no header `X-API-Key` (01/11): o painel registra o sistema dono da chave.

Ideias descartadas por agora (citar no pitch como próximos passos): regras diferentes por sistema; IA para
sugerir correções (contradiz o princípio de não adivinhar o que o usuário quis digitar).

**Pendências da equipe (fora do código):**
- [ ] Criar `VALIDA_USUARIOS_CAGD` no Render (Environment) com os usuários celso, felipe, judson e banca, no formato
  `usuario:Nome:senha;...`. Até lá, vale a senha única antiga como usuário `cagd`. Senhas nunca no repositório.
- [ ] No dia 03/11, mandar ao jurado só o usuário `banca` e a senha dele.
- [ ] Deixar o repositório público antes da apresentação (hoje está privado): o QR code do GitHub no slide final e
  os links do README só abrem para a banca se ele for público. Antes, conferir o histórico inteiro atrás de senhas
  e dados reais. Muda em Settings → General → Danger Zone → Change visibility (só o dono, hectorex).
- [ ] Preencher o About do repositório: descrição e o link https://valida-setic.onrender.com.

Congelar funcionalidades em 02/11. Daí em diante só correção de bug e ensaio.

## Roteiro da demo (5 min, ao vivo)
1. Sistema A: enviar e-mail "maria@" e data "31/02/1990" → erros em camadas, um por regra.
2. Mostrar no `GET /cadastros` que nada foi gravado.
3. Corrigir e salvar → mostrar o dado gravado já padronizado.
4. CAGD: tornar `telefone` obrigatório.
5. Sistema B (outro sistema) passa a exigir telefone sem mudar uma linha de código dele.
6. Painel: campos e sistemas que mais erram.

## Contexto do hackathon
- Apresentação 03/11, das 16h às 19h (horário alterado no slide oficial da abertura; o regulamento, item 5.1, ainda diz 15h–18h): pitch 3 min + demo ao vivo 5 min (vídeo = nota zero na demo).
  Passou de 8 min, a apresentação é cortada (8.2); depois, 3 min de perguntas, somando o tempo que sobrar (8.6).
  O regulamento permite ferramentas de IA (7.2).
- Critérios: Aderência 25%, Demonstração/qualidade técnica 25%, Inovação 20%, Viabilidade 15%, Pitch 15%.
- Jurados olham: aplicabilidade real, facilidade de integração, clareza para o usuário final, qualidade da demo.
- Nada de código anterior a 28/10. Componentes de terceiros com licença compatível.
