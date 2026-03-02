#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-install}"

APP_DIR="${APP_DIR:-/root/avoimempi-eduskunta}"
SERVICE_PREFIX="${SERVICE_PREFIX:-avoimempi-eduskunta-pipeline}"
ENV_FILE="${APP_DIR}/shared/pipeline.env"

SCRAPE_ON_CALENDAR="${SCRAPE_ON_CALENDAR:-*-*-* 03/3:00:00}"
PARSE_ON_CALENDAR="${PARSE_ON_CALENDAR:-*-*-* 05/3:00:00}"
MIGRATE_ON_CALENDAR="${MIGRATE_ON_CALENDAR:-*-*-* 07/3:00:00}"
SCRAPE_TIMEOUT="${SCRAPE_TIMEOUT:-30m}"
PARSE_TIMEOUT="${PARSE_TIMEOUT:-12h}"
MIGRATE_TIMEOUT="${MIGRATE_TIMEOUT:-12h}"

STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR:-/mnt/pipeline-raw-parsed/data}"
DB_PATH="${DB_PATH:-/var/lib/avoimempi-eduskunta/avoimempi-eduskunta.db}"
PIPELINE_BUILD_DIR="${PIPELINE_BUILD_DIR:-${APP_DIR}/dist/pipeline}"
APP_VM_SYNC_HOST="${APP_VM_SYNC_HOST:-}"
APP_SYNC_DEST="${APP_SYNC_DEST:-/mnt/app-db/avoimempi-eduskunta.db}"
LOG_FILE="${LOG_FILE:-${APP_DIR}/pipeline-jobs.log}"
SCRAPER_MAX_RUNTIME_SECONDS="${SCRAPER_MAX_RUNTIME_SECONDS:-1800}"

SCRAPE_SERVICE="${SERVICE_PREFIX}-scrape.service"
PARSE_SERVICE="${SERVICE_PREFIX}-parse.service"
MIGRATE_SERVICE="${SERVICE_PREFIX}-migrate.service"
SCRAPE_TIMER="${SERVICE_PREFIX}-scrape.timer"
PARSE_TIMER="${SERVICE_PREFIX}-parse.timer"
MIGRATE_TIMER="${SERVICE_PREFIX}-migrate.timer"

unit_path() {
  printf '/etc/systemd/system/%s\n' "$1"
}

write_env_file() {
  mkdir -p "${APP_DIR}/shared"
  cat > "${ENV_FILE}" <<EOF
STORAGE_LOCAL_DIR=${STORAGE_LOCAL_DIR}
DB_PATH=${DB_PATH}
PIPELINE_BUILD_DIR=${PIPELINE_BUILD_DIR}
LOG_FILE=${LOG_FILE}
SCRAPER_MAX_RUNTIME_SECONDS=${SCRAPER_MAX_RUNTIME_SECONDS}
APP_VM_SYNC_HOST=${APP_VM_SYNC_HOST}
APP_SYNC_DEST=${APP_SYNC_DEST}
EOF
}

write_service_unit() {
  local name="$1"
  local script="$2"
  local timeout="$3"
  cat > "$(unit_path "${name}")" <<EOF
[Unit]
Description=Avoimempi Eduskunta pipeline job (${script})
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=${APP_DIR}
EnvironmentFile=-${ENV_FILE}
ExecStart=/usr/bin/env bash ${APP_DIR}/scripts/${script}
TimeoutStartSec=${timeout}
NoNewPrivileges=true
PrivateTmp=true
EOF
}

write_timer_unit() {
  local name="$1"
  local service="$2"
  local schedule="$3"
  cat > "$(unit_path "${name}")" <<EOF
[Unit]
Description=Avoimempi Eduskunta pipeline schedule (${service})

[Timer]
OnCalendar=${schedule}
Persistent=true
Unit=${service}

[Install]
WantedBy=timers.target
EOF
}

install_units() {
  write_env_file
  write_service_unit "${SCRAPE_SERVICE}" "pipeline-scraper-app.sh" "${SCRAPE_TIMEOUT}"
  write_service_unit "${PARSE_SERVICE}" "pipeline-parser-app.sh" "${PARSE_TIMEOUT}"
  write_service_unit "${MIGRATE_SERVICE}" "pipeline-migrator-app.sh" "${MIGRATE_TIMEOUT}"

  write_timer_unit "${SCRAPE_TIMER}" "${SCRAPE_SERVICE}" "${SCRAPE_ON_CALENDAR}"
  write_timer_unit "${PARSE_TIMER}" "${PARSE_SERVICE}" "${PARSE_ON_CALENDAR}"
  write_timer_unit "${MIGRATE_TIMER}" "${MIGRATE_SERVICE}" "${MIGRATE_ON_CALENDAR}"

  systemctl daemon-reload
  systemctl enable --now "${SCRAPE_TIMER}" "${PARSE_TIMER}" "${MIGRATE_TIMER}"

  echo "Installed pipeline systemd timers."
  status_units
}

remove_units() {
  systemctl disable --now "${SCRAPE_TIMER}" "${PARSE_TIMER}" "${MIGRATE_TIMER}" 2>/dev/null || true

  rm -f \
    "$(unit_path "${SCRAPE_SERVICE}")" \
    "$(unit_path "${PARSE_SERVICE}")" \
    "$(unit_path "${MIGRATE_SERVICE}")" \
    "$(unit_path "${SCRAPE_TIMER}")" \
    "$(unit_path "${PARSE_TIMER}")" \
    "$(unit_path "${MIGRATE_TIMER}")"

  systemctl daemon-reload
  echo "Removed pipeline systemd units."
}

status_units() {
  echo "Timers:"
  systemctl list-timers --all | grep -E "${SERVICE_PREFIX}-(scrape|parse|migrate)\\.timer" || true
  echo
  echo "Services:"
  systemctl status "${SCRAPE_SERVICE}" "${PARSE_SERVICE}" "${MIGRATE_SERVICE}" --no-pager || true
}

print_help() {
  cat <<EOF
Usage: $0 [install|remove|status]

Environment:
  APP_DIR             Pipeline app directory (default: /root/avoimempi-eduskunta)
  SERVICE_PREFIX      Unit name prefix (default: avoimempi-eduskunta-pipeline)
  SCRAPE_ON_CALENDAR  systemd OnCalendar for scrape (default: *-*-* 03/3:00:00)
  PARSE_ON_CALENDAR   systemd OnCalendar for parse (default: *-*-* 05/3:00:00)
  MIGRATE_ON_CALENDAR systemd OnCalendar for migrate (default: *-*-* 07/3:00:00)
  SCRAPE_TIMEOUT      systemd service timeout for scrape (default: 30m)
  PARSE_TIMEOUT       systemd service timeout for parser (default: 12h)
  MIGRATE_TIMEOUT     systemd service timeout for migrator (default: 12h)
  STORAGE_LOCAL_DIR   Row-store directory
  DB_PATH             Local migration DB path
  PIPELINE_BUILD_DIR  Pipeline build directory
  APP_VM_SYNC_HOST    App VM SSH target for rsync (user@host)
  APP_SYNC_DEST       Destination DB path on app VM
  LOG_FILE            Pipeline jobs log path
  SCRAPER_MAX_RUNTIME_SECONDS  Max scrape-all runtime before stopping (default: 1800)
EOF
}

case "${ACTION}" in
  install)
    install_units
    ;;
  remove)
    remove_units
    ;;
  status)
    status_units
    ;;
  help|-h|--help)
    print_help
    ;;
  *)
    print_help
    exit 1
    ;;
esac
