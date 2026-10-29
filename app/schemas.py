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
    sistema_origem: str = Field(min_length=1, examples=["sistema_a"])
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


class RegraSaida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    campo: str
    obrigatorio: bool
    ativo: bool
    formato_esperado: str | None
    ajuda: str | None


class RegraAtualizacao(BaseModel):
    # Todos opcionais: só o que for enviado muda. Atributo desconhecido gera 422.
    model_config = ConfigDict(extra="forbid")

    obrigatorio: bool | None = None
    ativo: bool | None = None
    formato_esperado: str | None = None
    ajuda: str | None = None
