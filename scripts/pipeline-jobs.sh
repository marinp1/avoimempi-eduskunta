#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
LOG_FILE="${LOG_FILE:-${APP_DIR}/pipeline-jobs.log}"
LOCK_DIR="${LOCK_DIR:-${APP_DIR}/data/pipeline-locks}"
# shellcheck source=./lib/runtime.sh
source "${SCRIPT_DIR}/lib/runtime.sh"
# shellcheck source=./lib/app-db-sync.sh
source "${SCRIPT_DIR}/lib/app-db-sync.sh"

# Row-store location on the pipeline VM.
STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR:-/mnt/pipeline-raw-parsed/data}"
PIPELINE_BUILD_DIR="${PIPELINE_BUILD_DIR:-${APP_DIR}/dist/pipeline}"

# Build DB locally on pipeline root disk by default, then sync to app VM.
DB_PATH="${DB_PATH:-/var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db}"
APP_VM_SYNC_HOST="${APP_VM_SYNC_HOST:-}"
set_app_db_sync_defaults
SCRAPER_MAX_RUNTIME_SECONDS="${SCRAPER_MAX_RUNTIME_SECONDS:-1800}"

ACTION="${1:-help}"
DEFAULT_ACTIVE_TABLES="Attachment,AttachmentGroup,MemberOfParliament,SaliDBAanestys,SaliDBAanestysEdustaja,SaliDBIstunto,SaliDBKohta,SaliDBKohtaAanestys,SaliDBKohtaAsiakirja,SaliDBPuheenvuoro,SaliDBTiedote,SeatingOfParliament,VaskiData"
DEFAULT_OMITTED_TABLES="HetekaData,PrimaryKeys,SaliDBAanestysAsiakirja,SaliDBAanestysJakauma,SaliDBAanestysKieli,SaliDBMessageLog"

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*" | tee -a "${LOG_FILE}"
}

run_in_app_dir() {
  (
    cd "${APP_DIR}"
    "$@"
  )
}

require_bundle_entrypoint() {
  local entrypoint="$1"
  if [[ ! -f "${entrypoint}" ]]; then
    echo "Error: required pipeline bundle not found: ${entrypoint}" >&2
    echo "Deploy pipeline artifacts first (bun scripts/deploy.mts pipeline)." >&2
    exit 1
  fi
}

with_pipeline_lock() {
  local lock_path="${LOCK_DIR}/pipeline.lock"
  mkdir -p "${LOCK_DIR}"

  if ! mkdir "${lock_path}" 2>/dev/null; then
    log "Another pipeline job is running; skipping ${ACTION}."
    exit 0
  fi
  trap 'rm -rf "${lock_path}"' EXIT

  "$@"
}

scrape_all() {
  local bun_bin="$1"
  local table_list
  local omitted_list
  local start_epoch now_epoch
  local scraper_cli="${PIPELINE_BUILD_DIR}/scraper/cli.js"

  require_bundle_entrypoint "${scraper_cli}"

  if [[ -n "${ACTIVE_PIPELINE_TABLES:-}" ]]; then
    table_list="$(printf '%s\n' "${ACTIVE_PIPELINE_TABLES}" | tr ',' '\n')"
  else
    table_list="$(printf '%s\n' "${DEFAULT_ACTIVE_TABLES}" | tr ',' '\n')"
  fi

  if [[ -n "${OMITTED_PIPELINE_TABLES:-}" ]]; then
    omitted_list="$(printf '%s\n' "${OMITTED_PIPELINE_TABLES}" | tr ',' '\n')"
  else
    omitted_list="$(printf '%s\n' "${DEFAULT_OMITTED_TABLES}" | tr ',' '\n')"
  fi

  table_list="$(printf '%s\n' "${table_list}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  omitted_list="$(printf '%s\n' "${omitted_list}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

  # Always enforce omitted-table exclusion, even for ACTIVE_PIPELINE_TABLES overrides.
  if [[ -n "${omitted_list}" ]]; then
    table_list="$(
      awk '
        NR == FNR {
          if ($0 != "") omitted[$0] = 1;
          next;
        }
        !($0 in omitted)
      ' <(printf '%s\n' "${omitted_list}") <(printf '%s\n' "${table_list}")
    )"
  fi

  if [[ -z "${table_list}" ]]; then
    echo "Error: no active pipeline tables resolved." >&2
    exit 1
  fi

  start_epoch="$(date +%s)"

  while IFS= read -r table_name; do
    [[ -z "${table_name}" ]] && continue

    now_epoch="$(date +%s)"
    if (( now_epoch - start_epoch >= SCRAPER_MAX_RUNTIME_SECONDS )); then
      log "Scraper runtime cap (${SCRAPER_MAX_RUNTIME_SECONDS}s) reached; stopping this run."
      return 0
    fi

    log "Scraping table: ${table_name}"
    run_in_app_dir env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" "${bun_bin}" "${scraper_cli}" "${table_name}" >> "${LOG_FILE}" 2>&1
  done <<< "${table_list}"
}

