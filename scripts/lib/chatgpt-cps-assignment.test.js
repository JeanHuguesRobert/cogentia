import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {issueVerifiedJohnRoot} from './john-root-issuance.js';
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,
  proposalHash,publicKeyFingerprint} from './john-root-mandate.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {prepareAssignedChatgptCpsContinuation} from './chatgpt-cps-assignment.js';
import {createCpsDefaultAssignedWorker,createCpsDefaultNextWorker} from './chatgpt-cps-default-worker.js';
import {runChatgptCpsResidentCycle} from '../ops/ona-chatgpt-cps-reconcile.mjs';
import {listAssignedChatgptCpsContinuations,buildAssignedChatgptCpsPrompt} from './chatgpt-cps-assigned-dispatch.js';
const REF='mandate:jhn:john-root';
function signedStore(capability=true){
 const store=createSqliteCopEventStore(':memory:');
 const key=generateKeyPairSync('ed25519');
 const pem=key.publicKey.export({type:'spki',format:'pem'});
 const proposal={kind:ROOT_MANDATE_KIND,mandate_id:REF,version:'v1',
  principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
  valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-01-01T00:00:00Z',
  scope:{allowed_actions:capability?['browser.chatgpt.turn']:['browser.hosted.inspect'],
    forbidden_actions:[...RESERVED_ACTIONS],
    ...(capability?{chatgpt_turn_policy:{origin:'https://chatgpt.com',
      browser_instance_id:'fracta2-hosted',max_consecutive_turns:8,
      require_cop_result_receipt:true}}:{})},
  max_delegation_depth:1,budget_limits:{max_steps:40}};
 const approval={kind:'cogentia.principal-signature/v1',principal_ref:'principal:jhn',
  payload_hash:proposalHash(proposal),key_fingerprint:publicKeyFingerprint(pem),
  signature_base64:sign(null,canonicalProposalBytes(proposal),key.privateKey).toString('base64')};
 const issued=issueVerifiedJohnRoot({store,proposal,approval,
  trustedPublicKeyPem:pem,now:new Date('2026-11-15T12:00:00Z')});
 assert.equal(issued.ok,true,JSON.stringify(issued));
 return store;
}
test('one signed standing mandate produces multiple ordinary assigned packets, no new mandate or scheduler',async()=>{
 const s=signedStore();try{
  const a=await prepareAssignedChatgptCpsContinuation({store:s,
    task_ref:'issue:JeanHuguesRobert/cogentia#330:stage-1',question:'Inspect the next canonical issue'});
  const b=await prepareAssignedChatgptCpsContinuation({store:s,
    task_ref:'issue:JeanHuguesRobert/cogentia#330:stage-2',question:'Summarize the findings'});
  assert.equal(a.ok,true,JSON.stringify(a));assert.equal(a.duplicate,false);
  assert.equal(b.ok,true);assert.notEqual(a.continuation_id,b.continuation_id);
  assert.equal(a.mandate_version,'v1');
  const replay=await prepareAssignedChatgptCpsContinuation({store:s,
    task_ref:'issue:JeanHuguesRobert/cogentia#330:stage-1',question:'Inspect the next canonical issue'});
  assert.equal(replay.ok,true);assert.equal(replay.duplicate,true);
  assert.equal(replay.continuation_id,a.continuation_id);
  const conflict=await prepareAssignedChatgptCpsContinuation({store:s,
    task_ref:'issue:JeanHuguesRobert/cogentia#330:stage-1',question:'Changed task instructions'});
  assert.equal(conflict.error,'task_assignment_conflict');
  const queue=listAssignedChatgptCpsContinuations(s);
  assert.equal(queue.length,2);
  assert.deepEqual(queue.map(x=>x.status),['ready','ready']);
  const first=s.listTopic('continuation:'+a.continuation_id)[0].payload.continuation;
  assert.equal(buildAssignedChatgptCpsPrompt(first).ok,true);
  const snapshot=createEventSourcedExecutionBudgetLedger({store:s,
    budget_id:'budget:'+REF,require_authority_grant:true}).snapshot();
  assert.equal(snapshot.reserved.max_steps,2);
  assert.equal(s.auditCommitments().ok,true);
 }finally{s.close()}
});
test('no signed browser scope or malformed task means no budget, claim or continuation',async()=>{
 const s=signedStore(false);try{
  const denied=await prepareAssignedChatgptCpsContinuation({store:s,
    task_ref:'task:unpermitted',question:'Do a browser action'});
  assert.equal(denied.error,'signed_chatgpt_turn_mandate_required');
  const invalid=await prepareAssignedChatgptCpsContinuation({store:s,
    task_ref:'task:invalid with spaces',question:'Question'});
  assert.equal(invalid.error,'invalid_task_assignment');
  assert.deepEqual(listAssignedChatgptCpsContinuations(s),[]);
 }finally{s.close()}
});

