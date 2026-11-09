import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {JHN_VAULT_INSTANCE_ID} from '../../../inseme/apps/platform/scripts/lib/vault-catalog.js';
import {createJhnSupabaseMandateApprovalService} from './jhn-supabase-mandate-approval-service.js';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function instanceQuery(assigned=owner) {
  return {from(name){assert.equal(name,'instances');return {select(){return {eq(){return {single:async()=>({data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:'jhn',status:'autonomous',principal_id:assigned}})}}}}}}};
}
const session={accessToken:'FIXTURE_SESSION_NOT_REAL'};
const authClient={auth:{getUser:async accessToken=>{
  assert.equal(accessToken,session.accessToken);
  return {data:{user:{id:owner,email_confirmed_at:'2026-11-09T00:00:00Z',is_anonymous:false}}};
}}};
function store(){const s=createMemoryCopEventStore();recordMandateDeclaration(s,{mandate_id:'mandate:jhn:example',version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',scope:{allowed_actions:['corpus.read']}});return s;}
const mandate={mandate_ref:'mandate:jhn:example',principal_ref:'principal:jhn',expected_version:'v1',reason:'Confirmed precise extension',scope:{allowed_actions:['corpus.read','corpus.search']}};
test('composes bound Supabase human identity, asynchronous exact approval and append-only COP amendment',async()=>{
 const s=store();let calls=0;
 const approvalService=createJhnSupabaseMandateApprovalService({adminClient:instanceQuery(),authClient,store:s,
  verifyExactApproval:async({payload_hash,proposal,presented})=>{
    calls++;assert.equal(proposal.previous_version,'v1');
    return presented==='human-step-up-fixture'?{verified:true,principal_ref:'principal:jhn',payload_hash,single_use:true,consumed:true,evidence_ref:'fixture:nonce:consumed'}:{verified:false};
  }});
 const inspection=await approvalService.inspect({session});assert.equal(inspection.ok,true);assert.equal(inspection.may_issue,false);
 const denied=await approvalService.amend({session,mandate,approval:'MCP bearer only'});
 assert.equal(denied.error,'principal_approval_unverified');assert.equal(s.replay().length,1);
 const committed=await approvalService.amend({session,mandate,approval:'human-step-up-fixture'});
 assert.equal(committed.ok,true);assert.equal(committed.version,'v2');assert.equal(s.replay().length,2);assert.equal(calls,2);
 assert.equal(JSON.stringify(committed).includes(session.accessToken),false);
});
test('unbound root or missing approval service denies even with authenticated user',async()=>{
 const s=store();const bridge=createJhnSupabaseMandateApprovalService({adminClient:instanceQuery(null),authClient,store:s,
  verifyExactApproval:async()=>({verified:true})});
 assert.equal((await bridge.amend({session,mandate})).error,'principal_identity_unbound');
 const noIssuer=createJhnSupabaseMandateApprovalService({adminClient:instanceQuery(),authClient,store:s});
 assert.equal((await noIssuer.amend({session,mandate})).error,'trusted_approval_verifier_unavailable');
 assert.equal(s.replay().length,1);
});
