#!/data/data/com.termux/files/usr/bin/bash
# Periodic blackboard heartbeat for agent-cli-gateway (run via cron or boot loop).
set -euo pipefail

COGENTIA_ROOT="${HOME}/srv/cogentia/repos/cogentia"
export AGENT_GATEWAY_ATTRACTOR_ENV_FILE="${HOME}/srv/cogentia/secrets/agent-gateway.env"
export AGENT_GATEWAY_ENV_FILE="${HOME}/srv/cogentia/secrets/agent-gateway-blackboard.env"

if [ ! -f "${AGENT_GATEWAY_ENV_FILE}" ]; then
  echo "[agent-gateway-heartbeat] missing ${AGENT_GATEWAY_ENV_FILE}" >&2
  exit 2
fi

cd "${COGENTIA_ROOT}"
node scripts/ops/agent-gateway-heartbeat.js