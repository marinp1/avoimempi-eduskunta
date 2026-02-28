#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
START_SCRIPT="${APP_DIR}/scripts/start.sh"
LOG_FILE="${LOG_FILE:-${APP_DIR}/app.log}"
CRON_TZ_VALUE="${CRON_TZ_VALUE:-Etc/GMT-2}"
CRON_SCHEDULE="${CRON_SCHEDULE:-0 3 * * *}"
CRON_CMD="cd ${APP_DIR} && ./scripts/start.sh rebuild-db >> ${LOG_FILE} 2>&1"

if [[ ! -x "${START_SCRIPT}" ]]; then
  echo "Error: start script not found or not executable at ${START_SCRIPT}" >&2
  exit 1
fi

print_usage() {
  cat <<EOF
Usage: $0 [install|remove|status]

Commands:
  install   Add daily rebuild cron at 03:00 UTC+2 (default)
  remove    Remove rebuild cron managed by this script
  status    Show current rebuild cron entries

Environment overrides:
  APP_DIR          Application root (default: repo root)
  LOG_FILE         Log destination (default: \${APP_DIR}/app.log)
  CRON_TZ_VALUE    Cron timezone (default: Etc/GMT-2)
  CRON_SCHEDULE    Cron schedule (default: "0 3 * * *")
EOF
}

read_crontab() {
  crontab -l 2>/dev/null || true
}

remove_managed_entries() {
  local current
  current="$(read_crontab)"
  printf "%s\n" "${current}" | awk '
    /scripts\/start\.sh rebuild-db/ { next }
    /^CRON_TZ=/ { next }
    { print }
  '
}

install_entry() {
  local current filtered
  current="$(read_crontab)"
  filtered="$(remove_managed_entries)"

  {
    if [[ -n "${filtered}" ]]; then
      printf "%s\n" "${filtered}"
    fi
    printf "CRON_TZ=%s\n" "${CRON_TZ_VALUE}"
    printf "%s %s\n" "${CRON_SCHEDULE}" "${CRON_CMD}"
  } | crontab -

  echo "Installed rebuild cron:"
  echo "  CRON_TZ=${CRON_TZ_VALUE}"
  echo "  ${CRON_SCHEDULE} ${CRON_CMD}"
}

remove_entry() {
  local filtered
  filtered="$(remove_managed_entries)"
  if [[ -n "${filtered}" ]]; then
    printf "%s\n" "${filtered}" | crontab -
  else
    crontab -r 2>/dev/null || true
  fi
  echo "Removed managed rebuild cron entries."
}

status_entry() {
  local current matches
  current="$(read_crontab)"
  matches="$(printf "%s\n" "${current}" | grep -E "CRON_TZ=${CRON_TZ_VALUE}|scripts/start.sh rebuild-db" || true)"
  if [[ -z "${matches}" ]]; then
    echo "No rebuild cron entries found."
    return
  fi
  echo "Current rebuild cron entries:"
  printf "%s\n" "${matches}"
}

ACTION="${1:-install}"
case "${ACTION}" in
  install) install_entry ;;
  remove) remove_entry ;;
  status) status_entry ;;
  help|-h|--help) print_usage ;;
  *)
    print_usage
    exit 1
    ;;
esac
