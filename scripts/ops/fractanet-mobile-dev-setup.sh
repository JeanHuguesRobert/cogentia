#!/data/data/com.termux/files/usr/bin/bash
# Install coding agents on Termux (poco-jhr): Codex, Claude Code, Grok Build.
# Run after Node/git are available:
#   bash ~/fractanet-mobile-dev-setup.sh
#
# Auth (per tool, on device):
#   codex login | claude login | grok login
# Or copy ~/.codex ~/.claude ~/.grok/auth.json from a trusted workstation.

set -euo pipefail

export PATH="${HOME}/.grok/bin:${HOME}/.npm-global/bin:${PATH}"

echo "[mobile-dev] node=$(node -v) npm=$(npm -v)"

# npm global prefix (Termux has no write to /usr)
if ! npm config get prefix | grep -q "${HOME}/.npm-global"; then
  mkdir -p "${HOME}/.npm-global"
  npm config set prefix "${HOME}/.npm-global"
fi
grep -q 'npm-global/bin' "${HOME}/.bashrc" 2>/dev/null || {
  cat >> "${HOME}/.bashrc" <<'EOF'

# npm global (Termux)
export PATH="$HOME/.npm-global/bin:$PATH"
EOF
}

# Codex/Claude have no working Termux native binaries (linux-arm64-android).
# They run in Ubuntu proot via fractanet-mobile-proot-agents.sh → agent-codex, agent-claude.
echo "[mobile-dev] skipping native codex/claude on Termux (use agent-codex / agent-claude after proot setup)"

echo "[mobile-dev] installing Grok Build (linux-aarch64)..."
if command -v grok >/dev/null 2>&1; then
  grok --version 2>/dev/null || true
else
  curl -fsSL https://x.ai/cli/install.sh | bash
fi

export PATH="${HOME}/.grok/bin:${HOME}/.npm-global/bin:${PATH}"

grep -q 'source.*bashrc' "${HOME}/.profile" 2>/dev/null || cat > "${HOME}/.profile" <<'EOF'
# Termux login shell — source interactive config
if [ -f "$HOME/.bashrc" ]; then
    . "$HOME/.bashrc"
fi
EOF

grep -q 'Fractanet mobile dev' "${HOME}/.bashrc" 2>/dev/null || cat >> "${HOME}/.bashrc" <<'EOF'

# Fractanet mobile dev (proot wrappers + grok native)
export PATH="$HOME/.local/bin:$HOME/.grok/bin:$PATH"
EOF

echo "[mobile-dev] versions:"
command -v grok >/dev/null && grok --version 2>/dev/null || echo "  grok: missing — rerun install.sh"
command -v agent-codex >/dev/null && agent-codex --version 2>/dev/null || echo "  agent-codex: run fractanet-mobile-proot-agents.sh first"
command -v agent-claude >/dev/null && agent-claude --version 2>/dev/null || echo "  agent-claude: run fractanet-mobile-proot-agents.sh first"

echo "[mobile-dev] done — open a new Termux session or: source ~/.bashrc"