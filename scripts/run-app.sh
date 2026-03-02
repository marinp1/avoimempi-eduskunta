#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_RELEASE_DIR="${APP_RELEASE_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
APP_ROOT_DIR="${APP_ROOT_DIR:-$(cd "${APP_RELEASE_DIR}/.." && pwd)}"

NODE_ENV="${NODE_ENV:-production}"
DB_PATH="${DB_PATH:-/mnt/app-db/avoimempi-eduskunta.db}"
PORT="${PORT:-80}"
BUN_IDLE_TIMEOUT_SECONDS="${BUN_IDLE_TIMEOUT_SECONDS:-120}"
MIGRATION_LOCK_FILE="${MIGRATION_LOCK_FILE:-${APP_ROOT_DIR}/shared/migration.lock}"

if command -v bun >/dev/null 2>&1; then
  bun_bin="$(command -v bun)"
elif [[ -x "${HOME}/.bun/bin/bun" ]]; then
  bun_bin="${HOME}/.bun/bin/bun"
else
  echo "Error: Bun not found on server." >&2
  exit 1
fi

mkdir -p "${APP_ROOT_DIR}/shared"

exec env \
  NODE_ENV="${NODE_ENV}" \
  DB_PATH="${DB_PATH}" \
  PORT="${PORT}" \
  BUN_IDLE_TIMEOUT_SECONDS="${BUN_IDLE_TIMEOUT_SECONDS}" \
  MIGRATION_LOCK_FILE="${MIGRATION_LOCK_FILE}" \
  "${bun_bin}" run "${APP_RELEASE_DIR}/dist/index.js"
