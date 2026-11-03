/* ==========================================================================
   CAGD — Regras de formato para campos novos
   Usa GET/POST/PUT/DELETE /regras-formato e POST /regras-formato/testar.
   Requer comum.js, login-cagd.js e cagd.js (criarSwitch). Dados da API só por textContent.
   ========================================================================== */

const formRegraFormato = document.querySelector('#form-regra-formato');
const corpoRegrasFormato = document.querySelector('#tabela-regras-formato tbody');
let esperaDoTeste = null;

function linhaVazia(texto) {
  const tr = criarElemento('tr', 'vazio');
  const td = criarElemento('td', '', texto);
  td.colSpan = 5;
  tr.appendChild(td);
  return tr;
}

async function carregarRegrasFormato() {
  esconderAlerta('#formato-alerta');
  try {
    const { data: regras } = await apiFetch('/regras-formato');
    corpoRegrasFormato.textContent = '';
    if (!regras.length) {
      corpoRegrasFormato.appendChild(linhaVazia('Nenhuma regra criada ainda. Crie a primeira no formulário acima.'));
      return;
    }
    regras.forEach((regra) => corpoRegrasFormato.appendChild(linhaRegraFormato(regra)));
  } catch (erro) {
    mostrarAlerta('#formato-alerta', erro.message);
  }
}

function linhaRegraFormato(regra) {
  const tr = document.createElement('tr');
  const campo = criarElemento('td');
  campo.append(criarElemento('code', '', regra.campo), criarElemento('span', 'muted small regra-formato-nome', regra.nome));
  const molde = criarElemento('td');
  molde.appendChild(criarElemento('code', '', regra.molde));
  if (regra.mensagem) molde.appendChild(criarElemento('span', 'muted small regra-formato-nome regra-formato-mensagem', regra.mensagem));

  const obrigatorio = criarSwitch({ id: `rf-obrigatorio-${regra.id}`, rotulo: '', marcado: regra.obrigatorio, desabilitado: false });
  const ativo = criarSwitch({ id: `rf-ativo-${regra.id}`, rotulo: '', marcado: regra.ativo, desabilitado: false });
  obrigatorio.input.setAttribute('aria-label', `Obrigatório: ${regra.campo}`);
  ativo.input.setAttribute('aria-label', `Ativo: ${regra.campo}`);
  obrigatorio.input.addEventListener('change', () => mudarRegraFormato(regra, 'obrigatorio', obrigatorio.input));
  ativo.input.addEventListener('change', () => mudarRegraFormato(regra, 'ativo', ativo.input));
  const tdObrigatorio = criarElemento('td');
  tdObrigatorio.appendChild(obrigatorio.wrapper);
  const tdAtivo = criarElemento('td');
  tdAtivo.appendChild(ativo.wrapper);

  const excluir = criarElemento('button', 'btn btn-ghost btn-excluir', 'Excluir');
  excluir.type = 'button';
  excluir.setAttribute('aria-label', `Excluir a regra de ${regra.campo}`);
  excluir.addEventListener('click', () => excluirRegraFormato(regra));
  const tdAcoes = criarElemento('td', 'numero');
  tdAcoes.appendChild(excluir);

  tr.append(campo, molde, tdObrigatorio, tdAtivo, tdAcoes);
  return tr;
}

async function mudarRegraFormato(regra, atributo, input) {
  input.disabled = true;
  try {
    await apiFetch(`/regras-formato/${regra.id}`, 'PUT', { [atributo]: input.checked }, cabecalhosCagd());
    regra[atributo] = input.checked;
    mostrarToast(`Regra de ${regra.campo} atualizada`);
    document.dispatchEvent(new CustomEvent('regra-alterada')); // o histórico se atualiza
  } catch (erro) {
    input.checked = !input.checked;
    if (!tratarLoginRecusado(erro)) mostrarToast(`Não foi possível atualizar: ${erro.message}`, 'error');
  } finally {
    input.disabled = false;
  }
}

