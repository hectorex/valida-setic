import React from 'react';
import { Github, ExternalLink, ArrowLeft, ShieldCheck, Sparkles, Terminal, Layers } from 'lucide-react';

interface LinksHubProps {
  onClose: () => void;
}

export const LinksHub: React.FC<LinksHubProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-[#05071e]/95 backdrop-blur-xl flex flex-col justify-between p-6 sm:p-12 overflow-y-auto font-mono text-white select-none animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-indigo-900/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.3)]">
            <ShieldCheck className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <div className="text-xl font-black text-white tracking-wide">
              &lt;setic_valida/&gt;
            </div>
            <div className="text-xs text-cyan-300 font-semibold">
              Hub de Acesso ao Projeto • Hackathon SETIC 2026
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar aos Slides</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl w-full mx-auto my-auto py-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/80 border border-cyan-400/40 text-cyan-300 text-xs font-bold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Desafio 01: Qualidade de Dados • Quem Mais Corp.</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Escolha como deseja explorar:
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Acesse o repositório com o código-fonte auditável e arquitetura completa, ou abra o protótipo funcional em produção na nuvem.
          </p>
        </div>

        {/* Choice Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Option 1: GitHub Repository */}
          <a
            href="https://github.com/hectorex/valida-setic"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative p-8 rounded-3xl bg-[#080d32] hover:bg-[#0c144a] border-3 border-indigo-500/60 hover:border-cyan-400 shadow-[0_15px_40px_rgba(0,0,0,0.6)] hover:shadow-[0_0_35px_rgba(56,189,248,0.35)] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-indigo-400/50 group-hover:border-cyan-300 flex items-center justify-center mb-6 transition-colors shadow-lg">
                <Github className="w-9 h-9 text-white group-hover:text-cyan-300" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Código-Fonte & Docs
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40 font-mono">
                  GitHub
                </span>
              </div>
              <h2 className="text-2xl font-black text-white group-hover:text-cyan-300 transition-colors mb-3">
                Repositório do Projeto
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Explore os módulos de sanitização, especificações dos contratos REST JSON, regras relacionais e testes automatizados.
              </p>
            </div>

            <div className="pt-4 border-t border-indigo-900/60 flex items-center justify-between text-cyan-300 font-bold text-sm">
              <span className="group-hover:translate-x-1 transition-transform">
                github.com/hectorex/valida-setic
              </span>
              <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>
          </a>

          {/* Option 2: Live Simulator on Render */}
          <a
            href="https://valida-setic.onrender.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative p-8 rounded-3xl bg-[#032213] hover:bg-[#05361e] border-3 border-emerald-500/60 hover:border-emerald-400 shadow-[0_15px_40px_rgba(0,0,0,0.6)] hover:shadow-[0_0_35px_rgba(74,222,128,0.35)] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-emerald-400/50 group-hover:border-emerald-300 flex items-center justify-center mb-6 transition-colors shadow-lg">
                <Layers className="w-9 h-9 text-emerald-400 group-hover:text-emerald-300" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Protótipo Funcional
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono">
                  Online
                </span>
              </div>
              <h2 className="text-2xl font-black text-white group-hover:text-emerald-300 transition-colors mb-3">
                Simulador & Aplicação
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Interaja com o simulador ao vivo hospedado no Render, dispare payloads de teste e veja a validação e sanitização preventiva em tempo real.
              </p>
            </div>

            <div className="pt-4 border-t border-emerald-900/60 flex items-center justify-between text-emerald-300 font-bold text-sm">
              <span className="group-hover:translate-x-1 transition-transform">
                valida-setic.onrender.com
              </span>
              <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>
          </a>
        </div>
      </div>

      {/* Footer Credits */}
      <div className="max-w-4xl w-full mx-auto pt-6 border-t border-indigo-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
        <div>
          <span>Grupo Quem Mais Corp.: </span>
          <span className="text-white font-bold">Celso Hector • Judson Gabriel • Luiz Felipe</span>
        </div>
        <div className="text-cyan-300 font-bold font-mono">
          Hackathon SETIC Rondônia • 2026
        </div>
      </div>
    </div>
  );
};
