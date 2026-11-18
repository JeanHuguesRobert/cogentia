#!/usr/bin/env node
/**
 * Recover an ALREADY generated, otherwise undeliverable CPS browser Judgment.
 * Exactly one linked, public, pre-clicked continuation.
 * --preview: COP + published-source checks only, no browser/model action.
 * --apply: governed John read-only observation, canonical claim repair and
 * authenticated MCP result submit. NEVER submit a browser message.
 *
 * Load secrets solely from the resident ONA job context; never print them.
 */
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createSqliteCopEventStore}
  from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createContinuationSqliteRepository}
  from '../lib/continuation-sqlite-repository.mjs';
import {createCpsDefaultAssignedWorker} from
  '../lib/chatgpt-cps-default-worker.js';
import {sshFingerprint} from '../lib/john-sshsig-approval.js';
import {createOfflineJohnIssuerVerifier} from '../lib/john-offline-issuer-verifier.js';
import {createGovernedJohnBrowserAction} from
  '../lib/chatgpt-cps-john-dispatch.js';
import {inspectCpsVisibleRecovery,bindCpsVisibleRecovery,
  recordCpsVisibleRecoveryFractalog} from
  '../lib/cps-visible-result-recovery.mjs';
import {loadEnvFiles} from '../../../operium/lib/node-agent/job-env.js';
import {createMcpCore} from '../lib/cogentia-mcp-core.js';
import {resolveCallerAuth} from '../lib/cogentia-mcp-auth.js';
import {createCanonicalMcpJudgmentResultHost} from
  '../lib/cogentia-mcp-judgment-result-host.js';

const DB='/var/lib/cogentia/cop/john-root-v1.sqlite';
const ROOT='/srv/cogentia/repos/JeanHuguesRobert';
const PIN='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const args=process.argv.slice(2);
const id=args.find(a=>a.startsWith('--id='))?.slice(5);
const tabArg=args.find(a=>a.startsWith('--tab-id='))?.slice(9);
const tab_id=Number(tabArg);
const apply=args.includes('--apply');
const sourceHost=args.includes('--source-host-recovery');
const bad=!/^ctn_chatgpt_browser_[a-f0-9]{32}$/.test(id||'')||
  (tabArg!==undefined&&(!Number.isSafeInteger(tab_id)||tab_id<1))||
  (apply&&tabArg===undefined)||
  args.some(a=>a!=='--apply'&&a!=='--preview'&&
    a!=='--source-host-recovery'&&!a.startsWith('--id=')&&
    !a.startsWith('--tab-id='))||(apply&&args.includes('--preview'))||
  (sourceHost&&!apply);
