#!/bin/sh
# Downloads a backup from B2 and restores it into a target database
# inside the running postgres container. By default restores into a
# scratch database (cstore_restore_test) so you can drill safely
# without touching production data.
#
# Usage:
#   ./postgres-restore.sh                        # latest → cstore_restore_test
#   ./postgres-restore.sh cstore-2026-01-15...gz # specific file
#   ./postgres-restore.sh latest cstore          # OVERWRITE production (careful)

set -eu

CSTORE_DIR="${CSTORE_DIR:-/opt/cstore}"
COMPOSE_FILE="${COMPOSE_FILE:-${CSTORE_DIR}/compose.yml}"
REMOTE="${REMOTE:-b2:cstore-backups/postgres}"
TMP_DIR="${TMP_DIR:-/tmp/cstore-restore}"

set -a
# shellcheck disable=SC1091
. "${CSTORE_DIR}/.env"
set +a

BACKUP_FILE="${1:-latest}"
TARGET_DB="${2:-cstore_restore_test}"

mkdir -p "$TMP_DIR"

if [ "$BACKUP_FILE" = "latest" ]; then
  echo "[restore] finding latest backup on ${REMOTE}…"
  BACKUP_FILE=$(rclone lsf "${REMOTE}/" | sort | tail -1)
  if [ -z "$BACKUP_FILE" ]; then
    echo "[restore] FATAL: no backups found at ${REMOTE}" >&2
    exit 1
  fi
fi

echo "[restore] downloading ${BACKUP_FILE}"
rclone copy "${REMOTE}/${BACKUP_FILE}" "$TMP_DIR/" --quiet

echo "[restore] (re)creating target database: ${TARGET_DB}"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 <<SQL
DROP DATABASE IF EXISTS ${TARGET_DB};
CREATE DATABASE ${TARGET_DB};
SQL

echo "[restore] loading dump → ${TARGET_DB}"
gunzip -c "${TMP_DIR}/${BACKUP_FILE}" \
  | docker compose -f "$COMPOSE_FILE" exec -T postgres \
    psql -U "$DB_USER" -d "${TARGET_DB}" -v ON_ERROR_STOP=1 \
  > /dev/null

echo "[restore] verifying — tables in ${TARGET_DB}:"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$DB_USER" -d "${TARGET_DB}" -c "\dt"

echo "[restore] done — backup is restorable into ${TARGET_DB}"