#!/data/data/com.termux/files/usr/bin/bash
# Fractanet Termux filesystem skeleton — Android capable-mobile (e.g. poco-jhr).
#
# Usage (on device, in Termux):
#   NODE_ROLE=capable-mobile bash fractanet-termux-layout.sh
#
# Termux has no /srv or /var/lib without root; mirrors Linux layout under $HOME:
#   ~/srv/cogentia/{repos,secrets,ops,work}
#   ~/.cogentia/var/{state,cache,logs,.ops}

set -euo pipefail

NODE_ROLE="${NODE_ROLE:-capable-mobile}"
COGENTIA_SRV="${COGENTIA_SRV:-${HOME}/srv/cogentia}"
COGENTIA_DATA="${COGENTIA_DATA:-${HOME}/.cogentia/var}"

echo "[fractanet-termux-layout] role=${NODE_ROLE}"

mkdir -p \
  "${COGENTIA_SRV}/repos" \
  "${COGENTIA_SRV}/secrets" \
  "${COGENTIA_SRV}/ops" \
  "${COGENTIA_SRV}/work" \
  "${COGENTIA_DATA}/state" \
  "${COGENTIA_DATA}/cache" \
  "${COGENTIA_DATA}/logs" \
  "${COGENTIA_DATA}/.ops" \
  "${HOME}/.cogentia"

chmod 700 "${COGENTIA_SRV}/secrets"

if [[ ! -f "${COGENTIA_SRV}/secrets/README.txt" ]]; then
  cat > "${COGENTIA_SRV}/secrets/README.txt" <<'EOF'
Fractanet Termux secrets — never commit values to git.
  capable-mobile (poco-jhr): mobile.env, retrieval tokens (future inox/attractor)
EOF
  chmod 600 "${COGENTIA_SRV}/secrets/README.txt"
fi

if [[ ! -f "${HOME}/.cogentia/node-role" ]]; then
  echo "${NODE_ROLE}" > "${HOME}/.cogentia/node-role"
  chmod 600 "${HOME}/.cogentia/node-role"
fi

echo "[fractanet-termux-layout] done"
echo "  COGENTIA_DATA_DIR=${COGENTIA_DATA}"
echo "  COGENTIA_SRV=${COGENTIA_SRV}"
echo "  secrets: ${COGENTIA_SRV}/secrets/"