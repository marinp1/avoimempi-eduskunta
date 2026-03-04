#!/usr/bin/env bash
# First-time setup for the App VM.
# Run this once after `bun deploy:app`.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

APP_DIR="/opt/avoimempi-eduskunta"
SERVICE_USER="avoimempi-eduskunta"
ENV_FILE="${APP_DIR}/shared/app.env"

# Ensure bun is on PATH for systemd services (which don't inherit shell profiles)
if [[ ! -x /usr/local/bin/bun ]] && [[ -x "${HOME}/.bun/bin/bun" ]]; then
  cp "${HOME}/.bun/bin/bun" /usr/local/bin/bun
  chmod 755 /usr/local/bin/bun
  echo "Copied bun -> /usr/local/bin/bun"
fi

# Create service user if not present
if ! id "${SERVICE_USER}" &>/dev/null; then
  useradd --system --shell /usr/sbin/nologin --home-dir "${APP_DIR}" "${SERVICE_USER}"
  echo "Created service user: ${SERVICE_USER}"
fi

mkdir -p "${APP_DIR}/shared"
# shared/ must be writable by the service user (migration.lock is written there)
chown "${SERVICE_USER}:${SERVICE_USER}" "${APP_DIR}/shared"

if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" <<'EOF'
NODE_ENV=production
# Path to SQLite DB — block storage symlink updated by the pipeline VM after each migration.
DB_PATH=/mnt/app-db/current.db
PORT=80
BUN_REUSE_PORT=true
BUN_IDLE_TIMEOUT_SECONDS=120
EOF
  echo "Created ${ENV_FILE}"
fi

"${SCRIPT_DIR}/install-app-systemd-service.sh"

echo ""
echo "App VM provisioned. Start the service:"
echo "  systemctl start avoimempi-eduskunta-app"
