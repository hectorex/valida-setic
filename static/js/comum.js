/* ==========================================================================
   Valida SETIC — código comum às páginas (Sistema A, Sistema B e CAGD)
   Chamadas à API, toasts e alertas
   ========================================================================== */

// Vazio = mesmo endereço da página (a API serve o frontend). Funciona em qualquer porta, IP ou celular.
const API_BASE_URL = '';
const CAMPOS = ['nome', 'cpf', 'email', 'data_nascimento', 'telefone', 'municipio'];

// Nomes amigáveis para exibição (tooltip, modal e painel)
const ROTULOS = {
  nome: 'Nome completo',
  cpf: 'CPF',
  email: 'E-mail',
  data_nascimento: 'Data de nascimento',
  telefone: 'Telefone',
  municipio: 'Município',
  municipio_codigo_ibge: 'Código IBGE do município',
  municipio_uf: 'UF do município',
};

/* --------------------------------------------------------------------------
   Utilitário HTTP
   -------------------------------------------------------------------------- */

/**
 * Faz uma requisição à API centralizando a URL base, cabeçalhos e tratamento de erro.
 * @param {string} endpoint  Caminho da rota (ex.: '/regras')
 * @param {string} [method='GET']
 * @param {object|null} [body=null]  Objeto que será enviado como JSON
 * @param {object} [cabecalhos={}]  Cabeçalhos extras (ex.: senha da CAGD)
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
async function apiFetch(endpoint, method = 'GET', body = null, cabecalhos = {}) {
  const opcoes = {
    method,
    headers: { Accept: 'application/json', ...cabecalhos },
  };

  if (body !== null) {
    opcoes.headers['Content-Type'] = 'application/json';
    opcoes.body = JSON.stringify(body);
  }

  let resposta;
  try {
    resposta = await fetch(`${API_BASE_URL}${endpoint}`, opcoes);
  } catch (erroRede) {
    // Falha de rede, API fora do ar ou bloqueio de CORS
    const erro = new Error('Não foi possível conectar à API Valida SETIC. Verifique se o servidor está rodando.');
    erro.status = 0;
    throw erro;
  }

  let dados = null;
  const tipo = resposta.headers.get('content-type') || '';
  if (tipo.includes('application/json')) {
    dados = await resposta.json();
  } else {
    const texto = await resposta.text();
    dados = texto || null;
  }

  if (!resposta.ok) {
    const erro = new Error(extrairMensagemErro(dados, resposta.status));
    erro.status = resposta.status;
    erro.data = dados;
    // 429 (muitas tentativas): quantos segundos esperar, do cabeçalho Retry-After
    erro.esperarSegundos = Number(resposta.headers.get('Retry-After')) || null;
    throw erro;
  }

  return { ok: resposta.ok, status: resposta.status, data: dados };
}

/** Converte o corpo de erro do FastAPI ({detail: ...}) em texto legível. */
function extrairMensagemErro(dados, status) {
  if (dados && typeof dados === 'object' && 'detail' in dados) {
    if (typeof dados.detail === 'string') return dados.detail;
    if (Array.isArray(dados.detail)) {
      return dados.detail.map((d) => d.msg || JSON.stringify(d)).join(' ');
    }
  }
  if (typeof dados === 'string' && dados.trim()) return dados;
  return `Erro inesperado da API (HTTP ${status}).`;
}

/* --------------------------------------------------------------------------
   Helpers de interface
   -------------------------------------------------------------------------- */

/** Cria um elemento com classe e texto (textContent evita injeção de HTML). */
function criarElemento(tag, classe = '', texto = '') {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto) el.textContent = texto;
  return el;
}

const ICONE_SUCESSO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ICONE_ERRO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';

/**
 * Exibe uma notificação temporária no canto da tela.
 * @param {string} mensagem
 * @param {'success'|'error'} [tipo='success']
 */
function mostrarToast(mensagem, tipo = 'success') {
  const container = document.querySelector('#toast-container');
  const toast = criarElemento('div', 'toast');
  if (tipo === 'error') toast.classList.add('toast-error');
  toast.setAttribute('role', tipo === 'error' ? 'alert' : 'status');

  const icone = criarElemento('span', 'toast-icon');
  icone.innerHTML = tipo === 'error' ? ICONE_ERRO : ICONE_SUCESSO;
  const texto = criarElemento('span', '', mensagem);

  toast.append(icone, texto);
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('leaving');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    // Garantia caso a transição não dispare (ex.: prefers-reduced-motion)
    setTimeout(() => toast.remove(), 600);
  }, 3500);
}

function mostrarAlerta(seletor, mensagem) {
  const alerta = document.querySelector(seletor);
  alerta.textContent = mensagem;
  alerta.classList.remove('hidden');
}

function esconderAlerta(seletor) {
  const alerta = document.querySelector(seletor);
  alerta.textContent = '';
  alerta.classList.add('hidden');
}