test('default ONA worker requires explicit operator channel review and authenticated John transport',async()=>{
 const s=signedStore();try{
  const base={COGENTIA_CPS_BROWSER_DISPATCH_ENABLED:'1',
    COGENTIA_CPS_BROWSER_DISPATCH_PERMITTED_CHANNELS:'chatgpt:browser',
    COGENTIA_CPS_BROWSER_PROVIDER_PERMISSION_REF:'provider:reviewed:fixture',
    COGENTIA_MCP_JHN_TOKEN:'fixture-opaque-token',
    COGENTIA_CPS_BROWSER_TAB_ID:'47'};
  const issuer=()=>({verified:true,principal_ref:'principal:jhn',mandate_ref:REF});
  assert.equal(createCpsDefaultAssignedWorker({store:s,env:{},verifyIssuer:issuer}),null);
  assert.equal(createCpsDefaultAssignedWorker({store:s,env:{...base,
    COGENTIA_CPS_BROWSER_DISPATCH_PERMITTED_CHANNELS:''},verifyIssuer:issuer}),null);
  assert.equal(createCpsDefaultAssignedWorker({store:s,env:{...base,
    COGENTIA_MCP_JHN_TOKEN:''},verifyIssuer:issuer}),null);
  const worker=createCpsDefaultAssignedWorker({store:s,env:base,
    verifyIssuer:issuer,fetchImpl:async()=>{throw Error('no real traffic in fixture')}});
  assert.ok(worker);
  const grant=await worker.admit();
  assert.equal(grant.granted,true,JSON.stringify(grant));
  assert.equal(grant.provider_permitted,true);
  assert.equal(grant.provider_permission_receipt_ref,base.COGENTIA_CPS_BROWSER_PROVIDER_PERMISSION_REF);
  const wrongIssuer=createCpsDefaultAssignedWorker({store:s,env:base,
    verifyIssuer:()=>({verified:false}),fetchImpl:async()=>{throw Error('no traffic')}});
  assert.equal((await wrongIssuer.admit()).granted,false);
 }finally{s.close()}
});
test('agent-proposed next question becomes another bounded reserved child, no second LLM judge',async()=>{
 const s=signedStore();try{
  const parent=await prepareAssignedChatgptCpsContinuation({store:s,
    task_ref:'goal:autonomous-chain:1',question:'First cognitive step'});
  assert.equal(parent.ok,true);
  let submitted=0;
  const assignedWorker={
    admit:async()=>({granted:true,provider_permitted:true,budget_admitted:true,
      authorization_ref:'mandate:jhn:john-root@v1',
      provider_permission_receipt_ref:'provider:fixture',budget_authorization_ref:'budget:fixture'}),
    dispatch:async({continuation_id})=>{submitted++;return {ok:true,submitted:true,
      continuation_id,execution_receipt_ref:'john:fixture:'+continuation_id}},
  };
  const next=createCpsDefaultNextWorker({store:s,assignedWorker});
  const action={continuation_id:parent.continuation_id,
    action_id:'inspect-following-source',next_question:'Inspect the next canonical source'};
  assert.equal((await next.admit(action)).granted,true);
  const child=await next.dispatch(action);
  assert.equal(child.ok,true,JSON.stringify(child));
  assert.notEqual(child.child_continuation_id,parent.continuation_id);
  assert.equal(submitted,1);
  const childEntry=s.listTopic('continuation:'+child.child_continuation_id)
    .find(e=>e.payload?.profile==='cop/continuation').payload.continuation;
  assert.equal(childEntry.state.hop_count,1);
  assert.equal(childEntry.state.question,action.next_question);
  assert.equal(listAssignedChatgptCpsContinuations(s).some(x=>x.continuation_id===child.child_continuation_id),false);
  const replay=await next.dispatch(action);
  assert.equal(replay.ok,false);
  assert.equal(submitted,1);
 }finally{s.close()}
});

