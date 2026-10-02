'use client';

import React, { useId } from 'react';
import { Coins, AlertTriangle } from 'lucide-react';

interface AmountInputProps {
  value: string;
  onChange: (rawValue: string, parsedAmount: number | null, errorMessage?: string) => void;
  error?: string;
}

/**
 * Parses Swedish input format:
 * Allows spaces as thousands separators (e.g. "1 995", "1 995,50")
 * Allows comma or dot as decimal separator
 * Rejects negative numbers or more than 2 decimals.
 */
export function parseSwedishAmount(input: string): { amount: number | null; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { amount: null };
  }

  // Remove currency strings or extra spaces
  const cleaned = trimmed
    .replace(/\s+/g, '')
    .replace(/kr/gi, '')
    .replace(/sek/gi, '')
    .replace(',', '.');

  // Check valid number regex with max 2 decimals
  const validRegex = /^[0-9]+(\.[0-9]{1,2})?$/;
  if (!validRegex.test(cleaned)) {
    return {
      amount: null,
      error: 'Ange ett giltigt belopp i kronor (t.ex. 1 995 eller 1 995,50 kr med högst 2 decimaler).',
    };
  }

  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) {
    return {
      amount: null,
      error: 'Köpbeloppet måste vara större än 0 kr.',
    };
  }

  if (num > 10_000_000) {
    return {
      amount: null,
      error: 'Beloppet är för högt (max 10 000 000 kr).',
    };
  }

  return { amount: num };
}

export const AmountInput: React.FC<AmountInputProps> = ({ value, onChange, error }) => {
  const inputId = useId();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const { amount, error: validationError } = parseSwedishAmount(raw);
    onChange(raw, amount, validationError);
  };

  const handleQuickAmount = (amt: number) => {
    const formatted = amt.toLocaleString('sv-SE');
    onChange(formatted, amt, undefined);
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
          2
        </span>
        <h2 className="text-lg font-bold text-slate-900">Ange tänkt köpbelopp</h2>
      </div>

      <p className="text-xs sm:text-sm text-slate-500 mb-4">
        Jämförelse för ditt angivna köpbelopp. Beloppet gäller samma tänkta köp i samtliga valda butiker.
      </p>

      <div className="relative">
        <label htmlFor={inputId} className="sr-only">
          Köpbelopp i kronor (SEK)
        </label>
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Coins className="w-5 h-5 text-slate-500" />
        </div>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleInputChange}
          placeholder="Exempelvis 100"
          className={`w-full pl-11 pr-14 py-3 rounded-xl border text-base font-semibold text-slate-900 bg-slate-50 focus:bg-white transition-all touch-target ${
            error
              ? 'border-red-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 bg-red-50/20'
              : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
          }`}
        />
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-sm font-bold text-slate-500">
          kr
        </div>
      </div>

      {error && (
        <div className="mt-2 text-xs sm:text-sm text-red-600 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Snabblänkar för vanliga köpbelopp */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-medium">Vanliga belopp:</span>
        {[100, 500, 1000, 2000, 5000].map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => handleQuickAmount(amt)}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors touch-target flex items-center"
          >
            {amt.toLocaleString('sv-SE')} kr
          </button>
        ))}
      </div>
    </div>
  );
};
