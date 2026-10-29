/* ==========================================================================
   Valida SETIC — Frontend (Vanilla JS)
   Consome a API RESTful: GET /regras, PUT /regras/{campo}, POST /validar
   ========================================================================== */

const API_BASE_URL = 'http://127.0.0.1:8000';
const SISTEMA_ORIGEM = 'sistema_a';
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
};

/* --------------------------------------------------------------------------
   Utilitário HTTP
   -------------------------------------------------------------------------- */

/**
 * Faz uma requisição à API centralizando a URL base, cabeçalhos e tratamento de erro.
 * @param {string} endpoint  Caminho da rota (ex.: '/regras')
 * @param {string} [method='GET']
 * @param {object|null} [body=null]  Objeto que será enviado como JSON
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
async function apiFetch(endpoint, method = 'GET', body = null) {
  const opcoes = {
    method,
    headers: { Accept: 'application/json' },
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
    const erro = new Error('Não foi possível conectar à API Valida SETIC. Verifique se o servidor está rodando em ' + API_BASE_URL + '.');
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

/* --------------------------------------------------------------------------
   Navegação entre telas (abas)
   -------------------------------------------------------------------------- */

function iniciarNavegacao() {
  const abas = document.querySelectorAll('.tab');

  abas.forEach((aba) => {
    aba.addEventListener('click', () => trocarTela(aba.dataset.view));
  });

  // Navegação por teclado entre as abas (setas esquerda/direita)
  document.querySelector('.tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const lista = Array.from(abas);
    const atual = lista.indexOf(document.activeElement);
    if (atual === -1) return;
    const proxima = e.key === 'ArrowRight' ? (atual + 1) % lista.length : (atual - 1 + lista.length) % lista.length;
    lista[proxima].focus();
    trocarTela(lista[proxima].dataset.view);
  });
}

function trocarTela(idTela) {
  document.querySelectorAll('.tab').forEach((aba) => {
    const ativa = aba.dataset.view === idTela;
    aba.classList.toggle('active', ativa);
    aba.setAttribute('aria-selected', String(ativa));
  });

  document.querySelectorAll('.view').forEach((tela) => {
    const ativa = tela.id === idTela;
    tela.classList.toggle('active', ativa);
    tela.hidden = !ativa;
  });

  // Sempre recarrega as regras ao entrar numa tela: o que a CAGD mudou aparece no formulário
  if (idTela === 'view-formulario') carregarRegrasFormulario();
  if (idTela === 'view-cagd') carregarPainelRegras();
}

/* ==========================================================================
   TELA 1 — Formulário do Sistema Consumidor
   ========================================================================== */

const formulario = document.querySelector('#form-sistema-a');

/** Busca as regras e aplica asterisco, tooltip e estado ativo/inativo em cada campo. */
async function carregarRegrasFormulario() {
  esconderAlerta('#form-alerta');
  try {
    const { data: regras } = await apiFetch('/regras');
    if (!Array.isArray(regras)) throw new Error('Resposta inesperada da rota /regras.');
    regras.forEach(aplicarRegraNoCampo);
  } catch (erro) {
    mostrarAlerta('#form-alerta', erro.message);
  }
}

function aplicarRegraNoCampo(regra) {
  const container = formulario.querySelector(`.field[data-campo="${regra.campo}"]`);
  if (!container) return;

  const label = container.querySelector('label');
  const input = container.querySelector('input');
  const labelRow = container.querySelector('.label-row');
  const tooltip = container.querySelector('.tooltip');

  // Asterisco: só quando o campo está ativo E obrigatório (inativo prevalece)
  label.querySelector('.req')?.remove();
  input.required = false;
  input.removeAttribute('aria-required');
  if (regra.ativo === true && regra.obrigatorio === true) {
    const asterisco = criarElemento('span', 'req', '*');
    asterisco.setAttribute('aria-hidden', 'true');
    label.appendChild(asterisco);
    input.setAttribute('aria-required', 'true');
  }

  // Campo inativo: desabilitado e sinalizado
  labelRow.querySelector('.badge-inativo')?.remove();
  container.classList.toggle('is-disabled', regra.ativo === false);
  input.disabled = regra.ativo === false;
  if (regra.ativo === false) {
    input.value = '';
    labelRow.appendChild(criarElemento('span', 'badge-inativo', 'Inativo'));
  }

  // Tooltip com ajuda + formato esperado
  tooltip.textContent = '';
  if (regra.ajuda) {
    tooltip.append(criarElemento('strong', '', 'Ajuda'), document.createTextNode(regra.ajuda));
  }
  if (regra.formato_esperado) {
    tooltip.append(criarElemento('strong', '', 'Formato esperado'), document.createTextNode(regra.formato_esperado));
  }
  if (!regra.ajuda && !regra.formato_esperado) {
    tooltip.textContent = 'Sem instruções para este campo.';
  }
}

