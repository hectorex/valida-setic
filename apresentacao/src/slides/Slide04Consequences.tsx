import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { AlertTriangle, XCircle, Wrench, RefreshCw, Ban } from 'lucide-react';

const CONSEQUENCE_TAGS = [
  'Dados Inconsistentes',
  'Retrabalho Operacional',
  'Correções Manuais no Banco',
  'Falta de Padronização',
  'Integração Interrompida',
];

export const Slide04Consequences: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gear1Ref = useRef<SVGSVGElement>(null);
  const gear2Ref = useRef<SVGSVGElement>(null);
  const gear3Ref = useRef<SVGSVGElement>(null);

  // Jammed gears animation: gears try to turn, stutter, and lock up
  useEffect(() => {
    if (!gear1Ref.current || !gear2Ref.current || !gear3Ref.current) return;

    const g1 = gear1Ref.current;
    const g2 = gear2Ref.current;
    const g3 = gear3Ref.current;

    const tl1 = gsap.timeline({ repeat: -1, repeatDelay: 0.2 });
    tl1
      .to(g1, { rotation: 35, duration: 0.35, ease: 'power2.in' })
      .to(g1, { rotation: 26, duration: 0.08, ease: 'rough' })
      .to(g1, { rotation: 32, duration: 0.08 })
      .to(g1, { rotation: 28, duration: 0.08 })
      .to(g1, { rotation: 0, duration: 0.6, ease: 'power1.inOut' });

    const tl2 = gsap.timeline({ repeat: -1, repeatDelay: 0.25 });
    tl2
      .to(g2, { rotation: -35, duration: 0.35, ease: 'power2.in' })
      .to(g2, { rotation: -26, duration: 0.08 })
      .to(g2, { rotation: -32, duration: 0.08 })
      .to(g2, { rotation: 0, duration: 0.6, ease: 'power1.inOut' });

    const tl3 = gsap.timeline({ repeat: -1, repeatDelay: 0.3 });
    tl3
      .to(g3, { rotation: 30, duration: 0.3, ease: 'power2.in' })
      .to(g3, { rotation: 24, duration: 0.08 })
      .to(g3, { rotation: 0, duration: 0.5 });

    // Staggered tags appearance
    gsap.from('.consequence-tag', {
      opacity: 0,
      y: 25,
      duration: 0.5,
      stagger: 0.12,
      delay: 0.5,
      ease: 'back.out(1.8)',
    });

    return () => {
      tl1.kill();
      tl2.kill();
      tl3.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full p-20 font-mono select-none overflow-hidden flex flex-col justify-between"
    >
      {/* Header section with big bold text */}
      <div className="max-w-5xl z-10">
        <div className="flex items-center gap-3 text-lg text-red-400 font-bold tracking-widest uppercase mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
          <span>O Gargalo Operacional</span>
        </div>
        <h2 className="text-5xl lg:text-[54px] font-extrabold text-white tracking-tight leading-snug">
          O problema não é receber dados. É lidar com as inconsistências depois que elas já entraram no fluxo.
        </h2>
      </div>

      {/* Center Layout: Problems + Jammed Gears */}
      <div className="relative w-full flex items-center justify-between px-6 z-10 my-auto">
        {/* Left Side: Real consequences description */}
        <div className="w-[680px] flex flex-col gap-6">
          <div className="p-8 rounded-2xl bg-red-950/60 border-2 border-red-600/70 shadow-[0_0_40px_rgba(255,59,78,0.35)]">
            <div className="flex items-center gap-3 text-red-300 font-extrabold text-2xl mb-3">
              <XCircle className="w-7 h-7 text-red-500 shrink-0" />
              <span>Detecção Tardia = Alto Custo</span>
            </div>
            <p className="text-xl text-red-100 font-sans leading-relaxed">
              Quando a validação não acontece na entrada, o dado incorreto é gravado no banco de produção. O erro só é descoberto quando um relatório quebra, uma integração falha ou o cidadão tem seu benefício travado.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="p-5 rounded-xl bg-slate-950/80 border border-red-500/40 flex items-center gap-4">
              <Wrench className="w-8 h-8 text-red-400 shrink-0" />
              <div>
                <div className="text-xl font-black text-white">Chamados Manuais</div>
                <div className="text-sm text-slate-300 mt-1">TI precisa corrigir via script no banco</div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-950/80 border border-red-500/40 flex items-center gap-4">
              <RefreshCw className="w-8 h-8 text-red-400 shrink-0" />
              <div>
                <div className="text-xl font-black text-white">Retrabalho Constante</div>
                <div className="text-sm text-slate-300 mt-1">Horas de equipes gastas em reconciliação</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Jammed SVG Gears */}
        <div className="relative w-[540px] h-[400px] flex items-center justify-center">
          {/* Pulsing cross marks */}
          <div className="absolute left-8 top-10 text-red-500 text-5xl font-black animate-pulse drop-shadow-[0_0_15px_#ff3b4e]">
            ✕
          </div>
          <div className="absolute right-12 bottom-12 text-red-500 text-6xl font-black animate-pulse drop-shadow-[0_0_15px_#ff3b4e]">
            ✕
          </div>

          {/* Gear 1 */}
          <svg
            ref={gear1Ref}
            className="absolute left-16 top-6 w-52 h-52 text-red-500 drop-shadow-[0_0_30px_rgba(255,59,78,0.5)]"
            viewBox="-100 -100 200 200"
          >
            <circle r="72" fill="none" stroke="currentColor" strokeWidth="26" strokeDasharray="11.9 11.9" />
            <circle r="56" fill="none" stroke="currentColor" strokeWidth="10" />
            <circle r="18" fill="currentColor" />
          </svg>

          {/* Gear 2 */}
          <svg
            ref={gear2Ref}
            className="absolute right-14 top-24 w-44 h-44 text-red-400 drop-shadow-[0_0_24px_rgba(255,59,78,0.4)]"
            viewBox="-100 -100 200 200"
          >
            <circle r="72" fill="none" stroke="currentColor" strokeWidth="26" strokeDasharray="11.9 11.9" />
            <circle r="56" fill="none" stroke="currentColor" strokeWidth="10" />
            <circle r="16" fill="currentColor" />
          </svg>

          {/* Gear 3 */}
          <svg
            ref={gear3Ref}
            className="absolute left-40 bottom-6 w-36 h-36 text-red-600 drop-shadow-[0_0_20px_rgba(255,59,78,0.4)]"
            viewBox="-100 -100 200 200"
          >
            <circle r="72" fill="none" stroke="currentColor" strokeWidth="26" strokeDasharray="11.9 11.9" />
            <circle r="56" fill="none" stroke="currentColor" strokeWidth="10" />
            <circle r="14" fill="currentColor" />
          </svg>

          {/* Jammed alert center badge */}
          <div className="absolute z-20 px-5 py-2.5 rounded-xl bg-red-950 border-2 border-red-500 text-base font-black text-white shadow-[0_0_30px_#ff3b4e] flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-400" />
            <span>FLUXO ENGASGADO</span>
          </div>
        </div>
      </div>

      {/* Bottom Consequence Tags with high visibility */}
      <div className="z-10">
        <div className="text-sm text-red-300 font-bold mb-3 uppercase tracking-wider">
          IMPACTOS DIRETOS OBSERVADOS:
        </div>
        <div className="flex flex-wrap gap-4">
          {CONSEQUENCE_TAGS.map((tag, idx) => (
            <div
              key={idx}
              className="consequence-tag px-6 py-3 rounded-xl bg-red-950/80 border-2 border-red-500 text-red-100 text-lg font-bold shadow-[0_0_20px_rgba(255,59,78,0.3)] flex items-center gap-3"
            >
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span>{tag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
