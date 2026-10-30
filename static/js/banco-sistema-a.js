/* ==========================================================================
   Banco do Sistema A (simulado)
   Lista o que o Sistema A gravou (GET /cadastros). Requer comum.js.
   Na demo: mostra que o dado inválido não entrou e que o válido entrou padronizado.
   ========================================================================== */

const corpoCadastros = document.querySelector('#tabela-cadastros tbody');

function formatarDataHora(iso) {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function linhaCadastro(cadastro) {
  const tr = document.createElement('tr');
  const celulas = [
    [cadastro.nome, ''],
    [cadastro.cpf, 'codigo'],
    [cadastro.data_nascimento, 'codigo'],
    [cadastro.email, ''],
    [cadastro.telefone, 'codigo'],
    [cadastro.municipio, ''],
    [formatarDataHora(cadastro.criado_em), 'codigo'],
  ];
  // Mostra o valor exatamente como foi gravado (padronizado); vazio vira "—"
  celulas.forEach(([valor, classe]) => tr.appendChild(criarElemento('td', classe, valor || '—')));
  return tr;
}

async function carregarCadastros() {
  esconderAlerta('#cadastros-alerta');
  try {
    const { data: cadastros } = await apiFetch('/cadastros');
    corpoCadastros.textContent = '';
    if (!cadastros.length) {
      const tr = criarElemento('tr', 'vazio');
      const td = criarElemento('td', '', 'Nenhum cadastro gravado. Dado bloqueado pela API não chega aqui.');
      td.colSpan = 7;
      tr.appendChild(td);
      corpoCadastros.appendChild(tr);
      return;
    }
    cadastros.forEach((cadastro) => corpoCadastros.appendChild(linhaCadastro(cadastro)));
  } catch (erro) {
    mostrarAlerta('#cadastros-alerta', erro.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#btn-recarregar-cadastros').addEventListener('click', carregarCadastros);
  document.addEventListener('envio-aprovado', carregarCadastros);
  carregarCadastros();
});
