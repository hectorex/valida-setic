export interface SlideInfo {
  id: number;
  slug: string;
  title: string;
  shortDesc: string;
  waveTransform: {
    x: number;
    y: number;
    scale: number;
    opacity: number;
    draw?: boolean;
  };
  tintOpacity: number;
  speakerNotes: {
    presenter: string;
    goal: string;
    keyPoints: string[];
    caution: string;
  };
}

export interface ValidationPacket {
  id: string;
  from: 'A' | 'B';
  content: string;
  field: string;
  isValid: boolean;
  message: string;
  standardized?: string;
}

export const SLIDES_DATA: SlideInfo[] = [
  {
    id: 1,
    slug: 'identidade',
    title: '<setic_valida>',
    shortDesc: 'Identidade do Produto',
    waveTransform: { x: -380, y: -80, scale: 1.05, opacity: 0.9, draw: true },
    tintOpacity: 0,
    speakerNotes: {
      presenter: 'Celso (pitch: slides 1 a 7)',
      goal: 'Apresentar o produto com impacto visual imediato e marcar a identidade da equipe.',
      keyPoints: [
        'Cumprimentar avaliadores e banca da SETIC.',
        'Apresentar o time Quem Mais Corp (Celso, Judson, Luiz - 1º semestre).',
        'Desafio 01: Qualidade de Dados.'
      ],
      caution: 'Não se estender em explicações longas; deixar o impacto visual agir.'
    }
  },
  {
    id: 2,
    slug: 'conceito',
    title: 'O que é o Valida SETIC?',
    shortDesc: 'Apresentação do Conceito',
    waveTransform: { x: 780, y: -100, scale: 1.0, opacity: 0.65 },
    tintOpacity: 0,
    speakerNotes: {
      presenter: 'Celso',
      goal: 'Definir o Valida SETIC em uma única frase clara.',
      keyPoints: [
        'Uma camada central de validação e padronização antes que os dados cheguem aos sistemas e bancos.',
        'Centraliza regras de negócio reutilizáveis por qualquer sistema (sistemas legados ou novos).',
        'Evita que cada time tenha que reinventar a roda de validação.'
      ],
      caution: 'Destacar que a validação ocorre antes da persistência, e não depois.'
    }
  },
  {
    id: 3,
    slug: 'problema',
    title: 'O Problema Atual',
    shortDesc: 'Fluxo sem Padronização',
    waveTransform: { x: 680, y: -60, scale: 1.1, opacity: 0.16 },
    tintOpacity: 0,
    speakerNotes: {
      presenter: 'Celso',
      goal: 'Mostrar visualmente o caos de receber dados em formatos divergentes e sem validação central.',
      keyPoints: [
        'Sistema A e Sistema B enviam CPF, datas e e-mails com formatos diferentes.',
        'Alguns dados chegam com erros graves (ex: 31/02/1980, email incompleto).',
        'O sistema central recebe tudo sem uma barreira de padronização.'
      ],
      caution: 'Lembrar: diagrama conceitual do desafio. Não afirmar que todos os sistemas da SETIC aceitam lixo.'
    }
  },
  {
    id: 4,
    slug: 'consequencias',
    title: 'As Consequências',
    shortDesc: 'Fricção e Retrabalho',
    waveTransform: { x: 680, y: -60, scale: 1.1, opacity: 0.12 },
    tintOpacity: 0.35,
    speakerNotes: {
      presenter: 'Celso',
      goal: 'Fazer o público sentir a dor do dado sujo depois que ele entra no banco.',
      keyPoints: [
        'O problema real não é só receber: é o retrabalho operacional para consertar depois.',
        'Engrenagens travam, dados inconsistentes geram chamados, correções manuais e atrito.',
        'Integrações entre órgãos ficam emperradas.'
      ],
      caution: 'Não inventar valores em dinheiro ou porcentagens fictícias de perda.'
    }
  },
  {
    id: 5,
    slug: 'oportunidade',
    title: 'Oportunidade de Eficiência',
    shortDesc: 'Validar Antes de Gravar',
    waveTransform: { x: 740, y: -80, scale: 1.1, opacity: 0.16 },
    tintOpacity: 0,
    speakerNotes: {
      presenter: 'Celso',
      goal: 'Comparar o esforço de corrigir depois versus bloquear na porta de entrada.',
      keyPoints: [
        'Tabela direta: Sem camada central vs Com validação prévia.',
        'Dado inválido é bloqueado imediatamente, com mensagem descritiva do erro.',
        'Retrabalho de correção dos erros detectados na gravação cai para zero*.'
      ],
      caution: 'Ressaltar o asterisco: vale para erros detectados antes de salvar; não é milagre em toda a organização.'
    }
  },
  {
    id: 6,
    slug: 'solucao',
    title: 'Apresentando a Solução',
    shortDesc: 'A Nossa API',
    waveTransform: { x: 740, y: -100, scale: 1.2, opacity: 0.22 },
    tintOpacity: 0,
    speakerNotes: {
      presenter: 'Celso',
      goal: 'Apresentar a solução falando com a CAGD: uma regra, todos os sistemas.',
      keyPoints: [
        '"Uma regra. Todos os sistemas." A CAGD muda num lugar só, e vale para todos na hora, sem uma linha de código.',
        'Cada sistema faz uma chamada antes de gravar; ninguém reescreve validação de CPF, e-mail e datas em cada tela.',
        'A API responde: aprovado com dados padronizados OU bloqueado com campo, regra e formato esperado.'
      ],
      caution: 'Deixar a animação da piscadela do emoji brilhar com o timing certo.'
    }
  },
  {
    id: 7,
    slug: 'diferencial',
    title: 'Muito além de checar o formato',
    shortDesc: 'Diferencial e Impacto',
    waveTransform: { x: 680, y: -60, scale: 1.1, opacity: 0.15 },
    tintOpacity: 0,
    speakerNotes: {
      presenter: 'Celso (fecha o pitch e passa para a demo)',
      goal: 'Fechar o pitch com o diferencial, os números e o impacto (regulamento, item 8.1).',
      keyPoints: [
        '"Checar o formato é só o começo. A SETIC precisa saber se o dado existe, se está no padrão e quem mudou a regra."',
        'Destaque: 0 linhas quando a regra muda. ~1 ms por verificação, ~240 por segundo em PostgreSQL, 340 testes.',
        'Impacto: "quantas pessoas têm mais de 60 anos?" vira uma consulta simples.',
        '"Agora, ao vivo": passar para o Felipe e o Judson abrirem o sistema de verdade.'
      ],
      caution: 'Não citar outras equipes nem ferramentas. A demonstração é no sistema real, não em slide (item 8.5).'
    }
  },
  {
    id: 8,
    slug: 'futuro',
    title: 'O Futuro do Projeto',
    shortDesc: 'Visão Arquitetural',
    waveTransform: { x: 300, y: -100, scale: 1.4, opacity: 0.28 },
    tintOpacity: 0,
    speakerNotes: {
      presenter: 'Felipe e Judson (depois da demo ao vivo)',
      goal: 'Mostrar ambição técnica e alinhamento com o PDTIC 2024-2027 e IN 05/2026 de Rondônia.',
      keyPoints: [
        'Entregamos um protótipo funcional no pouco tempo do hackathon.',
        'Painel da CAGD, Onde agir, histórico de regras, chave por sistema e PostgreSQL já funcionam hoje: estão na demo.',
        'Visão futura: cadastro de sistemas pela CAGD, municípios do Brasil inteiro, regras por sistema, novos tipos de dado e barreira pré-Data Lake.',
        'Métricas em tempo real por órgão e sistema.'
      ],
      caution: 'Fechamento curto (slides 8 e 9 em ~45 s): os 8 minutos contam tudo. Diferenciar o protótipo de hoje do futuro.'
    }
  },
  {
    id: 9,
    slug: 'encerramento',
    title: 'Nossa Solução, Seu Problema',
    shortDesc: 'Encerramento e Agradecimento',
    waveTransform: { x: 340, y: -60, scale: 1.1, opacity: 0.9, draw: true },
    tintOpacity: 0,
    speakerNotes: {
      presenter: 'Felipe e Judson',
      goal: 'Fechamento memorável com a frase final obrigatória.',
      keyPoints: [
        '"Nossa solução, seu problema, juntos modernizando o nosso estado."',
        'Agradecer aos mentores, organizadores e jurados do Hackathon SETIC.',
        'Abrir para perguntas da banca.'
      ],
      caution: 'Manter a tela limpa e marcante no Obrigado final.'
    }
  }
];