async function excluirRegraFormato(regra) {
  if (!window.confirm(`Excluir a regra de "${regra.campo}"? O campo volta a ser ignorado.`)) return;
  try {
    await apiFetch(`/regras-formato/${regra.id}`, 'DELETE', null, cabecalhosCagd());
    mostrarToast(`Regra de ${regra.campo} excluída`);
    document.dispatchEvent(new CustomEvent('regra-alterada'));
    carregarRegrasFormato();
  } catch (erro) {
    if (!tratarLoginRecusado(erro)) mostrarToast(`Não foi possível excluir: ${erro.message}`, 'error');
  }
}

/** Testa o valor digitado contra o molde enquanto a pessoa escreve (sem salvar nada). */
function agendarTeste() {
  clearTimeout(esperaDoTeste);
  esperaDoTeste = setTimeout(testarMolde, 300);
}

async function testarMolde() {
  const saida = document.querySelector('#rf-resultado');
  const molde = document.querySelector('#rf-molde').value;
  const valor = document.querySelector('#rf-teste').value;
  saida.className = 'teste-molde';
  if (!molde || !valor) {
    saida.textContent = '';
    return;
  }
  try {
    const mensagem = document.querySelector('#rf-mensagem').value.trim() || null;
    const { data } = await apiFetch('/regras-formato/testar', 'POST', { molde, valor, mensagem });
    saida.classList.add(data.valido ? 'aprovado' : 'bloqueado');
    saida.textContent = data.valido ? `✓ Aprovado e gravado como ${data.valor_padronizado}` : `✕ Bloqueado: ${data.mensagem}`;
  } catch (erro) {
    saida.classList.add('bloqueado');
    saida.textContent = `Molde inválido: ${erro.message}`;
  }
}

/** Nome técnico do campo (o que os sistemas mandam no JSON): minúsculo, sem acento, espaço vira "_".
 *  Ex.: "Número Processo" → "numero_processo". A API confere de novo. */
function nomeTecnicoDoCampo(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 50);
}

async function criarRegraFormato(e) {
  e.preventDefault();
  esconderAlerta('#formato-alerta');
  const corpo = {
    campo: nomeTecnicoDoCampo(document.querySelector('#rf-campo').value.trim()),
    nome: document.querySelector('#rf-nome').value.trim(),
    molde: document.querySelector('#rf-molde').value,
    mensagem: document.querySelector('#rf-mensagem').value.trim() || null,
    obrigatorio: document.querySelector('#rf-obrigatorio').checked,
  };
  const botao = document.querySelector('#btn-criar-regra-formato');
  botao.disabled = true;
  try {
    await apiFetch('/regras-formato', 'POST', corpo, cabecalhosCagd());
    mostrarToast(`Regra de ${corpo.campo} criada: vale agora para todos os sistemas`);
    formRegraFormato.reset();
    document.querySelector('#rf-resultado').textContent = '';
    document.dispatchEvent(new CustomEvent('regra-alterada'));
    carregarRegrasFormato();
  } catch (erro) {
    if (tratarLoginRecusado(erro)) return;
    const mensagem = /should match pattern/.test(erro.message)
      ? 'O campo precisa começar com letra e ter de 2 a 50 caracteres: letras sem acento, números ou "_" (ex.: matricula).'
      : erro.message;
    mostrarAlerta('#formato-alerta', mensagem);
  } finally {
    botao.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  formRegraFormato.addEventListener('submit', criarRegraFormato);
  // Mostra o nome técnico enquanto a pessoa digita ("Matrícula" vira "matricula")
  const campo = document.querySelector('#rf-campo');
  campo.addEventListener('input', () => {
    const ajustado = nomeTecnicoDoCampo(campo.value);
    if (ajustado !== campo.value) campo.value = ajustado;
  });
  ['#rf-molde', '#rf-teste', '#rf-mensagem'].forEach((id) => document.querySelector(id).addEventListener('input', agendarTeste));
  quandoLiberada(carregarRegrasFormato); // só depois do login (login-cagd.js)
});
