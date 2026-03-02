#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-help}"
RELEASE_ID="${2:-}"

APP_DIR="${APP_DIR:-/root/avoimempi-eduskunta}"
RELEASES_DIR="${APP_DIR}/releases"
CURRENT_LINK="${APP_DIR}/current"
SERVICE_NAME="${SERVICE_NAME:-avoimempi-eduskunta-app}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1/api/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-1}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

require_release_id() {
  if [[ -z "${RELEASE_ID}" ]]; then
    echo "Error: release id is required" >&2
    exit 1
  fi
}

health_check() {
  local attempt=1
  while [[ "${attempt}" -le "${HEALTH_RETRIES}" ]]; do
    if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${HEALTH_SLEEP_SECONDS}"
    attempt=$((attempt + 1))
  done
  return 1
}

restart_service() {
  systemctl daemon-reload
  systemctl restart "${SERVICE_NAME}.service"
}

activate_release() {
  require_release_id

  local release_path="${RELEASES_DIR}/${RELEASE_ID}"
  if [[ ! -d "${release_path}" ]]; then
    echo "Error: release directory not found: ${release_path}" >&2
    exit 1
  fi

  local previous_target=""
  if [[ -L "${CURRENT_LINK}" || -d "${CURRENT_LINK}" ]]; then
    previous_target="$(readlink -f "${CURRENT_LINK}" || true)"
  fi

  ln -sfn "${release_path}" "${CURRENT_LINK}"
  restart_service

  if health_check; then
    echo "Release '${RELEASE_ID}' is healthy."
    return 0
  fi

  echo "Release '${RELEASE_ID}' failed health check at ${HEALTH_URL}." >&2

  if [[ -n "${previous_target}" && -d "${previous_target}" ]]; then
    echo "Rolling back to previous release: ${previous_target}"
    ln -sfn "${previous_target}" "${CURRENT_LINK}"
    restart_service
    if health_check; then
      echo "Rollback completed and service is healthy."
    else
      echo "Rollback attempted but health check is still failing." >&2
    fi
  fi

  exit 1
}

cleanup_releases() {
  mkdir -p "${RELEASES_DIR}"
  local old_release_ids
  old_release_ids="$(
    ls -1 "${RELEASES_DIR}" 2>/dev/null | sort | head -n "-${KEEP_RELEASES}" || true
  )"
  if [[ -z "${old_release_ids}" ]]; then
    echo "No old releases to prune."
    return 0
  fi

  while IFS= read -r id; do
    [[ -z "${id}" ]] && continue
    if [[ "$(readlink -f "${CURRENT_LINK}" || true)" == "${RELEASES_DIR}/${id}" ]]; then
      continue
    fi
    rm -rf "${RELEASES_DIR:?}/${id}"
    echo "Removed old release: ${id}"
  done <<< "${old_release_ids}"
}

print_help() {
  cat <<EOF
Usage: $0 <action> [release_id]

Actions:
  activate <release_id>   Point current symlink to release and restart service
  cleanup                 Keep only latest KEEP_RELEASES release directories
EOF
}

case "${ACTION}" in
  activate)
    activate_release
    ;;
  cleanup)
    cleanup_releases
    ;;
  help|-h|--help)
    print_help
    ;;
  *)
    print_help
    exit 1
    ;;
esac
