#!/usr/bin/env bash
# Root-only, reversible systemd opt-in for already signed John v1 browser reads.
set -euo pipefail
unit=mcp-cogentia.service
root=/srv/cogentia/repos/cogentia
store=/var/lib/cogentia/cop/john-root-v1.sqlite
key=/home/ubuntu/.ssh/authorized_keys
conf=/etc/systemd/system/mcp-cogentia.service.d/zzzz-john-canonical-read.conf
check() {
  test -r "$store" && test -r "$key"
  test "$(stat -c %a /var/lib/cogentia/cop)" = 700
  test "$(stat -c %a "$store")" = 600
  test "$(systemctl show "$unit" --value -p User)" = ubuntu
  test -f "$root/scripts/lib/john-cop-read-execution.js"
  cd "$root"
  node --input-type=module <<'JS'
import {openExistingJohnCopStore} from './scripts/lib/john-cop-existing-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../inseme/packages/cop-core/src/execution-budget.js';
import {createOfflineJohnIssuerVerifier} from './scripts/lib/john-offline-issuer-verifier.js';
import {sshFingerprint} from './scripts/lib/john-sshsig-approval.js';
import {resolveMandate} from '../inseme/packages/cop-core/src/governed-act.js';
import {readFileSync} from 'node:fs';
const ref='mandate:jhn:john-root',fp='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const key=readFileSync('/home/ubuntu/.ssh/authorized_keys','utf8').split('\n').find(x=>{try{return sshFingerprint(x)===fp}catch{return false}});
if(!key)throw Error('trusted_public_key_not_found');
const a=openExistingJohnCopStore('/var/lib/cogentia/cop/john-root-v1.sqlite');
if(!a.ok)throw Error(a.error);
try{
 const mandate=resolveMandate(a.store,ref);
 const verified=createOfflineJohnIssuerVerifier({trustedSshPublicKey:key,expectedSshFingerprint:fp})({mandate,mandate_ref:ref,store:a.store});
 const budget=createEventSourcedExecutionBudgetLedger({store:a.store,budget_id:'budget:'+ref,limits:{max_steps:2048},require_authority_grant:true}).snapshot();
 if(!verified.verified||!budget.has_grant||budget.mandate_ref!==ref||budget.available.max_steps<1)throw Error('canonical_read_authority_unavailable');
 console.log('SIGNED_ROOT_AND_CANONICAL_BUDGET=VALID');
}finally{a.close()}
JS
}
if [[ ${1:-} == --check ]];then check;exit 0;fi
if (( EUID != 0 ));then echo 'Requires sudo/root to change systemd' >&2;exit 3;fi
if [[ -e $conf ]];then echo 'Already configured: refusing overwrite' >&2;exit 4;fi
check
created=0
rollback(){
  if (( created ));then
    rm -f "$conf"
    systemctl daemon-reload
    systemctl restart "$unit" || true
  fi
}
trap rollback ERR
umask 077
cat > "$conf" <<'CONFIG'
[Service]
Environment=COGENTIA_JHN_CANONICAL_READ_ENABLED=1
Environment=COGENTIA_JHN_CANONICAL_STORE_PATH=/var/lib/cogentia/cop/john-root-v1.sqlite
Environment=COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS=/home/ubuntu/.ssh/authorized_keys
CONFIG
chmod 600 "$conf"
created=1
systemctl daemon-reload
systemctl restart "$unit"
systemctl is-active --quiet "$unit"
if ! systemctl show "$unit" --value -p Environment | grep -q 'COGENTIA_JHN_CANONICAL_READ_ENABLED=1';then
  echo 'Activation environment missing' >&2
  false
fi
trap - ERR
echo 'MCP_CANONICAL_READ_OPT_IN=ACTIVE'
echo "ROLLBACK: sudo rm -f '$conf' && sudo systemctl daemon-reload && sudo systemctl restart '$unit'"
