'use client';

import React, { useState, useId } from 'react';
import { Store, Category } from '@/types/domain';
import { Search, X, Check, Store as StoreIcon, ListFilter } from 'lucide-react';
import Image from 'next/image';

interface StoreSelectorProps {
  allStores: Store[];
  categories: Category[];
  selectedStoreIds: string[];
  onToggleStore: (storeId: string) => void;
  onClearStores: () => void;
  onSelectStores: (storeIds: string[]) => void;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({
  allStores,
  categories,
  selectedStoreIds,
  onToggleStore,
  onClearStores,
  onSelectStores,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAlphabeticalModal, setShowAlphabeticalModal] = useState(false);
  const searchInputId = useId();

  // Search logic: F01 standard name and aliases, case-insensitive
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredStores = allStores.filter((store) => {
    if (!store.isActive) return false;

    // Category filter
    if (selectedCategory && !store.categories.includes(selectedCategory)) {
      return false;
    }

    if (!normalizedSearch) return true;

    // Check store name
    if (store.name.toLowerCase().includes(normalizedSearch)) return true;

    // Check store aliases
    if (store.aliases.some((alias) => alias.toLowerCase().includes(normalizedSearch))) {
      return true;
    }

    return false;
  });

  const selectedStores = allStores.filter((s) => selectedStoreIds.includes(s.id));

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

      {/* Valda butiker som borttagbara taggar (F03) */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-2">
          <span>Valda butiker ({selectedStores.length}):</span>
          {selectedStores.length > 0 && (
            <button
              type="button"
              onClick={onClearStores}
              className="text-red-600 hover:text-red-800 text-xs underline cursor-pointer p-1"
            >
              Rensa alla
            </button>
          )}
        </div>

        {selectedStores.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs sm:text-sm text-slate-500 text-center">
            Inga butiker valda ännu. Sök nedan eller välj ur listan för att börja jämföra.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedStores.map((store) => (
              <span
                key={store.id}
                className="inline-flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs sm:text-sm font-semibold shadow-2xs"
              >
                {store.logoUrl ? (
                  <span className="w-5 h-5 relative shrink-0 overflow-hidden rounded-xs">
                    <Image
                      src={store.logoUrl}
                      alt=""
                      width={20}
                      height={20}
                      className="object-contain w-full h-full"
                    />
                  </span>
                ) : (
                  <StoreIcon className="w-4 h-4 text-blue-600" />
                )}
                <span>{store.name}</span>
                <button
                  type="button"
                  onClick={() => onToggleStore(store.id)}
                  className="w-5 h-5 rounded-full hover:bg-blue-200 inline-flex items-center justify-center text-blue-700 hover:text-blue-900 transition-colors"
                  aria-label={`Ta bort ${store.name}`}
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
          Sök butik eller domän
        </label>
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          id={searchInputId}
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Sök butik eller domän (t.ex. Cervera, Elgiganten, Bagaren & Kocken)..."
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

      {/* Kategoriflikar (F02) */}
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
        {filteredStores.map((store) => {
          const isSelected = selectedStoreIds.includes(store.id);
          return (
            <button
              key={store.id}
              type="button"
              onClick={() => onToggleStore(store.id)}
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
                {store.logoUrl ? (
                  <Image
                    src={store.logoUrl}
                    alt={store.name}
                    width={96}
                    height={40}
                    className="max-h-9 w-auto object-contain"
                  />
                ) : (
                  <div className="w-full h-8 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-500 font-semibold">
                    {store.name}
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-900 text-center line-clamp-1">
                {store.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Alfabetisk modal (F02) */}
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
              {[...allStores]
                .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
                .map((store) => {
                  const isSelected = selectedStoreIds.includes(store.id);
                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => onToggleStore(store.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-7 relative flex items-center justify-center shrink-0">
                          {store.logoUrl && (
                            <Image
                              src={store.logoUrl}
                              alt=""
                              width={64}
                              height={28}
                              className="max-h-7 w-auto object-contain"
                            />
                          )}
                        </div>
                        <span>{store.name}</span>
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
                Klar ({selectedStoreIds.length} butiker valda)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
