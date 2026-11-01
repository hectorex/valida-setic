import React from 'react';
import { X, User, Target, AlertTriangle, ListChecks } from 'lucide-react';
import { SlideInfo } from '../types';

interface SpeakerNotesProps {
  slide: SlideInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const SpeakerNotes: React.FC<SpeakerNotesProps> = ({
  slide,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const { presenter, goal, keyPoints, caution } = slide.speakerNotes;

  return (
    <aside
      aria-label="Notas do Apresentador"
      className="fixed right-6 top-6 bottom-16 w-96 z-50 rounded-xl border border-indigo-500/40 bg-slate-950/92 backdrop-blur-xl p-5 shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-300 text-sm overflow-hidden"
    >
      <div className="flex items-center justify-between pb-3 border-b border-indigo-900/40">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">
            Cartão de Pitch // Slide {String(slide.id).padStart(2, '0')}
          </span>
          <h4 className="text-base font-bold text-white leading-tight">
            {slide.shortDesc}
          </h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 text-slate-300">
        {/* Presenter in charge */}
        <div className="flex items-start gap-2.5 bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-800/30">
          <User className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-mono text-indigo-300">Apresentador Indicado</div>
            <div className="text-xs font-semibold text-white">{presenter}</div>
          </div>
        </div>

        {/* Goal */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-300 mb-1">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span>Objetivo do Momento</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            {goal}
          </p>
        </div>

        {/* Key Points */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-300 mb-1">
            <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pontos Chave para Falar</span>
          </div>
          <ul className="space-y-1.5">
            {keyPoints.map((pt, i) => (
              <li
                key={i}
                className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/40 p-2 rounded border border-slate-800/60"
              >
                <span className="text-emerald-400 font-bold shrink-0">›</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Caution / Dossiê Limits */}
        <div className="bg-amber-950/30 border border-amber-600/40 p-2.5 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Atenção & Limites (Dossiê)</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-normal">
            {caution}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-indigo-900/40 text-[10px] text-slate-400 text-center font-mono">
        Hackathon SETIC • Quem Mais Corp
      </div>
    </aside>
  );
};
