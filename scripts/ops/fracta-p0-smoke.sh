#!/usr/bin/env bash
# Fracta P0 accounting smoke: pull, restart Guide (needs sudo), one chat, verify chain.
# Usage on fracta: bash scripts/ops/fracta-p0-smoke.sh
set -euo pipefail
cd /srv/cogentia/repos/cogentia
git pull --ff-only origin main

# Restart requires root (passwordless sudo on fracta ops account).
if sudo -n systemctl restart mcp-cogentia; then
  echo "restarted mcp-cogentia"
else
  echo "WARN: sudo restart failed — process may still run old code" >&2
  systemctl is-active mcp-cogentia || true
fi
sleep 3
systemctl is-active mcp-cogentia
echo "MainPID=$(systemctl show mcp-cogentia -p MainPID --value)"
echo "ActiveEnter=$(systemctl show mcp-cogentia -p ActiveEnterTimestamp --value)"

curl -sS -m 120 -X POST http://127.0.0.1:8791/guide/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"What is Possibilism briefly?","locale":"en"}' \
  -o /tmp/guide-acct-smoke.json \
  -w "guide_http=%{http_code}\n"

node -e 'const d=require("/tmp/guide-acct-smoke.json"); const cp=d.cognitive_packet||{}; console.log(JSON.stringify({ok:d.ok, error:d.error, mode:d.mode, packet:cp.packet_id, consol:cp.consolidated_spend, own:cp.own_spend}));'

sleep 2
ENV_FILE="${COGENTIA_ENV_FILE:-/srv/cogentia/repos/inseme/.env}"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="/srv/cogentia/repos/cogentia/.env"
fi
node scripts/ops/verify-cop-accounting-p0.mjs "$ENV_FILE"
node scripts/ops/last-cop-spends.mjs --env "$ENV_FILE" --spool /var/lib/cogentia/accounting/spend.ndjson --limit 5
