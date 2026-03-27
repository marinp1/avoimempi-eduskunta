#!/usr/bin/env bash
# First-time setup for the VM. Run once after the first deploy.
# Creates both service users, directories, sudoers entry, and installs systemd units.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

APP_DIR="/opt/avoimempi-eduskunta"
APP_USER="avoimempi-eduskunta-app"
PIPELINE_USER="avoimempi-eduskunta-pipeline"
APP_DATA_DIR="/var/lib/avoimempi-eduskunta-app"
PIPELINE_DATA_DIR="/var/lib/avoimempi-eduskunta-pipeline"
APP_ENV_FILE="${APP_DIR}/shared/app.env"
PIPELINE_ENV_FILE="${APP_DIR}/shared/pipeline.env"
APP_DOMAIN="avoimempieduskunta.eu, www.avoimempieduskunta.eu"

# Ensure bun is on PATH for systemd services (which don't inherit shell profiles)
if [[ ! -x /usr/local/bin/bun ]]; then
  if [[ -x "${HOME}/.bun/bin/bun" ]]; then
    cp "${HOME}/.bun/bin/bun" /usr/local/bin/bun
    chmod 755 /usr/local/bin/bun
    echo "Copied bun -> /usr/local/bin/bun"
  else
    echo "Error: bun not found at ~/.bun/bin/bun or /usr/local/bin/bun" >&2
    echo "Install bun first: curl -fsSL https://bun.sh/install | bash" >&2
    exit 1
  fi
else
  echo "bun already at /usr/local/bin/bun: $(bun --version)"
fi

# --- Users ---

if ! id "${APP_USER}" &>/dev/null; then
  useradd --system --shell /usr/sbin/nologin --home-dir "${APP_DATA_DIR}" --create-home "${APP_USER}"
  echo "Created user: ${APP_USER}"
fi

if ! id "${PIPELINE_USER}" &>/dev/null; then
  useradd --system --shell /usr/sbin/nologin --home-dir "${PIPELINE_DATA_DIR}" --create-home "${PIPELINE_USER}"
  echo "Created user: ${PIPELINE_USER}"
fi

# Pipeline user joins app group so it can write DB releases to the app data dir
if ! id -nG "${PIPELINE_USER}" | grep -qw "${APP_USER}"; then
  usermod -aG "${APP_USER}" "${PIPELINE_USER}"
  echo "Added ${PIPELINE_USER} to group ${APP_USER}"
fi

# --- App data directory ---
# Group-writable with setgid so the pipeline user (member of app group) can drop DB releases here.

mkdir -p "${APP_DATA_DIR}/releases"
chown "${APP_USER}:${APP_USER}" "${APP_DATA_DIR}"
chmod 775 "${APP_DATA_DIR}"
chown "${APP_USER}:${APP_USER}" "${APP_DATA_DIR}/releases"
chmod 2775 "${APP_DATA_DIR}/releases"   # setgid: new files inherit app group

# --- Pipeline data directory ---

mkdir -p "${PIPELINE_DATA_DIR}/data" "${PIPELINE_DATA_DIR}/locks"
chown -R "${PIPELINE_USER}:${PIPELINE_USER}" "${PIPELINE_DATA_DIR}"
chmod 750 "${PIPELINE_DATA_DIR}"

# --- Shared config dir ---

mkdir -p "${APP_DIR}/shared"

if [[ ! -f "${APP_ENV_FILE}" ]]; then
  cat > "${APP_ENV_FILE}" <<EOF
NODE_ENV=production
DB_PATH=${APP_DATA_DIR}/current.db
QUALITY_DB_PATH=${APP_DATA_DIR}/avoimempi-eduskunta-quality.db
PORT=3000
BUN_REUSE_PORT=true
BUN_IDLE_TIMEOUT_SECONDS=120
EOF
  chown "${APP_USER}:${APP_USER}" "${APP_ENV_FILE}"
  chmod 640 "${APP_ENV_FILE}"
  echo "Created ${APP_ENV_FILE}"
fi

if [[ ! -f "${PIPELINE_ENV_FILE}" ]]; then
  cat > "${PIPELINE_ENV_FILE}" <<EOF
STORAGE_LOCAL_DIR=${PIPELINE_DATA_DIR}/data
DB_PATH=${PIPELINE_DATA_DIR}/avoimempi-eduskunta.db
MIGRATOR_OVERWRITE_LOG_DIR=${PIPELINE_DATA_DIR}/migration-overwrites
MIGRATOR_REPORT_LOG_DIR=${PIPELINE_DATA_DIR}/migration-reports
MIGRATOR_KNOWN_ISSUE_LOG_DIR=${PIPELINE_DATA_DIR}/migration-known-issues
EOF
  chown "${PIPELINE_USER}:${PIPELINE_USER}" "${PIPELINE_ENV_FILE}"
  chmod 640 "${PIPELINE_ENV_FILE}"
  echo "Created ${PIPELINE_ENV_FILE}"
fi

# --- Sudoers: allow pipeline user to restart the app service ---

SUDOERS_FILE="/etc/sudoers.d/avoimempi-eduskunta-pipeline"
RESTART_SCRIPT="${APP_DIR}/scripts/app/restart-app.sh"
cat > "${SUDOERS_FILE}" <<EOF
${PIPELINE_USER} ALL=(ALL) NOPASSWD: ${RESTART_SCRIPT}
EOF
chmod 440 "${SUDOERS_FILE}"
echo "Wrote sudoers entry: ${SUDOERS_FILE}"

# --- Install Caddy ---

if ! command -v caddy &>/dev/null; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y caddy
  echo "Installed Caddy"
else
  echo "Caddy already installed: $(caddy version)"
fi

CADDYFILE="/etc/caddy/Caddyfile"
cat > "${CADDYFILE}" <<EOF
${APP_DOMAIN} {
    reverse_proxy localhost:3000
}
EOF
echo "Wrote ${CADDYFILE} for domain(s): ${APP_DOMAIN}"

systemctl enable --now caddy
echo "Caddy enabled and started"

# --- Install systemd units ---

"${SCRIPT_DIR}/app/install-app-systemd-service.sh"
"${SCRIPT_DIR}/pipeline/install-pipeline-systemd-jobs.sh" install

echo ""
echo "VM provisioned."
echo "  App service:       systemctl start ${APP_USER}"
echo "  Pipeline timers:   systemctl list-timers 'avoimempi-eduskunta-pipeline-*'"
echo "  Run pipeline now:  sudo -u ${PIPELINE_USER} ${APP_DIR}/scripts/pipeline/pipeline-jobs.sh full-cycle"
