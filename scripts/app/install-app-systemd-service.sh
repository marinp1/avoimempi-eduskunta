#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/avoimempi-eduskunta"
SERVICE_NAME="avoimempi-eduskunta-app"
APP_SERVICE_USER="avoimempi-eduskunta-app"
APP_SERVICE_GROUP="avoimempi-eduskunta-app"
APP_REPLICA_COUNT=2
ENV_FILE="${APP_DIR}/shared/app.env"

mkdir -p "${APP_DIR}/shared"

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
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
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

echo "Installed ${APP_REPLICA_COUNT} systemd service unit(s): ${SERVICE_NAME}"
echo "Config: ${ENV_FILE}"
