import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Cpu, Server, Check, X, ShieldCheck } from 'lucide-react';
import { sfx } from '../audio';

interface DemoPacket {
  id: string;
  from: 'A' | 'B';
  label: string;
  isValid: boolean;
  message: string;
  detail: string;
}

const DEMO_ITEMS: DemoPacket[] = [
  {
    id: '1',
    from: 'A',
    label: 'CPF: 123.456.789-00',
    isValid: false,
    message: 'CPF: dígito verificador inválido',
    detail: 'Algoritmo módulo 11 rejeitou os dígitos finais',
  },
  {
    id: '2',
    from: 'B',
    label: 'EMAIL: usuario@',
    isValid: false,
    message: 'E-mail: formato incompleto',
    detail: 'Ausência de domínio (@exemplo.com)',
  },
  {
    id: '3',
    from: 'A',
    label: 'DATA: 31/02/1980',
    isValid: false,
    message: 'Data: inexistente no calendário',
    detail: 'Fevereiro nunca possui 31 dias',
  },
  {
    id: '4',
    from: 'B',
    label: 'NOME: "" (em branco)',
    isValid: false,
    message: 'Nome: campo obrigatório',
    detail: 'Não pode ser vazio nem conter apenas espaços',
  },
  {
    id: '5',
    from: 'A',
    label: 'CPF: 529.982.247-25',
    isValid: true,
    message: 'CPF Aprovado',
    detail: 'Dígitos verificadores válidos & padronizados',
  },
  {
    id: '6',
    from: 'B',
    label: 'EMAIL: contato@setic.ro.gov.br',
    isValid: true,
    message: 'E-mail Aprovado',
    detail: 'Estrutura RFC válida com domínio institucional',
  },
  {
    id: '7',
    from: 'A',
    label: 'DATA: 15/03/1980',
    isValid: true,
    message: 'Data Aprovada',
    detail: 'Data existente convertida para padrão ISO',
  },
  {
    id: '8',
    from: 'B',
    label: 'NOME: João Silva',
    isValid: true,
    message: 'Nome Aprovado',
    detail: 'Sanitizado com remoção de espaços redundantes',
  },
];

