/* ==========================================================================
   Formulário de um sistema consumidor (Sistema A; o Sistema B reaproveita este arquivo)
   Usa GET /regras e POST /validar. Requer comum.js.
   ========================================================================== */

const formulario = document.querySelector('form[data-sistema]');
// Cada página diz qual sistema ela é: <form data-sistema="sistema_a">
const SISTEMA_ORIGEM = formulario.dataset.sistema;

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
   Inicialização
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  iniciarTooltips();
  iniciarModal();
  iniciarLimpezaAoDigitar();

  formulario.addEventListener('submit', enviarFormulario);
  formulario.addEventListener('reset', () => setTimeout(limparErros, 0));

  carregarRegrasFormulario();
});