/** Tooltips no celular: abre/fecha ao tocar no "i". */
function iniciarTooltips() {
  document.addEventListener('click', (e) => {
    const botao = e.target.closest('.info-btn');
    document.querySelectorAll('.info-btn.open').forEach((b) => {
      if (b !== botao) b.classList.remove('open');
    });
    if (botao) botao.classList.toggle('open');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.info-btn.open').forEach((b) => b.classList.remove('open'));
  });
}

function limparErros() {
  formulario.querySelectorAll('input').forEach((input) => {
    input.classList.remove('input-error');
    input.removeAttribute('aria-invalid');
  });
  formulario.querySelectorAll('.error-msg').forEach((span) => {
    span.textContent = '';
    span.classList.remove('visible');
  });
  esconderAlerta('#form-alerta');
}

/** Pinta o campo de vermelho e acumula as mensagens (a API pode devolver vários erros por campo). */
function exibirErroCampo(campo, mensagem) {
  const container = formulario.querySelector(`.field[data-campo="${campo}"]`);
  if (!container) return false;

  const input = container.querySelector('input');
  const span = container.querySelector('.error-msg');

  input.classList.add('input-error');
  input.setAttribute('aria-invalid', 'true');
  span.textContent = span.textContent ? `${span.textContent} ${mensagem}` : mensagem;
  span.classList.add('visible');
  return true;
}

function montarPayload() {
  const dados = {};
  CAMPOS.forEach((campo) => {
    const input = formulario.querySelector(`[name="${campo}"]`);
    dados[campo] = input && !input.disabled ? input.value.trim() : '';
  });
  return { sistema_origem: SISTEMA_ORIGEM, dados };
}

function definirCarregando(carregando) {
  const botao = document.querySelector('#btn-enviar');
  botao.disabled = carregando;
  botao.querySelector('.spinner').classList.toggle('hidden', !carregando);
  botao.querySelector('.btn-text').textContent = carregando ? 'Validando...' : 'Salvar / Enviar';
}

async function enviarFormulario(e) {
  e.preventDefault();
  limparErros();
  definirCarregando(true);

  try {
    const { data: resultado } = await apiFetch('/validar', 'POST', montarPayload());

    if (resultado.valido === false) {
      const erros = Array.isArray(resultado.erros) ? resultado.erros : [];
      const semCampo = [];

      erros.forEach((erro) => {
        if (!exibirErroCampo(erro.campo, erro.mensagem)) semCampo.push(erro.mensagem);
      });

      if (semCampo.length) mostrarAlerta('#form-alerta', semCampo.join(' '));

      // Leva o foco ao primeiro campo com erro
      formulario.querySelector('input.input-error')?.focus();
      mostrarToast(`Envio bloqueado: ${erros.length} ${erros.length === 1 ? 'erro encontrado' : 'erros encontrados'}.`, 'error');
      return;
    }

    if (resultado.valido === true) {
      abrirModalSucesso(resultado.dados_padronizados || {});
      formulario.reset();
      return;
    }

    throw new Error('Resposta inesperada da rota /validar.');
  } catch (erro) {
    mostrarAlerta('#form-alerta', erro.message);
    mostrarToast('Falha ao validar os dados.', 'error');
  } finally {
    definirCarregando(false);
  }
}

