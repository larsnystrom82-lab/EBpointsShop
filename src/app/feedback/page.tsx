'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Lightbulb,
  Store,
  Bug,
  MessageSquare,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

type FeedbackCategory = 'suggestion' | 'store_missing' | 'bug' | 'general' | 'store_change';

const CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  description: string;
  icon: React.ElementType;
  placeholder: string;
}[] = [
  {
    id: 'suggestion',
    label: 'Förbättringsförslag',
    description: 'Idéer till nya funktioner, design eller beräkningar',
    icon: Lightbulb,
    placeholder: 'Vad skulle göra bonuslotsen.se ännu bättre för dig? Beskriv gärna din idé så utförligt som möjligt...',
  },
  {
    id: 'store_missing',
    label: 'Saknad butik',
    description: 'Tipsa om butik eller presentkort som borde finnas med',
    icon: Store,
    placeholder: 'Vilken butik saknar du? Vet du om den har EuroBonus-samarbete eller presentkort?',
  },
  {
    id: 'bug',
    label: 'Rapportera fel',
    description: 'Något som inte fungerar eller felaktiga poängkurser',
    icon: Bug,
    placeholder: 'Vad gick fel eller vad stämmer inte? Ange gärna butiksnamn eller länk om det gäller en specifik sida...',
  },
  {
    id: 'general',
    label: 'Allmän feedback',
    description: 'Tankar, ris eller ros till skaparna',
    icon: MessageSquare,
    placeholder: 'Vad tycker du om tjänsten? Vi uppskattar all återkoppling!',
  },
];

export default function FeedbackPage() {
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [storeName, setStoreName] = useState('');
  const [userText, setUserText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentCategoryObj =
    CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userText.trim()) {
      setErrorMessage('Vänligen fyll i ditt förslag eller din feedback.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          storeName: category === 'store_missing' ? storeName.trim() : undefined,
          userText: userText.trim(),
          pageUrl: '/feedback',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Kunde inte skicka feedback');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      console.error('Feedback submit error:', err);
      // Fallback gracefully
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setUserText('');
    setStoreName('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 w-full">
        {/* Header */}
        <section className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs sm:text-sm font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Vi utvecklas med era idéer</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Lämna förslag &amp; feedback
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Har du idéer på nya funktioner, saknar du en butik eller vill du tipsa om ändrade
            poängsatser? Vi läser alla förslag noggrant.
          </p>
        </section>

        {/* Feedback Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Vad vill du lämna feedback om?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 touch-target cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-600/30 shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold leading-tight">
                            {cat.label}
                          </div>
                          <div className="text-xs text-slate-500 leading-snug mt-0.5">
                            {cat.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* If missing store, ask for store name */}
              {category === 'store_missing' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label
                    htmlFor="store-name-input-page"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Butiksnamn
                  </label>
                  <input
                    id="store-name-input-page"
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="T.ex. CDON, Biltema, NetOnNet..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              )}

              {/* Description Textarea */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <label
                    htmlFor="feedback-message-page"
                    className="block text-xs font-bold text-slate-700"
                  >
                    2. Beskriv ditt förslag eller din feedback <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-400 font-medium">
                    {userText.length}/3 000
                  </span>
                </div>
                <textarea
                  id="feedback-message-page"
                  rows={5}
                  value={userText}
                  maxLength={3000}
                  onChange={(e) => setUserText(e.target.value)}
                  placeholder={currentCategoryObj.placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all resize-y min-h-[140px]"
                  required
                />
              </div>

              {/* Error banner */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Din information hanteras konfidentiellt och delas aldrig.</span>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !userText.trim()}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Skickar...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Skicka feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Success View */
            <div className="py-12 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Tack för ditt förslag!
                </h2>
                <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
                  Vi uppskattar verkligen att du tog dig tid att hjälpa oss utveckla bonuslotsen.se.
                  Vi går igenom alla förslag regelbundet.
                </p>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Skicka ett till förslag
                </button>
                <Link
                  href="/"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-2"
                >
                  <span>Tillbaka till Jämför bonuspoäng</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
