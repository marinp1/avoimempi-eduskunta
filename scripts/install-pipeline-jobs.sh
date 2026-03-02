#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
# shellcheck source=./lib/app-db-sync.sh
source "${SCRIPT_DIR}/lib/app-db-sync.sh"
SCRAPER_SCRIPT="${APP_DIR}/scripts/pipeline-scraper-app.sh"
PARSER_SCRIPT="${APP_DIR}/scripts/pipeline-parser-app.sh"
MIGRATOR_SCRIPT="${APP_DIR}/scripts/pipeline-migrator-app.sh"
LOG_FILE="${LOG_FILE:-${APP_DIR}/pipeline-jobs.log}"

PIPELINE_CRON_TZ="${PIPELINE_CRON_TZ:-Etc/GMT-2}"
SCRAPE_SCHEDULE="${SCRAPE_SCHEDULE:-0 3-23/3 * * *}"
PARSE_SCHEDULE="${PARSE_SCHEDULE:-0 5-23/3 * * *}"
MIGRATE_SCHEDULE="${MIGRATE_SCHEDULE:-0 7-22/3 * * *}"

STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR:-/mnt/pipeline-raw-parsed/data}"
DB_PATH="${DB_PATH:-/var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db}"
PIPELINE_BUILD_DIR="${PIPELINE_BUILD_DIR:-${APP_DIR}/dist/pipeline}"
APP_VM_SYNC_HOST="${APP_VM_SYNC_HOST:-}"
set_app_db_sync_defaults
SCRAPER_MAX_RUNTIME_SECONDS="${SCRAPER_MAX_RUNTIME_SECONDS:-1800}"
ACTIVE_PIPELINE_TABLES="${ACTIVE_PIPELINE_TABLES:-}"
OMITTED_PIPELINE_TABLES="${OMITTED_PIPELINE_TABLES:-}"

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
  printf 'cd %s && STORAGE_LOCAL_DIR=%s DB_PATH=%s PIPELINE_BUILD_DIR=%s SCRAPER_MAX_RUNTIME_SECONDS=%s' \
    "${APP_DIR}" "${STORAGE_LOCAL_DIR}" "${DB_PATH}" "${PIPELINE_BUILD_DIR}" "${SCRAPER_MAX_RUNTIME_SECONDS}"

  if [[ -n "${ACTIVE_PIPELINE_TABLES}" ]]; then
    printf ' ACTIVE_PIPELINE_TABLES=%s' "${ACTIVE_PIPELINE_TABLES}"
  fi
  if [[ -n "${OMITTED_PIPELINE_TABLES}" ]]; then
    printf ' OMITTED_PIPELINE_TABLES=%s' "${OMITTED_PIPELINE_TABLES}"
  fi

  if [[ -n "${APP_VM_SYNC_HOST}" ]]; then
    printf ' APP_VM_SYNC_HOST=%s' "${APP_VM_SYNC_HOST}"
    print_app_db_sync_env_inline
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
  SCRAPE_SCHEDULE     Scrape schedule (default: "0 3-23/3 * * *")
  PARSE_SCHEDULE      Parse schedule (default: "0 5-23/3 * * *")
  MIGRATE_SCHEDULE    Migrate+sync schedule (default: "0 7-22/3 * * *")
  STORAGE_LOCAL_DIR   Row-store directory
  DB_PATH             Local migration DB path
  PIPELINE_BUILD_DIR  Pipeline build directory
  SCRAPER_MAX_RUNTIME_SECONDS  Max scrape-all runtime before stopping (default: 1800)
  ACTIVE_PIPELINE_TABLES Optional comma-separated active table list override
  OMITTED_PIPELINE_TABLES Optional comma-separated omitted table list override
  APP_VM_SYNC_HOST    App VM SSH target for rsync (user@host)
  APP_SYNC_CURRENT_LINK  Destination symlink path on app VM
  APP_SYNC_RELEASES_DIR  DB release directory on app VM
  APP_VM_ACTIVATE_SERVICE App VM systemd service restarted after DB activation
  APP_SYNC_KEEP_RELEASES Number of DB releases retained on app VM
  APP_READY_URL       App readiness URL checked after activation
  APP_READY_RETRIES   Number of readiness retry attempts
  APP_READY_SLEEP_SECONDS Seconds between readiness attempts
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
