import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { Layers, Database, Cpu, CheckCircle2, Server } from 'lucide-react';
import { sfx } from '../audio';

export const Slide02Concept: React.FC = () => {
  const [typedHeadline, setTypedHeadline] = useState('');
  const fullHeadline =
    'Uma camada inteligente de validação e padronização de dados, antes que eles cheguem aos sistemas.';
  const containerRef = useRef<HTMLDivElement>(null);
  const packetARef = useRef<HTMLDivElement>(null);
  const packetBRef = useRef<HTMLDivElement>(null);

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
    }, 25);

    return () => clearInterval(interval);
  }, []);

  // Continuous realistic packet animation along exact line vectors
  useEffect(() => {
    const pA = packetARef.current;
    const pB = packetBRef.current;
    if (!pA || !pB) return;

    // Line 1: from Sistema A (460, 430) -> Valida SETIC (760, 560) -> Banco A (1460, 430)
    // Line 2: from Sistema B (460, 730) -> Valida SETIC (760, 660) -> Banco B (1460, 730)
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });

    // Step 1: Packet A leaves Sistema A along the line to Valida SETIC
    tl.set(pA, {
      left: 460,
      top: 410,
      opacity: 0,
      scale: 0.8,
      backgroundColor: 'rgba(30, 40, 120, 0.95)',
      borderColor: '#6f7bff',
    })
      .to(pA, { opacity: 1, scale: 1, duration: 0.2 })
      .to(pA, {
        left: 760,
        top: 540,
        duration: 1.4,
        ease: 'power1.inOut',
      })
      // Inspection in center box
      .to(pA, {
        backgroundColor: '#0f8f55',
        borderColor: '#2dff9a',
        duration: 0.15,
        onStart: () => sfx.playSuccess(),
      })
      .to('#api-pulse', {
        scale: 1.05,
        boxShadow: '0 0 60px rgba(45, 255, 154, 0.6)',
        duration: 0.2,
        yoyo: true,
        repeat: 1,
      })
      // Packet A proceeds along the line to Banco A
      .to(pA, {
        left: 1440,
        top: 410,
        duration: 1.4,
        ease: 'power1.inOut',
      })
      .to(pA, { opacity: 0, scale: 0.5, duration: 0.25 })

      // Step 2: Packet B leaves Sistema B along the line to Valida SETIC
      .set(pB, {
        left: 460,
        top: 710,
        opacity: 0,
        scale: 0.8,
        backgroundColor: 'rgba(30, 40, 120, 0.95)',
        borderColor: '#6f7bff',
      })
      .to(pB, { opacity: 1, scale: 1, duration: 0.2 })
      .to(pB, {
        left: 760,
        top: 640,
        duration: 1.4,
        ease: 'power1.inOut',
      })
      // Inspection
      .to(pB, {
        backgroundColor: '#0f8f55',
        borderColor: '#2dff9a',
        duration: 0.15,
        onStart: () => sfx.playSuccess(),
      })
      .to('#api-pulse', {
        scale: 1.05,
        boxShadow: '0 0 60px rgba(45, 255, 154, 0.6)',
        duration: 0.2,
        yoyo: true,
        repeat: 1,
      })
      // Packet B proceeds along the line to Banco B
      .to(pB, {
        left: 1440,
        top: 710,
        duration: 1.4,
        ease: 'power1.inOut',
      })
      .to(pB, { opacity: 0, scale: 0.5, duration: 0.25 });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full p-20 font-mono select-none overflow-hidden"
    >
      {/* Top Header section with large legible font */}
      <div className="max-w-5xl">
        <div className="flex items-center gap-3 text-lg text-blue-400 font-bold tracking-widest uppercase mb-4">
          <Layers className="w-6 h-6 text-cyan-400" />
          <span>Visão Geral do Produto</span>
        </div>
        <h2 className="text-5xl lg:text-[54px] font-extrabold text-white tracking-tight leading-tight">
          {typedHeadline}
          <span className="animate-blink text-blue-400 ml-2">▌</span>
        </h2>
      </div>

      {/* SVG Vector Connection Lines (Absolute in stage coordinates) */}
      <svg
        className="absolute left-0 top-0 w-[1920px] h-[1080px] pointer-events-none z-0"
        viewBox="0 0 1920 1080"
      >
        <defs>
          <linearGradient id="lineGradIn" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f60e0" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3050ff" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="lineGradOut" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3050ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#2dff9a" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Sistema A -> Valida SETIC */}
        <line
          x1="460"
          y1="430"
          x2="760"
          y2="560"
          stroke="url(#lineGradIn)"
          strokeWidth="4"
          strokeDasharray="12 8"
        />

        {/* Sistema B -> Valida SETIC */}
        <line
          x1="460"
          y1="730"
          x2="760"
          y2="660"
          stroke="url(#lineGradIn)"
          strokeWidth="4"
          strokeDasharray="12 8"
        />

        {/* Valida SETIC -> Banco A */}
        <line
          x1="1200"
          y1="560"
          x2="1460"
          y2="430"
          stroke="url(#lineGradOut)"
          strokeWidth="4"
          strokeDasharray="12 8"
        />

        {/* Valida SETIC -> Banco B */}
        <line
          x1="1200"
          y1="660"
          x2="1460"
          y2="730"
          stroke="url(#lineGradOut)"
          strokeWidth="4"
          strokeDasharray="12 8"
        />
      </svg>

      {/* Animated Traveling Packets */}
      <div
        ref={packetARef}
        className="absolute z-20 px-4 py-2 rounded-lg border-2 text-sm font-bold text-white shadow-xl whitespace-nowrap pointer-events-none opacity-0 flex items-center gap-2"
      >
        <span>dados_usuario: [cpf, data]</span>
      </div>

      <div
        ref={packetBRef}
        className="absolute z-20 px-4 py-2 rounded-lg border-2 text-sm font-bold text-white shadow-xl whitespace-nowrap pointer-events-none opacity-0 flex items-center gap-2"
      >
        <span>dados_protocolo: [email, nome]</span>
      </div>

      {/* Left Column: Source Systems */}
      {/* Sistema A */}
      <div
        className="absolute left-[120px] top-[340px] w-[340px] h-[180px] p-6 rounded-2xl bg-[#080d32] border-3 border-blue-400 shadow-2xl flex flex-col justify-between z-10"
      >
        <div className="flex items-center justify-between">
          <span className="text-3xl font-black text-white">Sistema A</span>
          <span className="px-3 py-1 rounded bg-blue-600 text-white font-black text-xs uppercase shadow">
            CONSUMIDOR
          </span>
        </div>
        <div>
          <div className="text-lg font-bold text-yellow-300">Ex: RH / SID</div>
          <div className="text-sm font-bold text-white mt-1">Envia dados para validação</div>
        </div>
        <div className="text-xs font-black text-cyan-300 border-t border-indigo-800 pt-2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Saída de Requisição</span>
        </div>
      </div>

      {/* Sistema B */}
      <div
        className="absolute left-[120px] top-[640px] w-[340px] h-[180px] p-6 rounded-2xl bg-[#080d32] border-3 border-blue-400 shadow-2xl flex flex-col justify-between z-10"
      >
        <div className="flex items-center justify-between">
          <span className="text-3xl font-black text-white">Sistema B</span>
          <span className="px-3 py-1 rounded bg-blue-600 text-white font-black text-xs uppercase shadow">
            CONSUMIDOR
          </span>
        </div>
        <div>
          <div className="text-lg font-bold text-yellow-300">Ex: Protocolo / Cidadão</div>
          <div className="text-sm font-bold text-white mt-1">Formulário web independente</div>
        </div>
        <div className="text-xs font-black text-cyan-300 border-t border-indigo-800 pt-2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Saída de Requisição</span>
        </div>
      </div>

      {/* Center Box: VALIDA SETIC Core API */}
      <div
        id="api-pulse"
        className="absolute left-[760px] top-[430px] w-[440px] h-[340px] p-8 rounded-3xl bg-[#070b28] border-4 border-blue-500 shadow-[0_0_60px_rgba(48,80,255,0.5)] z-10 flex flex-col justify-between overflow-hidden"
      >
        {/* Animated Laser Scanning Line */}
        <div className="absolute left-0 right-0 top-0 h-[5px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_15px_#38bdf8] animate-[scan_2s_ease-in-out_infinite_alternate]" />

        <div className="flex items-center justify-between pb-3 border-b border-indigo-800">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-7 h-7 text-cyan-300" />
            <span className="text-base tracking-wider uppercase text-cyan-300 font-black">
              CAMADA CENTRAL
            </span>
          </div>
          <span className="text-xs px-3 py-1 rounded bg-blue-600 text-white font-black shadow">
            API ATIVA
          </span>
        </div>

        <div className="my-2">
          <h3 className="text-4xl font-black text-white tracking-wide">
            VALIDA SETIC
          </h3>
          <p className="text-base text-yellow-300 font-bold mt-1">
            Regras Reutilizáveis & Padronização
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-white pt-3 border-t border-indigo-900 font-mono">
          <div className="flex items-center gap-2 text-cyan-300 font-extrabold">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>Valida na Entrada</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-300 font-extrabold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Padroniza Dados</span>
          </div>
        </div>
      </div>

      {/* Right Column: Protected Databases */}
      {/* Banco A */}
      <div
        className="absolute left-[1460px] top-[340px] w-[340px] h-[180px] p-6 rounded-2xl bg-[#032213] border-3 border-emerald-400 shadow-2xl flex flex-col justify-between z-10"
      >
        <div className="flex items-center justify-between">
          <span className="text-3xl font-black text-white">Banco Seguro A</span>
          <Database className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <div className="text-lg font-bold text-emerald-300">Base de Dados A</div>
          <div className="text-sm font-bold text-white mt-1">Apenas registros 100% íntegros</div>
        </div>
        <div className="text-xs font-black text-emerald-300 border-t border-emerald-800 pt-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Integridade Garantida</span>
        </div>
      </div>

      {/* Banco B */}
      <div
        className="absolute left-[1460px] top-[640px] w-[340px] h-[180px] p-6 rounded-2xl bg-[#032213] border-3 border-emerald-400 shadow-2xl flex flex-col justify-between z-10"
      >
        <div className="flex items-center justify-between">
          <span className="text-3xl font-black text-white">Banco Seguro B</span>
          <Database className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <div className="text-lg font-bold text-emerald-300">Base de Dados B / Lake</div>
          <div className="text-sm font-bold text-white mt-1">Dados sem inconsistências</div>
        </div>
        <div className="text-xs font-black text-emerald-300 border-t border-emerald-800 pt-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Integridade Garantida</span>
        </div>
      </div>

      {/* Bottom Footer Note with high contrast */}
      <div className="absolute left-20 right-20 bottom-12 border-t-2 border-indigo-800 pt-4 flex items-center justify-between text-base font-mono">
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white font-black text-xl">
            Uma só camada de regras, reutilizada por qualquer sistema público ou convênio.
          </span>
        </div>
        <div className="text-base text-yellow-300 font-black">
          Desacoplamento • Reutilização • Governança
        </div>
      </div>
    </div>
  );
};
