# @inspectra/worker-extension worker image scaffold
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY . .
RUN pnpm install --filter @inspectra/worker-extension... --frozen-lockfile || pnpm install --filter @inspectra/worker-extension...
RUN pnpm --filter @inspectra/worker-extension build
CMD ["node", "apps/workers/extension/dist/main.js"]
