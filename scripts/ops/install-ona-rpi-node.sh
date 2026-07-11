#!/usr/bin/env bash
# Upgrade Node.js on Raspberry Pi (arm64) for ONA, then install via systemd.
#
# armv7 (32-bit Pi OS) cannot run ONA — node:sqlite is not built for armv7.
# Reflash to Raspberry Pi OS 64-bit, then run this script.
#
# Usage (on rpi3-view):
#   bash install-ona-rpi-node-binary.sh   # user-level Node to ~/.local
#   sudo bash install-ona-rpi-node.sh     # systemd unit (after binary install)

set -euo pipefail

OPERIUM_ROOT="${OPERIUM_ROOT:-/home/jh/srv/cogentia/repos/operium}"
COGENTIA_ROOT="${COGENTIA_ROOT:-/home/jh/srv/cogentia/repos/cogentia}"
ONA_SECRETS="${ONA_SECRETS:-/home/jh/srv/cogentia/secrets/ona.env}"
SERVICE_USER="${SERVICE_USER:-jh}"
NODE_VERSION="${NODE_VERSION:-24.12.0}"

log() { echo "[install-ona-rpi] $(date -Is) $*"; }

arch="$(uname -m)"
if [[ "${arch}" == armv7l || "${arch}" == armv6l ]]; then
  log "arch=${arch}: ONA requires arm64 Pi OS (node:sqlite not available on armv7)"
  exit 1
fi

main() {
  if [[ "${EUID}" -ne 0 ]]; then
    log "Run with sudo"
    exit 1
  fi

  sudo -u "${SERVICE_USER}" NODE_VERSION="${NODE_VERSION}" \
    bash "${COGENTIA_ROOT}/scripts/ops/install-ona-rpi-node-binary.sh"

  NODE_BIN="/home/${SERVICE_USER}/.local/bin/node"
  if [[ ! -x "${NODE_BIN}" ]]; then
    log "Node binary missing at ${NODE_BIN}"
    exit 1
  fi

  OPERIUM_ROOT="${OPERIUM_ROOT}" \
  ONA_SECRETS_FILE="${ONA_SECRETS}" \
  SERVICE_USER="${SERVICE_USER}" \
  ONA_HOSTNAME="rpi3-view" \
  COGENTIA_OPS_STATE_DIR="/home/${SERVICE_USER}/.cogentia/var" \
  bash "${COGENTIA_ROOT}/scripts/ops/install-ona-systemd.sh"

  # systemd unit uses /usr/bin/env node — patch ExecStart to user Node if needed
  if ! sudo -u "${SERVICE_USER}" node -e "require('node:sqlite')" 2>/dev/null; then
    sed -i "s|ExecStart=/usr/bin/env node|ExecStart=${NODE_BIN}|" /etc/systemd/system/operium-node-agent.service
    systemctl daemon-reload
    systemctl restart operium-node-agent.service
  fi
}

main "$@"