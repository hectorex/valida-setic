import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { TrendingUp, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

export const Slide05Opportunity: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<SVGSVGElement>(null);
  const zeroRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Smooth gear rotation
    if (gearRef.current) {
      gsap.to(gearRef.current, {
        rotation: 360,
        duration: 7,
        ease: 'none',
        repeat: -1,
      });
    }

    // Rows entrance
    gsap.from('.table-row-item', {
      opacity: 0,
      x: -40,
      duration: 0.6,
      stagger: 0.15,
      delay: 0.3,
      ease: 'power3.out',
    });

    // Zero animation
    if (zeroRef.current) {
      gsap.timeline({ delay: 0.9 })
        .from(zeroRef.current, {
          scale: 0,
          duration: 0.7,
          ease: 'back.out(2.5)',
        })
        .to(zeroRef.current, {
          textShadow: '0 0 40px #2dff9a, 0 0 80px #2dff9a',
          duration: 0.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full p-20 font-mono select-none overflow-hidden flex flex-col justify-between"
    >
      {/* Header section with turning gear */}
      <div className="flex items-start justify-between">
        <div className="max-w-5xl">
          <div className="flex items-center gap-3 text-lg text-emerald-400 font-bold tracking-widest uppercase mb-4">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <span>Oportunidade de Eficiência</span>
          </div>
          <h2 className="text-5xl lg:text-[54px] font-extrabold text-white tracking-tight leading-tight">
            Validar antes de gravar muda o momento e o custo do esforço.
          </h2>
        </div>

        {/* Smooth turning gear */}
        <div className="relative">
          <svg
            ref={gearRef}
            className="w-28 h-28 text-blue-400 drop-shadow-[0_0_25px_rgba(48,80,255,0.5)]"
            viewBox="-100 -100 200 200"
          >
            <circle r="72" fill="none" stroke="currentColor" strokeWidth="26" strokeDasharray="11.9 11.9" />
            <circle r="56" fill="none" stroke="currentColor" strokeWidth="10" />
            <circle r="16" fill="currentColor" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Sparkles className="w-8 h-8 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>
      </div>

      {/* Structured Comparison Table - Clean, Concise, Highly Legible */}
      <div className="w-full my-auto rounded-2xl border-2 border-indigo-700/60 bg-slate-950/90 backdrop-blur-md overflow-hidden shadow-2xl">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-10 py-6 bg-indigo-950/80 border-b-2 border-indigo-700/60 text-lg font-black tracking-wider uppercase">
          <div className="col-span-4 text-slate-300">Critério</div>
          <div className="col-span-4 text-red-400 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>Sem Camada Central</span>
          </div>
          <div className="col-span-4 text-emerald-400 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
            <span>Com Valida SETIC</span>
          </div>
        </div>

        {/* Table Rows - Concise Words, Big Fonts */}
        <div className="divide-y divide-indigo-900/60">
          {/* Row 1: Momento */}
          <div className="table-row-item grid grid-cols-12 px-10 py-6 items-center">
            <div className="col-span-4 text-2xl font-bold text-white">
              Momento
            </div>
            <div className="col-span-4 text-2xl font-bold text-red-300 flex items-center gap-3">
              <XCircle className="w-7 h-7 text-red-500 shrink-0" />
              <span>Tardio (no banco)</span>
            </div>
            <div className="col-span-4 text-2xl font-black text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
              <span>Antecipado (na entrada)</span>
            </div>
          </div>

          {/* Row 2: Dado Inválido */}
          <div className="table-row-item grid grid-cols-12 px-10 py-6 items-center">
            <div className="col-span-4 text-2xl font-bold text-white">
              Dado Inválido
            </div>
            <div className="col-span-4 text-2xl font-bold text-red-300 flex items-center gap-3">
              <XCircle className="w-7 h-7 text-red-500 shrink-0" />
              <span>Gravado e persistido</span>
            </div>
            <div className="col-span-4 text-2xl font-black text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
              <span>Bloqueado na porta</span>
            </div>
          </div>

          {/* Row 3: Resposta ao Sistema */}
          <div className="table-row-item grid grid-cols-12 px-10 py-6 items-center">
            <div className="col-span-4 text-2xl font-bold text-white">
              Retorno
            </div>
            <div className="col-span-4 text-2xl font-bold text-red-300 flex items-center gap-3">
              <XCircle className="w-7 h-7 text-red-500 shrink-0" />
              <span>Erro tardio / Silencioso</span>
            </div>
            <div className="col-span-4 text-2xl font-black text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
              <span>Explica o erro e campo</span>
            </div>
          </div>

          {/* Row 4: Retrabalho dos Erros Detectados */}
          <div className="table-row-item grid grid-cols-12 px-10 py-6 items-center bg-indigo-950/40">
            <div className="col-span-4 text-2xl font-bold text-white">
              Retrabalho na Gravação
            </div>
            <div className="col-span-4 text-2xl font-bold text-red-300 flex items-center gap-3">
              <XCircle className="w-7 h-7 text-red-500 shrink-0" />
              <span>Constante e manual</span>
            </div>
            <div className="col-span-4 flex items-baseline gap-4">
              <span
                ref={zeroRef}
                className="text-7xl font-black font-mono text-emerald-400 drop-shadow-[0_0_25px_#2dff9a]"
              >
                0*
              </span>
              <span className="text-xl text-emerald-300 font-bold">
                para erros interceptados
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Explanatory Note from Dossier */}
      <div className="border-t border-indigo-800/60 pt-4 flex items-center justify-between text-base text-slate-300 font-mono">
        <div className="max-w-5xl leading-relaxed">
          <strong className="text-emerald-400 font-bold">* Rigor Metodológico:</strong> O índice zero de retrabalho refere-se aos erros detectados e bloqueados antes da gravação. Não representa eliminação de todo o retrabalho da instituição.
        </div>
        <div className="text-emerald-400 font-extrabold text-lg">
          PREVENÇÃO NA ORIGEM
        </div>
      </div>
    </div>
  );
};
