import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@inspectra/ui', '@inspectra/sdk'],
  // Root eslint config does not load @next/next plugin; skip blocking the production build.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
