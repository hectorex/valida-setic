/* ==========================================================================
   Login da CAGD
   Cada pessoa entra com o próprio usuário; a chave (token) fica na aba do
   navegador (sessionStorage) e vai em toda chamada da CAGD. O histórico de
   regras registra o nome de quem fez cada mudança.
   Se o servidor não tem usuários configurados (notebook da demo), libera direto.
   Requer comum.js; vem antes de cagd.js, painel.js e historico.js.
   ========================================================================== */

const CHAVE_TOKEN = 'valida-cagd-token';
const CHAVE_NOME = 'valida-cagd-nome';
const carregadoresCagd = [];
let cagdLiberada = false;

/** Cabeçalho que vai em toda chamada da CAGD. */
function cabecalhosCagd() {
  const token = sessionStorage.getItem(CHAVE_TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** As telas registram aqui o que carregar quando o acesso for liberado (e de novo, depois de um novo login). */
function quandoLiberada(carregar) {
  carregadoresCagd.push(carregar);
  if (cagdLiberada) carregar();
}

/** nome: quem está logado; null quando o servidor está sem login (CAGD aberta). */
function liberarCagd(nome) {
  cagdLiberada = true;
  document.body.classList.remove('cagd-verificando', 'cagd-bloqueada');
  const logado = document.querySelector('#usuario-logado');
  logado.textContent = nome ? `Conectado como ${nome}` : '';
  logado.classList.toggle('hidden', !nome);
  document.querySelector('#btn-sair-cagd').classList.toggle('hidden', !nome);
  carregadoresCagd.forEach((carregar) => carregar());
}

function pedirLogin(mensagem = '') {
  cagdLiberada = false;
  sessionStorage.removeItem(CHAVE_TOKEN);
  sessionStorage.removeItem(CHAVE_NOME);
  document.body.classList.remove('cagd-verificando');
  document.body.classList.add('cagd-bloqueada');
  if (mensagem) mostrarAlerta('#login-alerta', mensagem);
  else esconderAlerta('#login-alerta');
  const senha = document.querySelector('#senha-cagd');
  senha.value = '';
  senha.type = 'password'; // ao pedir de novo, a senha volta escondida
  document.querySelector('#btn-mostrar-senha').setAttribute('aria-pressed', 'false');
  document.querySelector('#usuario-cagd').focus();
}

/** Chamado pelas telas quando a API responde 401 (ex.: sessão expirou ou o servidor reiniciou). */
function tratarLoginRecusado(erro) {
  if (erro.status !== 401) return false;
  pedirLogin('Sua sessão expirou. Entre de novo.');
  return true;
}

/** Botão de olho: mostra ou esconde a senha digitada. */
function alternarVisibilidadeSenha() {
  const campo = document.querySelector('#senha-cagd');
  const botao = document.querySelector('#btn-mostrar-senha');
  const mostrar = campo.type === 'password';
  campo.type = mostrar ? 'text' : 'password';
  botao.setAttribute('aria-pressed', String(mostrar));
  botao.setAttribute('aria-label', mostrar ? 'Esconder senha' : 'Mostrar senha');
  campo.focus();
}

/* --------------------------------------------------------------------------
   Bloqueio por força bruta, visível na tela
   O servidor bloqueia o usuário por 5 minutos depois de 5 senhas erradas (429).
   Aqui o botão Entrar fica desativado para aquele usuário, com contagem regressiva:
   com o botão desativado, a tela nem envia a requisição.
   -------------------------------------------------------------------------- */

const bloqueiosNaTela = {}; // usuário → instante (ms) em que o bloqueio acaba
let relogioBloqueio = null;

function usuarioDigitado() {
  return document.querySelector('#usuario-cagd').value.trim().toLowerCase();
}

function atualizarBloqueioNaTela() {
  const usuario = usuarioDigitado();
  const fim = bloqueiosNaTela[usuario];
  const restante = fim ? Math.ceil((fim - Date.now()) / 1000) : 0;
  const botao = document.querySelector('#btn-entrar');
  const aviso = document.querySelector('#aviso-bloqueio');

  if (restante > 0) {
    const minutos = Math.floor(restante / 60);
    const segundos = String(restante % 60).padStart(2, '0');
    botao.disabled = true;
    aviso.textContent = `Usuário "${usuario}" bloqueado por segurança. Tente de novo em ${minutos}:${segundos}.`;
    aviso.classList.remove('hidden', 'liberado');
    return;
  }
  botao.disabled = false;
  if (fim) {
    // O tempo acabou enquanto a tela estava aberta
    delete bloqueiosNaTela[usuario];
    aviso.textContent = 'Bloqueio encerrado: pode tentar de novo.';
    aviso.classList.add('liberado');
    aviso.classList.remove('hidden');
  } else if (!aviso.classList.contains('liberado')) {
    aviso.classList.add('hidden');
  }
  if (!Object.keys(bloqueiosNaTela).length) {
    clearInterval(relogioBloqueio);
    relogioBloqueio = null;
  }
}

function bloquearNaTela(usuario, segundos) {
  bloqueiosNaTela[usuario] = Date.now() + segundos * 1000;
  esconderAlerta('#login-alerta');
  if (!relogioBloqueio) relogioBloqueio = setInterval(atualizarBloqueioNaTela, 1000);
  atualizarBloqueioNaTela();
}

async function verificarAcesso() {
  try {
    const { data } = await apiFetch('/cagd/eu', 'GET', null, cabecalhosCagd());
    liberarCagd(data.protegido ? data.nome : null);
  } catch (erro) {
    if (erro.status === 401) pedirLogin();
    else liberarCagd(null); // outro erro (ex.: API fora do ar): as telas mostram o aviso delas
  }
}

async function entrar(e) {
  e.preventDefault();
  // Usuário bloqueado: nem envia (o servidor recusaria de qualquer jeito)
  if ((bloqueiosNaTela[usuarioDigitado()] || 0) > Date.now()) return;
  const usuario = document.querySelector('#usuario-cagd').value;
  const senha = document.querySelector('#senha-cagd').value;
  try {
    const { data } = await apiFetch('/cagd/login', 'POST', { usuario, senha });
    sessionStorage.setItem(CHAVE_TOKEN, data.token);
    sessionStorage.setItem(CHAVE_NOME, data.nome);
    esconderAlerta('#login-alerta');
    liberarCagd(data.nome);
  } catch (erro) {
    if (erro.status === 429) {
      bloquearNaTela(usuario.trim().toLowerCase(), erro.esperarSegundos || 300);
      return;
    }
    mostrarAlerta('#login-alerta', erro.status === 401 ? 'Usuário ou senha incorretos.' : erro.message);
  }
}

async function sair() {
  try {
    await apiFetch('/cagd/sair', 'POST', null, cabecalhosCagd()); // a chave deixa de valer no servidor
  } catch {
    // mesmo se falhar, a chave é apagada do navegador abaixo
  }
  pedirLogin();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#form-login-cagd').addEventListener('submit', entrar);
  document.querySelector('#btn-sair-cagd').addEventListener('click', sair);
  document.querySelector('#btn-mostrar-senha').addEventListener('click', alternarVisibilidadeSenha);
  // Trocar o usuário no campo: o bloqueio é só daquele usuário, então o botão volta para os outros
  document.querySelector('#usuario-cagd').addEventListener('input', () => {
    document.querySelector('#aviso-bloqueio').classList.remove('liberado');
    atualizarBloqueioNaTela();
  });
  verificarAcesso();
});
