#!/usr/bin/env bash
# Build Next.js web app for Vercel when Root Directory is the monorepo root (.).
# Keep artifacts in apps/web/.next and symlink to repo-root .next so Vercel can find
# routes-manifest without breaking NFT / SWC traces (copy breaks those).
set -euo pipefail

pnpm --filter @inspectra/web... build

if [ ! -f apps/web/.next/routes-manifest.json ]; then
  echo "ERROR: apps/web/.next/routes-manifest.json missing after build" >&2
  ls -la apps/web/.next 2>/dev/null || true
  exit 1
fi

rm -rf .next
ln -sfn apps/web/.next .next

mkdir -p public
if [ -d apps/web/public ]; then
  cp -R apps/web/public/. public/
fi

echo "Linked $(pwd)/.next -> $(pwd)/apps/web/.next"
test -f .next/routes-manifest.json
