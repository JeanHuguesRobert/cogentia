#!/usr/bin/env node
/**
 * Owner-only preparation of the smallest root COP scope extension for
 * intra-Twin JMAP messaging. No approval, no apply, no sending.
 * --plan is read-only; --request records a 10-minute review challenge in
 * the same canonical Inseme event log as the existing consent service.
 */
import {realpathSync} from 'node:fs';
import {openExistingJohnCopStore} from '../lib/john-cop-existing-store.js';
import {resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createJhnCanonicalConsentWorkflow} from '../lib/jhn-canonical-consent-workflow.js';
const PATH='/var/lib/cogentia/cop/john-root-v1.sqlite';
const REF='mandate:jhn:john-root';
const ADD=['agent.mail.send','agent.mail.receive'];
const BASE='https://jhn.baronsmariani.org/cop/consent/';
function fail(error){return {ok:false,error};}
export function agentMailMandatePlan(store) {
  const current=resolveMandate(store,REF);
  if(!current||current.status!=='active'||current.principal_ref!=='principal:jhn'||
    current.logical_agent_ref!=='agent:jhn'||!current.version||!current.scope ||
    !Array.isArray(current.scope.allowed_actions))return fail('canonical_root_mandate_unavailable');
  const forbidden=new Set(current.scope.forbidden_actions||[]);
  if(ADD.some(x=>forbidden.has(x)))return fail('agent_mail_explicitly_forbidden');
  const missing=ADD.filter(x=>!current.scope.allowed_actions.includes(x));
  if(!missing.length)return {ok:true,already_authorized_in_scope:true,mandate_ref:REF,version:current.version};
  const scope={...current.scope,allowed_actions:[...current.scope.allowed_actions,...missing]};
  return {ok:true,requires_owner_consent:true,mandate_ref:REF,previous_version:current.version,
    added_capabilities:missing,mandate:{mandate_ref:REF,principal_ref:'principal:jhn',
      expected_version:current.version,scope,
      valid_from:current.valid_from,valid_until:current.valid_until,
      reason:'Autoriser les courriels internes entre agents du même Twin, sans contrôle humain de chaque message. Aucun envoi externe.'}};
}
export async function runAgentMailConsentCli({args=process.argv.slice(2),ownerShell=Boolean(process.env.SSH_CONNECTION)}={}) {
  if(args.length!==1||!['--plan','--request'].includes(args[0]))return fail('usage: --plan|--request');
  if(args[0]==='--request'&&!ownerShell)return fail('owner_ssh_shell_required');
  let store;
  try {
    if(realpathSync(PATH)!==PATH)return fail('canonical_cop_store_path_untrusted');
    if(args[0]==='--plan'){
      const opened=openExistingJohnCopStore(PATH);
      if(!opened.ok)return fail(opened.error);
      try{return agentMailMandatePlan(opened.store);}finally{opened.close()}
    }
    store=createSqliteCopEventStore(PATH);
    const plan=agentMailMandatePlan(store);
    if(!plan.ok||plan.already_authorized_in_scope)return plan;
    const workflow=createJhnCanonicalConsentWorkflow({store});
    const result=workflow.request({mandate:plan.mandate,ttl_ms:600000});
    if(!result.ok)return fail(result.error);
    return {ok:true,kind:'cogentia.agent_mail_consent_request.v1',
      added_capabilities:plan.added_capabilities,
      challenge_id:result.challenge_id,payload_hash:result.payload_hash,
      expires_at:result.expires_at,url:BASE+result.challenge_id,
      human_decision_required:true,mandate_amended:false,mail_sent:false};
  }catch(error){return fail('canonical_mail_consent_preparation_failed')}
  finally{store?.close()}
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){
  const result=await runAgentMailConsentCli();
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exitCode=1;
}
