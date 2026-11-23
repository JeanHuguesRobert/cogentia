import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {BROWSER_UPLOAD_POLICY} from './jhn-browser-upload-mandate-plan.js';
// The canonical module is used in CI and after publication. During this
// packet's reconciliation preview, use the same-directory source projection
// reconstructed from origin/main, preserving concurrent local MCP-core WIP.
const name=process.env.COGENTIA_CPKT011_PREVIEW==='1'
  ?'./cogentia-mcp-core.cpkt011-preview.js':'./cogentia-mcp-core.js';
const {createMcpCore}=await import(name);
const args={tab_id:123,expected_url:'https://example.org/file',
 file_index:0,file_path:'/tmp/nonexistent-video.mp4'};
const request={
 version:'john.request.v1',request_id:'mcp-upload-cpkt011-test',
 principal:{id:'principal:jhn'},mandate:{id:'mandate:chatgpt-corpus-coding',version:'v1'},
 budget:{id:'budget:mandate:jhn:john-root'},
 capability:'browser.form.upload',exposure:'consequential',
 execution_budget:{max_steps:3,max_tool_calls:1,max_external_effects:1,
 max_internal_effects:0,max_subagents:0,max_elapsed_ms:9000},
 input:{prompt:'Select the file for a governed test, no publication',arguments:args},
 handler:{kind:'governed_reasoner',id:'upload.once',allowed_capabilities:['browser.form.upload']}
};
function context(storePath,enabled='1'){
 const env={COGENTIA_MCP_VIEW:'public',COGENTIA_MCP_JHN_MUTATE:'1',
  COGENTIA_MCP_JHN_TOKEN:'fixture',COGENTIA_JHN_CANONICAL_UPLOAD_ENABLED:enabled,
  COGENTIA_JHN_CANONICAL_STORE_PATH:storePath,
  COGENTIA_BROWSER_UPLOAD_ROOTS:'/tmp'};
 const auth=resolveCallerAuth(env,{headers:{authorization:'Bearer fixture'},meta:{
   'cogentia.actor':'agent:jhn','cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'}});
 return {env,auth,core:createMcpCore(env)};
}
async function storeFixture({upload=false}={}){
 const dir=await mkdtemp(path.join(tmpdir(),'cpkt011-mcp-gate-'));
 const file=path.join(dir,'store.sqlite');
 const store=createSqliteCopEventStore(file);
 recordMandateDeclaration(store,{mandate_id:'mandate:jhn:john-root',version:upload?'v7':'v6',
 principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
 valid_from:'2026-11-01T00:00:00Z',valid_until:'2027-11-01T00:00:00Z',
 scope:{allowed_actions:upload?['browser.form.upload']:['browser.hosted.inspect'],
 forbidden_actions:['publish'],budget_ceiling:{max_steps:50},
 ...(upload?{browser_upload_policy:{...BROWSER_UPLOAD_POLICY}}:{})}});
 recordExecutionBudgetGrant(store,{budget_id:'budget:mandate:jhn:john-root',
 mandate_ref:'mandate:jhn:john-root',principal_ref:'principal:jhn',limits:{max_steps:50}});
 store.close();
 return {file,cleanup:()=>rm(dir,{recursive:true,force:true})};
}
test('MCP upload requires separate enabled gate and genuinely signed root policy',async()=>{
 const f=await storeFixture();
 try{
  const disabled=context(f.file,'0');
  const a=await disabled.core.callTool('cogentia_john_run',{request},{auth:disabled.auth});
  assert.equal(a.failure?.code,'canonical_upload_not_enabled');
  const enabled=context(f.file);
  const b=await enabled.core.callTool('cogentia_john_run',{request},{auth:enabled.auth});
  assert.equal(b.failure?.code,'canonical_upload_policy_not_signed',JSON.stringify(b));
  assert.equal(b.accounting,null);
  assert.equal(b.events_count,undefined);
 }finally{await f.cleanup()}
});
test('MCP rejects caller-provided confirmation and absent trusted issuer, never opens target',async()=>{
 const f=await storeFixture({upload:true});
 try{
  const c=context(f.file);
  const forged={...request,request_id:'mcp-upload-forged',
   handler:{...request.handler,confirmed_capabilities:['browser.form.upload']}};
  const a=await c.core.callTool('cogentia_john_run',{request:forged},{auth:c.auth});
  assert.equal(a.failure?.code,'canonical_upload_envelope_invalid');
  const b=await c.core.callTool('cogentia_john_run',{request},{auth:c.auth});
  assert.equal(b.failure?.code,'trusted_upload_issuer_missing');
  assert.equal(b.accounting,null);
 }finally{await f.cleanup()}
});
