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
