import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  RotateCcw,
  Volume2,
  VolumeX,
  FileText,
  Play,
  Pause,
  Grid,
} from 'lucide-react';
import { SlideInfo } from '../types';
import { sfx } from '../audio';

interface NavigationProps {
  currentSlide: number;
  totalSlides: number;
  slides: SlideInfo[];
  onSelectSlide: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onRestart: () => void;
  isNotesOpen: boolean;
  onToggleNotes: () => void;
  autoPlay: boolean;
  onToggleAutoPlay: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentSlide,
  totalSlides,
  slides,
  onSelectSlide,
  onNext,
  onPrev,
  onRestart,
  isNotesOpen,
  onToggleNotes,
  autoPlay,
  onToggleAutoPlay,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(sfx.enabled);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = React.useRef<number | null>(null);

  // Auto-hide navigation after 2 seconds of inactivity
  const resetTimer = React.useCallback(() => {
    setIsVisible(true);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    // Only schedule hide if drawer is not open and user is not actively hovering the bar
    if (!isHovered && !showDrawer) {
      timerRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    }
  }, [isHovered, showDrawer]);

  React.useEffect(() => {
    const handleActivity = () => {
      resetTimer();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('pointermove', handleActivity);

    // Initial timeout trigger
    resetTimer();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('pointermove', handleActivity);
    };
  }, [resetTimer]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const toggleSound = () => {
    sfx.enabled = !audioEnabled;
    setAudioEnabled(!audioEnabled);
  };

  const progressPercent = ((currentSlide + 1) / totalSlides) * 100;

  return (
    <>
      {/* Top / Bottom Progress hairline indicator */}
      <div
        className={`fixed bottom-0 left-0 w-full h-[3px] bg-slate-900/80 z-50 transition-opacity duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 transition-all duration-500 ease-out shadow-[0_0_12px_#3050ff]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Floating Presentation Control Dock with 2s Auto-Hide */}
      <nav
        aria-label="Controles da apresentação"
        onMouseEnter={() => {
          setIsHovered(true);
          setIsVisible(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          resetTimer();
        }}
        className={`fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border border-indigo-500/40 backdrop-blur-md shadow-2xl font-mono text-xs select-none transition-all duration-500 ease-out ${
          isVisible
            ? 'opacity-80 hover:opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        {/* Previous Button */}
        <button
          onClick={onPrev}
          disabled={currentSlide === 0}
          title="Slide anterior (Seta Esquerda)"
          className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Slide Dots */}
        <div className="flex items-center gap-1.5 px-1">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => onSelectSlide(idx)}
              title={`${String(idx + 1).padStart(2, '0')}. ${s.shortDesc}`}
              className={`group relative flex items-center justify-center transition-all duration-300 ${
                currentSlide === idx ? 'w-5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3050ff]' : 'w-2 h-2 rounded-full bg-slate-600 hover:bg-slate-400'
              }`}
            >
              {/* Tooltip on dot hover */}
              <span className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none hidden group-hover:block whitespace-nowrap px-2 py-0.5 rounded bg-black/90 border border-indigo-500/40 text-[10px] text-slate-200">
                {String(idx + 1).padStart(2, '0')} - {s.shortDesc}
              </span>
            </button>
          ))}
        </div>

        {/* Counter */}
        <span className="px-1 text-slate-300 text-[11px] font-semibold tracking-wider">
          {String(currentSlide + 1).padStart(2, '0')}/{String(totalSlides).padStart(2, '0')}
        </span>

        {/* Next Button */}
        <button
          onClick={onNext}
          disabled={currentSlide === totalSlides - 1}
          title="Próximo slide (Espaço ou Seta Direita)"
          className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-3.5 bg-slate-700/60 mx-1" />

        {/* Slide Overview Drawer Toggle */}
        <button
          onClick={() => setShowDrawer(!showDrawer)}
          title="Ver todos os slides (Grade)"
          className={`p-1.5 rounded-full transition-colors ${
            showDrawer ? 'text-blue-400 bg-blue-950/60' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        {/* Speaker Notes Toggle */}
        <button
          onClick={onToggleNotes}
          title="Notas do apresentador (Dossiê e Roteiro)"
          className={`p-1.5 rounded-full transition-colors ${
            isNotesOpen ? 'text-cyan-400 bg-cyan-950/60' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
        </button>

        {/* Auto-Play Toggle */}
        <button
          onClick={onToggleAutoPlay}
          title={autoPlay ? 'Pausar avanço automático' : 'Avanço automático (10s/slide)'}
          className={`p-1.5 rounded-full transition-colors ${
            autoPlay ? 'text-amber-400 bg-amber-950/60' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          title={audioEnabled ? 'Mutar efeitos sonoros' : 'Ativar efeitos sonoros'}
          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Restart Button */}
        <button
          onClick={onRestart}
          title="Reiniciar apresentação (Tecla R)"
          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          title="Alternar tela cheia (Tecla F)"
          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </nav>

      {/* Slide Overview Grid Modal */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-8 overflow-y-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-6 border-b border-indigo-900/40 max-w-6xl w-full mx-auto">
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Navegação Rápida — Hackathon SETIC
              </h2>
              <p className="text-xs text-indigo-300/70">
                Selecione um slide para navegar diretamente ou pressione ESC para fechar.
              </p>
            </div>
            <button
              onClick={() => setShowDrawer(false)}
              className="px-4 py-1.5 text-xs rounded border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Fechar (ESC)
            </button>
          </div>

          <div className="grid grid-cols-3 gap-5 max-w-6xl w-full mx-auto my-auto pt-6">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelectSlide(idx);
                  setShowDrawer(false);
                }}
                className={`text-left p-4 rounded-lg border transition-all duration-200 group ${
                  currentSlide === idx
                    ? 'border-blue-500 bg-blue-950/40 shadow-[0_0_20px_rgba(48,80,255,0.3)]'
                    : 'border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-indigo-400 mb-2 font-mono">
                  <span>SLIDE {String(idx + 1).padStart(2, '0')}</span>
                  <span className="text-[10px] text-slate-500">{s.speakerNotes.presenter}</span>
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {s.shortDesc}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
