import React, { useEffect, useState, useRef, useMemo } from 'react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { Sparkles, QrCode, Github, ExternalLink, Smartphone, CheckCircle2, Layers } from 'lucide-react';
import { sfx } from '../audio';

interface Slide09ClosingProps {
  onRestart?: () => void;
  onOpenHub?: () => void;
}

type QRDestination = 'hub' | 'render' | 'github';

export const Slide09Closing: React.FC<Slide09ClosingProps> = ({ onOpenHub }) => {
  const [typedThanks, setTypedThanks] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<QRDestination>('hub');
  const thanksFull = '<Obrigado!/>';
  const containerRef = useRef<HTMLDivElement>(null);

  const finalSentence =
    'Nossa solução, seu problema, juntos modernizando o nosso estado.';
  const words = finalSentence.split(' ');

  // Determine current active URL based on selected target
  const currentUrl = useMemo(() => {
    if (selectedTarget === 'render') {
      return 'https://valida-setic.onrender.com/';
    }
    if (selectedTarget === 'github') {
      return 'https://github.com/hectorex/valida-setic';
    }

    // Default Hub target:
    // If running in development (localhost/127.0.0.1), use the public preview URL so phones can open it!
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'https://ais-pre-yrycj3hrb23u3tcv47u4sc-255303742017.us-west1.run.app/?hub=1';
      }
      const url = new URL(window.location.href);
      url.searchParams.set('hub', '1');
      url.hash = '';
      return url.toString();
    }
    return 'https://valida-setic.onrender.com/';
  }, [selectedTarget]);

  // Generate large, high-contrast, scannable QR Code
  useEffect(() => {
    QRCode.toDataURL(currentUrl, {
      width: 480,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        setQrCodeDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
      });
  }, [currentUrl]);

  // Animations
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Staggered words entrance
      gsap.from('.closing-word', {
        opacity: 0,
        y: 30,
        rotationX: -40,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.1,
      });

      // Typewriter for Obrigado
      setTimeout(() => {
        let idx = 0;
        const interval = window.setInterval(() => {
          if (idx <= thanksFull.length) {
            setTypedThanks(thanksFull.slice(0, idx));
            sfx.playKeyClick();
            idx++;
          } else {
            clearInterval(interval);
            // Particle celebration
            confetti({
              particleCount: 70,
              spread: 85,
              origin: { y: 0.45 },
              colors: ['#38bdf8', '#2dff9a', '#ffd23f', '#ffffff', '#6366f1'],
              disableForReducedMotion: true,
            });
            sfx.playSuccess();
          }
        }, 95);
      }, 1000);

      // QR Center card and footer entrance
      gsap.from('.qr-center-card', {
        opacity: 0,
        scale: 0.92,
        y: 20,
        duration: 0.8,
        delay: 1.8,
        ease: 'power2.out',
      });

      gsap.from('.closing-footer', {
        opacity: 0,
        y: 15,
        duration: 0.6,
        delay: 2.2,
        ease: 'power2.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSelectTarget = (target: QRDestination) => {
    sfx.playKeyClick();
    setSelectedTarget(target);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full pt-10 pb-8 px-20 font-mono select-none overflow-hidden flex flex-col justify-between"
    >
      {/* Top Tagline */}
      <div className="flex items-center justify-between text-base font-extrabold tracking-widest uppercase">
        <div className="flex items-center gap-3 px-5 py-2 rounded-xl bg-[#080d32]/90 border border-cyan-400/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
          <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
          <span className="text-white">Hackathon SETIC • Rondônia</span>
        </div>
        <div className="text-xl font-black text-cyan-300 drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]">
          Desafio 01 Concluído
        </div>
      </div>

      {/* Hero: Obrigado in big glowing white + Mandatory sentence */}
      <div className="text-center max-w-5xl mx-auto my-auto space-y-2">
        <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
          {words.map((w, idx) => (
            <span key={idx} className="closing-word inline-block mr-2.5 text-white">
              {w}
            </span>
          ))}
        </h2>

        {/* Big Impact Glowing White Obrigado */}
        <div>
          <div className="text-7xl lg:text-[100px] font-black text-white drop-shadow-[0_0_35px_rgba(56,189,248,0.95)] drop-shadow-[0_0_80px_rgba(48,80,255,0.7)] tracking-tight leading-tight">
            {typedThanks}
            <span className="animate-blink text-cyan-300 drop-shadow-[0_0_20px_#38bdf8] ml-2">▌</span>
          </div>
        </div>

        {/* CENTERED LARGE QR CODE CARD */}
        <div className="qr-center-card pt-2">
          <div className="max-w-2xl mx-auto p-5 rounded-3xl bg-[#080d32]/95 border-3 border-cyan-400/80 shadow-[0_0_50px_rgba(56,189,248,0.4)] flex flex-col items-center">
            
            {/* Header with Title and Mode Selector Tabs */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-indigo-800/80">
              <div className="flex items-center gap-2 text-cyan-300 font-black text-sm uppercase tracking-wider">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <span>Aponte a Câmera do Celular</span>
              </div>

              {/* Mode Toggle Pills */}
              <div className="flex items-center gap-1.5 bg-[#030617] p-1 rounded-xl border border-indigo-800">
                <button
                  onClick={() => handleSelectTarget('hub')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedTarget === 'hub'
                      ? 'bg-blue-600 text-white shadow-[0_0_10px_#3050ff]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Hub Completo
                </button>
                <button
                  onClick={() => handleSelectTarget('render')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedTarget === 'render'
                      ? 'bg-emerald-600 text-white shadow-[0_0_10px_#10b981]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Simulador
                </button>
                <button
                  onClick={() => handleSelectTarget('github')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedTarget === 'github'
                      ? 'bg-indigo-600 text-white shadow-[0_0_10px_#6366f1]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  GitHub
                </button>
              </div>
            </div>

            {/* Centered Large QR Code */}
            <div className="my-4 flex flex-col items-center">
              <div className="relative p-2.5 rounded-2xl bg-white shadow-2xl border-4 border-cyan-400">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code de Acesso"
                    className="w-52 h-52 object-contain"
                  />
                ) : (
                  <div className="w-52 h-52 bg-slate-100 flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-slate-400 animate-pulse" />
                  </div>
                )}
              </div>

              <div className="text-xs text-cyan-200 mt-2 font-mono max-w-lg text-center truncate">
                <span className="text-slate-400">Destino: </span>
                <span className="text-yellow-300 font-bold">{currentUrl}</span>
              </div>
            </div>

            {/* Direct Action Buttons for presenter or laptop audience */}
            <div className="w-full flex items-center justify-center gap-3 pt-3 border-t border-indigo-800/80">
              <a
                href="https://github.com/hectorex/valida-setic"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-blue-950 hover:bg-blue-600 text-white border-2 border-blue-400 text-xs font-extrabold flex items-center gap-2 transition-all shadow hover:scale-105"
              >
                <Github className="w-4 h-4 text-cyan-300" />
                <span>Repositório GitHub</span>
                <ExternalLink className="w-3.5 h-3.5 text-cyan-300" />
              </a>

              <a
                href="https://valida-setic.onrender.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-600 text-white border-2 border-emerald-400 text-xs font-extrabold flex items-center gap-2 transition-all shadow hover:scale-105"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Simulador Render</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              </a>

              {onOpenHub && (
                <button
                  onClick={onOpenHub}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-cyan-400/50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Abrir Hub de Links na Tela"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ver Hub</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="closing-footer border-t-2 border-indigo-700/80 pt-4 flex justify-between items-end">
        <div>
          <span className="text-base text-amber-300 font-black uppercase tracking-wider block">
            PROPOSTA DE ARQUITETURA
          </span>
          <span className="text-xl text-white font-bold">
            Verificação preventiva antes da gravação em banco
          </span>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black tracking-wider text-white">
            GRUPO QUEM MAIS CORP.
          </div>
          <div className="text-lg text-cyan-200 mt-0.5 font-extrabold flex items-center justify-end gap-3">
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
