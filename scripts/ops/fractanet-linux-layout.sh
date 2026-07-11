#!/usr/bin/env bash
# Fractanet Linux filesystem skeleton — shared by fracta (publisher) and edge nodes (e.g. rpi3-view kiosk).
#
# Usage (on node, with sudo):
#   NODE_ROLE=publisher|edge-kiosk bash fractanet-linux-layout.sh
#   NODE_USER=ubuntu|jh
#
# Creates:
#   /srv/cogentia/{repos,secrets,ops,work}
#   /var/lib/cogentia/{state,cache,logs,.ops,.cogentia}
# Does not clone repos or write secrets — layout only.

set -euo pipefail

NODE_ROLE="${NODE_ROLE:-edge-kiosk}"
NODE_USER="${NODE_USER:-${USER}}"

echo "[fractanet-layout] role=${NODE_ROLE} user=${NODE_USER}"

sudo mkdir -p \
  /srv/cogentia/repos \
  /srv/cogentia/secrets \
  /srv/cogentia/ops \
  /srv/cogentia/work \
  /var/lib/cogentia/state \
  /var/lib/cogentia/cache \
  /var/lib/cogentia/logs \
  /var/lib/cogentia/.ops \
  /var/lib/cogentia/.cogentia

sudo chown -R "${NODE_USER}:${NODE_USER}" /srv/cogentia/repos /srv/cogentia/work /var/lib/cogentia
sudo chown root:"${NODE_USER}" /srv/cogentia/secrets
sudo chmod 750 /srv/cogentia/secrets

if [[ ! -f /srv/cogentia/secrets/README.txt ]]; then
  sudo tee /srv/cogentia/secrets/README.txt >/dev/null <<'EOF'
Fractanet node secrets — never commit values to git.
  publisher (fracta): guide.env, corpus sync keys
  edge-appliance (rpi3-view): viewer.env, domotics.env (local manual backup when FractaNet down)
EOF
  sudo chown root:"${NODE_USER}" /srv/cogentia/secrets/README.txt
  sudo chmod 640 /srv/cogentia/secrets/README.txt
fi

if [[ ! -f /var/lib/cogentia/.cogentia/node-role ]]; then
  echo "${NODE_ROLE}" | sudo tee /var/lib/cogentia/.cogentia/node-role >/dev/null
  sudo chown "${NODE_USER}:${NODE_USER}" /var/lib/cogentia/.cogentia/node-role
fi

echo "[fractanet-layout] done"
echo "  COGENTIA_DATA_DIR=/var/lib/cogentia"
echo "  secrets: /srv/cogentia/secrets/"
echo "  next: clone repos under /srv/cogentia/repos, add role-specific .env"