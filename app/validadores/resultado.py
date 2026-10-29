from dataclasses import dataclass, field


@dataclass
class Falha:
    regra: str  # id da regra, ex.: "data_existente"
    mensagem: str
    formato_esperado: str | None = None


@dataclass
class Resultado:
    valor: str | None  # valor padronizado; None quando há falha
    falhas: list[Falha] = field(default_factory=list)

    @property
    def valido(self) -> bool:
        return not self.falhas
