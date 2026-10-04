import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jämför bonuspoäng – Eurobonus-jakten',
  description: 'Jämför EuroBonus-intjäning mellan butiker och köpvägar för ditt angivna köpbelopp. Se poäng via partnerköp, presentkort och dina kort.',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

import { ClientProviders } from '@/components/ClientProviders';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
