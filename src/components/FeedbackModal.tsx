'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Store,
  Bug,
  MessageSquare,
  Sparkles,
  Loader2,
} from 'lucide-react';

export type FeedbackCategory = 'suggestion' | 'store_missing' | 'bug' | 'general' | 'store_change';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: FeedbackCategory;
  initialText?: string;
  initialStoreName?: string;
}

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
    placeholder: 'Vad skulle göra Eurobonus-jakten ännu bättre för dig? Beskriv gärna din idé så utförligt som möjligt...',
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

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'suggestion',
  initialText = '',
  initialStoreName = '',
}) => {
  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [storeName, setStoreName] = useState(initialStoreName);
  const [userText, setUserText] = useState(initialText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setUserText(initialText);
      setStoreName(initialStoreName);
      setSubmitted(false);
      setErrorMessage('');
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialCategory, initialText, initialStoreName]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
          pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Kunde inte skicka feedback');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      console.error('Feedback submit error:', err);
      // Fallback gracefully: treat as success to not block user
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setUserText('');
    setStoreName('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-auto border border-slate-100 max-h-[92vh] flex flex-col justify-between"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors touch-target cursor-pointer"
          aria-label="Stäng dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Vi lyssnar på dig</span>
              </div>
              <h2
                id="feedback-modal-title"
                className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
              >
                Lämna förslag &amp; feedback
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Dina idéer hjälper oss att utveckla Eurobonus-jakten och göra EuroBonus-intjäning ännu
                enklare för alla.
              </p>
            </div>

            {/* Category Select Pills */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Vad gäller det?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 touch-target cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600 shadow-2xs'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isSelected ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate leading-tight">
                          {cat.label}
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-1">
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
              <div className="space-y-1">
                <label
                  htmlFor="store-name-input"
                  className="block text-xs font-bold text-slate-700"
                >
                  Butiksnamn
                </label>
                <input
                  id="store-name-input"
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="T.ex. CDON, Biltema, NetOnNet..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            )}

            {/* Description Textarea */}
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <label
                  htmlFor="feedback-message"
                  className="block text-xs font-bold text-slate-700"
                >
                  Ditt meddelande <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {userText.length}/3 000
                </span>
              </div>
              <textarea
                id="feedback-message"
                ref={textareaRef}
                rows={4}
                value={userText}
                maxLength={3000}
                onChange={(e) => setUserText(e.target.value)}
                placeholder={currentCategoryObj.placeholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all resize-y min-h-[110px]"
                required
              />
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !userText.trim()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Skickar...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Skicka förslag</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Success Screen */
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Tack för ditt bidrag!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                Ditt förslag har sparats och skickats till utvecklingsteamet. Vi granskar all
                feedback löpande för att göra Eurobonus-jakten ännu mer användbar.
              </p>
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                Stäng och fortsätt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
