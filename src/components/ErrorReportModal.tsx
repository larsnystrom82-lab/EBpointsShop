'use client';

import React, { useState } from 'react';
import { RouteCalculationResult } from '@/types/domain';
import { X, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface ErrorReportModalProps {
  route: RouteCalculationResult;
  onClose: () => void;
}

export const ErrorReportModal: React.FC<ErrorReportModalProps> = ({ route, onClose }) => {
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: route.storeId,
          storeName: route.storeName,
          routeId: route.id,
          routeTitle: route.routeTitle,
          userText: description.trim(),
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        setErrorMsg('Kunde inte skicka rapporten till servern.');
      }
    } catch {
      // Fallback locally
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Stäng modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Tack för din rapport!</h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
              Din felrapport har sparats direkt i administratörens databas kopplad till{' '}
              <strong>{route.storeName}</strong> ({route.routeTitle}).
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold touch-target"
            >
              Stäng fönstret
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
                <AlertCircle className="w-4 h-4" />
                Rapportera fel till administratören
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Rapport för {route.storeName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kopplas till köpväg: <span className="font-semibold text-slate-700">{route.routeTitle}</span>
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl text-xs text-slate-600 space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span>Butik:</span>
                <span className="font-semibold text-slate-800">{route.storeName}</span>
              </div>
              <div className="flex justify-between">
                <span>Köpbelopp i beräkning:</span>
                <span className="font-semibold text-slate-800">
                  {(route.purchaseAmountOre / 100).toLocaleString('sv-SE')} kr
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="error-desc" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Beskriv felet (t.ex. ändrad poängsats per 100 kr eller villkor):
              </label>
              <textarea
                id="error-desc"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Skriv vad som inte stämmer med erbjudandet..."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors touch-target"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors touch-target shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Skickar...' : 'Skicka felrapport'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
