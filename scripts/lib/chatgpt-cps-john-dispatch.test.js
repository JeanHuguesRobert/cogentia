import test from 'node:test';
import assert from 'node:assert/strict';
import {createCpsGovernedJohnBrowserDispatch} from './chatgpt-cps-john-dispatch.js';
const id='ctn_chatgpt_browser_1234567890abcdef1234567890abcdef';
function fakeTransport({composer=true,delivered=true,receipt=true}={}){
  const calls=[];
  const fetchImpl=async(url,options)=>{
    assert.equal(url,'http://127.0.0.1:8791/mcp');
    assert.equal(options.headers['X-Cogentia-Mandate'],'mandate:chatgpt-corpus-coding');
    const req=JSON.parse(options.body);
    assert.equal(req.params.name,'cogentia_john_run');
    const john=req.params.arguments.request;
    assert.deepEqual(john.handler.allowed_capabilities,['browser.chatgpt.turn']);
    assert.equal(john.budget.id,'budget:mandate:jhn:john-root');
    calls.push(john.input.arguments.action);
    const action=john.input.arguments.action;
    const observation=action==='status'
      ?{stable_composer:composer,composer_blank:composer,generating:false}
      :{submitted:delivered,delivery_state:'ui_click_dispatched_not_model_result'};
    return {ok:true,json:async()=>({result:{structuredContent:{ok:true,
      data:{ok:true,text:JSON.stringify(observation),
        canonical_accounting:receipt?{settled_steps:2}:null}}}})};
  };
  return {calls,fetchImpl};
}
test('only existing localhost authenticated John route is allowed',()=>{
 assert.throws(()=>createCpsGovernedJohnBrowserDispatch({token:'',tab_id:1}),/required/);
 assert.throws(()=>createCpsGovernedJohnBrowserDispatch({token:'x',tab_id:1,
   mcpUrl:'https://some-other-host/'}),/required/);
});
test('real request schema status then submit, only UI click proven, not model result',async()=>{
 const fake=fakeTransport();
 const go=createCpsGovernedJohnBrowserDispatch({token:'fixture',tab_id:47,
   fetchImpl:fake.fetchImpl});
 const r=await go({continuation_id:id,prompt:'Fixed correlation, task and MCP return path'});
 assert.equal(r.ok,true);
 assert.equal(r.submitted,true);
 assert.equal(r.continuation_id,id);
 assert.match(r.execution_receipt_ref,/^john:jhn-cps-submit-/);
 assert.deepEqual(fake.calls,['status','submit']);
});
test('not-ready browser stops before submission',async()=>{
 const fake=fakeTransport({composer:false});
 const r=await createCpsGovernedJohnBrowserDispatch({token:'fixture',tab_id:47,
   fetchImpl:fake.fetchImpl})({continuation_id:id,prompt:'test'});
 assert.equal(r.error,'composer_not_ready');
 assert.deepEqual(fake.calls,['status']);
});
test('no canonical COP accounting means no certified browser submission',async()=>{
 const fake=fakeTransport({receipt:false});
 const r=await createCpsGovernedJohnBrowserDispatch({token:'fixture',tab_id:47,
   fetchImpl:fake.fetchImpl})({continuation_id:id,prompt:'test'});
 assert.equal(r.error,'john_cop_receipt_missing');
 assert.deepEqual(fake.calls,['status']);
});
test('ambiguous submitted delivery never pretends a model returned',async()=>{
 const fake=fakeTransport({delivered:false});
 const r=await createCpsGovernedJohnBrowserDispatch({token:'fixture',tab_id:47,
   fetchImpl:fake.fetchImpl})({continuation_id:id,prompt:'test'});
 assert.equal(r.error,'browser_dispatch_unconfirmed');
 assert.deepEqual(fake.calls,['status','submit']);
});
