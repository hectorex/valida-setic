/* ==========================================================================
   Formulário de um sistema consumidor (Sistema A; o Sistema B reaproveita este arquivo)
   Usa GET /regras e POST /validar. Requer comum.js.
   ========================================================================== */

const formulario = document.querySelector('form[data-sistema]');
// Cada página diz qual sistema ela é e para onde envia:
//   <form data-sistema="sistema_a" data-rota="/cadastros">  → backend do sistema, que valida e grava
//   <form data-sistema="sistema_b" data-rota="/agendamentos"> → backend do sistema, que só valida
//   sem data-rota                                             → POST /validar direto
const SISTEMA_ORIGEM = formulario.dataset.sistema;
const ROTA_ENVIO = formulario.dataset.rota || '/validar';

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

/* --------------------------------------------------------------------------
   Máscaras: a pontuação aparece enquanto o usuário digita.
   Só nos campos com data-mascara (Sistema A). O Sistema B fica sem, como um
   sistema legado: a API valida do mesmo jeito.
   -------------------------------------------------------------------------- */

const MASCARAS = {
  // 12345678909 → 123.456.789-09 (o separador só aparece quando vem dígito depois)
  cpf(d) {
    d = d.slice(0, 11);
    if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
    return d;
  },
  // 69999990000 → (69) 99999-0000; com 10 dígitos (fixo) → (69) 3216-0000
  telefone(d) {
    d = d.slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  },
  // 31021990 → 31/02/1990 (a máscara só põe as barras; se a data existe quem diz é a API)
  data(d) {
    d = d.slice(0, 8);
    if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
    if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return d;
  },
};

function iniciarMascaras() {
  formulario.querySelectorAll('input[data-mascara]').forEach((input) => {
    const formatar = MASCARAS[input.dataset.mascara];
    if (!formatar) return;
    input.addEventListener('input', () => {
      input.value = formatar(input.value.replace(/\D/g, ''));
    });
  });
}

/* --------------------------------------------------------------------------
   Sugestões de município (lista própria, do tamanho do campo)
   Dados do GET /municipios. Só ajuda: o campo continua livre e quem valida é a API.
   -------------------------------------------------------------------------- */

const MAX_SUGESTOES = 8;

/** Compara sem acento, caixa, apóstrofo e hífen (como a API faz). */
function chaveBusca(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Primeiro os que começam com o texto ("P" → Pimenta Bueno, Porto Velho...); a partir de 3 letras,
 * também os que têm outra palavra começando com ele ("vel" → Porto Velho).
 */
function filtrarMunicipios(municipios, texto) {
  const busca = chaveBusca(texto);
  if (!busca) return [];
  const comecam = municipios.filter((m) => m.chave.startsWith(busca));
  const palavra = busca.length < 3 ? []
    : municipios.filter((m) => !m.chave.startsWith(busca) && m.chave.includes(` ${busca}`));
  return [...comecam, ...palavra].slice(0, MAX_SUGESTOES);
}

async function iniciarSugestoesMunicipio() {
  const input = formulario.querySelector('[name="municipio"]');
  if (!input) return;

  let municipios;
  try {
    const { data } = await apiFetch('/municipios');
    municipios = data.map((m) => ({ nome: m.nome, chave: chaveBusca(m.nome) }));
  } catch {
    return; // sem sugestões o campo continua funcionando normalmente
  }

  // O input ganha um invólucro para a lista abrir logo abaixo dele, com a mesma largura
  const caixa = criarElemento('div', 'autocompletar');
  input.parentNode.insertBefore(caixa, input);
  caixa.appendChild(input);
  const lista = criarElemento('ul', 'sugestoes hidden');
  lista.id = 'sugestoes-municipio';
  lista.setAttribute('role', 'listbox');
  caixa.appendChild(lista);

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', lista.id);
  input.setAttribute('aria-expanded', 'false');

  let opcoes = [];
  let ativa = -1;

  function fechar() {
    lista.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    ativa = -1;
  }

  function marcar(indice) {
    ativa = indice;
    [...lista.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === ativa)));
    if (ativa >= 0) {
      input.setAttribute('aria-activedescendant', lista.children[ativa].id);
      lista.children[ativa].scrollIntoView({ block: 'nearest' });
    }
  }

  function escolher(nome) {
    input.value = nome;
    fechar();
    // Evento sintético (isTrusted = false): limpa o erro do campo sem reabrir a lista
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function mostrar() {
    opcoes = filtrarMunicipios(municipios, input.value);
    lista.textContent = '';
    if (!opcoes.length || (opcoes.length === 1 && opcoes[0].nome === input.value)) {
      fechar();
      return;
    }
    opcoes.forEach((m, i) => {
      const li = criarElemento('li', 'sugestao', m.nome);
      li.id = `sugestao-municipio-${i}`;
      li.setAttribute('role', 'option');
      // mousedown (e não click) para escolher antes de o input perder o foco
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        escolher(m.nome);
      });
      lista.appendChild(li);
    });
    lista.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
    marcar(-1);
  }

  input.addEventListener('input', (e) => {
    if (e.isTrusted) mostrar();
  });
  input.addEventListener('focus', () => {
    if (input.value) mostrar();
  });
  input.addEventListener('blur', fechar);
  input.addEventListener('keydown', (e) => {
    if (lista.classList.contains('hidden')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      marcar((ativa + 1) % opcoes.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      marcar((ativa - 1 + opcoes.length) % opcoes.length);
    } else if (e.key === 'Enter' && ativa >= 0) {
      e.preventDefault(); // escolhe a sugestão em vez de enviar o formulário
      escolher(opcoes[ativa].nome);
    } else if (e.key === 'Escape') {
      fechar();
    }
  });
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
  // Campos próprios do sistema (ex.: protocolo no Sistema B): vão junto e só são validados se a CAGD tiver
  // criado uma regra de formato para eles; sem regra, a API ignora
  formulario.querySelectorAll('.field[data-campo-extra] input').forEach((input) => {
    dados[input.name] = input.value.trim();
  });
  // Os backends dos sistemas (/cadastros, /agendamentos) recebem os campos direto; POST /validar recebe {sistema_origem, dados}
  return ROTA_ENVIO === '/validar' ? { sistema_origem: SISTEMA_ORIGEM, dados } : dados;
}

/** Une as respostas: {valido, dados_padronizados} (/validar, /agendamentos) ou {gravado, cadastro} (/cadastros). */
function lerResultado(resultado) {
  if ('valido' in resultado) {
    return { aprovado: resultado.valido, erros: resultado.erros, dados: resultado.dados_padronizados };
  }
  return { aprovado: resultado.gravado, erros: resultado.erros, dados: resultado.cadastro };
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
    const { data } = await apiFetch(ROTA_ENVIO, 'POST', montarPayload());
    const resultado = lerResultado(data);

    if (resultado.aprovado === false) {
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

    if (resultado.aprovado === true) {
      abrirModalSucesso(resultado.dados || {});
      formulario.reset();
      // Avisa quem estiver ouvindo (ex.: a lista do banco do Sistema A) que algo foi gravado
      document.dispatchEvent(new CustomEvent('envio-aprovado'));
      return;
    }

    throw new Error(`Resposta inesperada da rota ${ROTA_ENVIO}.`);
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
  iniciarMascaras();
  iniciarSugestoesMunicipio();
});
