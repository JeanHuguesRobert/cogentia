#!/data/data/com.termux/files/usr/bin/bash
# Codex + Claude Code inside Ubuntu proot (glibc linux-arm64).
# Grok Build runs natively on Termux — use `grok` directly.
#
# Usage: bash ~/fractanet-mobile-proot-agents.sh

set -euo pipefail

PROOT_NAME="${PROOT_NAME:-ubuntu}"
WRAPPER_DIR="${HOME}/.local/bin"
mkdir -p "${WRAPPER_DIR}"

if ! proot-distro list 2>/dev/null | grep -qw "${PROOT_NAME}"; then
  echo "[proot] installing ubuntu:24.04..."
  proot-distro install ubuntu:24.04
fi

echo "[proot] node 22 + agents in ${PROOT_NAME}..."
proot-distro login "${PROOT_NAME}" -- bash --noprofile --norc -c '
set -e
export DEBIAN_FRONTEND=noninteractive PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  apt-get update -qq
  apt-get install -y -qq curl ca-certificates
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
npm install -g @openai/codex @anthropic-ai/claude-code --allow-scripts=@anthropic-ai/claude-code
mkdir -p /root/.codex /root/.claude
T=/data/data/com.termux/files/home
[ -f "$T/.codex/auth.json" ] && cp "$T/.codex/auth.json" /root/.codex/auth.json
[ -f "$T/.claude/.credentials.json" ] && cp "$T/.claude/.credentials.json" /root/.claude/.credentials.json
chmod 600 /root/.codex/auth.json /root/.claude/.credentials.json 2>/dev/null || true
codex --version
claude --version
'

cat > "${WRAPPER_DIR}/agent-codex" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
exec proot-distro login ubuntu -- bash --noprofile --norc -c 'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; cd /data/data/com.termux/files/home/srv/cogentia/repos && exec codex "$@"' -- "$@"
EOF
cat > "${WRAPPER_DIR}/agent-claude" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
exec proot-distro login ubuntu -- bash --noprofile --norc -c 'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; cd /data/data/com.termux/files/home/srv/cogentia/repos && exec claude "$@"' -- "$@"
EOF
chmod +x "${WRAPPER_DIR}/agent-codex" "${WRAPPER_DIR}/agent-claude"
ln -sf agent-codex "${WRAPPER_DIR}/codex"
ln -sf agent-claude "${WRAPPER_DIR}/claude"

install -m 600 /dev/null "${HOME}/.profile" 2>/dev/null || true
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

echo "[proot] codex/claude -> agent wrappers in ~/.local/bin; grok native: grok"
echo "[proot] ~/.profile sources ~/.bashrc on Termux startup"