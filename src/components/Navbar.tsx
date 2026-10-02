'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plane, Search, Menu, X, Lightbulb } from 'lucide-react';
import { useFeedback } from './FeedbackContext';

interface NavbarProps {
  onSearchClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearchClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { openFeedback } = useFeedback();

  const isHome = pathname === '/';
  const isLankar = pathname?.startsWith('/lankar');
  const isOm = pathname?.startsWith('/om');

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              onClick={() => {
                setMobileMenuOpen(false);
                if (pathname === '/') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-2.5 text-slate-900 group cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
              title="Gå till första sidan: Jämför bonuspoäng"
              aria-label="Poängkollen - Gå till första sidan: Jämför bonuspoäng"
            >
              <div
                className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors"
                title="Poängkollen-ikonen – Klicka för att gå till första sidan"
              >
                <Plane className="w-5 h-5 -rotate-45" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                Poängkollen
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                href="/"
                className={`px-3 py-2 text-sm font-semibold transition-colors ${
                  isHome
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jämför bonuspoäng
              </Link>
              <Link
                href="/#butiker"
                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Butiker
              </Link>
              <Link
                href="/lankar"
                className={`px-3 py-2 text-sm font-semibold transition-colors ${
                  isLankar
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Verktyg &amp; Länkar
              </Link>
              <Link
                href="/om"
                className={`px-3 py-2 text-sm transition-colors ${
                  isOm
                    ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                Om
              </Link>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => openFeedback({ category: 'suggestion' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 hover:text-blue-700 bg-slate-100/80 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all cursor-pointer touch-target"
              title="Lämna förslag eller feedback"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>Feedback</span>
            </button>

            {onSearchClick && (
              <button
                type="button"
                onClick={onSearchClick}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors touch-target"
                aria-label="Sök"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg touch-target"
              aria-label="Öppna meny"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          <Link
            href="/"
            onClick={() => {
              setMobileMenuOpen(false);
              if (pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`block px-3 py-2 rounded-lg text-base font-semibold ${
              isHome ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Jämför bonuspoäng (Startsida)
          </Link>
          <Link
            href="/#butiker"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Butiker
          </Link>
          <Link
            href="/lankar"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-semibold ${
              isLankar ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Verktyg &amp; Länkar
          </Link>
          <Link
            href="/om"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base transition-colors ${
              isOm
                ? 'text-blue-600 bg-blue-50 font-semibold'
                : 'text-slate-700 hover:bg-slate-50 font-medium'
            }`}
          >
            Om Poängkollen
          </Link>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              openFeedback({ category: 'suggestion' });
            }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-base font-semibold text-blue-700 bg-blue-50/70 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <Lightbulb className="w-4 h-4 text-amber-500 fill-current shrink-0" />
            <span>Lämna förbättringsförslag</span>
          </button>
        </div>
      )}
    </nav>
  );
};
