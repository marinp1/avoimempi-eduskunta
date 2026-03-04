#!/usr/bin/env bash
# Sets up SSH trust from the pipeline VM to the app VM over the private network,
# and ensures rsync is installed on the pipeline VM.
#
# Run once from your local machine after deploying and provisioning both VMs:
#   bash scripts/setup-vm-ssh-trust.sh [APP_PRIV_HOST] [APP_PRIV_PORT]
#
# Reads SSH host aliases from the environment (same vars as deploy.mts):
#   DEPLOY_PIPELINE_HOST_ALIAS  (default: scaleway-pipeline)
#   DEPLOY_APP_HOST_ALIAS       (default: scaleway-app)
#
# APP_PRIV_HOST (optional, default: root@172.16.0.2) — must match APP_VM_SYNC_HOST in pipeline.env.
# APP_PRIV_PORT (optional, default: 22) — SSH port on the app VM private interface.
set -euo pipefail

PIPELINE_SSH="${DEPLOY_PIPELINE_HOST_ALIAS:-scaleway-pipeline}"
APP_SSH="${DEPLOY_APP_HOST_ALIAS:-scaleway-app}"
APP_PRIV_HOST="${1:-root@172.16.0.2}"
APP_PRIV_PORT="${2:-22}"

# The pipeline service runs as this user; its SSH key is under its home dir.
SERVICE_USER="avoimempi-eduskunta"
KEY_PATH="/opt/avoimempi-eduskunta/.ssh/id_ed25519"
SSH_CONFIG="/opt/avoimempi-eduskunta/.ssh/config"

# Extract host without user prefix for SSH config
APP_PRIV_IP="${APP_PRIV_HOST#*@}"

step() { printf '\n==> %s\n' "$*"; }

step "Checking rsync on pipeline VM (${PIPELINE_SSH})..."
if ! ssh "${PIPELINE_SSH}" "command -v rsync >/dev/null 2>&1"; then
  echo "rsync not found — installing..."
  ssh "${PIPELINE_SSH}" "apt-get install -y rsync"
fi
echo "rsync OK"

step "Ensuring SSH key exists on pipeline VM (owned by ${SERVICE_USER})..."
ssh "${PIPELINE_SSH}" "
  set -euo pipefail
  mkdir -p '$(dirname "${KEY_PATH}")'
  chmod 700 '$(dirname "${KEY_PATH}")'
  if [[ ! -f '${KEY_PATH}' ]]; then
    ssh-keygen -t ed25519 -N '' -f '${KEY_PATH}' -C pipeline-to-app
    echo 'Generated new SSH key.'
  else
    echo 'SSH key already exists.'
  fi
  chown -R '${SERVICE_USER}:${SERVICE_USER}' '$(dirname "${KEY_PATH}")'
  chmod 600 '${KEY_PATH}'
"

step "Writing SSH client config for app VM (port ${APP_PRIV_PORT})..."
ssh "${PIPELINE_SSH}" "
  cat > '${SSH_CONFIG}' <<'SSHEOF'
Host ${APP_PRIV_IP}
  Port ${APP_PRIV_PORT}
  User root
  StrictHostKeyChecking accept-new
SSHEOF
  chmod 600 '${SSH_CONFIG}'
  chown '${SERVICE_USER}:${SERVICE_USER}' '${SSH_CONFIG}'
  echo 'SSH config written.'
"

step "Authorizing pipeline VM public key on app VM (${APP_SSH}) root account..."
# The pipeline service connects as root on the app VM to run systemctl restart.
# APP_SSH uses your local ~/.ssh/config (port already configured there).
ssh "${PIPELINE_SSH}" "cat '${KEY_PATH}.pub'" \
  | ssh "${APP_SSH}" '
      mkdir -p /root/.ssh
      chmod 700 /root/.ssh
      while IFS= read -r key; do
        grep -qF "${key}" /root/.ssh/authorized_keys 2>/dev/null \
          || echo "${key}" >> /root/.ssh/authorized_keys
      done
      chmod 600 /root/.ssh/authorized_keys
      echo "authorized_keys updated."
    '

step "Testing pipeline VM (as ${SERVICE_USER}) -> ${APP_PRIV_HOST} SSH connection..."
ssh "${PIPELINE_SSH}" \
  "su -s /bin/bash -c \"ssh -o ConnectTimeout=10 '${APP_PRIV_IP}' echo 'Connection OK'\" '${SERVICE_USER}'"

echo ""
echo "Done. Pipeline VM (${SERVICE_USER}) can now SSH to ${APP_PRIV_HOST} on port ${APP_PRIV_PORT}."
echo "Confirm APP_VM_SYNC_HOST=${APP_PRIV_HOST} in /opt/avoimempi-eduskunta/shared/pipeline.env"
