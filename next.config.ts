import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async redirects() {
    return [
      // Permanent omdirigering från gamla Bonuslotsen till Poängpiloten
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: '^(?:.*\\.)?bonuslotsen\\.se$',
          },
        ],
        destination: 'https://www.poangpiloten.se/:path*',
        permanent: true,
      },
      // Permanent omdirigering från apex-domänen poangpiloten.se till www.poangpiloten.se
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: '^poangpiloten\\.se$',
          },
        ],
        destination: 'https://www.poangpiloten.se/:path*',
        permanent: true,
      },
      // Äldre interna sökvägar
      {
        source: '/jamfor',
        destination: '/',
        permanent: true,
      },
      {
        source: '/jamfor-bonuspoang',
        destination: '/',
        permanent: true,
      },
      {
        source: '/start',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
