#!/usr/bin/env bash

find_bun_binary() {
  if command -v bun >/dev/null 2>&1; then
    command -v bun
    return 0
  fi

  if [[ -x "${HOME}/.bun/bin/bun" ]]; then
    printf '%s\n' "${HOME}/.bun/bin/bun"
    return 0
  fi

  echo "Error: Bun not found on server." >&2
  return 1
}
