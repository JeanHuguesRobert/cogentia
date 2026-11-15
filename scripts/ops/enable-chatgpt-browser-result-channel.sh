#!/usr/bin/env bash
# Owner deployment of the already governed chatgpt:browser result channel.
# Does not broaden the signed COP mandate: it only admits this new pair
# to the existing authenticated, claimed, budget-reserved MCP result ingress.
set -euo pipefail
if [[ "${1:-}" != "--apply" ]]; then
  echo 'Usage: enable-chatgpt-browser-result-channel.sh --apply (from owner SSH)'
  exit 2
fi
if [[ -z "${SSH_CONNECTION:-}" ]]; then
  echo 'owner_ssh_session_required' >&2
  exit 3
fi
sudo -n install -m 0644 /dev/stdin /etc/systemd/system/mcp-cogentia.service.d/96-chatgpt-browser-result.conf <<'DROPIN'
[Service]
Environment="COGENTIA_MCP_JUDGMENT_RESULT_PERMITTED_CHANNELS=local-fixture:mcp,chatgpt:browser"
DROPIN
sudo -n systemctl daemon-reload
sudo -n systemctl restart mcp-cogentia.service
sudo -n systemctl is-active --quiet mcp-cogentia.service
result=$(systemctl show mcp-cogentia.service -p Environment --value)
if [[ "$result" != *'COGENTIA_MCP_JUDGMENT_RESULT_PERMITTED_CHANNELS=local-fixture:mcp,chatgpt:browser'* ]]; then
  echo 'channel_activation_not_observed' >&2
  exit 1
fi
echo 'chatgpt_browser_result_channel_active'
