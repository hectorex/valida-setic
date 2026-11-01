import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { AlertCircle, Server, AlertTriangle } from 'lucide-react';
import { sfx } from '../audio';

interface ProblemPacket {
  from: 'A' | 'B';
  content: string;
  tag: string;
  isInvalid: boolean;
}

const SEQUENCE_PACKETS: ProblemPacket[] = [
  { from: 'A', content: 'CPF: 111.111.111-11', tag: 'Com Pontuação', isInvalid: false },
  { from: 'B', content: 'CPF: 11111111111', tag: 'Sem Pontuação', isInvalid: false },
  { from: 'A', content: 'DATA: 31/02/1980', tag: 'Dia Inexistente!', isInvalid: true },
  { from: 'B', content: 'EMAIL: usuario@', tag: 'Falta Domínio!', isInvalid: true },
  { from: 'A', content: 'NOME:   João Silva  ', tag: 'Espaços Extras', isInvalid: false },
  { from: 'B', content: 'DATA: 1980-02-31', tag: 'ISO Fora de Padrão', isInvalid: true },
];

export const Slide03Problem: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<HTMLDivElement>(null);
  const [currentPacket, setCurrentPacket] = useState<ProblemPacket>(SEQUENCE_PACKETS[0]);
  const [ingestedCount, setIngestedCount] = useState(0);

  // Sequential packet flight: ONE by ONE along the exact vector line into the SETIC IT box
  useEffect(() => {
    const el = packetRef.current;
    if (!el) return;

    let index = 0;
    let isCancelled = false;

    const runNext = () => {
      if (isCancelled) return;
      const pkt = SEQUENCE_PACKETS[index % SEQUENCE_PACKETS.length];
      setCurrentPacket(pkt);

      const startX = 480;
      const startY = pkt.from === 'A' ? 415 : 715;
      const targetX = 1360;
      const targetY = pkt.from === 'A' ? 520 : 640;

      gsap.timeline()
        .set(el, {
          left: startX,
          top: startY,
          yPercent: -50,
          opacity: 0,
          scale: 0.8,
          backgroundColor: pkt.isInvalid ? '#500713' : '#0a1038',
          borderColor: pkt.isInvalid ? '#f87171' : '#60a5fa',
        })
        .to(el, { opacity: 1, scale: 1, duration: 0.25 })
        // Travels cleanly along the line into the SETIC box
        .to(el, {
          left: targetX,
          top: targetY,
          duration: 2.2,
          ease: 'power1.inOut',
        })
        // Swallowed inside without validation
        .to(el, {
          opacity: 0,
          scale: 0.4,
          duration: 0.3,
          onComplete: () => {
            setIngestedCount((c) => c + 1);
            sfx.playKeyClick();
            index++;
            // Pause briefly then launch the NEXT packet
            setTimeout(runNext, 600);
          },
        });
    };

    runNext();

    return () => {
      isCancelled = true;
      if (el) gsap.killTweensOf(el);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full p-20 font-mono select-none overflow-hidden"
    >
      {/* Header section with generous breathing room */}
      <div className="max-w-6xl">
        <div className="flex items-center gap-3 text-base text-amber-400 font-bold tracking-widest uppercase mb-2">
          <AlertCircle className="w-5 h-5 text-amber-400" />
          <span>Diagnóstico do Cenário Atual</span>
        </div>
        <h2 className="text-3xl lg:text-[42px] font-black text-white tracking-tight leading-snug">
          Hoje: cada sistema envia no seu formato, sem padronização antes da gravação.
        </h2>
      </div>

      {/* SVG Vector Connection Lines */}
      <svg
        className="absolute left-0 top-0 w-[1920px] h-[1080px] pointer-events-none z-0"
        viewBox="0 0 1920 1080"
      >
        {/* Line from Sistema A (480, 415) to SETIC IT (1360, 520) */}
        <line
          x1="480"
          y1="415"
          x2="1360"
          y2="520"
          stroke="#6f7bff"
          strokeWidth="4"
          strokeDasharray="14 10"
          strokeOpacity="0.75"
        />
        {/* Line from Sistema B (480, 715) to SETIC IT (1360, 640) */}
        <line
          x1="480"
          y1="715"
          x2="1360"
          y2="640"
          stroke="#6f7bff"
          strokeWidth="4"
          strokeDasharray="14 10"
          strokeOpacity="0.75"
        />
      </svg>

      {/* Single Flying Sequential Packet (Follows lines with large text) */}
      <div
        ref={packetRef}
        className="absolute z-20 px-6 py-3.5 rounded-xl border-3 shadow-2xl pointer-events-none opacity-0 flex items-center gap-3 text-xl font-black text-white"
      >
        <span>{currentPacket.content}</span>
        <span
          className={`text-sm px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
            currentPacket.isInvalid
              ? 'bg-red-950 text-red-200 border border-red-500'
              : 'bg-indigo-950 text-indigo-200 border border-indigo-400'
          }`}
        >
          {currentPacket.tag}
        </span>
      </div>

      {/* Left Column: Sistema A and Sistema B (Generously spaced below title) */}
      {/* Sistema A */}
      <div className="absolute left-[120px] top-[320px] w-[360px] h-[190px] p-6 rounded-2xl bg-[#080d32] border-3 border-blue-400 shadow-2xl flex flex-col justify-between z-10">
        <div className="flex items-center justify-between">
          <span className="text-3xl font-black text-white">Sistema A</span>
          <span className="px-3 py-1 rounded bg-blue-600 text-white font-black text-xs uppercase shadow">
            ORIGEM 1
          </span>
        </div>
        <div>
          <div className="text-xl font-bold text-yellow-300">Ex: RH / SID</div>
          <div className="text-sm font-bold text-white mt-1">Usa padrões e máscaras próprias</div>
        </div>
        <div className="text-xs font-black text-cyan-300 border-t border-indigo-800 pt-2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Envia dados sem barreira central</span>
        </div>
      </div>

      {/* Sistema B */}
      <div className="absolute left-[120px] top-[620px] w-[360px] h-[190px] p-6 rounded-2xl bg-[#080d32] border-3 border-blue-400 shadow-2xl flex flex-col justify-between z-10">
        <div className="flex items-center justify-between">
          <span className="text-3xl font-black text-white">Sistema B</span>
          <span className="px-3 py-1 rounded bg-blue-600 text-white font-black text-xs uppercase shadow">
            ORIGEM 2
          </span>
        </div>
        <div>
          <div className="text-xl font-bold text-yellow-300">Ex: Portal do Cidadão</div>
          <div className="text-sm font-bold text-white mt-1">Outra stack / Sem validação semântica</div>
        </div>
        <div className="text-xs font-black text-cyan-300 border-t border-indigo-800 pt-2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Envia dados sem barreira central</span>
        </div>
      </div>

      {/* Right Column: Sistema de TI da SETIC */}
      <div className="absolute left-[1360px] top-[340px] w-[440px] h-[470px] p-8 rounded-3xl bg-[#070b28] border-4 border-indigo-400 shadow-[0_0_60px_rgba(48,80,255,0.4)] flex flex-col justify-between items-center text-center z-10">
        <div className="w-20 h-20 rounded-2xl bg-blue-900/60 border-2 border-blue-400 flex items-center justify-center shadow-lg">
          <Server className="w-11 h-11 text-blue-300" />
        </div>

        <div>
          <h3 className="text-3xl font-black text-white">
            Sistema de TI da SETIC
          </h3>
          <p className="text-lg text-yellow-300 font-bold mt-1">
            Bancos de Dados Corporativos
          </p>
        </div>

        {/* Big Alert Notice */}
        <div className="w-full p-5 rounded-2xl bg-[#321204] border-3 border-amber-400 text-left shadow-lg">
          <div className="flex items-center gap-2 text-yellow-300 font-black text-base mb-1.5 uppercase tracking-wider">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Ingestão Sem Barreira Central</span>
          </div>
          <p className="text-sm text-white font-bold font-sans leading-relaxed">
            Dados válidos e inválidos entram diretamente na base sem pré-validação centralizada.
          </p>
        </div>

        <div className="text-base text-white font-black font-mono">
          Registros recebidos na sessão: <span className="text-cyan-400 font-black text-2xl ml-2">{ingestedCount}</span>
        </div>
      </div>

      {/* Bottom Footer Note with high contrast */}
      <div className="absolute left-20 right-20 bottom-12 border-t-2 border-indigo-800 pt-4 flex items-center justify-between text-base font-mono">
        <span className="text-yellow-300 font-black text-xl">
          * Diagrama conceitual do problema que o Desafio 01 visa solucionar.
        </span>
        <span className="text-base text-cyan-300 font-black">
          Sem camada central = inconsistências chegam até a base de dados
        </span>
      </div>
    </div>
  );
};
