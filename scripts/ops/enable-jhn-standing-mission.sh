#!/usr/bin/env bash
# Enable the existing canonical standing-mission resolver in the running MCP.
# This does NOT grant mandate authority; signed root scope remains mandatory.
set -Eeuo pipefail
override_dir='/etc/systemd/system/mcp-cogentia.service.d'
override="$override_dir/97-standing-mission.conf"
expected=$'[Service]\nEnvironment=COGENTIA_MCP_STANDING_MISSION_ENABLED=1\n'
if [[ $# != 1 || ( "${1:-}" != '--check' && "${1:-}" != '--apply' ) ]]; then
  echo 'Usage: enable-jhn-standing-mission.sh --check|--apply' >&2
  exit 2
fi
[[ -d "$override_dir" ]] || {echo 'BLOCKED: unexpected MCP service layout' >&2;exit 2;}
[[ -f /var/lib/cogentia/cop/john-root-v1.sqlite ]] || {echo 'BLOCKED: no canonical COP store' >&2;exit 2;}
[[ -f /home/ubuntu/.ssh/authorized_keys ]] || {echo 'BLOCKED: no pinned issuer source' >&2;exit 2;}
systemctl is-active --quiet mcp-cogentia.service || {echo 'BLOCKED: MCP not active' >&2;exit 2;}
if [[ -e "$override" ]] && [[ "$(cat "$override")"$'\n' != "$expected" ]];then
  echo 'BLOCKED: existing standing-mission override differs' >&2;exit 2
fi
if [[ "$1" == '--check' ]];then
  echo 'PREFLIGHT=PASS SERVICE=mcp-cogentia.service STANDING_FLAG=true NO_MANDATE_ISSUANCE=true'
  exit 0
fi
[[ "$(id -u)" == 0 ]] || {echo 'BLOCKED: root required' >&2;exit 3;}
created=0
rollback() {
  code=$?
  trap - ERR
  if [[ "$created" == 1 ]];then rm -f "$override";fi
  systemctl daemon-reload || true
  systemctl restart mcp-cogentia.service || true
  echo "ROLLED_BACK: standing runtime activation failed ($code)" >&2
  exit "$code"
}
trap rollback ERR
if [[ ! -f "$override" ]];then
  printf '%s' "$expected" > "$override"
  chmod 0644 "$override"
  created=1
fi
systemctl daemon-reload
systemctl restart mcp-cogentia.service
systemctl is-active --quiet mcp-cogentia.service
actual="$(systemctl show mcp-cogentia.service -p Environment --value)"
[[ " $actual " == *" COGENTIA_MCP_STANDING_MISSION_ENABLED=1 "* || "$actual" == *"COGENTIA_MCP_STANDING_MISSION_ENABLED=1" ]] || {
 echo 'BLOCKED: enabled flag not reflected by systemd' >&2
 false
}
# Probe a basic MCP introspection endpoint; fail closed if service crashed.
for x in $(seq 1 20);do
 code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:8791/tools 2>/dev/null || true)"
 if [[ "$code" == 200 ]];then
   trap - ERR
   echo 'ACTIVE=PASS MCP_HTTP_TOOLS=200 STANDING_RESOLVER=CONFIGURED ROOT_MANDATE=UNCHANGED'
   exit 0
 fi
 sleep 0.3
done
echo 'BLOCKED: MCP live tools unavailable' >&2
false
