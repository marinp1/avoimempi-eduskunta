#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
LOG_FILE="${LOG_FILE:-app.log}"
LOCK_FILE="${MIGRATION_LOCK_FILE:-${APP_DIR}/data/migration.lock}"

# Block-storage paths (pipeline VM defaults; override via env for local dev)
DB_PATH="${DB_PATH:-/mnt/pipeline-db/avoimempi-eduskunta.db}"
STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR:-/mnt/pipeline-raw-parsed/data}"
PIPELINE_BUILD_DIR="${PIPELINE_BUILD_DIR:-${APP_DIR}/dist/pipeline}"
MIGRATOR_CLI_PATH="${MIGRATOR_CLI_PATH:-${PIPELINE_BUILD_DIR}/migrator/cli.js}"

# Rsync target on app VM — set APP_VM_SYNC_HOST to enable post-migration sync.
# Format: user@hostname  (hostname resolves over the private network)
# Example: APP_VM_SYNC_HOST=root@avoimempi-eduskunta-app.pn-avoimempi-eduskunta.priv
APP_VM_SYNC_HOST="${APP_VM_SYNC_HOST:-}"
APP_SYNC_DEST="${APP_SYNC_DEST:-/mnt/app-db/avoimempi-eduskunta.db}"

export DB_PATH STORAGE_LOCAL_DIR

mkdir -p "$(dirname "${LOCK_FILE}")"
mkdir -p "$(dirname "${DB_PATH}")"

if [[ -f "${LOCK_FILE}" ]]; then
  echo "Migration lock exists at ${LOCK_FILE}; another rebuild may be running."
  exit 1
fi

cleanup() {
  rm -f "${LOCK_FILE}"
}
trap cleanup EXIT

cat > "${LOCK_FILE}" <<EOF
{"startedAt":"$(date -u +"%Y-%m-%dT%H:%M:%SZ")","pid":$$}
EOF

if command -v bun >/dev/null 2>&1; then
  bun_bin="$(command -v bun)"
elif [[ -x "${HOME}/.bun/bin/bun" ]]; then
  bun_bin="${HOME}/.bun/bin/bun"
else
  echo "Error: Bun not found on server." >&2
  exit 1
fi

echo "Starting DB rebuild..."
echo "  Lock file:    ${LOCK_FILE}"
echo "  Log file:     ${APP_DIR}/${LOG_FILE}"
echo "  DB path:      ${DB_PATH}"
echo "  Storage dir:  ${STORAGE_LOCAL_DIR}"
echo "  Migrator CLI: ${MIGRATOR_CLI_PATH}"

if [[ ! -f "${MIGRATOR_CLI_PATH}" ]]; then
  echo "Error: migrator bundle not found at ${MIGRATOR_CLI_PATH}" >&2
  echo "Deploy pipeline artifacts first (bun scripts/deploy.mts pipeline)." >&2
  exit 1
fi

(
  cd "${APP_DIR}"
  env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" DB_PATH="${DB_PATH}" \
    "${bun_bin}" "${MIGRATOR_CLI_PATH}" >> "${APP_DIR}/${LOG_FILE}" 2>&1
)

echo "DB rebuild completed."

if [[ -n "${APP_VM_SYNC_HOST}" ]]; then
  echo "Syncing DB to app VM (${APP_VM_SYNC_HOST}:${APP_SYNC_DEST})..."
  rsync -az --delay-updates "${DB_PATH}" "${APP_VM_SYNC_HOST}:${APP_SYNC_DEST}"
  echo "Sync complete."
else
  echo "APP_VM_SYNC_HOST not set; skipping DB sync to app VM."
fi
