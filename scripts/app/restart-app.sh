#!/usr/bin/env bash
# Restarts all app service replicas.
# This script is the sudoers target for the pipeline user — keep it owned by root.
set -euo pipefail

readarray -t units < <(
  systemctl list-units --plain --no-legend --full --all 'avoimempi-eduskunta-app*.service' 2>/dev/null \
    | awk '{print $1}'
)

if [[ ${#units[@]} -eq 0 ]]; then
  echo "No avoimempi-eduskunta-app*.service units found." >&2
  exit 1
fi

systemctl restart "${units[@]}"
