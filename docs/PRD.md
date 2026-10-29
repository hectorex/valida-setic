# PRD — Valida SETIC

> Documento curto de produto. Os detalhes técnicos (contrato da API, ids de regra, banco, estrutura)
> estão no `CLAUDE.md` da raiz. Se os dois divergirem, corrija os dois juntos.

## 1. Problema
Os sistemas do Estado gravam o que o usuário digitar. A mesma data de nascimento aparece como
`15/03/1985`, `1985-03-15`, `15-3-85`, `31/02/1990` ou `00/00/0000`. O erro só aparece quando alguém
cruza dados num relatório, e aí é preciso limpar à mão ou o resultado sai errado.

## 2. Solução
Uma API central que todo sistema chama **antes de gravar**. Ela verifica e padroniza o dado e
responde na hora:
- **aprovado**, devolvendo o dado já no formato padrão para ser gravado;
- **bloqueado**, dizendo qual campo falhou, qual regra e o formato esperado, com todos os erros de uma vez.

A CAGD altera as regras num lugar só e acompanha num painel onde os sistemas mais erram.

## 3. Usuários
| Quem | O que faz |
|---|---|
| Sistema consumidor (qualquer linguagem) | Envia os dados por HTTP/JSON e trata a resposta |
| Cidadão / servidor | Preenche o formulário e corrige o que for apontado |
| CAGD | Liga e desliga obrigatoriedade dos campos e consulta o painel de erros |

## 4. Requisitos e critérios de aceite

### Obrigatórios (sem eles não há demo)
| # | Requisito | Pronto quando… |
|---|---|---|
| R1 | Validar nome, CPF, e-mail e data de nascimento | Os testes de `tests/` passam, incluindo 29/02/2024 aceito, 31/02/1990, 00/00/0000, 1985-03-15, data futura, CPF 111.111.111-11 e e-mail sem domínio bloqueados |
| R2 | Erros em camadas | `"maria"` no e-mail retorna 2 erros (`possui_arroba`, `dominio_valido`); `"maria@"` retorna 1 |
| R3 | Erro claro | Todo erro tem `campo`, `regra`, `mensagem` e, quando fizer sentido, `formato_esperado` |
| R4 | Padronização | Dado aprovado volta em `dados_padronizados` (data em `AAAA-MM-DD`, CPF só dígitos, e-mail minúsculo, nome com espaços e maiúsculas corrigidos) |
| R5 | Bloquear a gravação | `POST /cadastros` com dado inválido não cria registro; com dado válido grava a versão padronizada |
| R6 | Regras centralizadas | Mudar `obrigatorio` de um campo em `PUT /regras/{campo}` muda a resposta de `/validar` na chamada seguinte, sem reiniciar o servidor |
| R7 | Painel de erros | `GET /painel/erros` mostra contagem por sistema, campo e regra, e taxa de bloqueio por sistema |
| R8 | LGPD | Nenhuma tabela de log guarda o valor digitado; só sistema, campo, regra e data/hora |
| R9 | Interface | `sistema-a.html` mostra os erros embaixo de cada campo e o "i" com o formato vindo de `GET /regras`; `cagd.html` liga e desliga regras e mostra o painel; tudo funciona no celular |

### Importantes (fazem diferença na nota)
| # | Requisito | Pronto quando… |
|---|---|---|
| I1 | Telefone e município de RO | Município aceito sem acento ou caixa e devolvido com o nome oficial; DDD inválido bloqueado |
| I2 | Segundo sistema | `sistema-b.html`, com campos diferentes, obedece à mesma regra alterada pela CAGD sem mudar o próprio código |
| I3 | Seed | `python -m app.seed` deixa o painel com dados fictícios para a demo |

### Meta (depois dos obrigatórios e importantes, antes de "Se sobrar tempo")
| # | Requisito | Pronto quando… |
|---|---|---|
| M1 | Municípios do Brasil inteiro | Com `uf` informada, aceita município de qualquer estado (tabela do IBGE, offline) e devolve nome oficial, código IBGE e UF; sem `uf`, continua valendo RO |

### Se sobrar tempo
| # | Requisito |
|---|---|
| S1 | Chave por sistema no header `X-API-Key` e token simples para a tela da CAGD |
| S2 | Hospedagem com QR code para a banca testar pelo celular |
| S3 | Tempo médio de resposta exibido no painel |

## 5. Fora do escopo
- Corrigir dados antigos já gravados (excluído pelo próprio desafio).
- Validação dentro do banco de dados (escolhemos a abordagem por API).
- Editor genérico de regras e login completo.
- Comprovar identidade, existência do e-mail ou veracidade da informação: verificamos estrutura e consistência.

## 6. Requisitos não funcionais
- **Desempenho:** resposta de `/validar` em menos de 200 ms localmente.
- **Integração:** HTTP/JSON puro, documentado no Swagger (`/docs`); qualquer linguagem consome.
- **Portabilidade:** SQLite na demo; PostgreSQL em produção trocando só a URL de conexão.
- **Demo:** tudo sobe com um comando e funciona sem internet.

## 7. Cronograma
| Data | Meta |
|---|---|
| 29/10 | R1 a R4 (validadores e `/validar`) + tira-dúvidas |
| 30/10 | R5 a R8 (banco, regras, cadastros, painel, seed) |
| 31/10 | R9 (telas) |
| 01/11 | I1 e I2; se tudo estiver estável, a meta M1 e depois os extras |
| 02/11 | **Congelamento.** Só correção de bug, slides e ensaio cronometrado |
| 03/11 | Credenciamento e apresentação (16h–19h) |

## 8. Demo (5 min)
1. Sistema A: e-mail `maria@` e data `31/02/1990` → erros em camadas.
2. Mostrar que nada foi gravado.
3. Corrigir e salvar → dado gravado já padronizado.
4. CAGD torna `telefone` obrigatório.
5. Sistema B passa a exigir telefone sem mudar o próprio código.
6. Painel: onde os sistemas mais erram.

## 9. Mensagem do pitch
"Hoje cada sistema valida do seu jeito e o erro só aparece no relatório. O Valida SETIC barra e
padroniza o dado na entrada, com regras que a CAGD muda num lugar só e valem para todos os sistemas,
sem reescrever nenhum deles."
