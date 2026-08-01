# Production readiness — Prompt 10 audit

**Date:** 2026-08-01  
**Scope:** Feature-complete Inspectra AI platform — security, architecture, performance polish only (no new product features).

## Verdict

**Conditionally ready for limited staging / private beta.** Critical auth and SSRF issues addressed in this pass. Multi-replica production still blocked on shared job queue + distributed rate limiting (P0 architecture). CD deploy remains a stub (P0 ops).

| Area | Status |
|------|--------|
| Auth / OAuth / JWT | Hardened this pass |
| SSRF crawl surface | Hardened this pass |
| RBAC + API key scopes | Hardened this pass |
| Tenant schedule isolation | Hardened this pass |
| Metrics exposure | Gated this pass |
| Job execution under HPA | Not ready (in-process) |
| Rate limits under HPA | Not ready (in-memory) |
| CD pipeline | Not ready (echo-only) |

## Fixed in this pass (P0/P1 quick wins)

1. OAuth open-redirect closed — `state` allowlisted to `WEB_URL`; tokens moved to URL **hash** fragment.
2. Production JWT fail-fast — weak/missing `AUTH_SECRET`/`JWT_SECRET` aborts boot; `abortOnError: true` in prod.
3. API key scopes → effective role; `@Scopes()` metadata supported in `RolesGuard`.
4. Schedule `runDue` scoped to `organizationId` (no cross-tenant dispatch).
5. SSRF guards on website URL normalize + crawler redirect hops (`assertPublicHttpUrl`).
6. `/metrics` gated via `METRICS_BEARER_TOKEN` (or explicit `METRICS_ALLOW_PUBLIC`).
7. List endpoints capped (`take`) for schedules, comments, API keys, integrations.
8. Report enqueue failures logged (no silent swallow).
9. CI `pnpm audit` hard-fails on high+.
10. Docs refreshed (`overview`, OWASP hardening).

## Remaining prioritized roadmap

### P0 — before public production

| # | Item | Why |
|---|------|-----|
| 1 | Migrate audit/report runners from `setImmediate` to Redis/BullMQ (or Temporal) | Multi-replica HPA duplicates/drops work |
| 2 | Redis-backed (or gateway) rate limits | In-memory limits ineffective under HPA |
| 3 | Implement real CD apply (`kubectl`/`helm`) | Current workflow only echoes |
| 4 | External pen-test: OAuth, IDOR, SSRF, API keys | Validate hardening |

### P1 — launch week

| # | Item |
|---|------|
| 5 | Authenticate `ai-service` with mTLS or signed service tokens |
| 6 | Object storage for large report bodies (avoid Postgres bloat) |
| 7 | Cancel/abort mid-run without waiting for progress ticks |
| 8 | Staging restore drill from backup scripts |

### P2 — post-launch hardening

| # | Item |
|---|------|
| 9 | DNS rebinding protection (resolve + re-check IP after DNS) for crawler |
| 10 | Per-route `@Scopes()` on all mutating API-key paths |
| 11 | OpenTelemetry traces end-to-end (API → worker → AI) |
| 12 | Chaos / load test of schedule dispatch at org scale |

## Suggested go-live gate

Ship **private beta** after P0 items 1–3 land and a restore drill succeeds. Hold **public GA** until pen-test (item 4) and P1 service-auth for AI plane are complete.
