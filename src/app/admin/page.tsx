'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  LogOut,
  Gift,
  Store as StoreIcon,
  AlertTriangle,
  History,
  Save,
  RefreshCw,
  CheckCircle,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  Lightbulb,
  Mail,
  Tag,
  Plus,
  ImageIcon,
  MessageSquare,
  Building,
} from 'lucide-react';
import type { DatabaseSchema, DbStore, ZupergiftStoreItem } from '@/lib/db';
import type { Store } from '@/types/domain';
import { DEMO_CATEGORIES } from '@/lib/fixtures/demo-data';

interface AdminData extends DatabaseSchema {
  allStores?: Store[];
}

const KNOWN_EXISTING_LOGOS = new Set([
  'ahlens',
  'apotek-hjartat',
  'bagaren-och-kocken',
  'boozt',
  'cervera',
  'elgiganten',
  'ikea',
  'kitchentime',
  'netonnet',
  'neutral-store',
  'stadium',
  'zalando',
]);

function isStoreMissingLogo(store?: { customLogoUrl?: string | null; logoUrl?: string | null; id?: string; slug?: string } | null): boolean {
  if (!store) return true;
  if (store.customLogoUrl && store.customLogoUrl.trim()) return false;
  if (!store.logoUrl || !store.logoUrl.trim()) return true;
  if (store.logoUrl.startsWith('http://') || store.logoUrl.startsWith('https://')) return false;

  if (store.logoUrl.startsWith('/logos/')) {
    const rawName = store.logoUrl.replace('/logos/', '').replace(/\.(svg|png|jpg|webp)$/i, '').toLowerCase();
    if (KNOWN_EXISTING_LOGOS.has(rawName)) return false;
    if (store.id && KNOWN_EXISTING_LOGOS.has(store.id.toLowerCase())) return false;
    if (store.slug && KNOWN_EXISTING_LOGOS.has(store.slug.toLowerCase())) return false;
    return true;
  }
  return true;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'all_stores' | 'zupergift' | 'sas_giftcards' | 'stores' | 'categories' | 'reports' | 'audit'>('all_stores');
  const [dbData, setDbData] = useState<AdminData | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // States for "Alla butiker" tab
  const [allStoresSearch, setAllStoresSearch] = useState('');
  const [allStoresFilter, setAllStoresFilter] = useState<'all' | 'partner' | 'zupergift' | 'sas' | 'has_logo' | 'missing_logo' | 'has_comment' | 'excluded'>('all');
  const [storeMetadataEdits, setStoreMetadataEdits] = useState<Record<string, {
    customLogoUrl: string;
    comment: string;
  }>>({});
  const [storeMetadataSaving, setStoreMetadataSaving] = useState<Record<string, boolean>>({});

  // Form states for Category management
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Form states for Zupergift point settings
  const [zgRate, setZgRate] = useState<number>(30);
  const [zgCampaign, setZgCampaign] = useState<boolean>(true);
  const [zgValidUntil, setZgValidUntil] = useState<string>('2026-10-31');
  const [zgNote, setZgNote] = useState<string>('');
  const [syncingZg, setSyncingZg] = useState<boolean>(false);

  // Zupergift store filter & search
  const [zgSearch, setZgSearch] = useState('');
  const [zgFilter, setZgFilter] = useState<'all' | 'active' | 'hidden' | 'excluded'>('all');

  // SAS Presentkort tab
  const [syncingSasGc, setSyncingSasGc] = useState<boolean>(false);
  const [sasGcSearch, setSasGcSearch] = useState('');
  const [sasGcFilter, setSasGcFilter] = useState<'all' | 'active' | 'unconfigured' | 'hidden'>('all');
  // Per-row edit state (keyed by store id): holds draft values
  const [sasGcEdits, setSasGcEdits] = useState<Record<string, {
    bonusPer100Kr: string;
    minPurchaseAmount: string;
    isCampaign: boolean;
    campaignValidUntil: string;
    isHidden: boolean;
    note: string;
  }>>({});
  const [sasGcSaving, setSasGcSaving] = useState<Record<string, boolean>>({});

  // SAS Partner stores live sync & filter
  const [syncingPartner, setSyncingPartner] = useState<boolean>(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<'all' | 'partner' | 'campaign' | 'zupergift' | 'fixed'>('all');

  // Load admin data
  const fetchAdminData = async () => {
    try {
      const res = await fetch('/api/admin/data');
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (res.ok) {
        const data: DatabaseSchema = await res.json();
        setDbData(data);
        setIsAuthenticated(true);
        // Init Zupergift form
        setZgRate(data.zupergiftConfig.ratePer100Kr);
        setZgCampaign(data.zupergiftConfig.isCampaign);
        setZgValidUntil(data.zupergiftConfig.campaignValidUntil || '');
        setZgNote(data.zupergiftConfig.note || '');
      }
    } catch (err) {
      console.error(err);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAdminData();
      } else {
        setLoginError(data.error || 'Felaktigt lösenord');
      }
    } catch {
      setLoginError('Ett fel uppstod vid inloggning');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setDbData(null);
  };

  const handleSaveZupergift = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/zupergift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratePer100Kr: Number(zgRate),
          isCampaign: zgCampaign,
          campaignValidUntil: zgValidUntil || null,
          note: zgNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message, type: 'success' });
        await fetchAdminData();
      } else {
        setStatusMessage({ text: data.error || 'Kunde inte spara', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Kunde inte spara Zupergift-inställningar', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Trigger live sync against Zupergift website
  const handleLiveSyncZupergift = async () => {
    setSyncingZg(true);
    try {
      const res = await fetch('/api/admin/sync-zupergift', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message, type: 'success' });
        await fetchAdminData();
      } else {
        setStatusMessage({ text: 'Synkronisering mot Zupergift misslyckades', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Kunde inte ansluta till Zupergift', type: 'error' });
    } finally {
      setSyncingZg(false);
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  // Trigger live sync against SAS EuroBonus Shop gift cards
  const handleLiveSyncSasGiftCards = async () => {
    setSyncingSasGc(true);
    try {
      const res = await fetch('/api/admin/sync-sas-giftcards', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message, type: 'success' });
        await fetchAdminData();
      } else {
        setStatusMessage({ text: 'Synkronisering mot SAS Shop misslyckades', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Kunde inte ansluta till SAS EuroBonus Shop', type: 'error' });
    } finally {
      setSyncingSasGc(false);
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  // Save a single SAS gift card store row
  const handleSaveSasGiftCard = async (storeId: string) => {
    const edit = sasGcEdits[storeId];
    const original = dbData?.sasGiftCards.find((s) => s.id === storeId);
    if (!original) return;

    setSasGcSaving((prev) => ({ ...prev, [storeId]: true }));
    try {
      const bonusVal = edit?.bonusPer100Kr !== undefined ? edit.bonusPer100Kr : '';
      const bonusPer100Kr = bonusVal === '' ? null : Number(bonusVal);
      const minVal = edit?.minPurchaseAmount !== undefined ? edit.minPurchaseAmount : '';
      const minPurchaseAmount = minVal === '' ? null : Number(minVal);
      const payload = {
        id: storeId,
        bonusPer100Kr,
        minPurchaseAmount,
        isCampaign: edit?.isCampaign ?? original.isCampaign,
        campaignValidUntil: edit?.campaignValidUntil ?? original.campaignValidUntil ?? null,
        isHidden: edit?.isHidden ?? original.isHidden,
        note: edit?.note ?? original.note,
      };

      const res = await fetch('/api/admin/sas-giftcard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message, type: 'success' });
        await fetchAdminData();
        // Clear edit state for this store
        setSasGcEdits((prev) => { const next = { ...prev }; delete next[storeId]; return next; });
      } else {
        setStatusMessage({ text: data.error || 'Kunde inte spara', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Fel vid sparning av SAS presentkortsbutik', type: 'error' });
    } finally {
      setSasGcSaving((prev) => ({ ...prev, [storeId]: false }));
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleExcludeSasGiftCard = async (storeId: string, storeName: string) => {
    if (!confirm(`Exkludera "${storeName}" permanent? Den kommer inte att återläggas vid framtida synkar.`)) return;
    try {
      const res = await fetch('/api/admin/sas-giftcard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: storeId, isExcluded: true }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: `"${storeName}" exkluderades.`, type: 'success' });
        await fetchAdminData();
      } else {
        setStatusMessage({ text: data.error || 'Kunde inte exkludera', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Fel vid exkludering', type: 'error' });
    } finally {
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Save custom logo and comments for any store in All Stores
  const handleSaveStoreMetadata = async (storeId: string) => {
    const edit = storeMetadataEdits[storeId];
    const store = dbData?.allStores?.find((s) => s.id === storeId);
    if (!store) return;

    setStoreMetadataSaving((prev) => ({ ...prev, [storeId]: true }));
    try {
      const customLogoUrl = edit?.customLogoUrl !== undefined ? edit.customLogoUrl : (store.customLogoUrl || '');
      const comment = edit?.comment !== undefined ? edit.comment : (store.comment || '');

      const res = await fetch('/api/admin/store-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          customLogoUrl: customLogoUrl.trim() || null,
          comment: comment.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message || `Information för "${store.name}" har sparats.`, type: 'success' });
        await fetchAdminData();
        setStoreMetadataEdits((prev) => {
          const next = { ...prev };
          delete next[storeId];
          return next;
        });
      } else {
        setStatusMessage({ text: data.error || 'Kunde inte spara', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Fel vid sparning av butiksinformation', type: 'error' });
    } finally {
      setStoreMetadataSaving((prev) => ({ ...prev, [storeId]: false }));
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Exclude/Delete or Restore a store (e.g. bankruptcy or removed from SAS partner site)
  const handleStoreAction = async (storeId: string, storeName: string, action: 'exclude' | 'restore') => {
    if (action === 'exclude') {
      const confirmed = confirm(
        `Vill du ta bort "${storeName}" från Eurobonus-jakten?\n\nButiken tas bort från sajten och exkluderas från framtida synkningar (används t.ex. vid konkurs eller avslutat samarbete med SAS).`
      );
      if (!confirmed) return;
    }

    try {
      const res = await fetch('/api/admin/store-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message, type: 'success' });
        await fetchAdminData();
      } else {
        setStatusMessage({ text: data.error || 'Åtgärd misslyckades', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Kunde inte utföra butiksåtgärd', type: 'error' });
    } finally {
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Modify store state: hide, unhide, exclude (remove), restore
  const handleZupergiftStoreAction = async (
    storeId: string,
    action: 'hide' | 'unhide' | 'exclude' | 'restore'
  ) => {
    try {
      const res = await fetch('/api/admin/zupergift-stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message, type: 'success' });
        await fetchAdminData();
      } else {
        setStatusMessage({ text: data.error || 'Åtgärd misslyckades', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Kunde inte uppdatera butik', type: 'error' });
    } finally {
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleZupergiftCategoryChange = async (storeId: string, category: string) => {
    try {
      const res = await fetch('/api/admin/zupergift-stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, action: 'set-category', category }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message, type: 'success' });
        await fetchAdminData();
      } else {
        setStatusMessage({ text: data.error || 'Kunde inte ändra kategori', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Kunde inte uppdatera kategori', type: 'error' });
    } finally {
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCreatingCategory(true);
    try {
      const res = await fetch('/api/admin/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: newCategoryName.trim(),
          id: newCategoryId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ text: `Kategori "${newCategoryName.trim()}" har skapats!`, type: 'success' });
        setNewCategoryName('');
        setNewCategoryId('');
        await fetchAdminData();
      } else {
        setStatusMessage({ text: data.error || 'Kunde inte skapa kategori', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Ett fel uppstod vid skapande av kategori', type: 'error' });
    } finally {
      setCreatingCategory(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Är du säker på att du vill ta bort kategorin "${catName}"?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: catId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ text: `Kategori "${catName}" togs bort.`, type: 'success' });
        await fetchAdminData();
      } else {
        setStatusMessage({ text: data.error || 'Kunde inte ta bort kategori', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Ett fel uppstod vid borttagning av kategori', type: 'error' });
    } finally {
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleLiveSyncPartner = async () => {
    setSyncingPartner(true);
    try {
      const res = await fetch('/api/admin/sync-partner', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message, type: 'success' });
        await fetchAdminData();
      } else {
        setStatusMessage({ text: data.message || 'Synkronisering mot SAS misslyckades', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Kunde inte ansluta till SAS Online Shopping', type: 'error' });
    } finally {
      setSyncingPartner(false);
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  const handleSaveStoreRule = async (store: DbStore) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          categories: store.categories,
          partnerBonusPer100Kr: store.partnerRule?.bonusPer100Kr ?? 0,
          partnerTierPer100Kr: store.partnerRule?.tierPer100Kr ?? 0,
          rewardType: store.partnerRule?.rewardType ?? 'rate',
          fixedBonusPoints: store.partnerRule?.fixedBonusPoints ?? 0,
          fixedTierPoints: store.partnerRule?.fixedTierPoints ?? 0,
          isOneTimeOffer: store.partnerRule?.isOneTimeOffer ?? false,
          oneTimeTerms: store.partnerRule?.oneTimeTerms || undefined,
          isCampaign: store.partnerRule?.isCampaign ?? false,
          zupergiftSupported: store.zupergiftSupported,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: data.message, type: 'success' });
        await fetchAdminData();
      }
    } catch {
      setStatusMessage({ text: 'Kunde inte uppdatera butik', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: 'investigating' | 'resolved') => {
    try {
      const res = await fetch('/api/admin/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status }),
      });
      if (res.ok) {
        await fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Zupergift stores list
  const filteredZupergiftStores = useMemo(() => {
    if (!dbData?.zupergiftStores) return [];
    return dbData.zupergiftStores.filter((store) => {
      // Filter tab
      if (zgFilter === 'active' && (store.isHidden || store.isExcluded)) return false;
      if (zgFilter === 'hidden' && (!store.isHidden || store.isExcluded)) return false;
      if (zgFilter === 'excluded' && !store.isExcluded) return false;

      // Search query
      if (zgSearch.trim()) {
        const q = zgSearch.toLowerCase();
        return store.name.toLowerCase().includes(q) || store.slug.toLowerCase().includes(q);
      }

      return true;
    });
  }, [dbData?.zupergiftStores, zgFilter, zgSearch]);

  // Filtered SAS stores list for Stores tab
  const filteredStores = useMemo(() => {
    if (!dbData?.stores) return [];
    return dbData.stores.filter((store) => {
      if (store.isExcluded) return false;
      if (storeFilter === 'partner' && !store.partnerRule?.hasPartnerLink) return false;
      if (storeFilter === 'campaign' && !store.partnerRule?.isCampaign) return false;
      if (storeFilter === 'zupergift' && !store.zupergiftSupported) return false;
      if (storeFilter === 'fixed') {
        const isFixed =
          store.partnerRule?.rewardType === 'fixed' ||
          store.partnerRule?.isOneTimeOffer ||
          (store.partnerRule?.bonusPer100Kr ?? 0) >= 200 ||
          (store.partnerRule?.fixedBonusPoints ?? 0) >= 200;
        if (!isFixed) return false;
      }

      if (storeSearch.trim()) {
        const q = storeSearch.toLowerCase();
        return (
          store.name.toLowerCase().includes(q) ||
          store.slug.toLowerCase().includes(q) ||
          (store.aliases && store.aliases.some((a) => a.toLowerCase().includes(q)))
        );
      }
      return true;
    });
  }, [dbData?.stores, storeFilter, storeSearch]);

  // Filtered SAS gift card stores for SAS Presentkort tab
  const filteredSasGiftCards = useMemo(() => {
    if (!dbData?.sasGiftCards) return [];
    return dbData.sasGiftCards.filter((item) => {
      if (item.isExcluded) return false;

      // Filter by configuration / active state
      if (sasGcFilter === 'active') {
        if (item.isHidden || (item.bonusPer100Kr ?? 0) <= 0) return false;
      } else if (sasGcFilter === 'unconfigured') {
        if (item.isHidden || (item.bonusPer100Kr !== null && item.bonusPer100Kr > 0)) return false;
      } else if (sasGcFilter === 'hidden') {
        if (!item.isHidden) return false;
      }

      if (sasGcSearch.trim()) {
        const q = sasGcSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
      }
      return true;
    });
  }, [dbData?.sasGiftCards, sasGcSearch, sasGcFilter]);

  // Filtered list for "Alla butiker" tab
  const filteredAllStores = useMemo(() => {
    if (!dbData?.allStores) return [];
    return dbData.allStores.filter((item) => {
      // Excluded filter: if viewing 'excluded', only show excluded stores
      if (allStoresFilter === 'excluded') {
        if (!item.isExcluded) return false;
      } else {
        // All other filters should only show active (non-excluded) stores
        if (item.isExcluded) return false;
      }

      if (allStoresFilter === 'partner' && !item.hasPartnerLink) return false;
      if (allStoresFilter === 'zupergift' && !item.zupergiftSupported) return false;
      if (allStoresFilter === 'sas' && !item.hasSasGiftCard) return false;
      if (allStoresFilter === 'has_logo' && isStoreMissingLogo(item)) return false;
      if (allStoresFilter === 'missing_logo' && !isStoreMissingLogo(item)) return false;
      if (allStoresFilter === 'has_comment' && !item.comment) return false;

      if (allStoresSearch.trim()) {
        const q = allStoresSearch.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          (item.categories && item.categories.some((c) => c.toLowerCase().includes(q))) ||
          (item.comment && item.comment.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [dbData?.allStores, allStoresFilter, allStoresSearch]);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const list = dbData?.categories && dbData.categories.length > 0 ? dbData.categories : DEMO_CATEGORIES;
    for (const c of list) {
      map.set(c.id, c.name);
    }
    return map;
  }, [dbData?.categories]);

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Adminportal</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Skyddat gränssnitt för regler, Zupergift och felrapporter.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Administratörslösenord
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ange lösenord (standard: eurobonus2026)"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors touch-target"
            >
              {loading ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>

          <div className="text-center">
            <a href="/" className="text-xs text-blue-600 hover:underline">
              ← Tillbaka till Eurobonus-jakten
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-500">Laddar administratörspanel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
            <span className="bg-blue-600 text-white font-bold text-xs px-2.5 py-1 rounded-md tracking-wider uppercase">
              Admin
            </span>
            <h1 className="text-lg font-bold">Eurobonus-jakten Administration</h1>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white flex items-center gap-1"
            >
              <span>Öppna sajten</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 text-slate-400 hover:text-red-400 p-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logga ut</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {statusMessage && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between text-sm font-semibold shadow-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all_stores')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'all_stores'
                ? 'bg-white text-blue-600 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <StoreIcon className="w-4 h-4 text-indigo-600" />
            <span>Alla butiker ({dbData?.allStores?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('zupergift')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'zupergift'
                ? 'bg-white text-blue-600 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Gift className="w-4 h-4 text-amber-500" />
            <span>Zupergift &amp; Presentkort ({dbData?.zupergiftStores.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sas_giftcards')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'sas_giftcards'
                ? 'bg-white text-blue-600 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Gift className="w-4 h-4 text-blue-500" />
            <span>SAS Presentkort ({dbData?.sasGiftCards?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stores')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'stores'
                ? 'bg-white text-blue-600 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <StoreIcon className="w-4 h-4 text-blue-600" />
            <span>Butiker &amp; Partnerregler ({dbData?.stores.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'categories'
                ? 'bg-white text-blue-600 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Tag className="w-4 h-4 text-emerald-600" />
            <span>Kategorier ({dbData?.categories?.length || DEMO_CATEGORIES.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'reports'
                ? 'bg-white text-blue-600 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-amber-500 fill-current" />
            <span>Feedback &amp; Rapporter ({dbData?.errorReports.filter((r) => r.status === 'new').length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'audit'
                ? 'bg-white text-blue-600 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Auditlogg</span>
          </button>
        </div>

        {/* TAB: ALLA BUTIKER */}
        {activeTab === 'all_stores' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                    <StoreIcon className="w-4 h-4" />
                    Katalogöversikt &amp; Metadata
                  </div>
                  <h2 className="text-xl font-black text-slate-900">
                    Alla butiker ({dbData?.allStores?.length || 0})
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
                    Samlad lista över samtliga butiker i systemet oavsett kanal (Partner, Zupergift och SAS Presentkort).
                    Här kan du specificera en alternativ butikslogga eller skriva en speciell kommentar/villkor per butik som visas för besökare.
                  </p>
                </div>
              </div>

              {/* Statistik-chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAllStoresFilter('all')}
                  className={`text-left rounded-2xl p-3 border transition-all ${
                    allStoresFilter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200/60 text-slate-900'
                  }`}
                >
                  <div className={`text-[11px] font-semibold ${allStoresFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>Aktiva butiker</div>
                  <div className="text-lg font-black">{dbData?.allStores?.filter((s) => !s.isExcluded).length || 0}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAllStoresFilter('partner')}
                  className={`text-left rounded-2xl p-3 border transition-all ${
                    allStoresFilter === 'partner'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-blue-50/60 hover:bg-blue-100/70 border-blue-100 text-blue-900'
                  }`}
                >
                  <div className={`text-[11px] font-semibold ${allStoresFilter === 'partner' ? 'text-blue-100' : 'text-blue-700'}`}>SAS Partner</div>
                  <div className="text-lg font-black">{dbData?.allStores?.filter((s) => !s.isExcluded && s.hasPartnerLink).length || 0}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAllStoresFilter('zupergift')}
                  className={`text-left rounded-2xl p-3 border transition-all ${
                    allStoresFilter === 'zupergift'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-amber-50/60 hover:bg-amber-100/70 border-amber-100 text-amber-900'
                  }`}
                >
                  <div className={`text-[11px] font-semibold ${allStoresFilter === 'zupergift' ? 'text-amber-100' : 'text-amber-700'}`}>Zupergift</div>
                  <div className="text-lg font-black">{dbData?.allStores?.filter((s) => !s.isExcluded && s.zupergiftSupported).length || 0}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAllStoresFilter('sas')}
                  className={`text-left rounded-2xl p-3 border transition-all ${
                    allStoresFilter === 'sas'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-indigo-50/60 hover:bg-indigo-100/70 border-indigo-100 text-indigo-900'
                  }`}
                >
                  <div className={`text-[11px] font-semibold ${allStoresFilter === 'sas' ? 'text-indigo-100' : 'text-indigo-700'}`}>SAS Presentkort</div>
                  <div className="text-lg font-black">{dbData?.allStores?.filter((s) => !s.isExcluded && s.hasSasGiftCard).length || 0}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAllStoresFilter('missing_logo')}
                  className={`text-left rounded-2xl p-3 border transition-all ${
                    allStoresFilter === 'missing_logo'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-200'
                      : 'bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className={`text-[11px] font-semibold flex items-center gap-1 ${allStoresFilter === 'missing_logo' ? 'text-rose-100' : 'text-rose-700'}`}>
                    <AlertTriangle className="w-3 h-3" />
                    <span>Saknar logga</span>
                  </div>
                  <div className="text-lg font-black">{dbData?.allStores?.filter((s) => !s.isExcluded && isStoreMissingLogo(s)).length || 0}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAllStoresFilter('has_logo')}
                  className={`text-left rounded-2xl p-3 border transition-all ${
                    allStoresFilter === 'has_logo'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-purple-50/60 hover:bg-purple-100/70 border-purple-100 text-purple-900'
                  }`}
                >
                  <div className={`text-[11px] font-semibold ${allStoresFilter === 'has_logo' ? 'text-purple-100' : 'text-purple-700'}`}>Har logga</div>
                  <div className="text-lg font-black">{dbData?.allStores?.filter((s) => !s.isExcluded && !isStoreMissingLogo(s)).length || 0}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAllStoresFilter('has_comment')}
                  className={`text-left rounded-2xl p-3 border transition-all ${
                    allStoresFilter === 'has_comment'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-emerald-50/60 hover:bg-emerald-100/70 border-emerald-100 text-emerald-900'
                  }`}
                >
                  <div className={`text-[11px] font-semibold ${allStoresFilter === 'has_comment' ? 'text-emerald-100' : 'text-emerald-700'}`}>Har notering</div>
                  <div className="text-lg font-black">{dbData?.allStores?.filter((s) => !s.isExcluded && !!s.comment).length || 0}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAllStoresFilter('excluded')}
                  className={`text-left rounded-2xl p-3 border transition-all ${
                    allStoresFilter === 'excluded'
                      ? 'bg-rose-950 text-white border-rose-950 shadow-xs ring-2 ring-rose-400'
                      : 'bg-slate-100 hover:bg-rose-50 border-slate-200 text-slate-700 hover:text-rose-900'
                  }`}
                >
                  <div className={`text-[11px] font-semibold flex items-center gap-1 ${allStoresFilter === 'excluded' ? 'text-rose-300' : 'text-slate-500'}`}>
                    <Trash2 className="w-3 h-3" />
                    <span>Borttagna</span>
                  </div>
                  <div className="text-lg font-black">{dbData?.allStores?.filter((s) => s.isExcluded).length || 0}</div>
                </button>
              </div>

              {/* Sök och filterrad */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2 border-t border-slate-100">
                <div className="relative w-full sm:w-80">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={allStoresSearch}
                    onChange={(e) => setAllStoresSearch(e.target.value)}
                    placeholder="Sök bland alla butiker (namn, kategori)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* Filterknappar */}
                <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto text-xs">
                  <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    Visa:
                  </span>
                  <button
                    type="button"
                    onClick={() => setAllStoresFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      allStoresFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Alla aktiva ({dbData?.allStores?.filter((s) => !s.isExcluded).length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllStoresFilter('missing_logo')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                      allStoresFilter === 'missing_logo'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Saknar logga ({dbData?.allStores?.filter((s) => !s.isExcluded && isStoreMissingLogo(s)).length || 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllStoresFilter('partner')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      allStoresFilter === 'partner'
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Partner ({dbData?.allStores?.filter((s) => !s.isExcluded && s.hasPartnerLink).length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllStoresFilter('zupergift')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      allStoresFilter === 'zupergift'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Zupergift ({dbData?.allStores?.filter((s) => !s.isExcluded && s.zupergiftSupported).length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllStoresFilter('sas')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      allStoresFilter === 'sas'
                        ? 'bg-indigo-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    SAS Presentkort ({dbData?.allStores?.filter((s) => !s.isExcluded && s.hasSasGiftCard).length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllStoresFilter('has_logo')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      allStoresFilter === 'has_logo'
                        ? 'bg-purple-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Har logga ({dbData?.allStores?.filter((s) => !s.isExcluded && !isStoreMissingLogo(s)).length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllStoresFilter('has_comment')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      allStoresFilter === 'has_comment'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Har notering ({dbData?.allStores?.filter((s) => !s.isExcluded && !!s.comment).length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllStoresFilter('excluded')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                      allStoresFilter === 'excluded'
                        ? 'bg-rose-950 text-white shadow-xs'
                        : 'bg-slate-100 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Borttagna ({dbData?.allStores?.filter((s) => s.isExcluded).length || 0})</span>
                  </button>
                </div>
              </div>

              {/* Butikslista */}
              {filteredAllStores.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <StoreIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Inga butiker matchar ditt filter eller din sökning.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
                  {filteredAllStores.map((item) => {
                    const edit = storeMetadataEdits[item.id];
                    const customLogoVal = edit?.customLogoUrl !== undefined ? edit.customLogoUrl : (item.customLogoUrl || '');
                    const commentVal = edit?.comment !== undefined ? edit.comment : (item.comment || '');
                    const isDirty = edit !== undefined;
                    const isSaving = Boolean(storeMetadataSaving[item.id]);
                    const previewLogoUrl = customLogoVal.trim() || item.logoUrl;

                    const updateMetadataEdit = (patch: Partial<{ customLogoUrl: string; comment: string }>) => {
                      setStoreMetadataEdits((prev) => ({
                        ...prev,
                        [item.id]: {
                          customLogoUrl: edit?.customLogoUrl !== undefined ? edit.customLogoUrl : (item.customLogoUrl || ''),
                          comment: edit?.comment !== undefined ? edit.comment : (item.comment || ''),
                          ...patch,
                        },
                      }));
                    };

                    return (
                      <div
                        key={item.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          item.isExcluded
                            ? 'border-rose-300 bg-rose-50/20 opacity-80'
                            : isDirty
                            ? 'border-blue-300 bg-blue-50/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          {/* Store info & logo preview */}
                          <div className="flex items-start gap-3.5 min-w-[240px] max-w-sm">
                            <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs relative">
                              {customLogoVal.trim() ? (
                                <img
                                  src={customLogoVal.trim()}
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                    const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : !isStoreMissingLogo(item) && previewLogoUrl ? (
                                <img
                                  src={previewLogoUrl}
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                    const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-full h-full items-center justify-center font-bold text-slate-400 text-lg uppercase ${
                                  customLogoVal.trim() || (!isStoreMissingLogo(item) && previewLogoUrl) ? 'hidden' : 'flex'
                                }`}
                              >
                                {item.name.charAt(0)}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-bold text-base ${item.isExcluded ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{item.name}</span>
                                {item.isExcluded ? (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center gap-1">
                                    <Trash2 className="w-3 h-3 text-rose-600" />
                                    Borttagen / Konkurs
                                  </span>
                                ) : (
                                  <>
                                    {isStoreMissingLogo(item) && !customLogoVal && (
                                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center gap-1" title="Butiken saknar en giltig bildlogotyp">
                                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                                        Saknar logga
                                      </span>
                                    )}
                                    {item.customLogoUrl && (
                                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px]" title="Använder manuell alternativ logga">
                                        Egen logga
                                      </span>
                                    )}
                                    {item.comment && (
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]" title="Har aktiv kommentar/notering">
                                        💬 Notering
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-400 font-mono">
                                ID: {item.id}
                              </div>

                              {/* Integrations-badges */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                {item.hasPartnerLink && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold text-[10px]">
                                    Partner ({item.partnerRule?.bonusPer100Kr || 0} p/100 kr)
                                  </span>
                                )}
                                {item.zupergiftSupported && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold text-[10px]">
                                    Zupergift
                                  </span>
                                )}
                                {item.hasSasGiftCard && (
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-semibold text-[10px]">
                                    SAS Presentkort {item.sasGiftCardBonusPer100Kr ? `(${item.sasGiftCardBonusPer100Kr} p/100 kr)` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Editable fields: Custom Logo URL and Comment */}
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                                <span>Alternativ logga (URL)</span>
                              </label>
                              <input
                                type="url"
                                disabled={item.isExcluded}
                                value={customLogoVal}
                                onChange={(e) => updateMetadataEdit({ customLogoUrl: e.target.value })}
                                placeholder="t.ex. https://example.com/logo.png"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-slate-50 focus:bg-white font-mono disabled:opacity-50"
                              />
                              <p className="text-[10px] text-slate-400 mt-1">
                                Skriv över standardloggan på webbplatsen med en egen länk.
                              </p>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Speciell kommentar / notering</span>
                              </label>
                              <textarea
                                rows={2}
                                disabled={item.isExcluded}
                                value={commentVal}
                                onChange={(e) => updateMetadataEdit({ comment: e.target.value })}
                                placeholder="t.ex. Poäng ges ej på presentkort eller reavaror. Gäller endast online..."
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-slate-50 focus:bg-white resize-none disabled:opacity-50"
                              />
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Visas som en informationsnotis för besökare på butikskortet.
                              </p>
                            </div>
                          </div>

                          {/* Save, Reset, Delete & Restore actions */}
                          <div className="flex lg:flex-col items-center gap-2 shrink-0 self-end lg:self-center pt-2 lg:pt-0">
                            {item.isExcluded ? (
                              <button
                                type="button"
                                onClick={() => handleStoreAction(item.id, item.name, 'restore')}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                                title="Återställ butiken så den syns på sajten och inkluderas i synkar igen"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Återställ butik</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveStoreMetadata(item.id)}
                                  disabled={isSaving || !isDirty}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                                    isDirty
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>{isSaving ? 'Sparar...' : isDirty ? 'Spara' : 'Sparad'}</span>
                                </button>

                                {isDirty && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStoreMetadataEdits((prev) => {
                                        const next = { ...prev };
                                        delete next[item.id];
                                        return next;
                                      });
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                  >
                                    Ångra
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleStoreAction(item.id, item.name, 'exclude')}
                                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-rose-200 flex items-center gap-1 transition-colors"
                                  title="Ta bort butiken från Eurobonus-jakten (t.ex. vid konkurs eller avslutat samarbete med SAS)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Ta bort</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: ZUPERGIFT & PRESENTKORT */}
        {activeTab === 'zupergift' && (
          <div className="space-y-6">
            {/* Box 1: Sätt poängsats per 100 kr (Adminens regel) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" />
                  Styrs av administratören (Alltid baserat på 100 kr)
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  EuroBonus-intjäning för Zupergift
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                  Poängen för Zupergift sätts manuellt av dig som administratör, medan butiksutbudet hämtas automatiskt via live-synk mot Zupergifts katalog.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Extrapoäng per 100 kr vid köp av Zupergift:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="200"
                      value={zgRate}
                      onChange={(e) => setZgRate(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-lg font-bold text-blue-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                      poäng / 100 kr
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Exempel: 30 innebär 30 Extrapoäng per 100 kr (eller 300 poäng vid ett köp för 1 000 kr).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kampanjstatus:
                  </label>
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={zgCampaign}
                        onChange={(e) => setZgCampaign(e.target.checked)}
                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-slate-800">
                        Aktiv kampanj hos SAS
                      </span>
                    </label>

                    {zgCampaign && (
                      <input
                        type="date"
                        value={zgValidUntil}
                        onChange={(e) => setZgValidUntil(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                        title="Giltig t.o.m."
                      />
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Administratörens anteckning:
                  </label>
                  <input
                    type="text"
                    value={zgNote}
                    onChange={(e) => setZgNote(e.target.value)}
                    placeholder="T.ex. Höstkampanj 30p/100kr bekräftad på SAS EB Shop."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveZupergift}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-colors touch-target"
                >
                  <Save className="w-4 h-4" />
                  <span>Spara Zupergift-regel</span>
                </button>
              </div>
            </div>

            {/* Box 2: Butikskatalog från Zupergift med möjlighet att dölja och ta bort */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Insamlade Zupergift-butiker ({dbData?.zupergiftStores.length || 0})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hämtat live från <span className="font-mono">https://zupergift.com/se/alla-presentkort</span>. Du kan dölja eller permanent ta bort butiker från Zupergift.
                  </p>
                </div>

                {/* Live synk-knapp */}
                <button
                  type="button"
                  onClick={handleLiveSyncZupergift}
                  disabled={syncingZg}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition-colors touch-target shrink-0 shadow-xs"
                >
                  <RefreshCw className={`w-4 h-4 ${syncingZg ? 'animate-spin' : ''}`} />
                  <span>{syncingZg ? 'Synkar med Zupergift...' : 'Kör live-synk mot Zupergift'}</span>
                </button>
              </div>

              {/* Sök och filterrad */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
                <div className="relative w-full sm:w-72">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={zgSearch}
                    onChange={(e) => setZgSearch(e.target.value)}
                    placeholder="Sök bland Zupergift-butiker..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* Filterflikar */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
                  <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    Visa:
                  </span>
                  <button
                    type="button"
                    onClick={() => setZgFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      zgFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Alla ({dbData?.zupergiftStores.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setZgFilter('active')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      zgFilter === 'active'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Aktiva ({dbData?.zupergiftStores.filter((s) => !s.isHidden && !s.isExcluded).length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setZgFilter('hidden')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      zgFilter === 'hidden'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Dolda ({dbData?.zupergiftStores.filter((s) => s.isHidden && !s.isExcluded).length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setZgFilter('excluded')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      zgFilter === 'excluded'
                        ? 'bg-red-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Borttagna ({dbData?.zupergiftStores.filter((s) => s.isExcluded).length || 0})
                  </button>
                </div>
              </div>

              {/* Butikslista med dölj- och ta bort-knappar */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {filteredZupergiftStores.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Inga butiker matchar ditt filter eller din sökning.
                  </div>
                ) : (
                  filteredZupergiftStores.map((item) => {
                    const isMatchedWithLocal = !!item.matchedStoreId;
                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                          item.isExcluded
                            ? 'bg-red-50/50 opacity-70'
                            : item.isHidden
                            ? 'bg-amber-50/50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {item.name}
                              </span>
                              {item.isExcluded ? (
                                <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-bold text-[10px]">
                                  Borttagen / Exkluderad
                                </span>
                              ) : item.isHidden ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                                  Dold för besökare
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  Aktiv Zupergift-butik
                                </span>
                              )}
                              {isMatchedWithLocal && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold text-[10px]">
                                  Kopplad till Eurobonus-jakten
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Slug: {item.slug}
                            </div>
                          </div>
                        </div>

                        {/* Åtgärdsknappar för Admin: Kategori, Dölj, Ta bort, Återställ */}
                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 flex-wrap">
                          {/* Kategori-väljare för Zupergift-butik */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500">Kategori:</span>
                            <select
                              value={item.category || 'department'}
                              onChange={(e) => handleZupergiftCategoryChange(item.id, e.target.value)}
                              className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                            >
                              {(dbData?.categories || DEMO_CATEGORIES).map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {item.isExcluded ? (
                            <button
                              type="button"
                              onClick={() => handleZupergiftStoreAction(item.id, 'restore')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs flex items-center gap-1 border border-emerald-200 transition-colors"
                              title="Återställ butiken till aktiv i Zupergift"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Återställ</span>
                            </button>
                          ) : (
                            <>
                              {/* Dölj / Visa */}
                              {item.isHidden ? (
                                <button
                                  type="button"
                                  onClick={() => handleZupergiftStoreAction(item.id, 'unhide')}
                                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors"
                                  title="Gör butiken synlig för besökare"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Gör synlig</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleZupergiftStoreAction(item.id, 'hide')}
                                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 font-semibold text-xs flex items-center gap-1 transition-colors"
                                  title="Dölj butiken från resultaten utan att ta bort den"
                                >
                                  <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Dölj</span>
                                </button>
                              )}

                              {/* Ta bort / Exkludera */}
                              <button
                                type="button"
                                onClick={() => handleZupergiftStoreAction(item.id, 'exclude')}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 font-semibold text-xs flex items-center gap-1 transition-colors"
                                title="Ta bort butiken från Zupergift (exkluderas även vid framtida synk)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Ta bort</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SAS PRESENTKORT */}
        {activeTab === 'sas_giftcards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                    <Gift className="w-4 h-4" />
                    SAS EuroBonus Shop
                  </div>
                  <h2 className="text-xl font-black text-slate-900">SAS Presentkort</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                    Butiker på SAS EuroBonus Shop som säljer presentkort. Fyll i poäng per 100 kr för att aktivera en butik. En butik är inaktiv tills du angett ett värde.
                    {dbData?.lastSasGiftCardSync && (
                      <span className="ml-2 font-mono text-[11px] text-slate-400">
                        (Senast synkad: {new Date(dbData.lastSasGiftCardSync).toLocaleString('sv-SE')})
                      </span>
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLiveSyncSasGiftCards}
                  disabled={syncingSasGc}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition-colors touch-target shrink-0 shadow-xs"
                >
                  <RefreshCw className={`w-4 h-4 ${syncingSasGc ? 'animate-spin' : ''}`} />
                  <span>{syncingSasGc ? 'Synkar mot SAS Shop...' : 'Synka från SAS Shop'}</span>
                </button>
              </div>

              {/* Sök och filterrad */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
                <div className="relative w-full sm:w-72">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={sasGcSearch}
                    onChange={(e) => setSasGcSearch(e.target.value)}
                    placeholder="Sök bland SAS presentkortsbutiker..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* Filterflikar */}
                <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto text-xs">
                  <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    Visa:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSasGcFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      sasGcFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Alla ({dbData?.sasGiftCards?.filter((s) => !s.isExcluded).length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSasGcFilter('unconfigured')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      sasGcFilter === 'unconfigured'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Ej konfigurerade ({dbData?.sasGiftCards?.filter((s) => !s.isExcluded && !s.isHidden && (s.bonusPer100Kr === null || s.bonusPer100Kr === 0)).length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSasGcFilter('active')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      sasGcFilter === 'active'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Aktiva ({dbData?.sasGiftCards?.filter((s) => !s.isExcluded && !s.isHidden && (s.bonusPer100Kr ?? 0) > 0).length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSasGcFilter('hidden')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      sasGcFilter === 'hidden'
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Dolda ({dbData?.sasGiftCards?.filter((s) => !s.isExcluded && s.isHidden).length || 0})
                  </button>
                </div>
              </div>

              {/* Store list */}
              {filteredSasGiftCards.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  <Gift className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Inga butiker hittade. Kör en synk mot SAS Shop för att hämta butiker.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSasGiftCards.map((item) => {
                    const edit = sasGcEdits[item.id];
                    const bonusVal = edit?.bonusPer100Kr !== undefined ? edit.bonusPer100Kr : (item.bonusPer100Kr !== null ? String(item.bonusPer100Kr) : '');
                    const minPurchaseVal = edit?.minPurchaseAmount !== undefined ? edit.minPurchaseAmount : (item.minPurchaseAmount !== undefined && item.minPurchaseAmount !== null ? String(item.minPurchaseAmount) : '');
                    const isCampaign = edit?.isCampaign !== undefined ? edit.isCampaign : item.isCampaign;
                    const campaignValidUntil = edit?.campaignValidUntil !== undefined ? edit.campaignValidUntil : (item.campaignValidUntil || '');
                    const isHidden = edit?.isHidden !== undefined ? edit.isHidden : item.isHidden;
                    const note = edit?.note !== undefined ? edit.note : item.note;
                    const isDirty = edit !== undefined;
                    const isActive = (item.bonusPer100Kr ?? 0) > 0 && !item.isHidden;
                    const isSaving = Boolean(sasGcSaving[item.id]);

                    const updateEdit = (patch: Partial<typeof edit>) => {
                      setSasGcEdits((prev) => ({
                        ...prev,
                        [item.id]: {
                          bonusPer100Kr: edit?.bonusPer100Kr ?? (item.bonusPer100Kr !== null ? String(item.bonusPer100Kr) : ''),
                          minPurchaseAmount: edit?.minPurchaseAmount ?? (item.minPurchaseAmount !== undefined && item.minPurchaseAmount !== null ? String(item.minPurchaseAmount) : ''),
                          isCampaign: edit?.isCampaign ?? item.isCampaign,
                          campaignValidUntil: edit?.campaignValidUntil ?? (item.campaignValidUntil || ''),
                          isHidden: edit?.isHidden ?? item.isHidden,
                          note: edit?.note ?? item.note,
                          ...patch,
                        },
                      }));
                    };

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border ${isHidden ? 'bg-slate-50 border-slate-200 opacity-70' : isDirty ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          {/* Name + status */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900">{item.name}</span>
                              <span className="font-mono text-[10px] text-slate-400">{item.slug}</span>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                                  Aktiv
                                </span>
                              )}
                              {!isActive && (item.bonusPer100Kr ?? 0) === 0 && item.bonusPer100Kr !== null && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                                  Inaktiv (0 poäng)
                                </span>
                              )}
                              {item.bonusPer100Kr === null && (
                                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                                  Ej konfigurerad
                                </span>
                              )}
                              {item.isHidden && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                                  Dold
                                </span>
                              )}
                              {item.minPurchaseAmount && item.minPurchaseAmount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                  Min. {item.minPurchaseAmount} kr
                                </span>
                              )}
                              {item.isCampaign && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
                                  Kampanj
                                </span>
                              )}
                              {item.matchedStoreId && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                                  → {item.matchedStoreId}
                                </span>
                              )}
                            </div>
                            {item.bonusPer100Kr === null && (
                              <p className="text-[11px] text-orange-600 font-semibold mt-1">
                                ⚠ Ej aktiv – fyll i poäng per 100 kr
                              </p>
                            )}
                          </div>

                          {/* Controls */}
                          <div className="flex flex-wrap gap-2 items-center shrink-0">
                            {/* bonusPer100Kr input */}
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="200"
                                step="0.1"
                                value={bonusVal}
                                onChange={(e) => updateEdit({ bonusPer100Kr: e.target.value })}
                                placeholder="—"
                                className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-blue-700 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                title="Poäng per 100 kr"
                              />
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">p/100 kr</span>
                            </div>

                            {/* minPurchaseAmount input */}
                            <div className="flex items-center gap-1" title="Minsta köpbelopp (t.ex. 250 kr)">
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">Min:</span>
                              <input
                                type="number"
                                min="0"
                                max="50000"
                                step="50"
                                value={minPurchaseVal}
                                onChange={(e) => updateEdit({ minPurchaseAmount: e.target.value })}
                                placeholder="Inget"
                                className="w-16 px-1.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                title="Minimiköp (kr)"
                              />
                              <span className="text-[10px] text-slate-500">kr</span>
                            </div>

                            {/* Campaign checkbox */}
                            <label className="flex items-center gap-1 cursor-pointer text-[11px] font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={isCampaign}
                                onChange={(e) => updateEdit({ isCampaign: e.target.checked })}
                                className="w-3.5 h-3.5 rounded text-blue-600"
                              />
                              Kampanj
                            </label>

                            {/* Campaign date */}
                            {isCampaign && (
                              <input
                                type="date"
                                value={campaignValidUntil}
                                onChange={(e) => updateEdit({ campaignValidUntil: e.target.value })}
                                className="px-2 py-1.5 rounded-lg border border-slate-300 text-[11px] font-semibold text-slate-700"
                                title="Kampanj giltig t.o.m."
                              />
                            )}

                            {/* Hide/Show toggle */}
                            <button
                              type="button"
                              onClick={() => updateEdit({ isHidden: !isHidden })}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                                isHidden
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-800'
                              }`}
                              title={isHidden ? 'Visa butiken' : 'Dölj butiken'}
                            >
                              {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              <span>{isHidden ? 'Visa' : 'Dölj'}</span>
                            </button>

                            {/* Save button */}
                            <button
                              type="button"
                              onClick={() => handleSaveSasGiftCard(item.id)}
                              disabled={isSaving}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                                isDirty
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isSaving ? 'Sparar...' : 'Spara'}</span>
                            </button>

                            {/* Exclude button */}
                            <button
                              type="button"
                              onClick={() => handleExcludeSasGiftCard(item.id, item.name)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Exkludera permanent"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Note input */}
                        <div className="mt-2">
                          <input
                            type="text"
                            value={note}
                            onChange={(e) => updateEdit({ note: e.target.value })}
                            placeholder="Anteckning (valfritt)"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 bg-slate-50 focus:bg-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BUTIKER & PARTNERREGLER */}
        {activeTab === 'stores' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Butiker &amp; Partnerregler ({dbData?.stores.length || 0})
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Alla regler utgår från summan 100 kr enligt instruktionen. 
                  {dbData?.lastPartnerSync && (
                    <span className="ml-2 font-mono text-[11px] text-slate-400">
                      (Senast synkad: {new Date(dbData.lastPartnerSync).toLocaleString('sv-SE')})
                    </span>
                  )}
                </p>
              </div>

              {/* Live synk-knapp mot SAS Online Shopping */}
              <button
                type="button"
                onClick={handleLiveSyncPartner}
                disabled={syncingPartner}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition-colors touch-target shrink-0 shadow-xs"
              >
                <RefreshCw className={`w-4 h-4 ${syncingPartner ? 'animate-spin' : ''}`} />
                <span>{syncingPartner ? 'Synkar SAS Online Shopping...' : 'Kör live-synk mot SAS Online Shopping'}</span>
              </button>
            </div>

            {/* Sök och filterrad */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  placeholder="Sök bland butiker..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Filterflikar */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs overflow-x-auto pb-1 sm:pb-0">
                <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Visa:
                </span>
                <button
                  type="button"
                  onClick={() => setStoreFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    storeFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Alla ({dbData?.stores.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setStoreFilter('partner')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    storeFilter === 'partner'
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  SAS Partner ({dbData?.stores.filter((s) => s.partnerRule?.hasPartnerLink).length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setStoreFilter('campaign')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    storeFilter === 'campaign'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Kampanjer ({dbData?.stores.filter((s) => s.partnerRule?.isCampaign).length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setStoreFilter('zupergift')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    storeFilter === 'zupergift'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Zupergift ({dbData?.stores.filter((s) => s.zupergiftSupported).length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setStoreFilter('fixed')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    storeFilter === 'fixed'
                      ? 'bg-purple-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ⚡ Engångsbonus ({dbData?.stores.filter((s) => s.partnerRule?.rewardType === 'fixed' || s.partnerRule?.isOneTimeOffer || (s.partnerRule?.bonusPer100Kr ?? 0) >= 200 || (s.partnerRule?.fixedBonusPoints ?? 0) >= 200).length || 0})
                </button>
              </div>
            </div>

            {/* Butikslista */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredStores.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Inga butiker matchar ditt filter eller din sökning.
                </div>
              ) : (
                filteredStores.map((store) => (
                  <div
                    key={store.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{store.name}</span>
                        {store.partnerRule?.isCampaign && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                            Kampanj
                          </span>
                        )}
                        {store.partnerRule?.hasPartnerLink && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold text-[10px]">
                            SAS Partner
                          </span>
                        )}
                        {(store.partnerRule?.rewardType === 'fixed' || store.partnerRule?.isOneTimeOffer || (store.partnerRule?.fixedBonusPoints ?? 0) > 0) ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center gap-1">
                            <span>⚡ Engångsbonus</span>
                          </span>
                        ) : (store.partnerRule?.bonusPer100Kr ?? 0) >= 200 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-1" title="Ger 200p eller mer – sannolikt engångserbjudande!">
                            <span>⚠️ Potentiell engångsbonus (≥ 200p)</span>
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-400">Slug: {store.slug} | Alias: {store.aliases.join(', ')}</div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="text-xs flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={store.zupergiftSupported}
                            onChange={(e) => {
                              store.zupergiftSupported = e.target.checked;
                              setDbData((prev) => (prev ? { ...prev } : null));
                            }}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          <span className="font-medium text-slate-700">Nås via Zupergift</span>
                        </label>
                        {store.partnerRule?.startUrl && (
                          <a
                            href={store.partnerRule.startUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 ml-2"
                          >
                            <span>SAS-länk</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 flex-wrap">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          Kategori
                        </span>
                        <select
                          value={store.categories?.[0] || 'department'}
                          onChange={(e) => {
                            store.categories = [e.target.value];
                            setDbData((prev) => (prev ? { ...prev } : null));
                          }}
                          className="w-36 px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                        >
                          {(dbData?.categories || DEMO_CATEGORIES).map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Bonustyp: Per 100 kr vs Fast engångsbonus */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          Bonustyp
                        </span>
                        <select
                          value={
                            store.partnerRule?.rewardType === 'fixed' || store.partnerRule?.isOneTimeOffer || ((store.partnerRule?.fixedBonusPoints ?? 0) > 0)
                              ? 'fixed'
                              : 'rate'
                          }
                          onChange={(e) => {
                            const newType = e.target.value as 'rate' | 'fixed';
                            if (!store.partnerRule) {
                              store.partnerRule = {
                                hasPartnerLink: true,
                                bonusPer100Kr: 0,
                                tierPer100Kr: 5,
                                isCampaign: false,
                                campaignValidUntil: null,
                                startUrl: `https://onlineshopping.flysas.com/sv-SE/${store.slug}`,
                              };
                            }
                            store.partnerRule.rewardType = newType;
                            store.partnerRule.isOneTimeOffer = newType === 'fixed';
                            if (newType === 'fixed') {
                              if (!store.partnerRule.fixedBonusPoints && store.partnerRule.bonusPer100Kr > 0) {
                                store.partnerRule.fixedBonusPoints = store.partnerRule.bonusPer100Kr;
                                store.partnerRule.bonusPer100Kr = 0;
                              }
                              if (!store.partnerRule.fixedTierPoints && store.partnerRule.tierPer100Kr > 0) {
                                store.partnerRule.fixedTierPoints = store.partnerRule.tierPer100Kr;
                                store.partnerRule.tierPer100Kr = 0;
                              }
                              if (!store.partnerRule.oneTimeTerms) {
                                store.partnerRule.oneTimeTerms = 'Engångsbonus – gäller vanligtvis ny kund vid första köpet';
                              }
                            } else {
                              if (store.partnerRule.fixedBonusPoints && store.partnerRule.bonusPer100Kr === 0) {
                                store.partnerRule.bonusPer100Kr = store.partnerRule.fixedBonusPoints;
                                store.partnerRule.fixedBonusPoints = 0;
                              }
                              if (store.partnerRule.fixedTierPoints && store.partnerRule.tierPer100Kr === 0) {
                                store.partnerRule.tierPer100Kr = store.partnerRule.fixedTierPoints;
                                store.partnerRule.fixedTierPoints = 0;
                              }
                            }
                            setDbData((prev) => (prev ? { ...prev } : null));
                          }}
                          className={`w-36 px-2 py-1.5 rounded-lg border text-xs font-bold bg-white ${
                            store.partnerRule?.rewardType === 'fixed' || store.partnerRule?.isOneTimeOffer
                              ? 'border-purple-300 text-purple-800'
                              : 'border-slate-300 text-slate-800'
                          }`}
                        >
                          <option value="rate">Per 100 kr</option>
                          <option value="fixed">⚡ Fast engångsbonus</option>
                        </select>
                      </div>

                      {/* Bonuspoäng input */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          {store.partnerRule?.rewardType === 'fixed' || store.partnerRule?.isOneTimeOffer
                            ? 'Fast bonuspoäng'
                            : 'Bonus / 100 kr'}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={
                            store.partnerRule?.rewardType === 'fixed' || store.partnerRule?.isOneTimeOffer
                              ? (store.partnerRule?.fixedBonusPoints ?? store.partnerRule?.bonusPer100Kr ?? 0)
                              : (store.partnerRule?.bonusPer100Kr ?? 0)
                          }
                          onChange={(e) => {
                            if (!store.partnerRule) {
                              store.partnerRule = {
                                hasPartnerLink: true,
                                bonusPer100Kr: 0,
                                tierPer100Kr: 5,
                                isCampaign: false,
                                campaignValidUntil: null,
                                startUrl: `https://onlineshopping.flysas.com/sv-SE/${store.slug}`,
                              };
                            }
                            const val = Number(e.target.value);
                            if (store.partnerRule.rewardType === 'fixed' || store.partnerRule.isOneTimeOffer) {
                              store.partnerRule.fixedBonusPoints = val;
                              store.partnerRule.bonusPer100Kr = 0;
                            } else {
                              store.partnerRule.bonusPer100Kr = val;
                            }
                            setDbData((prev) => (prev ? { ...prev } : null));
                          }}
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-blue-700 bg-white"
                        />
                      </div>

                      {/* Nivåpoäng input */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          {store.partnerRule?.rewardType === 'fixed' || store.partnerRule?.isOneTimeOffer
                            ? 'Fasta nivåpoäng'
                            : 'Nivå / 100 kr'}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={
                            store.partnerRule?.rewardType === 'fixed' || store.partnerRule?.isOneTimeOffer
                              ? (store.partnerRule?.fixedTierPoints ?? store.partnerRule?.tierPer100Kr ?? 0)
                              : (store.partnerRule?.tierPer100Kr ?? 0)
                          }
                          onChange={(e) => {
                            if (!store.partnerRule) {
                              store.partnerRule = {
                                hasPartnerLink: true,
                                bonusPer100Kr: 0,
                                tierPer100Kr: 5,
                                isCampaign: false,
                                campaignValidUntil: null,
                                startUrl: `https://onlineshopping.flysas.com/sv-SE/${store.slug}`,
                              };
                            }
                            const val = Number(e.target.value);
                            if (store.partnerRule.rewardType === 'fixed' || store.partnerRule.isOneTimeOffer) {
                              store.partnerRule.fixedTierPoints = val;
                              store.partnerRule.tierPer100Kr = 0;
                            } else {
                              store.partnerRule.tierPer100Kr = val;
                            }
                            setDbData((prev) => (prev ? { ...prev } : null));
                          }}
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-emerald-700 bg-white"
                        />
                      </div>

                      <div className="self-end pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveStoreRule(store)}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs touch-target"
                        >
                          Spara
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStoreAction(store.id, store.name, 'exclude')}
                          className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-colors touch-target flex items-center gap-1"
                          title="Ta bort butik (konkurs eller försvunnen)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ta bort</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: KATEGORIER */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {/* Skapa ny kategori */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Skapa ny butikskategori</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Lägg till en ny kategori. Den blir genast tillgänglig i butiksinställningarna och som valbart filter på startsidan.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Kategorinamn <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="T.ex. Gaming & Datorer, Apotek, etc."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Kategori-ID / Slug (Valfritt)
                    </label>
                    <input
                      type="text"
                      value={newCategoryId}
                      onChange={(e) => setNewCategoryId(e.target.value)}
                      placeholder="T.ex. gaming-datorer (lämna tomt för automatisk)"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-800 placeholder:font-sans focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-400">
                    ID genereras automatiskt från namnet om fältet lämnas tomt (med å/ä/ö översatta till a/o).
                  </p>
                  <button
                    type="submit"
                    disabled={creatingCategory || !newCategoryName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 touch-target shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{creatingCategory ? 'Skapar kategori...' : 'Lägg till kategori'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Befintliga kategorier lista */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Befintliga kategorier ({dbData?.categories?.length || DEMO_CATEGORIES.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Översikt över alla kategorier och antal butiker som använder respektive kategori.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {(dbData?.categories || DEMO_CATEGORIES).map((cat) => {
                  const partnerCount = dbData?.stores.filter((s) => s.categories?.includes(cat.id)).length || 0;
                  const zgCount = dbData?.zupergiftStores.filter((z) => z.category === cat.id).length || 0;
                  const total = partnerCount + zgCount;

                  return (
                    <div
                      key={cat.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-bold">
                          <Tag className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{cat.name}</span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px]">
                              {cat.id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{partnerCount} SAS Partnerbutiker</span>
                            <span>•</span>
                            <span>{zgCount} Zupergift-butiker</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <div className="text-right mr-2">
                          <span className="font-bold text-slate-700 block text-xs">
                            {total} {total === 1 ? 'butik' : 'butiker'}
                          </span>
                          <span className="text-[10px] text-slate-400">totalt kopplade</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs flex items-center gap-1.5 border border-red-200 transition-colors touch-target"
                          title={`Ta bort kategorin "${cat.name}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Ta bort</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FEEDBACK & FELRAPPORTER */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Inkomna förslag &amp; feedback</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Förbättringsförslag, saknade butiker och felrapporter inlämnade av besökare.
              </p>
            </div>

            {dbData?.errorReports.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Inga förslag eller rapporter inkomna ännu.
              </div>
            ) : (
              <div className="space-y-3">
                {dbData?.errorReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {report.category === 'suggestion' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 text-[11px]">
                            <Lightbulb className="w-3 h-3 text-purple-600 fill-current" />
                            Förbättringsförslag
                          </span>
                        ) : report.category === 'store_missing' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[11px]">
                            <StoreIcon className="w-3 h-3 text-amber-700" />
                            Saknad butik
                          </span>
                        ) : report.category === 'bug' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800 text-[11px]">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            Felrapport
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 text-[11px]">
                            Feedback
                          </span>
                        )}
                        <span className="font-bold text-slate-900 text-sm">
                          {report.storeName} {report.routeTitle && `(${report.routeTitle})`}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          report.status === 'new'
                            ? 'bg-red-100 text-red-800'
                            : report.status === 'investigating'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {report.status === 'new'
                          ? 'Ny'
                          : report.status === 'investigating'
                          ? 'Granskas'
                          : 'Åtgärdad'}
                      </span>
                    </div>

                    <p className="text-slate-800 bg-white p-3.5 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed">
                      {report.userText}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-slate-400 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span>Inkom: {new Date(report.createdAt).toLocaleString('sv-SE')}</span>
                        {report.email && (
                          <a
                            href={`mailto:${report.email}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                          >
                            <Mail className="w-3 h-3" />
                            <span>{report.email}</span>
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {report.status !== 'investigating' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateReportStatus(report.id, 'investigating')}
                            className="text-amber-700 hover:underline font-semibold cursor-pointer"
                          >
                            Markera under granskning
                          </button>
                        )}
                        {report.status !== 'resolved' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                            className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                          >
                            Markera som åtgärdad
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AUDITLOGG */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/90 space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Auditlogg</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Spårbarhet över alla administrativa ändringar i systemet.
              </p>
            </div>

            <div className="space-y-2">
              {dbData?.auditEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 mr-2">[{event.action}]</span>
                    <span className="text-slate-700">{event.details}</span>
                  </div>
                  <div className="text-slate-400 shrink-0 ml-4">
                    {new Date(event.timestamp).toLocaleString('sv-SE')} ({event.user})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
