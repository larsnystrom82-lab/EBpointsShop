'use client';

import React, { useState, useId, useMemo } from 'react';
import { Store, Category } from '@/types/domain';
import { Search, X, Check, Store as StoreIcon, ListFilter } from 'lucide-react';
import Image from 'next/image';

export interface StoreFilterGroup {
  key: string;
  displayName: string;
  isAliasGroup: boolean;
  storeIds: string[];
  stores: Store[];
  logoUrl?: string;
  categories: string[];
}

interface StoreSelectorProps {
  allStores: Store[];
  categories: Category[];
  selectedStoreIds: string[];
  onToggleStore: (storeId: string) => void;
  onToggleStores?: (storeIds: string[]) => void;
  onClearStores: () => void;
  onSelectStores: (storeIds: string[]) => void;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({
  allStores,
  categories,
  selectedStoreIds,
  onToggleStore,
  onToggleStores,
  onClearStores,
  onSelectStores,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAlphabeticalModal, setShowAlphabeticalModal] = useState(false);
  const searchInputId = useId();

  // Group stores by alias if present (so stores with same alias appear only once in filter)
  const filterGroups: StoreFilterGroup[] = useMemo(() => {
    const aliasGroupMap = new Map<string, StoreFilterGroup>();
    const result: StoreFilterGroup[] = [];

    for (const store of allStores) {
      if (!store.isActive) continue;
      const aliasClean = store.alias?.trim();
      if (aliasClean) {
        const aliasKey = aliasClean.toLowerCase();
        let existing = aliasGroupMap.get(aliasKey);
        if (!existing) {
          existing = {
            key: `alias:${aliasKey}`,
            displayName: aliasClean,
            isAliasGroup: true,
            storeIds: [store.id],
            stores: [store],
            logoUrl: store.logoUrl,
            categories: [...(store.categories || [])],
          };
          aliasGroupMap.set(aliasKey, existing);
          result.push(existing);
        } else {
          existing.storeIds.push(store.id);
          existing.stores.push(store);
          if (store.name.toLowerCase() === aliasKey || (!existing.logoUrl && store.logoUrl)) {
            existing.logoUrl = store.logoUrl;
          }
          for (const c of store.categories || []) {
            if (!existing.categories.includes(c)) existing.categories.push(c);
          }
        }
      } else {
        result.push({
          key: `store:${store.id}`,
          displayName: store.name,
          isAliasGroup: false,
          storeIds: [store.id],
          stores: [store],
          logoUrl: store.logoUrl,
          categories: [...(store.categories || [])],
        });
      }
    }

    return result;
  }, [allStores]);

  // Search logic: matches displayName, underlying store names, or aliases
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    return filterGroups.filter((group) => {
      // Category filter
      if (selectedCategory && !group.categories.includes(selectedCategory)) {
        return false;
      }

      if (!normalizedSearch) return true;

      if (group.displayName.toLowerCase().includes(normalizedSearch)) return true;
      if (group.stores.some((s) => s.name.toLowerCase().includes(normalizedSearch))) return true;
      if (group.stores.some((s) => s.aliases?.some((a) => a.toLowerCase().includes(normalizedSearch)))) return true;

      return false;
    });
  }, [filterGroups, selectedCategory, normalizedSearch]);

  const handleToggleGroup = (group: StoreFilterGroup) => {
    if (onToggleStores) {
      onToggleStores(group.storeIds);
      return;
    }
    const isSelected = group.storeIds.some((id) => selectedStoreIds.includes(id));
    if (isSelected) {
      const toRemove = new Set(group.storeIds);
      onSelectStores(selectedStoreIds.filter((id) => !toRemove.has(id)));
    } else {
      const toAdd = new Set([...selectedStoreIds, ...group.storeIds]);
      onSelectStores(Array.from(toAdd));
    }
  };

  // Selected filter groups (deduplicated by alias)
  const selectedGroups = useMemo(() => {
    const selectedSet = new Set(selectedStoreIds);
    return filterGroups.filter((group) => group.storeIds.some((id) => selectedSet.has(id)));
  }, [filterGroups, selectedStoreIds]);

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
              1
            </span>
            Välj butiker att jämföra
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Välj en eller flera butiker du vill handla från.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAlphabeticalModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 self-start sm:self-auto touch-target"
        >
          <ListFilter className="w-4 h-4" />
          <span>Alfabetisk lista (A–Ö)</span>
        </button>
      </div>

      {/* Valda butiker som borttagbara taggar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-2">
          <span>Valda ({selectedGroups.length}):</span>
          {selectedGroups.length > 0 && (
            <button
              type="button"
              onClick={onClearStores}
              className="text-red-600 hover:text-red-800 text-xs underline cursor-pointer p-1"
            >
              Rensa alla
            </button>
          )}
        </div>

        {selectedGroups.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs sm:text-sm text-slate-500 text-center">
            Inga butiker valda ännu. Sök nedan eller välj ur listan för att börja jämföra.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedGroups.map((group) => (
              <span
                key={group.key}
                className="inline-flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs sm:text-sm font-semibold shadow-2xs"
              >
                {group.logoUrl ? (
                  <span className="w-5 h-5 relative shrink-0 overflow-hidden rounded-xs">
                    <Image
                      src={group.logoUrl}
                      alt=""
                      width={20}
                      height={20}
                      className="object-contain w-full h-full"
                    />
                  </span>
                ) : (
                  <StoreIcon className="w-4 h-4 text-blue-600" />
                )}
                <span>{group.displayName}</span>
                {group.stores.length > 1 && (
                  <span className="text-[10px] text-blue-700 font-normal opacity-80">({group.stores.length})</span>
                )}
                <button
                  type="button"
                  onClick={() => handleToggleGroup(group)}
                  className="w-5 h-5 rounded-full hover:bg-blue-200 inline-flex items-center justify-center text-blue-700 hover:text-blue-900 transition-colors"
                  aria-label={`Ta bort ${group.displayName}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Sökfält med alias-stöd */}
      <div className="relative mb-3">
        <label htmlFor={searchInputId} className="sr-only">
          Sök butik eller alias
        </label>
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          id={searchInputId}
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Sök butik eller alias (t.ex. TV4 Play, Cervera, Elgiganten)..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all touch-target"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            aria-label="Rensa sökning"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Kategoriflikar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 touch-target flex items-center ${
            selectedCategory === null
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Alla kategorier
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 touch-target flex items-center ${
              selectedCategory === cat.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Butiksgalleri med logotyper och tydlig markering */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
        {filteredGroups.map((group) => {
          const isSelected = group.storeIds.some((id) => selectedStoreIds.includes(id));
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => handleToggleGroup(group)}
              className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-2 transition-all relative touch-target ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
              <div className="w-24 h-10 relative flex items-center justify-center">
                {group.logoUrl ? (
                  <Image
                    src={group.logoUrl}
                    alt={group.displayName}
                    width={96}
                    height={40}
                    className="max-h-9 w-auto object-contain"
                  />
                ) : (
                  <div className="w-full h-8 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-500 font-semibold text-center px-1">
                    {group.displayName}
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-900 text-center line-clamp-1">
                {group.displayName}
              </span>
              {group.stores.length > 1 && (
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded-md font-medium">
                  {group.stores.length} erbjudanden
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Alfabetisk modal (A-Ö) */}
      {showAlphabeticalModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Alfabetisk butikslista (A–Ö)
              </h3>
              <button
                type="button"
                onClick={() => setShowAlphabeticalModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                aria-label="Stäng modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              {[...filterGroups]
                .sort((a, b) => a.displayName.localeCompare(b.displayName, 'sv'))
                .map((group) => {
                  const isSelected = group.storeIds.some((id) => selectedStoreIds.includes(id));
                  return (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => handleToggleGroup(group)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-7 relative flex items-center justify-center shrink-0">
                          {group.logoUrl && (
                            <Image
                              src={group.logoUrl}
                              alt=""
                              width={64}
                              height={28}
                              className="max-h-7 w-auto object-contain"
                            />
                          )}
                        </div>
                        <span className="flex items-center gap-2">
                          <span>{group.displayName}</span>
                          {group.stores.length > 1 && (
                            <span className="text-[10px] text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded-md font-semibold">
                              {group.stores.length} erbjudanden
                            </span>
                          )}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border ${
                          isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
            </div>

            <div className="pt-4 border-t border-slate-200 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAlphabeticalModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold touch-target"
              >
                Klar ({selectedGroups.length} valda)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
