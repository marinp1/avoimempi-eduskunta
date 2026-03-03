#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_RELEASE_DIR="${APP_RELEASE_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
APP_ROOT_DIR="${APP_ROOT_DIR:-$(cd "${APP_RELEASE_DIR}/.." && pwd)}"

NODE_ENV="${NODE_ENV:-production}"
DB_PATH="${DB_PATH:-/mnt/app-db/current.db}"
PORT="${PORT:-80}"
BUN_IDLE_TIMEOUT_SECONDS="${BUN_IDLE_TIMEOUT_SECONDS:-120}"
BUN_REUSE_PORT="${BUN_REUSE_PORT:-true}"
MIGRATION_LOCK_FILE="${MIGRATION_LOCK_FILE:-${APP_ROOT_DIR}/shared/migration.lock}"

mkdir -p "${APP_ROOT_DIR}/shared"

exec env \
  NODE_ENV="${NODE_ENV}" \
  DB_PATH="${DB_PATH}" \
  PORT="${PORT}" \
  BUN_IDLE_TIMEOUT_SECONDS="${BUN_IDLE_TIMEOUT_SECONDS}" \
  BUN_REUSE_PORT="${BUN_REUSE_PORT}" \
  MIGRATION_LOCK_FILE="${MIGRATION_LOCK_FILE}" \
  bun run "${APP_RELEASE_DIR}/dist/index.js"
