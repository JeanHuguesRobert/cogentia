#!/usr/bin/env bash
# Install Current Node.js from official tarball (arm64/x64) for ONA node:sqlite.
#
# ONA requires built-in node:sqlite (Node >= 22.13). armv7 (32-bit Pi OS) is not
# supported — reflash to Raspberry Pi OS 64-bit first.
#
# Usage:
#   bash install-ona-rpi-node-binary.sh
#   NODE_VERSION=24.12.0 bash install-ona-rpi-node-binary.sh

set -euo pipefail

NODE_VERSION="${NODE_VERSION:-24.12.0}"
INSTALL_PREFIX="${INSTALL_PREFIX:-${HOME}/.local}"
OPERIUM_ROOT="${OPERIUM_ROOT:-${HOME}/srv/cogentia/repos/operium}"

log() { echo "[install-ona-rpi-binary] $(date -Is) $*"; }

arch="$(uname -m)"
case "${arch}" in
  armv7l|armv6l)
    log "arch=${arch}: Node builds for armv7 omit node:sqlite"
    log "Reflash rpi3-view to Raspberry Pi OS 64-bit (arm64), then re-run this script"
    exit 1
    ;;
  aarch64|arm64) NODE_ARCH=arm64 ;;
  x86_64|amd64) NODE_ARCH=x64 ;;
  *) log "unsupported arch: ${arch}"; exit 1 ;;
esac

require_node_sqlite() {
  if ! node -e "const {DatabaseSync}=require('node:sqlite'); const d=new DatabaseSync(':memory:'); d.close();" 2>/dev/null; then
    log "node:sqlite unavailable on $(node -v) $(uname -m)"
    log "Use Node >= 22.13 Current/LTS on arm64 or x64"
    exit 1
  fi
}

node_major() {
  node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0
}

TARBALL="node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
URL="https://nodejs.org/dist/v${NODE_VERSION}/${TARBALL}"
CACHE="${HOME}/.cache/fractanet"
mkdir -p "${CACHE}" "${INSTALL_PREFIX}"

if ! command -v node >/dev/null 2>&1 || [[ "$(node_major)" -lt 22 ]] || ! node -e "require('node:sqlite')" 2>/dev/null; then
  log "Downloading ${URL}"
  curl -fsSL "${URL}" -o "${CACHE}/${TARBALL}"
  rm -rf "${CACHE}/node-v${NODE_VERSION}-linux-${NODE_ARCH}"
  tar -xJf "${CACHE}/${TARBALL}" -C "${CACHE}"
  rsync -a "${CACHE}/node-v${NODE_VERSION}-linux-${NODE_ARCH}/" "${INSTALL_PREFIX}/"
  log "Installed $("${INSTALL_PREFIX}/bin/node" -v) -> ${INSTALL_PREFIX}"
fi

export PATH="${INSTALL_PREFIX}/bin:${PATH}"
hash -r
log "node $(node -v) arch=${arch}"
require_node_sqlite

if [[ -d "${OPERIUM_ROOT}" ]] && [[ ! -d "${OPERIUM_ROOT}/node_modules/yaml" ]]; then
  log "Installing operium deps (yaml only — SQLite is built into Node)"
  (cd "${OPERIUM_ROOT}" && npm install --omit=dev)
fi

if [[ -f "${OPERIUM_ROOT}/bin/operium-node-agent.js" ]] && [[ -f "${HOME}/srv/cogentia/secrets/ona.env" ]]; then
  log "ONA secrets found — run install-ona-systemd.sh with sudo if systemd unit desired"
  log "Or: cd ${OPERIUM_ROOT} && ONA_JOBS=1 node bin/operium-node-agent.js"
else
  log "Sync operium + create ~/srv/cogentia/secrets/ona.env before starting ONA"
fi