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

    # Só as colunas da tabela: um campo novo com regra da CAGD é validado, mas este banco de exemplo não o guarda
    colunas = {coluna.key for coluna in Cadastro.__table__.columns}
    cadastro = Cadastro(**{k: v for k, v in resposta.dados_padronizados.items() if k in colunas})
    sessao.add(cadastro)
    sessao.commit()
    return RespostaCadastro(gravado=True, erros=[], cadastro=CadastroSaida.model_validate(cadastro))


def listar_cadastros(sessao: Session) -> list[Cadastro]:
    """Mais recentes primeiro."""
    return list(sessao.scalars(select(Cadastro).order_by(Cadastro.id.desc())))
