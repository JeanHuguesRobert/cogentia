import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant,createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {executeJohnCanonicalChatgptTurn} from './john-cop-chatgpt-turn-execution.js';
const ref='mandate:jhn:john-root';
function fixture(granted=false){
 const store=createSqliteCopEventStore(':memory:');
 recordMandateDeclaration(store,{mandate_id:ref,version:'v2',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
   valid_until:'2027-11-06T00:00:00Z',
   scope:{allowed_actions:granted?['browser.chatgpt.turn']:['browser.hosted.inspect'],forbidden_actions:['gmail.send'],
     budget_ceiling:{max_steps:20},
     ...(granted?{chatgpt_turn_policy:{origin:'https://chatgpt.com',
       browser_instance_id:'fracta2-hosted',operations:['submit_prompt','observe_result'],require_cop_result_receipt:true}}:{})}});
 recordExecutionBudgetGrant(store,{budget_id:'budget:'+ref,mandate_ref:ref,principal_ref:'principal:jhn',limits:{max_steps:20}});
 return store;
}
const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'fixture'},
  {headers:{authorization:'Bearer fixture'},meta:{'cogentia.actor':'agent:jhn',
    'cogentia.mandate_ref':'mandate:chatgpt-corpus-coding'}});
const request={version:'john.request.v1',request_id:'jhn-test-chatgpt-1',
  capability:'browser.chatgpt.turn',exposure:'bounded',
  execution_budget:{max_steps:3,max_tool_calls:1,max_external_effects:0,max_internal_effects:1,max_subagents:0,max_elapsed_ms:8000},
  handler:{kind:'governed_reasoner',allowed_capabilities:['browser.chatgpt.turn']},
  input:{arguments:{action:'submit',tab_id:42,prompt:'Hello'}},
};
const verifier=()=>({verified:true,principal_ref:'principal:jhn',mandate_ref:ref});
const events=[
 {type:'john.run.completed',data:{result:{text:'{"submitted":true}'}}},
 {type:'john.accounting.settled',data:{observed_steps:2,internal_effects:1}},
];
test('without a signed policy no execution, no reservation',async()=>{
 const store=fixture();
 try{
  let runs=0;
  const r=await executeJohnCanonicalChatgptTurn({store,auth,request,
    verifyIssuer:verifier,run:async()=>{runs++;return events}});
  assert.equal(r.ok,false);
  assert.equal(runs,0);
  assert.equal(createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+ref,require_authority_grant:true}).snapshot().available.max_steps,20);
 }finally{store.close()}
});
test('signed scope plus independent issuer and reserve -> one action; duplicate does not replay',async()=>{
 const store=fixture(true);
 try{
  let runs=0;const go=()=>executeJohnCanonicalChatgptTurn({store,auth,request,
    verifyIssuer:verifier,run:async()=>{runs++;return events}});
  const r=await go();
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.settled_steps,2);
  assert.equal(runs,1);
  assert.equal((await go()).ok,false);
  assert.equal(runs,1);
  assert.equal(createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:'+ref,require_authority_grant:true}).snapshot().settled.max_steps,2);
 }finally{store.close()}
});

test('real John governed harness invokes the fixed browser recipe and settles COP',async()=>{
 const {runJohnRequest}=await import('./john-run.js');
 const {createChatgptTurnCapability}=await import('./browser-chatgpt-turn.js');
 const store=fixture(true);
 let remoteCalls=0;
 const gatewaySession=()=>({
   async withTabLease(browserId,tab,operation){assert.equal(browserId,'fracta2-hosted');assert.equal(tab,42);return operation(this)},
   async call(method,params){
     remoteCalls++;
     if(method==='tabs.list')return {tabs:[{id:42,url:'https://chatgpt.com/',title:'ChatGPT'}]};
     if(method==='page.insertText')return {insertedLength:params.text.length,tab:{id:42}};
     if(method==='page.evaluate')return {value:{ok:true,composer_found:true,click_dispatched:true}};
     throw Error('unsupported');
   },
   close(){},
 });
 const capability=createChatgptTurnCapability({sessionFactory:gatewaySession});
 const req={...request,request_id:'jhn-test-chatgpt-real-harness',
   principal:{id:'principal:jhn'},mandate:{id:'mandate:chatgpt-corpus-coding',version:'1'},
   budget:{id:'budget:'+ref},input:{prompt:'Hello',arguments:request.input.arguments},
   handler:{id:'governed.step_reasoner',kind:'governed_reasoner',
     allowed_capabilities:['browser.chatgpt.turn']}};
 try{
   const done=await executeJohnCanonicalChatgptTurn({store,auth,request:req,
     verifyIssuer:verifier,run:()=>runJohnRequest(req,{
       capabilities:[capability],allowedCapabilities:[capability.name],
       maxInternalEffects:1,requiredEvents:false,
       reasoner:{nextStep:async state=>{
         const observed=state.observations.find(x=>x.type==='capability_result'&&x.capability===capability.name);
         return observed
           ? {kind:'answer',answer:JSON.stringify(observed.value??{})}
           : {kind:'capability_call',capability:capability.name,input:req.input.arguments};
       }},
     })});
   assert.equal(done.ok,true,JSON.stringify(done));
   assert.ok(remoteCalls>=4,'actually dispatched browser RPC sequence');
   const ended=done.events.find(e=>e.type==='john.run.completed');
   assert.ok(ended,'complete handler turn with two steps');
   assert.equal(done.events.find(e=>e.type==='john.accounting.settled').data.internal_effects,1);
 }finally{store.close();}
});


test('terminal browser failure exposes only a sanitized reason from John receipt',async()=>{
 const store=fixture(true);
 try{
   const fail={...request,request_id:'jhn-test-diagnostic-failed'};
   const result=await executeJohnCanonicalChatgptTurn({store,auth,request:fail,
     verifyIssuer:verifier,run:async()=>[
       {type:'john.accounting.settled',data:{observed_steps:2}},
       {type:'john.run.failed',data:{data:{code:'harness_stopped',
         handler_error:{code:'send_button_not_ready'}}}},
     ]});
   assert.equal(result.error,'chatgpt_turn_failed');
   assert.equal(result.failure_code,'send_button_not_ready');
   assert.equal(result.executed,true);
 }finally{store.close()}
});
