from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import obter_sessao
from app.seguranca import RESPOSTA_401, exigir_senha_cagd
from app.schemas import CampoPainel, FalhaPainel, Recomendacao, RespostaPainel, SistemaPainel
from app.servicos.painel import resumo_erros

router = APIRouter(prefix="/painel", tags=["painel"])

# Exemplo do Swagger: o painel depois destas 3 validações (tests/test_painel.py confere):
#   sistema_a bloqueado (e-mail "maria" e data "31/02/1990"), sistema_a aprovado,
#   sistema_b bloqueado (sem CPF e e-mail "maria@")
EXEMPLO_PAINEL = RespostaPainel(
    total_validacoes=3,
    total_bloqueadas=2,
    taxa_bloqueio=66.7,
    por_sistema=[
        SistemaPainel(sistema_origem="sistema_a", validacoes=2, bloqueadas=1, taxa_bloqueio=50.0),
        SistemaPainel(sistema_origem="sistema_b", validacoes=1, bloqueadas=1, taxa_bloqueio=100.0),
    ],
    por_campo=[
        CampoPainel(campo="email", falhas=3),
        CampoPainel(campo="cpf", falhas=1),
        CampoPainel(campo="data_nascimento", falhas=1),
    ],
    falhas=[
        FalhaPainel(sistema_origem="sistema_a", campo="data_nascimento", regra="data_existente", quantidade=1),
        FalhaPainel(sistema_origem="sistema_a", campo="email", regra="dominio_valido", quantidade=1),
        FalhaPainel(sistema_origem="sistema_a", campo="email", regra="possui_arroba", quantidade=1),
        FalhaPainel(sistema_origem="sistema_b", campo="cpf", regra="obrigatorio", quantidade=1),
        FalhaPainel(sistema_origem="sistema_b", campo="email", regra="dominio_valido", quantidade=1),
    ],
    tempo_medio_ms=1.84,  # varia a cada execução: é medido de verdade
    medicoes_tempo=3,
    # Com só 3 validações nenhuma falha chega a 3 ocorrências; o exemplo mostra uma recomendação típica
    onde_agir=[
        Recomendacao(
            sistema_origem="sistema_a",
            campo="data_nascimento",
            regra="formato",
            quantidade=16,
            percentual=21.3,
            diagnostico="Sistema A: 21,3% das falhas são de data de nascimento fora do formato (16 de 75).",
            sugestao="Sugestão: use máscara DD/MM/AAAA no campo de data, para o usuário digitar só os números.",
        )
    ],
).model_dump()


@router.get(
    "/erros",
    response_model=RespostaPainel,
    dependencies=[Depends(exigir_senha_cagd)],
    responses={200: {"content": {"application/json": {"example": EXEMPLO_PAINEL}}}, **RESPOSTA_401},
)
def painel_erros(sessao: Session = Depends(obter_sessao)):
    """Onde os sistemas mais erram: totais, taxa de bloqueio por sistema e falhas por sistema, campo e regra.

    Só contagens: o painel não tem acesso a nenhum valor digitado.
    Protegido pela senha da CAGD (cabeçalho `X-Senha-CAGD`) quando o servidor tem `VALIDA_SENHA_CAGD`.
    """
    return resumo_erros(sessao)
