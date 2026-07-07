#!/data/data/com.termux/files/usr/bin/bash
# Install Agent CLI Gateway on Termux (poco-jhr / Fractanet mobile).
# Prereq: cogentia repo at ~/srv/cogentia/repos/cogentia, fractanet-mobile-proot-agents.sh for codex/claude.
#
# Usage: bash install-agent-gateway-termux.sh

set -euo pipefail

COGENTIA_ROOT="${COGENTIA_ROOT:-$HOME/srv/cogentia/repos/cogentia}"
GATEWAY_PORT="${AGENT_GATEWAY_PORT:-8793}"

if [ ! -f "${COGENTIA_ROOT}/scripts/agent-gateway.js" ]; then
  echo "[agent-gateway] cogentia not found at ${COGENTIA_ROOT}" >&2
  exit 1
fi

mkdir -p "${HOME}/.config/systemd/user" 2>/dev/null || true

grep -q 'agent-gateway' "${HOME}/.bashrc" 2>/dev/null || cat >> "${HOME}/.bashrc" <<EOF

# Agent CLI Gateway (OpenAI-compatible over local coding CLIs)
export AGENT_GATEWAY_PORT=${GATEWAY_PORT}
export AGENT_GATEWAY_REPO_ROOTS="${HOME}/srv/cogentia/repos"
alias agent-gateway='cd "${COGENTIA_ROOT}" && node scripts/agent-gateway.js --host 127.0.0.1 --port ${GATEWAY_PORT}'
EOF

echo "[agent-gateway] installed. Start with:"
echo "  cd ${COGENTIA_ROOT} && node scripts/agent-gateway.js --host 127.0.0.1 --port ${GATEWAY_PORT}"
echo "[agent-gateway] models: grok-build (native), claude-code + codex (agent-* proot wrappers)"