#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-avoimempi-eduskunta-app}"
APP_DIR="${APP_DIR:-/root/avoimempi-eduskunta}"
APP_SERVICE_USER="${APP_SERVICE_USER:-root}"
APP_SERVICE_GROUP="${APP_SERVICE_GROUP:-root}"
UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
ENV_FILE="${APP_DIR}/shared/app.env"

mkdir -p "${APP_DIR}/shared"

if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" <<'EOF'
NODE_ENV=production
DB_PATH=/mnt/app-db/avoimempi-eduskunta.db
PORT=80
BUN_IDLE_TIMEOUT_SECONDS=120
EOF
fi

cat > "${UNIT_PATH}" <<EOF
[Unit]
Description=Avoimempi Eduskunta app
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

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"

echo "Installed systemd unit at ${UNIT_PATH}"
echo "Environment file: ${ENV_FILE}"
