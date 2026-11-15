#!/usr/bin/env node
/**
 * Opt-in, NO BROWSER EFFECT, existing Operium Node Agent script-job adapter.
 * Replays committed result wakes after MCP host crash, not ChatGPT outputs.
 * The resident ONA schedule is the only timer; no second scheduler created.
 */
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {sshFingerprint} from '../lib/john-sshsig-approval.js';
import {createOfflineJohnIssuerVerifier} from '../lib/john-offline-issuer-verifier.js';
import {createChatgptCpsLocalWakeReconciler} from '../lib/chatgpt-cps-return-evaluator.js';

const DB='/var/lib/cogentia/cop/john-root-v1.sqlite';
const FP='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const MANDATE='mandate:jhn:john-root';
const BUDGET='budget:'+MANDATE;
export async function runScheduledHeartbeat({env=process.env}={}){
  if(env.COGENTIA_CPS_WAKE_RECOVERY_ENABLED!=='1')
    return {ok:true,skipped:'not_enabled',external_effects:0};
  const publicKeyFile=env.COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS;
  if(!publicKeyFile||typeof publicKeyFile!=='string')
    return {ok:false,error:'trusted_issuer_not_configured'};
  let key;
  try{
    if(realpathSync(DB)!==DB||!statSync(DB).isFile())
      return {ok:false,error:'canonical_store_untrusted'};
    key=readFileSync(publicKeyFile,'utf8').split('\n').find(x=>{
      try{return sshFingerprint(x)===FP}catch{return false}
    });
  }catch{return {ok:false,error:'canonical_store_or_issuer_unavailable'}}
  if(!key)return {ok:false,error:'trusted_issuer_key_missing'};
  const store=createSqliteCopEventStore(DB);
  try{
    const verifyIssuer=createOfflineJohnIssuerVerifier({trustedSshPublicKey:key,
      expectedSshFingerprint:FP});
    const reconcile=createChatgptCpsLocalWakeReconciler({store,
      mandate_ref:MANDATE,budget_id:BUDGET,verifyIssuer});
    const result=await reconcile({max_steps:6});
    return {ok:result.ok,status:result.status,
      steps_completed:result.steps_completed,
      pending_count:result.pending_count,
      needs_reconciliation:result.needs_reconciliation,
      external_effects:0,autonomous_browser_worker:false,
      parent_mandate_completed:false};
  }finally{store.close()}
}

if(process.argv[1]&&import.meta.url===new URL('file:'+process.argv[1]).href){
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--status'){
    const {listChatgptCpsWakes}=await import('../lib/chatgpt-cps-wake-consumer.js');
    const store=createSqliteCopEventStore(DB);
    try{console.log(JSON.stringify({mode:'read_only',
      pending:listChatgptCpsWakes(store,{limit:25})}));}
    finally{store.close()}
  }else if(args.length===1&&args[0]==='--run-once'){
    const result=await runScheduledHeartbeat();
    console.log(JSON.stringify(result));
    if(!result.ok)process.exitCode=1;
  }else{
    console.error('Use --status or --run-once (opt-in only; no browser actions)');
    process.exitCode=2;
  }
}
