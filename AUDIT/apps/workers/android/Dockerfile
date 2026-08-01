# @inspectra/worker-android worker image scaffold
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY . .
RUN pnpm install --filter @inspectra/worker-android... --frozen-lockfile || pnpm install --filter @inspectra/worker-android...
RUN pnpm --filter @inspectra/worker-android build
CMD ["node", "apps/workers/android/dist/main.js"]
