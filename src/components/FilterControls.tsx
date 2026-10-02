'use client';

import React from 'react';
import { OneTimeBonusFilter, PaymentCard, SortOption } from '@/types/domain';
import { SlidersHorizontal, CreditCard, Gift, ArrowUpDown, Award, Check, Store as StoreIcon } from 'lucide-react';

interface FilterControlsProps {
  allowPartnerStores?: boolean;
  onTogglePartnerStores?: (allowed: boolean) => void;
  allowGiftCards: boolean;
  onToggleGiftCards: (allowed: boolean) => void;
  allowZupergift: boolean;
  onToggleZupergift: (allowed: boolean) => void;
  tierPointsImportant: boolean;
  onToggleTierPoints: (important: boolean) => void;
  onlyCampaigns?: boolean;
  onToggleOnlyCampaigns?: (allowed: boolean) => void;
  oneTimeBonusFilter?: OneTimeBonusFilter;
  onOneTimeBonusFilterChange?: (filter: OneTimeBonusFilter) => void;
  availableCards: PaymentCard[];
  selectedCardIds: string[];
  onToggleCard: (cardId: string) => void;
  onSelectNoCard: () => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  allowPartnerStores = true,
  onTogglePartnerStores,
  allowGiftCards,
  onToggleGiftCards,
  allowZupergift,
  onToggleZupergift,
  tierPointsImportant,
  onToggleTierPoints,
  availableCards,
  selectedCardIds,
  onToggleCard,
  onSelectNoCard,
  sortBy,
  onSortChange,
}) => {
  const isNoCardSelected = selectedCardIds.length === 0;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
          3
        </span>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-blue-600" />
          Filter, kort och sortering
        </h2>
      </div>

      {/* Sektion 1: Sorteringsalternativ (F10, F11) */}
      <div>
        <label htmlFor="sort-select" className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
          Sortera resultat efter:
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-semibold focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all touch-target"
          >
            <option value="most_bonus">Flest bonuspoäng (standard)</option>
            <option value="most_tier">Flest nivåpoäng först</option>
          </select>
        </div>
      </div>

      {/* Sektion 2: Vägar och poängpreferens (F06, F11) */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Köpvägar &amp; poängtyp:
        </span>

        <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors touch-target">
          <input
            type="checkbox"
            checked={allowPartnerStores}
            onChange={(e) => onTogglePartnerStores?.(e.target.checked)}
            className="mt-1 w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
          />
          <div className="text-sm">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <StoreIcon className="w-4 h-4 text-blue-600" />
              Tillåt partnerbutiker
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Direktköp via SAS Online Shopping partnerlänkar.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors touch-target">
          <input
            type="checkbox"
            checked={allowGiftCards}
            onChange={(e) => onToggleGiftCards(e.target.checked)}
            className="mt-1 w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
          />
          <div className="text-sm">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-purple-600" />
              Tillåt presentkort
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Inkludera köp via butikspresentkort från SAS EuroBonus Shop.
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-3 p-3 rounded-xl border transition-colors touch-target ${
            !allowGiftCards
              ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
              : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
          }`}
        >
          <input
            type="checkbox"
            checked={allowGiftCards && allowZupergift}
            disabled={!allowGiftCards}
            onChange={(e) => onToggleZupergift(e.target.checked)}
            className="mt-1 w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
          />
          <div className="text-sm">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">
                Z
              </span>
              Tillåt Zupergift-kedjor
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hitta indirekta kedjor: SAS → Zupergift → Butikspresentkort.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors touch-target">
          <input
            type="checkbox"
            checked={tierPointsImportant}
            onChange={(e) => onToggleTierPoints(e.target.checked)}
            className="mt-1 w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
          />
          <div className="text-sm">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              Nivåpoäng är viktiga
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Prioriterar köpvägar som ger nivåpoäng (t.ex. för SAS EuroBonus Silver/Guld/Diamant).
            </p>
          </div>
        </label>
      </div>

      {/* Sektion 3: Kortval (F07, F08) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Dina EuroBonus-kort (jämförs parallellt):
          </span>
          <span className="text-xs text-slate-500">Välj ett eller flera</span>
        </div>

        <div className="space-y-2">
          {/* Alternativ: Inget EuroBonus-kort */}
          <button
            type="button"
            onClick={onSelectNoCard}
            className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors touch-target ${
              isNoCardSelected
                ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold ring-1 ring-blue-500'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  isNoCardSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400'
                }`}
              >
                {isNoCardSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className="text-xs sm:text-sm">Inget EuroBonus-kort (endast baspoäng)</span>
            </div>
            <span className="text-xs text-slate-500">0 extrapoäng</span>
          </button>

          {/* Valbara kort */}
          {availableCards.map((card) => {
            const isSelected = selectedCardIds.includes(card.id);
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onToggleCard(card.id)}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors touch-target ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold ring-1 ring-blue-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-600" />
                      {card.name}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-blue-700">
                    +{card.bonusPer100Kr}p / 100 kr
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-[11px] text-slate-500 leading-tight">
          * Kortpoängen förutsätter att kortet accepteras i betalningsledet och att köpet ger poäng enligt kortets villkor.
        </p>
      </div>
    </div>
  );
};
