import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://bonuslotsen.se'),
  title: {
    default: 'Jämför bonuspoäng – bonuslotsen.se',
    template: '%s – bonuslotsen.se',
  },
  description: 'Jämför EuroBonus-intjäning mellan butiker och köpvägar för ditt angivna köpbelopp. Se poäng via partnerköp, presentkort och dina kort.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Jämför bonuspoäng – bonuslotsen.se',
    description: 'Hitta den smartaste vägen till flest EuroBonus-extrapoäng på dina vardagsinköp.',
    url: 'https://bonuslotsen.se',
    siteName: 'bonuslotsen.se',
    locale: 'sv_SE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jämför bonuspoäng – bonuslotsen.se',
    description: 'Hitta den smartaste vägen till flest EuroBonus-extrapoäng på dina vardagsinköp.',
  },
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
