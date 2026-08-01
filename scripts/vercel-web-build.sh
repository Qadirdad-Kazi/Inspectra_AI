#!/usr/bin/env bash
# Build Next.js for Vercel when Root Directory is the monorepo root (.).
# Writes .next to the repo root via VERCEL_MONOREPO_ROOT + next.config distDir.
set -euo pipefail

export VERCEL_MONOREPO_ROOT=1

pnpm --filter @inspectra/web... build

# Static assets expected at deploy root
mkdir -p public
if [ -d apps/web/public ]; then
  cp -R apps/web/public/. public/
fi
