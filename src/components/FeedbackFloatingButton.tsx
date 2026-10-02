'use client';

import React from 'react';
import { useFeedback } from './FeedbackContext';
import { Lightbulb } from 'lucide-react';

export const FeedbackFloatingButton: React.FC = () => {
  const { openFeedback } = useFeedback();

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 print:hidden">
      <button
        type="button"
        onClick={() => openFeedback({ category: 'suggestion' })}
        className="group flex items-center gap-2 bg-white/95 hover:bg-blue-600 text-slate-800 hover:text-white px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-full border border-slate-300 hover:border-blue-600 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer touch-target focus:outline-hidden focus:ring-2 focus:ring-blue-500 backdrop-blur-xs"
        aria-label="Lämna förslag eller feedback"
        title="Lämna förbättringsförslag eller feedback"
      >
        <div className="w-5 h-5 rounded-full bg-amber-100 group-hover:bg-white/20 flex items-center justify-center text-amber-600 group-hover:text-white transition-colors shrink-0">
          <Lightbulb className="w-3.5 h-3.5 fill-current" />
        </div>
        <span className="text-xs sm:text-sm font-bold tracking-tight">
          Förslag &amp; Feedback
        </span>
      </button>
    </div>
  );
};
