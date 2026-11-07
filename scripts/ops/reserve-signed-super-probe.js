#!/usr/bin/env node
/** Nonroot step: independently signed exact one-use probe; Inseme reservation only. */
import {readFileSync,statSync} from 'node:fs';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {reserveSignedSuperProbe} from '../lib/super-probe-issuance.js';
import {SUPER_PROBE_MANDATE} from '../lib/super-probe-approval.js';
import {sshFingerprint} from '../lib/john-sshsig-approval.js';
import {proposalHash} from '../lib/john-root-mandate.js';
const EXPECTED_HASH='sha256:77404ea29444623148489128ec57642301480e18a1ac48398409400d2413f848';
const FP='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const dbPath='/var/lib/cogentia/cop/john-root-v1.sqlite';
const signaturePath='/home/ubuntu/jhn-super-probe-2026-11-07.proposal.json.sig';
const proposalPath='research/integration/approvals/jhn-super-probe-2026-11-07.proposal.json';
const keyPath='/home/ubuntu/.ssh/authorized_keys';
const stat=statSync(dbPath);
if(!stat.isFile()||(stat.mode&0o077)!==0)throw Error('existing_protected_store_required');
const proposal=JSON.parse(readFileSync(proposalPath,'utf8'));
if(proposalHash(proposal)!==EXPECTED_HASH)throw Error('proposal_hash_mismatch');
const trustedKey=readFileSync(keyPath,'utf8').split('\n').find(line=>{try{return sshFingerprint(line)===FP}catch{return false}});
if(!trustedKey)throw Error('trusted_principal_key_missing');
const store=createSqliteCopEventStore(dbPath);
try{
 const result=reserveSignedSuperProbe({store,proposal,signature:readFileSync(signaturePath,'utf8'),
   trustedPublicKey:trustedKey,expectedFingerprint:FP});
 if(!result.ok)throw Error('super_probe_reservation_refused:'+result.error);
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+SUPER_PROBE_MANDATE,
   limits:{max_steps:1},require_authority_grant:true}).snapshot();
 const m=resolveMandate(store,SUPER_PROBE_MANDATE);
 if(!m||!ledger.has_grant||ledger.reserved.max_steps!==1||ledger.available.max_steps!==0||
   ledger.settled.max_steps!==0)throw Error('canonical_probe_readback_failed');
 console.log(JSON.stringify({ok:true,phase:'COP_RESERVED_ROOT_GRANT_NOT_ISSUED',
   mandate_ref:SUPER_PROBE_MANDATE,reservation_id:result.reservation_id,
   effect_hash:result.payload_hash,available:ledger.available.max_steps,reserved:ledger.reserved.max_steps}));
}finally{store.close()}
