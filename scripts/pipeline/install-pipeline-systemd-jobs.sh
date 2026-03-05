#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-install}"

APP_DIR="/opt/avoimempi-eduskunta"
SERVICE_USER="avoimempi-eduskunta-pipeline"
SERVICE_GROUP="avoimempi-eduskunta-pipeline"
SERVICE_PREFIX="avoimempi-eduskunta-pipeline"
ENV_FILE="${APP_DIR}/shared/pipeline.env"
LOG_FILE="/var/log/avoimempi-eduskunta/pipeline-jobs.log"
LOGROTATE_CONF="/etc/logrotate.d/avoimempi-eduskunta-pipeline"

FETCH_COUNTS_ON_CALENDAR="${FETCH_COUNTS_ON_CALENDAR:-*-*-* 01/6:00:00}"
SCRAPE_ON_CALENDAR="${SCRAPE_ON_CALENDAR:-*-*-* 02/6:00:00}"
PARSE_ON_CALENDAR="${PARSE_ON_CALENDAR:-*-*-* 03/6:00:00}"
MIGRATE_ON_CALENDAR="${MIGRATE_ON_CALENDAR:-*-*-* 04/6:00:00}"
FETCH_COUNTS_TIMEOUT="${FETCH_COUNTS_TIMEOUT:-10m}"
SCRAPE_TIMEOUT="${SCRAPE_TIMEOUT:-30m}"
PARSE_TIMEOUT="${PARSE_TIMEOUT:-12h}"
MIGRATE_TIMEOUT="${MIGRATE_TIMEOUT:-12h}"

FETCH_COUNTS_SERVICE="${SERVICE_PREFIX}-fetch-counts.service"
SCRAPE_SERVICE="${SERVICE_PREFIX}-scrape.service"
PARSE_SERVICE="${SERVICE_PREFIX}-parse.service"
MIGRATE_SERVICE="${SERVICE_PREFIX}-migrate.service"
FETCH_COUNTS_TIMER="${SERVICE_PREFIX}-fetch-counts.timer"
SCRAPE_TIMER="${SERVICE_PREFIX}-scrape.timer"
PARSE_TIMER="${SERVICE_PREFIX}-parse.timer"
MIGRATE_TIMER="${SERVICE_PREFIX}-migrate.timer"

unit_path() { printf '/etc/systemd/system/%s\n' "$1"; }

write_service_unit() {
  local name="$1" action="$2" timeout="$3"
  cat > "$(unit_path "${name}")" <<EOF
[Unit]
Description=Avoimempi Eduskunta pipeline (${action})
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
WorkingDirectory=${APP_DIR}
EnvironmentFile=-${ENV_FILE}
ExecStart=/usr/bin/env bash ${APP_DIR}/scripts/pipeline/pipeline-jobs.sh ${action}
TimeoutStartSec=${timeout}
PrivateTmp=true
LogsDirectory=avoimempi-eduskunta
LogsDirectoryMode=0750
EOF
}

write_timer_unit() {
  local name="$1" service="$2" schedule="$3"
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

write_logrotate_config() {
  cat > "${LOGROTATE_CONF}" <<EOF
${LOG_FILE} {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    create 640 ${SERVICE_USER} ${SERVICE_USER}
}
EOF
  echo "Logrotate config written: ${LOGROTATE_CONF}"
}

install_units() {
  write_service_unit "${FETCH_COUNTS_SERVICE}" "fetch-counts"  "${FETCH_COUNTS_TIMEOUT}"
  write_service_unit "${SCRAPE_SERVICE}"        "scrape-all"   "${SCRAPE_TIMEOUT}"
  write_service_unit "${PARSE_SERVICE}"         "parse-all"    "${PARSE_TIMEOUT}"
  write_service_unit "${MIGRATE_SERVICE}"       "migrate-sync" "${MIGRATE_TIMEOUT}"
  write_timer_unit "${FETCH_COUNTS_TIMER}" "${FETCH_COUNTS_SERVICE}" "${FETCH_COUNTS_ON_CALENDAR}"
  write_timer_unit "${SCRAPE_TIMER}"       "${SCRAPE_SERVICE}"       "${SCRAPE_ON_CALENDAR}"
  write_timer_unit "${PARSE_TIMER}"        "${PARSE_SERVICE}"        "${PARSE_ON_CALENDAR}"
  write_timer_unit "${MIGRATE_TIMER}"      "${MIGRATE_SERVICE}"      "${MIGRATE_ON_CALENDAR}"
  write_logrotate_config
  systemctl daemon-reload
  systemctl enable --now "${FETCH_COUNTS_TIMER}" "${SCRAPE_TIMER}" "${PARSE_TIMER}" "${MIGRATE_TIMER}"
  echo "Pipeline timers installed."
  status_units
}

remove_units() {
  systemctl disable --now "${FETCH_COUNTS_TIMER}" "${SCRAPE_TIMER}" "${PARSE_TIMER}" "${MIGRATE_TIMER}" 2>/dev/null || true
  rm -f "$(unit_path "${FETCH_COUNTS_SERVICE}")" "$(unit_path "${SCRAPE_SERVICE}")" \
        "$(unit_path "${PARSE_SERVICE}")"         "$(unit_path "${MIGRATE_SERVICE}")" \
        "$(unit_path "${FETCH_COUNTS_TIMER}")"    "$(unit_path "${SCRAPE_TIMER}")" \
        "$(unit_path "${PARSE_TIMER}")"           "$(unit_path "${MIGRATE_TIMER}")"
  rm -f "${LOGROTATE_CONF}"
  systemctl daemon-reload
  echo "Removed pipeline systemd units."
}

status_units() {
  echo "Timers:"
  systemctl list-timers --all | grep -E "${SERVICE_PREFIX}-(fetch-counts|scrape|parse|migrate)\.timer" || true
  echo
  echo "Services:"
  systemctl status "${FETCH_COUNTS_SERVICE}" "${SCRAPE_SERVICE}" "${PARSE_SERVICE}" "${MIGRATE_SERVICE}" --no-pager || true
}

case "${ACTION}" in
  install) install_units ;;
  remove)  remove_units ;;
  status)  status_units ;;
  help|-h|--help)
    echo "Usage: $0 [install|remove|status]"
    ;;
  *)
    echo "Usage: $0 [install|remove|status]" >&2
    exit 1
    ;;
esac
