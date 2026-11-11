#!/usr/bin/env node
/**
 * #299 — Owner-initiated COP consent request for one exact John mandate delta.
 * No mandate issuance, approval, application, browser action or budget spend.
 * This script is an operator entrypoint; never expose through a generic MCP
 * command or public HTTP endpoint. The actual Principal decision still goes
 * through Supabase Auth and the canonical consent service.
 */
import {readFileSync,realpathSync} from 'node:fs';
import {openExistingJohnCopStore} from '../lib/john-cop-existing-store.js';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createOfflineJohnIssuerVerifier} from '../lib/john-offline-issuer-verifier.js';
import {sshFingerprint} from '../lib/john-sshsig-approval.js';
import {johnContinuationMandatePlan} from '../lib/jhn-continuation-mandate-plan.js';
import {createJhnCanonicalConsentWorkflow} from '../lib/jhn-canonical-consent-workflow.js';

const PATH='/var/lib/cogentia/cop/john-root-v1.sqlite';
const KEY_PATH='/home/ubuntu/.ssh/authorized_keys';
const REF='mandate:jhn:john-root';
const FP='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const BASE='https://jhn.baronsmariani.org/cop/consent/';
const fail=error=>({ok:false,error,challenge_created:false,mandate_amended:false});
function verifyCurrentIssuer(store) {
  let key;
  try {
    const keys=readFileSync(KEY_PATH,'utf8').split('\n');
    key=keys.find(line=>{try{return sshFingerprint(line)===FP}catch{return false}});
  }catch{return false}
  if(!key)return false;
  const current=resolveMandate(store,REF);
  if(!current)return false;
  try {
    const verdict=createOfflineJohnIssuerVerifier({
      trustedSshPublicKey:key,expectedSshFingerprint:FP
    })({mandate:current,mandate_ref:REF});
    return verdict?.verified===true&&verdict.principal_ref==='principal:jhn'&&
      verdict.mandate_ref===REF;
  }catch{return false}
}
export function continuationConsentPlan(store,{verifyIssuer=verifyCurrentIssuer}={}) {
  if(!verifyIssuer(store))return fail('canonical_issuer_unverified');
  return johnContinuationMandatePlan({store});
}
export function requestContinuationConsent(store,{verifyIssuer=verifyCurrentIssuer,ttl_ms=600000}={}) {
  const plan=continuationConsentPlan(store,{verifyIssuer});
  if(!plan.ok||plan.already_authorized_in_scope)return plan;
  if(!plan.requires_owner_consent||!plan.mandate)return fail('consent_plan_unavailable');
  const workflow=createJhnCanonicalConsentWorkflow({store});
  const result=workflow.request({mandate:plan.mandate,ttl_ms});
  if(!result.ok)return fail(result.error||'consent_request_failed');
  // Re-read and confirm a durable request, not a fabricated token or URL.
  const verified=workflow.inspect({challenge_id:result.challenge_id});
  if(!verified.ok||verified.status!=='pending'||verified.payload_hash!==result.payload_hash)
    return fail('consent_request_receipt_unconfirmed');
  return {ok:true,kind:'cogentia.jhn_continuation_consent_request.v1',
    challenge_id:result.challenge_id,payload_hash:result.payload_hash,
    url:BASE+result.challenge_id,expires_at:result.expires_at,
    mandate_ref:REF,previous_version:plan.previous_version,
    added_capabilities:plan.added_capabilities,
    budget_snapshot_for_review:plan.budget_snapshot_for_review,
    requires_supabase_principal_decision:true,
    challenge_created:true,mandate_amended:false,execution:false};
}
export function runContinuationConsentCli({args=process.argv.slice(2),ownerShell=Boolean(process.env.SSH_CONNECTION)}={}) {
  if(args.length!==1||!['--plan','--request'].includes(args[0]))
    return fail('usage: --plan|--request');
  // Operator policy, not a cryptographic identity proof; a delegated agent
  // must not spoof SSH_CONNECTION or route around this owner entrypoint.
  if(args[0]==='--request'&&!ownerShell)return fail('owner_ssh_session_required');
  let opened,store;
  try {
    if(realpathSync(PATH)!==PATH)return fail('canonical_store_path_untrusted');
    if(args[0]==='--plan') {
      opened=openExistingJohnCopStore(PATH);
      if(!opened.ok)return fail(opened.error);
      const plan=continuationConsentPlan(opened.store);
      return plan.ok?{...plan,challenge_created:false}:plan;
    }
    // Only a verified existing COP path. No new ledger or authority DB.
    store=createSqliteCopEventStore(PATH);
    return requestContinuationConsent(store);
  }catch{return fail('canonical_consent_preparation_failed')}
  finally{opened?.close();store?.close()}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href) {
  const result=runContinuationConsentCli();
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exitCode=1;
}
