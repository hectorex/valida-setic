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

async function executarExemplo(tipo) {
  esconderAlerta('#exemplo-alerta');
  const saida = document.querySelector('#resposta-exemplo');
  try {
    const { data } = await apiFetch('/validar', 'POST', { sistema_origem: 'sistema_exemplo', dados: DADOS_EXEMPLO[tipo] });
    saida.textContent = `POST ${ENDERECO}/validar → ${data.valido ? 'aprovado' : 'bloqueado'}\n\n${JSON.stringify(data, null, 2)}`;
    saida.classList.remove('hidden');
  } catch (erro) {
    saida.classList.add('hidden');
    mostrarAlerta('#exemplo-alerta', erro.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.aba-codigo').forEach((aba) => {
    aba.addEventListener('click', () => mostrarLinguagem(aba.dataset.linguagem));
  });
  document.querySelector('#btn-copiar').addEventListener('click', copiarCodigo);
  document.querySelectorAll('[data-exemplo]').forEach((botao) => {
    botao.addEventListener('click', () => executarExemplo(botao.dataset.exemplo));
  });
  mostrarLinguagem('curl');
});
