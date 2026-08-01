# Backup & disaster recovery

## What we protect

1. **PostgreSQL** — source of truth (users, orgs, audits, findings, billing refs)
2. **Object storage** — report artifacts / uploads (MinIO or S3)
3. **Git** — app config & K8s manifests (not a data backup)

## Daily Postgres backup

Cron example (UTC 02:15):

```cron
15 2 * * * cd /opt/inspectra && DATABASE_URL=... S3_BACKUP_URI=s3://inspectra-backups/postgres ./infra/scripts/backup-postgres.sh >> /var/log/inspectra-backup.log 2>&1
```

Script: `infra/scripts/backup-postgres.sh`  
Produces `inspectra-TIMESTAMP.dump` + `.sha256`, optional S3 upload, retention purge.

## Object storage

```bash
S3_BACKUP_SRC=s3://inspectra-artifacts \
S3_BACKUP_DST=s3://inspectra-artifacts-dr \
./infra/scripts/backup-objects.sh
```

Enable **versioning** and **object lock** (compliance mode) on the DR bucket when available.

## Restore procedure

1. Provision empty Postgres (or wipe target carefully).
2. `./infra/scripts/restore-postgres.sh path/to.dump`
3. Point `DATABASE_URL` at restored instance.
4. Deploy known-good app images.
5. `GET /health/ready` and synthetic login/audit.

## Continuous improvement

- Add WAL archiving (PgBackRest / cloud PITR) for sub-hour RPO
- Encrypt backups with KMS CMK
- Alert if backup job misses SLA (no object younger than 26h in bucket)
