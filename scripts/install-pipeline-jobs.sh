#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
SCRAPER_SCRIPT="${APP_DIR}/scripts/pipeline-scraper-app.sh"
PARSER_SCRIPT="${APP_DIR}/scripts/pipeline-parser-app.sh"
MIGRATOR_SCRIPT="${APP_DIR}/scripts/pipeline-migrator-app.sh"
LOG_FILE="${LOG_FILE:-${APP_DIR}/pipeline-jobs.log}"

PIPELINE_CRON_TZ="${PIPELINE_CRON_TZ:-Etc/GMT-2}"
SCRAPE_SCHEDULE="${SCRAPE_SCHEDULE:-15 * * * *}"
PARSE_SCHEDULE="${PARSE_SCHEDULE:-35 * * * *}"
MIGRATE_SCHEDULE="${MIGRATE_SCHEDULE:-0 */6 * * *}"

STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR:-/mnt/pipeline-raw-parsed/data}"
DB_PATH="${DB_PATH:-/var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db}"
PIPELINE_BUILD_DIR="${PIPELINE_BUILD_DIR:-${APP_DIR}/dist/pipeline}"
APP_VM_SYNC_HOST="${APP_VM_SYNC_HOST:-}"
APP_SYNC_DEST="${APP_SYNC_DEST:-/mnt/app-db/avoimempi-eduskunta.db}"

SCRAPE_TAG="# AE_PIPELINE_JOB:scrape"
PARSE_TAG="# AE_PIPELINE_JOB:parse"
MIGRATE_TAG="# AE_PIPELINE_JOB:migrate"

if [[ ! -x "${SCRAPER_SCRIPT}" || ! -x "${PARSER_SCRIPT}" || ! -x "${MIGRATOR_SCRIPT}" ]]; then
  echo "Error: one or more pipeline app scripts are missing or not executable." >&2
  exit 1
fi

read_crontab() {
  crontab -l 2>/dev/null || true
}

remove_managed_entries() {
  read_crontab | awk -v tz="${PIPELINE_CRON_TZ}" '
    /AE_PIPELINE_JOB:/ { next }
    $0 == "CRON_TZ=" tz { next }
    { print }
  '
}

build_cmd() {
  local script_path="$1"
  printf 'cd %s && STORAGE_LOCAL_DIR=%s DB_PATH=%s PIPELINE_BUILD_DIR=%s' \
    "${APP_DIR}" "${STORAGE_LOCAL_DIR}" "${DB_PATH}" "${PIPELINE_BUILD_DIR}"

  if [[ -n "${APP_VM_SYNC_HOST}" ]]; then
    printf ' APP_VM_SYNC_HOST=%s APP_SYNC_DEST=%s' \
      "${APP_VM_SYNC_HOST}" "${APP_SYNC_DEST}"
  fi

  printf ' %s >> %s 2>&1' "${script_path}" "${LOG_FILE}"
}

install_jobs() {
  local filtered
  filtered="$(remove_managed_entries)"

  {
    if [[ -n "${filtered}" ]]; then
      printf "%s\n" "${filtered}"
    fi
    printf "CRON_TZ=%s\n" "${PIPELINE_CRON_TZ}"
    printf "%s %s %s\n" "${SCRAPE_SCHEDULE}" "$(build_cmd ./scripts/pipeline-scraper-app.sh)" "${SCRAPE_TAG}"
    printf "%s %s %s\n" "${PARSE_SCHEDULE}" "$(build_cmd ./scripts/pipeline-parser-app.sh)" "${PARSE_TAG}"
    printf "%s %s %s\n" "${MIGRATE_SCHEDULE}" "$(build_cmd ./scripts/pipeline-migrator-app.sh)" "${MIGRATE_TAG}"
  } | crontab -

  echo "Installed pipeline jobs:"
  status_jobs
}

remove_jobs() {
  local filtered
  filtered="$(remove_managed_entries)"
  if [[ -n "${filtered}" ]]; then
    printf "%s\n" "${filtered}" | crontab -
  else
    crontab -r 2>/dev/null || true
  fi
  echo "Removed managed pipeline cron entries."
}

status_jobs() {
  local current matches
  current="$(read_crontab)"
  matches="$(printf "%s\n" "${current}" | grep -E "AE_PIPELINE_JOB:|^CRON_TZ=${PIPELINE_CRON_TZ}$" || true)"
  if [[ -z "${matches}" ]]; then
    echo "No managed pipeline cron entries found."
    return
  fi

  echo "Current managed pipeline cron entries:"
  printf "%s\n" "${matches}"
}

print_usage() {
  cat <<EOF
Usage: $0 [install|remove|status]

Commands:
  install   Install scrape/parse/migrate cron jobs
  remove    Remove managed pipeline cron jobs
  status    Show managed pipeline cron jobs

Environment:
  PIPELINE_CRON_TZ    Cron timezone (default: Etc/GMT-2)
  SCRAPE_SCHEDULE     Scrape schedule (default: "15 * * * *")
  PARSE_SCHEDULE      Parse schedule (default: "35 * * * *")
  MIGRATE_SCHEDULE    Migrate+sync schedule (default: "0 */6 * * *")
  STORAGE_LOCAL_DIR   Row-store directory
  DB_PATH             Local migration DB path
  PIPELINE_BUILD_DIR  Pipeline build directory
  APP_VM_SYNC_HOST    App VM SSH target for rsync (user@host)
  APP_SYNC_DEST       Destination DB path on app VM
  LOG_FILE            Shared log file path
EOF
}

ACTION="${1:-install}"
case "${ACTION}" in
  install) install_jobs ;;
  remove) remove_jobs ;;
  status) status_jobs ;;
  help|-h|--help) print_usage ;;
  *)
    print_usage
    exit 1
    ;;
esac
