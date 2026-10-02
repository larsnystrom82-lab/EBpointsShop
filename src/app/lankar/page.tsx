'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useFeedback } from '@/components/FeedbackContext';
import {
  Plane,
  Search,
  ExternalLink,
  ArrowRight,
  Compass,
  ShoppingBag,
  Users,
  Calendar,
  Globe,
  Tag,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';

export type ResourceCategory = 'all' | 'awards' | 'shopping' | 'community' | 'routes';

interface ResourceItem {
  id: string;
  name: string;
  tagline: string;
  category: 'awards' | 'shopping' | 'community' | 'routes';
  categoryLabel: string;
  categoryBadgeColor: string;
  badge?: string;
  badgeColor?: string;
  description: string;
  features: string[];
  url: string;
}

const RESOURCES_DATA: ResourceItem[] = [
  {
    id: 'bonussok',
    name: 'BonusSøk (bonussok.no/sv)',
    tagline: 'Sök och hitta lediga bonusresor med SAS och SkyTeam',
    category: 'awards',
    categoryLabel: 'Sök bonusresor',
    categoryBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badge: 'Mest populära sökmotorn',
    badgeColor: 'bg-emerald-600 text-white',
    description:
      'Ett av de absolut mest uppskattade verktygen för skandinaviska EuroBonus-jägare. Sök snabbt och smidigt efter tillgängliga bonusplatser hos SAS och partnerflygbolag inom SkyTeam (t.ex. Air France, KLM, Delta och Virgin Atlantic). Kalenderöversikten visar tillgänglighet månad för månad i SAS Go, Plus och Business.',
    features: [
      'Kalendersök över SAS och SkyTeam bonusplatser',
      'Se direkt tillgänglighet i Business, Premium & Economy',
      'Svensk språkversion anpassad för skandinaviska resenärer',
      'Filtrera på direktflyg, allianspartners eller specifika destinationer',
    ],
    url: 'https://www.bonussok.no/sv',
  },
  {
    id: 'awardfares',
    name: 'AwardFares',
    tagline: 'Modernt och blixtsnabbt sökverktyg med platsbevakning',
    category: 'awards',
    categoryLabel: 'Sök bonusresor',
    categoryBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badge: 'Platsbevakning & Alerts',
    badgeColor: 'bg-blue-600 text-white',
    description:
      'Avancerad sökmotor utvecklad specifikt för frekventa resenärer. Sök bonusresor över flera datum samtidigt, övervaka avgångar och få notiser direkt i samma sekund som en eftertraktad bonusplats i Business Class släpps av flygbolaget.',
    features: [
      'Blixtsnabb sökning av tillgängliga EuroBonus-bonusresor',
      'Automatisk platsbevakning med e-post och pushnotiser',
      'Tidslinjer och historik för hur bonusplatser brukar släppas',
      'Stöd för SAS, SkyTeam och flera andra globala program',
    ],
    url: 'https://awardfares.com/',
  },
  {
    id: 'seatspy',
    name: 'SeatSpy',
    tagline: 'Överskådlig helårskalender för bonusplatser',
    category: 'awards',
    categoryLabel: 'Sök bonusresor',
    categoryBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badge: 'Kalendersök',
    badgeColor: 'bg-indigo-600 text-white',
    description:
      'Visar ett helt års tillgänglighet av bonusplatser på en enda skärm. Perfekt när du är flexibel med resdatum och letar efter lediga premiumstolar till populära långdistansresmål i USA, Asien eller Sydeuropa.',
    features: [
      'Helårskalender för SAS-avgångar i realtid',
      'Stöd för SAS Business, SAS Plus och SAS Go',
      'Enkelt att sätta upp bevakningar på specifika rutter',
    ],
    url: 'https://www.seatspy.com/',
  },
  {
    id: 'chatflights',
    name: 'Chatflights',
    tagline: 'Personlig conciergetjänst för att boka din drömresa med poäng',
    category: 'awards',
    categoryLabel: 'Sök bonusresor',
    categoryBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badge: 'Bokningshjälp & App',
    badgeColor: 'bg-purple-600 text-white',
    description:
      'Svensk app och bokningsbyrå specialiserad på poängresor. Erfarna poängexperter hjälper dig att hitta och boka de absolut bästa tillgängliga bonusresorna med dina EuroBonus-poäng och Amex 2-för-1-vouchers.',
    features: [
      'Personlig support via chatt i appen',
      'Hjälper dig nyttja Amex 2-för-1-förmånen optimalt',
      'Perfekt för komplexa rutter och ' + 'multi-city-bokningar',
    ],
    url: 'https://chatflights.se/',
  },
  {
    id: 'eurobonusguiden',
    name: 'EuroBonusguiden.se',
    tagline: 'Sveriges ledande guide- och nyhetssajt för EuroBonus',
    category: 'shopping',
    categoryLabel: 'Guider & Kampanjer',
    categoryBadgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    badge: 'Guider & Nyheter',
    badgeColor: 'bg-amber-600 text-white',
    description:
      'En guldgruva av kunskap för alla som vill samla och maximera poäng. Här hittar du pedagogiska guider om aktuella kampanjer, kreditkortstester, strategier för statusjakt och smarta tips för vardagspoäng.',
    features: [
      'Nyheter om poängkampanjer och dubbla poäng-helger',
      'Djupgående tester av SAS kreditkort',
      'Eurobonusskolan från grunderna till expertnivå',
    ],
    url: 'https://eurobonusguiden.se/',
  },
  {
    id: 'sas-online-shopping',
    name: 'SAS EuroBonus Online Shopping',
    tagline: 'Officiella shoppingportalen med över 450 butiker',
    category: 'shopping',
    categoryLabel: 'Poäng & Shopping',
    categoryBadgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    badge: 'Officiell SAS-portal',
    badgeColor: 'bg-blue-700 text-white',
    description:
      'SAS egen shoppingportal. Genom att klicka dig vidare till anslutna webbutiker tjänar du Extrapoäng och Nivåpoäng på allt från elektronik och kläder till inredning, hotell och böcker.',
    features: [
      '450+ anslutna nätbutiker i Sverige och Norden',
      'Regelbundna kampanjer med upp till 100 poäng per 100 kr',
      'Poängen registreras automatiskt på ditt EuroBonus-konto',
    ],
    url: 'https://onlineshopping.flysas.com/sv-SE/',
  },
  {
    id: 'sas-giftcards',
    name: 'SAS EuroBonus Shop (Presentkort & Zupergift)',
    tagline: 'Köp digitala presentkort och Zupergift med poängintjäning',
    category: 'shopping',
    categoryLabel: 'Poäng & Shopping',
    categoryBadgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    badge: 'Officiell shop',
    badgeColor: 'bg-blue-700 text-white',
    description:
      'Den officiella poängshopen där du kan köpa digitala presentkort och Zupergift-kort med ditt betalkort och tjäna upp till 50 Extrapoäng per 100 kr vid aktiva kampanjer.',
    features: [
      'Digitala presentkort som levereras direkt via e-post/SMS',
      'Zupergift som kan växlas till över 100 kända butiker',
      'Kombinera med SAS kreditkort för maximal totalintjäning',
    ],
    url: 'https://www.saseurobonusshop.com/se/gift-cards-vouchers',
  },
  {
    id: 'businessclass',
    name: 'BusinessClass.se Forum',
    tagline: 'Nordens största mötesplats för frekventa resenärer',
    category: 'community',
    categoryLabel: 'Forum & Community',
    categoryBadgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    badge: 'Nordens största forum',
    badgeColor: 'bg-purple-600 text-white',
    description:
      'Den centrala mötesplatsen för svenska EuroBonus-entusiaster. Här diskuteras de senaste sweetspotsen, nysläppta bonusstolar, kreditkortsstrategier, lounge-upplevelser och flygnyheter.',
    features: [
      'Dedikerad sektion för SAS EuroBonus och SkyTeam',
      'Trådar med tips om nyligen släppta bonusstolar i Business Class',
      'Hjälp från erfarna resenärer med rutter och regler',
    ],
    url: 'https://www.businessclass.com/forum/',
  },
  {
    id: 'facebook-group',
    name: 'SAS EuroBonus Forum (Facebook)',
    tagline: 'Aktiv Facebook-community med tiotusentals poängjägare',
    category: 'community',
    categoryLabel: 'Forum & Community',
    categoryBadgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    badge: 'Stor community',
    badgeColor: 'bg-indigo-600 text-white',
    description:
      'Sveriges mest aktiva Facebook-grupp om EuroBonus. Tusentals inlägg och kommentarer varje månad med snabba svar på frågor, kampanjtips, kreditkortserfarenheter och medlemsförmåner.',
    features: [
      'Snabba svar på frågor om biljetter, skatter och vouchers',
      'Realtidstips när kampanjer och kampanjkoder dyker upp',
      'Aktivt erfarenhetsutbyte kring kreditkort och intjäning',
    ],
    url: 'https://www.facebook.com/groups/sas.eurobonus/',
  },
  {
    id: 'flightconnections',
    name: 'FlightConnections',
    tagline: 'Interaktiv ruttkarta över alla världens direktflyg',
    category: 'routes',
    categoryLabel: 'Rutter & Allianser',
    categoryBadgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badge: 'Ruttkarta',
    badgeColor: 'bg-cyan-700 text-white',
    description:
      'Ett ovärderligt verktyg när du planerar bonusresor. Filtrera på flygbolag (t.ex. SAS, KLM, Air France, Delta) eller alliansen SkyTeam för att se alla direktlinjer och möjliga transferflygplatser i världen.',
    features: [
      'Filtrera efter specifika SkyTeam-bolag eller SAS',
      'Se vilka dagar i veckan linjer trafikeras',
      'Upptäck oväntade rutter och transferhubbar för bonusresor',
    ],
    url: 'https://www.flightconnections.com/',
  },
  {
    id: 'skyteam',
    name: 'SkyTeam Alliance',
    tagline: 'SAS globala flygallians sedan september 2024',
    category: 'routes',
    categoryLabel: 'Rutter & Allianser',
    categoryBadgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badge: 'Officiell allians',
    badgeColor: 'bg-slate-800 text-white',
    description:
      'SAS är officiell medlem i SkyTeam. På alliansens webbplats hittar du information om alla 19 partnerflygbolag (Air France, KLM, Delta, Virgin Atlantic, Korean Air m.fl.), SkyPriority-förmåner och lounger.',
    features: [
      'Översikt över alla 19 medlemsflygbolag',
      'Information om SkyTeam Elite och Elite Plus (motsvarar Silver & Guld)',
      'Lounge-finder för över 750 flygplatslounger i världen',
    ],
    url: 'https://www.skyteam.com/',
  },
];

const CATEGORY_TABS: { id: ResourceCategory; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Alla verktyg & länkar', icon: Globe },
  { id: 'awards', label: 'Sök bonusresor', icon: Plane },
  { id: 'shopping', label: 'Poäng & Shopping', icon: ShoppingBag },
  { id: 'community', label: 'Forum & Community', icon: Users },
  { id: 'routes', label: 'Rutter & Allianser', icon: Compass },
];

export default function LankarPage() {
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { openFeedback } = useFeedback();

  const filteredResources = useMemo(() => {
    return RESOURCES_DATA.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesTagline = item.tagline.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesFeatures = item.features.some((f) => f.toLowerCase().includes(q));
        const matchesBadge = item.badge?.toLowerCase().includes(q);
        return matchesName || matchesTagline || matchesDesc || matchesFeatures || Boolean(matchesBadge);
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 w-full">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Bra sidor &amp; verktyg för EuroBonus-jägare
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Här har vi samlat de bästa externa sökmotorerna för bonusresor, officiella portaler, forum,
            ruttkartor och communities som varje poängsamlare bör ha koll på.
          </p>
        </section>

        {/* Filter and Search Bar */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök bland länkar och verktyg..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
                >
                  Rensa
                </button>
              )}
            </div>

            {/* Results count */}
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 self-center">
              <span>Visar {filteredResources.length} av {RESOURCES_DATA.length} resurser</span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap touch-target cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Resource Cards Grid */}
        <section className="space-y-6">
          {filteredResources.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center space-y-4 border border-slate-200/90 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Inga resurser matchade din sökning</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Prova att söka på ett annat ord eller välj en annan kategori ovan.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                Återställ filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredResources.map((item) => (
                <article
                  key={item.id}
                  className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-blue-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6 group"
                >
                  <div className="space-y-4">
                    {/* Header badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${item.categoryBadgeColor}`}
                      >
                        {item.categoryLabel}
                      </span>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider ${
                            item.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {/* Title & Tagline */}
                    <div>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                        <span>{item.name}</span>
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-blue-700 mt-0.5">
                        {item.tagline}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Key features bullets */}
                    <div className="space-y-1.5 pt-1">
                      {item.features.map((feature, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer: Action button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]">
                      {item.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </span>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-slate-900 group-hover:bg-blue-600 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs touch-target shrink-0"
                    >
                      <span>Besök webbplatsen</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Suggestion Box: Tipsa om ett nytt verktyg */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
              <Lightbulb className="w-5 h-5 text-amber-500 fill-current" />
              <span>Känner du till fler bra verktyg eller sidor?</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg">
              Tipsa oss gärna om användbara appar, sökmotorer eller guider som borde finnas med på den här sidan.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openFeedback({ category: 'suggestion', initialText: 'Tips på bra EuroBonus-resurs/verktyg: ' })}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-colors shadow-xs touch-target shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <span>Tipsa om en sida</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
