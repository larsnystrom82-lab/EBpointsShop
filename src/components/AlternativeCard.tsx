'use client';

import React, { useState } from 'react';
import { RouteCalculationResult, PaymentCard } from '@/types/domain';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flag,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import { formatLastChecked } from '@/lib/utils/formatDate';
import { getCampaignRemainingInfo } from '@/lib/utils/campaign';

export const CATEGORY_NAMES: Record<string, string> = {
  food: 'Mat & Restaurang',
  kitchen: 'Hem & Kök',
  electronics: 'Elektronik',
  fashion: 'Mode & Kläder',
  health: 'Skönhet & Hälsa',
  sports: 'Sport & Fritid',
  books: 'Böcker & Media',
  travel: 'Resor & Hotell',
  baby: 'Barn & Baby',
  gifts: 'Present & Upplevelser',
  office: 'Kontorsmaterial',
  department: 'Varuhus & Övrigt',
};

interface AlternativeCardProps {
  route: RouteCalculationResult;
  selectedCards: PaymentCard[];
  onReportError: (route: RouteCalculationResult) => void;
}

export const AlternativeCard: React.FC<AlternativeCardProps> = ({
  route,
  selectedCards,
  onReportError,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Formatting helpers
  const formatKr = (ore: number) => {
    return (ore / 100).toLocaleString('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const bestOutcome = route.selectedCardOutcome;
  const totalBonusPoints = bestOutcome ? bestOutcome.totalBonusPoints : route.baseBonusPoints;
  const cardBonusPoints = bestOutcome ? bestOutcome.cardBonusPoints : 0;
  const baseBonusPoints = route.baseBonusPoints;
  const baseTierPoints = route.baseTierPoints;
  const campaignInfo = route.isExplicitCampaign ? getCampaignRemainingInfo(route.campaignValidUntil) : null;

  // Route title formatting matching reference image:
  // "Cervera – via presentkort", "Bagaren & Kocken – partnerbutik", etc.
  let displayTitle = `${route.storeName} – `;
  if (route.routeType === 'direct_partner') {
    displayTitle += 'partnerbutik';
  } else if (route.routeType === 'zupergift_chain') {
    displayTitle += 'via presentkort';
  } else {
    displayTitle += 'via presentkort';
  }

  // Breadcrumb matching image: "SAS Presentkort → Cervera"
  let breadcrumb = '';
  if (route.routeType === 'direct_partner') {
    breadcrumb = `SAS Online Shopping → ${route.storeName}`;
  } else if (route.routeType === 'zupergift_chain') {
    breadcrumb = `SAS Presentkort → Zupergift → ${route.storeName}`;
  } else {
    breadcrumb = `SAS Presentkort → ${route.storeName}`;
  }

  // Difficulty badge
  const isMedel = route.routeType === 'zupergift_chain' || route.extraOutlayOre > 0;
  const difficultyText = isMedel ? 'Medel' : 'Enkelt';

  // Category pill
  const catKey = route.primaryCategory || (route.storeId === 'elgiganten' ? 'electronics' : 'kitchen');
  const categoryLabel = CATEGORY_NAMES[catKey] || 'Varuhus';

  const [imgError, setImgError] = useState(false);

  const getMonogram = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Channel pill
  const channelLabel = route.routeType === 'direct_partner' ? 'Partnerbutik' : 'Presentkort';

  return (
    <article
      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all overflow-hidden"
      aria-label={displayTitle}
    >
      {/* Huvudkort för Desktop (synligt på md och uppåt) */}
      <div className="hidden md:flex items-center justify-between p-5 gap-4">
        {/* Vänster: Logga, Titel, Taggar, Breadcrumb, Kontrolltid */}
        <div className="flex items-center gap-4 min-w-[280px] max-w-[340px]">
          <div className="w-20 h-12 relative flex items-center justify-center shrink-0">
            {route.storeLogoUrl && !imgError ? (
              <Image
                src={route.storeLogoUrl}
                alt={route.storeName}
                width={80}
                height={40}
                className="max-h-10 w-auto object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-900 font-extrabold text-xs shadow-2xs">
                {getMonogram(route.storeName)}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                {displayTitle}
              </h3>
              {route.isExplicitCampaign && (!campaignInfo || !campaignInfo.isExpired) && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200/80 px-2.5 py-0.5 rounded-full shadow-2xs"
                  title={campaignInfo ? campaignInfo.fullText : 'Aktiv kampanj'}
                >
                  <Sparkles className="w-3 h-3 text-red-500 shrink-0" />
                  <span>Kampanj</span>
                  {campaignInfo && (
                    <>
                      <span className="text-red-300 font-normal">·</span>
                      <span className="text-red-700 font-semibold">{campaignInfo.text}</span>
                      <span className="text-red-500 font-normal text-[10px]">({campaignInfo.endDateFormatted})</span>
                    </>
                  )}
                </span>
              )}
            </div>

            {/* Badges i rad */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {categoryLabel}
              </span>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {channelLabel}
              </span>
              {route.isOneTimeOffer && (
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-md">
                  Engångsbonus
                </span>
              )}
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  isMedel
                    ? 'text-amber-800 bg-amber-50'
                    : 'text-emerald-700 bg-emerald-50'
                }`}
              >
                {difficultyText}
              </span>
              {route.comment && (
                <span
                  className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-help"
                  title={route.comment}
                >
                  <span>💬 Notering</span>
                </span>
              )}
            </div>

            {/* Breadcrumb och kontrolltid */}
            <div className="text-xs text-slate-500 font-medium">
              {breadcrumb}
            </div>
            <div suppressHydrationWarning className="text-[11px] text-slate-400">
              {formatLastChecked(route.lastCheckedAt)}
            </div>
          </div>
        </div>

        {/* Mitten/Höger: Poängkolumner exakt som i bilden */}
        <div className="flex items-center gap-6 lg:gap-8 ml-auto pr-2">
          {/* Kolumn 1: Bonuspoäng */}
          <div className="text-left min-w-[70px]">
            <span className="text-xs text-slate-400 font-medium block">
              Bonuspoäng
            </span>
            <span className="text-xl font-extrabold text-blue-600 block leading-tight">
              {baseBonusPoints.toLocaleString('sv-SE')}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {route.isOneTimeOffer
                ? 'Fast engångsbonus'
                : route.routeType === 'direct_partner'
                ? 'Från partnerbutik'
                : 'Från presentkort'}
            </span>
          </div>

          {/* Kolumn 2: Nivåpoäng */}
          <div className="text-left min-w-[70px]">
            <span className="text-xs text-slate-400 font-medium block">
              Nivåpoäng
            </span>
            <span className={`text-xl font-extrabold block leading-tight ${baseTierPoints > 0 ? 'text-emerald-700 font-black' : 'text-slate-400'}`}>
              {baseTierPoints > 0 ? baseTierPoints.toLocaleString('sv-SE') : '0'}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {baseTierPoints > 0
                ? route.isOneTimeOffer
                  ? 'Fast engångsbonus'
                  : 'Från partnerbutik'
                : '–'}
            </span>
          </div>

          {/* Kolumn 3: Kortpoäng */}
          <div className="text-left min-w-[70px]">
            <span className="text-xs text-slate-400 font-medium block">
              Kortpoäng
            </span>
            <span className="text-xl font-extrabold text-blue-600 block leading-tight">
              {cardBonusPoints > 0 ? `+${cardBonusPoints.toLocaleString('sv-SE')}` : '+0'}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Från dina kort
            </span>
          </div>

          {/* Kolumn 4: Totalt */}
          <div className="text-left min-w-[80px]">
            <span className="text-xs text-slate-400 font-medium block">
              Totalt
            </span>
            <span className="text-2xl font-black text-blue-700 block leading-tight tracking-tight">
              {totalBonusPoints.toLocaleString('sv-SE')}
            </span>
          </div>

          {/* Steg & Expand-knapp */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex flex-col items-center justify-center text-xs font-semibold text-slate-600 hover:text-blue-600 p-2 rounded-lg transition-colors cursor-pointer touch-target"
            aria-expanded={expanded}
          >
            <span>{route.totalSteps} steg</span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Mobilvy (synlig under md, precis som telefonmockupen i bilden) */}
      <div className="md:hidden p-4 space-y-3">
        {/* Mobil Header: Logga, Titel & Enkelt-badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-14 h-8 relative flex items-center justify-center shrink-0">
              {route.storeLogoUrl && !imgError ? (
                <Image
                  src={route.storeLogoUrl}
                  alt=""
                  width={56}
                  height={32}
                  className="max-h-7 w-auto object-contain"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-900 font-extrabold text-[11px] shadow-2xs">
                  {getMonogram(route.storeName)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="text-xs font-bold text-slate-900 leading-snug">
                  {displayTitle}
                </div>
                {route.isExplicitCampaign && (!campaignInfo || !campaignInfo.isExpired) && (
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-red-700 bg-red-50 border border-red-200/80 px-1.5 py-0.2 rounded-full"
                    title={campaignInfo ? campaignInfo.fullText : 'Aktiv kampanj'}
                  >
                    <Sparkles className="w-2.5 h-2.5 text-red-500 shrink-0" />
                    <span>Kampanj</span>
                    {campaignInfo && (
                      <span className="text-red-600 font-medium">· {campaignInfo.text}</span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                  {categoryLabel}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {breadcrumb}
                </span>
                {route.isOneTimeOffer && (
                  <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-1.5 py-0.2 rounded">
                    Engångsbonus
                  </span>
                )}
              </div>
              <div suppressHydrationWarning className="text-[10px] text-slate-400 mt-0.5">
                {formatLastChecked(route.lastCheckedAt)}
              </div>
            </div>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
              isMedel ? 'text-amber-800 bg-amber-50' : 'text-emerald-700 bg-emerald-50'
            }`}
          >
            {difficultyText}
          </span>
        </div>

        {/* Mobil Poängrad: 3 kolumner + Totalt box */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-base font-extrabold text-blue-600 block leading-tight">
                {baseBonusPoints.toLocaleString('sv-SE')}
              </span>
              <span className="text-[10px] text-slate-400">
                {route.isOneTimeOffer ? 'Fast bonus' : 'Bonuspoäng'}
              </span>
            </div>
            <div>
              <span className={`text-base font-extrabold block leading-tight ${baseTierPoints > 0 ? 'text-emerald-700 font-black' : 'text-slate-400'}`}>
                {baseTierPoints > 0 ? baseTierPoints.toLocaleString('sv-SE') : '0'}
              </span>
              <span className="text-[10px] text-slate-400">Nivåpoäng</span>
            </div>
            <div>
              <span className="text-base font-extrabold text-blue-600 block leading-tight">
                {cardBonusPoints > 0 ? `+${cardBonusPoints.toLocaleString('sv-SE')}` : '+0'}
              </span>
              <span className="text-[10px] text-slate-400">Kortpoäng</span>
            </div>
          </div>

          {/* Totalt box */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5 text-right">
            <span className="text-[10px] font-semibold text-blue-700 uppercase block">Totalt</span>
            <span className="text-lg font-black text-blue-900 leading-tight">
              {totalBonusPoints.toLocaleString('sv-SE')}
            </span>
          </div>
        </div>

        {/* Mobil Footer: Extra utlägg & Steg */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span>Extra utlägg:</span>
            <span className={route.extraOutlayOre > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
              {formatKr(route.extraOutlayOre)} kr
            </span>
            <span>•</span>
            <span>{route.totalSteps} steg</span>
          </div>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 touch-target"
          >
            <span>{expanded ? 'Dölj' : 'Visa mer'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Utfällbar detaljvy för steg, länkar och felrapportering */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/70 p-5 space-y-4">
          {route.isExplicitCampaign && (!campaignInfo || !campaignInfo.isExpired) && (
            <div className="bg-red-50/90 border border-red-200/90 rounded-xl p-3 text-xs text-red-950 flex items-start gap-2.5 shadow-2xs">
              <Sparkles className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Aktiv kampanj: </span>
                <span>
                  {campaignInfo
                    ? `${campaignInfo.fullText}. Extra höga bonuspoäng gäller under kampanjperioden.`
                    : 'Butiken har just nu en aktiv kampanj med förhöjd poängintjäning.'}
                </span>
              </div>
            </div>
          )}

          {route.isOneTimeOffer && (
            <div className="bg-purple-50 border border-purple-200/80 rounded-xl p-3 text-xs text-purple-900 flex items-start gap-2.5">
              <span className="font-bold text-sm leading-none shrink-0 mt-0.5">ℹ️</span>
              <div>
                <span className="font-bold">Engångsbonus: </span>
                {route.oneTimeTerms || 'Denna bonus faller inte ut per 100 kr, utan utgör en fast engångsbonus vid första köpet/tecknandet.'}
              </div>
            </div>
          )}

          {route.comment && (
            <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
              <span className="font-bold text-sm leading-none shrink-0 mt-0.5">💬</span>
              <div>
                <span className="font-bold">Notering om butiken: </span>
                {route.comment}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Steg-för-steg instruktioner ({route.totalSteps} steg):
            </h4>
            <ol className="space-y-2.5">
              {route.steps.map((step) => (
                <li key={step.stepNumber} className="flex items-start gap-3 text-xs sm:text-sm">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    {step.stepNumber}
                  </span>
                  <div className="flex-1">
                    <span className="font-semibold text-slate-900">{step.title}: </span>
                    <span className="text-slate-600">{step.description}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Uppdelning och restsaldo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block">Köpbelopp:</span>
              <span className="font-semibold text-slate-800">{(route.purchaseAmountOre / 100).toLocaleString('sv-SE')} kr</span>
            </div>
            <div>
              <span className="text-slate-400 block">Presentkort:</span>
              <span className="font-semibold text-slate-800">
                {route.giftCardValueOre > 0 ? `${(route.giftCardValueOre / 100).toLocaleString('sv-SE')} kr` : '0 kr'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Extra utlägg:</span>
              <span className="font-semibold text-slate-800">{(route.extraOutlayOre / 100).toLocaleString('sv-SE')} kr</span>
            </div>
            <div>
              <span className="text-slate-400 block">Kvarvarande saldo:</span>
              <span className="font-semibold text-blue-700">
                {route.remainingBalanceOre > 0 ? `${(route.remainingBalanceOre / 100).toLocaleString('sv-SE')} kr` : '0 kr'}
              </span>
            </div>
          </div>

          {/* Åtgärdsknappar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onReportError(route)}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5 touch-target"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Rapportera fel</span>
            </button>

            <a
              href={route.startUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 touch-target shadow-xs"
            >
              <span>Gå till butiken</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </article>
  );
};
