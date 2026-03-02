#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
LOG_FILE="${LOG_FILE:-${APP_DIR}/pipeline-jobs.log}"
LOCK_DIR="${LOCK_DIR:-${APP_DIR}/data/pipeline-locks}"

# Row-store location on the pipeline VM.
STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR:-/mnt/pipeline-raw-parsed/data}"
PIPELINE_BUILD_DIR="${PIPELINE_BUILD_DIR:-${APP_DIR}/dist/pipeline}"

# Build DB locally on pipeline root disk by default, then sync to app VM.
DB_PATH="${DB_PATH:-/var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db}"
APP_VM_SYNC_HOST="${APP_VM_SYNC_HOST:-}"
APP_SYNC_DEST="${APP_SYNC_DEST:-/mnt/app-db/avoimempi-eduskunta.db}"
SCRAPER_MAX_RUNTIME_SECONDS="${SCRAPER_MAX_RUNTIME_SECONDS:-1800}"

ACTION="${1:-help}"
DEFAULT_ACTIVE_TABLES="Attachment,AttachmentGroup,MemberOfParliament,SaliDBAanestys,SaliDBAanestysEdustaja,SaliDBIstunto,SaliDBKohta,SaliDBKohtaAanestys,SaliDBKohtaAsiakirja,SaliDBPuheenvuoro,SaliDBTiedote,SeatingOfParliament,VaskiData"
DEFAULT_OMITTED_TABLES="HetekaData,PrimaryKeys,SaliDBAanestysAsiakirja,SaliDBAanestysJakauma,SaliDBAanestysKieli,SaliDBMessageLog"

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*" | tee -a "${LOG_FILE}"
}

find_bun() {
  if command -v bun >/dev/null 2>&1; then
    command -v bun
    return 0
  fi
  if [[ -x "${HOME}/.bun/bin/bun" ]]; then
    printf '%s\n' "${HOME}/.bun/bin/bun"
    return 0
  fi
  echo "Error: bun not found" >&2
  return 1
}

run_in_app_dir() {
  (
    cd "${APP_DIR}"
    "$@"
  )
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

  if [[ -n "${ACTIVE_PIPELINE_TABLES:-}" ]]; then
    table_list="$(printf '%s\n' "${ACTIVE_PIPELINE_TABLES}" | tr ',' '\n')"
  elif [[ -f "${APP_DIR}/packages/shared/constants/index.ts" ]]; then
    table_list="$(
      run_in_app_dir "${bun_bin}" -e \
        'import { ActivePipelineTableNames } from "./packages/shared/constants/index.ts"; console.log(ActivePipelineTableNames.join("\n"));'
    )"
  else
    table_list="$(printf '%s\n' "${DEFAULT_ACTIVE_TABLES}" | tr ',' '\n')"
  fi

  if [[ -f "${APP_DIR}/packages/shared/constants/index.ts" ]]; then
    omitted_list="$(
      run_in_app_dir "${bun_bin}" -e \
        'import { OmittedPipelineTableNames } from "./packages/shared/constants/index.ts"; console.log(OmittedPipelineTableNames.join("\n"));'
    )"
  else
    omitted_list="$(printf '%s\n' "${DEFAULT_OMITTED_TABLES}" | tr ',' '\n')"
  fi

  table_list="$(printf '%s\n' "${table_list}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  omitted_list="$(printf '%s\n' "${omitted_list}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

  # Always enforce omitted-table exclusion, even for ACTIVE_PIPELINE_TABLES overrides.
  if [[ -n "${omitted_list}" ]]; then
    while IFS= read -r omitted_table; do
      [[ -z "${omitted_table}" ]] && continue
      table_list="$(printf '%s\n' "${table_list}" | awk -v t="${omitted_table}" '$0 != t')"
    done <<< "${omitted_list}"
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
    if [[ -f "${PIPELINE_BUILD_DIR}/scraper/cli.js" ]]; then
      run_in_app_dir env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" "${bun_bin}" "${PIPELINE_BUILD_DIR}/scraper/cli.js" "${table_name}" >> "${LOG_FILE}" 2>&1
    else
      run_in_app_dir env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" "${bun_bin}" run scrape "${table_name}" >> "${LOG_FILE}" 2>&1
    fi
  done <<< "${table_list}"
}

parse_all() {
  local bun_bin="$1"
  log "Parsing all active tables"
  if [[ -f "${PIPELINE_BUILD_DIR}/parser/cli.js" ]]; then
    run_in_app_dir env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" "${bun_bin}" "${PIPELINE_BUILD_DIR}/parser/cli.js" all >> "${LOG_FILE}" 2>&1
  else
    run_in_app_dir env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" "${bun_bin}" run parse all >> "${LOG_FILE}" 2>&1
  fi
}

migrate_and_sync() {
  local bun_bin="$1"

  mkdir -p "$(dirname "${DB_PATH}")"

  log "Running migration (DB_PATH=${DB_PATH})"
  if [[ -f "${PIPELINE_BUILD_DIR}/migrator/cli.js" ]]; then
    run_in_app_dir env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" DB_PATH="${DB_PATH}" "${bun_bin}" "${PIPELINE_BUILD_DIR}/migrator/cli.js" >> "${LOG_FILE}" 2>&1
  else
    run_in_app_dir env STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR}" DB_PATH="${DB_PATH}" "${bun_bin}" run migrate >> "${LOG_FILE}" 2>&1
  fi

  if [[ -z "${APP_VM_SYNC_HOST}" ]]; then
    echo "Error: APP_VM_SYNC_HOST must be set for migrate-sync" >&2
    exit 1
  fi

  log "Syncing DB to ${APP_VM_SYNC_HOST}:${APP_SYNC_DEST}"
  rsync -az --delay-updates "${DB_PATH}" "${APP_VM_SYNC_HOST}:${APP_SYNC_DEST}" >> "${LOG_FILE}" 2>&1
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
  ACTIVE_PIPELINE_TABLES Comma-separated table list override for scrape-all
  SCRAPER_MAX_RUNTIME_SECONDS Max scrape-all runtime before stopping (default: 1800)
  DB_PATH            Local migration DB path (default: /var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db)
  APP_VM_SYNC_HOST   Required for migrate-sync (format: user@host)
  APP_SYNC_DEST      Destination file on app VM (default: /mnt/app-db/avoimempi-eduskunta.db)
EOF
}

main() {
  local bun_bin
  bun_bin="$(find_bun)"
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
