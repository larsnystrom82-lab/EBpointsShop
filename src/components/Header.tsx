import React from 'react';
import { Sparkles, Info, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onLoadSmegDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLoadSmegDemo }) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                Sverige · SEK
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Oberoende verktyg
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Eurobonus-jakten <span className="text-blue-400 font-normal text-lg sm:text-xl">· EuroBonus-jämförelse</span>
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-300 max-w-2xl">
              Jämför EuroBonus-intjäning mellan butiker och köpvägar för ditt angivna köpbelopp.
              Se poäng via partnerköp, presentkort och dina betalkort.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onLoadSmegDemo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-sm focus:ring-2 focus:ring-blue-400 touch-target"
              title="Laddar Elgiganten, Cervera, Bagaren & Kocken och KitchenTime för 1 995 kr"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Ladda SMEG-exemplet (1 995 kr)</span>
            </button>
          </div>
        </div>

        {/* Demo status alert banner */}
        <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs sm:text-sm text-slate-300">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Demonstrationsläge (Syntetiska testregler):</span>{' '}
            Alla beräkningar baseras på testregler och SMEG-presentationens exempel för att verifiera användarflödet och 10-kronorsgränsen innan produktionskällor aktiveras.
          </div>
        </div>
      </div>
    </header>
  );
};
