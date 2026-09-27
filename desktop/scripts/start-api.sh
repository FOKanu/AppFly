#!/usr/bin/env bash
# Purpose: Start the AppFly loopback API for the Neutralino shell.
# Inputs: Optional APPFLY_ALLOWED_ORIGINS (set by bootstrap.js).
# Does not: Bind off 127.0.0.1 or print secrets.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${DESKTOP_ROOT}/.." && pwd)"
BACKEND="${REPO_ROOT}/backend"
VENV_PY="${BACKEND}/.venv/bin/python"

cd "${REPO_ROOT}"

if [[ -x "${VENV_PY}" ]]; then
  exec "${VENV_PY}" -m jobhunt.api
fi

if command -v uv >/dev/null 2>&1; then
  cd "${BACKEND}"
  exec uv run python -m jobhunt.api
fi

export PYTHONPATH="${BACKEND}/src${PYTHONPATH:+:${PYTHONPATH}}"
exec python3 -m jobhunt.api
