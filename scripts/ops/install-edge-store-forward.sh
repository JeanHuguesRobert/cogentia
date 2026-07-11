#!/usr/bin/env bash
# Install edge store-and-forward on rpi3-view (pure Node ESM, file outbox — no node:sqlite).
#
# Usage:
#   bash install-edge-store-forward.sh
#   COGENTIA_ROOT=~/srv/cogentia/repos/cogentia bash install-edge-store-forward.sh

set -euo pipefail

COGENTIA_ROOT="${COGENTIA_ROOT:-${HOME}/srv/cogentia/repos/cogentia}"
EDGE_DIR="${COGENTIA_ROOT}/scripts/ops/edge"
STATE_DIR="${EDGE_STATE_DIR:-${HOME}/.cogentia/var/edge}"
LOG_DIR="${HOME}/srv/cogentia/logs"
SERVICE_USER="${USER}"
if [[ -n "${NODE_BIN:-}" ]]; then
  :
elif [[ -x "${HOME}/.local/bin/node" ]]; then
  NODE_BIN="${HOME}/.local/bin/node"
else
  NODE_BIN="$(command -v node || true)"
fi

log() { echo "[install-edge-sf] $(date -Is) $*"; }

if [[ ! -f "${EDGE_DIR}/forwarder.js" ]]; then
  log "Missing ${EDGE_DIR}/forwarder.js — sync cogentia repo first"
  exit 1
fi
if [[ -z "${NODE_BIN}" ]]; then
  log "node not found on PATH"
  exit 1
fi

mkdir -p "${STATE_DIR}/outbox/pending" "${STATE_DIR}/outbox/failed" "${LOG_DIR}"

if ! "${NODE_BIN}" -e "fetch('https://example.com').catch(()=>{})" >/dev/null 2>&1; then
  log "Node $( "${NODE_BIN}" -v ) lacks global fetch — need Node >= 18"
  exit 1
fi

FORWARD_UNIT=/etc/systemd/system/edge-store-forward.service
HEARTBEAT_UNIT=/etc/systemd/system/edge-site-heartbeat.service
HEARTBEAT_TIMER=/etc/systemd/system/edge-site-heartbeat.timer

sudo tee "${FORWARD_UNIT}" >/dev/null <<EOF
[Unit]
Description=FractaNet edge store-and-forward drain (rpi3-view)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${EDGE_DIR}
Environment=EDGE_STATE_DIR=${STATE_DIR}
Environment=EDGE_FORWARD_INTERVAL_MS=120000
EnvironmentFile=-${HOME}/srv/cogentia/secrets/domotics.env
EnvironmentFile=-${HOME}/srv/cogentia/secrets/viewer.env
ExecStart=${NODE_BIN} forwarder.js
Restart=on-failure
RestartSec=10
StandardOutput=append:${LOG_DIR}/edge-store-forward.log
StandardError=append:${LOG_DIR}/edge-store-forward.log

[Install]
WantedBy=multi-user.target
EOF

sudo tee "${HEARTBEAT_UNIT}" >/dev/null <<EOF
[Unit]
Description=FractaNet site.edge heartbeat with store-on-failure
After=network-online.target

[Service]
Type=oneshot
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${EDGE_DIR}
Environment=EDGE_STATE_DIR=${STATE_DIR}
Environment=EDGE_STORE_ON_FAILURE=1
Environment=EDGE_HOSTNAME=rpi3-view
EnvironmentFile=-${HOME}/srv/cogentia/secrets/domotics.env
EnvironmentFile=-${HOME}/srv/cogentia/secrets/viewer.env
ExecStart=${NODE_BIN} site-edge-heartbeat.js
StandardOutput=append:${LOG_DIR}/edge-site-heartbeat.log
StandardError=append:${LOG_DIR}/edge-site-heartbeat.log
EOF

sudo tee "${HEARTBEAT_TIMER}" >/dev/null <<EOF
[Unit]
Description=Periodic site.edge heartbeat (rpi3-view)

[Timer]
OnBootSec=2min
OnUnitActiveSec=3min
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now edge-store-forward.service
sudo systemctl enable --now edge-site-heartbeat.timer

log "Installed edge store-forward (SNMP trap-directed polling)"
log "  forwarder: edge-store-forward.service"
log "  heartbeat: edge-site-heartbeat.timer (TTL safety net, every 3 min)"
log "  traps:     node emit-trap.js domotics.sensor --detail '{...}'"
log "  manager:   POST \${COGENTIA_BLACKBOARD_URL}/ops/edge/trap"
log "  state:     ${STATE_DIR}/outbox/"
log "  pattern:   cogentia/docs/edge-trap-directed-polling.md"
log "  logs:      ${LOG_DIR}/edge-store-forward.log"