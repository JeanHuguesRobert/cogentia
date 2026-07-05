#!/data/data/com.termux/files/usr/bin/bash
# Codex + Claude Code need glibc linux-arm64 (not Termux/Bionic).
# Install Ubuntu 24.04 via proot-distro and agents inside.
#
# Usage: bash ~/fractanet-mobile-proot-agents.sh
# Run:   agent-codex | agent-claude   (wrappers in ~/.local/bin)

set -euo pipefail

DISTRO="${DISTRO:-ubuntu:24.04}"
PROOT_NAME="${PROOT_NAME:-ubuntu}"
WRAPPER_DIR="${HOME}/.local/bin"
mkdir -p "${WRAPPER_DIR}"

if ! proot-distro list | grep -q "^  ${PROOT_NAME}$"; then
  echo "[proot] installing ${DISTRO} (one-time, ~1-2 GiB)..."
  proot-distro install "${DISTRO}"
fi

echo "[proot] installing node + agents in ${PROOT_NAME}..."
proot-distro login "${PROOT_NAME}" <<'EOF'
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates git openssh-client rsync
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
npm install -g @openai/codex @anthropic-ai/claude-code
mkdir -p /root/.codex /root/.claude /root/.grok
for f in \
  /data/data/com.termux/files/home/.codex/auth.json \
  /data/data/com.termux/files/home/.claude/.credentials.json \
  /data/data/com.termux/files/home/.grok/auth.json; do
  [ -f "$f" ] && cp "$f" "/root/$(basename "$(dirname "$f")")/$(basename "$f")" 2>/dev/null || \
  [ -f "$f" ] && cp "$f" "/root/.claude/.credentials.json" 2>/dev/null || true
done
[ -f /data/data/com.termux/files/home/.codex/auth.json ] && \
  cp /data/data/com.termux/files/home/.codex/auth.json /root/.codex/auth.json
[ -f /data/data/com.termux/files/home/.claude/.credentials.json ] && \
  cp /data/data/com.termux/files/home/.claude/.credentials.json /root/.claude/.credentials.json
[ -f /data/data/com.termux/files/home/.grok/auth.json ] && \
  cp /data/data/com.termux/files/home/.grok/auth.json /root/.grok/auth.json
chmod 600 /root/.codex/auth.json /root/.claude/.credentials.json /root/.grok/auth.json 2>/dev/null || true
codex --version
claude --version
EOF

cat > "${WRAPPER_DIR}/agent-codex" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
exec proot-distro login ${PROOT_NAME} -- codex "\$@"
EOF
cat > "${WRAPPER_DIR}/agent-claude" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
exec proot-distro login ${PROOT_NAME} -- claude "\$@"
EOF
chmod +x "${WRAPPER_DIR}/agent-codex" "${WRAPPER_DIR}/agent-claude"

grep -q '.local/bin' "${HOME}/.bashrc" 2>/dev/null || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "${HOME}/.bashrc"

echo "[proot] wrappers: agent-codex, agent-claude"
echo "[proot] corpus path inside proot: /data/data/com.termux/files/home/srv/cogentia/repos"
EOF