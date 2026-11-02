#!/bin/sh
# Streams a pg_dump out of the running postgres container, gzips, and
# uploads to Backblaze B2 via rclone. Runs from cron on the host.
#
# Prereqs on the host:
#   - rclone configured with a remote named 'b2' (see README in this dir,
#     or run `rclone config`)
#   - the user running this script is in the `docker` group
#   - DB_USER and DB_NAME are present in .env at $CSTORE_DIR

set -eu

# ---- Config (override via env if your layout differs) ----------------
CSTORE_DIR="${CSTORE_DIR:-/opt/cstore}"
COMPOSE_FILE="${COMPOSE_FILE:-${CSTORE_DIR}/compose.yml}"
LOCAL_DIR="${LOCAL_DIR:-/var/backups/cstore}"
REMOTE="${REMOTE:-b2:cstore-backups/postgres}"
KEEP_DAYS="${KEEP_DAYS:-14}"

# ---- Load DB creds from the deploy's .env ----------------------------
set -a
# shellcheck disable=SC1091
. "${CSTORE_DIR}/.env"
set +a

TIMESTAMP=$(date -u +%Y-%m-%dT%H-%M-%SZ)
BACKUP_NAME="cstore-${TIMESTAMP}.sql.gz"

mkdir -p "$LOCAL_DIR"

echo "[backup] $(date -u +%FT%TZ) dumping postgres → ${BACKUP_NAME}"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --clean --if-exists \
  | gzip -9 > "${LOCAL_DIR}/${BACKUP_NAME}"

# Sanity check — refuse to upload empty/tiny dumps
SIZE=$(wc -c <"${LOCAL_DIR}/${BACKUP_NAME}")
if [ "$SIZE" -lt 1024 ]; then
  echo "[backup] FATAL: dump is suspiciously small (${SIZE} bytes) — aborting" >&2
  exit 1
fi

echo "[backup] uploading ${SIZE} bytes to ${REMOTE}"
rclone copy "${LOCAL_DIR}/${BACKUP_NAME}" "${REMOTE}/" --quiet

echo "[backup] pruning local backups older than ${KEEP_DAYS} days"
find "$LOCAL_DIR" -name 'cstore-*.sql.gz' -mtime "+${KEEP_DAYS}" -delete

echo "[backup] pruning remote backups older than ${KEEP_DAYS} days"
rclone delete "${REMOTE}/" --min-age "${KEEP_DAYS}d" --quiet

echo "[backup] done"