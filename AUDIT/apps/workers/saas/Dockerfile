# @inspectra/worker-saas worker image scaffold
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY . .
RUN pnpm install --filter @inspectra/worker-saas... --frozen-lockfile || pnpm install --filter @inspectra/worker-saas...
RUN pnpm --filter @inspectra/worker-saas build
CMD ["node", "apps/workers/saas/dist/main.js"]
