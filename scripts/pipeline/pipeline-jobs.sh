#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/avoimempi-eduskunta"
STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR:-/var/lib/avoimempi-eduskunta-pipeline/data}"
DB_PATH="${DB_PATH:-/var/lib/avoimempi-eduskunta-pipeline/avoimempi-eduskunta.db}"
TRACE_DB_PATH="${TRACE_DB_PATH:-/var/lib/avoimempi-eduskunta-pipeline/avoimempi-eduskunta-trace.db}"
PIPELINE_BUILD_DIR="${APP_DIR}/dist/pipeline"
LOG_FILE="/var/log/avoimempi-eduskunta/pipeline-jobs.log"
LOCK_DIR="/var/lib/avoimempi-eduskunta-pipeline/locks"
SCRAPER_MAX_RUNTIME_SECONDS=1800
FETCH_COUNTS_CLI="${PIPELINE_BUILD_DIR}/scraper/fetch-counts-cli.js"

# DB + report activation constants (local — no rsync, same VM)
APP_DATA_DIR="/var/lib/avoimempi-eduskunta-app"
APP_SYNC_RELEASES_DIR="${APP_DATA_DIR}/releases"
APP_SYNC_CURRENT_LINK="${APP_DATA_DIR}/current.db"
APP_SYNC_CURRENT_TRACE_LINK="${APP_DATA_DIR}/current-trace.db"
APP_CHANGES_REPORT_DEST="${APP_DATA_DIR}/metadata/changes-report.json"
APP_SYNC_KEEP_RELEASES=5
APP_READY_URL="http://127.0.0.1/api/ready"
APP_READY_RETRIES=60
APP_READY_SLEEP_SECONDS=1
RESTART_APP_SCRIPT="${APP_DIR}/scripts/app/restart-app.sh"

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

activate_on_app() {
  local db_path="$1"
  local release_id dest

  if [[ ! -f "${db_path}" ]]; then
    echo "Error: DB artifact not found at '${db_path}'" >&2
    return 1
  fi

  release_id="$(date -u +"%Y%m%dT%H%M%SZ")"
  dest="${APP_SYNC_RELEASES_DIR}/avoimempi-eduskunta-${release_id}.db"

  echo "Copying DB to ${dest}..."
  mkdir -p "${APP_SYNC_RELEASES_DIR}"
  cp "${db_path}" "${dest}"
  chmod 644 "${dest}"

  echo "Activating release (${APP_SYNC_CURRENT_LINK} -> ${dest})..."
  ln -sfn "${dest}" "${APP_SYNC_CURRENT_LINK}"

  if [[ -f "${TRACE_DB_PATH}" ]]; then
    local trace_dest="${APP_SYNC_RELEASES_DIR}/avoimempi-eduskunta-trace-${release_id}.db"
    echo "Copying trace DB to ${trace_dest}..."
    cp "${TRACE_DB_PATH}" "${trace_dest}"
    chmod 644 "${trace_dest}"
    echo "Activating trace release (${APP_SYNC_CURRENT_TRACE_LINK} -> ${trace_dest})..."
    ln -sfn "${trace_dest}" "${APP_SYNC_CURRENT_TRACE_LINK}"
  else
    echo "No trace DB found at ${TRACE_DB_PATH}; skipping."
  fi

  # Prune old releases
  ls -1t "${APP_SYNC_RELEASES_DIR}"/avoimempi-eduskunta-*.db 2>/dev/null \
    | tail -n +$((APP_SYNC_KEEP_RELEASES + 1)) | xargs -r rm -f --

  # Copy changes report so the app process can serve it.
  local report_src="${STORAGE_LOCAL_DIR}/metadata/changes-report.json"
  if [[ -f "${report_src}" ]]; then
    echo "Copying changes report to ${APP_CHANGES_REPORT_DEST}..."
    mkdir -p "$(dirname "${APP_CHANGES_REPORT_DEST}")"
    cp "${report_src}" "${APP_CHANGES_REPORT_DEST}"
    chmod 644 "${APP_CHANGES_REPORT_DEST}"
  else
    echo "No changes report found at ${report_src}; skipping."
  fi

  echo "Restarting app service..."
  sudo "${RESTART_APP_SCRIPT}"

  echo "Waiting for app to become ready..."
  local attempt=1
  while [[ "${attempt}" -le "${APP_READY_RETRIES}" ]]; do
    if curl -fsS "${APP_READY_URL}" >/dev/null 2>&1; then
      echo "App is ready."
      return 0
    fi
    sleep "${APP_READY_SLEEP_SECONDS}"
    attempt=$((attempt + 1))
  done
  echo "Readiness check failed at ${APP_READY_URL} after ${APP_READY_RETRIES} attempts" >&2
  return 1
}

fetch_counts() {
  require_bundle "${FETCH_COUNTS_CLI}"
  log "Fetching API table row counts"
  (cd "${APP_DIR}" && env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" \
    bun "${FETCH_COUNTS_CLI}" >> "${LOG_FILE}" 2>&1)
}

scrape_all() {
  local scraper_cli="${PIPELINE_BUILD_DIR}/scraper/cli.js"
  require_bundle "${scraper_cli}"
  log "Scraping all active tables (max runtime: ${SCRAPER_MAX_RUNTIME_SECONDS}s)"
  (cd "${APP_DIR}" && env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" \
    bun "${scraper_cli}" all --max-runtime "${SCRAPER_MAX_RUNTIME_SECONDS}" --skip-if-unchanged >> "${LOG_FILE}" 2>&1)
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
  (cd "${APP_DIR}" && env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" DB_PATH="${DB_PATH}" TRACE_DB_PATH="${TRACE_DB_PATH}" \
    bun "${migrator_cli}" >> "${LOG_FILE}" 2>&1)
  log "Activating new DB on app"
  activate_on_app "${DB_PATH}" >> "${LOG_FILE}" 2>&1
  log "Done"
}

full_cycle() {
  fetch_counts
  scrape_all
  parse_all
  migrate_and_sync
}

main() {
  case "${ACTION}" in
    fetch-counts) with_lock fetch_counts ;;
    scrape-all)   with_lock scrape_all ;;
    parse-all)    with_lock parse_all ;;
    migrate-sync) with_lock migrate_and_sync ;;
    full-cycle)   with_lock full_cycle ;;
    help|-h|--help)
      echo "Usage: $0 <fetch-counts|scrape-all|parse-all|migrate-sync|full-cycle>"
      ;;
    *)
      echo "Error: unknown action '${ACTION}'" >&2
      echo "Usage: $0 <fetch-counts|scrape-all|parse-all|migrate-sync|full-cycle>" >&2
      exit 1
      ;;
  esac
}

main "$@"
