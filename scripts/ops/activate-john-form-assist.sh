#!/usr/bin/env bash
# Explicit, root-only opt-in after human-signed Inseme form mandate issuance.
set -euo pipefail
unit=mcp-cogentia.service
conf=/etc/systemd/system/mcp-cogentia.service.d/zzzz-john-form-assist.conf
cd /srv/cogentia/repos/cogentia
verify(){
 node --input-type=module <<'JS'
import {readFileSync} from 'node:fs';
import {openExistingJohnCopStore} from './scripts/lib/john-cop-existing-store.js';
import {createFormAssistIssuerVerifier} from './scripts/lib/john-form-assist-issuance.js';
import {FORM_ASSIST_MANDATE} from './scripts/lib/john-form-assist-mandate.js';
import {resolveMandate,evaluateMandate} from '../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../inseme/packages/cop-core/src/execution-budget.js';
import {sshFingerprint} from './scripts/lib/john-sshsig-approval.js';
const fingerprint='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const key=readFileSync('/home/ubuntu/.ssh/authorized_keys','utf8').split('\n').find(x=>{try{return sshFingerprint(x)===fingerprint}catch{return false}});
if(!key)throw Error('trusted_principal_public_key_missing');
const a=openExistingJohnCopStore('/var/lib/cogentia/cop/john-root-v1.sqlite');if(!a.ok)throw Error(a.error);
try{
 const ref=FORM_ASSIST_MANDATE,mandate=resolveMandate(a.store,ref);
 const verified=createFormAssistIssuerVerifier({trustedSshPublicKey:key,expectedFingerprint:fingerprint})({mandate,mandate_ref:ref});
 const grant=evaluateMandate(a.store,{mandate_ref:ref,version_pin:'v1',expected_principal_ref:'principal:jhn',expected_actor_ref:'agent:jhn',capability:'browser.form.fill'});
 const ledger=createEventSourcedExecutionBudgetLedger({store:a.store,budget_id:'budget:'+ref,limits:{max_steps:512},require_authority_grant:true}).snapshot();
 if(!verified.verified||!grant.granted||!ledger.has_grant||ledger.available.max_steps<1)throw Error('form_mandate_not_ready');
 console.log('SIGNED_FORM_MANDATE_AND_BUDGET=VALID');
}finally{a.close()}
JS
}
if [[ ${1:-} == --check ]];then verify;exit 0;fi
if (( EUID != 0 ));then echo 'Root required for systemd configuration' >&2;exit 3;fi
if [[ -e $conf ]];then echo 'Form assist already configured; refusing overwrite' >&2;exit 4;fi
verify
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
Environment=COGENTIA_JHN_CANONICAL_FORM_ENABLED=1
CONFIG
chmod 600 "$conf"
created=1
systemctl daemon-reload
systemctl restart "$unit"
systemctl is-active --quiet "$unit"
systemctl show "$unit" --value -p Environment | grep -q 'COGENTIA_JHN_CANONICAL_FORM_ENABLED=1'
trap - ERR
echo 'CANONICAL_FORM_ASSIST_OPT_IN=ACTIVE'
echo "ROLLBACK: sudo rm -f '$conf' && sudo systemctl daemon-reload && sudo systemctl restart '$unit'"
