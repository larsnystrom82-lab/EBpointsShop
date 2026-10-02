'use client';

import React, { useState } from 'react';
import { RouteCalculationResult, PaymentCard } from '@/types/domain';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Sparkles,
  Footprints,
  CreditCard,
  Flag,
  CheckCircle2,
} from 'lucide-react';
import Image from 'next/image';
import { formatLastChecked } from '@/lib/utils/formatDate';

interface ResultCardProps {
  route: RouteCalculationResult;
  selectedCards: PaymentCard[];
  onReportError: (route: RouteCalculationResult) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  route,
  selectedCards,
  onReportError,
}) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);

  // Formatting helpers
  const formatKr = (ore: number) => {
    return (ore / 100).toLocaleString('sv-SE', {
      minimumFractionDigits: ore % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  };

  const bestOutcome = route.selectedCardOutcome;
  const totalBonusPoints = bestOutcome ? bestOutcome.totalBonusPoints : route.baseBonusPoints;
  const totalTierPoints = bestOutcome ? bestOutcome.totalTierPoints : route.baseTierPoints;

  // Format date in Swedish locale
  const formattedCheckedTime = formatLastChecked(route.lastCheckedAt, 'Kontrollerad');

  return (
    <article
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
      aria-label={`Erbjudande för ${route.storeName}`}
    >
      {/* 1. Header: Butikslogga, Butiksnamn, Vägtyp & Kampanjbadge */}
      <div className="p-5 sm:p-6 pb-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-20 h-10 relative flex items-center justify-center bg-slate-50 border border-slate-200/80 rounded-lg p-1.5 shrink-0">
              {route.storeLogoUrl ? (
                <Image
                  src={route.storeLogoUrl}
                  alt={route.storeName}
                  width={80}
                  height={36}
                  className="max-h-8 w-auto object-contain"
                />
              ) : (
                <span className="text-xs font-bold text-slate-700">{route.storeName}</span>
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {route.storeName}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {route.routeTitle}
                </span>
                {route.isExplicitCampaign && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    <Sparkles className="w-3 h-3" />
                    Kampanj
                  </span>
                )}
                {route.isOneTimeOffer && (
                  <span className="inline-flex items-center text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                    Engångsbonus
                  </span>
                )}
                {route.demoLabel && (
                  <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    {route.demoLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-medium text-slate-400 block">Totalt utlägg</span>
            <span className="text-base sm:text-lg font-bold text-slate-900">
              {formatKr(route.totalOutlayOre)} kr
            </span>
          </div>
        </div>

        {/* 2. Total bonuspoäng & nivåpoäng (F09: hålls strikt åtskilda!) */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Beräknad intjäning
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl sm:text-4xl font-black text-blue-700 tracking-tight">
                {totalBonusPoints.toLocaleString('sv-SE')}
              </span>
              <span className="text-sm sm:text-base font-bold text-blue-900">
                EuroBonus Extrapoäng
              </span>
            </div>
          </div>

          {/* Separat nivåpoängsredovisning */}
          {totalTierPoints > 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                Nivåpoäng (Status)
              </span>
              <span className="text-lg sm:text-xl font-bold text-emerald-700">
                +{totalTierPoints.toLocaleString('sv-SE')} nivåpoäng
              </span>
            </div>
          ) : (
            <div className="text-right text-xs text-slate-400 self-center">
              0 nivåpoäng
            </div>
          )}
        </div>
      </div>

      {/* 3. Uppdelning per källa: Partner / Presentkort / Kort */}
      <div className="p-5 sm:p-6 py-4 bg-slate-50/70 border-b border-slate-100 space-y-2 text-xs sm:text-sm">
        {route.isOneTimeOffer && (
          <div className="bg-purple-50 border border-purple-200/80 rounded-xl p-3 text-xs text-purple-900 flex items-start gap-2 mb-3">
            <span className="font-bold shrink-0">ℹ️ Engångserbjudande:</span>
            <span>
              {route.oneTimeTerms || 'Denna bonus faller inte ut per 100 kr, utan utgör en fast engångsbonus vid första köpet/tecknandet.'}
            </span>
          </div>
        )}

        <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
          Poängspecifikation:
        </div>

        {route.breakdown.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-2 text-slate-700">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{item.sourceName}:</span>
              <span className="text-slate-500">{item.description}</span>
            </span>
            <span className="font-bold text-slate-900 shrink-0">
              {item.bonusPoints.toLocaleString('sv-SE')} p
              {item.tierPoints > 0 && ` (+${item.tierPoints} nivå)`}
            </span>
          </div>
        ))}

        {/* Kortpoäng rad */}
        {bestOutcome && bestOutcome.cardBonusPoints > 0 ? (
          <div className="flex items-center justify-between gap-2 text-blue-900 font-medium pt-1 border-t border-slate-200">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>Kortbonus ({bestOutcome.cardName}):</span>
            </span>
            <span className="font-bold text-blue-700 shrink-0">
              +{bestOutcome.cardBonusPoints.toLocaleString('sv-SE')} p
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-200 text-xs">
            <span>Betalkortsbonus:</span>
            <span>0 p (inget kort valt eller 0% sats)</span>
          </div>
        )}
      </div>

      {/* 4. Köpbelopp, presentkort, utlägg och restsaldo */}
      <div className="p-5 sm:p-6 py-4 border-b border-slate-100 text-xs text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white">
        <div>
          <span className="text-slate-400 block">Köpbelopp:</span>
          <span className="font-semibold text-slate-800">{formatKr(route.purchaseAmountOre)} kr</span>
        </div>
        <div>
          <span className="text-slate-400 block">Presentkort:</span>
          <span className="font-semibold text-slate-800">
            {route.giftCardValueOre > 0 ? `${formatKr(route.giftCardValueOre)} kr` : 'Inga'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Extra utlägg:</span>
          <span
            className={`font-semibold ${
              route.extraOutlayOre > 0 ? 'text-amber-700' : 'text-slate-800'
            }`}
          >
            {formatKr(route.extraOutlayOre)} kr
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Kvarvarande saldo:</span>
          <span
            className={`font-semibold ${
              route.remainingBalanceOre > 0 ? 'text-blue-700' : 'text-slate-500'
            }`}
          >
            {route.remainingBalanceOre > 0 ? `${formatKr(route.remainingBalanceOre)} kr` : '0 kr'}
          </span>
        </div>
      </div>

      {/* 5. Jämförelse av samtliga valda kort inom samma väg (F08) */}
      {selectedCards.length > 1 && (
        <div className="p-5 sm:p-6 py-3 border-b border-slate-100 bg-blue-50/30 text-xs">
          <button
            type="button"
            onClick={() => setShowCardDetails(!showCardDetails)}
            className="w-full flex items-center justify-between text-blue-900 font-semibold hover:text-blue-700 py-1"
          >
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              Jämför dina {selectedCards.length} valda kort för denna köpväg
            </span>
            {showCardDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCardDetails && (
            <div className="mt-2 space-y-1.5 pt-2 border-t border-blue-100">
              <div className="flex justify-between font-bold text-slate-600 pb-1">
                <span>Kort</span>
                <span>Kortpoäng / Totalpoäng</span>
              </div>
              {/* Referens utan kort */}
              <div className="flex justify-between text-slate-500 py-0.5">
                <span>Utan EuroBonus-kort (referens):</span>
                <span>0 p / {route.baseBonusPoints.toLocaleString('sv-SE')} p</span>
              </div>
              {selectedCards.map((card) => {
                const outcome = route.cardOutcomes[card.id];
                if (!outcome) return null;
                return (
                  <div
                    key={card.id}
                    className="flex justify-between items-center text-slate-800 font-medium py-0.5"
                  >
                    <span>{card.name}:</span>
                    <span className="font-bold text-blue-700">
                      +{outcome.cardBonusPoints} p /{' '}
                      <span className="text-slate-900">{outcome.totalBonusPoints} p</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Steg-för-steg instruktioner (F13) */}
      {showInstructions && (
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Steg-för-steg instruktioner ({route.totalSteps} steg):
          </h4>
          <ol className="space-y-3">
            {route.steps.map((step) => (
              <li key={step.stepNumber} className="flex items-start gap-3 text-xs sm:text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  {step.stepNumber}
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{step.title}</div>
                  <p className="text-slate-600 mt-0.5">{step.description}</p>
                  {step.externalUrl && (
                    <a
                      href={step.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 underline font-medium mt-1"
                    >
                      Öppna {step.title} i ny flik
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 7. Footer: Senaste kontroll, åtgärder, felrapportering */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white mt-auto">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Footprints className="w-3.5 h-3.5 text-slate-400" />
            {route.totalSteps} {route.totalSteps === 1 ? 'steg' : 'steg'}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1" title="Senaste lyckade kontroll" suppressHydrationWarning>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {formattedCheckedTime}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors touch-target flex items-center gap-1"
          >
            {showInstructions ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Dölj instruktion
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Visa instruktion
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onReportError(route)}
            className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors touch-target flex items-center gap-1"
            title="Rapportera fel i regler eller poäng"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Rapportera fel</span>
          </button>

          <a
            href={route.startUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 touch-target shadow-xs"
          >
            <span>Gå till butiken</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
};
