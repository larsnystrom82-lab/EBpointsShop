'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Store as StoreIcon, ChevronDown, CheckSquare, Square } from 'lucide-react';
import Image from 'next/image';
import { Store } from '@/types/domain';

export interface StoreFilterGroup {
  key: string;
  displayName: string;
  isAliasGroup: boolean;
  storeIds: string[];
  stores: Store[];
  logoUrl?: string;
  zupergiftSupported: boolean;
  hasPartnerLink: boolean;
  hasSasGiftCard: boolean;
}

interface StoreMultiSelectDropdownProps {
  allStores: Store[];
  selectedStoreIds: string[];
  onToggleStore: (storeId: string) => void;
  onToggleStores?: (storeIds: string[]) => void;
  onClearSelection: () => void;
  onSelectAll?: (storeIds?: string[]) => void;
  label?: string;
  isCategoryFiltered?: boolean;
}

export const StoreMultiSelectDropdown: React.FC<StoreMultiSelectDropdownProps> = ({
  allStores,
  selectedStoreIds,
  onToggleStore,
  onToggleStores,
  onClearSelection,
  onSelectAll,
  label = 'Välj butik',
  isCategoryFiltered = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset search query and focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Group stores by alias if set; stores sharing the same alias appear ONLY ONCE in filter
  const filterGroups: StoreFilterGroup[] = useMemo(() => {
    const aliasGroupMap = new Map<string, StoreFilterGroup>();
    const result: StoreFilterGroup[] = [];

    for (const store of allStores) {
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
            zupergiftSupported: Boolean(store.zupergiftSupported),
            hasPartnerLink: Boolean(store.hasPartnerLink),
            hasSasGiftCard: Boolean(store.hasSasGiftCard),
          };
          aliasGroupMap.set(aliasKey, existing);
          result.push(existing);
        } else {
          existing.storeIds.push(store.id);
          existing.stores.push(store);
          // Prefer logo of the store whose name matches the alias, or first available logo
          if (store.name.toLowerCase() === aliasKey || (!existing.logoUrl && store.logoUrl)) {
            existing.logoUrl = store.logoUrl;
          }
          if (store.zupergiftSupported) existing.zupergiftSupported = true;
          if (store.hasPartnerLink) existing.hasPartnerLink = true;
          if (store.hasSasGiftCard) existing.hasSasGiftCard = true;
        }
      } else {
        result.push({
          key: `store:${store.id}`,
          displayName: store.name,
          isAliasGroup: false,
          storeIds: [store.id],
          stores: [store],
          logoUrl: store.logoUrl,
          zupergiftSupported: Boolean(store.zupergiftSupported),
          hasPartnerLink: Boolean(store.hasPartnerLink),
          hasSasGiftCard: Boolean(store.hasSasGiftCard),
        });
      }
    }

    return result;
  }, [allStores]);

  // Separate filter groups into Selected and Unselected
  const { selectedGroups, unselectedGroups } = useMemo(() => {
    const selected: StoreFilterGroup[] = [];
    const unselected: StoreFilterGroup[] = [];

    const selectedSet = new Set(selectedStoreIds);

    for (const group of filterGroups) {
      const isSelected = group.storeIds.some((id) => selectedSet.has(id));
      if (isSelected) {
        selected.push(group);
      } else {
        unselected.push(group);
      }
    }

    return { selectedGroups: selected, unselectedGroups: unselected };
  }, [filterGroups, selectedStoreIds]);

  // Filter groups based on search query
  const query = searchQuery.trim().toLowerCase();

  const filterGroup = (group: StoreFilterGroup) => {
    if (!query) return true;
    if (group.displayName.toLowerCase().includes(query)) return true;
    if (group.stores.some((s) => s.name.toLowerCase().includes(query))) return true;
    if (group.stores.some((s) => s.aliases?.some((a) => a.toLowerCase().includes(query)))) return true;
    return false;
  };

  const filteredSelected = useMemo(() => selectedGroups.filter(filterGroup), [selectedGroups, query]);
  const filteredUnselected = useMemo(() => unselectedGroups.filter(filterGroup), [unselectedGroups, query]);

  const totalMatching = filteredSelected.length + filteredUnselected.length;

  // Monogram generator for logos
  const getMonogram = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleImageError = (key: string) => {
    setImgErrors((prev) => ({ ...prev, [key]: true }));
  };

  const handleToggleGroup = (group: StoreFilterGroup) => {
    if (onToggleStores) {
      onToggleStores(group.storeIds);
      return;
    }
    const isSelected = group.storeIds.some((id) => selectedStoreIds.includes(id));
    if (onSelectAll) {
      if (isSelected) {
        const toRemove = new Set(group.storeIds);
        onSelectAll(selectedStoreIds.filter((id) => !toRemove.has(id)));
      } else {
        const toAdd = new Set([...selectedStoreIds, ...group.storeIds]);
        onSelectAll(Array.from(toAdd));
      }
    } else {
      for (const id of group.storeIds) {
        onToggleStore(id);
      }
    }
  };

  const handleSelectAll = () => {
    if (!onSelectAll) return;
    if (query) {
      const matchingIds = [...filteredSelected, ...filteredUnselected].flatMap((g) => g.storeIds);
      const newSelection = Array.from(new Set([...selectedStoreIds, ...matchingIds]));
      onSelectAll(newSelection);
    } else {
      const allIds = allStores.map((s) => s.id);
      onSelectAll(allIds);
    }
  };

  const canSelectAll =
    Boolean(onSelectAll) &&
    (query ? filteredUnselected.length > 0 : selectedStoreIds.length < allStores.length);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Label and counter */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
        <span className="text-[11px] text-slate-500 font-medium">
          {selectedStoreIds.length === 0
            ? isCategoryFiltered
              ? `Alla i kategorin (${filterGroups.length} st)`
              : `Alla (${filterGroups.length} st)`
            : `${selectedGroups.length} av ${filterGroups.length} valda`}
        </span>
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full min-h-[44px] px-3 py-2 rounded-xl border transition-all text-left flex items-center justify-between gap-2 touch-target ${
          isOpen
            ? 'border-blue-600 bg-white ring-2 ring-blue-100 shadow-xs'
            : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          <div className="p-1 rounded-lg bg-blue-50 text-blue-700 shrink-0">
            <StoreIcon className="w-4 h-4" />
          </div>

          {selectedStoreIds.length === 0 ? (
            <div className="truncate">
              <span className="text-sm font-semibold text-slate-800">
                Alla butiker
              </span>
              <span className="text-xs text-slate-400 ml-1.5 hidden sm:inline">
                ({filterGroups.length} st {isCategoryFiltered ? 'i vald kategori' : 'tillgängliga'})
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 items-center overflow-hidden">
              {selectedGroups.slice(0, 2).map((group) => (
                <span
                  key={group.key}
                  className="inline-flex items-center gap-1 bg-blue-100/80 text-blue-900 font-semibold px-2 py-0.5 rounded-lg text-xs shrink-0"
                >
                  <span className="max-w-[110px] truncate">{group.displayName}</span>
                  {group.stores.length > 1 && (
                    <span className="text-[10px] opacity-75 font-normal">({group.stores.length})</span>
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleGroup(group);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        handleToggleGroup(group);
                      }
                    }}
                    className="hover:text-blue-950 p-0.5 rounded-full hover:bg-blue-200/60"
                    aria-label={`Ta bort ${group.displayName}`}
                  >
                    <X className="w-3 h-3" />
                  </span>
                </span>
              ))}

              {selectedGroups.length > 2 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 text-xs font-bold shrink-0">
                  +{selectedGroups.length - 2} till
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedStoreIds.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClearSelection();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onClearSelection();
                }
              }}
              className="p-1 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Rensa urval (visa alla butiker)"
              aria-label="Rensa urval"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
          />
        </div>
      </button>

      {/* Rullgardinsmeny med sökfunktion och kryssrutor */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-[420px] mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[460px]">
          {/* Sökfält i toppen av dropdown */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök butik eller alias (t.ex. TV4 Play, Cervera, IKEA)..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label="Rensa sökning"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Snabbval och räknare */}
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 px-1 font-medium">
              <span>
                {query
                  ? `Matchar ${totalMatching} val`
                  : isCategoryFiltered
                  ? `${filterGroups.length} val i vald kategori`
                  : `${filterGroups.length} val totalt`}
              </span>
              <div className="flex items-center gap-3">
                {selectedStoreIds.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="text-red-600 hover:text-red-700 font-semibold hover:underline"
                  >
                    Rensa alla ({selectedGroups.length})
                  </button>
                )}
                {canSelectAll && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                  >
                    Välj alla
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Rullgardinslista */}
          <div className="overflow-y-auto flex-1 p-2 space-y-3 divide-y divide-slate-100">
            {/* 1. SEKTION: VALDA ALTERNATIV I TOPPEN */}
            {filteredSelected.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50/80 rounded-lg">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    Valda ({filteredSelected.length})
                  </span>
                  <span className="text-[10px] text-blue-600 normal-case font-medium">
                    Visas i toppen
                  </span>
                </div>

                <div className="space-y-0.5 pt-1">
                  {filteredSelected.map((group) => (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => handleToggleGroup(group)}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-blue-50/50 hover:bg-blue-100/60 border border-blue-200/70 transition-colors text-left group touch-target"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Kryssruta - Ikryssad */}
                        <div className="w-5 h-5 rounded-md bg-blue-600 border border-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        {/* Butikslogo eller Monogram */}
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                          {group.logoUrl && !imgErrors[group.key] ? (
                            <Image
                              src={group.logoUrl}
                              alt=""
                              width={24}
                              height={24}
                              className="max-h-6 w-auto object-contain"
                              onError={() => handleImageError(group.key)}
                            />
                          ) : (
                            <span className="text-[10px] font-extrabold text-blue-800">
                              {getMonogram(group.displayName)}
                            </span>
                          )}
                        </div>

                        {/* Namn och taggar */}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{group.displayName}</span>
                            {group.stores.length > 1 && (
                              <span className="text-[10px] font-medium text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded-md shrink-0">
                                {group.stores.length} erbjudanden
                              </span>
                            )}
                          </div>
                          {group.zupergiftSupported && (
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              Zupergift
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-xs text-blue-700 font-semibold opacity-80 group-hover:opacity-100 shrink-0 text-[11px]">
                        Vald
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. SEKTION: ÖVRIGA / TILLGÄNGLIGA BUTIKER */}
            <div className={filteredSelected.length > 0 ? 'pt-2 space-y-1' : 'space-y-1'}>
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {filteredSelected.length > 0
                  ? `Fler val (${filteredUnselected.length})`
                  : `Alla val (${filteredUnselected.length})`}
              </div>

              {filteredUnselected.length === 0 && filteredSelected.length === 0 ? (
                <div className="py-8 text-center px-4 space-y-1">
                  <p className="text-sm font-semibold text-slate-700">
                    Ingen butik matchar &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-xs text-slate-500">
                    {isCategoryFiltered
                      ? 'Prova att söka på en annan butik eller välj fler kategorier.'
                      : 'Prova att söka på en annan butik eller rensa sökfältet.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredUnselected.map((group) => (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => handleToggleGroup(group)}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors text-left group touch-target"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Kryssruta - Ej ikryssad */}
                        <div className="w-5 h-5 rounded-md border border-slate-300 bg-white group-hover:border-blue-400 flex items-center justify-center shrink-0 transition-colors">
                          <Square className="w-3.5 h-3.5 text-transparent" />
                        </div>

                        {/* Butikslogo eller Monogram */}
                        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                          {group.logoUrl && !imgErrors[group.key] ? (
                            <Image
                              src={group.logoUrl}
                              alt=""
                              width={24}
                              height={24}
                              className="max-h-6 w-auto object-contain"
                              onError={() => handleImageError(group.key)}
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-slate-600">
                              {getMonogram(group.displayName)}
                            </span>
                          )}
                        </div>

                        {/* Namn och taggar */}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-900 flex items-center gap-1.5">
                            <span>{group.displayName}</span>
                            {group.stores.length > 1 && (
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md shrink-0">
                                {group.stores.length} erbjudanden
                              </span>
                            )}
                          </div>
                          {group.zupergiftSupported && (
                            <span className="text-[10px] font-normal text-slate-500">
                              Zupergift
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity text-[11px]">
                        Välj
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer med Klar-knapp */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium px-1">
              {selectedStoreIds.length === 0
                ? 'Jämför alla butiker'
                : `${selectedGroups.length} val (${selectedStoreIds.length} butiker)`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors touch-target shadow-xs"
            >
              Klar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
