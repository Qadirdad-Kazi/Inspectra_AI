# Inspectra AI — REST API Specification (v0.1)

Base URL: `/v1`  
Interactive docs (when API running): `GET /docs`  
Auth: `Authorization: Bearer <access_token>` or API key `Bearer ink_…`  
Org context: path param `:organizationId` and/or header `x-organization-id`  
Contract testing role header: `x-role: owner|admin|analyst|viewer`

Error envelope:

```json
{ "statusCode": 401, "code": "UNAUTHENTICATED", "message": "…" }
```

---

## Security layers

| Layer | Mechanism |
|-------|-----------|
| Transport | TLS at edge (prod) |
| Authentication | `AuthGuard` — Bearer session or API key |
| Authorization | `RolesGuard` + `@Roles(...)` minimum rank |
| Validation | Global `ValidationPipe` (whitelist, forbid unknown) |
| Tenancy | All org resources scoped by `organizationId` (RLS later) |
| Webhooks | Stripe signature on raw body (`POST /v1/webhooks/stripe`) |

Role rank: `viewer < analyst < admin < owner`

---

## Auth

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/auth/signup` | public | `SignUpDto` | `AuthSessionResponseDto` |
| POST | `/auth/signin` | public | `SignInDto` | `AuthSessionResponseDto` |
| POST | `/auth/refresh` | public | `RefreshSessionDto` | `AuthSessionResponseDto` |
| POST | `/auth/signout` | bearer | — | `{ ok: true }` |
| GET | `/auth/me` | bearer | — | user profile |
| POST | `/auth/invitations/accept` | bearer | `ExchangeInvitationDto` | membership |

### SignUpDto
- `email` string email
- `name` string
- `password?` string min 12
- `organizationName?` string

### AuthSessionResponseDto
- `user`: `{ id, email, name? }`
- `tokens`: `{ accessToken, refreshToken, expiresIn, tokenType: "Bearer" }`

---

## Organizations

| Method | Path | Min role | Body / query | Response |
|--------|------|----------|--------------|----------|
| POST | `/organizations` | auth | `CreateOrganizationDto` | org |
| GET | `/organizations` | auth | pagination | paginated orgs |
| GET | `/organizations/:organizationId` | viewer | — | org |
| PATCH | `/organizations/:organizationId` | admin | `UpdateOrganizationDto` | org |
| PATCH | `/organizations/:organizationId/settings` | admin | `UpdateOrganizationSettingsDto` | settings |
| GET | `/organizations/:organizationId/members` | viewer | pagination | members |
| POST | `/organizations/:organizationId/invitations` | admin | `InviteMemberDto` | invitation |
| PATCH | `/organizations/:organizationId/members/:membershipId` | admin | `UpdateMemberRoleDto` | membership |
| DELETE | `/organizations/:organizationId/members/:membershipId` | admin | — | `{ ok: true }` |
| POST | `/organizations/:organizationId/workspaces` | admin | `CreateWorkspaceDto` | workspace |
| GET | `/organizations/:organizationId/workspaces` | viewer | pagination | workspaces |

### CreateOrganizationDto
- `name`, `slug` (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), `region?`

### InviteMemberDto
- `email`, `role` enum owner|admin|analyst|viewer

---

## Audits (assets, runs, findings)

Prefix: `/organizations/:organizationId`

| Method | Path | Min role | Notes |
|--------|------|----------|-------|
| POST | `/assets` | analyst | `CreateAssetDto` |
| GET | `/assets` | viewer | paginated |
| GET | `/assets/:assetId` | viewer | |
| POST | `/audits` | analyst | creates audit + enqueues `run_audit` job |
| GET | `/audits` | viewer | filter `status`, `assetId`, `workspaceId` |
| GET | `/audits/:auditId` | viewer | |
| POST | `/audits/:auditId/cancel` | analyst | |
| GET | `/audits/:auditId/stages` | viewer | |
| GET | `/audits/:auditId/events` | viewer | |
| GET | `/audits/:auditId/findings` | viewer | filter severity/triage |
| PATCH | `/audits/:auditId/findings/:findingId/triage` | analyst | `UpdateFindingTriageDto` |
| POST | `/suppressions` | admin | `CreateSuppressionDto` |

### CreateAssetDto
- `type` enum web|android|ios|msstore|api|extension|saas
- `name`, `identifier`, `workspaceId?`, `environment?`, `metadata?`

### CreateAuditDto
- `assetId`, `workspaceId?`, `config?` (`profile`, `includeChecks`, `excludeChecks`, `options`)

### AuditResponseDto
- `id`, `organizationId`, `assetId`, `status`, `config`, `workflowId?`, `startedAt?`, `finishedAt?`, `createdAt`

### UpdateFindingTriageDto
- `triageStatus` enum open|confirmed|false_positive|accepted_risk|fixed
- `note?`

---

## Reports

Prefix: `/organizations/:organizationId/reports`

| Method | Path | Min role | Notes |
|--------|------|----------|-------|
| POST | `/` | analyst | `CreateReportDto` → enqueues `generate_report` |
| GET | `/` | viewer | filter status/auditId |
| GET | `/:reportId` | viewer | |
| GET | `/:reportId/download` | viewer | signed URL |

### CreateReportDto
- `auditId`, `format` pdf|sarif|json|csv|html, `title?`

### ReportResponseDto
- `id`, `auditId`, `format`, `status`, `title`, `downloadUrl?`, `readyAt?`, `createdAt`

---

## Billing

| Method | Path | Min role | Notes |
|--------|------|----------|-------|
| GET | `/organizations/:organizationId/billing/subscription` | admin | |
| GET | `/organizations/:organizationId/billing/entitlements` | viewer | |
| POST | `/organizations/:organizationId/billing/checkout-session` | owner | Stripe Checkout |
| POST | `/organizations/:organizationId/billing/portal-session` | owner | Customer portal |
| GET | `/organizations/:organizationId/billing/usage` | admin | paginated meters |
| GET | `/organizations/:organizationId/billing/usage/summary` | admin | |
| POST | `/webhooks/stripe` | public | Stripe signature |

### EntitlementsResponseDto
- `plan`, `seatsIncluded`, `auditMinutesIncluded`, `aiTriageEnabled`, `maxConcurrentAudits`

---

## Notifications

Prefix: `/organizations/:organizationId/notifications`

| Method | Path | Min role | Notes |
|--------|------|----------|-------|
| GET | `/` | viewer | in-app inbox |
| POST | `/read` | viewer | `MarkReadDto` |
| GET | `/preferences` | viewer | |
| PATCH | `/preferences` | viewer | upsert channel+event |

---

## Background jobs

Queues (BullMQ / Redis):

| Queue | Job name | Triggered by | Processor |
|-------|----------|--------------|-----------|
| `audits` | `run_audit` | `POST …/audits` | `AuditsProcessor` |
| `reports` | `generate_report` | `POST …/reports` | `ReportsProcessor` |
| `notifications` | `send_notification` | notification enqueue | `NotificationsProcessor` |
| `billing` | `sync_billing` | Stripe webhook / cron | reserved |

Ledger table: `job_runs` (type, status, attempts, externalJobId, auditId/reportId).

Job payload contracts: `EnqueueAuditJobInput`, `EnqueueReportJobInput`, `EnqueueNotificationJobInput` in `apps/api/src/modules/jobs/dto/job.dto.ts`.

---

## Pagination

Query: `page` (default 1), `pageSize` (default 20, max 100)

Response:

```json
{
  "data": [ /* items */ ],
  "meta": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 1 }
}
```

---

## Module map

```
apps/api/src/modules/
  auth/            DTOs + session/IdP contracts
  organizations/   orgs, members, invites, workspaces
  audits/          assets, audits, findings, suppressions
  reports/         report generation + download
  billing/         Stripe checkout/portal/usage/webhooks
  notifications/   inbox + preferences + enqueue
  jobs/            BullMQ producers + processors
```

DTO sources of truth live beside each module under `dto/`.
Services currently throw `NotImplementedException` except job enqueue helpers — intentional contract phase.
