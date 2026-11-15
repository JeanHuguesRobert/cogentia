#!/usr/bin/env node
/**
 * One-time standing ChatGPT turn mandate amendment request.
 * Owner SSH creates a review challenge, NEVER a grant.
 * A separate authenticated JHN Supabase session approves and applies vN+1.
 */
import {readFileSync,realpathSync} from 'node:fs';
import {openExistingJohnCopStore} from '../lib/john-cop-existing-store.js';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createOfflineJohnIssuerVerifier} from '../lib/john-offline-issuer-verifier.js';
import {sshFingerprint} from '../lib/john-sshsig-approval.js';
import {createJhnCanonicalConsentWorkflow} from '../lib/jhn-canonical-consent-workflow.js';
import {johnChatgptTurnMandatePlan} from '../lib/jhn-chatgpt-turn-mandate-plan.js';

const PATH='/var/lib/cogentia/cop/john-root-v1.sqlite';
const KEY_PATH='/home/ubuntu/.ssh/authorized_keys';
const FINGERPRINT='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const REF='mandate:jhn:john-root';
const fail=error=>({ok:false,error,mandate_amended:false,execution:false});
function issuerVerified(store){
 let key;
 try{key=readFileSync(KEY_PATH,'utf8').split('\n').find(x=>{
   try{return sshFingerprint(x)===FINGERPRINT}catch{return false}
 })}catch{return false}
 if(!key)return false;
 const current=resolveMandate(store,REF);
 try{return createOfflineJohnIssuerVerifier({trustedSshPublicKey:key,
    expectedSshFingerprint:FINGERPRINT})({mandate:current,mandate_ref:REF,store}).verified===true}
 catch{return false}
}
export async function runChatgptTurnConsentCli({
 args=process.argv.slice(2),ownerShell=Boolean(process.env.SSH_CONNECTION),
 path=PATH,verifyIssuer=issuerVerified,
}={}){
 if(args.length!==1||!['--plan','--request'].includes(args[0]))
   return fail('usage: --plan|--request');
 if(args[0]==='--request'&&!ownerShell)return fail('owner_ssh_session_required');
 let store,opened;
 try{
   if(realpathSync(path)!==path)return fail('canonical_store_path_invalid');
   if(args[0]==='--request')store=createSqliteCopEventStore(path);
   else {opened=openExistingJohnCopStore(path);if(!opened.ok)return fail(opened.error);
      store=opened.store;}
   if(!verifyIssuer(store))return fail('canonical_issuer_unverified');
   const plan=johnChatgptTurnMandatePlan({store});
   if(!plan.ok||plan.already_authorized_in_scope)return plan;
   if(args[0]==='--plan')return {...plan,challenge_created:false};
   const workflow=createJhnCanonicalConsentWorkflow({store});
   const created=workflow.request({mandate:plan.mandate,ttl_ms:600000});
   if(!created.ok)return fail(created.error||'consent_request_failed');
   const check=workflow.inspect({challenge_id:created.challenge_id});
   if(!check.ok||check.status!=='pending'||check.payload_hash!==created.payload_hash)
     return fail('challenge_receipt_unconfirmed');
   return {ok:true,challenge_created:true,mandate_amended:false,execution:false,
     mandate_ref:REF,previous_version:plan.previous_version,
     added_capabilities:plan.added_capabilities,
     url:'https://jhn.baronsmariani.org/cop/consent/'+created.challenge_id,
     challenge_id:created.challenge_id,payload_hash:created.payload_hash,
     expires_at:created.expires_at,requires_supabase_principal_decision:true};
 }catch{return fail('canonical_consent_request_unavailable')}
 finally{opened?.close();if(args[0]==='--request')store?.close()}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const result=await runChatgptTurnConsentCli();
 console.log(JSON.stringify(result,null,2));
 if(!result.ok)process.exitCode=1;
}
