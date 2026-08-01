#!/usr/bin/env bash
# Restore PostgreSQL from a custom-format dump created by backup-postgres.sh
# Usage:
#   ./infra/scripts/restore-postgres.sh ./backups/inspectra-YYYYMMDD.dump
# DANGER: overwrites target database objects. Prefer restore into a fresh DB.

set -euo pipefail

DUMP="${1:-}"
if [[ -z "${DUMP}" || ! -f "${DUMP}" ]]; then
  echo "Usage: $0 <path-to.dump>" >&2
  exit 1
fi

if [[ -f "${DUMP}.sha256" ]]; then
  echo "[restore] verifying checksum"
  sha256sum -c "${DUMP}.sha256"
fi

TARGET_URL="${DATABASE_URL:?DATABASE_URL required}"
echo "[restore] restoring ${DUMP} → ${TARGET_URL}"
pg_restore --clean --if-exists --no-owner --no-acl --dbname="${TARGET_URL}" "${DUMP}"
echo "[restore] complete — run app health checks and smoke tests"
