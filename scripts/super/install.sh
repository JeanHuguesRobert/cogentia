#!/usr/bin/env bash
# Run as ubuntu from ssh fracta2; only individually marked commands use sudo.
set -euo pipefail
if [ "$(id -u)" = 0 ]; then
  echo "Run this installer as ubuntu, NOT as root." >&2
  exit 2
fi
cd "$(dirname "$0")/../.."
echo "== COP-super tests =="
node --test scripts/super/broker.test.mjs scripts/super/broker-route.test.mjs
echo "== Update root-owned broker =="
sudo install -d -o root -g root -m 0755 /usr/local/libexec/cogentia-super
sudo install -o root -g root -m 0755 scripts/super/broker.mjs /usr/local/libexec/cogentia-super/broker.mjs
sudo install -o root -g root -m 0644 scripts/super/cogentia-super.service /etc/systemd/system/cogentia-super.service
sudo systemctl daemon-reload
sudo systemctl enable --now cogentia-super.service
sudo systemctl restart cogentia-super.service
systemctl is-active --quiet cogentia-super.service
echo "== Live COP + sudo smoke test =="
node scripts/super/smoke-cop.mjs
echo "== Retire obsolete broker-only mandate registry =="
sudo rm -f /var/lib/cogentia-super/mandates.json
echo "== Enable COP-super client in existing MCP =="
sudo install -d -o root -g root -m 0755 /etc/systemd/system/mcp-cogentia.service.d
printf '[Service]\nEnvironment=COGENTIA_SUPER_COP_ENABLED=1\n' | sudo tee /etc/systemd/system/mcp-cogentia.service.d/super-cop.conf >/dev/null
sudo systemctl daemon-reload
sudo systemctl restart mcp-cogentia.service
systemctl is-active --quiet mcp-cogentia.service
echo "== Update existing temporary shell MCP facade =="
install -m 0644 scripts/experimental/jhn-shell-mcp.mjs /home/ubuntu/.config/jhn-shell-mcp/server.mjs
sudo systemctl restart jhn-shell-mcp.service
systemctl is-active --quiet jhn-shell-mcp.service
echo "== SUCCESS: super broker + both MCP facades active, COP sole authority =="
