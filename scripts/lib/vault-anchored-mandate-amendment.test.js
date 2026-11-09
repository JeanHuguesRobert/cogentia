import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createVaultAnchoredMandateAmendment} from './vault-anchored-mandate-amendment.js';
const mandate_ref='mandate:jhn:fixture';
function store(){const s=createMemoryCopEventStore();recordMandateDeclaration(s,{mandate_id:mandate_ref,principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',version:'v1',scope:{allowed_actions:['corpus.read']}});return s;}
const input={mandate_ref,principal_ref:'principal:jhn',expected_version:'v1',scope:{allowed_actions:['corpus.read','corpus.search']},reason:'Explicit human amendment approved'};
const linked={ok:true,principal_ref:'principal:jhn',authenticated:true};
test('vault instance alone cannot amend before human identity linkage',async()=>{
 const s=store();const w=createVaultAnchoredMandateAmendment({store:s,preflight:{inspect:async()=>({ok:false,reason:'principal_identity_unbound'})},verifyExactApproval:()=>({verified:true,principal_ref:'principal:jhn',evidence_ref:'fixture'})});
 const r=await w.amend({mandate:input});assert.equal(r.error,'principal_identity_unbound');assert.equal(s.replay().length,1);
});
test('authenticated user alone cannot amend without exact principal approval',async()=>{
 const s=store();const w=createVaultAnchoredMandateAmendment({store:s,preflight:{inspect:async()=>linked}});
 assert.equal((await w.amend({mandate:input})).error,'trusted_approval_verifier_unavailable');
 assert.equal(s.replay().length,1);
 const w2=createVaultAnchoredMandateAmendment({store:s,preflight:{inspect:async()=>linked},verifyExactApproval:()=>({verified:false})});
 assert.equal((await w2.amend({mandate:input,approval:'chat says yes'})).error,'principal_approval_unverified');assert.equal(s.replay().length,1);
});
test('independently verified exact human approval reuses canonical append-only amendment',async()=>{
 const s=store();let approvedProposal;
 const w=createVaultAnchoredMandateAmendment({store:s,preflight:{inspect:async()=>linked},verifyExactApproval:({proposal,presented})=>{
  approvedProposal=proposal;return presented==='human-approved-exact-fixture'?{verified:true,principal_ref:'principal:jhn',evidence_ref:'test:owner-approved'}:{verified:false};
 }});
 const r=await w.amend({session:{},mandate:input,approval:'human-approved-exact-fixture'});
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.version,'v2');assert.equal(s.replay().length,2);
 assert.equal(approvedProposal.previous_version,'v1');
 assert.equal((await w.amend({mandate:input,approval:'human-approved-exact-fixture'})).error,'mandate_version_conflict');
});
