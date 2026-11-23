import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant,createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {runJohnRequest} from './john-run.js';
import {executeJohnCanonicalUpload} from './john-cop-upload-execution.js';
import {BROWSER_UPLOAD_POLICY} from './jhn-browser-upload-mandate-plan.js';
const REF='mandate:jhn:john-root';
const url='https://example.org/test';
const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'fixture'},
 {headers:{authorization:'Bearer fixture'},meta:{'cogentia.actor':'agent:jhn',
  'cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'}});
const args={tab_id:42,expected_url:url,file_index:0,file_path:'/tmp/simulated-file.txt'};
const request={
 version:'john.request.v1',request_id:'cop-upload-20261123-1',
 principal:{id:'principal:jhn'},mandate:{id:'mandate:chatgpt-corpus-coding',version:'1'},
 budget:{id:'budget:'+REF},
 capability:'browser.form.upload',exposure:'consequential',
 execution_budget:{max_steps:3,max_tool_calls:1,max_external_effects:1,
  max_internal_effects:0,max_subagents:0,max_elapsed_ms:12000},
 input:{prompt:'Test a single canonical browser file selection',arguments:args},
 handler:{id:'governed.upload.once',kind:'governed_reasoner',allowed_capabilities:['browser.form.upload']}
};
function fixture({allowed=true,policy=true}={}){
 const store=createSqliteCopEventStore(':memory:');
 const scope={allowed_actions:allowed?['browser.form.upload']:['browser.hosted.inspect'],
  forbidden_actions:['publish','gmail.send'],budget_ceiling:{max_steps:24},
  ...(policy?{browser_upload_policy:{...BROWSER_UPLOAD_POLICY}}:{})};
 assert.equal(recordMandateDeclaration(store,{mandate_id:REF,version:'v7',
  principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
  valid_from:'2026-11-01T00:00:00Z',valid_until:'2027-11-06T00:00:00Z',scope}).ok,true);
 assert.equal(recordExecutionBudgetGrant(store,{budget_id:'budget:'+REF,
  mandate_ref:REF,principal_ref:'principal:jhn',limits:{max_steps:24}}).ok,true);
 return store;
}
const verifier=()=>({verified:true,principal_ref:'principal:jhn',mandate_ref:REF});
const sampleEvents=[
 {type:'john.run.completed',data:{result:{text:'{"selected":true}'}}},
 {type:'john.tool.receipt',data:{capability:'browser.form.upload',status:'completed'}},
 {type:'john.accounting.settled',data:{observed_steps:2,external_effects:1}}
];
test('upload rejects unapproved scope, issuer and envelope before any external call',async()=>{
 let calls=0;
 for(const o of [{allowed:false},{policy:false},{allowed:true,policy:true}]){
  const store=fixture(o);
  try{
   const opts={store,auth,request,run:async()=>{calls++;return sampleEvents}};
   if(o.allowed===false||o.policy===false){
    assert.equal((await executeJohnCanonicalUpload({...opts,verifyIssuer:verifier})).error,'canonical_upload_policy_not_signed');
   }else{
    const noIssuer=await executeJohnCanonicalUpload({...opts,verifyIssuer:()=>({verified:false})});
    assert.equal(noIssuer.ok,false);
    for(const invalid of [
      {...request,execution_budget:{...request.execution_budget,max_external_effects:0}},
      {...request,handler:{...request.handler,confirmed_capabilities:['browser.form.upload']}},
      {...request,handler:{...request.handler,allowed_capabilities:['browser.form.fill']}},
      {...request,exposure:'bounded'},
      {...request,input:{...request.input,arguments:{...args,expected_url:'http://example.org/'}}},
      {...request,input:{...request.input,arguments:{...args,extra:'injected'}}},
    ]){
     const x=await executeJohnCanonicalUpload({...opts,request:invalid,verifyIssuer:verifier});
     assert.equal(x.ok,false);
     assert.equal(x.executed,false);
    }
   }
  }finally{store.close()}
 }
 assert.equal(calls,0);
});
test('signed authority reserves and settles; idempotent replay cannot upload twice',async()=>{
 const store=fixture();let calls=0;
 try{
  const run=async()=>{calls++;return sampleEvents};
  const execute=()=>executeJohnCanonicalUpload({store,auth,request,verifyIssuer:verifier,run});
  const good=await execute();
  assert.equal(good.ok,true,JSON.stringify(good));
  assert.equal(good.settled_steps,2);
  assert.equal(calls,1);
  assert.equal((await execute()).error,'canonical_upload_request_duplicate');
  assert.equal(calls,1);
  const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+REF,require_authority_grant:true}).snapshot();
  assert.equal(ledger.settled.max_steps,2);
 }finally{store.close()}
});
test('real governed harness counts one external effect, redacts file path and cannot claim publication',async()=>{
 const store=fixture();
 let effect=0;
 const cap={
  name:'browser.form.upload',kind:'tool',risk:'external_write',costUnits:2,
  async execute(input){effect++;assert.deepEqual(input,args);
   return {ok:true,file_selected:true,selected_file_bytes:19,browser_verified_bytes:19,
    submitted:false,upload_completion:'unverified'};}
 };
 try{
  const done=await executeJohnCanonicalUpload({store,auth,request,verifyIssuer:verifier,
   run:()=>runJohnRequest(request,{capabilities:[cap],allowedCapabilities:['browser.form.upload'],
    confirmedCapabilities:['browser.form.upload'],maxInternalEffects:0,requiredEvents:false,
    reasoner:{nextStep:async state=>{
     if(state.observations.some(x=>x.type==='capability_result'))return {kind:'answer',answer:'selected'};
     return {kind:'capability_call',capability:'browser.form.upload',input:args};
    }}
   })});
  assert.equal(done.ok,true,JSON.stringify(done));
  assert.equal(effect,1);
  const accounting=done.events.find(x=>x.type==='john.accounting.settled').data;
  assert.equal(accounting.external_effects,1);
  assert.equal(accounting.internal_effects,0);
  const requestTrace=done.events.find(x=>x.type==='john.tool.requested');
  assert.equal(requestTrace.data.input.file_path,'[redacted]');
  assert.equal(JSON.stringify(requestTrace).includes('/tmp/simulated-file'),false);
  assert.equal(done.events.some(x=>x.type==='john.tool.receipt'),true);
 }finally{store.close()}
});
test('a failed upload still consumes the canonical attempt budget, does not manufacture success',async()=>{
 const store=fixture();
 try{
  const failed=await executeJohnCanonicalUpload({store,auth,request,verifyIssuer:verifier,
   run:async()=>[{type:'john.run.failed',data:{reason:'unreadable'}},
     {type:'john.accounting.settled',data:{observed_steps:2,external_effects:1}}]});
  assert.equal(failed.ok,false);
  assert.equal(failed.executed,true);
  const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+REF,require_authority_grant:true}).snapshot();
  assert.equal(ledger.settled.max_steps,2);
 }finally{store.close()}
});
