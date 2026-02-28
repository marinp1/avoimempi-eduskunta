#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
LOG_FILE="${LOG_FILE:-app.log}"
LOCK_FILE="${MIGRATION_LOCK_FILE:-${APP_DIR}/data/migration.lock}"

mkdir -p "$(dirname "${LOCK_FILE}")"

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
echo "Lock file: ${LOCK_FILE}"
echo "Log file: ${APP_DIR}/${LOG_FILE}"

(
  cd "${APP_DIR}"
  "${bun_bin}" run migrate >> "${APP_DIR}/${LOG_FILE}" 2>&1
)

echo "DB rebuild completed."
