import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration,amendMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {mandateProposalHash} from '../lib/cop-proposal-digest.js';
import {randomUUID} from 'node:crypto';
import {recordExecutionBudgetGrant} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {continuationConsentPlan,requestContinuationConsent,runContinuationConsentCli}
  from './jhn-continuation-consent-cli.js';

function fixture() {
 const store=createMemoryCopEventStore();
 assert.equal(recordMandateDeclaration(store,{
   mandate_id:'mandate:jhn:john-root',version:'v1',
   principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
   valid_from:'2020-01-01T00:00:00Z',valid_until:'2099-01-01T00:00:00Z',
   scope:{allowed_actions:['browser.navigation.instances','browser.hosted.inspect'],
     forbidden_actions:['gmail.send','financial.commit'],
     budget_ceiling:{max_steps:2048}},
 }).ok,true);
 assert.equal(recordExecutionBudgetGrant(store,{
   budget_id:'budget:mandate:jhn:john-root',mandate_ref:'mandate:jhn:john-root',
   principal_ref:'principal:jhn',limits:{max_steps:2048},
 }).ok,true);
 return store;
}
// CI's pinned Inseme lacks JHN Supabase Auth transport modules. This explicit
// fixture tests the request boundary and typed receipt; the REAL workflow is
// separately integration-tested on Fracta2 against a disposable COP store.
function fixtureWorkflowFactory({store}) {
 return {
  request({mandate}){
   let proposal;
   const preview=amendMandate(store,mandate,{verifyPrincipalApproval:p=>{proposal=p;return {verified:false}}});
   assert.equal(preview.error,'principal_approval_unverified');
   const challenge_id=randomUUID(),payload_hash=mandateProposalHash(proposal);
   const expires_at=new Date(Date.now()+600000).toISOString();
   const saved=store.append({event_type:'PrincipalConsentRequested',
     topic:{id:'principal-consent:'+challenge_id,seq:1},
     actor_ref:'principal:jhn',subject_ref:'principal:jhn',
     idempotency_key:'PrincipalConsentRequested:'+challenge_id,
     epistemic_status:'proposed',visibility:'restricted',
     payload:{kind:'PrincipalConsentRequested',payload_hash,proposal,expires_at}});
   assert.equal(saved.ok,true);
   return {ok:true,challenge_id,payload_hash,expires_at};
  },
  inspect({challenge_id}) {
   const row=store.listTopic('principal-consent:'+challenge_id)[0];
   return row?{ok:true,status:'pending',payload_hash:row.payload.payload_hash}:{ok:false};
  }
 };
}

test('plan is a non-issuing exact delta and requires independently verified issuer',()=>{
 const store=fixture(),before=store.replay().length;
 assert.equal(continuationConsentPlan(store,{verifyIssuer:()=>false}).error,'canonical_issuer_unverified');
 const plan=continuationConsentPlan(store,{verifyIssuer:()=>true});
 assert.equal(plan.ok,true);
 assert.deepEqual(plan.added_capabilities,['continuation.resolve']);
 assert.deepEqual(plan.mandate.scope.forbidden_actions,['gmail.send','financial.commit']);
 assert.equal(store.replay().length,before);
});
test('request bridge records only a pending proposal receipt; canonical workflow integration is separate',async()=>{
 const store=fixture(),before=store.replay().length;
 const result=await requestContinuationConsent(store,{verifyIssuer:()=>true,ttl_ms:600000,workflowFactory:fixtureWorkflowFactory});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.challenge_created,true);
 assert.equal(result.mandate_amended,false);
 assert.equal(result.execution,false);
 assert.match(result.payload_hash,/^sha256:[a-f0-9]{64}$/);
 assert.equal(store.replay().length,before+1);
 const rows=store.listTopic('principal-consent:'+result.challenge_id);
 assert.equal(rows.length,1);
 assert.equal(rows[0].payload.kind,'PrincipalConsentRequested');
 assert.equal(rows[0].payload.proposal.previous_version,'v1');
 assert.equal(rows[0].payload.proposal.new_version,'v2');
 assert.equal(rows[0].payload.proposal.scope.allowed_actions.at(-1),'continuation.resolve');
 assert.equal(store.replay().filter(e=>e.payload?.kind==='MandateDeclaration').length,1);
});
test('issuer refusal creates no challenge and absent operator session refuses CLI',async()=>{
 const store=fixture(),before=store.replay().length;
 assert.equal((await requestContinuationConsent(store,{verifyIssuer:()=>false})).error,'canonical_issuer_unverified');
 assert.equal(store.replay().length,before);
 assert.equal((await runContinuationConsentCli({args:['--request'],ownerShell:false})).error,'owner_ssh_session_required');
});
