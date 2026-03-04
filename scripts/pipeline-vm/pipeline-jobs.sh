#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Deployment constants
APP_DIR="/opt/avoimempi-eduskunta"
STORAGE_LOCAL_DIR="/mnt/pipeline-raw-parsed/data"
DB_PATH="/var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db"
PIPELINE_BUILD_DIR="${APP_DIR}/dist/pipeline"
LOG_FILE="/var/log/avoimempi-eduskunta/pipeline-jobs.log"
LOCK_DIR="/var/lib/avoimempi-eduskunta/pipeline-locks"
SCRAPER_MAX_RUNTIME_SECONDS=1800

# DB sync constants (pipeline VM -> app VM)
APP_SYNC_CURRENT_LINK="/mnt/app-db/current.db"
APP_SYNC_RELEASES_DIR="/mnt/app-db/releases"
APP_VM_ACTIVATE_SERVICE="avoimempi-eduskunta-app*.service"
APP_SYNC_KEEP_RELEASES=5
APP_READY_URL="http://127.0.0.1/api/ready"
APP_READY_RETRIES=60
APP_READY_SLEEP_SECONDS=1

# APP_VM_SYNC_HOST is the only site-specific value — set it in shared/pipeline.env
ENV_FILE="${APP_DIR}/shared/pipeline.env"
APP_VM_SYNC_HOST=""
if [[ -f "${ENV_FILE}" ]]; then
  APP_VM_SYNC_HOST="$(grep -E '^APP_VM_SYNC_HOST=' "${ENV_FILE}" | head -1 | cut -d= -f2- | tr -d '"'"'" | xargs)"
fi

ACTION="${1:-help}"

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*" | tee -a "${LOG_FILE}"
}

require_bundle() {
  local path="$1"
  if [[ ! -f "${path}" ]]; then
    echo "Error: pipeline bundle not found: ${path}" >&2
    echo "Deploy first: bun scripts/deploy.mts pipeline" >&2
    exit 1
  fi
}

with_lock() {
  local lock_path="${LOCK_DIR}/pipeline.lock"
  mkdir -p "${LOCK_DIR}"
  if ! mkdir "${lock_path}" 2>/dev/null; then
    log "Another pipeline job is running; skipping ${ACTION}."
    exit 0
  fi
  trap "rm -rf '${lock_path}'" EXIT
  "$@"
}

