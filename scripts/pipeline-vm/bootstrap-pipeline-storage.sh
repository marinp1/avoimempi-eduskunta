#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"

# Current location of row-store files to migrate from.
SOURCE_ROW_STORE_DIR="${SOURCE_ROW_STORE_DIR:-${APP_DIR}/data}"

# Target mount-backed directory used by scraper/parser on the pipeline VM.
STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR:-/mnt/pipeline-raw-parsed/data}"

# Set FORCE_COPY=1 to overwrite existing destination files.
FORCE_COPY="${FORCE_COPY:-0}"

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

copy_file_if_present() {
  local name="$1"
  local src="${SOURCE_ROW_STORE_DIR}/${name}"
  local dst="${STORAGE_LOCAL_DIR}/${name}"

  if [[ ! -f "${src}" ]]; then
    return 0
  fi

  if [[ -f "${dst}" && "${FORCE_COPY}" != "1" ]]; then
    log "Skipping ${name}: destination already exists (set FORCE_COPY=1 to overwrite)."
    return 0
  fi

  cp -f "${src}" "${dst}"
  log "Copied ${src} -> ${dst}"
}

main() {
  log "Bootstrapping pipeline row-store files."
  log "Source: ${SOURCE_ROW_STORE_DIR}"
  log "Target: ${STORAGE_LOCAL_DIR}"

  if [[ ! -d "${SOURCE_ROW_STORE_DIR}" ]]; then
    echo "Error: source row-store directory not found: ${SOURCE_ROW_STORE_DIR}" >&2
    exit 1
  fi

  mkdir -p "${STORAGE_LOCAL_DIR}"

  copy_file_if_present "raw.db"
  copy_file_if_present "raw.db-wal"
  copy_file_if_present "raw.db-shm"
  copy_file_if_present "parsed.db"
  copy_file_if_present "parsed.db-wal"
  copy_file_if_present "parsed.db-shm"

  log "Bootstrap completed."
  ls -lh "${STORAGE_LOCAL_DIR}" | sed 's/^/  /'
}

main "$@"
