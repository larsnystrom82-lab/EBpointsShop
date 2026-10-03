'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SearchFilterBox } from '@/components/SearchFilterBox';
import { AlternativeCard } from '@/components/AlternativeCard';
import { TermsNotice } from '@/components/TermsNotice';
import { Footer } from '@/components/Footer';
import { ErrorReportModal } from '@/components/ErrorReportModal';
import { DEMO_STORES, DEMO_CATEGORIES, DEMO_CARDS } from '@/lib/fixtures/demo-data';
import { Category, FilterState, OneTimeBonusFilter, RouteCalculationResult, SortOption, Store } from '@/types/domain';
import type { SasGiftCardStoreItem } from '@/lib/db';
import { generateCandidateRoutes, processAndRankRoutes } from '@/lib/engine/calculator';
import { Info, Plane } from 'lucide-react';

const STORAGE_KEY = 'poangkollen_user_preferences_v2';

function cleanSlug(slug: string): string {
  return (slug || '')
    .toLowerCase()
    .replace(/^presentkort-/, '')
    .replace(/-presentkort$/, '')
    .replace(/-se$/, '')
    .replace(/-r24$/, '')
    .replace(/-sek$/, '');
}

export default function Home() {
  // Dynamic stores list (loaded from API with DEMO_STORES fallback)
  const [allStores, setAllStores] = useState<Store[]>(DEMO_STORES);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEMO_CATEGORIES);
  const [zupergiftRate, setZupergiftRate] = useState<number | undefined>(undefined);
  const [zupergiftIsCampaign, setZupergiftIsCampaign] = useState<boolean>(false);
  const [sasGiftCards, setSasGiftCards] = useState<SasGiftCardStoreItem[]>([]);

  // Search & Filter state matching reference image
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [purchaseAmountKr, setPurchaseAmountKr] = useState<number | null>(100);
  const [rawAmountInput, setRawAmountInput] = useState<string>('100 kr');
  const [amountError, setAmountError] = useState<string | undefined>();

  const [allowPartnerStores, setAllowPartnerStores] = useState<boolean>(true);
  const [allowGiftCards, setAllowGiftCards] = useState<boolean>(true);
  const [allowZupergift, setAllowZupergift] = useState<boolean>(true);
  const [excludeComplex, setExcludeComplex] = useState<boolean>(false);
  const [tierPointsImportant, setTierPointsImportant] = useState<boolean>(false);
  const [onlyCampaigns, setOnlyCampaigns] = useState<boolean>(false);
  const [oneTimeBonusFilter, setOneTimeBonusFilter] = useState<OneTimeBonusFilter>('all');

  // Cards selected by default matching the reference image: Amex Premium & Mastercard Premium
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([
    'amex_premium',
    'mc_premium',
  ]);
  const [sortBy, setSortBy] = useState<SortOption>('most_bonus');

  const [activeReportRoute, setActiveReportRoute] = useState<RouteCalculationResult | null>(null);

  // Load preferences from localStorage safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.allowPartnerStores === 'boolean') setAllowPartnerStores(parsed.allowPartnerStores);
        if (typeof parsed.allowGiftCards === 'boolean') setAllowGiftCards(parsed.allowGiftCards);
        if (typeof parsed.allowZupergift === 'boolean') setAllowZupergift(parsed.allowZupergift);
        if (typeof parsed.tierPointsImportant === 'boolean') setTierPointsImportant(parsed.tierPointsImportant);
        if (typeof parsed.onlyCampaigns === 'boolean') setOnlyCampaigns(parsed.onlyCampaigns);
        if (parsed.oneTimeBonusFilter && ['all', 'only', 'exclude'].includes(parsed.oneTimeBonusFilter)) {
          setOneTimeBonusFilter(parsed.oneTimeBonusFilter);
        }
        if (Array.isArray(parsed.selectedCardIds)) setSelectedCardIds(parsed.selectedCardIds);
        if (Array.isArray(parsed.selectedStoreIds)) setSelectedStoreIds(parsed.selectedStoreIds);
        if (parsed.sortBy && ['most_bonus', 'most_tier', 'name_asc', 'name_desc'].includes(parsed.sortBy)) {
          setSortBy(parsed.sortBy as SortOption);
        }
      }
    } catch {
      // Gracefully continue
    }
  }, []);

  // Fetch live store config from API
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data?.allStores && Array.isArray(data.allStores) && data.allStores.length > 0) {
          setAllStores(data.allStores);
        }
        if (data?.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
        if (data?.zupergiftConfig?.ratePer100Kr !== undefined) {
          setZupergiftRate(data.zupergiftConfig.ratePer100Kr);
        }
        if (data?.zupergiftConfig?.isCampaign !== undefined) {
          setZupergiftIsCampaign(Boolean(data.zupergiftConfig.isCampaign));
        }
        if (data?.sasGiftCards && Array.isArray(data.sasGiftCards)) {
          setSasGiftCards(data.sasGiftCards);
        }
      })
      .catch(() => {
        // Fallback to local fixtures gracefully
      });
  }, []);

  const savePreferences = (updated: Record<string, unknown>) => {
    try {
      const current = {
        allowPartnerStores,
        allowGiftCards,
        allowZupergift,
        excludeComplex,
        tierPointsImportant,
        onlyCampaigns,
        oneTimeBonusFilter,
        selectedCardIds,
        selectedCategoryIds,
        sortBy,
        ...updated,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Ignore
    }
  };

  const handleToggleStore = (storeId: string) => {
    const updated = selectedStoreIds.includes(storeId)
      ? selectedStoreIds.filter((id) => id !== storeId)
      : [...selectedStoreIds, storeId];
    setSelectedStoreIds(updated);
    savePreferences({ selectedStoreIds: updated });
  };

  const handleClearStores = () => {
    setSelectedStoreIds([]);
    savePreferences({ selectedStoreIds: [] });
  };

  const handleSelectAllStores = (storeIds?: string[]) => {
    if (storeIds && Array.isArray(storeIds)) {
      setSelectedStoreIds(storeIds);
      savePreferences({ selectedStoreIds: storeIds });
      return;
    }
    const candidateStores =
      selectedCategoryIds.length > 0
        ? allStores.filter((s) => s.categories.some((c) => selectedCategoryIds.includes(c)))
        : allStores;
    const all = candidateStores.map((s) => s.id);
    setSelectedStoreIds(all);
    savePreferences({ selectedStoreIds: all });
  };

  const handleToggleCategory = (catId: string) => {
    const updated = selectedCategoryIds.includes(catId)
      ? selectedCategoryIds.filter((id) => id !== catId)
      : [...selectedCategoryIds, catId];
    setSelectedCategoryIds(updated);

    // If categories are active, prune selectedStoreIds to only keep stores matching active categories
    let updatedStoreIds = selectedStoreIds;
    if (updated.length > 0 && selectedStoreIds.length > 0) {
      const allowedStoreIds = new Set(
        allStores
          .filter((s) => s.categories.some((c) => updated.includes(c)))
          .map((s) => s.id)
      );
      updatedStoreIds = selectedStoreIds.filter((id) => allowedStoreIds.has(id));
      if (updatedStoreIds.length !== selectedStoreIds.length) {
        setSelectedStoreIds(updatedStoreIds);
      }
    }

    savePreferences({
      selectedCategoryIds: updated,
      selectedStoreIds: updatedStoreIds,
    });
  };

  const handleToggleCard = (cardId: string) => {
    const updated = selectedCardIds.includes(cardId)
      ? selectedCardIds.filter((id) => id !== cardId)
      : [...selectedCardIds, cardId];
    setSelectedCardIds(updated);
    savePreferences({ selectedCardIds: updated });
  };

  const handleAmountChange = (raw: string, parsed: number | null, err?: string) => {
    setRawAmountInput(raw);
    setPurchaseAmountKr(parsed);
    setAmountError(err);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    if (newSort === 'most_tier') {
      setTierPointsImportant(true);
      savePreferences({ sortBy: newSort, tierPointsImportant: true });
    } else {
      if (tierPointsImportant && newSort === 'most_bonus') {
        setTierPointsImportant(false);
        savePreferences({ sortBy: newSort, tierPointsImportant: false });
      } else {
        savePreferences({ sortBy: newSort });
      }
    }
  };

  // Filter stores based on store selection, categories and search query
  const matchingStores = useMemo(() => {
    let list = allStores.filter((store) => store.isActive);

    // 1. Filter by selected categories if any
    if (selectedCategoryIds.length > 0) {
      list = list.filter((store) =>
        store.categories.some((c) => selectedCategoryIds.includes(c))
      );
    }

    // 2. Filter by specific selected stores if any
    if (selectedStoreIds.length > 0) {
      list = list.filter((store) => selectedStoreIds.includes(store.id));
    }

    // 3. Filter by search query if any
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((store) => {
        const matchesName = store.name.toLowerCase().includes(query);
        const matchesAlias = store.aliases?.some((a) => a.toLowerCase().includes(query));
        const matchesCategory = store.categories.some((c) => {
          const cat = DEMO_CATEGORIES.find((item) => item.id === c);
          return cat && cat.name.toLowerCase().includes(query);
        });
        return matchesName || matchesAlias || matchesCategory;
      });
    }

    return list;
  }, [allStores, selectedStoreIds, selectedCategoryIds, searchQuery]);

  // Generate candidate routes & process ranking
  const calculationResults = useMemo(() => {
    if (!purchaseAmountKr || purchaseAmountKr <= 0 || matchingStores.length === 0) {
      return [];
    }

    const candidateRoutes: RouteCalculationResult[] = [];

    for (const store of matchingStores) {
      // Find matching SAS gift card for this store (active ones only)
      const sasGiftCardItem = sasGiftCards.find(
        (gc) =>
          gc.matchedStoreId === store.id ||
          gc.matchedStoreId === store.slug ||
          gc.id === store.id ||
          gc.slug === store.slug ||
          gc.id === store.slug ||
          cleanSlug(gc.id) === cleanSlug(store.id) ||
          cleanSlug(gc.slug) === cleanSlug(store.slug) ||
          cleanSlug(gc.id) === cleanSlug(store.slug) ||
          gc.name.trim().toLowerCase() === store.name.trim().toLowerCase()
      ) ?? null;

      const routes = generateCandidateRoutes({
        store,
        purchaseAmountKr,
        availableCards: DEMO_CARDS,
        selectedCardIds,
        allowPartnerStores,
        allowGiftCards,
        allowZupergift,
        zupergiftRatePer100Kr: zupergiftRate,
        zupergiftIsCampaign: zupergiftIsCampaign,
        sasGiftCardItem,
      });

      candidateRoutes.push(...routes);
    }

    const filterState: FilterState = {
      selectedStoreIds: matchingStores.map((s) => s.id),
      purchaseAmountKr,
      rawAmountInput,
      allowPartnerStores,
      allowGiftCards,
      allowZupergift,
      tierPointsImportant,
      onlyCampaigns,
      oneTimeBonusFilter,
      selectedCardIds,
      sortBy,
      searchQuery,
      selectedCategory: null,
    };

    return processAndRankRoutes(candidateRoutes, filterState);
  }, [
    matchingStores,
    purchaseAmountKr,
    allowPartnerStores,
    allowGiftCards,
    allowZupergift,
    excludeComplex,
    tierPointsImportant,
    onlyCampaigns,
    oneTimeBonusFilter,
    selectedCardIds,
    sortBy,
    rawAmountInput,
    searchQuery,
    zupergiftRate,
    zupergiftIsCampaign,
  ]);

  // Selected card objects
  const selectedCards = useMemo(() => {
    return DEMO_CARDS.filter((c) => selectedCardIds.includes(c.id));
  }, [selectedCardIds]);

  // Category summary text for results header
  const categoryNames = useMemo(() => {
    if (selectedCategoryIds.length === 0) return 'Alla kategorier';
    return selectedCategoryIds
      .map((id) => categories.find((c) => c.id === id)?.name || id)
      .join(', ');
  }, [selectedCategoryIds, categories]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-slate-900">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 flex-1 w-full">
        {/* Hero rubrik och förklaring */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-2xs">
            <Plane className="w-3.5 h-3.5 -rotate-45" />
            <span>Första sidan · Poängkollen</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Jämför bonuspoäng
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium">
            Hitta bästa vägen till fler EuroBonus-poäng för ditt köp. Jämför butiker, presentkort och dina betalkort.
          </p>
        </div>

        {/* Central sök- och filterbox */}
        <div id="butiker" className="scroll-mt-20">
        <SearchFilterBox
          allStores={allStores}
          selectedStoreIds={selectedStoreIds}
          onToggleStore={handleToggleStore}
          onClearStores={handleClearStores}
          onSelectAllStores={handleSelectAllStores}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          onToggleCategory={handleToggleCategory}
          purchaseAmountKr={purchaseAmountKr}
          rawAmountInput={rawAmountInput}
          onAmountChange={handleAmountChange}
          amountError={amountError}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          allowPartnerStores={allowPartnerStores}
          onTogglePartnerStores={(val) => {
            setAllowPartnerStores(val);
            savePreferences({ allowPartnerStores: val });
          }}
          allowGiftCards={allowGiftCards}
          onToggleGiftCards={(val) => {
            setAllowGiftCards(val);
            savePreferences({ allowGiftCards: val });
          }}
          allowZupergift={allowZupergift}
          onToggleZupergift={(val) => {
            setAllowZupergift(val);
            savePreferences({ allowZupergift: val });
          }}
          tierPointsImportant={tierPointsImportant}
          onToggleTierPoints={(val) => {
            setTierPointsImportant(val);
            if (val) {
              setSortBy('most_tier');
            } else if (sortBy === 'most_tier') {
              setSortBy('most_bonus');
            }
            savePreferences({
              tierPointsImportant: val,
              sortBy: val ? 'most_tier' : 'most_bonus',
            });
          }}
          onlyCampaigns={onlyCampaigns}
          onToggleOnlyCampaigns={(val) => {
            setOnlyCampaigns(val);
            savePreferences({ onlyCampaigns: val });
          }}
          oneTimeBonusFilter={oneTimeBonusFilter}
          onOneTimeBonusFilterChange={(val) => {
            setOneTimeBonusFilter(val);
            savePreferences({ oneTimeBonusFilter: val });
          }}
          availableCards={DEMO_CARDS}
          selectedCardIds={selectedCardIds}
          onToggleCard={handleToggleCard}
          onCompareSubmit={() => {}}
        />
        </div>

        {/* Resultatsektion */}
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                {calculationResults.length} alternativ hittades
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 flex items-center flex-wrap gap-1.5">
                <span>Baserat på {purchaseAmountKr ? `${purchaseAmountKr.toLocaleString('sv-SE')} kr` : 'angivet köpbelopp'} • {selectedStoreIds.length > 0 ? `${selectedStoreIds.length} valda butiker` : categoryNames}</span>
                {tierPointsImportant && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    Endast med nivåpoäng
                  </span>
                )}
                {onlyCampaigns && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200/50">
                    Endast kampanjer
                  </span>
                )}
                {!allowPartnerStores && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200/50">
                    Partnerbutiker dolda
                  </span>
                )}
                {oneTimeBonusFilter === 'only' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200/50">
                    ⚡ Endast engångsbonusar
                  </span>
                )}
                {oneTimeBonusFilter === 'exclude' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800">
                    Exkluderat engångsbonusar
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Resultatkort */}
          {calculationResults.length > 0 ? (
            <div className="space-y-3.5">
              {calculationResults.map((route) => (
                <AlternativeCard
                  key={route.id}
                  route={route}
                  selectedCards={selectedCards}
                  onReportError={(r) => setActiveReportRoute(r)}
                />
              ))}
            </div>
          ) : (
            <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
              <Info className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                {onlyCampaigns
                  ? 'Inga aktiva kampanjer matchar ditt val'
                  : oneTimeBonusFilter === 'only'
                  ? 'Inga engångsbonusar matchar ditt val'
                  : tierPointsImportant
                  ? 'Inga alternativ ger nivåpoäng för ditt val'
                  : !allowPartnerStores && !allowGiftCards
                  ? 'Både partnerbutiker och presentkort är dolda'
                  : !allowPartnerStores
                  ? 'Inga presentkortsalternativ matchar ditt val'
                  : 'Inga köpvägar matchar ditt val'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                {onlyCampaigns
                  ? 'Det finns inga aktiva kampanjer just nu för de valda butikerna eller kategorierna. Slå av reglaget "Endast kampanjer" för att se ordinarie poängerbjudanden.'
                  : oneTimeBonusFilter === 'only'
                  ? 'Ingen av de valda butikerna eller kategorierna erbjuder engångsbonus. Välj "Visa alla" i engångsbonus-filtret.'
                  : tierPointsImportant
                  ? 'De valda butikerna eller köpvägarna ger endast Extrapoäng. Slå av reglaget "Nivåpoäng viktiga" för att se alla tillgängliga alternativ.'
                  : !allowPartnerStores && !allowGiftCards
                  ? 'Aktivera "Visa partnerbutiker" eller "Visa presentkort" för att se resultat.'
                  : !allowPartnerStores
                  ? 'De valda butikerna har inga presentkort eller Zupergift-stöd. Slå på "Visa partnerbutiker" för att se vanliga partnerköp.'
                  : 'Prova att ändra kategorier, aktivera presentkort eller ändra ditt köpbelopp för att se fler alternativ.'}
              </p>
            </div>
          )}
        </div>

        {/* Villkorstext enligt kapitel 6.4 */}
        <TermsNotice />
      </main>

      {/* Felrapporteringsmodal */}
      {activeReportRoute && (
        <ErrorReportModal
          route={activeReportRoute}
          onClose={() => setActiveReportRoute(null)}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
