# Guia de arquitetura do Valida SETIC

Para quem vai entender, manter ou evoluir o código. O [README](../README.md) explica o **que** o sistema faz;
este guia explica **como** o código faz: por onde passa uma requisição, onde fica cada coisa e como acrescentar
algo novo. Os trechos de código abaixo são cópias dos arquivos citados; onde aparece `...`, o trecho foi
encurtado para caber.

## Sumário
1. [As camadas](#1-as-camadas)
2. [O caminho de um `POST /validar`](#2-o-caminho-de-um-post-validar)
3. [O caminho de uma mudança de regra](#3-o-caminho-de-uma-mudança-de-regra)
4. [O login da CAGD](#4-o-login-da-cagd)
5. [O painel e o Onde agir](#5-o-painel-e-o-onde-agir)
6. [O frontend](#6-o-frontend)
7. [Como acrescentar algo novo](#7-como-acrescentar-algo-novo)
8. [Os testes](#8-os-testes)
9. [Histórico do desenvolvimento](#9-histórico-do-desenvolvimento)

---

## 1. As camadas
O código é dividido em camadas, e cada uma só conversa com a de baixo:

```
  Telas (static/)        HTML + JS puro: montam o formulário e chamam a API com fetch
        │  HTTP/JSON
        ▼
  Rotas (app/rotas/)     recebem a requisição, conferem o formato (Pydantic) e o login
        │
        ▼
  Serviços (app/servicos/)   regras de negócio: valida, registra, agrega o painel, recomenda
        │                         │
        ▼                         ▼
  Validadores                 Banco (app/models.py + SQLAlchemy)
  (app/validadores/)          regras_campo, validacoes, falhas_validacao,
  funções puras, sem banco    historico_regras, cadastros
```

Por que assim:
- **Validadores são funções puras**: recebem um texto e devolvem o resultado, sem banco e sem rede. São fáceis de
  testar e de explicar. Exemplo: `validar_cpf("111.111.111-11")` sempre dá o mesmo resultado.
- **Serviços juntam as peças**: leem a configuração do banco, chamam os validadores e gravam o registro.
- **Rotas são finas**: só recebem, conferem e repassam para um serviço. Quase não têm lógica.

## 2. O caminho de um `POST /validar`
Um sistema envia `{"sistema_origem": "sistema_a", "dados": {"cpf": "111.111.111-11", ...}}`.

### Passo 1 · A rota recebe e confere o formato
`app/rotas/validar.py`
```python
def validar(
    requisicao: Annotated[RequisicaoValidacao, Body(openapi_examples=EXEMPLOS_REQUISICAO)],
    sessao: Session = Depends(obter_sessao),
):
    ...
    return validar_e_registrar(sessao, requisicao.sistema_origem, requisicao.dados.model_dump())
```
Antes de a função rodar, o FastAPI confere o JSON com o modelo `RequisicaoValidacao` (`app/schemas.py`). Sem
`sistema_origem` ou com JSON quebrado, ele responde 422 sozinho. Campos desconhecidos em `dados` são descartados ali
mesmo (`extra="ignore"`). `Depends(obter_sessao)` abre uma conexão com o banco só para esta requisição.

### Passo 2 · O serviço mede o tempo, valida e registra
`app/servicos/registro.py`
```python
def validar_e_registrar(sessao: Session, sistema_origem: str, dados: dict) -> RespostaValidacao:
    """Lê a configuração do banco, valida e registra o resultado (e quanto tempo levou) para o painel."""
    inicio = time.perf_counter()
    resposta = validar_dados(dados, carregar_config(sessao))
    duracao_ms = (time.perf_counter() - inicio) * 1000
    registrar_validacao(sessao, sistema_origem, resposta, duracao_ms=duracao_ms)
    return resposta
```
`carregar_config` lê a tabela `regras_campo` **a cada chamada**: é por isso que uma mudança da CAGD vale na hora,
sem reiniciar nada. O tempo medido aqui é o que aparece no painel.

### Passo 3 · A orquestração campo a campo
`app/servicos/validacao.py`
```python
    for campo, config in regras.items():
        if not config.ativo:
            continue

        valor = (dados.get(campo) or "").strip()
        if not valor:
            if config.obrigatorio:
                erros.append(
                    ErroValidacao(
                        campo=campo,
                        regra="obrigatorio",
                        ...
                    )
                )
            continue

        validador = VALIDADORES.get(campo)
        ...
        resultado = validador(valor)
        if resultado.valido:
            padronizados[campo] = resultado.valor
            padronizados.update(resultado.extras)  # ex.: municipio_codigo_ibge
        for falha in resultado.falhas:
            erros.append(ErroValidacao(campo=campo, regra=falha.regra, ...))
```
Lendo de cima para baixo:
1. **Campo inativo:** pula (é o "inativo prevalece").
2. **Campo vazio:** gera erro `obrigatorio` se for obrigatório; se não for, pula sem checar nada.
3. **Campo preenchido:** chama o validador daquele campo, pelo dicionário `VALIDADORES`.
4. **Junta tudo:** os erros de **todos** os campos vão para a mesma lista (por isso a pessoa vê todos os erros de uma
   vez) e os valores aprovados vão para `dados_padronizados`.

No fim: se a lista de erros não está vazia, devolve `valido: false` e `dados_padronizados: null`.

### Passo 4 · O validador (exemplo: CPF)
`app/validadores/cpf.py`
```python
def validar_cpf(valor: str) -> Resultado:
    valor = valor.strip()
    if not FORMATO.fullmatch(valor):
        return Resultado(
            None,
            [Falha("formato", "O CPF deve ter 11 dígitos, com ou sem pontos e traço.", FORMATO_ESPERADO)],
        )

    digitos = re.sub(r"[.-]", "", valor)
    falhas = []

    if len(set(digitos)) == 1:
        falhas.append(
            Falha("digitos_repetidos", "CPF com todos os dígitos iguais não é válido.", FORMATO_ESPERADO)
        )

    if _digitos_verificadores(digitos[:9]) != digitos[9:]:
        falhas.append(Falha("digitos_verificadores", ...))

    if falhas:
        return Resultado(None, falhas)
    return Resultado(digitos)
```
Aqui aparecem os **erros em camadas**:
- se o **formato** falha, o validador para na hora (`return`): não faz sentido calcular dígitos de um CPF com 10
  números;
- se o formato passa, as duas checagens seguintes rodam **juntas** e acumulam falhas na lista.

Os dígitos verificadores seguem o algoritmo da Receita Federal:
```python
def _digitos_verificadores(nove_digitos: str) -> str:
    # Algoritmo da Receita: soma ponderada, resto da divisão por 11
    digitos = [int(d) for d in nove_digitos]
    for peso_inicial in (10, 11):
        soma = sum(d * peso for d, peso in zip(digitos, range(peso_inicial, 1, -1)))
        resto = soma * 10 % 11
        digitos.append(0 if resto == 10 else resto)
    return f"{digitos[9]}{digitos[10]}"
```
Em português: multiplica os 9 primeiros dígitos por 10, 9, 8… 2, soma, e o resto da divisão por 11 dá o 10º dígito.
Repete com os 10 dígitos (pesos 11 a 2) para o 11º.

Todo validador devolve o mesmo formato, de `app/validadores/resultado.py`:
```python
@dataclass
class Resultado:
    valor: str | None  # valor padronizado; None quando há falha
    falhas: list[Falha] = field(default_factory=list)
    extras: dict[str, str] = field(default_factory=dict)  # campos derivados, ex.: código IBGE

    @property
    def valido(self) -> bool:
        return not self.falhas
```

Outro exemplo, a data (`app/validadores/data.py`). A data existe? Quem responde é o próprio Python:
```python
    dia, mes, ano = (int(parte) for parte in casamento.groups())
    try:
        data = date(ano, mes, dia)
    except ValueError:
        return Resultado(
            None,
            [Falha("data_existente", "Essa data não existe. Confira o dia e o mês.", FORMATO_ESPERADO)],
        )
```
`date(1990, 2, 31)` levanta erro porque fevereiro não tem dia 31. Ano bissexto (29/02/2024) é tratado do mesmo jeito,
sem regra especial.

### Passo 5 · O registro para o painel (sem o dado do cidadão)
`app/servicos/registro.py`
```python
    validacao = Validacao(
        sistema_origem=sistema_origem, aprovado=resposta.valido, data_hora=data_hora, duracao_ms=duracao_ms
    )
    sessao.add(validacao)
    sessao.flush()  # gera o id da validação para ligar as falhas
    for erro in resposta.erros:
        sessao.add(
            FalhaValidacao(
                validacao_id=validacao.id,
                sistema_origem=sistema_origem,
                campo=erro.campo,
                regra=erro.regra,
                data_hora=data_hora,
            )
        )
    sessao.commit()
```
Repare no que **não** é gravado: o valor digitado. As tabelas (`app/models.py`) nem têm coluna para isso:
```python
class FalhaValidacao(Base):
    """Uma regra violada numa validação bloqueada."""

    __tablename__ = "falhas_validacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    validacao_id: Mapped[int] = mapped_column(ForeignKey("validacoes.id"), index=True)
    sistema_origem: Mapped[str] = mapped_column(String(50), index=True)
    campo: Mapped[str] = mapped_column(String(50))
    regra: Mapped[str] = mapped_column(String(50))
    data_hora: Mapped[datetime] = mapped_column(default=agora_utc)
```
É a garantia de LGPD na prática, e há um teste (`tests/test_registro.py`) que falha se alguém acrescentar uma coluna
a essas tabelas.

## 3. O caminho de uma mudança de regra
A CAGD liga "telefone obrigatório" na tela, que chama `PUT /regras/telefone` com `{"obrigatorio": true}`.

1. **A rota** (`app/rotas/regras.py`) confere o corpo com `RegraAtualizacao`, que tem `extra="forbid"`: só aceita
   `obrigatorio`, `ativo`, `formato_esperado` e `ajuda`. Qualquer outro campo (ex.: `"admin": true`) é recusado com
   422. A rota também exige login: `quem: UsuarioCagd | None = Depends(usuario_cagd)`.
2. **O serviço** (`app/servicos/regras.py`) altera e registra o histórico na mesma transação:
```python
    for atributo, valor in alteracoes.items():
        anterior = getattr(regra, atributo)
        if anterior == valor:
            continue  # enviar o mesmo valor não é mudança: não entra no histórico
        setattr(regra, atributo, valor)
        sessao.add(
            HistoricoRegra(
                campo=campo,
                atributo=atributo,
                valor_anterior=como_texto(anterior),
                valor_novo=como_texto(valor),
                usuario=autor,
                data_hora=agora,
            )
        )
    sessao.commit()  # a mudança e o histórico entram juntos (ou nenhum dos dois)
```
3. **Na próxima validação** de qualquer sistema, o `carregar_config` (passo 2 acima) já lê o telefone como
   obrigatório. Nenhum sistema precisa mudar código.

O `autor` vem do **login**, nunca do corpo da requisição: ninguém consegue registrar uma mudança no nome de outra
pessoa.

## 4. O login da CAGD
Tudo está em `app/seguranca.py` e `app/rotas/cagd.py`.

- **Usuários:** vêm da variável de ambiente `VALIDA_USUARIOS_CAGD` (`usuario:Nome:senha;...`), lida a cada chamada.
- **Conferir a senha:**
```python
def autenticar(usuario: str, senha: str) -> UsuarioCagd | None:
    usuario = usuario.strip().lower()
    cadastrado = usuarios_configurados().get(usuario)
    # Compara mesmo quando o usuário não existe, para não dar pista de quais usuários existem pelo tempo
    nome, esperada = cadastrado or ("", secrets.token_urlsafe(16))
    senha_confere = secrets.compare_digest(senha.encode(), esperada.encode())  # tempo constante
    return UsuarioCagd(usuario=usuario, nome=nome) if cadastrado and senha_confere else None
```
  `compare_digest` leva o mesmo tempo acertando ou errando, então um atacante não descobre a senha medindo o tempo
  de resposta.
- **Sessão:** quem acerta recebe um token aleatório (`secrets.token_urlsafe(32)`), guardado num dicionário na memória
  (`SESSOES`), com validade de 8 horas.
- **Rotas protegidas** pedem `Depends(usuario_cagd)`, que confere o token a cada chamada:
```python
    sessao = SESSOES.get(credenciais.credentials) if credenciais else None
    if sessao is None or sessao.expira_em < datetime.now(timezone.utc):
        ...
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Faça login na CAGD (sessão ausente ou expirada).",
        )
```
- **Força bruta:** `registrar_tentativa` conta senhas erradas por usuário; na 5ª seguida, `BLOQUEADOS_ATE` guarda até
  quando o login fica bloqueado (5 minutos) e a rota de login responde 429.
- **Sem a variável** (notebook da demo), `protecao_ligada()` é falso e tudo fica aberto.

## 5. O painel e o Onde agir
- **`app/servicos/painel.py`:** faz as contagens direto no banco, com `GROUP BY` (por sistema, por campo, por sistema
  + campo + regra) e a média de `duracao_ms`. É SQL gerado pelo SQLAlchemy, sem carregar todas as linhas na memória.
- **`app/servicos/onde_agir.py`:** recebe a lista de falhas já contada e aplica regras simples: em cada sistema,
  calcula quanto cada falha pesa no total dele; as que têm pelo menos 3 ocorrências e 15% viram recomendação (no
  máximo 2 por sistema). O texto da sugestão vem de um dicionário `(campo, regra) → sugestão`:
```python
SUGESTOES = {
    ("data_nascimento", "formato"): "use máscara DD/MM/AAAA no campo de data, para o usuário digitar só os números.",
    ...
}
```
  Não há IA: é previsível e explicável, e a CAGD sabe exatamente por que cada recomendação apareceu.

## 6. O frontend
HTML, CSS e JavaScript puro, sem framework e sem etapa de build. O FastAPI serve a pasta `static/` na raiz.

| Arquivo | Papel |
|---|---|
| `js/comum.js` | `apiFetch`: toda chamada à API passa por aqui (endereço relativo, erros tratados) |
| `js/formulario.js` | Formulário genérico, usado pelo Sistema A e pelo Sistema B |
| `js/banco-sistema-a.js` | Lista "Banco do Sistema A (simulado)" |
| `js/login-cagd.js` | Login da CAGD, token na aba, contagem do bloqueio |
| `js/cagd.js`, `js/painel.js`, `js/historico.js` | Interruptores das regras, painel e histórico |
| `js/integrar.js` | Página Como integrar (abas, copiar, executar o JS editado) |

**Um formulário serve aos dois sistemas.** Cada página diz quem é no próprio HTML:
```html
<form id="form-sistema-a" data-sistema="sistema_a" data-rota="/cadastros" novalidate autocomplete="off">
```
O `formulario.js` lê esses atributos: com `data-rota`, envia para o backend do sistema (`/cadastros`); sem ela, como
no Sistema B, envia direto para o `/validar`. Os asteriscos e os textos de ajuda vêm do `GET /regras`, nunca de texto
fixo.

**Os erros vão para baixo de cada campo** (`js/formulario.js`):
```javascript
      erros.forEach((erro) => {
        if (!exibirErroCampo(erro.campo, erro.mensagem)) semCampo.push(erro.mensagem);
      });
```

**Segurança na tela:** todo dado vindo da API entra com `textContent` (nunca `innerHTML`), então um "script" mandado
como dado aparece escrito na tela e não executa.

## 7. Como acrescentar algo novo

### Um validador novo (ex.: CNPJ)
1. Criar `app/validadores/cnpj.py` com `def validar_cnpj(valor: str) -> Resultado`, no mesmo formato do CPF.
2. Criar `tests/test_cnpj.py` com casos válidos e inválidos.
3. Registrar no dicionário `VALIDADORES` (`app/servicos/validacao.py`):
```python
VALIDADORES = {
    "nome": validar_nome,
    "cpf": validar_cpf,
    ...
}
```
4. Acrescentar o campo em `REGRAS_PADRAO` (`app/servicos/regras.py`), com `obrigatorio`, `formato_esperado` e `ajuda`.
   Na próxima subida, ele é criado no banco sem mexer nas regras que a CAGD já mudou.
5. Acrescentar o campo em `DadosEntrada` (`app/schemas.py`).

Nenhum sistema consumidor precisa mudar: quem quiser validar CNPJ só passa a enviar o campo.

### Uma sugestão nova no Onde agir
Uma linha no dicionário `SUGESTOES` de `app/servicos/onde_agir.py` (e a descrição da regra em `DESCRICOES`, se for
regra nova). Um teste garante que toda regra com sugestão tem descrição.

### Uma coluna nova numa tabela que já existe
Acrescentar no model e também em `COLUNAS_NOVAS` (`app/database.py`). Na subida, `atualizar_tabelas()` faz o
`ALTER TABLE` em bancos antigos, sem apagar dados.

### Trocar SQLite por PostgreSQL
Só a variável de ambiente: `VALIDA_DB_URL=postgresql://usuario:senha@host/valida` (e instalar o driver do
PostgreSQL). O código usa SQLAlchemy e não tem SQL específico do SQLite.

## 8. Os testes
- `python -m pytest` roda tudo em poucos segundos.
- `tests/conftest.py` cria um **banco SQLite em memória novo para cada teste** e o injeta no lugar do banco real.
  Os testes nunca tocam no `valida.db`, e um não interfere no outro.
- Um arquivo de teste por assunto: `test_cpf.py`, `test_data.py`… (validadores); `test_rota_validar.py`,
  `test_regras.py`, `test_painel.py`… (API); `test_login_cagd.py`, `test_seguranca_ataques.py` (segurança);
  `test_paginas.py`, `test_integrar.py` (telas).
- Os exemplos do Swagger são conferidos contra a resposta real da API. Se o contrato mudar sem atualizar o exemplo, o
  teste quebra.

## 9. Histórico do desenvolvimento
O projeto foi feito em etapas, cada uma numa branch própria e integrada por pull request, com commits no padrão
Conventional Commits. Os 32 PRs estão no GitHub.

| Dia | Etapa | O que entrou |
|---|---|---|
| 29/10 | Base e validadores | Nome, CPF, e-mail e data, como funções puras, com testes |
| 29/10 | `POST /validar` | Erros em camadas e dados padronizados |
| 29/10 | Regras no banco | `GET/PUT /regras`; a validação passa a ler a configuração a cada chamada |
| 29/10 | Município | Os 52 municípios de RO com código IBGE e sugestão por erro de digitação |
| 30/10 | Telas | Sistema A e CAGD em páginas separadas, depois o Sistema B |
| 30/10 | Painel | Registro das validações (sem dados pessoais), painel e seed |
| 30/10 | Cadastros | O Sistema A de exemplo grava só se aprovado |
| 30/10 | Telefone | DDD, celular com 9; sugestão de municípios ao digitar |
| 30/10 | Hospedagem | Render, páginas na raiz, máscaras, horários em UTC |
| 30/10 | Diferenciais | Como integrar (6 linguagens, JS executável, antes e depois), tempo de resposta, Onde agir |
| 31/10 | Governança | Login da CAGD, histórico de mudanças com quem mudou |
| 31/10 | Segurança | Teste de invasão, bloqueio contra força bruta, cabeçalhos de segurança |
