# Staging deployment playbook

## Prerequisites

- GHCR images built by [CD workflow](../../.github/workflows/cd.yml)
- Kubernetes context for staging cluster
- Secrets populated (`inspectra-secrets`) — never commit real values
- DNS: `staging-app.example.com`, `staging-api.example.com`

## Deploy

1. **Freeze window** — announce in #eng-deploy; pause non-urgent merges.
2. **Backup** (pre-deploy):
   ```bash
   export DATABASE_URL="$STAGING_DATABASE_URL"
   ./infra/scripts/backup-postgres.sh
   ```
3. **Migrate**:
   ```bash
   DATABASE_URL="$STAGING_DATABASE_URL" pnpm --filter @inspectra/db migrate:deploy
   ```
4. **Roll out** (set image tag `TAG`):
   ```bash
   OWNER=your-org
   kubectl set image deploy/api api=ghcr.io/$OWNER/inspectra-api:$TAG -n inspectra
   kubectl set image deploy/web web=ghcr.io/$OWNER/inspectra-web:$TAG -n inspectra
   kubectl rollout status deploy/api -n inspectra --timeout=5m
   kubectl rollout status deploy/web -n inspectra --timeout=5m
   ```
5. **Smoke**
   ```bash
   curl -fsS https://staging-api.example.com/health/ready
   curl -fsS https://staging-api.example.com/metrics | head
   # Sign-in → create website audit → open report builder
   ```
6. **Observe** 15–30 minutes: error rate, p95 latency, rate-limit 429s, workflow logs.

## Rollback

If smoke fails or error budget burns:

```bash
kubectl rollout undo deploy/api -n inspectra
kubectl rollout undo deploy/web -n inspectra
kubectl rollout status deploy/api -n inspectra --timeout=5m
kubectl rollout status deploy/web -n inspectra --timeout=5m
curl -fsS https://staging-api.example.com/health/ready
```

If a bad migration shipped (rare — prefer expand/contract):

1. Stop API traffic (scale api to 0 or deny ingress).
2. Restore DB from the pre-deploy dump:
   ```bash
   DATABASE_URL="$STAGING_DATABASE_URL" ./infra/scripts/restore-postgres.sh ./backups/inspectra-TIMESTAMP.dump
   ```
3. Redeploy previous image tag.
4. Re-run smoke.

## Post-deploy

- Tag the release in Linear/GitHub with staging notes
- Confirm Sentry/OTEL ingest (if configured)
- Unfreeze merges
