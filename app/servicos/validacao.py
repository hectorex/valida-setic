from dataclasses import dataclass

from app.schemas import ErroValidacao, RespostaValidacao
from app.validadores.cpf import validar_cpf
from app.validadores.data import validar_data_nascimento
from app.validadores.email import validar_email
from app.validadores.nome import validar_nome

# Ordem em que os campos são validados e os erros aparecem.
# telefone e municipio entram na etapa 7.
VALIDADORES = {
    "nome": validar_nome,
    "cpf": validar_cpf,
    "email": validar_email,
    "data_nascimento": validar_data_nascimento,
}


@dataclass
class ConfigCampo:
    obrigatorio: bool
    ativo: bool = True
    formato_esperado: str | None = None


# Configuração usada até a etapa 3, quando passa a vir da tabela regras_campo
REGRAS_PADRAO = {
    "nome": ConfigCampo(obrigatorio=True, formato_esperado="Nome e sobrenome"),
    "cpf": ConfigCampo(obrigatorio=True, formato_esperado="000.000.000-00"),
    "email": ConfigCampo(obrigatorio=True, formato_esperado="nome@dominio.com"),
    "data_nascimento": ConfigCampo(obrigatorio=True, formato_esperado="DD/MM/AAAA"),
}


def validar_dados(dados: dict[str, str | None], regras: dict[str, ConfigCampo]) -> RespostaValidacao:
    erros = []
    padronizados = {}

    for campo, validador in VALIDADORES.items():
        config = regras.get(campo)
        if config is None or not config.ativo:
            continue

        valor = (dados.get(campo) or "").strip()
        if not valor:
            if config.obrigatorio:
                erros.append(
                    ErroValidacao(
                        campo=campo,
                        regra="obrigatorio",
                        mensagem="Campo obrigatório. Preencha antes de enviar.",
                        formato_esperado=config.formato_esperado,
                    )
                )
            continue

        resultado = validador(valor)
        if resultado.valido:
            padronizados[campo] = resultado.valor
        for falha in resultado.falhas:
            erros.append(
                ErroValidacao(
                    campo=campo,
                    regra=falha.regra,
                    mensagem=falha.mensagem,
                    formato_esperado=falha.formato_esperado,
                )
            )

    if erros:
        return RespostaValidacao(valido=False, erros=erros, dados_padronizados=None)
    return RespostaValidacao(valido=True, erros=[], dados_padronizados=padronizados)
