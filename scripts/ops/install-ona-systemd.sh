#!/usr/bin/env bash
# Install Operium Node Agent (ONA) on Linux — in-process job scheduler (no separate heartbeat timer).
#
# Usage:
#   sudo bash install-ona-systemd.sh
#   sudo OPERIUM_ROOT=/srv/cogentia/repos/operium bash install-ona-systemd.sh
#   sudo ONA_BIND=0.0.0.0 ONA_SECRETS_FILE=/srv/cogentia/secrets/ona.env bash install-ona-systemd.sh
#
# Prerequisites:
#   - Node.js >= 22.13 with built-in node:sqlite (Current/LTS on arm64 or x64)
#   - operium checkout at OPERIUM_ROOT (contains bin/operium-node-agent.js)
#   - secrets file with ONA_READ_TOKEN, ONA_ADMIN_TOKEN, ONA_PEER_TOKEN, ONA_JOBS=1

set -euo pipefail

OPERIUM_ROOT="${OPERIUM_ROOT:-/srv/cogentia/repos/operium}"
ONA_SECRETS_FILE="${ONA_SECRETS_FILE:-/srv/cogentia/secrets/ona.env}"
ONA_HEARTBEAT_ENV="${ONA_HEARTBEAT_ENV:-/srv/cogentia/secrets/ona-heartbeat.env}"
ONA_BIND="${ONA_BIND:-0.0.0.0}"
ONA_PORT="${ONA_PORT:-8794}"
ONA_HOSTNAME="${ONA_HOSTNAME:-fracta}"
SERVICE_USER="${SERVICE_USER:-ubuntu}"
STATE_DIR="${COGENTIA_OPS_STATE_DIR:-/var/lib/cogentia}"
LOG_DIR="${ONA_LOG_DIR:-/var/lib/cogentia/logs}"
REGISTRY_PATH="${OPERIUM_REGISTRY:-/srv/cogentia/repos/registre-mariani/operium/registry/resources.yaml}"
ONA_JOBS="${ONA_JOBS:-1}"
ONA_JOB_INTERVAL_MS="${ONA_JOB_INTERVAL_MS:-180000}"

AGENT_UNIT="operium-node-agent.service"
LEGACY_HEARTBEAT_TIMER="ona-heartbeat.timer"
LEGACY_HEARTBEAT_SERVICE="ona-heartbeat.service"

log() {
  echo "[install-ona] $(date -Is) $*"
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    log "Run as root (sudo)."
    exit 1
  fi
}

require_node_sqlite() {
  if ! command -v node >/dev/null 2>&1; then
    log "node not found on PATH"
    exit 1
  fi
  if ! node -e "const {DatabaseSync}=require('node:sqlite'); const d=new DatabaseSync(':memory:'); d.close();" 2>/dev/null; then
    log "node:sqlite unavailable on $(node -v) $(uname -m)"
    log "Upgrade to Node >= 22.13 Current/LTS (arm64 or x64 — not armv7)"
    exit 1
  fi
}

require_paths() {
  require_node_sqlite
  if [[ ! -f "${OPERIUM_ROOT}/bin/operium-node-agent.js" ]]; then
    log "operium-node-agent.js not found under ${OPERIUM_ROOT}"
    exit 1
  fi
  if [[ ! -f "${ONA_SECRETS_FILE}" ]]; then
    log "ONA secrets file missing: ${ONA_SECRETS_FILE}"
    log "Create it with ONA_READ_TOKEN, ONA_ADMIN_TOKEN, ONA_PEER_TOKEN, ONA_ENABLED=1, ONA_JOBS=1"
    exit 1
  fi
}

