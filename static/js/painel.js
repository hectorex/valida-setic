/* ==========================================================================
   CAGD — Painel de erros
   Usa GET /painel/erros. Requer comum.js.
   Só contagens: o painel nunca recebe o valor que o cidadão digitou (LGPD).
   ========================================================================== */

const MAX_FALHAS_NA_TABELA = 10;

// Nome legível de cada regra (o id técnico continua no title, ao passar o mouse)
const REGRAS_LEGIVEIS = {
  obrigatorio: 'Campo vazio',
  tamanho_minimo: 'Nome incompleto',
  caracteres_validos: 'Caracteres inválidos',
  formato: 'Fora do formato',
  digitos_repetidos: 'Dígitos todos iguais',
  digitos_verificadores: 'Dígito verificador errado',
  sem_espacos: 'Espaço no e-mail',
  possui_arroba: 'Sem @ ou com mais de um',
  dominio_valido: 'Domínio inválido',
  data_existente: 'Data inexistente',
  nao_futura: 'Data no futuro',
  idade_maxima: 'Mais de 130 anos',
  ddd_valido: 'DDD inexistente',
  celular_com_9: 'Celular sem o 9',
  municipio_ro: 'Município fora de RO',
  municipio_existente: 'Município não existe na UF',
  uf_valida: 'UF inexistente',
};

let falhasDoPainel = []; // guardadas para o filtro por sistema redesenhar a tabela sem chamar a API de novo

function formatarNumero(valor) {
  return Number(valor).toLocaleString('pt-BR');
}