parse_all() {
  local bun_bin="$1"
  local parser_cli="${PIPELINE_BUILD_DIR}/parser/cli.js"
  require_bundle_entrypoint "${parser_cli}"
  log "Parsing all active tables"
  run_in_app_dir env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" "${bun_bin}" "${parser_cli}" all >> "${LOG_FILE}" 2>&1
}

migrate_and_sync() {
  local bun_bin="$1"
  local migrator_cli="${PIPELINE_BUILD_DIR}/migrator/cli.js"
  require_bundle_entrypoint "${migrator_cli}"

  mkdir -p "$(dirname "${DB_PATH}")"

  log "Running migration (DB_PATH=${DB_PATH})"
  run_in_app_dir env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" DB_PATH="${DB_PATH}" "${bun_bin}" "${migrator_cli}" >> "${LOG_FILE}" 2>&1

  if [[ -z "${APP_VM_SYNC_HOST}" ]]; then
    echo "Error: APP_VM_SYNC_HOST must be set for migrate-sync" >&2
    exit 1
  fi

  log "Syncing and activating DB release on app VM"
  sync_db_to_app_vm "${APP_VM_SYNC_HOST}" "${DB_PATH}" >> "${LOG_FILE}" 2>&1
  log "DB release activation complete"
}

full_cycle() {
  local bun_bin="$1"
  scrape_all "${bun_bin}"
  parse_all "${bun_bin}"
  migrate_and_sync "${bun_bin}"
}

print_help() {
  cat <<EOF
Usage: $0 <action>

Actions:
  scrape-all    Run scraper for all active pipeline tables
  parse-all     Run parser for all active pipeline tables
  migrate-sync  Run migrator using local DB_PATH, then rsync DB to app VM
  full-cycle    scrape-all -> parse-all -> migrate-sync

Environment:
  APP_DIR            Repo root (default: auto-detected)
  LOG_FILE           Log path (default: \${APP_DIR}/pipeline-jobs.log)
  STORAGE_LOCAL_DIR  Row-store dir (default: /mnt/pipeline-raw-parsed/data)
  PIPELINE_BUILD_DIR Built pipeline dir (default: \${APP_DIR}/dist/pipeline)
  ACTIVE_PIPELINE_TABLES Comma-separated active table list override for scrape-all
  OMITTED_PIPELINE_TABLES Comma-separated omitted table list (always filtered from active list)
  SCRAPER_MAX_RUNTIME_SECONDS Max scrape-all runtime before stopping (default: 1800)
  DB_PATH            Local migration DB path (default: /var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db)
  APP_VM_SYNC_HOST   Required for migrate-sync (format: user@host)
  APP_SYNC_CURRENT_LINK Destination symlink path on app VM (default: /mnt/app-db/current.db)
  APP_SYNC_RELEASES_DIR Release directory on app VM (default: /mnt/app-db/releases)
  APP_VM_ACTIVATE_SERVICE App VM systemd service pattern restarted after activation (default: avoimempi-eduskunta-app*.service)
  APP_SYNC_KEEP_RELEASES Number of DB releases to keep on app VM (default: 5)
  APP_READY_URL      App readiness URL checked after activation (default: http://127.0.0.1/api/ready)
  APP_READY_RETRIES  Number of readiness retry attempts (default: 60)
  APP_READY_SLEEP_SECONDS Seconds between readiness attempts (default: 1)
EOF
}

main() {
  local bun_bin
  bun_bin="$(find_bun_binary)"
  mkdir -p "$(dirname "${LOG_FILE}")"

  case "${ACTION}" in
    scrape-all)
      with_pipeline_lock scrape_all "${bun_bin}"
      ;;
    parse-all)
      with_pipeline_lock parse_all "${bun_bin}"
      ;;
    migrate-sync)
      with_pipeline_lock migrate_and_sync "${bun_bin}"
      ;;
    full-cycle)
      with_pipeline_lock full_cycle "${bun_bin}"
      ;;
    help|-h|--help)
      print_help
      ;;
    *)
      echo "Error: unknown action '${ACTION}'" >&2
      print_help
      exit 1
      ;;
  esac
}

main "$@"
