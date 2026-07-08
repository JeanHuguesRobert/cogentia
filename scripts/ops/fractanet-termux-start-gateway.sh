#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ENV_FILE="${HOME}/srv/cogentia/secrets/agent-gateway.env"
COGENTIA_ROOT="${HOME}/srv/cogentia/repos/cogentia"
LOG_FILE="${HOME}/.cogentia/var/agent-gateway.log"

mkdir -p "${HOME}/.cogentia/var"
if [ -f "${ENV_FILE}" ]; then
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
fi

export AGENT_GATEWAY_BIND="${AGENT_GATEWAY_BIND:-all}"
export PATH="${HOME}/.local/bin:${HOME}/.grok/bin:${PATH}"

if ps aux 2>/dev/null | grep -q '[n]ode scripts/agent-gateway.js'; then
  echo "[agent-gateway] already running"
  exit 0
fi

cd "${COGENTIA_ROOT}"
nohup node scripts/agent-gateway.js >>"${LOG_FILE}" 2>&1 &
sleep 2
curl -sf -H "Authorization: Bearer ${AGENT_GATEWAY_TOKEN}" "http://127.0.0.1:${AGENT_GATEWAY_PORT:-8793}/health" && echo " OK"