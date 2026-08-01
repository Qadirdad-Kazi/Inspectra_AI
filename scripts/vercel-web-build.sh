#!/usr/bin/env bash
# Build @inspectra/web for Vercel with Root Directory = monorepo root.
# Next.js is built at the repo root (where Vercel expects .next) by linking
# the app source dirs from apps/web — avoids broken NFT traces from copy/symlink of .next.
set -euo pipefail

echo "==> Building web workspace dependencies"
pnpm --filter @inspectra/web^... build

echo "==> Linking Next.js app directories to monorepo root"
for d in app components lib public styles; do
  rm -rf "$d"
  ln -sfn "apps/web/$d" "$d"
done

cp -f apps/web/postcss.config.mjs ./postcss.config.mjs
cp -f apps/web/next-env.d.ts ./next-env.d.ts

# Deploy-time Next config at repo root (not committed)
# typescript.ignoreBuildErrors: root TS resolution can't see apps/web-only deps (sonner, etc.)
# Types are still checked in apps/web locally / CI.
cat > next.config.mjs <<'EOF'
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@inspectra/ui', '@inspectra/sdk'],
  outputFileTracingRoot: root,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
EOF

# Deploy-time tsconfig so Next resolves @/* at repo root
cat > tsconfig.next-deploy.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": [
    "next-env.d.ts",
    "app/**/*.ts",
    "app/**/*.tsx",
    "components/**/*.ts",
    "components/**/*.tsx",
    "lib/**/*.ts",
    "lib/**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules", "apps", "packages"]
}
EOF
cp -f tsconfig.next-deploy.json tsconfig.json

echo "==> Running next build at monorepo root"
pnpm exec next build

if [ ! -f .next/routes-manifest.json ]; then
  echo "ERROR: .next/routes-manifest.json missing" >&2
  ls -la .next || true
  exit 1
fi

echo "==> Vercel Next.js build OK"
