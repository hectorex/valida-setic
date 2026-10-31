/* ==========================================================================
   CAGD — Gestão de Regras
   Usa GET /regras e PUT /regras/{campo}. Requer comum.js.
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
    const resposta = await apiFetch(`/regras/${encodeURIComponent(campo)}`, 'PUT', { [atributo]: novoValor }, cabecalhosCagd());

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
    if (!tratarSenhaRecusada(erro)) mostrarToast(`Não foi possível atualizar "${campo}": ${erro.message}`, 'error');
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
  document.querySelector('#btn-recarregar-regras').addEventListener('click', carregarPainelRegras);
  quandoLiberada(carregarPainelRegras); // só depois da senha (senha-cagd.js)
});
