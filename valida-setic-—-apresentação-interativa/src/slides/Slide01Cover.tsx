import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { sfx } from '../audio';

interface Slide01CoverProps {
  onTransitionReady?: () => void;
  isConfirming?: boolean;
}

export const Slide01Cover: React.FC<Slide01CoverProps> = ({ isConfirming }) => {
  const [typedTitle, setTypedTitle] = useState('');
  const titleFull = '<setic_valida>';
  const titleRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Typewriter effect for <setic_valida>
  useEffect(() => {
    let currentIdx = 0;
    const interval = window.setInterval(() => {
      if (currentIdx <= titleFull.length) {
        setTypedTitle(titleFull.slice(0, currentIdx));
        sfx.playKeyClick();
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 85);

    return () => clearInterval(interval);
  }, []);

  // Entrance animations for credits and metadata
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.fade-elem', {
        opacity: 0,
        y: 25,
        duration: 0.8,
        stagger: 0.15,
        delay: 0.6,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Street Fighter confirmation flash trigger
  useEffect(() => {
    if (isConfirming && titleRef.current) {
      sfx.playConfirmFlash();
      gsap.timeline()
        .to(titleRef.current, {
          color: '#ffffff',
          textShadow: '0 0 60px #ffffff, 0 0 100px #6f7bff',
          scale: 1.08,
          duration: 0.06,
          repeat: 5,
          yoyo: true,
        });
    }
  }, [isConfirming]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col justify-between p-24 font-mono select-none"
    >
      {/* Top Bar: Year & Challenge Tag */}
      <div className="flex justify-between items-start fade-elem">
        <div className="flex items-center gap-3.5 px-6 py-2.5 rounded-xl bg-[#080d32]/90 border-2 border-cyan-400/50 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
          <span className="inline-block w-4 h-4 bg-cyan-400 rounded-sm shadow-[0_0_12px_#38bdf8] animate-pulse" />
          <span className="text-2xl font-black tracking-widest uppercase text-white">
            Hackathon SETIC • Desafio 01: Qualidade de Dados
          </span>
        </div>
        <div className="text-6xl font-black tracking-widest text-cyan-300 font-mono drop-shadow-[0_0_25px_rgba(56,189,248,0.6)]">
          2026
        </div>
      </div>

      {/* Hero Center Title: <setic_valida> with Terminal Cursor */}
      <div className="my-auto">
        <div className="inline-flex items-center gap-3.5 px-6 py-2.5 rounded-xl bg-amber-400/15 border-2 border-amber-400/80 shadow-[0_0_30px_rgba(251,191,36,0.35)] mb-6 fade-elem">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-[0_0_14px_#fbbf24] animate-pulse" />
          <span className="text-2xl lg:text-3xl font-black tracking-wider text-amber-300 uppercase">
            API Centralizada de Validação & Padronização
          </span>
        </div>
        
        <h1
          ref={titleRef}
          className="text-[135px] font-black tracking-tight text-white drop-shadow-[0_0_35px_rgba(56,189,248,0.95)] drop-shadow-[0_0_90px_rgba(48,80,255,0.7)] whitespace-nowrap leading-none transition-transform"
        >
          {typedTitle}
          <span className="animate-blink text-cyan-300 drop-shadow-[0_0_20px_#38bdf8] ml-2">▌</span>
        </h1>

        <p className="mt-8 text-3xl lg:text-4xl text-white font-medium tracking-wide max-w-5xl fade-elem leading-relaxed">
          Garantindo <span className="text-cyan-300 font-bold">qualidade</span>, <span className="text-cyan-300 font-bold">integridade</span> e <span className="text-cyan-300 font-bold">padronização</span> antes que os dados cheguem aos sistemas.
        </p>
      </div>

      {/* Footer Credits: Team QUEM MAIS CORP. */}
      <div className="flex justify-between items-end border-t-2 border-indigo-700/80 pt-8 fade-elem">
        <div>
          <span className="text-lg text-amber-300 font-black block mb-1 uppercase tracking-wider">
            PROPOSTA DE ARQUITETURA
          </span>
          <span className="text-2xl text-white font-bold">
            Verificação preventiva antes da gravação em banco
          </span>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black tracking-wider text-white">
            GRUPO QUEM MAIS CORP.
          </div>
          <div className="text-lg text-cyan-200 mt-1 font-extrabold flex items-center justify-end gap-3">
            <span>Celso Hector</span>
            <span>•</span>
            <span>Judson Gabriel</span>
            <span>•</span>
            <span>Luiz Felipe</span>
          </div>
        </div>
      </div>
    </div>
  );
};
