import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@inspectra/ui', '@inspectra/sdk'],
};

export default nextConfig;
