#!/usr/bin/env bash
# First-time setup for the Pipeline VM.
# Run this once after `bun deploy:pipeline`.
set -euo pipefail

APP_DIR="/opt/avoimempi-eduskunta"
SERVICE_USER="avoimempi-eduskunta"
ENV_FILE="${APP_DIR}/shared/pipeline.env"
STORAGE_LOCAL_DIR="/mnt/pipeline-raw-parsed/data"

# Ensure bun is on PATH for systemd services (which don't inherit shell profiles)
if [[ ! -x /usr/local/bin/bun ]] && [[ -x "${HOME}/.bun/bin/bun" ]]; then
  cp "${HOME}/.bun/bin/bun" /usr/local/bin/bun
  chmod 755 /usr/local/bin/bun
  echo "Copied bun -> /usr/local/bin/bun"
fi

# Create service user if not present.
# Home dir is APP_DIR so SSH looks for keys in ${APP_DIR}/.ssh/ automatically.
if ! id "${SERVICE_USER}" &>/dev/null; then
  useradd --system --shell /usr/sbin/nologin --home-dir "${APP_DIR}" "${SERVICE_USER}"
  echo "Created service user: ${SERVICE_USER}"
fi

# SSH key dir (used by sync_db_to_app_vm to connect to the app VM)
mkdir -p "${APP_DIR}/.ssh"
chown "${SERVICE_USER}:${SERVICE_USER}" "${APP_DIR}/.ssh"
chmod 700 "${APP_DIR}/.ssh"

# Shared config dir (env files written here by root, readable by service)
mkdir -p "${APP_DIR}/shared"

# Storage dir for scraper/parser output on the mounted block volume
mkdir -p "${STORAGE_LOCAL_DIR}"
chown "${SERVICE_USER}:${SERVICE_USER}" "${STORAGE_LOCAL_DIR}"

# Log and state dirs (systemd creates these via LogsDirectory=/StateDirectory= when running
# via timers, but also needed for manual runs with sudo -u)
mkdir -p /var/log/avoimempi-eduskunta /var/lib/avoimempi-eduskunta
chown "${SERVICE_USER}:${SERVICE_USER}" /var/log/avoimempi-eduskunta /var/lib/avoimempi-eduskunta

if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" <<'EOF'
# SSH target on the app VM for DB sync (user@host over private network).
# The pipeline VM must be able to SSH to this host.
APP_VM_SYNC_HOST=root@avoimempi-eduskunta-app.priv
EOF
  echo "Created ${ENV_FILE}"
  echo ""
  echo "Run setup-vm-ssh-trust.sh to establish pipeline -> app VM SSH trust, then:"
  echo "  ./scripts/install-pipeline-systemd-jobs.sh install"
  exit 0
fi

echo "Env file already exists: ${ENV_FILE}"
echo ""
echo "To install or refresh pipeline timers:"
echo "  ./scripts/install-pipeline-systemd-jobs.sh install"
echo ""
echo "To run jobs manually:"
echo "  ./scripts/pipeline-jobs.sh scrape-all"
echo "  ./scripts/pipeline-jobs.sh parse-all"
echo "  ./scripts/pipeline-jobs.sh migrate-sync"
echo "  ./scripts/pipeline-jobs.sh full-cycle"
