import React, { useEffect } from 'react';
import gsap from 'gsap';
import { Sparkles, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

// Fechamento do pitch: o que o Valida SETIC faz além de checar o formato, os números e o impacto.
// Depois deste slide, a equipe abre o sistema de verdade (a demonstração é ao vivo, regulamento item 8.5).

interface Linha {
  pergunta: string;
  soFormato: string;
  validaSetic: string;
  destaque?: boolean;
}

const LINHAS: Linha[] = [
  { pergunta: '31/02/1990 existe?', soFormato: 'Parece uma data', validaSetic: 'Bloqueia: data inexistente' },
  { pergunta: 'O CPF é de verdade?', soFormato: 'Tem 11 dígitos', validaSetic: 'Confere o dígito verificador' },
  { pergunta: 'DDD e município existem?', soFormato: 'Aceita qualquer texto', validaSetic: '67 DDDs e 52 municípios (IBGE)' },
  { pergunta: 'Grava no mesmo padrão?', soFormato: 'Cada sistema de um jeito', validaSetic: 'Padroniza: 1990-02-28' },
  {
    pergunta: 'A regra mudou. E agora?',
    soFormato: 'Mexer em cada sistema',
    validaSetic: '0 linhas: muda para todos',
    destaque: true,
  },
  {
    pergunta: 'A CAGD cria regra nova?',
    soFormato: 'Precisa programar',
    validaSetic: 'Pela tela, sem programar',
    destaque: true,
  },
  { pergunta: 'A CAGD sabe onde agir?', soFormato: 'Não', validaSetic: 'Painel, Onde agir e histórico' },
];

const NUMEROS = [
  { valor: '~1 ms', rotulo: 'por verificação' },
  { valor: '~240/s', rotulo: 'em PostgreSQL, sem falhas' },
  { valor: '0', rotulo: 'linhas quando a regra muda' },
  { valor: '410', rotulo: 'testes automáticos' },
  { valor: '1 chave', rotulo: 'por sistema' },
];

export const Slide07Diferencial: React.FC = () => {
  useEffect(() => {
    gsap.from('.dif-linha', { opacity: 0, x: -40, duration: 0.5, stagger: 0.12, delay: 0.2, ease: 'power3.out' });
    gsap.from('.dif-numero', { opacity: 0, y: 30, duration: 0.5, stagger: 0.1, delay: 1.0, ease: 'back.out(1.8)' });
    gsap.from('.dif-rodape', { opacity: 0, y: 20, duration: 0.6, delay: 1.6, ease: 'power3.out' });
    gsap.to('.dif-ao-vivo-seta', { x: 10, duration: 0.6, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2 });
  }, []);

  return (
    <div className="relative w-full h-full px-20 pt-16 pb-28 font-mono select-none overflow-hidden flex flex-col justify-between">
      {/* Título */}
      <div>
        <div className="flex items-center gap-3 text-lg text-cyan-300 font-bold tracking-widest uppercase mb-3">
          <Sparkles className="w-6 h-6 text-cyan-300" />
          <span>Diferencial</span>
        </div>
        <h2 className="text-5xl lg:text-[54px] font-extrabold text-white tracking-tight leading-tight">
          Muito além de checar o formato.
        </h2>
      </div>

      {/* Tabela: só checar o formato x Valida SETIC */}
      <div className="w-full rounded-2xl border-2 border-indigo-700/60 bg-slate-950/90 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 px-10 py-4 bg-indigo-950/80 border-b-2 border-indigo-700/60 text-lg font-black tracking-wider uppercase">
          <div className="col-span-4 text-slate-300">A pergunta</div>
          <div className="col-span-4 text-red-400 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>Só checar o formato</span>
          </div>
          <div className="col-span-4 text-emerald-400 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
            <span>Valida SETIC</span>
          </div>
        </div>
        <div className="divide-y divide-indigo-900/60">
          {LINHAS.map((linha) => (
            <div
              key={linha.pergunta}
              className={`dif-linha grid grid-cols-12 px-10 py-2.5 items-center ${linha.destaque ? 'bg-indigo-950/50' : ''}`}
            >
              <div className="col-span-4 text-2xl font-bold text-white">{linha.pergunta}</div>
              <div className="col-span-4 text-xl font-bold text-red-300 flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                <span>{linha.soFormato}</span>
              </div>
              <div
                className={`col-span-4 font-black flex items-center gap-3 ${
                  linha.destaque ? 'text-2xl text-emerald-400 drop-shadow-[0_0_18px_#2dff9a]' : 'text-xl text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <span>{linha.validaSetic}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Números */}
      <div className="grid grid-cols-5 gap-5">
        {NUMEROS.map((numero) => (
          <div
            key={numero.rotulo}
            className="dif-numero rounded-2xl border-2 border-cyan-500/50 bg-[#080e3c] px-5 py-4 text-center shadow-[0_0_25px_rgba(56,189,248,0.2)]"
          >
            <div className="text-4xl font-black text-cyan-300">{numero.valor}</div>
            <div className="text-base font-bold text-slate-300 mt-1">{numero.rotulo}</div>
          </div>
        ))}
      </div>

      {/* Impacto e passagem para a demonstração ao vivo */}
      <div className="dif-rodape flex items-center justify-between gap-8 border-t border-indigo-800/60 pt-5">
        <div className="text-xl text-slate-200 leading-relaxed max-w-6xl">
          <strong className="text-yellow-300 font-black">IMPACTO:</strong> "Quantas pessoas têm mais de 60 anos?"{' '}
          Hoje, é preciso limpar os dados à mão. Com a data sempre no mesmo padrão,{' '}
          <strong className="text-white">vira uma consulta simples.</strong>
        </div>
        {/* Clicar abre o sistema de verdade numa aba nova, já no Sistema A (primeiro passo da demo) */}
        <a
          href="https://valida-setic.onrender.com/sistema-a.html"
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir o Valida SETIC (Sistema A) numa aba nova"
          className="flex items-center gap-3 shrink-0 rounded-2xl border-2 border-emerald-400 bg-emerald-950/60 px-7 py-4 text-2xl font-black text-emerald-300 shadow-[0_0_30px_rgba(45,255,154,0.35)] cursor-pointer transition-colors hover:bg-emerald-900/70 hover:border-emerald-300"
        >
          <span>Agora, ao vivo</span>
          <ArrowRight className="dif-ao-vivo-seta w-7 h-7" />
        </a>
      </div>
    </div>
  );
};
