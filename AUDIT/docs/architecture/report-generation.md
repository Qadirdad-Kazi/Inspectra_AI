# Report generation & platform automation

## Report engine

Package: `@inspectra/report-engine`

Builds a professional document from audit + AI intelligence payloads:

- Executive summary
- Category / module scores
- Prioritized recommendations with **effort estimates** (hours bands)
- Findings rollup
- Exporters: `json`, `html`, `csv`, `sarif`, `pdf` (print-ready HTML)

```
POST /v1/organizations/:orgId/reports
{ "auditId", "format", "title?" }

GET  .../reports/preview/:auditId
GET  .../reports/:id/content
```

Generation uses `WorkflowLoggerService.withRetry` (3 attempts, exponential backoff) and persists `Report` + `ReportArtifact` + `workflow_logs`.

## Dashboard analytics

```
GET /v1/organizations/:orgId/analytics/dashboard
GET /v1/organizations/:orgId/analytics/workflow-logs
```

90-day score trend, status totals, findings by severity.

## Scheduled audits

Prisma `AuditSchedule` + `POST .../schedules` / `.../run` / `.../dispatch/due`.

## Integrations

- **Slack** — webhook notify/test
- **Jira** — create issue with retries

```
PUT  /v1/organizations/:orgId/integrations
POST .../integrations/:type/test
POST .../integrations/jira/issues
```

## API management

```
GET|POST /v1/organizations/:orgId/api-keys
DELETE   .../api-keys/:id
```

Keys use `ink_` prefix; hashed with `hashToken` (same as auth guard).

## Collaboration

```
GET|POST /v1/organizations/:orgId/audits/:auditId/comments
```

## UI

Dashboard · Reports · Automation · Integrations · API keys · audit comments.
