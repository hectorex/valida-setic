from dataclasses import dataclass

from app.schemas import ErroValidacao, RespostaValidacao
from app.validadores.cpf import validar_cpf
from app.validadores.data import validar_data_nascimento
from app.validadores.email import validar_email
from app.validadores.molde import validar_molde
from app.validadores.municipio import validar_municipio
from app.validadores.nome import validar_nome
from app.validadores.telefone import validar_telefone

# Validador de cada campo. Um campo configurado sem validador só passaria
# pela regra obrigatorio e pelo trim.
VALIDADORES = {
    "nome": validar_nome,
    "cpf": validar_cpf,
    "email": validar_email,
    "data_nascimento": validar_data_nascimento,
    "telefone": validar_telefone,
    "municipio": validar_municipio,
}


@dataclass
class ConfigCampo:
    obrigatorio: bool
    ativo: bool = True
    formato_esperado: str | None = None


def validar_dados(dados: dict, regras: dict[str, ConfigCampo], regras_formato=()) -> RespostaValidacao:
    """Valida os campos na ordem de `regras` (vinda do banco) e devolve todos os erros de uma vez.

    Depois, os campos novos que têm regra de formato da CAGD (`regras_formato`, só as ativas).
    """
    erros = []
    padronizados = {}

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
                        mensagem="Campo obrigatório. Preencha antes de enviar.",
                        formato_esperado=config.formato_esperado,
                    )
                )
            continue

        validador = VALIDADORES.get(campo)
        if validador is None:
            padronizados[campo] = valor
            continue

        # O município usa a UF opcional (sem ela, Rondônia)
        resultado = validador(valor, dados.get("uf")) if campo == "municipio" else validador(valor)
        if resultado.valido:
            padronizados[campo] = resultado.valor
            padronizados.update(resultado.extras)  # ex.: municipio_codigo_ibge
        for falha in resultado.falhas:
            erros.append(
                ErroValidacao(
                    campo=campo,
                    regra=falha.regra,
                    mensagem=falha.mensagem,
                    formato_esperado=falha.formato_esperado,
                )
            )

    for regra in regras_formato:
        bruto = dados.get(regra.campo)
        valor = "" if bruto is None else str(bruto).strip()
        if not valor:
            if regra.obrigatorio:
                erros.append(ErroValidacao(campo=regra.campo, regra="obrigatorio",
                                           mensagem="Campo obrigatório. Preencha antes de enviar.",
                                           formato_esperado=regra.molde))
            continue
        resultado = validar_molde(valor, regra.molde, regra.mensagem)
        if resultado.valido:
            padronizados[regra.campo] = resultado.valor
        for falha in resultado.falhas:
            erros.append(ErroValidacao(campo=regra.campo, regra=falha.regra, mensagem=falha.mensagem,
                                       formato_esperado=falha.formato_esperado))

    if erros:
        return RespostaValidacao(valido=False, erros=erros, dados_padronizados=None)
    return RespostaValidacao(valido=True, erros=[], dados_padronizados=padronizados)
