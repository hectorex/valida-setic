import React, { useState, useEffect, useRef } from 'react';
import {
  Rocket,
  Globe,
  BookOpen,
  KeyRound,
  MapPin,
  ShieldCheck,
  Landmark,
  Code2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { sfx } from '../audio';

interface Differential {
  id: number;
  title: string;
  category: string;
  tagColor: string;
  icon: React.ReactNode;
  howWeHelp: string;
  benefit: string;
}

const DIFFERENTIALS: Differential[] = [
  {
    id: 1,
    title: 'Integração de Mais Sistemas',
    category: 'ESCALABILIDADE',
    tagColor: 'bg-blue-600 text-white',
    icon: <Globe className="w-10 h-10 text-cyan-300" />,
    howWeHelp: 'Conexão única para RH, Saúde, Segurança e Educação.',
    benefit: 'Qualquer sistema consome a mesma API via REST JSON.',
  },
  {
    id: 2,
    title: 'Catálogo de Regras Ampliado',
    category: 'QUALIDADE DE DADOS',
    tagColor: 'bg-emerald-600 text-white',
    icon: <BookOpen className="w-10 h-10 text-emerald-300" />,
    howWeHelp: 'Validações relacionais complexas entre múltiplos campos.',
    benefit: 'Verifica datas invertidas, vínculos e duplicidades na entrada.',
  },
  {
    id: 3,
    title: 'Chave por Sistema',
    category: 'SEGURANÇA',
    tagColor: 'bg-amber-600 text-white',
    icon: <KeyRound className="w-10 h-10 text-amber-300" />,
    howWeHelp: 'Cada sistema chama a API com a sua própria chave de acesso.',
    benefit: 'O painel sabe com certeza qual sistema enviou cada dado.',
  },
  {
    id: 4,
    title: 'Municípios do Brasil Inteiro',
    category: 'ABRANGÊNCIA',
    tagColor: 'bg-purple-600 text-white',
    icon: <MapPin className="w-10 h-10 text-purple-300" />,
    howWeHelp: 'Tabela nacional do IBGE com a UF, além dos 52 municípios de Rondônia.',
    benefit: 'Atende cidadão de outro estado e campos como naturalidade.',
  },
  {
    id: 5,
    title: 'Barreira Pré-Data Lake',
    category: 'INTEGRIDADE',
    tagColor: 'bg-indigo-600 text-white',
    icon: <ShieldCheck className="w-10 h-10 text-indigo-300" />,
    howWeHelp: 'Alimenta as bases de inteligência apenas com dados limpos.',
    benefit: 'Evita que dado errado chegue às bases de análise.',
  },
  {
    id: 6,
    title: 'Governança Estadual Unificada',
    category: 'GOVERNANÇA',
    tagColor: 'bg-pink-600 text-white',
    icon: <Landmark className="w-10 h-10 text-pink-300" />,
    howWeHelp: 'Alinhamento com o PDTIC 2024-2027 e a IN nº 05/2026 de Rondônia.',
    benefit: 'Alinhamento direto com as metas estratégicas da SETIC.',
  },
  {
    id: 7,
    title: 'Regras por Sistema',
    category: 'PERSONALIZAÇÃO',
    tagColor: 'bg-teal-600 text-white',
    icon: <Code2 className="w-10 h-10 text-teal-300" />,
    howWeHelp: 'Cada sistema com os seus campos obrigatórios (ex.: um que dispensa e-mail).',
    benefit: 'A mesma API, ajustada à realidade de cada órgão.',
  },
  {
    id: 8,
    title: 'Novos Tipos de Dado',
    category: 'CATÁLOGO',
    tagColor: 'bg-cyan-600 text-white',
    icon: <Sparkles className="w-10 h-10 text-cyan-300" />,
    howWeHelp: 'CNPJ, CEP, título de eleitor e valores monetários.',
    benefit: 'Cada tipo novo é um validador a mais, sem mexer em quem já integra.',
  },
];

export const Slide08Future: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');

  // Automatic slow sliding carousel every 3.6 seconds
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideDirection('right');
      setCurrentIndex((prev) => (prev + 1) % DIFFERENTIALS.length);
    }, 3600);

    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    sfx.playKeyClick();
    setSlideDirection('left');
    setCurrentIndex((prev) => (prev === 0 ? DIFFERENTIALS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    sfx.playKeyClick();
    setSlideDirection('right');
    setCurrentIndex((prev) => (prev + 1) % DIFFERENTIALS.length);
  };

  // Get 3 visible items centered on current index
  const visibleIndices = [
    (currentIndex - 1 + DIFFERENTIALS.length) % DIFFERENTIALS.length,
    currentIndex,
    (currentIndex + 1) % DIFFERENTIALS.length,
  ];

  return (
    <div className="relative w-full h-full p-20 font-mono select-none overflow-hidden flex flex-col justify-between">
      {/* Header section with high-contrast typography */}
      <div className="text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-3 text-base text-cyan-300 font-extrabold tracking-widest uppercase mb-2">
          <Rocket className="w-5 h-5 text-cyan-300" />
          <span>Visão de Futuro & Diferenciais</span>
        </div>
        <h2 className="text-3xl lg:text-[42px] font-black text-white tracking-tight leading-snug">
          "Agora temos esse protótipo com o pouco tempo e recurso que tivemos. Imaginem as possibilidades futuras com a idealização certa."
        </h2>
      </div>

      {/* Center Prototype Status Pill */}
      <div className="mx-auto flex items-center gap-4 bg-[#0a1038] border-2 border-blue-400 px-6 py-2.5 rounded-full shadow-lg">
        <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white font-black text-lg">VALIDA SETIC:</span>
        <span className="text-cyan-300 font-bold text-base">Protótipo Funcional Entregue no Hackathon</span>
        <span className="text-xs bg-blue-600 text-white font-extrabold px-3 py-1 rounded-md">
          FastAPI + SQLAlchemy
        </span>
      </div>

      {/* --- Slow Auto-Gliding Carousel with 3 Visible Cards --- */}
      <div className="relative w-full max-w-6xl mx-auto flex items-center justify-between gap-6 my-auto">
        {/* Left Arrow Button */}
        <button
          onClick={handlePrev}
          title="Diferencial anterior"
          className="w-14 h-14 rounded-2xl bg-[#080d32] border-2 border-blue-400 hover:bg-blue-600 text-white flex items-center justify-center transition-all shadow-xl shrink-0 z-20 cursor-pointer"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>

        {/* 3 Visible Carousel Cards with Smooth Keyframe Slide Transition */}
        <div className="flex-1 grid grid-cols-3 gap-6 items-stretch">
          {visibleIndices.map((itemIdx, pos) => {
            const item = DIFFERENTIALS[itemIdx];
            const isCenter = pos === 1;

            return (
              <div
                key={`${item.id}-${pos}`}
                className={`p-7 rounded-3xl transition-all duration-700 ease-out flex flex-col justify-between shadow-2xl ${
                  isCenter
                    ? 'bg-[#080e3c] border-4 border-cyan-400 scale-105 shadow-[0_0_50px_rgba(56,189,248,0.4)] z-10'
                    : 'bg-[#060a26] border-2 border-indigo-700/60 opacity-75 scale-95'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-black/50 border border-white/10 shadow">
                      {item.icon}
                    </div>
                    <span className={`text-xs font-black tracking-wider px-3.5 py-1 rounded-lg uppercase shadow ${item.tagColor}`}>
                      {item.category}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-white leading-tight mb-3">
                    {item.title}
                  </h3>

                  <div className="space-y-3 font-sans">
                    <div className="p-3.5 rounded-xl bg-black/50 border border-indigo-800">
                      <div className="text-xs font-black text-yellow-300 uppercase tracking-wide mb-1 font-mono">
                        Como Ajudamos:
                      </div>
                      <div className="text-base font-bold text-white leading-snug">
                        {item.howWeHelp}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#042916] border border-emerald-500/50">
                      <div className="text-xs font-black text-emerald-400 uppercase tracking-wide mb-1 font-mono">
                        Impacto para a SETIC:
                      </div>
                      <div className="text-sm font-bold text-white leading-snug">
                        {item.benefit}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Animated auto-advance progress indicator on center card */}
                {isCenter && (
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-4">
                    <div
                      key={currentIndex}
                      className="bg-cyan-400 h-full animate-[progress_3.6s_linear_infinite]"
                      style={{
                        animation: 'growWidth 3.6s linear infinite',
                      }}
                    />
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-mono">
                  <span className="font-bold">Diferencial {item.id} de {DIFFERENTIALS.length}</span>
                  <span className="text-cyan-300 font-black">Avanço Automático</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={handleNext}
          title="Próximo diferencial"
          className="w-14 h-14 rounded-2xl bg-[#080d32] border-2 border-blue-400 hover:bg-blue-600 text-white flex items-center justify-center transition-all shadow-xl shrink-0 z-20 cursor-pointer"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      </div>

      {/* Carousel Progress Dots */}
      <div className="flex justify-center items-center gap-3">
        {DIFFERENTIALS.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setCurrentIndex(i)}
            title={d.title}
            className={`transition-all duration-300 cursor-pointer ${
              currentIndex === i
                ? 'w-12 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_15px_#38bdf8]'
                : 'w-3 h-3 rounded-full bg-slate-600 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>

      {/* Footer Caution */}
      <div className="border-t-2 border-indigo-800 pt-4 flex items-center justify-between text-base text-slate-300 font-mono">
        <span className="text-yellow-300 font-extrabold text-lg">
          * Possibilidades futuras e visão de evolução arquitetural — demonstrando onde o projeto pode chegar.
        </span>
        <span className="text-cyan-400 font-black">
          PDTIC 2024-2027 & Portaria 180/2023
        </span>
      </div>
    </div>
  );
};
