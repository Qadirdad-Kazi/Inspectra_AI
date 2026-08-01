import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRootDeploy = process.env.VERCEL_MONOREPO_ROOT === '1';

const nextConfig: NextConfig = {
  transpilePackages: ['@inspectra/ui', '@inspectra/sdk'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Include workspace packages when tracing serverless functions
  outputFileTracingRoot: path.join(appDir, '../..'),
  // Emit `.next` at monorepo root when Vercel Root Directory is `.`
  ...(monorepoRootDeploy ? { distDir: path.join(appDir, '../../.next') } : {}),
};

export default nextConfig;
