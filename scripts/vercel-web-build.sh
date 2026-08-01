#!/usr/bin/env bash
# Build Next.js web app from monorepo root for Vercel (Root Directory = .).
set -euo pipefail

pnpm --filter @inspectra/web... build

rm -rf .next
cp -R apps/web/.next .next

mkdir -p public
if [ -d apps/web/public ]; then
  cp -R apps/web/public/. public/
fi

# Help Vercel resolve Next config / app paths at repo root
cp -f apps/web/next.config.ts ./next.config.ts
