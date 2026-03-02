#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-avoimempi-eduskunta-app}"
APP_DIR="${APP_DIR:-/root/avoimempi-eduskunta}"
APP_SERVICE_USER="${APP_SERVICE_USER:-root}"
APP_SERVICE_GROUP="${APP_SERVICE_GROUP:-root}"
UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
ENV_FILE="${APP_DIR}/shared/app.env"
APP_REPLICA_COUNT="${APP_REPLICA_COUNT:-2}"

mkdir -p "${APP_DIR}/shared"

if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" <<'EOF'
NODE_ENV=production
DB_PATH=/mnt/app-db/current.db
PORT=80
BUN_IDLE_TIMEOUT_SECONDS=120
BUN_REUSE_PORT=true
EOF
elif ! grep -q '^BUN_REUSE_PORT=' "${ENV_FILE}"; then
  printf '\nBUN_REUSE_PORT=true\n' >> "${ENV_FILE}"
fi

write_service_unit() {
  local idx="$1"
  local unit_path description
  if [[ "${idx}" -eq 1 ]]; then
    unit_path="/etc/systemd/system/${SERVICE_NAME}.service"
    description="Avoimempi Eduskunta app"
  else
    unit_path="/etc/systemd/system/${SERVICE_NAME}-${idx}.service"
    description="Avoimempi Eduskunta app (replica ${idx})"
  fi

  cat > "${unit_path}" <<EOF
[Unit]
Description=${description}
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_SERVICE_USER}
Group=${APP_SERVICE_GROUP}
WorkingDirectory=${APP_DIR}/current
EnvironmentFile=-${ENV_FILE}
ExecStart=/usr/bin/env bash ${APP_DIR}/current/scripts/run-app.sh
Restart=always
RestartSec=3
TimeoutStopSec=20
KillSignal=SIGTERM
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
}

for ((idx=1; idx<=APP_REPLICA_COUNT; idx++)); do
  write_service_unit "${idx}"
done

systemctl daemon-reload
for ((idx=1; idx<=APP_REPLICA_COUNT; idx++)); do
  if [[ "${idx}" -eq 1 ]]; then
    systemctl enable "${SERVICE_NAME}.service"
  else
    systemctl enable "${SERVICE_NAME}-${idx}.service"
  fi
done

echo "Installed systemd unit at ${UNIT_PATH}"
echo "Environment file: ${ENV_FILE}"
