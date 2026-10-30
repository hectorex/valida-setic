from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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


class RespostaPainel(BaseModel):
    total_validacoes: int
    total_bloqueadas: int
    taxa_bloqueio: float = Field(description="Percentual geral de validações bloqueadas (0 a 100).")
    por_sistema: list[SistemaPainel] = Field(description="Em ordem alfabética de sistema.")
    por_campo: list[CampoPainel] = Field(description="Campos que mais erram primeiro.")
    falhas: list[FalhaPainel] = Field(description="Contagem por sistema, campo e regra; as mais frequentes primeiro.")


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
    criado_em: datetime


class RespostaCadastro(BaseModel):
    gravado: bool = Field(description="true: o dado foi aprovado e gravado já padronizado (HTTP 201).")
    erros: list[ErroValidacao] = Field(description="Mesmos erros do POST /validar; vazio quando gravado.")
    cadastro: CadastroSaida | None = Field(description="O registro gravado; null quando bloqueado.")