function formatarTaxa(valor) {
  return `${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function nomeSistema(sistema) {
  // "sistema_a" → "Sistema A"; outros nomes aparecem como vieram
  const casa = /^sistema_([a-z])$/i.exec(sistema);
  return casa ? `Sistema ${casa[1].toUpperCase()}` : sistema;
}

/** Uma linha de barra horizontal: rótulo | barra | valor. O texto completo vai no title (hover). */
function linhaBarra(rotulo, fracao, valor, dica) {
  const linha = criarElemento('div', 'barra-linha');
  linha.title = dica;
  const trilho = criarElemento('div', 'barra-trilho');
  const preenchida = criarElemento('div', 'barra-preenchida');
  preenchida.style.width = `${Math.max(0, Math.min(1, fracao)) * 100}%`;
  trilho.appendChild(preenchida);
  linha.append(criarElemento('span', 'barra-rotulo', rotulo), trilho, criarElemento('span', 'barra-valor', valor));
  return linha;
}

function preencherVazio(container, texto) {
  container.textContent = '';
  container.appendChild(criarElemento('p', 'muted small', texto));
}

/** Recomendações geradas pela API a partir das contagens (regras simples, sem IA). */
function desenharOndeAgir(recomendacoes) {
  const lista = document.querySelector('#painel-onde-agir');
  lista.textContent = '';
  if (!recomendacoes.length) {
    lista.appendChild(criarElemento('li', 'onde-agir-vazio', 'Nada urgente: nenhuma falha concentra 15% ou mais dos erros de um sistema.'));
    return;
  }
  recomendacoes.forEach((r) => {
    const item = criarElemento('li', 'onde-agir-item');
    item.append(criarElemento('strong', '', r.diagnostico), criarElemento('p', '', r.sugestao));
    lista.appendChild(item);
  });
}

function desenharPainel(painel) {
  desenharOndeAgir(painel.onde_agir || []);
  document.querySelector('#painel-total').textContent = formatarNumero(painel.total_validacoes);
  document.querySelector('#painel-bloqueadas').textContent = formatarNumero(painel.total_bloqueadas);
  document.querySelector('#painel-taxa').textContent = formatarTaxa(painel.taxa_bloqueio);

  // Tempo médio: só de validações medidas de verdade (o histórico do seed não tem tempo)
  const tempo = document.querySelector('#painel-tempo');
  const rotuloTempo = document.querySelector('#painel-tempo-rotulo');
  if (painel.tempo_medio_ms === null) {
    tempo.textContent = '—';
    rotuloTempo.textContent = 'tempo médio: faça uma validação para medir';
  } else {
    tempo.textContent = `${Number(painel.tempo_medio_ms).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ms`;
    const medicoes = painel.medicoes_tempo;
    rotuloTempo.textContent = `tempo médio de verificação (${formatarNumero(medicoes)} ${medicoes === 1 ? 'medição' : 'medições'})`;
  }

  // Taxa de bloqueio por sistema (a barra é a própria taxa, de 0 a 100%)
  const sistemas = document.querySelector('#painel-sistemas');
  sistemas.textContent = '';
  if (!painel.por_sistema.length) preencherVazio(sistemas, 'Nenhuma validação registrada ainda.');
  painel.por_sistema.forEach((s) => {
    const resumo = `${formatarTaxa(s.taxa_bloqueio)} · ${formatarNumero(s.bloqueadas)} de ${formatarNumero(s.validacoes)}`;
    sistemas.appendChild(
      linhaBarra(nomeSistema(s.sistema_origem), s.taxa_bloqueio / 100, resumo,
        `${nomeSistema(s.sistema_origem)}: ${s.bloqueadas} bloqueadas em ${s.validacoes} validações`)
    );
  });

  // Campos que mais erram (a barra é relativa ao campo com mais falhas)
  const campos = document.querySelector('#painel-campos');
  campos.textContent = '';
  if (!painel.por_campo.length) preencherVazio(campos, 'Nenhuma falha registrada ainda.');
  const maior = Math.max(1, ...painel.por_campo.map((c) => c.falhas));
  painel.por_campo.forEach((c) => {
    const rotulo = ROTULOS[c.campo] || c.campo;
    campos.appendChild(linhaBarra(rotulo, c.falhas / maior, formatarNumero(c.falhas), `${rotulo}: ${c.falhas} falhas`));
  });

  // Tabela: as falhas mais frequentes, de todos os sistemas ou só do escolhido no filtro
  falhasDoPainel = painel.falhas;
  preencherFiltroSistemas(painel.por_sistema);
  desenharFalhas();
}

/** Opções do filtro a partir dos sistemas do painel, mantendo a escolha atual se o sistema ainda existir. */
function preencherFiltroSistemas(sistemas) {
  const filtro = document.querySelector('#filtro-falhas');
  const escolhido = filtro.value;
  filtro.textContent = '';
  filtro.appendChild(new Option('Todos os sistemas', ''));
  sistemas.forEach((s) => filtro.appendChild(new Option(nomeSistema(s.sistema_origem), s.sistema_origem)));
  filtro.value = sistemas.some((s) => s.sistema_origem === escolhido) ? escolhido : '';
}

function desenharFalhas() {
  const escolhido = document.querySelector('#filtro-falhas').value;
  const falhas = escolhido ? falhasDoPainel.filter((f) => f.sistema_origem === escolhido) : falhasDoPainel;
  // Com um sistema escolhido, a coluna Sistema só repetiria o nome dele: some (e sobra espaço no celular)
  document.querySelector('#tabela-falhas').classList.toggle('so-um-sistema', Boolean(escolhido));
  const corpo = document.querySelector('#tabela-falhas tbody');
  corpo.textContent = '';
  if (!falhas.length) {
    const tr = criarElemento('tr', 'vazio');
    const td = criarElemento('td', '', escolhido ? 'Nenhuma falha deste sistema.' : 'Nenhuma falha registrada ainda.');
    td.colSpan = 4;
    tr.appendChild(td);
    corpo.appendChild(tr);
  }
  falhas.slice(0, MAX_FALHAS_NA_TABELA).forEach((f) => {
    const tr = document.createElement('tr');
    const regra = criarElemento('td', '', REGRAS_LEGIVEIS[f.regra] || f.regra);
    regra.title = `regra: ${f.regra}`;
    tr.append(
      criarElemento('td', '', nomeSistema(f.sistema_origem)),
      criarElemento('td', '', ROTULOS[f.campo] || f.campo),
      regra,
      criarElemento('td', 'numero', formatarNumero(f.quantidade))
    );
    corpo.appendChild(tr);
  });
  const total = falhas.reduce((soma, f) => soma + f.quantidade, 0);
  document.querySelector('#falhas-resumo').textContent = falhas.length > MAX_FALHAS_NA_TABELA
    ? `Mostrando as ${MAX_FALHAS_NA_TABELA} mais frequentes de ${falhas.length} tipos de falha (${formatarNumero(total)} falhas).`
    : (falhas.length ? `${falhas.length} ${falhas.length === 1 ? 'tipo' : 'tipos'} de falha (${formatarNumero(total)} falhas).` : '');
}

async function carregarPainel() {
  esconderAlerta('#painel-alerta');
  try {
    const { data } = await apiFetch('/painel/erros', 'GET', null, cabecalhosCagd());
    desenharPainel(data);
  } catch (erro) {
    if (!tratarLoginRecusado(erro)) mostrarAlerta('#painel-alerta', erro.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#btn-recarregar-painel').addEventListener('click', carregarPainel);
  document.querySelector('#filtro-falhas').addEventListener('change', desenharFalhas);
  // Na demo: ao voltar para esta aba depois de usar o Sistema A ou B, o painel já vem atualizado
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && cagdLiberada) carregarPainel();
  });
  quandoLiberada(carregarPainel); // só depois do login (login-cagd.js)
});
