'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, ArrowRight, CreditCard, Sparkles, Zap } from 'lucide-react';
import { Category, OneTimeBonusFilter, PaymentCard, SortOption, Store } from '@/types/domain';
import { StoreMultiSelectDropdown } from './StoreMultiSelectDropdown';

interface SearchFilterBoxProps {
  allStores: Store[];
  selectedStoreIds: string[];
  onToggleStore: (storeId: string) => void;
  onClearStores: () => void;
  onSelectAllStores?: (storeIds?: string[]) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  categories: Category[];
  selectedCategoryIds: string[];
  onToggleCategory: (catId: string) => void;
  purchaseAmountKr: number | null;
  rawAmountInput: string;
  onAmountChange: (raw: string, parsed: number | null, err?: string) => void;
  amountError?: string;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  allowPartnerStores: boolean;
  onTogglePartnerStores: (val: boolean) => void;
  allowGiftCards: boolean;
  onToggleGiftCards: (val: boolean) => void;
  allowZupergift: boolean;
  onToggleZupergift: (val: boolean) => void;
  tierPointsImportant: boolean;
  onToggleTierPoints: (val: boolean) => void;
  onlyCampaigns: boolean;
  onToggleOnlyCampaigns: (val: boolean) => void;
  oneTimeBonusFilter: OneTimeBonusFilter;
  onOneTimeBonusFilterChange: (val: OneTimeBonusFilter) => void;
  availableCards: PaymentCard[];
  selectedCardIds: string[];
  onToggleCard: (cardId: string) => void;
  onCompareSubmit?: () => void;
}

