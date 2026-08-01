# @inspectra/worker-msstore worker image scaffold
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY . .
RUN pnpm install --filter @inspectra/worker-msstore... --frozen-lockfile || pnpm install --filter @inspectra/worker-msstore...
RUN pnpm --filter @inspectra/worker-msstore build
CMD ["node", "apps/workers/msstore/dist/main.js"]
