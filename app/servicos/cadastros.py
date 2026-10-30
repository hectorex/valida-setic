from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Cadastro
from app.schemas import CadastroSaida, RespostaCadastro
from app.servicos.registro import validar_e_registrar

SISTEMA_ORIGEM = "sistema_a"


def cadastrar(sessao: Session, dados: dict) -> RespostaCadastro:
    """Backend do Sistema A: valida na API central e só grava se aprovado, gravando o dado padronizado."""
    resposta = validar_e_registrar(sessao, SISTEMA_ORIGEM, dados)
    if not resposta.valido:
        return RespostaCadastro(gravado=False, erros=resposta.erros, cadastro=None)

    cadastro = Cadastro(**resposta.dados_padronizados)
    sessao.add(cadastro)
    sessao.commit()
    return RespostaCadastro(gravado=True, erros=[], cadastro=CadastroSaida.model_validate(cadastro))


def listar_cadastros(sessao: Session) -> list[Cadastro]:
    """Mais recentes primeiro."""
    return list(sessao.scalars(select(Cadastro).order_by(Cadastro.id.desc())))
