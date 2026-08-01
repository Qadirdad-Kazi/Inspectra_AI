# @inspectra/worker-ios worker image scaffold
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY . .
RUN pnpm install --filter @inspectra/worker-ios... --frozen-lockfile || pnpm install --filter @inspectra/worker-ios...
RUN pnpm --filter @inspectra/worker-ios build
CMD ["node", "apps/workers/ios/dist/main.js"]
