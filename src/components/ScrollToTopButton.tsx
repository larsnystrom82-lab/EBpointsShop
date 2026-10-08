'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Visa knappen när användaren scrollat ner mer än 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scrolla till toppen av sidan"
      title="Scrolla till toppen"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-hidden focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 cursor-pointer touch-target"
    >
      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
      <span className="hidden sm:inline">Till toppen</span>
    </button>
  );
};
