/* ==========================================================================
   CAGD — Histórico de mudanças das regras (auditoria)
   Usa GET /regras/historico. Requer comum.js e login-cagd.js.
   ========================================================================== */

const NOMES_ATRIBUTOS = {
  obrigatorio: 'Obrigatório',
  ativo: 'Ativo',
  formato_esperado: 'Formato esperado',
  ajuda: 'Texto de ajuda',
  molde: 'Molde',
  nome: 'Nome',
  mensagem: 'Mensagem',
};

/** "true"/"false" dos interruptores vira sim/não; textos aparecem entre aspas. */
function valorLegivel(valor) {
  if (valor === 'true') return 'sim';
  if (valor === 'false') return 'não';
  if (valor === null || valor === '') return '(vazio)';
  return `"${valor}"`;
}

/** Regras de formato criadas ou excluídas aparecem como uma frase; o resto como "antes → depois". */
function descreverMudanca(mudanca, atributo) {
  if (mudanca.atributo === 'regra_criada') return `Regra de formato criada: ${mudanca.valor_novo}`;
  if (mudanca.atributo === 'regra_excluida') return `Regra de formato excluída: ${mudanca.valor_anterior}`;
  return `${atributo}: ${valorLegivel(mudanca.valor_anterior)} → ${valorLegivel(mudanca.valor_novo)}`;
}

function linhaHistorico(mudanca) {
  const tr = document.createElement('tr');
  const quando = new Date(mudanca.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const atributo = NOMES_ATRIBUTOS[mudanca.atributo] || mudanca.atributo;
  tr.append(
    criarElemento('td', 'codigo', quando),
    // Sem login configurado no servidor (CAGD aberta) não há quem registrar
    criarElemento('td', '', mudanca.usuario || '(sem login)'),
    criarElemento('td', '', ROTULOS[mudanca.campo] || mudanca.campo),
    criarElemento('td', '', descreverMudanca(mudanca, atributo))
  );
  return tr;
}

async function carregarHistorico() {
  esconderAlerta('#historico-alerta');
  const corpo = document.querySelector('#tabela-historico tbody');
  try {
    const { data: mudancas } = await apiFetch('/regras/historico', 'GET', null, cabecalhosCagd());
    corpo.textContent = '';
    if (!mudancas.length) {
      const tr = criarElemento('tr', 'vazio');
      const td = criarElemento('td', '', 'Nenhuma mudança ainda. Quando a CAGD ligar ou desligar uma regra, ela aparece aqui.');
      td.colSpan = 4;
      tr.appendChild(td);
      corpo.appendChild(tr);
      return;
    }
    mudancas.forEach((mudanca) => corpo.appendChild(linhaHistorico(mudanca)));
  } catch (erro) {
    if (!tratarLoginRecusado(erro)) mostrarAlerta('#historico-alerta', erro.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // cagd.js avisa quando uma regra muda: o histórico já mostra a mudança
  document.addEventListener('regra-alterada', carregarHistorico);
  quandoLiberada(carregarHistorico);
});
