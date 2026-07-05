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

echo "[mobile-dev] installing @openai/codex @anthropic-ai/claude-code..."
npm install -g @openai/codex @anthropic-ai/claude-code

echo "[mobile-dev] installing Grok Build (linux-aarch64)..."
if command -v grok >/dev/null 2>&1; then
  grok --version 2>/dev/null || true
else
  curl -fsSL https://x.ai/cli/install.sh | bash
fi

export PATH="${HOME}/.grok/bin:${HOME}/.npm-global/bin:${PATH}"

echo "[mobile-dev] versions:"
command -v codex >/dev/null && codex --version 2>/dev/null || echo "  codex: install ok, run 'codex login'"
command -v claude >/dev/null && claude --version 2>/dev/null || echo "  claude: install ok, run 'claude login'"
command -v grok >/dev/null && grok --version 2>/dev/null || echo "  grok: install ok, run 'grok login'"

echo "[mobile-dev] done"