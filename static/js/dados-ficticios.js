/* ==========================================================================
   Dados fictícios para testar (Sistema A e Sistema B)
   Painel recolhível com valores prontos para copiar ou preencher, para ninguém
   precisar digitar dados reais no link público (LGPD). Mostra só os campos que
   o formulário da página tem. Requer comum.js e formulario.js.
   ========================================================================== */

// Aprovam. O CPF tem dígitos verificadores corretos, mas é o exemplo clássico de documentação, sem dono
const DADOS_VALIDOS = {
  nome: 'Maria da Silva',
  cpf: '123.456.789-09',
  data_nascimento: '15/03/1985',
  email: 'maria@exemplo.com',
  telefone: '(69) 99999-1234',
  municipio: 'Porto Velho',
};

// Bloqueiam: [campo, valor, motivo]. O primeiro de cada campo é o usado em "Preencher com erros".
// semMascara: só aparece em campo sem máscara (no Sistema A a máscara transformaria o valor)
const DADOS_COM_ERRO = [
  { campo: 'nome', valor: 'Maria', motivo: 'só uma palavra' },
  { campo: 'cpf', valor: '111.111.111-11', motivo: 'dígitos todos iguais' },
  { campo: 'cpf', valor: '123.456.789-00', motivo: 'dígito verificador errado' },
  { campo: 'data_nascimento', valor: '31/02/1990', motivo: 'data que não existe' },
  { campo: 'data_nascimento', valor: '1985-03-15', motivo: 'outro formato de data', semMascara: true },
  { campo: 'email', valor: 'maria@', motivo: 'sem domínio' },
  { campo: 'telefone', valor: '(23) 89999-0000', motivo: 'DDD inexistente e celular sem o 9' },
  { campo: 'municipio', valor: 'Porto Velo', motivo: 'não existe; sugere "Porto Velho"' },
];

function campoDoFormulario(campo) {
  return formulario.querySelector(`input[name="${campo}"]`);
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    // Sem permissão de área de transferência (ex.: http no celular): copia pelo jeito antigo
    const caixa = document.createElement('textarea');
    caixa.value = texto;
    document.body.appendChild(caixa);
    caixa.select();
    document.execCommand('copy');
    caixa.remove();
  }
  mostrarToast(`Copiado: ${texto}`);
}

/** Preenche os campos como se fossem digitados (as máscaras do Sistema A reformatam normalmente). */
function preencherFormulario(valores) {
  Object.entries(valores).forEach(([campo, valor]) => {
    const input = campoDoFormulario(campo);
    if (!input || input.disabled) return;
    input.value = valor;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function linhaDeDado(campo, valor, motivo) {
  const linha = criarElemento('li', 'dado-ficticio');
  const texto = criarElemento('span', 'dado-ficticio-texto');
  texto.append(
    criarElemento('span', 'dado-ficticio-campo', ROTULOS[campo] || campo),
    criarElemento('code', 'dado-ficticio-valor', valor)
  );
  if (motivo) texto.appendChild(criarElemento('span', 'dado-ficticio-motivo', motivo));
  const botao = criarElemento('button', 'btn btn-ghost btn-copiar', 'Copiar');
  botao.type = 'button';
  botao.setAttribute('aria-label', `Copiar ${valor}`);
  botao.addEventListener('click', () => copiarTexto(valor));
  linha.append(texto, botao);
  return linha;
}

function montarDadosFicticios() {
  const lugar = document.querySelector('#dados-ficticios');
  if (!lugar) return;
  const validos = Object.fromEntries(Object.entries(DADOS_VALIDOS).filter(([campo]) => campoDoFormulario(campo)));
  const comErro = DADOS_COM_ERRO.filter(({ campo, semMascara }) => {
    const input = campoDoFormulario(campo);
    return input && !(semMascara && input.dataset.mascara);
  });
  const primeiroErroDeCadaCampo = {};
  comErro.forEach(({ campo, valor }) => { primeiroErroDeCadaCampo[campo] ??= valor; });

  const painel = criarElemento('details', 'dados-ficticios');
  painel.appendChild(criarElemento('summary', '', 'Dados fictícios para testar (copiar ou preencher)'));

  const botoes = criarElemento('div', 'dados-ficticios-botoes');
  const preencherValidos = criarElemento('button', 'btn btn-ghost', 'Preencher com dados válidos');
  const preencherErros = criarElemento('button', 'btn btn-ghost', 'Preencher com erros');
  preencherValidos.type = preencherErros.type = 'button';
  preencherValidos.addEventListener('click', () => preencherFormulario(validos));
  preencherErros.addEventListener('click', () => preencherFormulario(primeiroErroDeCadaCampo));
  botoes.append(preencherValidos, preencherErros);

  const grade = criarElemento('div', 'dados-ficticios-grade');
  const colunaValidos = criarElemento('div');
  colunaValidos.appendChild(criarElemento('h4', 'dados-ficticios-titulo aprovam', 'Aprovam'));
  const listaValidos = criarElemento('ul', 'dados-ficticios-lista');
  Object.entries(validos).forEach(([campo, valor]) => listaValidos.appendChild(linhaDeDado(campo, valor)));
  colunaValidos.appendChild(listaValidos);

  const colunaErros = criarElemento('div');
  colunaErros.appendChild(criarElemento('h4', 'dados-ficticios-titulo bloqueiam', 'Bloqueiam'));
  const listaErros = criarElemento('ul', 'dados-ficticios-lista');
  comErro.forEach(({ campo, valor, motivo }) => listaErros.appendChild(linhaDeDado(campo, valor, motivo)));
  colunaErros.appendChild(listaErros);

  grade.append(colunaValidos, colunaErros);
  painel.append(botoes, grade);
  lugar.appendChild(painel);
}

document.addEventListener('DOMContentLoaded', montarDadosFicticios);
