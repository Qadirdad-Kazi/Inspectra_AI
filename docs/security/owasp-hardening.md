# OWASP-aligned security hardening

Mapped to OWASP Top 10 themes and ASVS-minded controls implemented in Inspectra.

| OWASP theme | Control in Inspectra |
|---|---|
| **A01 Broken access control** | JWT + API key auth; RBAC `RolesGuard`; org-scoped queries; platform admin gate |
| **A02 Cryptographic failures** | bcrypt passwords; SHA-256 token hashes; TLS at edge; HSTS in production |
| **A03 Injection** | Prisma parameterized queries; Nest `ValidationPipe` whitelist + forbid unknown |
| **A04 Insecure design** | Modular audit engines; feature flags; no secrets in logs (`@inspectra/redaction`) |
| **A05 Security misconfiguration** | Helmet headers; Swagger off in prod; non-root containers; NetworkPolicies |
| **A07 Auth failures** | Auth rate limits; session rotation; refresh token hash storage; OAuth redirect allowlist + tokens in URL fragment |
| **A08 Integrity failures** | CI image scans (Trivy); Dependabot; checksummed DB backups; `pnpm audit` hard-fail on high+ |
| **A09 Logging/monitoring** | JSON access logs + request IDs; gated `/metrics` (`METRICS_BEARER_TOKEN`); workflow_logs; Sentry DSN hook |
| **A10 SSRF** | `assertPublicHttpUrl` on crawl targets + redirect hops; private/link-local/metadata blocked; same-origin crawl |

## HTTP hardening (API)

- `helmet` — CSP (prod), `X-Content-Type-Options`, `Referrer-Policy`, `frameAncestors 'none'`, HSTS
- CORS allowlist from `WEB_URL`
- Global + auth-specific `express-rate-limit`
- `trust proxy` for correct client IP behind nginx/ingress
- Request ID correlation (`X-Request-Id`)
- Production refuses weak/missing `AUTH_SECRET` / `JWT_SECRET`
- API key scopes map to RBAC roles; optional `@Scopes()` enforcement

## Container / K8s

- Non-root user, `dumb-init`, dropped capabilities
- Readiness vs liveness probes
- HPA + PDB for safe rollouts
- Ingress TLS + rate annotations
- Default-deny NetworkPolicy (allow ingress-nginx)

## Operational checklist before go-live

- [ ] Rotate all default compose passwords
- [ ] `AUTH_SECRET` / `JWT_SECRET` ≥ 32 random bytes (API refuses to boot otherwise in production)
- [ ] Set `METRICS_BEARER_TOKEN` (or `METRICS_ALLOW_PUBLIC=true` only behind private scrape)
- [ ] Enable Sentry/OTEL exporters
- [ ] Confirm backup cron + restore drill
- [ ] Pen-test auth, IDOR on `organizationId`, OAuth redirects, crawl SSRF
- [ ] Replace in-process `setImmediate` runners with shared queue before multi-replica scale-out
- [ ] Use Redis-backed rate limits when running HPA > 1 replica
- [ ] Wire CD to real `kubectl`/`helm` apply (workflow currently stubs deploy)