#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
PID_FILE="${PID_FILE:-app.pid}"
LOG_FILE="${LOG_FILE:-app.log}"
NODE_ENV="${NODE_ENV:-production}"
DIST_DIR="${APP_DIR}/dist"
INDEX_FILE="${DIST_DIR}/index.js"
LOCK_FILE="${MIGRATION_LOCK_FILE:-${APP_DIR}/data/migration.lock}"
ACTION="${1:-start}"

run_rebuild() {
  MIGRATION_LOCK_FILE="${LOCK_FILE}" APP_DIR="${APP_DIR}" LOG_FILE="${LOG_FILE}" \
    "${SCRIPT_DIR}/rebuild-db.sh"
}

if [[ "${ACTION}" == "rebuild-db" ]]; then
  run_rebuild
  exit 0
fi

if [[ "${ACTION}" != "start" ]]; then
  echo "Usage: $0 [start|rebuild-db]" >&2
  exit 1
fi

echo "Starting app from '${DIST_DIR}'..."

if [[ ! -f "${INDEX_FILE}" ]]; then
  echo "Error: entry file not found at ${INDEX_FILE}" >&2
  exit 1
fi

if [[ -f "${APP_DIR}/${PID_FILE}" ]]; then
  existing_pid="$(cat "${APP_DIR}/${PID_FILE}" || true)"
  if [[ -n "${existing_pid}" ]] && kill -0 "${existing_pid}" 2>/dev/null; then
    echo "Application is already running (PID ${existing_pid})."
    echo "Log file: ${APP_DIR}/${LOG_FILE}"
    exit 0
  fi
  rm -f "${APP_DIR}/${PID_FILE}"
fi

if command -v bun >/dev/null 2>&1; then
  bun_bin="$(command -v bun)"
elif [[ -x "${HOME}/.bun/bin/bun" ]]; then
  bun_bin="${HOME}/.bun/bin/bun"
else
  echo "Error: Bun not found on server." >&2
  exit 1
fi

(
  cd "${DIST_DIR}"
  nohup env NODE_ENV="${NODE_ENV}" MIGRATION_LOCK_FILE="${LOCK_FILE}" "${bun_bin}" run index.js >> "${APP_DIR}/${LOG_FILE}" 2>&1 &
  echo "$!" > "${APP_DIR}/${PID_FILE}"
)
new_pid="$(cat "${APP_DIR}/${PID_FILE}")"

sleep 1
if ! kill -0 "${new_pid}" 2>/dev/null; then
  echo "Error: application failed to start. Last logs:" >&2
  tail -n 50 "${APP_DIR}/${LOG_FILE}" >&2 || true
  exit 1
fi

echo "Application started."
echo "PID: ${new_pid}"
echo "Log: ${APP_DIR}/${LOG_FILE}"
