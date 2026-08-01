# syntax=docker/dockerfile:1
# Hardened multi-stage builds — non-root, production NODE_ENV, minimal attack surface.

FROM node:25-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate \
  && apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS api-builder
COPY --from=deps /app /app
WORKDIR /app
ENV NODE_ENV=production
RUN pnpm --filter @inspectra/db generate \
  && pnpm --filter @inspectra/api... build

FROM node:25-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init \
  && addgroup -S inspectra && adduser -S inspectra -G inspectra
COPY --from=api-builder --chown=inspectra:inspectra /app /app
USER inspectra
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health/ready || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]

FROM base AS web-builder
COPY --from=deps /app /app
WORKDIR /app
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @inspectra/web... build

FROM node:25-alpine AS web
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init \
  && addgroup -S inspectra && adduser -S inspectra -G inspectra
COPY --from=web-builder --chown=inspectra:inspectra /app /app
USER inspectra
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["pnpm", "--filter", "@inspectra/web", "start"]
