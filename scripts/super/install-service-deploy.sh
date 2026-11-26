#!/bin/bash
# OWNER ONLY. Run from a root-owned staging directory after independently
# verifying the pinned source bundle. No source path, service or shell supplied
# by an agent is accepted at runtime. Does not deploy the MCP itself.
set -euo pipefail
umask 077
[[ $(id -u) == 0 ]] || { echo ROOT_OWNER_REQUIRED >&2; exit 2; }
[[ $# == 3 && "$1" == --enable-local-ubuntu-role && "$2" == --expected-broker-sha256 && "$3" =~ ^[a-f0-9]{64}$ ]] || {
  echo 'Explicit owner delegation and current broker digest required: --enable-local-ubuntu-role --expected-broker-sha256 SHA256' >&2; exit 2; }
src=$(cd -- "$(dirname -- "$0")" && pwd -P)
for d in "$src" "$(dirname "$src")"; do
  [[ $(stat -c %u "$d") == 0 && $(stat -c %a "$d") == 700 ]] || {
    echo ROOT_OWNED_PRIVATE_STAGE_REQUIRED >&2; exit 2; }
done
for f in broker.mjs service-deploy.mjs install-service-deploy.sh; do
  [[ -f "$src/$f" && ! -L "$src/$f" && $(stat -c %u "$src/$f") == 0 ]] || {
    echo ROOT_OWNED_SOURCE_REQUIRED >&2; exit 2; }
  [[ $f == *.sh ]] || /usr/local/bin/node --check "$src/$f"
done
base=/usr/local/libexec/cogentia-super
state=/var/lib/cogentia-super
policy=$state/service-deploy-policy.json
expected=$3
actual=$(sha256sum "$base/broker.mjs" | cut -d' ' -f1)
[[ "$actual" == "$expected" ]] || { echo BROKER_CHANGED_SINCE_PREVIEW >&2; exit 2; }
[[ $(stat -c '%u:%a' "$state") == 0:700 && $(stat -c '%u:%a' "$base") == 0:755 ]] || {
  echo UNEXPECTED_BROKER_OWNERSHIP >&2; exit 2; }
[[ $(hostname -s) == fracta2 && $(systemctl show mcp-cogentia.service -p User --value) == ubuntu ]] || {
  echo UNEXPECTED_TARGET >&2; exit 2; }
[[ $(stat -c '%u:%G:%a' /run/cogentia-super/broker.sock) == 0:ubuntu:660 ]] || {
  echo UNEXPECTED_SOCKET_ROLE >&2; exit 2; }
gid=$(getent group ubuntu | cut -d: -f3)
[[ "$gid" =~ ^[0-9]+$ && "$gid" != 0 ]] || exit 2
if [[ -e "$policy" || -L "$policy" ]]; then
  echo 'Existing owner delegation: inspect/revoke explicitly before replacing it.' >&2; exit 2
fi
install -d -o root -g root -m 0700 "$state/service-deploy-receipts"
backup=$(mktemp -d "$state/service-deploy-backup.XXXXXX")
cp -a "$base/broker.mjs" "$backup/broker.mjs"
if [[ -e "$base/service-deploy.mjs" ]]; then cp -a "$base/service-deploy.mjs" "$backup/service-deploy.mjs"; fi
# Install module before broker. No change to generic grants, service unit, or
# MCP release. If activation fails, restore the previous broker.
rollback(){
  trap - ERR
  rm -f "$policy"
  install -o root -g root -m 0755 "$backup/broker.mjs" "$base/broker.mjs"
  if [[ -f "$backup/service-deploy.mjs" ]]; then
    install -o root -g root -m 0644 "$backup/service-deploy.mjs" "$base/service-deploy.mjs"
  else rm -f "$base/service-deploy.mjs"; fi
  systemctl restart cogentia-super.service
}
trap 'rollback' ERR
install -o root -g root -m 0644 "$src/service-deploy.mjs" "$base/service-deploy.mjs"
install -o root -g root -m 0755 "$src/broker.mjs" "$base/broker.mjs"
systemctl restart cogentia-super.service
systemctl is-active --quiet cogentia-super.service
for i in {1..20}; do [[ -S /run/cogentia-super/broker.sock ]] && break; sleep .2; done
[[ $(stat -c '%u:%G:%a' /run/cogentia-super/broker.sock) == 0:ubuntu:660 ]]
/usr/local/bin/node --input-type=module <<'JS'
import net from 'node:net';
const reply=await new Promise((resolve,reject)=>{
  const conn=net.createConnection('/run/cogentia-super/broker.sock');
  let body='';
  conn.setTimeout(3000,()=>{conn.destroy();reject(Error('broker readiness timeout'));});
  conn.on('connect',()=>conn.write(JSON.stringify({op:'service.deploy',service:'mcp-cogentia.service',revision:'a'.repeat(40),request_id:'bootstrap-check'})+'\n'));
  conn.on('data',data=>{body+=data.toString();if(body.includes('\n')){conn.destroy();resolve(JSON.parse(body));}});
  conn.on('error',reject);
});
if(reply.error!=='owner_delegation_required'||reply.executed!==false)throw Error('new broker not observed or delegation already active');
JS
printf '{"schema":"cogentia.service-deploy.owner-policy/v1","enabled":true,"service":"mcp-cogentia.service","target":"node:fracta2","authority":"node-owner-local-role","socket_gid":%s}\n' "$gid" > "$policy"
chmod 0600 "$policy"
trap - ERR
echo "SERVICE_DEPLOY_ENABLED service=mcp-cogentia.service role=ubuntu backup=$backup"
