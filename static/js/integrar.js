/* ==========================================================================
   Como integrar
   Mostra o mesmo exemplo de chamada ao POST /validar em várias linguagens.
   O exemplo em JavaScript é editável e roda de verdade no navegador; os das
   outras linguagens são para copiar e rodar no terminal. Requer comum.js.
   ========================================================================== */

// Endereço de onde a página foi aberta (o link do Render ou o servidor local do notebook)
const ENDERECO = window.location.origin;

const DICAS = {
  javascript: 'Este código roda de verdade no seu navegador: troque qualquer valor dentro dele (o e-mail, a data, o CPF...) e clique em Executar.',
  outras: 'Para testar, copie e rode no terminal: o endereço já é o deste servidor. Só o JavaScript roda aqui na página, porque o navegador só executa JavaScript.',
};

let linguagemAtual = 'javascript';

/** Os exemplos ficam em <script type="text/plain"> no HTML, sem precisar escapar < e >. */
function textoDoExemplo(linguagem) {
  const fonte = document.querySelector(`#exemplo-${linguagem}`);
  return fonte ? fonte.textContent.trim().replaceAll('{{URL}}', ENDERECO) : '';
}

const editorJs = () => document.querySelector('#codigo-js');

function mostrarLinguagem(linguagem) {
  linguagemAtual = linguagem;
  const ehJs = linguagem === 'javascript';
  document.querySelectorAll('.aba-codigo').forEach((aba) => {
    const ativa = aba.dataset.linguagem === linguagem;
    aba.classList.toggle('active', ativa);
    aba.setAttribute('aria-selected', String(ativa));
  });

  // JavaScript: editor de texto (as edições ficam guardadas ao trocar de aba). Outras: só leitura.
  document.querySelector('#codigo-leitura').classList.toggle('hidden', ehJs);
  editorJs().classList.toggle('hidden', !ehJs);
  if (!ehJs) document.querySelector('#codigo-exemplo').textContent = textoDoExemplo(linguagem);
  document.querySelector('#btn-executar').classList.toggle('hidden', !ehJs);
  document.querySelector('#btn-restaurar').classList.toggle('hidden', !ehJs);
  document.querySelector('#dica-linguagem').textContent = ehJs ? DICAS.javascript : DICAS.outras;
}

function codigoAtual() {
  return linguagemAtual === 'javascript' ? editorJs().value : document.querySelector('#codigo-exemplo').textContent;
}

async function copiarCodigo() {
  try {
    await navigator.clipboard.writeText(codigoAtual());
    mostrarToast('Código copiado');
  } catch {
    mostrarToast('Não foi possível copiar. Selecione o texto e copie manualmente.', 'error');
  }
}

function restaurarExemplo() {
  editorJs().value = textoDoExemplo('javascript');
  document.querySelector('#saida-codigo').classList.add('hidden');
}

/* --------------------------------------------------------------------------
   Execução de verdade do código JavaScript editado
   Roda só no navegador de quem clicou, como o console do próprio navegador:
   nada do que é digitado aqui é executado no servidor.
   -------------------------------------------------------------------------- */

// Construtor de funções async: permite o "await" solto que o exemplo usa
const FuncaoAssincrona = Object.getPrototypeOf(async function () {}).constructor;

function formatarParte(parte) {
  return typeof parte === 'string' ? parte : JSON.stringify(parte, null, 2);
}

async function executarCodigo() {
  const saida = document.querySelector('#saida-codigo');
  const botao = document.querySelector('#btn-executar');
  const linhas = [];
  // O console.log do código vai para a tela, em vez do console escondido do navegador
  const imprimir = (...partes) => linhas.push(partes.map(formatarParte).join(' '));
  const consoleDaPagina = { log: imprimir, info: imprimir, warn: imprimir, error: imprimir };

  botao.disabled = true;
  try {
    await new FuncaoAssincrona('console', editorJs().value)(consoleDaPagina);
    saida.textContent = `Saída do código:\n\n${linhas.length ? linhas.join('\n') : '(o código rodou sem imprimir nada)'}`;
  } catch (erro) {
    const ate = linhas.length ? `${linhas.join('\n')}\n\n` : '';
    saida.textContent = `Saída do código:\n\n${ate}Erro ao executar: ${erro.message}`;
  } finally {
    botao.disabled = false;
  }
  saida.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.aba-codigo').forEach((aba) => {
    aba.addEventListener('click', () => mostrarLinguagem(aba.dataset.linguagem));
  });
  document.querySelector('#btn-copiar').addEventListener('click', copiarCodigo);
  document.querySelector('#btn-executar').addEventListener('click', executarCodigo);
  document.querySelector('#btn-restaurar').addEventListener('click', restaurarExemplo);
  editorJs().value = textoDoExemplo('javascript');
  mostrarLinguagem('javascript');
});
