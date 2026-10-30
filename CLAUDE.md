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
- Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2, SQLite, pytest.
- Frontend: HTML, CSS e JavaScript puro com `fetch` (sem frameworks nem Bootstrap), servido pelo próprio FastAPI em `/static/`.
  A raiz `/` redireciona para `/static/`.
- Um único comando sobe tudo: `uvicorn app.main:app --reload`.
- O SQLAlchemy permite trocar SQLite por PostgreSQL só mudando a URL de conexão (argumento de viabilidade).

## Estrutura de pastas
```
app/
  main.py              # cria o app, inclui rotas, monta static/, cria tabelas
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
  rotas/               # validar.py, regras.py, painel.py, cadastros.py
  seed.py              # histórico fictício para o painel (as regras padrão são criadas na subida do app)
static/
  index.html           # página inicial com links para as outras
  sistema-a.html       # cadastro de cidadão
  sistema-b.html       # segundo sistema, campos diferentes, mesmas regras
  cagd.html            # regras + painel de erros
  js/comum.js          # chamadas à API (endereço relativo), toasts, alertas
  js/formulario.js     # formulário genérico: <form data-sistema="sistema_a" data-rota="/cadastros">
                       #   data-rota opcional; sem ela envia para POST /validar (Sistema B)
  js/banco-sistema-a.js  # lista "Banco do Sistema A (simulado)" (GET /cadastros)
  js/cagd.js           # interruptores das regras
  js/painel.js         # painel de erros da CAGD (GET /painel/erros)
  css/style.css
tests/
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

### `GET /regras` e `PUT /regras/{campo}`
Configuração por campo: `obrigatorio`, `ativo`, `formato_esperado`, `ajuda` (texto do ícone "i").
O formulário monta asteriscos e textos de ajuda a partir do `GET /regras`, nunca de texto fixo.
O `PUT` é parcial: só os atributos enviados mudam (ex.: `{"obrigatorio": true}`). Campo inexistente → 404;
atributo desconhecido → 422. Não cria campos novos. O `/validar` lê a configuração do banco a cada chamada.
**Inativo prevalece:** com `ativo=false` o campo não é cobrado nem validado, mesmo com `obrigatorio=true`.
Os dois valores ficam guardados de forma independente, para que reativar restaure a configuração anterior.

### `GET /painel/erros`
Agrega falhas por sistema, campo e regra (contagem), mais totais de validações e taxa de bloqueio por sistema.
Todo `POST /validar` com payload válido é registrado (aprovado ou não); 422 não é registrado.
```json
{"total_validacoes": 3, "total_bloqueadas": 2, "taxa_bloqueio": 66.7,
 "por_sistema": [{"sistema_origem": "sistema_a", "validacoes": 2, "bloqueadas": 1, "taxa_bloqueio": 50.0}],
 "por_campo": [{"campo": "email", "falhas": 3}],
 "falhas": [{"sistema_origem": "sistema_a", "campo": "email", "regra": "dominio_valido", "quantidade": 1}]}
```
`taxa_bloqueio` é percentual (0 a 100, uma casa). `por_sistema` em ordem alfabética; `por_campo` e `falhas`
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

## Banco (SQLite, arquivo `valida.db`, fora do git)
- URL trocável pela variável `VALIDA_DB_URL` (padrão `sqlite:///./valida.db`). Tabelas criadas na subida do app.
- `regras_campo`: campo (pk), obrigatorio, ativo, formato_esperado, ajuda. A configuração inicial fica em
  `REGRAS_PADRAO` (`app/servicos/regras.py`) e é inserida na subida só para os campos que faltam, sem
  sobrescrever o que a CAGD mudou. Obrigatórios: nome, cpf, email, data_nascimento; opcionais: telefone, municipio.
  Campo configurado sem validador (telefone, até a etapa 7) passa só por `obrigatorio` e trim.
- Testes usam SQLite em memória (`tests/conftest.py`), nunca o `valida.db`.
- `validacoes`: id, sistema_origem, aprovado, data_hora.
- `falhas_validacao`: id, validacao_id, sistema_origem, campo, regra, data_hora.
- `cadastros`: id, nome, cpf, email, data_nascimento, telefone, municipio, municipio_codigo_ibge, criado_em.
  Dados padronizados do Sistema A de exemplo (fictícios).
- `python -m app.seed` apaga só `validacoes`/`falhas_validacao` e recria 200 validações fictícias (semente fixa).
  Não mexe em `regras_campo` nem em `cadastros`.

