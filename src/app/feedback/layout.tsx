import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lämna förslag & feedback – Poängpiloten',
  description:
    'Hjälp oss förbättra Poängpiloten! Rapportera felaktiga poäng, tipsa om saknade butiker eller föreslå nya funktioner.',
  alternates: {
    canonical: '/feedback',
  },
  openGraph: {
    title: 'Lämna förslag & feedback – Poängpiloten',
    description:
      'Hjälp oss förbättra Poängpiloten! Rapportera felaktiga poäng, tipsa om saknade butiker eller föreslå nya funktioner.',
    url: 'https://www.poangpiloten.se/feedback',
  },
};

export default function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