test('three CPS cognitive turns chain through the SAME resident ONA cycle, then stop',async()=>{
 const s=signedStore();try{
  const first=await prepareAssignedChatgptCpsContinuation({store:s,
    task_ref:'goal:chain-three:root',question:'Inspect the first source'});
  assert.equal(first.ok,true);
  let sends=0;
  const worker={admit:async()=>({granted:true,provider_permitted:true,budget_admitted:true,
    authorization_ref:'mandate:jhn:john-root@v1',
    provider_permission_receipt_ref:'provider:fixture',budget_authorization_ref:'budget:fixture'}),
    dispatch:async({continuation_id})=>{sends++;return {ok:true,submitted:true,
      continuation_id,execution_receipt_ref:'john:fixture:'+continuation_id}}};
  const next=createCpsDefaultNextWorker({store:s,assignedWorker:worker});
  const inputs={store:s,env:{COGENTIA_CPS_BROWSER_DISPATCH_ENABLED:'1'},
    reconcile:async()=>({ok:true,status:'queue_drained',steps_completed:0,
      pending_count:0,needs_reconciliation:0}),assignedWorker:worker,nextWorker:next};
  const a=await runChatgptCpsResidentCycle(inputs);
  assert.equal(a.ok,true,JSON.stringify(a));assert.equal(sends,1);
  const add=(topic,key,payload)=>assert.equal(s.append({topic_id:topic,event_type:'cop.event/v1',
    actor_id:'cop:fixture',subject_ref:topic,idempotency_key:key,
    visibility:'restricted',epistemic_status:'observed',payload}).ok,true);
  function correlatedNext(id,action,question){
    const topic='continuation:'+id;
    add(topic,'return:'+id,{profile:'cop.continuation-result/v1',
      continuation_id:id,phase:'returned'});
    add(topic,'wake:'+id,{profile:'cop.continuation-scheduler-wake/v1',
      continuation_id:id,returned_receipt_ref:'return:'+id});
    add(topic,'chatgpt-browser:'+id+':dispatch-attempt',{
      profile:'cop.continuation-dispatch/v1',phase:'intent_committed',continuation_id:id});
    add(topic,'chatgpt-browser:'+id+':dispatch-result',{
      profile:'cop.continuation-dispatch/v1',phase:'handler_completed',
      continuation_id:id,parent_mandate_status:'open',next_turn_dispatched:false,
      next_action_admitted:false,next_action_candidate:action,
      next_action_question_candidate:question});
  }
  correlatedNext(first.continuation_id,'inspect-second','Inspect the second source');
  const b=await runChatgptCpsResidentCycle(inputs);
  assert.equal(b.ok,true,JSON.stringify(b));assert.equal(sends,2);
  const second=s.replay().find(e=>e.payload?.profile==='cop/continuation'&&
    e.payload.continuation.state?.hop_count===1).payload.continuation;
  correlatedNext(second.continuation_id,'inspect-third','Inspect the third source');
  const c=await runChatgptCpsResidentCycle(inputs);
  assert.equal(c.ok,true,JSON.stringify(c));assert.equal(sends,3);
  const third=s.replay().find(e=>e.payload?.profile==='cop/continuation'&&
    e.payload.continuation.state?.hop_count===2).payload.continuation;
  assert.equal(third.state.question,'Inspect the third source');
  const idle=await runChatgptCpsResidentCycle(inputs);
  assert.equal(idle.ok,true);
  assert.equal(sends,3);
  assert.equal(s.auditCommitments().ok,true);
 }finally{s.close()}
});

test('the current signed max-consecutive-turns boundary cannot be enlarged by the child agent',async()=>{
 const s=signedStore();try{
  const denied=await prepareAssignedChatgptCpsContinuation({store:s,
    task_ref:'goal:too-many-hops',question:'Cannot exceed provider scope',hop_count:8});
  assert.equal(denied.error,'signed_chatgpt_turn_hop_limit');
  assert.deepEqual(listAssignedChatgptCpsContinuations(s),[]);
 }finally{s.close()}
});
