# Production deployment playbook

## Change policy

- Prefer daytime deploy in primary region business hours
- Require green CI + staging soak ≥ 1 hour for risky changes
- Dual approval for `environment: production` in GitHub Environments
- Always take a DB backup before migrate

## Pre-flight checklist

- [ ] CI green on the release commit
- [ ] Staging deploy verified
- [ ] Migrations reviewed (expand/contract; no destructive drop without backfill)
- [ ] Feature flags / env diffs reviewed
- [ ] On-call notified; rollback owner named
- [ ] Backup job succeeds

## Deploy sequence

1. **Backup & verify checksum**
   ```bash
   export DATABASE_URL="$PROD_DATABASE_URL"
   export S3_BACKUP_URI="s3://inspectra-backups/postgres"
   ./infra/scripts/backup-postgres.sh
   ./infra/scripts/backup-objects.sh   # if artifact DR bucket configured
   ```

2. **Database migrate (expand phase)**
   ```bash
   DATABASE_URL="$PROD_DATABASE_URL" pnpm --filter @inspectra/db migrate:deploy
   ```

3. **Rolling deploy** (zero `maxUnavailable` in manifests)
   ```bash
   OWNER=your-org
   TAG=vX.Y.Z   # or short SHA
   kubectl set image deploy/api api=ghcr.io/$OWNER/inspectra-api:$TAG -n inspectra
   kubectl set image deploy/web web=ghcr.io/$OWNER/inspectra-web:$TAG -n inspectra
   kubectl rollout status deploy/api -n inspectra --timeout=8m
   kubectl rollout status deploy/web -n inspectra --timeout=8m
   ```

4. **Health & synthetic checks**
   ```bash
   curl -fsS https://api.example.com/health/ready
   # Auth login, start audit, generate report export, Slack test webhook (staging-like)
   ```

5. **Watch**
   - Prometheus: API CPU/memory, HPA events
   - `/metrics` scrape
   - Sentry error spike
   - Postgres connections / slow queries
   - Rate-limit counters

## Rollback steps (application)

Primary rollback is **previous Deployment revision** (images only):

```bash
kubectl rollout undo deploy/api -n inspectra
kubectl rollout undo deploy/web -n inspectra
kubectl rollout status deploy/api -n inspectra --timeout=8m
kubectl rollout status deploy/web -n inspectra --timeout=8m
curl -fsS https://api.example.com/health/ready
```

Pin a known-good tag explicitly if undo history is unclear:

```bash
kubectl set image deploy/api api=ghcr.io/$OWNER/inspectra-api:KNOWN_GOOD -n inspectra
kubectl set image deploy/web web=ghcr.io/$OWNER/inspectra-web:KNOWN_GOOD -n inspectra
```

## Rollback steps (database)

Only if migration is unsafe to leave applied:

1. Scale API to 0: `kubectl scale deploy/api --replicas=0 -n inspectra`
2. Restore:
   ```bash
   DATABASE_URL="$PROD_DATABASE_URL" ./infra/scripts/restore-postgres.sh ./backups/inspectra-PREDEPLOY.dump
   ```
3. Deploy known-good images; scale API back (`HPA` will adjust).
4. Incident review within 24h.

Prefer **forward fix** when data written under new schema cannot be discarded.

## Horizontal scaling notes

- API HPA: 2–10 replicas @ 70% CPU (`infra/k8s/api.yaml`)
- Web HPA: 2–6 replicas
- Stateless API — session refresh tokens in Postgres; JWT access tokens are bearer
- Redis/BullMQ workers scale independently when queue processors are enabled
- Edge nginx `least_conn` balances Docker Compose multi-replica API

## Disaster recovery (RPO/RTO targets)

| Tier | RPO | RTO | Mechanism |
|------|-----|-----|-----------|
| Postgres | ≤ 24h (aim 1h with continuous WAL later) | ≤ 4h | Nightly `pg_dump` + checksum to S3 |
| Object storage | ≤ 24h | ≤ 4h | Cross-bucket `aws s3 sync` |
| App platform | n/a | ≤ 1h | Redeploy images + config from git |

**DR drill (quarterly):** restore dump into isolated DB, boot API against it, run smoke, document gaps.

## Security reminders (prod)

- `ENABLE_SWAGGER=false`
- TLS only at ingress; HSTS enabled in API helmet when `NODE_ENV=production`
- Secrets via sealed-secrets / cloud KMS — never plaintext in git
- Restrict `/metrics` to private networks
- Rotate `JWT_SECRET` / API keys on incident
