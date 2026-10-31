from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DadosEntrada(BaseModel):
    # Campos desconhecidos são ignorados; número vira texto (ex.: CPF enviado como número)
    model_config = ConfigDict(extra="ignore", coerce_numbers_to_str=True)

    nome: str | None = None
    cpf: str | None = None
    email: str | None = None
    data_nascimento: str | None = None
    telefone: str | None = None
    municipio: str | None = None


class RequisicaoValidacao(BaseModel):
    sistema_origem: str = Field(min_length=1, max_length=50, examples=["sistema_a"])
    dados: DadosEntrada

    model_config = ConfigDict(str_strip_whitespace=True)


class ErroValidacao(BaseModel):
    campo: str
    regra: str
    mensagem: str
    formato_esperado: str | None = None


class RespostaValidacao(BaseModel):
    valido: bool
    erros: list[ErroValidacao]
    dados_padronizados: dict[str, str] | None


DESCRICAO_OBRIGATORIO = "Campo vazio é bloqueado. Só vale quando `ativo` é true."
DESCRICAO_ATIVO = (
    "false: o campo não é cobrado nem validado, mesmo se `obrigatorio` for true. "
    "O valor de `obrigatorio` fica guardado e volta a valer ao reativar."
)


class RegraSaida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    campo: str
    obrigatorio: bool = Field(description=DESCRICAO_OBRIGATORIO)
    ativo: bool = Field(description=DESCRICAO_ATIVO)
    formato_esperado: str | None
    ajuda: str | None


def marcar_utc(valor: datetime) -> datetime:
    # O SQLite devolve o horário sem fuso; ele foi gravado em UTC, então marcamos como UTC
    # para o navegador converter para o horário local (em RO, UTC-4)
    return valor if valor.tzinfo else valor.replace(tzinfo=timezone.utc)


class HistoricoRegraSaida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    campo: str
    atributo: str = Field(description="obrigatorio, ativo, formato_esperado ou ajuda.")
    valor_anterior: str | None = Field(description='"true"/"false" nos interruptores; o texto em formato e ajuda.')
    valor_novo: str | None
    usuario: str | None = Field(description="Quem fez a mudança (nome do login da CAGD); null com a CAGD sem login.")
    data_hora: datetime = Field(description="Em UTC, com fuso no texto (ex.: 2026-11-03T20:30:00Z).")

    @field_validator("data_hora")
    @classmethod
    def em_utc(cls, valor: datetime) -> datetime:
        return marcar_utc(valor)


class RegraAtualizacao(BaseModel):
    # Todos opcionais: só o que for enviado muda. Atributo desconhecido gera 422.
    model_config = ConfigDict(extra="forbid")

    obrigatorio: bool | None = Field(default=None, description=DESCRICAO_OBRIGATORIO)
    ativo: bool | None = Field(default=None, description=DESCRICAO_ATIVO)
    formato_esperado: str | None = None
    ajuda: str | None = None


# Painel de erros (GET /painel/erros)


class SistemaPainel(BaseModel):
    sistema_origem: str
    validacoes: int
    bloqueadas: int
    taxa_bloqueio: float = Field(description="Percentual de validações bloqueadas (0 a 100, uma casa decimal).")


class CampoPainel(BaseModel):
    campo: str
    falhas: int


class FalhaPainel(BaseModel):
    sistema_origem: str
    campo: str
    regra: str
    quantidade: int


class Recomendacao(BaseModel):
    sistema_origem: str
    campo: str
    regra: str
    quantidade: int
    percentual: float = Field(description="Parte das falhas do sistema que é desta regra (0 a 100, uma casa).")
    diagnostico: str = Field(description="O que está acontecendo, em português simples.")
    sugestao: str = Field(description="Ajuste sugerido no formulário daquele sistema.")


class RespostaPainel(BaseModel):
    total_validacoes: int
    total_bloqueadas: int
    taxa_bloqueio: float = Field(description="Percentual geral de validações bloqueadas (0 a 100).")
    por_sistema: list[SistemaPainel] = Field(description="Em ordem alfabética de sistema.")
    por_campo: list[CampoPainel] = Field(description="Campos que mais erram primeiro.")
    falhas: list[FalhaPainel] = Field(description="Contagem por sistema, campo e regra; as mais frequentes primeiro.")
    tempo_medio_ms: float | None = Field(
        description="Tempo médio da verificação (ler a configuração + validar), em milissegundos, duas casas. "
        "Só de validações medidas de verdade; null se ainda não houver nenhuma."
    )
    medicoes_tempo: int = Field(description="Quantas validações entraram na média de tempo.")
    onde_agir: list[Recomendacao] = Field(
        description="Recomendações para a CAGD: em cada sistema, as falhas com pelo menos 3 ocorrências e 15% das "
        "falhas dele (no máximo 2 por sistema), da mais frequente para a menos. Regras simples, sem IA."
    )


# Cadastros do Sistema A de exemplo (POST/GET /cadastros)


class CadastroSaida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str | None
    cpf: str | None
    email: str | None
    data_nascimento: str | None
    telefone: str | None
    municipio: str | None
    municipio_codigo_ibge: str | None
    criado_em: datetime = Field(description="Em UTC, com fuso no texto (ex.: 2026-11-03T20:30:00Z).")

    @field_validator("criado_em")
    @classmethod
    def em_utc(cls, valor: datetime) -> datetime:
        return marcar_utc(valor)


class RespostaCadastro(BaseModel):
    gravado: bool = Field(description="true: o dado foi aprovado e gravado já padronizado (HTTP 201).")
    erros: list[ErroValidacao] = Field(description="Mesmos erros do POST /validar; vazio quando gravado.")
    cadastro: CadastroSaida | None = Field(description="O registro gravado; null quando bloqueado.")


class MunicipioSaida(BaseModel):
    nome: str = Field(description="Nome oficial, como o POST /validar devolve.")
    codigo_ibge: str = Field(description="Código IBGE de 7 dígitos.")


# Login da CAGD (POST /cagd/login, GET /cagd/eu)


class LoginEntrada(BaseModel):
    usuario: str = Field(min_length=1, max_length=50, examples=["banca"])
    senha: str = Field(min_length=1, max_length=200)


class LoginSaida(BaseModel):
    token: str = Field(description='Vai nas próximas chamadas no cabeçalho "Authorization: Bearer <token>".')
    usuario: str
    nome: str = Field(description="Nome que aparece no histórico de mudanças.")
    expira_em: datetime


class EuSaida(BaseModel):
    protegido: bool = Field(description="false: o servidor está sem usuários configurados e a CAGD fica aberta.")
    usuario: str | None
    nome: str | None
