import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  basePath: '/team-buzzer',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/team-buzzer',
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
