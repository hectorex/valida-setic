/* ==========================================================================
   Como integrar
   Mostra o mesmo exemplo de chamada ao POST /validar em várias linguagens e
   permite executá-lo de verdade. Requer comum.js.
   ========================================================================== */

// Endereço de onde a página foi aberta (o link do Render ou o servidor local do notebook)
const ENDERECO = window.location.origin;

const DADOS_EXEMPLO = {
  erro: { nome: 'Maria da Silva', cpf: '123.456.789-09', email: 'maria@', data_nascimento: '31/02/1990' },
  correto: { nome: 'Maria da Silva', cpf: '123.456.789-09', email: 'maria@exemplo.com', data_nascimento: '28/02/1990' },
};

/** Os exemplos ficam em <script type="text/plain"> no HTML, sem precisar escapar < e >. */
function textoDoExemplo(linguagem) {
  const fonte = document.querySelector(`#exemplo-${linguagem}`);
  return fonte ? fonte.textContent.trim().replaceAll('{{URL}}', ENDERECO) : '';
}

function mostrarLinguagem(linguagem) {
  document.querySelectorAll('.aba-codigo').forEach((aba) => {
    const ativa = aba.dataset.linguagem === linguagem;
    aba.classList.toggle('active', ativa);
    aba.setAttribute('aria-selected', String(ativa));
  });
  document.querySelector('#codigo-exemplo').textContent = textoDoExemplo(linguagem);
}

async function copiarCodigo() {
  const texto = document.querySelector('#codigo-exemplo').textContent;
  try {
    await navigator.clipboard.writeText(texto);
    mostrarToast('Código copiado');
  } catch {
    mostrarToast('Não foi possível copiar. Selecione o texto e copie manualmente.', 'error');
  }
}

const caixaRequisicao = () => document.querySelector('#requisicao-exemplo');

/** Preenche a caixa com um dos exemplos. A pessoa pode editar à vontade antes de enviar. */
function preencherExemplo(tipo) {
  const requisicao = { sistema_origem: 'sistema_exemplo', dados: DADOS_EXEMPLO[tipo] };
  caixaRequisicao().value = JSON.stringify(requisicao, null, 2);
}

/** Envia exatamente o que está na caixa: a resposta depende do que foi digitado, não há resposta pronta. */
async function enviarRequisicao() {
  esconderAlerta('#exemplo-alerta');
  const saida = document.querySelector('#resposta-exemplo');
  let requisicao;
  try {
    requisicao = JSON.parse(caixaRequisicao().value);
  } catch {
    saida.classList.add('hidden');
    mostrarAlerta('#exemplo-alerta', 'O texto não é um JSON válido. Confira aspas, vírgulas e chaves.');
    return;
  }
  try {
    const { data } = await apiFetch('/validar', 'POST', requisicao);
    saida.textContent = `POST ${ENDERECO}/validar → ${data.valido ? 'aprovado' : 'bloqueado'}\n\n${JSON.stringify(data, null, 2)}`;
    saida.classList.remove('hidden');
  } catch (erro) {
    // Ex.: sem sistema_origem a API responde 422, como faria com qualquer sistema
    saida.classList.add('hidden');
    mostrarAlerta('#exemplo-alerta', `A API recusou a requisição: ${erro.message}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.aba-codigo').forEach((aba) => {
    aba.addEventListener('click', () => mostrarLinguagem(aba.dataset.linguagem));
  });
  document.querySelector('#btn-copiar').addEventListener('click', copiarCodigo);
  document.querySelectorAll('[data-exemplo]').forEach((botao) => {
    botao.addEventListener('click', () => preencherExemplo(botao.dataset.exemplo));
  });
  document.querySelector('#btn-enviar-exemplo').addEventListener('click', enviarRequisicao);
  mostrarLinguagem('curl');
  preencherExemplo('erro');
});