export const SearchFilterBox: React.FC<SearchFilterBoxProps> = ({
  allStores,
  selectedStoreIds,
  onToggleStore,
  onClearStores,
  onSelectAllStores,
  searchQuery = '',
  onSearchChange,
  categories,
  selectedCategoryIds,
  onToggleCategory,
  rawAmountInput,
  onAmountChange,
  amountError,
  sortBy,
  onSortChange,
  allowPartnerStores,
  onTogglePartnerStores,
  allowGiftCards,
  onToggleGiftCards,
  allowZupergift,
  onToggleZupergift,
  tierPointsImportant,
  onToggleTierPoints,
  onlyCampaigns,
  onToggleOnlyCampaigns,
  oneTimeBonusFilter,
  onOneTimeBonusFilterChange,
  availableCards,
  selectedCardIds,
  onToggleCard,
  onCompareSubmit,
}) => {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [cardDropdownOpen, setCardDropdownOpen] = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setCardDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/\s+/g, '').replace(/kr/gi, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (!cleaned) {
      onAmountChange(raw, null);
    } else if (isNaN(num) || num <= 0) {
      onAmountChange(raw, null, 'Ogiltigt belopp');
    } else {
      onAmountChange(raw, num, undefined);
    }
  };

  // Filtrera butiker för butiksväljaren baserat på valda kategorier
  const storesForDropdown = useMemo(() => {
    if (selectedCategoryIds.length === 0) {
      return allStores;
    }
    const catSet = new Set(selectedCategoryIds);
    return allStores.filter(
      (store) =>
        selectedStoreIds.includes(store.id) ||
        store.categories.some((c) => catSet.has(c))
    );
  }, [allStores, selectedCategoryIds, selectedStoreIds]);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200/90 space-y-5">
      {/* Översta raden: Butiker, Kategori, Köpbelopp, Sortera */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
        {/* Butiksväljare: Kryssrutor i rullgardinsmeny med sökfunktion och valda i toppen */}
        <div className="md:col-span-4">
          <StoreMultiSelectDropdown
            allStores={storesForDropdown}
            selectedStoreIds={selectedStoreIds}
            onToggleStore={onToggleStore}
            onClearSelection={onClearStores}
            onSelectAll={onSelectAllStores}
            label="Välj butik"
            isCategoryFiltered={selectedCategoryIds.length > 0}
          />
        </div>

        {/* Kategori väljare med piller */}
        <div className="md:col-span-3 relative" ref={categoryRef}>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Kategori
          </label>
          <button
            type="button"
            onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
            className="w-full min-h-[44px] px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-left flex items-center justify-between gap-1 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
          >
            <div className="flex flex-wrap gap-1 items-center overflow-hidden">
              {selectedCategoryIds.length === 0 ? (
                <span className="text-slate-400 text-sm px-1">Alla kategorier</span>
              ) : (
                selectedCategoryIds.map((catId) => {
                  const cat = categories.find((c) => c.id === catId);
                  return (
                    <span
                      key={catId}
                      className="inline-flex items-center gap-1 bg-blue-100/70 text-blue-900 font-semibold px-2 py-0.5 rounded-md text-xs shrink-0"
                    >
                      {cat?.name || catId}
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCategory(catId);
                        }}
                        className="hover:text-blue-950 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </span>
                  );
                })
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Kategori dropdown meny */}
          {categoryDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-50 space-y-1">
              {categories.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onToggleCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {isSelected && <span className="text-blue-600 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Köpbelopp */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Köpbelopp
          </label>
          <div className="relative">
            <input
              type="text"
              value={rawAmountInput}
              onChange={handleAmountInput}
              placeholder="100 kr"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 bg-slate-50/50 hover:bg-white focus:bg-white transition-all touch-target ${
                amountError
                  ? 'border-red-400 focus:border-red-600'
                  : 'border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
              }`}
            />
          </div>
        </div>

        {/* Sortera */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Sortera
          </label>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 appearance-none transition-all touch-target cursor-pointer"
            >
              <option value="most_bonus">Flest bonuspoäng</option>
              <option value="most_tier">Flest nivåpoäng</option>
              <option value="name_asc">Bokstavsordning (A–Ö)</option>
              <option value="name_desc">Bokstavsordning (Ö–A)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Mittenraden: Toggles (Visa partnerbutiker, Visa presentkort, Visa Zupergift, Exkludera krångliga, Nivåpoäng viktiga) */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
        {/* Visa partnerbutiker */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={allowPartnerStores}
            onClick={() => onTogglePartnerStores(!allowPartnerStores)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              allowPartnerStores ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                allowPartnerStores ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-xs sm:text-sm font-semibold text-slate-700">
            Visa partnerbutiker
          </span>
        </label>

        {/* Visa presentkort */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={allowGiftCards}
            onClick={() => onToggleGiftCards(!allowGiftCards)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              allowGiftCards ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                allowGiftCards ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-xs sm:text-sm font-semibold text-slate-700">
            Visa presentkort
          </span>
        </label>

        {/* Visa Zupergift */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={allowGiftCards && allowZupergift}
            disabled={!allowGiftCards}
            onClick={() => onToggleZupergift(!allowZupergift)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              allowGiftCards && allowZupergift
                ? 'bg-blue-600'
                : 'bg-slate-300 opacity-60 cursor-not-allowed'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                allowGiftCards && allowZupergift ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-xs sm:text-sm font-semibold text-slate-700">
            Visa Zupergift
          </span>
        </label>

        {/* Nivåpoäng viktiga */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={tierPointsImportant}
            onClick={() => onToggleTierPoints(!tierPointsImportant)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              tierPointsImportant ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                tierPointsImportant ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-xs sm:text-sm font-semibold text-slate-700">
            Nivåpoäng viktiga
          </span>
        </label>

        {/* Endast kampanjer */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={onlyCampaigns}
            onClick={() => onToggleOnlyCampaigns(!onlyCampaigns)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              onlyCampaigns ? 'bg-red-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                onlyCampaigns ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <span>Endast kampanjer</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 text-red-700 tracking-wide border border-red-200/50">
              Kampanj
            </span>
          </span>
        </label>

        {/* Engångsbonus-filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-semibold text-slate-700">
            Engångsbonus:
          </span>
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onOneTimeBonusFilterChange('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                oneTimeBonusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visa alla
            </button>
            <button
              type="button"
              onClick={() => onOneTimeBonusFilterChange('only')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                oneTimeBonusFilter === 'only'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Endast</span>
            </button>
            <button
              type="button"
              onClick={() => onOneTimeBonusFilterChange('exclude')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                oneTimeBonusFilter === 'exclude'
                  ? 'bg-slate-800 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Exkludera
            </button>
          </div>
        </div>
      </div>

      {/* Nedersta raden: Kortväljare & CTA-knapp */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Välj kort */}
        <div className="flex-1 relative" ref={cardRef}>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Välj kort (påverkar kortpoäng)
          </label>
          <button
            type="button"
            onClick={() => setCardDropdownOpen(!cardDropdownOpen)}
            className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-left flex items-center justify-between gap-2 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
          >
            <div className="flex flex-wrap gap-1.5 items-center">
              {selectedCardIds.length === 0 ? (
                <span className="text-slate-500 font-medium text-xs">
                  Inget kort valt (endast baspoäng)
                </span>
              ) : (
                selectedCardIds.map((cardId) => {
                  const card = availableCards.find((c) => c.id === cardId);
                  return (
                    <span
                      key={cardId}
                      className="inline-flex items-center gap-1 bg-blue-100/70 text-blue-900 font-semibold px-2.5 py-1 rounded-md text-xs"
                    >
                      <CreditCard className="w-3 h-3 text-blue-700" />
                      {card?.name.replace('SAS ', '') || cardId}
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCard(cardId);
                        }}
                        className="hover:text-blue-950 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </span>
                  );
                })
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Kort dropdown */}
          {cardDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-50 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase">
                Välj dina EuroBonus-kort:
              </div>
              {availableCards.map((card) => {
                const isSelected = selectedCardIds.includes(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => onToggleCard(card.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div>{card.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        +{card.bonusPer100Kr}p / 100 kr
                      </div>
                    </div>
                    {isSelected && <span className="text-blue-600 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA-knapp: Jämför alternativ -> */}
        <div className="sm:self-end">
          <button
            type="button"
            onClick={onCompareSubmit}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs hover:shadow-md transition-all touch-target cursor-pointer"
          >
            <span>Jämför alternativ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
