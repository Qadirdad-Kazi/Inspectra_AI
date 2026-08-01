# Inspectra AI — Data model catalog

Normalized PostgreSQL schema owned by `packages/db/prisma/schema.prisma`.
Initial migration: `packages/db/prisma/migrations/20260801000000_init_normalized_schema`.

## Entity relationship (logical)

```
User ──< AuthIdentity
User ──< Session
User ──< Membership >── Organization ── OrganizationSettings
Organization ──< Invitation
Organization ──< Workspace ──< Asset
Organization ──< Asset ── AssetCredential
Organization ──< Audit >── Asset
Audit ──< AuditStage
Audit ──< AuditEvent
Audit ──< Finding ──< FindingTriageEvent
Organization ──< FindingSuppression
Audit ──< Report ──< ReportArtifact
Organization ── BillingCustomer
Organization ──< Subscription
Organization ──< UsageRecord
Organization ──< Notification
User × Org ── NotificationPreference
Organization ──< ApiKey | Integration | WebhookEndpoint | JobRun
```

## Tables

| Table | Purpose | Key constraints |
|-------|---------|-----------------|
| `users` | Global identity | unique `email` |
| `auth_identities` | IdP subject link | unique `(provider, providerUserId)` |
| `sessions` | Server sessions | unique `tokenHash` |
| `organizations` | Tenant root | unique `slug` |
| `organization_settings` | 1:1 org config | PK = `organizationId` |
| `memberships` | RBAC | unique `(organizationId, userId)` |
| `invitations` | Pending invites | unique `tokenHash` |
| `workspaces` | Asset grouping | unique `(organizationId, slug)` |
| `assets` | Audit targets | unique `(organizationId, type, identifier)` |
| `asset_credentials` | Vault refs only | unique `assetId` |
| `audits` | Audit runs | FK asset Restrict; status enum |
| `audit_stages` | Pipeline stages | unique `(auditId, name)` |
| `audit_events` | Append-only log | indexed `(auditId, createdAt)` |
| `findings` | Normalized issues | unique `(auditId, fingerprint)` |
| `finding_triage_events` | Triage audit trail | FK finding |
| `finding_suppressions` | Org suppressions | indexed fingerprint |
| `reports` | Export jobs/artifacts | status + format enums |
| `report_artifacts` | Extra files | FK report |
| `billing_customers` | Stripe customer | unique org + stripe id |
| `subscriptions` | Plan state | unique stripe subscription |
| `usage_records` | Metered usage | unique `idempotencyKey` |
| `notifications` | Outbound/in-app | unique `(org, dedupeKey)` |
| `notification_preferences` | Per-user prefs | unique channel+event |
| `api_keys` | Machine auth | unique `keyHash` |
| `integrations` | Third-party links | unique `(org, type)` |
| `webhook_endpoints` | Egress webhooks | org scoped |
| `job_runs` | Background job ledger | typed queues |

## Cascade / delete policy

- Deleting an **organization** cascades to memberships, assets, audits, reports, billing, notifications, jobs.
- Deleting an **asset** is **restricted** while audits reference it (`onDelete: Restrict`).
- Workspace delete sets `workspaceId` null on assets/audits (`SetNull`).

## Migration

```bash
pnpm db:generate
pnpm --filter @inspectra/db migrate:deploy   # prod
pnpm db:migrate                              # dev
```