export const Slide07Demo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const validaBoxRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = useState<DemoPacket>(DEMO_ITEMS[0]);
  const [evaluationStatus, setEvaluationStatus] = useState<{
    status: 'idle' | 'approved' | 'rejected';
    message: string;
    detail: string;
  }>({
    status: 'idle',
    message: 'Aguardando envio de dados...',
    detail: 'Camada ativa e pronta para inspeção',
  });

  const [approvedCount, setApprovedCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);

  // Exact coordinated packet motion along vector lines connecting the boxes
  const runPacket = (item: DemoPacket) => {
    setActiveItem(item);
    const packetEl = packetRef.current;
    const boxEl = validaBoxRef.current;
    if (!packetEl || !boxEl) return;

    gsap.killTweensOf(packetEl);

    // Exact geometric coordinates matching boxes:
    // Sistema A right-edge: (480, 390) -> Valida intake: (740, 450)
    // Sistema B right-edge: (480, 670) -> Valida intake: (740, 630)
    // Valida exit: (1180, 540) -> Sistema TI intake: (1440, 540)
    const isFromA = item.from === 'A';
    const startX = 480;
    const startY = isFromA ? 390 : 670;
    const intakeX = 740;
    const intakeY = isFromA ? 450 : 630;
    const exitX = 1180;
    const exitY = 540;
    const targetSeticX = 1440;
    const targetSeticY = 540;

    const tl = gsap.timeline();

    // 1. Packet emerges directly from right edge of Sistema A or B
    tl.set(packetEl, {
      left: startX,
      top: startY,
      xPercent: -10,
      yPercent: -50,
      opacity: 0,
      scale: 0.8,
      backgroundColor: '#0a1038',
      borderColor: '#60a5fa',
    })
      .to(packetEl, { opacity: 1, scale: 1, duration: 0.2 })
      // Travels straight along the vector line into VALIDA SETIC left intake
      .to(packetEl, {
        left: intakeX,
        top: intakeY,
        duration: 1.3,
        ease: 'power1.inOut',
      });

    // 2. Evaluation at VALIDA SETIC
    if (item.isValid) {
      tl.call(() => {
        sfx.playSuccess();
        setEvaluationStatus({
          status: 'approved',
          message: `✓ ${item.message}`,
          detail: item.detail,
        });
        setApprovedCount((c) => c + 1);
      })
        .to(packetEl, {
          backgroundColor: '#05472a',
          borderColor: '#4ade80',
          duration: 0.15,
        })
        .to(boxEl, {
          borderColor: '#4ade80',
          boxShadow: '0 0 65px rgba(74, 222, 128, 0.75)',
          duration: 0.15,
          yoyo: true,
          repeat: 1,
        })
        // 3a. Approved packet continues safely along the green line to Sistema de TI da SETIC
        .set(packetEl, { left: exitX, top: exitY })
        .to(packetEl, {
          left: targetSeticX + 60,
          top: targetSeticY,
          duration: 1.2,
          ease: 'power1.out',
        })
        .to(packetEl, { opacity: 0, scale: 0.5, duration: 0.2 });
    } else {
      tl.call(() => {
        sfx.playError();
        setEvaluationStatus({
          status: 'rejected',
          message: `✕ ${item.message}`,
          detail: item.detail,
        });
        setBlockedCount((c) => c + 1);
      })
        .to(packetEl, {
          backgroundColor: '#6b0716',
          borderColor: '#f87171',
          duration: 0.1,
        })
        .to(boxEl, {
          borderColor: '#f87171',
          boxShadow: '0 0 70px rgba(248, 113, 113, 0.8)',
          duration: 0.1,
          yoyo: true,
          repeat: 2,
        })
        // 3b. Invalid packet collides, shakes and bounces BACK along the line to source system!
        .to(packetEl, { left: '-=20', duration: 0.05, yoyo: true, repeat: 5 })
        .to(packetEl, {
          left: startX,
          top: startY,
          duration: 1.3,
          ease: 'power2.inOut',
        })
        .to(packetEl, { opacity: 0, duration: 0.25 });
    }
  };

  // Auto-play demo sequence
  useEffect(() => {
    let idx = 0;
    const interval = window.setInterval(() => {
      runPacket(DEMO_ITEMS[idx % DEMO_ITEMS.length]);
      idx++;
    }, 4200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full p-20 font-mono select-none overflow-hidden"
    >
      {/* Top Header Section - Compact 2-Line Layout with Ample Breathing Room */}
      <div className="max-w-6xl">
        <div className="flex items-center gap-3 text-base text-cyan-300 font-extrabold tracking-widest uppercase mb-2">
          <ShieldCheck className="w-5 h-5 text-cyan-300" />
          <span>Demonstração do Fluxo em Tempo Real</span>
        </div>
        <h2 className="text-3xl lg:text-[40px] font-black text-white tracking-tight leading-snug">
          Com um simples script de integração, seus sistemas passam a utilizar uma camada centralizada de validação.
        </h2>
      </div>

      {/* SVG Connecting Tracks - Exactly Aligned to Box Edges with Zero Gaps */}
      <svg
        className="absolute left-0 top-0 w-[1920px] h-[1080px] pointer-events-none z-0"
        viewBox="0 0 1920 1080"
      >
        <defs>
          <linearGradient id="lineAtoValida" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="lineBtoValida" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Line 1: Sistema A right edge (480, 390) -> VALIDA SETIC left intake (740, 450) */}
        <line
          x1="480"
          y1="390"
          x2="740"
          y2="450"
          stroke="url(#lineAtoValida)"
          strokeWidth="5"
          strokeDasharray="14 10"
        />

        {/* Line 2: Sistema B right edge (480, 670) -> VALIDA SETIC left intake (740, 630) */}
        <line
          x1="480"
          y1="670"
          x2="740"
          y2="630"
          stroke="url(#lineBtoValida)"
          strokeWidth="5"
          strokeDasharray="14 10"
        />

        {/* Line 3: VALIDA SETIC right exit (1180, 540) -> Sistema TI left intake (1440, 540) */}
        <line
          x1="1180"
          y1="540"
          x2="1440"
          y2="540"
          stroke="#4ade80"
          strokeWidth="6"
          strokeDasharray="14 10"
        />
      </svg>

      {/* Flying Packet - Crisp High-Contrast Bold Text */}
      <div
        ref={packetRef}
        className="absolute z-30 px-6 py-3.5 rounded-2xl border-3 shadow-[0_0_30px_rgba(0,0,0,0.8)] pointer-events-none opacity-0 flex items-center gap-3 text-2xl font-black text-white"
      >
        <span>{activeItem.label}</span>
      </div>

      {/* --- Main Diagram Nodes (Pushed down to top: 290px to prevent ANY overlap) --- */}

      {/* 1. Sistema A (Top Left) */}
      <div
        className="absolute left-[100px] top-[290px] w-[380px] h-[200px] p-6 rounded-2xl bg-[#080d32] border-3 border-blue-400 shadow-[0_15px_35px_rgba(0,0,0,0.6)] flex flex-col justify-between z-10"
      >
        <div className="flex items-center justify-between">
          <span className="text-3xl font-black text-white">Sistema A</span>
          <span className="px-3.5 py-1 rounded-md bg-blue-600 text-white font-extrabold text-sm tracking-wider uppercase shadow">
            ORIGEM
          </span>
        </div>
        <div>
          <div className="text-xl font-bold text-yellow-300">Ex: RH / Cadastro</div>
          <div className="text-base font-bold text-white mt-1">Envia dados para análise</div>
        </div>
        <div className="text-sm font-extrabold text-cyan-300 border-t border-indigo-800 pt-2 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <span>Trata retorno de validação</span>
        </div>
      </div>

      {/* 2. Sistema B (Bottom Left) */}
      <div
        className="absolute left-[100px] top-[570px] w-[380px] h-[200px] p-6 rounded-2xl bg-[#080d32] border-3 border-blue-400 shadow-[0_15px_35px_rgba(0,0,0,0.6)] flex flex-col justify-between z-10"
      >
        <div className="flex items-center justify-between">
          <span className="text-3xl font-black text-white">Sistema B</span>
          <span className="px-3.5 py-1 rounded-md bg-blue-600 text-white font-extrabold text-sm tracking-wider uppercase shadow">
            ORIGEM
          </span>
        </div>
        <div>
          <div className="text-xl font-bold text-yellow-300">Ex: Portal do Cidadão</div>
          <div className="text-base font-bold text-white mt-1">Formulário web / mobile</div>
        </div>
        <div className="text-sm font-extrabold text-cyan-300 border-t border-indigo-800 pt-2 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <span>Trata retorno de validação</span>
        </div>
      </div>

      {/* 3. Center: VALIDA SETIC Box */}
      <div
        ref={validaBoxRef}
        className="absolute left-[740px] top-[310px] w-[440px] h-[460px] p-8 rounded-3xl bg-[#070b28] border-4 border-blue-500 shadow-[0_0_60px_rgba(48,80,255,0.5)] z-20 flex flex-col justify-between items-center text-center overflow-hidden transition-all duration-300"
      >
        {/* Animated Laser Scanning Beam */}
        <div className="absolute left-0 right-0 top-0 h-[5px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_20px_#38bdf8] animate-[scan_1.6s_ease-in-out_infinite_alternate]" />

        <div className="w-20 h-20 rounded-2xl bg-blue-900/60 border-2 border-blue-400 flex items-center justify-center shadow-lg">
          <Cpu className="w-12 h-12 text-cyan-300" />
        </div>

        <div>
          <h3 className="text-4xl font-black text-white tracking-wide">
            VALIDA SETIC
          </h3>
          <span className="text-lg text-cyan-200 font-bold block mt-1.5">
            Inspeção & Sanitização
          </span>
        </div>

        {/* High-Contrast Large Status Card */}
        <div
          className={`w-full p-5 rounded-2xl border-3 text-center transition-colors duration-200 shadow-xl ${
            evaluationStatus.status === 'approved'
              ? 'bg-[#022c16] border-emerald-400 text-white'
              : evaluationStatus.status === 'rejected'
              ? 'bg-[#3b020a] border-red-500 text-white'
              : 'bg-[#0f172a] border-blue-400/60 text-white'
          }`}
        >
          <div className="font-black text-2xl text-white tracking-tight">
            {evaluationStatus.message}
          </div>
          <div className="text-base font-bold text-yellow-300 mt-1">
            {evaluationStatus.detail}
          </div>
        </div>

        <div className="text-xs font-bold text-slate-300 tracking-wider uppercase">
          Resposta: Aprovado ou Bloqueado + Motivo
        </div>
      </div>

      {/* 4. Sistema de TI da SETIC (Right) */}
      <div
        className="absolute left-[1440px] top-[370px] w-[380px] h-[340px] p-8 rounded-3xl bg-[#032213] border-4 border-emerald-400 shadow-[0_0_50px_rgba(74,222,128,0.35)] flex flex-col justify-between items-center text-center z-10"
      >
        <div className="w-20 h-20 rounded-2xl bg-emerald-900/60 border-2 border-emerald-400 flex items-center justify-center shadow-lg">
          <Server className="w-11 h-11 text-emerald-300" />
        </div>
        <div>
          <h3 className="text-3xl font-black text-white">Sistema de TI</h3>
          <div className="text-xl text-emerald-300 font-extrabold mt-1">Base de Dados Protegida</div>
        </div>
        <div className="text-base font-bold text-white bg-black/40 px-4 py-2 rounded-xl border border-emerald-500/50">
          Apenas registros válidos são gravados
        </div>
      </div>

      {/* Bottom Testing Controls & Counters with High Contrast (Elevated to clear navigation dock) */}
      <div className="absolute left-20 right-20 bottom-[88px] border-t-2 border-indigo-800/80 pt-4 flex items-center justify-between gap-6 z-20">
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          <span className="text-base text-yellow-300 font-black uppercase tracking-wider shrink-0">
            DISPARAR TESTE:
          </span>
          {DEMO_ITEMS.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => runPacket(item)}
              className="text-sm px-4 py-2 rounded-xl bg-[#450a0a] hover:bg-[#7f1d1d] text-white border-2 border-red-500 font-extrabold transition-all flex items-center gap-1.5 shrink-0 shadow cursor-pointer"
            >
              <X className="w-4 h-4 text-red-400" />
              <span>{item.label.split(':')[0]}: Inválido</span>
            </button>
          ))}
          {DEMO_ITEMS.slice(4, 6).map((item) => (
            <button
              key={item.id}
              onClick={() => runPacket(item)}
              className="text-sm px-4 py-2 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white border-2 border-emerald-400 font-extrabold transition-all flex items-center gap-1.5 shrink-0 shadow cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>{item.label.split(':')[0]}: Válido</span>
            </button>
          ))}
        </div>

        {/* Live Counters with Solid Background and High Contrast */}
        <div className="flex items-center gap-5 font-mono shrink-0">
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#032916] border-2 border-emerald-400 text-white shadow">
            <span className="text-base font-bold text-emerald-300">Aprovados:</span>
            <span className="font-black text-2xl text-emerald-400">{approvedCount}</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#3f080f] border-2 border-red-500 text-white shadow">
            <span className="text-base font-bold text-red-300">Bloqueados:</span>
            <span className="font-black text-2xl text-red-400">{blockedCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
