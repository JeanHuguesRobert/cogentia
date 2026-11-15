import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {issueVerifiedJohnRoot} from './john-root-issuance.js';
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,
  proposalHash,publicKeyFingerprint} from './john-root-mandate.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {prepareAssignedChatgptCpsContinuation} from './chatgpt-cps-assignment.js';
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
    forbidden_actions:[...RESERVED_ACTIONS]},
  max_delegation_depth:1,budget_limits:{max_steps:8}};
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
