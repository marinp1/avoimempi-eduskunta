#!/usr/bin/env bash

set_app_db_sync_defaults() {
  APP_SYNC_DEST="${APP_SYNC_DEST:-}"
  APP_SYNC_CURRENT_LINK="${APP_SYNC_CURRENT_LINK:-${APP_SYNC_DEST:-/mnt/app-db/current.db}}"
  APP_SYNC_RELEASES_DIR="${APP_SYNC_RELEASES_DIR:-$(dirname "${APP_SYNC_CURRENT_LINK}")/releases}"
  APP_VM_ACTIVATE_SERVICE="${APP_VM_ACTIVATE_SERVICE:-avoimempi-eduskunta-app*.service}"
  APP_SYNC_KEEP_RELEASES="${APP_SYNC_KEEP_RELEASES:-5}"
  APP_READY_URL="${APP_READY_URL:-http://127.0.0.1/api/ready}"
  APP_READY_RETRIES="${APP_READY_RETRIES:-60}"
  APP_READY_SLEEP_SECONDS="${APP_READY_SLEEP_SECONDS:-1}"
}

print_app_db_sync_env_lines() {
  cat <<EOF
APP_SYNC_CURRENT_LINK=${APP_SYNC_CURRENT_LINK}
APP_SYNC_RELEASES_DIR=${APP_SYNC_RELEASES_DIR}
APP_VM_ACTIVATE_SERVICE=${APP_VM_ACTIVATE_SERVICE}
APP_SYNC_KEEP_RELEASES=${APP_SYNC_KEEP_RELEASES}
APP_READY_URL=${APP_READY_URL}
APP_READY_RETRIES=${APP_READY_RETRIES}
APP_READY_SLEEP_SECONDS=${APP_READY_SLEEP_SECONDS}
EOF
}

print_app_db_sync_env_inline() {
  printf ' APP_SYNC_CURRENT_LINK=%s APP_SYNC_RELEASES_DIR=%s APP_VM_ACTIVATE_SERVICE=%s APP_SYNC_KEEP_RELEASES=%s APP_READY_URL=%s APP_READY_RETRIES=%s APP_READY_SLEEP_SECONDS=%s' \
    "${APP_SYNC_CURRENT_LINK}" "${APP_SYNC_RELEASES_DIR}" "${APP_VM_ACTIVATE_SERVICE}" "${APP_SYNC_KEEP_RELEASES}" "${APP_READY_URL}" "${APP_READY_RETRIES}" "${APP_READY_SLEEP_SECONDS}"
}

sync_db_to_app_vm() {
  local app_vm_sync_host="${1:-}"
  local db_path="${2:-}"
  local release_id remote_tmp remote_release

  if [[ -z "${app_vm_sync_host}" ]]; then
    echo "Error: APP_VM_SYNC_HOST must be set for DB sync" >&2
    return 1
  fi

  if [[ -z "${db_path}" || ! -f "${db_path}" ]]; then
    echo "Error: DB artifact not found at '${db_path}'" >&2
    return 1
  fi

  release_id="$(date -u +"%Y%m%dT%H%M%SZ")"
  remote_tmp="${APP_SYNC_RELEASES_DIR}/.incoming-${release_id}.db"
  remote_release="${APP_SYNC_RELEASES_DIR}/avoimempi-eduskunta-${release_id}.db"

  echo "Uploading DB artifact to ${app_vm_sync_host}:${remote_tmp}..."
  ssh "${app_vm_sync_host}" "mkdir -p '${APP_SYNC_RELEASES_DIR}'"
  rsync -az --delay-updates -- "${db_path}" "${app_vm_sync_host}:${remote_tmp}"

  echo "Activating DB release on app VM (${remote_release} -> ${APP_SYNC_CURRENT_LINK})..."
  ssh "${app_vm_sync_host}" \
    "REMOTE_TMP='${remote_tmp}' REMOTE_RELEASE='${remote_release}' CURRENT_LINK='${APP_SYNC_CURRENT_LINK}' KEEP_RELEASES='${APP_SYNC_KEEP_RELEASES}' ACTIVATE_SERVICE='${APP_VM_ACTIVATE_SERVICE}' READY_URL='${APP_READY_URL}' READY_RETRIES='${APP_READY_RETRIES}' READY_SLEEP_SECONDS='${APP_READY_SLEEP_SECONDS}' bash -s" <<'EOSH'
set -euo pipefail
mkdir -p "$(dirname "${REMOTE_RELEASE}")" "$(dirname "${CURRENT_LINK}")"
mv "${REMOTE_TMP}" "${REMOTE_RELEASE}"
ln -sfn "${REMOTE_RELEASE}" "${CURRENT_LINK}"
if [[ "${KEEP_RELEASES}" =~ ^[0-9]+$ ]] && (( KEEP_RELEASES > 0 )); then
  ls -1t "$(dirname "${REMOTE_RELEASE}")"/avoimempi-eduskunta-*.db 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -f --
fi
if [[ -n "${ACTIVATE_SERVICE}" ]]; then
  systemctl restart "${ACTIVATE_SERVICE}"
fi
attempt=1
while [[ "${attempt}" -le "${READY_RETRIES}" ]]; do
  if curl -fsS "${READY_URL}" >/dev/null 2>&1; then
    exit 0
  fi
  sleep "${READY_SLEEP_SECONDS}"
  attempt=$((attempt + 1))
done
echo "Readiness check failed at ${READY_URL} after ${READY_RETRIES} attempts" >&2
exit 1
EOSH

  echo "Sync and activation complete."
}
