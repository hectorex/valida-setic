import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { Lightbulb, Code2 } from 'lucide-react';
import { sfx } from '../audio';

export const Slide06Solution: React.FC = () => {
  const [typedHeadline, setTypedHeadline] = useState('');
  const fullHeadline = 'Com a nossa API você pode facilitar a vida de seus programadores.';
  const containerRef = useRef<HTMLDivElement>(null);
  const [isWinking, setIsWinking] = useState(false);

  // Typewriter effect
  useEffect(() => {
    let currentIdx = 0;
    const interval = window.setInterval(() => {
      if (currentIdx <= fullHeadline.length) {
        setTypedHeadline(fullHeadline.slice(0, currentIdx));
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 28);

    return () => clearInterval(interval);
  }, []);

  // Natural expressive wink animation: starts open, winks naturally after text lands, and stays closed
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerNaturalWink();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const triggerNaturalWink = () => {
    // Quick blink closure
    setIsWinking(true);
    sfx.playKeyClick();
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Complement entrance
      gsap.from('.complement-group', {
        opacity: 0,
        y: 20,
        duration: 0.7,
        delay: 1.5,
        ease: 'power2.out',
      });

      // Circular lightbulb aura breathing animation
      gsap.fromTo(
        '#circular-light-aura',
        { opacity: 0.4, scale: 0.85 },
        {
          opacity: 0.85,
          scale: 1.15,
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full p-20 font-mono select-none overflow-hidden flex flex-col justify-between"
    >
      {/* Top Header section */}
      <div className="flex items-start justify-between">
        <div className="max-w-5xl">
          <div className="flex items-center gap-3 text-lg text-amber-400 font-bold tracking-widest uppercase mb-3">
            <Code2 className="w-6 h-6 text-amber-400" />
            <span>A Chave da Solução</span>
          </div>

          <h2 className="text-4xl lg:text-[52px] font-extrabold text-white tracking-tight leading-snug">
            {typedHeadline}
            <span className="animate-blink text-blue-400 ml-2">▌</span>
          </h2>

          {/* Complement with Natural Winking Emoji */}
          <div className="complement-group mt-6 flex items-center gap-6 text-3xl lg:text-4xl font-extrabold text-indigo-200">
            <span>(Eles agradecem!)</span>

            {/* Clickable Natural Expressive Emoji */}
            <div
              onClick={triggerNaturalWink}
              title="Clique para piscar novamente!"
              className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
            >
              <svg
                width="84"
                height="84"
                viewBox="0 0 100 100"
                className="drop-shadow-[0_0_25px_rgba(255,210,63,0.8)]"
              >
                {/* Face base */}
                <circle cx="50" cy="50" r="46" fill="#ffd23f" />

                {/* Left Eyebrow (Friendly Raised) */}
                <path
                  d="M 24 23 Q 34 17 44 23"
                  stroke="#1b1b3a"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />

                {/* Left Eye: Open & Joyful */}
                <ellipse cx="34" cy="38" rx="6.5" ry="9" fill="#1b1b3a" />
                {/* Eye shine highlight */}
                <circle cx="36" cy="35" r="2.5" fill="#ffffff" />

                {/* Right Eyebrow */}
                <path
                  d={isWinking ? "M 56 26 Q 66 28 76 25" : "M 56 24 Q 66 18 76 24"}
                  stroke="#1b1b3a"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />

                {/* Right Eye: Switches naturally from open dot to curved happy wink arc ⌒ */}
                {!isWinking ? (
                  <>
                    <ellipse cx="66" cy="38" rx="6.5" ry="9" fill="#1b1b3a" />
                    <circle cx="68" cy="35" r="2.5" fill="#ffffff" />
                  </>
                ) : (
                  <g className="transition-opacity duration-200">
                    {/* Natural curved closed eye crescent */}
                    <path
                      d="M 54 41 Q 66 27 78 41"
                      stroke="#1b1b3a"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Playful side wink crease */}
                    <path
                      d="M 77 40 L 83 37"
                      stroke="#1b1b3a"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </g>
                )}

                {/* Confident Smiling Mouth */}
                <path
                  d="M 28 60 Q 50 86 72 60"
                  stroke="#1b1b3a"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Tongue / mouth depth */}
                <path
                  d="M 40 68 Q 50 78 60 68"
                  fill="#ff5277"
                  opacity="0.85"
                />

                {/* Rosy blush cheeks */}
                <circle cx="24" cy="58" r="6" fill="#ff7080" opacity="0.65" />
                <circle cx="76" cy="58" r="6" fill="#ff7080" opacity="0.65" />
              </svg>
            </div>
          </div>
        </div>

        {/* Circular Radiant Lightbulb Aura - 100% UNBOXED & CIRCULAR */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Circular Glowing Radial Halo */}
          <div
            id="circular-light-aura"
            className="absolute w-72 h-72 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255, 210, 63, 0.45) 0%, rgba(255, 210, 63, 0.15) 50%, transparent 75%)',
              filter: 'blur(16px)',
            }}
          />

          {/* SVG Lightbulb Icon */}
          <svg
            className="relative w-36 h-48 drop-shadow-[0_0_40px_rgba(255,210,63,0.8)] z-10"
            viewBox="0 0 100 140"
          >
            {/* Bulb glass */}
            <path
              d="M50 12a34 34 0 0 1 20 61v14H30V73A34 34 0 0 1 50 12z"
              fill="#ffd23f"
              stroke="#fff"
              strokeWidth="2"
            />
            {/* Filament */}
            <path
              d="M42 55 L46 38 L54 38 L58 55"
              fill="none"
              stroke="#b57a05"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Threaded Base */}
            <rect x="34" y="94" width="32" height="9" rx="2" fill="#d49a15" />
            <rect x="37" y="107" width="26" height="9" rx="2" fill="#a17007" />
            <path d="M43 120 h14 v4 h-14 z" fill="#555" />
          </svg>
        </div>
      </div>

      {/* Main Center Content: Two Big Clear Blocks */}
      <div className="grid grid-cols-12 gap-10 my-auto items-center">
        {/* Left Side: Developer Impact */}
        <div className="col-span-6 space-y-6 font-sans">
          <div className="p-6 rounded-2xl bg-[#080d32] border-3 border-blue-400 shadow-xl">
            <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-400" />
              Menos Linhas de Código nos Sistemas
            </h3>
            <p className="text-lg text-slate-100 leading-relaxed font-medium">
              O programador não perde tempo implementando regex de CPF, verificador de e-mail e regras de datas. Uma chamada HTTP padronizada resolve tudo.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#080d32] border-3 border-emerald-400 shadow-xl">
            <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400" />
              Regras Atualizadas em um Único Lugar
            </h3>
            <p className="text-lg text-slate-100 leading-relaxed font-medium">
              Se a CAGD alterar uma regra de obrigatoriedade, todos os sistemas passam a validar no novo padrão instantaneamente, sem precisar refazer deploy.
            </p>
          </div>
        </div>

        {/* Right Side: Contract Preview (Enlarged and Clear) */}
        <div className="col-span-6 rounded-2xl border-3 border-blue-500 bg-[#070b28] p-8 shadow-[0_0_50px_rgba(48,80,255,0.35)] font-mono">
          <div className="flex items-center justify-between pb-4 border-b border-indigo-900 text-sm text-slate-300">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500" />
              <span className="w-3.5 h-3.5 rounded-full bg-yellow-500" />
              <span className="w-3.5 h-3.5 rounded-full bg-green-500" />
              <span className="text-white ml-3 font-black text-base">POST /api/v1/validar</span>
            </div>
            <span className="text-emerald-400 font-black text-base">200 OK</span>
          </div>

          <div className="py-4 text-base lg:text-lg leading-relaxed">
            <div className="text-yellow-300 font-bold">// Resposta Padronizada da Valida SETIC</div>
            <div className="text-white font-bold">&#123;</div>
            <div className="pl-6">
              <span className="text-cyan-300 font-bold">"status"</span>: <span className="text-emerald-400 font-black">"aprovado"</span>,
            </div>
            <div className="pl-6">
              <span className="text-cyan-300 font-bold">"valido"</span>: <span className="text-emerald-300 font-bold">true</span>,
            </div>
            <div className="pl-6">
              <span className="text-cyan-300 font-bold">"dados_padronizados"</span>: &#123;
            </div>
            <div className="pl-12 text-white font-bold">
              <span className="text-yellow-300">"cpf"</span>: "11111111111", <span className="text-slate-400 text-sm">// limpo</span>
            </div>
            <div className="pl-12 text-white font-bold">
              <span className="text-yellow-300">"nascimento"</span>: "1980-03-15", <span className="text-slate-400 text-sm">// ISO</span>
            </div>
            <div className="pl-12 text-white font-bold">
              <span className="text-yellow-300">"email"</span>: "contato@setic.ro.gov.br"
            </div>
            <div className="pl-6 text-white font-bold">&#125;</div>
            <div className="text-white font-bold">&#125;</div>
          </div>

          <div className="pt-3 border-t border-indigo-900 text-xs text-white flex items-center justify-between">
            <span className="font-bold">Payload seguro e previsível</span>
            <span className="text-cyan-300 font-black">FastAPI + Pydantic</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="border-t-2 border-indigo-800 pt-4 flex items-center justify-between text-base text-slate-200 font-mono">
        <span className="text-white font-black text-lg">
          A API centraliza as regras e devolve a resposta clara: aprovado ou bloqueado com o motivo exato.
        </span>
        <span className="text-yellow-300 font-black">Simplicidade para quem codifica</span>
      </div>
    </div>
  );
};