ensure_ona_jobs_env() {
  if ! grep -q '^ONA_JOBS=' "${ONA_SECRETS_FILE}"; then
    echo 'ONA_JOBS=1' >> "${ONA_SECRETS_FILE}"
    log "Appended ONA_JOBS=1 to ${ONA_SECRETS_FILE}"
  fi
  if [[ -f "${ONA_HEARTBEAT_ENV}" ]]; then
    grep -q '^COGENTIA_BLACKBOARD_URL=' "${ONA_HEARTBEAT_ENV}" 2>/dev/null || true
  fi
}

write_agent_unit() {
  cat >"/etc/systemd/system/${AGENT_UNIT}" <<EOF
[Unit]
Description=Operium Node Agent (ONA) control plane
After=network-online.target mcp-cogentia.service
Wants=network-online.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${OPERIUM_ROOT}
Environment=COGENTIA_OPS_STATE_DIR=${STATE_DIR}
Environment=ONA_BIND=${ONA_BIND}
Environment=ONA_PORT=${ONA_PORT}
Environment=ONA_HOSTNAME=${ONA_HOSTNAME}
Environment=ONA_HEALTH_PUBLIC=1
Environment=ONA_JOBS=${ONA_JOBS}
Environment=ONA_JOB_INTERVAL_MS=${ONA_JOB_INTERVAL_MS}
Environment=OPERIUM_REGISTRY=${REGISTRY_PATH}
Environment=COGENTIA_BLACKBOARD_URL=http://127.0.0.1:8791
EnvironmentFile=-${ONA_SECRETS_FILE}
EnvironmentFile=-${ONA_HEARTBEAT_ENV}
ExecStart=/usr/bin/env node ${OPERIUM_ROOT}/bin/operium-node-agent.js
Restart=on-failure
RestartSec=5
StandardOutput=append:${LOG_DIR}/operium-node-agent.log
StandardError=append:${LOG_DIR}/operium-node-agent.log

[Install]
WantedBy=multi-user.target
EOF
}

disable_legacy_heartbeat_timer() {
  if systemctl list-unit-files "${LEGACY_HEARTBEAT_TIMER}" >/dev/null 2>&1; then
    systemctl stop "${LEGACY_HEARTBEAT_TIMER}" 2>/dev/null || true
    systemctl disable "${LEGACY_HEARTBEAT_TIMER}" 2>/dev/null || true
    log "Disabled legacy ${LEGACY_HEARTBEAT_TIMER} (ONA runs heartbeats as jobs)"
  fi
  if systemctl list-unit-files "${LEGACY_HEARTBEAT_SERVICE}" >/dev/null 2>&1; then
    systemctl stop "${LEGACY_HEARTBEAT_SERVICE}" 2>/dev/null || true
    systemctl disable "${LEGACY_HEARTBEAT_SERVICE}" 2>/dev/null || true
  fi
}

enable_units() {
  systemctl daemon-reload
  systemctl enable "${AGENT_UNIT}"
  systemctl restart "${AGENT_UNIT}" || {
    log "ONA failed to start — check journalctl -u ${AGENT_UNIT}"
    exit 1
  }
}

verify_health() {
  local url="http://127.0.0.1:${ONA_PORT}/health"
  local attempt=1
  while (( attempt <= 15 )); do
    if curl -fsS -m 3 "${url}" >/dev/null 2>&1; then
      log "Health OK: ${url}"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  log "Health probe failed: ${url}"
  return 1
}

main() {
  require_root
  require_paths
  ensure_ona_jobs_env
  mkdir -p "${LOG_DIR}" "${STATE_DIR}"
  chown -R "${SERVICE_USER}:${SERVICE_USER}" "${LOG_DIR}" "${STATE_DIR}" || true
  write_agent_unit
  disable_legacy_heartbeat_timer
  enable_units
  verify_health
  log "Installed ${AGENT_UNIT} with ONA_JOBS=${ONA_JOBS}"
  log "Legacy heartbeat timer disabled — jobs run inside ONA"
  log "Aggregator proxy: set COGENTIA_OPS_READ_TOKEN + ONA_READ_TOKEN on mcp-cogentia"
}

main "$@"