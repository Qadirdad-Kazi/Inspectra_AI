# @inspectra/worker-web worker image scaffold
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY . .
RUN pnpm install --filter @inspectra/worker-web... --frozen-lockfile || pnpm install --filter @inspectra/worker-web...
RUN pnpm --filter @inspectra/worker-web build
CMD ["node", "apps/workers/web/dist/main.js"]
