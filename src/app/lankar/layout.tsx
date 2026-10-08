import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verktyg & Länkar – bonuslotsen.se',
  description:
    'Handplockade resurser, guider och verktyg för att hitta bonusresor och samla EuroBonus-poäng snabbare.',
  alternates: {
    canonical: '/lankar',
  },
  openGraph: {
    title: 'Verktyg & Länkar – bonuslotsen.se',
    description:
      'Handplockade resurser, guider och verktyg för att hitta bonusresor och samla EuroBonus-poäng snabbare.',
    url: 'https://bonuslotsen.se/lankar',
  },
};

export default function LankarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
