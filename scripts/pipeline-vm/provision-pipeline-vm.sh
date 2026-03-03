#!/usr/bin/env bash
# First-time setup for the Pipeline VM.
# Run this once after `bun deploy:pipeline`.
set -euo pipefail

APP_DIR="/root/avoimempi-eduskunta"
ENV_FILE="${APP_DIR}/shared/pipeline.env"

# Ensure bun is on PATH for systemd services (which don't inherit shell profiles)
if [[ ! -x /usr/local/bin/bun ]] && [[ -x "${HOME}/.bun/bin/bun" ]]; then
  ln -sf "${HOME}/.bun/bin/bun" /usr/local/bin/bun
  echo "Linked bun -> /usr/local/bin/bun"
fi

mkdir -p "${APP_DIR}/shared"

if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" <<'EOF'
# SSH target on the app VM for DB sync (user@host over private network).
# The pipeline VM must be able to SSH to this host.
APP_VM_SYNC_HOST=root@avoimempi-eduskunta-app.priv
EOF
  echo "Created ${ENV_FILE}"
  echo ""
  echo "Edit APP_VM_SYNC_HOST, then run:"
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