## LGPD (inegociável)
- `validacoes` e `falhas_validacao` **nunca** guardam o valor digitado: só sistema, campo, regra e data/hora.
- Não logar payloads em `print`/logger.
- Só dados fictícios em seed, testes e demo. CPFs de teste gerados por algoritmo, nunca reais.

## Frontend
- Responsivo (abrir no celular). Uma página por ator (Sistema A, Sistema B, CAGD), sem build e sem bibliotecas externas.
- O JS chama a API por caminho relativo (`API_BASE_URL = ''`), nunca por endereço fixo, para funcionar no celular.
- Erros aparecem embaixo de cada campo, todos de uma vez, vindos da API.
- Ícone "i" ao lado de cada campo com `ajuda` + `formato_esperado` (tooltip no desktop, toque no celular).
- `sistema-a.html` envia para `POST /cadastros` (o backend dele) e mostra a lista "Banco do Sistema A (simulado)",
  deixando claro que esse banco é do sistema, não do Valida SETIC.
- `cagd.html`: tabela de regras com interruptores (chama `PUT /regras/{campo}`) e painel com contagens.
  O interruptor de obrigatório fica desabilitado enquanto o campo estiver inativo.
- Formulários: asterisco só quando `ativo && obrigatorio`.
- Outros integrantes editam `static/`. Não reescrever arquivos de `static/` inteiros sem pedir.

## Fora do escopo
- Corrigir dados antigos já gravados (o próprio desafio exclui).
- Editor genérico de regras (regras técnicas ficam no código; o banco guarda só a configuração).
- Validação dentro do banco (o desafio pede escolher API **ou** banco; escolhemos API).
- Login completo. Se sobrar tempo: chave por sistema no header `X-API-Key` e token simples para `cagd.html`.

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
1. Validadores puros + testes (nome, cpf, email, data).
2. `POST /validar` com erros em camadas e `dados_padronizados`.
3. Banco + `regras_campo` + `GET/PUT /regras`; validação passa a ler a configuração.
4. Registro em `validacoes`/`falhas_validacao` + `GET /painel/erros` + `seed.py`.
5. `POST/GET /cadastros` (Sistema A grava só se aprovado).
6. Frontend: `sistema-a.html`, `cagd.html`.
7. telefone + municipio + `sistema-b.html` (dois sistemas, mesmas regras).
8. **Meta: municípios do Brasil inteiro.** Queremos atingir isto depois do plano principal (etapas 1 a 7
   prontas e estáveis) e antes dos extras da etapa 9. Hoje o município é só de RO, o que vale para cadastros
   estaduais (residência, atendimento), mas bloqueia, por exemplo, cidadão de outro estado atendido em RO
   ou naturalidade. Como fazer:
   - tabela nacional do IBGE (cerca de 5.570 municípios) em `app/dados/`, com nome oficial, UF e código;
     continua offline;
   - campo opcional `uf` em `dados`; sem `uf`, vale RO, então a demo e os sistemas atuais não mudam;
   - a UF é necessária porque há nomes repetidos entre estados (ex.: vários "Bom Jesus");
   - saída mantém `municipio` e `municipio_codigo_ibge`, e ganha `municipio_uf`;
   - mesma comparação (sem acento, caixa, apóstrofo, hífen e espaços) e sugestão por `difflib` dentro da UF.
9. Extras se sobrar tempo: `X-API-Key`, hospedagem com QR code, tempo de resposta no painel.

Congelar funcionalidades em 02/11. Daí em diante só correção de bug e ensaio.

## Roteiro da demo (5 min, ao vivo)
1. Sistema A: enviar e-mail "maria@" e data "31/02/1990" → erros em camadas, um por regra.
2. Mostrar no `GET /cadastros` que nada foi gravado.
3. Corrigir e salvar → mostrar o dado gravado já padronizado.
4. CAGD: tornar `telefone` obrigatório.
5. Sistema B (outro sistema) passa a exigir telefone sem mudar uma linha de código dele.
6. Painel: campos e sistemas que mais erram.

## Contexto do hackathon
- Apresentação 03/11, das 16h às 19h: pitch 3 min + demo ao vivo 5 min (vídeo = nota zero na demo).
- Critérios: Aderência 25%, Demonstração/qualidade técnica 25%, Inovação 20%, Viabilidade 15%, Pitch 15%.
- Jurados olham: aplicabilidade real, facilidade de integração, clareza para o usuário final, qualidade da demo.
- Nada de código anterior a 28/10. Componentes de terceiros com licença compatível.
