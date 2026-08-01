#!/usr/bin/env bash
# Logical PostgreSQL backup for Inspectra.
# Usage:
#   ./infra/scripts/backup-postgres.sh
# Env:
#   DATABASE_URL or PG* vars
#   BACKUP_DIR (default ./backups)
#   RETENTION_DAYS (default 14)

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${BACKUP_DIR}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  OUT="${BACKUP_DIR}/inspectra-${STAMP}.dump"
  echo "[backup] dumping via DATABASE_URL → ${OUT}"
  pg_dump "${DATABASE_URL}" --format=custom --no-owner --no-acl --file="${OUT}"
else
  OUT="${BACKUP_DIR}/inspectra-${STAMP}.dump"
  echo "[backup] dumping via PGHOST/PGUSER → ${OUT}"
  pg_dump --format=custom --no-owner --no-acl --file="${OUT}"
fi

sha256sum "${OUT}" > "${OUT}.sha256"
echo "[backup] checksum written"

# Optional S3 upload
if [[ -n "${S3_BACKUP_URI:-}" ]]; then
  echo "[backup] uploading to ${S3_BACKUP_URI}"
  aws s3 cp "${OUT}" "${S3_BACKUP_URI}/$(basename "${OUT}")"
  aws s3 cp "${OUT}.sha256" "${S3_BACKUP_URI}/$(basename "${OUT}").sha256"
fi

find "${BACKUP_DIR}" -name 'inspectra-*.dump' -mtime "+${RETENTION_DAYS}" -delete || true
find "${BACKUP_DIR}" -name 'inspectra-*.dump.sha256' -mtime "+${RETENTION_DAYS}" -delete || true
echo "[backup] done (retention ${RETENTION_DAYS}d)"
