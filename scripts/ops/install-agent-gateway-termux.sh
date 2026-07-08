#!/data/data/com.termux/files/usr/bin/bash
# Agent CLI Gateway on Termux (poco-jhr). Binds Tailscale IP with bearer token.
#
# Prereqs:
#   - cogentia at ~/srv/cogentia/repos/cogentia (with agent-gateway.js on main)
#   - fractanet-mobile-proot-agents.sh for agent-codex / agent-claude
#   - tailscale CLI in PATH
#
# Usage: bash install-agent-gateway-termux.sh

set -euo pipefail

COGENTIA_ROOT="${COGENTIA_ROOT:-$HOME/srv/cogentia/repos/cogentia}"
SECRETS_DIR="${HOME}/srv/cogentia/secrets"
ENV_FILE="${SECRETS_DIR}/agent-gateway.env"
BOOT_DIR="${HOME}/.termux/boot"
BOOT_SCRIPT="${BOOT_DIR}/agent-gateway"
GATEWAY_PORT="${AGENT_GATEWAY_PORT:-8793}"
LOG_DIR="${HOME}/.cogentia/var"
LOG_FILE="${LOG_DIR}/agent-gateway.log"

if [ ! -f "${COGENTIA_ROOT}/scripts/agent-gateway.js" ]; then
  echo "[agent-gateway] cogentia not found at ${COGENTIA_ROOT}" >&2
  exit 1
fi

if [ -f "${COGENTIA_ROOT}/package.json" ] && command -v pnpm >/dev/null 2>&1; then
  echo "[agent-gateway] installing deps (node-pty for REPL mode)..."
  (
    cd "${COGENTIA_ROOT}"
    pnpm config set onlyBuiltDependencies "node-pty" 2>/dev/null || true
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    pnpm rebuild node-pty 2>/dev/null || true
  )
fi

mkdir -p "${SECRETS_DIR}" "${BOOT_DIR}" "${LOG_DIR}"
chmod 700 "${SECRETS_DIR}"

if [ -f "${ENV_FILE}" ]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
fi

if [ -z "${AGENT_GATEWAY_TOKEN:-}" ]; then
  AGENT_GATEWAY_TOKEN="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"
  echo "[agent-gateway] generated new bearer token"
fi

TS_IP=""
BIND_MODE="all"
if command -v tailscale >/dev/null 2>&1; then
  TS_IP="$(tailscale ip -4 2>/dev/null | head -1 || true)"
  if [ -n "${TS_IP}" ]; then
    BIND_MODE="tailscale"
  fi
else
  echo "[agent-gateway] tailscale CLI not in Termux PATH — bind=all (reachable over tailnet)"
fi

cat > "${ENV_FILE}" <<EOF
# Agent CLI Gateway — sourced by ~/.termux/boot/agent-gateway
export AGENT_GATEWAY_BIND=${BIND_MODE}
export AGENT_GATEWAY_PORT=${GATEWAY_PORT}
export AGENT_GATEWAY_TOKEN=${AGENT_GATEWAY_TOKEN}
export AGENT_GATEWAY_REPO_ROOTS="${HOME}/srv/cogentia/repos"
export AGENT_GATEWAY_MAX_CONCURRENT=2
export PATH="${HOME}/.local/bin:${HOME}/.grok/bin:\${PATH}"
EOF
chmod 600 "${ENV_FILE}"

BLACKBOARD_ENV="${SECRETS_DIR}/agent-gateway-blackboard.env"
if [ ! -f "${BLACKBOARD_ENV}" ]; then
  cat > "${BLACKBOARD_ENV}" <<'BBEOF'
# Fracta blackboard upsert for agent-cli-gateway (fill after ThinkPad attractor env is available)
# export COGENTIA_BLACKBOARD_URL=https://cogentia.fractavolta.com
# export COGENTIA_BLACKBOARD_UPSERT_TOKEN=
export AGENT_GATEWAY_ATTRACTOR_ID=attractor:poco-jhr:agent-cli-gateway
export AGENT_GATEWAY_ATTRACTOR_NODE_ID=resource://poco-jhr
export AGENT_GATEWAY_ATTRACTOR_ENDPOINT=http://poco-jhr:8793
export AGENT_GATEWAY_ATTRACTOR_TTL_SECONDS=300
BBEOF
  chmod 600 "${BLACKBOARD_ENV}"
fi

HEARTBEAT_BOOT="${BOOT_DIR}/agent-gateway-heartbeat"
cat > "${HEARTBEAT_BOOT}" <<'HBBOOT'
#!/data/data/com.termux/files/usr/bin/bash
(
  while true; do
    bash "$HOME/fractanet-termux-gateway-heartbeat.sh" >>"$HOME/.cogentia/var/agent-gateway-heartbeat.log" 2>&1 || true
    sleep 300
  done
) &
HBBOOT
chmod +x "${HEARTBEAT_BOOT}"

cat > "${BOOT_SCRIPT}" <<'BOOT'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock 2>/dev/null || true
ENV_FILE="$HOME/srv/cogentia/secrets/agent-gateway.env"
COGENTIA_ROOT="$HOME/srv/cogentia/repos/cogentia"
LOG_FILE="$HOME/.cogentia/var/agent-gateway.log"
PORT="${AGENT_GATEWAY_PORT:-8793}"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
fi

if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ":${PORT} "; then
  exit 0
fi

cd "$COGENTIA_ROOT" || exit 0
nohup node scripts/agent-gateway.js --port "$PORT" >>"$LOG_FILE" 2>&1 &
BOOT
chmod +x "${BOOT_SCRIPT}"

grep -q 'agent-gateway.env' "${HOME}/.bashrc" 2>/dev/null || cat >> "${HOME}/.bashrc" <<EOF

# Agent CLI Gateway
[ -f "${ENV_FILE}" ] && . "${ENV_FILE}"
alias agent-gateway='cd "${COGENTIA_ROOT}" && node scripts/agent-gateway.js'
EOF

echo "[agent-gateway] env: ${ENV_FILE}"
echo "[agent-gateway] blackboard env: ${BLACKBOARD_ENV}"
echo "[agent-gateway] boot: ${BOOT_SCRIPT}"
echo "[agent-gateway] heartbeat boot: ${HEARTBEAT_BOOT} (every 5m when Termux starts)"
echo "[agent-gateway] token: (in env file — use Authorization: Bearer ...)"
if [ -n "${TS_IP}" ]; then
  echo "[agent-gateway] tailscale: http://${TS_IP}:${GATEWAY_PORT}/health"
else
  echo "[agent-gateway] tailscale IP pending — run: tailscale ip -4"
fi
echo "[agent-gateway] start now: source ${ENV_FILE} && cd ${COGENTIA_ROOT} && node scripts/agent-gateway.js"
echo "[agent-gateway] test: curl -s -H \"Authorization: Bearer \$AGENT_GATEWAY_TOKEN\" http://\$(tailscale ip -4):${GATEWAY_PORT}/v1/models"