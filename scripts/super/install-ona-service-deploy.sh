#!/bin/bash
# One-time owner operation, from an independently verified root-owned stage.
# Migrates the existing ONA unit, verifies the real scheduler, then enables
# the separate ONA deployment policy. Does not expand generic super authority.
set -euo pipefail
umask 077
export PATH=/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
[[ $(id -u) == 0 && $# == 2 && $1 == --enable-local-ubuntu-role && $2 =~ ^[a-f0-9]{64}$ ]] || exit 2
src=$(cd -- "$(dirname -- "$0")" && pwd -P)
for d in "$src" "$(dirname "$src")"; do
  [[ $(stat -c '%u:%a' "$d") == 0:700 ]] || exit 2
done
for f in service-deploy.mjs install-ona-service-deploy.sh; do
  [[ -f "$src/$f" && ! -L "$src/$f" && $(stat -c %u "$src/$f") == 0 ]] || exit 2
done
unit=operium-node-agent.service
rev=7ce7c20a63a90ad2b74a8fe532c0806209e01f45
release=/srv/cogentia/releases/operium-node-agent/$rev/operium
state=/var/lib/cogentia-super
base=/usr/local/libexec/cogentia-super
module=$base/service-deploy.mjs
policy=$state/service-deploy-ona-policy.json
mcp_policy=$state/service-deploy-policy.json
dropdir=/etc/systemd/system/$unit.d
drop=$dropdir/zz-release.conf
[[ $(hostname -s) == fracta2 && $(stat -c '%u:%a' "$state") == 0:700 && $(stat -c '%u:%a' "$base") == 0:755 ]] || exit 2
[[ $(sha256sum "$module" | cut -d' ' -f1) == "$2" ]] || { echo MODULE_CHANGED >&2; exit 2; }
[[ $(stat -c '%u:%G:%a' /run/cogentia-super/broker.sock) == 0:ubuntu:660 ]] || exit 2
[[ ! -e "$policy" && ! -L "$policy" && ! -e "$dropdir" && ! -L "$dropdir" && ! -e "$state/service-deploy-receipts/active.lock" ]] || { echo UNEXPECTED_EXISTING_STATE >&2; exit 2; }
[[ -f "$mcp_policy" && ! -L "$mcp_policy" ]] || exit 2
[[ $(systemctl show "$unit" -p WorkingDirectory --value) == /srv/cogentia/repos/operium && $(systemctl show "$unit" -p User --value) == ubuntu && $(systemctl show "$unit" -p Group --value) == ubuntu && -z $(systemctl show "$unit" -p DropInPaths --value) ]] || exit 2
[[ $(systemctl show "$unit" -p ExecStartEx --value) == '{ path=/usr/bin/env ; argv[]=/usr/bin/env node /srv/cogentia/repos/operium/bin/operium-node-agent.js ; flags= ; '* ]] || exit 2
for property in ExecCondition ExecStartPre ExecStartPost ExecReload ExecStop ExecStopPost SupplementaryGroups AmbientCapabilities; do
  [[ -z $(systemctl show "$unit" -p "$property" --value) ]] || exit 2
done
[[ $(systemctl show "$unit" -p NoNewPrivileges --value) == no && $(systemctl is-active "$unit") == active ]] || exit 2
[[ $(cat "$release/REVISION") == "$rev" && $(readlink -f "$release") == "$release" ]] || exit 2
gid=$(getent group ubuntu | cut -d: -f3)
[[ "$gid" =~ ^[0-9]+$ && "$gid" != 0 ]] || exit 2
/usr/local/bin/node --check "$src/service-deploy.mjs"
backup=$(mktemp -d "$state/ona-bootstrap.XXXXXX")
cp -a "$module" "$backup/service-deploy.mjs"
mcp_sha=$(sha256sum "$mcp_policy" | cut -d' ' -f1)
# Read only the fixed local observation endpoints, never tokens or job contents.
cat > "$backup/check.py" <<'PY'
import datetime, json, sys, urllib.request
from pathlib import Path
def get(port, path):
    with urllib.request.urlopen(f'http://127.0.0.1:{port}{path}', timeout=10) as r:
        return json.load(r)
def status():
    h=get(8794,'/health'); n=get(8765,'/health')
    assert h['ok'] and h['service']=='operium-node-agent' and h['node_id']=='resource://fracta2'
    assert n['ok'] and n['instance']=='fracta2'
    j=get(8794,'/node/status')['jobs']
    jobs={x['job_id']:x for x in j['items'] if x['enabled']}
    assert set(jobs)=={'cps:chatgpt-return-reconcile','heartbeat:agent-gateway','heartbeat:operium-node','recovery:ona-observer'}
    return jobs
jobs=status()
if sys.argv[1]=='before':
    assert all(x['last_ok'] is True for x in jobs.values())
    Path(sys.argv[2]).write_text(json.dumps({k:v['run_count'] for k,v in jobs.items()}))
elif sys.argv[1]=='after':
    previous=json.loads(Path(sys.argv[2]).read_text())
    started=float(sys.argv[3])
    assert all(x['last_ok'] is True and x['run_count']>previous[k] and
               datetime.datetime.fromisoformat(x['last_run_at'].replace('Z','+00:00')).timestamp()>=started
               for k,x in jobs.items())
    fleet=get(8794,'/nasa/fleet')['nodes']
    assert len(fleet)==4 and not any(x['host']=='fracta' for x in fleet)
    assert any(x['host']=='fracta2' and x.get('online') is True for x in fleet)
    print('ONA_HEALTH_NAV_FLEET_AND_FOUR_JOBS_VERIFIED')
elif sys.argv[1]=='rollback':
    assert all(x['last_ok'] is True for x in jobs.values())
else:
    raise ValueError('unknown verification mode')
PY
/usr/bin/python3 -I "$backup/check.py" before "$backup/jobs-before.json"
changed=0
module_changed=0
policy_changed=0
success=0
cleanup(){
  rc=$?
  trap - EXIT
  if [[ "$success" == 1 ]]; then exit 0; fi
  set +e
  if [[ "$policy_changed" == 1 ]]; then rm -f -- "$policy"; fi
  if [[ "$module_changed" == 1 ]]; then
    install -o root -g root -m 0644 "$backup/service-deploy.mjs" "$module"
    systemctl restart cogentia-super.service
  fi
  if [[ "$changed" == 1 ]]; then
    rm -f -- "$drop"
    rmdir -- "$dropdir"
    systemctl daemon-reload
    systemctl restart "$unit"
    rolled_back=0
    for i in {1..20}; do
      if systemctl is-active --quiet "$unit" && [[ $(systemctl show "$unit" -p WorkingDirectory --value) == /srv/cogentia/repos/operium ]] && /usr/bin/python3 -I "$backup/check.py" rollback "$backup/jobs-before.json" 2>/dev/null; then
        rolled_back=1; break
      fi
      sleep 1
    done
    if [[ "$rolled_back" == 1 ]]; then echo ONA_BASELINE_ROLLED_BACK; else echo ONA_ROLLBACK_UNVERIFIED >&2; fi
  fi
  echo "ONA_BOOTSTRAP_FAILED backup=$backup" >&2
  exit "${rc:-1}"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir -m 0755 -- "$dropdir"
changed=1
printf '[Service]\nWorkingDirectory=%s\nExecStart=\nExecStart=/usr/local/bin/node %s/bin/operium-node-agent.js\nNoNewPrivileges=yes\nCapabilityBoundingSet=\nAmbientCapabilities=\n' "$release" "$release" > "$backup/drop.conf"
install -o root -g root -m 0644 "$backup/drop.conf" "$drop"
systemctl daemon-reload
[[ $(systemctl show "$unit" -p WorkingDirectory --value) == "$release" && $(systemctl show "$unit" -p NoNewPrivileges --value) == yes && -z $(systemctl show "$unit" -p CapabilityBoundingSet --value) ]] || exit 1
systemctl restart "$unit"
started=$(date -d "$(systemctl show "$unit" -p ExecMainStartTimestamp --value)" +%s)
echo 'ONA baseline restarted; waiting for fresh results from the existing four jobs.'
verified=0
deadline=$((SECONDS+370))
while (( SECONDS < deadline )); do
  if systemctl is-active --quiet "$unit" && /usr/bin/python3 -I "$backup/check.py" after "$backup/jobs-before.json" "$started" 2>/dev/null; then verified=1; break; fi
  sleep 5
done
[[ "$verified" == 1 ]] || exit 1
pid=$(systemctl show "$unit" -p MainPID --value)
[[ "$pid" =~ ^[1-9][0-9]*$ && $(readlink -f "/proc/$pid/cwd") == "$release" ]] || exit 1
uid=$(id -u ubuntu)
awk -v uid="$uid" '$1=="Uid:" {ok=($2==uid && $3==uid && $4==uid && $5==uid)} END{exit !ok}' "/proc/$pid/status"
grep -Eq '^NoNewPrivs:[[:space:]]+1$' "/proc/$pid/status"
grep -Eq '^CapEff:[[:space:]]+0+$' "/proc/$pid/status"
grep -Eq '^CapBnd:[[:space:]]+0+$' "/proc/$pid/status"
[[ ! -e "$state/service-deploy-receipts/active.lock" ]] || exit 1
module_changed=1
install -o root -g root -m 0644 "$src/service-deploy.mjs" "$module"
systemctl restart cogentia-super.service
systemctl is-active --quiet cogentia-super.service
# Confirm the new descriptor is recognized but not yet enabled.
/usr/local/bin/node --input-type=module <<'JS'
import net from 'node:net';
const reply=await new Promise((resolve,reject)=>{
 const conn=net.createConnection('/run/cogentia-super/broker.sock');let body='';
 conn.setTimeout(5000,()=>{conn.destroy();reject(Error('broker readiness timeout'));});
 conn.on('connect',()=>conn.write(JSON.stringify({op:'service.deploy',service:'operium-node-agent.service',revision:'a'.repeat(40),request_id:'ona-bootstrap-check'})+'\n'));
 conn.on('data',data=>{body+=data.toString();if(body.includes('\n')){conn.destroy();resolve(JSON.parse(body));}});
 conn.on('error',reject);
});
if(reply.error!=='owner_delegation_required'||reply.executed!==false)throw Error('ONA delegation not observed disabled');
JS
[[ $(sha256sum "$mcp_policy" | cut -d' ' -f1) == "$mcp_sha" ]] || exit 1
printf '{"schema":"cogentia.service-deploy.owner-policy/v1","enabled":true,"service":"operium-node-agent.service","target":"node:fracta2","authority":"node-owner-local-role","socket_gid":%s}\n' "$gid" > "$backup/ona-policy.json"
policy_changed=1
install -o root -g root -m 0600 "$backup/ona-policy.json" "$policy"
success=1
echo "ONA_SERVICE_DEPLOY_ENABLED revision=$rev pid=$pid backup=$backup"