/* Remove o destaque de erro assim que o usuário corrige o campo */
function iniciarLimpezaAoDigitar() {
  formulario.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      if (!input.classList.contains('input-error')) return;
      input.classList.remove('input-error');
      input.removeAttribute('aria-invalid');
      const span = input.closest('.field').querySelector('.error-msg');
      span.textContent = '';
      span.classList.remove('visible');
    });
  });
}

/* --------------------------------------------------------------------------
   Modal de sucesso
   -------------------------------------------------------------------------- */

const modal = document.querySelector('#modal-sucesso');
let elementoFocadoAntesDoModal = null;

function abrirModalSucesso(dados) {
  const lista = document.querySelector('#modal-dados');
  lista.textContent = '';

  const entradas = Object.entries(dados);
  if (!entradas.length) {
    lista.append(criarElemento('dt', '', '—'), criarElemento('dd', '', 'Nenhum dado preenchido.'));
  } else {
    entradas.forEach(([chave, valor]) => {
      const dt = criarElemento('dt', '', chave);
      dt.title = ROTULOS[chave] || chave;
      lista.append(dt, criarElemento('dd', '', String(valor)));
    });
  }

  elementoFocadoAntesDoModal = document.activeElement;
  modal.classList.remove('hidden');
  document.querySelector('#btn-fechar-modal').focus();
}

function fecharModal() {
  modal.classList.add('hidden');
  elementoFocadoAntesDoModal?.focus();
}

function iniciarModal() {
  document.querySelector('#btn-fechar-modal').addEventListener('click', fecharModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) fecharModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) fecharModal();
  });
}

/* ==========================================================================
   TELA 2 — Painel de Gestão de Regras (CAGD)
   ========================================================================== */

const gradeRegras = document.querySelector('#rules-grid');

function mostrarSkeleton() {
  gradeRegras.textContent = '';
  for (let i = 0; i < CAMPOS.length; i++) gradeRegras.appendChild(criarElemento('div', 'skeleton'));
}

async function carregarPainelRegras() {
  esconderAlerta('#regras-alerta');
  mostrarSkeleton();

  try {
    const { data: regras } = await apiFetch('/regras');
    if (!Array.isArray(regras)) throw new Error('Resposta inesperada da rota /regras.');

    gradeRegras.textContent = '';
    if (!regras.length) {
      gradeRegras.appendChild(criarElemento('div', 'empty-state', 'Nenhuma regra cadastrada na API.'));
      return;
    }
    regras.forEach((regra) => gradeRegras.appendChild(criarCardRegra(regra)));
  } catch (erro) {
    gradeRegras.textContent = '';
    gradeRegras.appendChild(criarElemento('div', 'empty-state', 'Não foi possível carregar as regras.'));
    mostrarAlerta('#regras-alerta', erro.message);
  }
}

/** Monta um toggle switch acessível. */
function criarSwitch({ id, rotulo, dica, marcado, desabilitado }) {
  const wrapper = criarElemento('label', 'switch');
  wrapper.htmlFor = id;

  const textos = criarElemento('span', 'switch-label', rotulo);
  if (dica) textos.appendChild(criarElemento('span', 'switch-hint', dica));

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.setAttribute('role', 'switch');
  input.checked = marcado;
  input.disabled = desabilitado;
  input.setAttribute('aria-checked', String(marcado));

  wrapper.classList.toggle('is-disabled', desabilitado);
  wrapper.append(textos, input, criarElemento('span', 'switch-track'));
  return { wrapper, input };
}

