# Architecture overview

Inspectra AI is a multi-tenant SaaS for auditing websites, store apps, APIs, and related surfaces.

## Applications

| App | Role |
|-----|------|
| `apps/web` | Next.js control UI (auth, orgs, audits, reports, billing) |
| `apps/api` | NestJS control plane (REST, auth, billing webhooks, job enqueue) |
| `apps/orchestrator` | Temporal workflow stubs |
| `apps/ai-service` | AI plane HTTP (`/v1/intelligence`, remediation) |
| `apps/workers/*` | Per-target scanner workers |

## Packages

| Package | Role |
|---------|------|
| `@inspectra/db` | Prisma schema + client |
| `@inspectra/web-audit-engine` | Website crawl + modular engines (SSRF-hardened) |
| `@inspectra/store-audit-engine` | Play / App Store / MS Store observational audits |
| `@inspectra/ai-intelligence` | Specialist agents, memory, recommendations |
| `@inspectra/report-engine` | Professional report builder + exporters |
| `@inspectra/audit-contracts` | Shared DTOs / contracts |
| `@inspectra/sdk`, `ui`, `logger`, `config` | Shared client & ops utilities |

## Ops

See `docs/runbooks/` (staging/production), `docs/security/owasp-hardening.md`, and `docs/architecture/observability.md`.
