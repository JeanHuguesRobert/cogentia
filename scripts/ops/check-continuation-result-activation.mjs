#!/usr/bin/env node
/**
 * Read-only continuation-result activation diagnostics.
 * Does NOT issue/revoke a mandate, open the canonical SQLite store for writing,
 * restart a service or print any environment values/secrets.
 */
import {execFileSync} from 'node:child_process';
import {realpathSync, statSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {MUTATE_TOOLS} from '../lib/cogentia-mcp-core.js';

const ROOT = resolve(fileURLToPath(new URL('../../',import.meta.url)));
const MODULE = resolve(ROOT,'scripts/lib/cogentia-mcp-judgment-result-runtime.js');
const EXPECTED_STORE='/var/lib/cogentia/cop/john-root-v1.sqlite';
const EXPECTED_FP='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const check=(ok,reason)=>({ok:Boolean(ok),reason:ok?'ready':reason});

function readServiceEnv(){
  const output=execFileSync('systemctl',['show','mcp-cogentia.service','--value','-p','Environment'],
    {encoding:'utf8',timeout:4000,stdio:['ignore','pipe','ignore']});
  // EnvironmentFile contents are deliberately NOT queried: credentials must
  // never pass through this diagnostic or its output.
  return output;
}
function hasEnv(env, name, value) {
  const pattern=new RegExp('(?:^|\\s)'+name+'=([^\\s]+)');
  const match=pattern.exec(env);
  return value === undefined ? Boolean(match&&match[1]) : Boolean(match&&match[1]===value);
}
function inspect({env='',storePath=EXPECTED_STORE,keyPath='/home/ubuntu/.ssh/authorized_keys',
  unitActive=false,startedAfterSource=false,mandateStatus=null,anonymousToolVisible=false,toolContractRegistered=MUTATE_TOOLS.has('cogentia_continuation_result_submit')}={}){
  const runtime=hasEnv(env,'COGENTIA_MCP_JUDGMENT_RESULT_ENABLED','1');
  const channels=hasEnv(env,'COGENTIA_MCP_JUDGMENT_RESULT_PERMITTED_CHANNELS');
  const transport=hasEnv(env,'COGENTIA_MCP_JHN_MUTATE','1') &&
      hasEnv(env,'COGENTIA_MCP_JHN_TOKEN');
  const checks={
    service_active:check(unitActive,'mcp_service_inactive'),
    source_deployed:check(startedAfterSource,'restart_for_new_server_code_pending'),
    mandate:check(mandateStatus?.verified===true,'signed_mandate_not_verified'),
    budget:check(mandateStatus?.budget===true,'canonical_budget_not_verified'),
    store_reference:check(storePath===EXPECTED_STORE,'canonical_store_path_mismatch'),
    trusted_issuer_reference:check(Boolean(keyPath),'trusted_issuer_path_missing'),
    runtime_enabled:check(runtime,'result_runtime_not_enabled'),
    allowed_channels_configured:check(channels,'provider_channel_allowlist_missing'),
    jhn_authenticated_mutate_configured:check(transport,'jhn_mutate_transport_not_verified_in_unit_environment'),
    source_tool_contract:check(toolContractRegistered,'result_tool_not_registered_in_source'),
  };
  return {schema:'cogentia.continuation-result-readiness/v2',ready:Object.values(checks).every(x=>x.ok),checks,
    discovery:{anonymous_public_tool_visible:Boolean(anonymousToolVisible),
      authenticated_jhn_tool_visible:'not_checked'},
    note:'Public /tools deliberately hides mutate tools. Ready means local configuration checks only, NOT live JHN authentication, provider permission, actual result receipt, or autonomous redispatch.'};
}
export {inspect};

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let env='',unitActive=false,startedAfterSource=false,anonymousToolVisible=false,mandateStatus=null;
  let path=EXPECTED_STORE,keyPath='/home/ubuntu/.ssh/authorized_keys';
  try {env=readServiceEnv();} catch {}
  try {execFileSync('systemctl',['is-active','--quiet','mcp-cogentia.service'],{stdio:'ignore',timeout:3000});unitActive=true;} catch {}
  try {
    const sourceAge=statSync(MODULE).mtimeMs;
    // Compare source file mtime against wall-clock service start; never
    // convert monotonic uptime to a wall-clock timestamp.
    const started=execFileSync('systemctl',['show','mcp-cogentia.service','--value','-p','ExecMainStartTimestamp'],
      {encoding:'utf8',timeout:3000}).trim();
    const parsed=Date.parse(started.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) /,''));
    startedAfterSource=Boolean(Number.isFinite(parsed)&&parsed>=sourceAge);
  }catch{}
  try {
    const url='http://127.0.0.1:8791/tools';
    const raw=execFileSync('curl',['-fsS','--max-time','3',url],{encoding:'utf8',timeout:4500});
    anonymousToolVisible=JSON.parse(raw).tools?.some(x=>x.name==='cogentia_continuation_result_submit')===true;
  }catch{}
  // Check read-only canonical mandate and issuer by reusing the existing
  // preflight, which opens no writer and reports no secret values.
  try {
    const {openExistingJohnCopStore}=await import('../lib/john-cop-existing-store.js');
    const {createOfflineJohnIssuerVerifier}=await import('../lib/john-offline-issuer-verifier.js');
    const {sshFingerprint}=await import('../lib/john-sshsig-approval.js');
    const {resolveMandate}=await import('../../../inseme/packages/cop-core/src/governed-act.js');
    const {createEventSourcedExecutionBudgetLedger}=await import('../../../inseme/packages/cop-core/src/execution-budget.js');
    if(realpathSync(path)!==EXPECTED_STORE)throw Error('untrusted_path');
    const key=readFileSync(keyPath,'utf8').split('\n').find(x=>{try{return sshFingerprint(x)===EXPECTED_FP}catch{return false}});
    const opened=openExistingJohnCopStore(path);
    if(!opened.ok)throw Error('store_unavailable');
    try{
      const ref='mandate:jhn:john-root';
      const mandate=resolveMandate(opened.store,ref);
      const verify=createOfflineJohnIssuerVerifier({trustedSshPublicKey:key,expectedSshFingerprint:EXPECTED_FP});
      const proof=verify({mandate,mandate_ref:ref,store:opened.store});
      const budget=createEventSourcedExecutionBudgetLedger({store:opened.store,budget_id:'budget:'+ref,
        limits:{max_steps:2048},require_authority_grant:true}).snapshot();
      mandateStatus={verified:proof.verified===true && mandate?.scope?.allowed_actions?.includes('cogentia.continuation.result.submit'),
        budget:budget.has_grant===true && (budget.available?.max_steps||0)>0};
    }finally{opened.close()}
  }catch{mandateStatus={verified:false,budget:false}}
  const report=inspect({env,storePath:path,keyPath,unitActive,startedAfterSource,mandateStatus,anonymousToolVisible});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.ready?0:2;
}
