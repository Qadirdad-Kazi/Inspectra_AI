# Inspectra AI

Multi-target audit platform monorepo (websites, Android, iOS, Microsoft Store, APIs, extensions, SaaS).

## Stack

- **Apps:** Next.js (`web`), NestJS (`api`), Temporal orchestrator, AI service, target workers
- **Packages:** Prisma DB, audit contracts, UI, SDK, policy, redaction, config, logger
- **Tooling:** pnpm workspaces, Turborepo, ESLint, Prettier, Vitest, Docker Compose, GitHub Actions

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Postgres, Redis, MinIO, Temporal)

## Quick start

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
pnpm install
docker compose -f infra/docker/docker-compose.yml up -d postgres
pnpm db:generate
pnpm --filter @inspectra/db exec prisma db push
pnpm --filter @inspectra/api dev   # :4000
pnpm --filter @inspectra/web dev   # :3000
```

Promote a platform admin after signup:

```bash
DATABASE_URL=postgresql://inspectra:inspectra@localhost:5432/inspectra?schema=public \
  pnpm --filter @inspectra/db exec tsx ../../tooling/scripts/promote-admin.ts you@example.com
```

| Service        | URL                      |
|----------------|--------------------------|
| Web            | http://localhost:3000    |
| API + Swagger  | http://localhost:4000/docs |
| API health     | http://localhost:4000/health |
| API ready      | http://localhost:4000/health/ready |
| API metrics    | http://localhost:4000/metrics |

## Ops & production

- [OWASP hardening](docs/security/owasp-hardening.md)
- [Observability](docs/architecture/observability.md)
- [Scalability](docs/architecture/scalability.md)
- [Staging deploy + rollback](docs/runbooks/staging-deploy.md)
- [Production deploy + rollback](docs/runbooks/production-deploy.md)
- [Backup & DR](docs/runbooks/backup-disaster-recovery.md)

```bash
# Local deps
docker compose -f infra/docker/docker-compose.yml up -d

# Prod-style stack (API + web + nginx edge)
docker compose -f infra/docker/docker-compose.yml \
  -f infra/docker/docker-compose.prod.yml up -d --build
```

## SaaS core (current)

Working today: auth, orgs/RBAC, audits (web + stores), AI intelligence, reports, automation, integrations, API keys, billing, admin.

## Scripts

| Command            | Description                |
|--------------------|----------------------------|
| `pnpm dev`         | Run all apps in parallel   |
| `pnpm build`       | Build all packages/apps    |
| `pnpm lint`        | Lint                       |
| `pnpm typecheck`   | TypeScript check           |
| `pnpm test`        | Unit tests                 |
| `pnpm db:migrate`  | Prisma migrate (dev)       |
| `pnpm format`      | Prettier write             |