sync_db_to_app_vm() {
  local app_vm_sync_host="${1:-}"
  local db_path="${2:-}"
  local release_id remote_tmp remote_release

  if [[ -z "${app_vm_sync_host}" ]]; then
    echo "Error: APP_VM_SYNC_HOST must be set in ${ENV_FILE}" >&2
    return 1
  fi

  if [[ -z "${db_path}" || ! -f "${db_path}" ]]; then
    echo "Error: DB artifact not found at '${db_path}'" >&2
    return 1
  fi

  release_id="$(date -u +"%Y%m%dT%H%M%SZ")"
  remote_tmp="${APP_SYNC_RELEASES_DIR}/.incoming-${release_id}.db"
  remote_release="${APP_SYNC_RELEASES_DIR}/avoimempi-eduskunta-${release_id}.db"

  echo "Uploading DB to ${app_vm_sync_host}:${remote_tmp}..."
  ssh "${app_vm_sync_host}" "mkdir -p '${APP_SYNC_RELEASES_DIR}'"
  rsync -az --delay-updates -- "${db_path}" "${app_vm_sync_host}:${remote_tmp}"

  echo "Activating release on app VM (${remote_release} -> ${APP_SYNC_CURRENT_LINK})..."
  ssh "${app_vm_sync_host}" \
    "REMOTE_TMP='${remote_tmp}' REMOTE_RELEASE='${remote_release}' CURRENT_LINK='${APP_SYNC_CURRENT_LINK}' KEEP_RELEASES='${APP_SYNC_KEEP_RELEASES}' ACTIVATE_SERVICE='${APP_VM_ACTIVATE_SERVICE}' READY_URL='${APP_READY_URL}' READY_RETRIES='${APP_READY_RETRIES}' READY_SLEEP_SECONDS='${APP_READY_SLEEP_SECONDS}' bash -s" <<'EOSH'
set -euo pipefail
mkdir -p "$(dirname "${REMOTE_RELEASE}")" "$(dirname "${CURRENT_LINK}")"
mv "${REMOTE_TMP}" "${REMOTE_RELEASE}"
chmod 644 "${REMOTE_RELEASE}"
ln -sfn "${REMOTE_RELEASE}" "${CURRENT_LINK}"
ls -1t "$(dirname "${REMOTE_RELEASE}")"/avoimempi-eduskunta-*.db 2>/dev/null \
  | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -f --
if [[ -n "${ACTIVATE_SERVICE}" ]]; then
  readarray -t _units < <(systemctl list-units --plain --no-legend --full --all "${ACTIVATE_SERVICE}" 2>/dev/null | awk '{print $1}')
  [[ ${#_units[@]} -gt 0 ]] && systemctl restart "${_units[@]}"
fi
attempt=1
while [[ "${attempt}" -le "${READY_RETRIES}" ]]; do
  if curl -fsS "${READY_URL}" >/dev/null 2>&1; then exit 0; fi
  sleep "${READY_SLEEP_SECONDS}"
  attempt=$((attempt + 1))
done
echo "Readiness check failed at ${READY_URL} after ${READY_RETRIES} attempts" >&2
exit 1
EOSH

  echo "Sync and activation complete."
}

scrape_all() {
  local scraper_cli="${PIPELINE_BUILD_DIR}/scraper/cli.js"
  require_bundle "${scraper_cli}"
  log "Scraping all active tables (max runtime: ${SCRAPER_MAX_RUNTIME_SECONDS}s)"
  (cd "${APP_DIR}" && env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" \
    bun "${scraper_cli}" all --max-runtime "${SCRAPER_MAX_RUNTIME_SECONDS}" >> "${LOG_FILE}" 2>&1)
}

parse_all() {
  local parser_cli="${PIPELINE_BUILD_DIR}/parser/cli.js"
  require_bundle "${parser_cli}"
  log "Parsing all tables"
  (cd "${APP_DIR}" && env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" \
    bun "${parser_cli}" all >> "${LOG_FILE}" 2>&1)
}

migrate_and_sync() {
  local migrator_cli="${PIPELINE_BUILD_DIR}/migrator/cli.js"
  require_bundle "${migrator_cli}"
  mkdir -p "$(dirname "${DB_PATH}")"
  log "Running migration"
  (cd "${APP_DIR}" && env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" DB_PATH="${DB_PATH}" \
    bun "${migrator_cli}" >> "${LOG_FILE}" 2>&1)
  log "Syncing DB to app VM"
  sync_db_to_app_vm "${APP_VM_SYNC_HOST}" "${DB_PATH}" >> "${LOG_FILE}" 2>&1
  log "Done"
}

full_cycle() {
  scrape_all
  parse_all
  migrate_and_sync
}

main() {
  mkdir -p "$(dirname "${LOG_FILE}")"

  case "${ACTION}" in
    scrape-all)   with_lock scrape_all ;;
    parse-all)    with_lock parse_all ;;
    migrate-sync) with_lock migrate_and_sync ;;
    full-cycle)   with_lock full_cycle ;;
    help|-h|--help)
      echo "Usage: $0 <scrape-all|parse-all|migrate-sync|full-cycle>"
      echo "Config: ${ENV_FILE} (set APP_VM_SYNC_HOST)"
      ;;
    *)
      echo "Error: unknown action '${ACTION}'" >&2
      echo "Usage: $0 <scrape-all|parse-all|migrate-sync|full-cycle>" >&2
      exit 1
      ;;
  esac
}

main "$@"
