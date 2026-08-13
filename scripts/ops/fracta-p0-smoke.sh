#!/usr/bin/env bash
set -euo pipefail
cd /srv/cogentia/repos/cogentia
git pull --ff-only origin main
sudo systemctl restart mcp-cogentia
sleep 3
systemctl is-active mcp-cogentia

curl -sS -m 100 -X POST http://127.0.0.1:8791/guide/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"What is Possibilism briefly?","locale":"en"}' \
  -o /tmp/guide-acct-smoke2.json \
  -w "http=%{http_code}\n"

node -e 'const d=require("/tmp/guide-acct-smoke2.json"); const cp=d.cognitive_packet||{}; console.log(JSON.stringify({ok:d.ok, error:d.error, mode:d.mode, packet:cp.packet_id, consol:cp.consolidated_spend}));'

sleep 2
node /tmp/verify-cop-accounting-p0.mjs /srv/cogentia/repos/inseme/.env

PID=$(systemctl show mcp-cogentia -p MainPID --value || true)
if [ -n "${PID:-}" ] && [ "$PID" != "0" ] && [ -r "/proc/$PID/environ" ]; then
  echo "=== process env names ==="
  tr '\0' '\n' < "/proc/$PID/environ" | grep -E '^(SUPABASE_URL|SUPABASE_SERVICE|COGENTIA_COP_)' | sed 's/=.*//' | sort -u
fi