function criarCardRegra(regra) {
  const card = criarElemento('article', 'rule-card');
  card.dataset.campo = regra.campo;

  // Cabeçalho: nome técnico do campo + formato + status
  const head = criarElemento('div', 'rule-head');
  const titulos = criarElemento('div');
  titulos.append(
    criarElemento('h3', 'rule-name', regra.campo),
    criarElemento('p', 'rule-format', regra.formato_esperado ? `Formato: ${regra.formato_esperado}` : (ROTULOS[regra.campo] || ''))
  );
  const pill = criarElemento('span', 'status-pill');
  head.append(titulos, pill);

  const ajuda = criarElemento('p', 'rule-help', regra.ajuda || 'Sem texto de ajuda.');

  // Toggles
  const toggles = criarElemento('div', 'rule-toggles');
  const obrigatorio = criarSwitch({
    id: `toggle-obrigatorio-${regra.campo}`,
    rotulo: 'Obrigatório',
    dica: 'Campo vazio é bloqueado',
    marcado: regra.obrigatorio === true,
    desabilitado: regra.ativo === false,
  });
  const ativo = criarSwitch({
    id: `toggle-ativo-${regra.campo}`,
    rotulo: 'Ativo',
    dica: 'Desligado: o campo não é validado',
    marcado: regra.ativo === true,
    desabilitado: false,
  });
  toggles.append(obrigatorio.wrapper, ativo.wrapper);

  card.append(head, ajuda, toggles);

  const estado = { obrigatorio: regra.obrigatorio === true, ativo: regra.ativo === true };
  atualizarVisualCard(card, pill, obrigatorio, estado);

  obrigatorio.input.addEventListener('change', () =>
    alternarRegra(regra.campo, 'obrigatorio', obrigatorio, estado, () => atualizarVisualCard(card, pill, obrigatorio, estado))
  );
  ativo.input.addEventListener('change', () =>
    alternarRegra(regra.campo, 'ativo', ativo, estado, () => atualizarVisualCard(card, pill, obrigatorio, estado))
  );

  return card;
}

function atualizarVisualCard(card, pill, switchObrigatorio, estado) {
  card.classList.toggle('is-inactive', !estado.ativo);

  // O interruptor de obrigatório fica desabilitado enquanto o campo estiver inativo
  switchObrigatorio.input.disabled = !estado.ativo;
  switchObrigatorio.wrapper.classList.toggle('is-disabled', !estado.ativo);

  pill.className = 'status-pill';
  if (!estado.ativo) {
    pill.classList.add('inativo');
    pill.textContent = 'Inativo';
  } else if (estado.obrigatorio) {
    pill.classList.add('obrigatorio');
    pill.textContent = 'Obrigatório';
  } else {
    pill.classList.add('opcional');
    pill.textContent = 'Opcional';
  }
}

/**
 * Dispara PUT /regras/{campo} com apenas o atributo alterado.
 * Em caso de falha, o toggle volta ao estado anterior.
 */
async function alternarRegra(campo, atributo, sw, estado, aoAtualizar) {
  const novoValor = sw.input.checked;
  sw.input.disabled = true;
  sw.wrapper.classList.add('is-loading');

  try {
    const resposta = await apiFetch(`/regras/${encodeURIComponent(campo)}`, 'PUT', { [atributo]: novoValor });

    if (resposta.status === 200) {
      const regraAtualizada = resposta.data || {};
      estado.obrigatorio = regraAtualizada.obrigatorio ?? (atributo === 'obrigatorio' ? novoValor : estado.obrigatorio);
      estado.ativo = regraAtualizada.ativo ?? (atributo === 'ativo' ? novoValor : estado.ativo);
      sw.input.setAttribute('aria-checked', String(novoValor));
      mostrarToast('Regra atualizada com sucesso');
    }
  } catch (erro) {
    sw.input.checked = !novoValor;
    sw.input.setAttribute('aria-checked', String(!novoValor));
    mostrarToast(`Não foi possível atualizar "${campo}": ${erro.message}`, 'error');
  } finally {
    sw.wrapper.classList.remove('is-loading');
    sw.input.disabled = false;
    aoAtualizar();
  }
}

/* ==========================================================================
   Inicialização
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  iniciarNavegacao();
  iniciarTooltips();
  iniciarModal();
  iniciarLimpezaAoDigitar();

  formulario.addEventListener('submit', enviarFormulario);
  formulario.addEventListener('reset', () => setTimeout(limparErros, 0));
  document.querySelector('#btn-recarregar-regras').addEventListener('click', carregarPainelRegras);

  carregarRegrasFormulario();
});
