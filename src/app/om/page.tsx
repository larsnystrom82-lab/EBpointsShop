import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ShoppingBag,
  CreditCard,
  ArrowRight,
  Info,
  AlertOctagon,
  Compass,
  MessageSquareWarning,
  BadgeAlert,
  Lightbulb,
} from 'lucide-react';
import { FeedbackTriggerButton } from '@/components/FeedbackTriggerButton';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Om bonuslotsen.se – Syfte, oberoende och villkor',
  description:
    'Läs om syftet med bonuslotsen.se, hur vi hjälper EuroBonus-medlemmar att maximera poängintjäningen vid vardagsköp, samt viktig information om att alltid kontrollera butikers villkor.',
};

export default function OmPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs sm:text-sm font-semibold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100 % Oberoende konsumenttjänst</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Om <span className="text-blue-600">bonuslotsen.se</span>
          </h1>
          <p className="text-base sm:text-xl text-slate-600 leading-relaxed font-normal">
            Ett gratis och oberoende verktyg skapat för att hjälpa dig navigera i SAS
            EuroBonus-djungeln och maximera poängintjäningen på varje krona du handlar för.
          </p>
        </section>

        {/* Quick Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">1. Jämför köpvägar</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Se direkt om det lönar sig bäst att handla direkt via SAS shoppingportal eller genom
              presentkortsköp (Zupergift).
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">2. Kombinera dina kort</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Lägg till dina SAS Amex- och Mastercard-kort för att se den totala poängsumman
              inklusive ”dubbeldipp” och eventuella nivåpoäng.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 mb-3">
              <BadgeAlert className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">3. Kontrollera villkoren</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Vi påminner dig alltid om vad du måste tänka på hos butiken så att inga poäng går
              förlorade på grund av undantag eller kakor.
            </p>
          </div>
        </section>

        {/* Vårt Syfte */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Vad är syftet med bonuslotsen.se?
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Vår vision är att göra EuroBonus-intjäning i vardagen enkel, transparent och tillgänglig.
              </p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
            <p>
              Att samla SAS EuroBonus-poäng är ett av de mest effektiva sätten för skandinaver att
              kunna resa i Business Class, resa två för en med Amex 2-4-1-vouchers eller uppleva
              spännande destinationer över hela världen med SkyTeam.
            </p>
            <p>
              Men intjäningen i vardagen kan vara förvirrande. Samma köp hos samma butik kan ge
              dramatiskt olika poäng beroende på <em>hur</em> du genomför det:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-700 font-medium">
              <li>
                Går du via <strong>SAS Online Shopping-portal</strong> och betalar med ett anslutet
                kreditkort?
              </li>
              <li>
                Kanske ger butiken <strong>dubbla poäng via ett Zupergift-presentkort</strong> som du
                först köper med ditt kreditkort och sedan löser in?
              </li>
              <li>
                Finns det en <strong>tidsbegränsad kampanj</strong> som gör att partnerbutiken ger
                mer poäng än vanligt?
              </li>
              <li>
                Erbjuder butiken en <strong>fast engångsbonus</strong> vid första köp snarare än
                poäng per 100 kronor?
              </li>
            </ul>
            <p>
              <strong>bonuslotsen.se skapades för att lösa detta.</strong> Istället för att du ska behöva
              öppna fem flikar, räkna i huvudet eller missa förmånliga kampanjer ger bonuslotsen.se dig
              svaret på en sekund. Skriv in butiken och summan du planerar att handla för – så visar
              vi den mest lönsamma vägen.
            </p>
          </div>
        </section>

        {/* VIKTIGT: Kontrollera alltid butikernas villkor */}
        <section
          id="villkor"
          className="bg-amber-50/70 border-2 border-amber-300/80 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full mb-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                Viktigt meddelande till alla användare
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-amber-950">
                Kontrollera alltid villkoren hos butiken och SAS
              </h2>
              <p className="text-sm sm:text-base text-amber-900/90 mt-1 leading-relaxed">
                bonuslotsen.se tillhandahåller beräkningar i god tro baserat på kända data, men
                regler och poängsatser kan ändras när som helst. Läs alltid villkorstexten noggrant
                innan du genomför ett köp.
              </p>
            </div>
          </div>

        </section>

        {/* Oberoende och ansvarsfriskrivning */}
        <section className="bg-slate-100 rounded-3xl p-6 sm:p-10 border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Oberoende och ansvarsfriskrivning
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Juridisk information och integritet
              </p>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              <strong>bonuslotsen.se är en oberoende jämförelsetjänst</strong> och är inte ansluten till, sponsrad av eller godkänd av SAS eller de företag som visas. Varumärkesnamn och logotyper tillhör respektive rättighetsinnehavare och används för att identifiera de företag och tjänster som jämförs. Tjänsten drivs inte av, ägs inte av och är inte formellt associerad med Scandinavian Airlines System (SAS AB), SAS EuroBonus AB, LoyaltyKey eller någon av de listade butikerna eller kreditkortsinstituten.
            </p>
            <p>
              Beräkningar, poängkurser och råd tillhandahålls uteslutande som informationsstöd.
              bonuslotsen.se påtar sig inget juridiskt ansvar för eventuella felaktigheter i data,
              uteblivna poängregistreringar, nekade transaktioner eller ändringar i butikers eller
              flygbolags villkor.
            </p>
            <p>
              Om en poängregistrering uteblir efter ett köp rekommenderar vi att du kontaktar{' '}
              <a
                href="https://onlineshopping.flysas.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-semibold underline hover:text-blue-800"
              >
                SAS Online Shopping kundsupport
              </a>{' '}
              eller gör en efterregistrering med kvitto och orderbekräftelse inom den tidsfrist som
              SAS anger.
            </p>
          </div>
        </section>

        {/* Rapportera fel & Hjälp till */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-blue-600 font-bold text-sm">
              <MessageSquareWarning className="w-5 h-5" />
              <span>Hjälp oss hålla bonuslotsen.se 100 % korrekt</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Har en butik ändrat poängsats eller villkor?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
              Med hundratals butiker och ständigt nya kampanjer uppskattar vi tips från
              communityt. Klicka på ”Rapportera fel” direkt på respektive butikskort på startsidan
              om något inte stämmer.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <FeedbackTriggerButton
              category="suggestion"
              className="px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Lightbulb className="w-4 h-4 fill-current text-amber-300" />
              <span>Lämna feedback &amp; idéer</span>
            </FeedbackTriggerButton>
            <Link
              href="/"
              className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <span>Jämför</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
