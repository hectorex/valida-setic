/* ==========================================================================
   Senha da CAGD (senha simples, não é login completo)
   Pede a senha, guarda na aba do navegador (sessionStorage) e libera a tela.
   Se o servidor não tem senha configurada (notebook da demo), libera direto.
   Requer comum.js; vem antes de cagd.js e painel.js.
   ========================================================================== */

const CHAVE_SENHA = 'valida-senha-cagd';
const carregadoresCagd = [];
let cagdLiberada = false;

/** Cabeçalho que vai em toda chamada da CAGD. */
function cabecalhosCagd() {
  const senha = sessionStorage.getItem(CHAVE_SENHA);
  return senha ? { 'X-Senha-CAGD': senha } : {};
}

/** As telas registram aqui o que carregar quando a senha for aceita (e de novo, se pedir a senha outra vez). */
function quandoLiberada(carregar) {
  carregadoresCagd.push(carregar);
  if (cagdLiberada) carregar();
}

function liberarCagd() {
  cagdLiberada = true;
  document.body.classList.remove('cagd-verificando', 'cagd-bloqueada');
  document.querySelector('#btn-sair-cagd').classList.toggle('hidden', !sessionStorage.getItem(CHAVE_SENHA));
  carregadoresCagd.forEach((carregar) => carregar());
}

function pedirSenha(mensagem = '') {
  cagdLiberada = false;
  sessionStorage.removeItem(CHAVE_SENHA);
  document.body.classList.remove('cagd-verificando');
  document.body.classList.add('cagd-bloqueada');
  if (mensagem) mostrarAlerta('#login-alerta', mensagem);
  else esconderAlerta('#login-alerta');
  const campo = document.querySelector('#senha-cagd');
  campo.value = '';
  campo.focus();
}

/** Chamado pelas telas quando a API responde 401 (ex.: o servidor reiniciou com outra senha). */
function tratarSenhaRecusada(erro) {
  if (erro.status !== 401) return false;
  pedirSenha('A senha não vale mais. Digite de novo.');
  return true;
}

async function verificarAcesso(mensagemSeRecusar = '') {
  try {
    await apiFetch('/painel/erros', 'GET', null, cabecalhosCagd());
    liberarCagd();
  } catch (erro) {
    if (erro.status === 401) pedirSenha(mensagemSeRecusar);
    else liberarCagd(); // outro erro (ex.: API fora do ar): as telas mostram o aviso delas
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#form-login-cagd').addEventListener('submit', (e) => {
    e.preventDefault();
    sessionStorage.setItem(CHAVE_SENHA, document.querySelector('#senha-cagd').value);
    verificarAcesso('Senha incorreta.');
  });
  document.querySelector('#btn-sair-cagd').addEventListener('click', () => pedirSenha());
  verificarAcesso();
});
