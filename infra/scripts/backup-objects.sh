#!/usr/bin/env bash
# MinIO / S3 artifact bucket sync (versioned backups).
set -euo pipefail

SRC="${S3_BACKUP_SRC:?set S3_BACKUP_SRC e.g. s3://inspectra-artifacts}"
DST="${S3_BACKUP_DST:?set S3_BACKUP_DST e.g. s3://inspectra-artifacts-dr}"

echo "[backup] syncing ${SRC} → ${DST}"
aws s3 sync "${SRC}" "${DST}" --only-show-errors
echo "[backup] object storage sync complete"
