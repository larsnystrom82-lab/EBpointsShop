'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, ExternalLink, AlertCircle, Lightbulb } from 'lucide-react';
import { useFeedback } from './FeedbackContext';

export const Footer: React.FC = () => {
  const { openFeedback } = useFeedback();
  return (
    <footer className="border-t border-slate-200 bg-white py-10 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & mission */}
          <div className="md:col-span-2 space-y-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-900 group"
              title="Gå till första sidan: Jämför bonuspoäng"
              aria-label="bonuslotsen.se - Gå till första sidan: Jämför bonuspoäng"
            >
              <div
                className="w-8 h-8 relative flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                title="bonuslotsen.se-ikonen – Klicka för att gå till första sidan"
              >
                <Image
                  src="/logo.png"
                  alt="bonuslotsen.se"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                bonuslotsen.se
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed">
              Oberoende konsumentverktyg för att jämföra och maximera SAS EuroBonus-poäng vid
              vardagsköp via partnerbutiker, presentkort och anslutna kreditkort.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100 % oberoende och kostnadsfri tjänst</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Navigering
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <Link href="/" className="hover:text-blue-600 transition-colors">
                  Jämför bonuspoäng
                </Link>
              </li>
              <li>
                <Link href="/#butiker" className="hover:text-blue-600 transition-colors">
                  Alla butiker
                </Link>
              </li>
              <li>
                <Link href="/lankar" className="hover:text-blue-600 transition-colors">
                  Verktyg &amp; Länkar
                </Link>
              </li>
              <li>
                <Link href="/om" className="hover:text-blue-600 transition-colors font-medium text-slate-800">
                  Om bonuslotsen.se &amp; Villkor
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openFeedback({ category: 'suggestion' })}
                  className="hover:text-blue-600 transition-colors text-left font-medium text-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>Lämna feedback &amp; förslag</span>
                </button>
              </li>
            </ul>
          </div>

          {/* External resources */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Externa resurser
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <a
                  href="https://eurobonusguiden.se/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  <span>EuroBonusguiden.se</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://onlineshopping.flysas.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  <span>SAS Online Shopping</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.sas.se/eurobonus/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  <span>SAS EuroBonus Portal</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Ansvarsfriskrivning & Oberoende */}
        <div className="border-t border-slate-200/80 pt-6 mt-6 space-y-4 text-xs text-slate-500 leading-relaxed">
          <p className="text-slate-500">
            bonuslotsen.se är en oberoende jämförelsetjänst och är inte ansluten till, sponsrad av eller godkänd av SAS eller de företag som visas. Varumärkesnamn och logotyper tillhör respektive rättighetsinnehavare och används för att identifiera de företag och tjänster som jämförs.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="flex items-start gap-2 max-w-3xl">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-700">Viktigt: </strong>
                Poängsatser och villkor ändras löpande av SAS och butikerna. Kontrollera alltid
                respektive butiks fullständiga villkor före genomförande av köp.{' '}
                <Link href="/om#villkor" className="text-blue-600 underline hover:text-blue-800">
                  Läs mer om villkor och undantag
                </Link>
                .
              </p>
            </div>
            <p className="shrink-0 text-slate-400">
              © {new Date().getFullYear()} bonuslotsen.se
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