const printed=x=>console.log(JSON.stringify(x));
if(bad){
  console.error('usage: --id=ctn_chatgpt_browser_<32hex> [--tab-id=N] [--preview|--apply [--source-host-recovery]]');
  process.exitCode=2;
}else{
 const store=createSqliteCopEventStore(DB);
 const local=createContinuationSqliteRepository({registryRoot:ROOT});
 try{
  const p=inspectCpsVisibleRecovery({store,local,continuation_id:id});
  if(!p.ok||p.status!=='eligible_for_visible_recovery'){
    const recoveryLog=p.ok&&p.status==='already_returned'&&apply
      ?recordCpsVisibleRecoveryFractalog({store,continuation_id:id})
      :null;
    printed({ok:p.ok,status:p.status,mode:apply?'apply':'preview',
      already_returned:p.status==='already_returned',provider_effects:0,
      recovered_fractalog_receipt_ref:recoveryLog?.ok
        ?recoveryLog.receipt_ref:null});
    if(!p.ok||recoveryLog&&!recoveryLog.ok)process.exitCode=1;
  }else if(!apply){
    printed({ok:true,mode:'preview',status:p.status,
      continuation_id:id,parent_id:p.parent_id,
      source_digest:p.source_digest,original_click_receipt_ref:p.original_click_receipt_ref,
      actual_browser_submission_required:false,provider_effects:0});
  }else{
    // The same ONA resident's environment, independently pinned issuer and
    // file-scoped transport credential; the general coding shell has no
    // automatic authority just because it can read this source.
    const pid=Number(execFileSync('systemctl',
      ['show','operium-node-agent.service','--value','-p','MainPID'],{
      encoding:'utf8'}).trim());
    if(!Number.isSafeInteger(pid)||pid<=1)
      throw Error('resident_ona_not_running');
    const content=readFileSync('/proc/'+pid+'/environ','utf8');
    const operatorEnv=Object.fromEntries(content.split('\0')
      .filter(x=>x.includes('=')).map(x=>{
        const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)];
      }));
    const env=loadEnvFiles(['/srv/cogentia/secrets/cps-john.env'],operatorEnv);
    const key=readFileSync(env.COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS,'utf8')
      .split('\n').find(x=>{try{return sshFingerprint(x)===PIN}catch{return false}});
    if(!key)throw Error('trusted_issuer_unavailable');
    const verifyIssuer=createOfflineJohnIssuerVerifier({
      trustedSshPublicKey:key,expectedSshFingerprint:PIN});
    const worker=createCpsDefaultAssignedWorker({store,env,verifyIssuer});
    const admitted=worker?await worker.admit():null;
    if(admitted?.granted!==true||
       admitted.provider_permitted!==true||
       admitted.budget_admitted!==true)
      throw Error('signed_cps_admission_refused');
    if(!env.COGENTIA_MCP_JHN_TOKEN)throw Error('governed_mcp_transport_not_configured');

    // Never call John's "submit". Observe only the old marked conversation,
    // under the same JHN verified authority and COP budget as ordinary CPS.
    const observer=createGovernedJohnBrowserAction({
      token:env.COGENTIA_MCP_JHN_TOKEN});
    const requestId='ctn_cpkt010_recovery_'+Date.now();
    const observed=await observer('observe',requestId,{
      action:'observe',tab_id,expected_continuation_id:id});
    if(observed.ok!==true)throw Error('governed_browser_observation_failed');
    const ready=await bindCpsVisibleRecovery({store,local,
      continuation_id:id,observed:observed.observation,
      john_request_id:observed.request_id,tab_id,admission:admitted});
    if(!ready.ok)throw Error(ready.status||'cps_recovery_not_admitted');
    // The original browser model already answered; this is a separately
    // attributed *observation reconstruction*, not a direct model tool call.
    let result,ok;
    if(sourceHost){
      // Explicit one-shot authority-preserving fallback when the installed
      // HTTP daemon has not reloaded the new claim projector. This is the
      // SAME canonical MCP tool, receipt host, signed issuer, browser-channel
      // permission and COP SQLite ledger as production, but invoked in a
      // separate short-lived local process. Never claim a daemon deployment.
      const config={COGENTIA_MCP_VIEW:'public',
        COGENTIA_MCP_JHN_MUTATE:'1',
        COGENTIA_MCP_JHN_TOKEN:env.COGENTIA_MCP_JHN_TOKEN};
      const caller=resolveCallerAuth(config,{
        headers:{authorization:'Bearer '+env.COGENTIA_MCP_JHN_TOKEN},
        meta:{'cogentia.actor':'agent:jhn',
          'cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'}});
      const core=createMcpCore(config,{
        mcpContinuationResultHost:createCanonicalMcpJudgmentResultHost({
          store,mandate_ref:'mandate:jhn:john-root',
          budget_id:'budget:mandate:jhn:john-root',
          transport_mandate_label:'mandate:chatgpt-corpus-coding',
          verifyIssuer,channelPermission:({provider,channel})=>
            admitted.granted===true&&admitted.provider_permitted===true&&
            provider==='chatgpt'&&channel==='browser',
          autoProcess:true,
        })});
      result=await core.callTool('cogentia_continuation_result_submit',
        ready.submission,{auth:caller});
      ok=result?.ok===true;
    }else{
      const request={jsonrpc:'2.0',id:'cps-visible-recovery:'+id,
        method:'tools/call',params:{
          name:'cogentia_continuation_result_submit',
          arguments:ready.submission}};
      const response=await fetch('http://127.0.0.1:8791/mcp',{
        method:'POST',signal:AbortSignal.timeout(35000),headers:{
          'Content-Type':'application/json',
          Authorization:'Bearer '+env.COGENTIA_MCP_JHN_TOKEN,
          'X-Cogentia-Actor':'agent:jhn',
          'X-Cogentia-Mandate':'mandate:chatgpt-corpus-coding'},
        body:JSON.stringify(request)});
      const rpc=await response.json();
      result=rpc?.result?.structuredContent?.data||{};
      ok=response.ok&&rpc.error==null&&result.ok===true;
    }
    const log=ok?recordCpsVisibleRecoveryFractalog({store,continuation_id:id}):null;
    const complete=ok&&log?.ok===true;
    printed({ok:complete,mode:'apply',status:complete?'recovered_result_admitted':
      ok?'recovered_result_fractalog_needs_reconciliation':
      'mcp_result_submission_needs_reconciliation',
      continuation_id:id,claim_receipt_ref:ready.claim_receipt_ref,
      observation_receipt_ref:ready.observation_receipt_ref,
      reconstructed_decision:ready.decision,
      source_mode:'governed_browser_observation',
      ingress_path:sourceHost?'local_one_shot_canonical_mcp_host':
        'resident_mcp_http_service',
      deployed_service_reloaded:false,
      model_browser_submissions:0,
      mcp_result_receipt_ref:ok?result.receipt_ref:null,
      mcp_status:ok?result.continuation_status:null,
      mcp_refusal:ok?null:typeof result.reason==='string'?
        result.reason:'not_admitted',
      fractalog_receipt_ref:log?.ok?log.receipt_ref:null,
      cop_audit:store.auditCommitments().ok});
    if(!complete)process.exitCode=1;
  }
 }catch(e){
  printed({ok:false,mode:apply?'apply':'preview',
    status:typeof e.message==='string'&&/^[a-z0-9_]+$/i.test(e.message)
      ?e.message:'reconciliation_execution_failed',
    provider_effects:0});
  process.exitCode=1;
 }finally{local.close();store.close()}
}
