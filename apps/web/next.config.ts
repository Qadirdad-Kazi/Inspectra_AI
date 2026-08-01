import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ['@inspectra/ui', '@inspectra/sdk'],
  // Include workspace packages when tracing serverless functions (monorepo)
  outputFileTracingRoot: path.join(appDir, '../..'),
};

export default nextConfig;
