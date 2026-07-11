#!/usr/bin/env bash
# Install ONA on Termux (poco-jhr) — in-process job scheduler + boot script.
#
# Usage:
#   bash install-ona-termux.sh
#   OPERIUM_ROOT=~/srv/cogentia/repos/operium bash install-ona-termux.sh

set -euo pipefail

OPERIUM_ROOT="${OPERIUM_ROOT:-${HOME}/srv/cogentia/repos/operium}"
COGENTIA_ROOT="${COGENTIA_ROOT:-${HOME}/srv/cogentia/repos/cogentia}"
ONA_SECRETS="${ONA_SECRETS:-${HOME}/srv/cogentia/secrets/ona.env}"
ONA_HEARTBEAT_ENV="${ONA_HEARTBEAT_ENV:-${HOME}/srv/cogentia/secrets/ona-heartbeat.env}"
BOOT_DIR="${HOME}/.termux/boot"
ONA_PORT="${ONA_PORT:-8794}"
ONA_HOSTNAME="${ONA_HOSTNAME:-poco-jhr}"

log() { echo "[install-ona-termux] $(date -Is) $*"; }

require_node() {
  if ! command -v node >/dev/null 2>&1; then
    log "node not found — pkg install nodejs (Current, >= 22.13)"
    exit 1
  fi
  local major minor
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  minor="$(node -p 'process.versions.node.split(".")[1]' 2>/dev/null || echo 0)"
  if (( major < 22 )) || { (( major == 22 )) && (( minor < 13 )); }; then
    log "Node >= 22.13 required for node:sqlite (found $(node -v))"
    exit 1
  fi
  if ! node -e "const {DatabaseSync}=require('node:sqlite'); const d=new DatabaseSync(':memory:'); d.close();" 2>/dev/null; then
    log "node:sqlite unavailable on $(node -v) — upgrade Termux Node to Current"
    exit 1
  fi
}

require_paths() {
  if [[ ! -f "${OPERIUM_ROOT}/bin/operium-node-agent.js" ]]; then
    log "Missing ${OPERIUM_ROOT}/bin/operium-node-agent.js"
    exit 1
  fi
  if [[ ! -f "${ONA_SECRETS}" ]]; then
    log "Missing ${ONA_SECRETS} — create ONA_READ_TOKEN, ONA_ADMIN_TOKEN, ONA_PEER_TOKEN, ONA_JOBS=1"
    exit 1
  fi
  if [[ ! -d "${OPERIUM_ROOT}/node_modules/yaml" ]]; then
    (cd "${OPERIUM_ROOT}" && npm install --omit=dev)
  fi
}

ensure_ona_jobs_env() {
  if ! grep -q '^ONA_JOBS=' "${ONA_SECRETS}"; then
    echo 'ONA_JOBS=1' >> "${ONA_SECRETS}"
  fi
  if [[ ! -f "${ONA_HEARTBEAT_ENV}" ]] && [[ -f "${HOME}/srv/cogentia/secrets/agent-gateway-blackboard.env" ]]; then
    cp "${HOME}/srv/cogentia/secrets/agent-gateway-blackboard.env" "${ONA_HEARTBEAT_ENV}"
  fi
}

write_boot_script() {
  mkdir -p "${BOOT_DIR}" "${HOME}/.cogentia/var" "${HOME}/srv/cogentia/logs"
  local boot="${BOOT_DIR}/operium-node-agent"
  cat >"${boot}" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
OPERIUM_ROOT="${OPERIUM_ROOT}"
ONA_SECRETS="${ONA_SECRETS}"
ONA_HEARTBEAT_ENV="${ONA_HEARTBEAT_ENV}"
LOG="${HOME}/srv/cogentia/logs/operium-node-agent.log"
export COGENTIA_OPS_STATE_DIR="${HOME}/.cogentia/var"
export ONA_BIND=0.0.0.0
export ONA_PORT=${ONA_PORT}
export ONA_HOSTNAME=${ONA_HOSTNAME}
export ONA_JOBS=1
export ONA_HEALTH_PUBLIC=1
export OPERIUM_REGISTRY="${HOME}/srv/cogentia/repos/registre-mariani/operium/registry/resources.yaml"
set -a
[[ -f "\${ONA_SECRETS}" ]] && . "\${ONA_SECRETS}"
[[ -f "\${ONA_HEARTBEAT_ENV}" ]] && . "\${ONA_HEARTBEAT_ENV}"
set +a
cd "\${OPERIUM_ROOT}"
exec node bin/operium-node-agent.js >>"\${LOG}" 2>&1
EOF
  chmod +x "${boot}"
  log "Boot script: ${boot}"
}

disable_legacy_heartbeat_boot() {
  local legacy="${BOOT_DIR}/ona-heartbeat"
  if [[ -f "${legacy}" ]]; then
    mv "${legacy}" "${legacy}.disabled.$(date +%s)"
    log "Disabled legacy ${legacy}"
  fi
}

start_now() {
  pkill -f 'operium-node-agent.js' 2>/dev/null || true
  sleep 1
  bash "${BOOT_DIR}/operium-node-agent" &
  sleep 4
}

verify_health() {
  local url="http://127.0.0.1:${ONA_PORT}/health"
  if curl -fsS -m 5 "${url}" >/dev/null 2>&1; then
    log "Health OK: ${url}"
    return 0
  fi
  log "Health probe failed: ${url}"
  return 1
}

main() {
  require_node
  require_paths
  ensure_ona_jobs_env
  write_boot_script
  disable_legacy_heartbeat_boot
  start_now
  verify_health
  log "ONA installed on Termux — reboot Termux app to verify ~/.termux/boot/operium-node-agent"
}

main "$@"