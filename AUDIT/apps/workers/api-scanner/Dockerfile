# @inspectra/worker-api-scanner worker image scaffold
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY . .
RUN pnpm install --filter @inspectra/worker-api-scanner... --frozen-lockfile || pnpm install --filter @inspectra/worker-api-scanner...
RUN pnpm --filter @inspectra/worker-api-scanner build
CMD ["node", "apps/workers/api-scanner/dist/main.js"]
