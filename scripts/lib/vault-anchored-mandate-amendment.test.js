import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration,amendMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createVaultAnchoredMandateAmendment,mandateProposalHash} from './vault-anchored-mandate-amendment.js';
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
 const w=createVaultAnchoredMandateAmendment({store:s,preflight:{inspect:async()=>linked},verifyExactApproval:async({proposal,payload_hash,presented})=>{
  approvedProposal=proposal;return presented==='human-approved-exact-fixture'?{verified:true,principal_ref:'principal:jhn',payload_hash,single_use:true,consumed:true,evidence_ref:'test:owner-approved'}:{verified:false};
 }});
 const r=await w.amend({session:{},mandate:input,approval:'human-approved-exact-fixture'});
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.version,'v2');assert.equal(s.replay().length,2);
 assert.equal(approvedProposal.previous_version,'v1');
 assert.equal((await w.amend({mandate:input,approval:'human-approved-exact-fixture'})).error,'mandate_version_conflict');
});

test('rejects secret-only identity, mismatched payload proof and unconsumed confirmation',async()=>{
 for(const proof of [
  {verified:true,principal_ref:'principal:jhn',payload_hash:'sha256:bad',single_use:true,consumed:true,evidence_ref:'x'},
  {verified:true,principal_ref:'principal:jhn',single_use:true,consumed:false,evidence_ref:'x'},
  {verified:true,principal_ref:'principal:jhn',single_use:false,consumed:true,evidence_ref:'x'},
  {verified:true,principal_ref:'principal:attacker',single_use:true,consumed:true,evidence_ref:'x'}]){
   const s=store();const w=createVaultAnchoredMandateAmendment({store:s,preflight:{inspect:async()=>linked},verifyExactApproval:async({payload_hash})=>({...proof,payload_hash:proof.payload_hash||payload_hash})});
   assert.equal((await w.amend({mandate:input,approval:'fixtured'})).error,'principal_approval_unverified');
   assert.equal(s.replay().length,1);
 }
});
test('revalidation refuses a concurrent amendment after external approval',async()=>{
 const s=store();const bridge=createVaultAnchoredMandateAmendment({store:s,preflight:{inspect:async()=>linked},verifyExactApproval:async({payload_hash})=>{
   // Another separately authorized writer modified the mandate first.
   const changed=amendMandate(s,{...input,approval:'other'},
     {verifyPrincipalApproval:()=>({verified:true,principal_ref:'principal:jhn',evidence_ref:'test:other'})});
   assert.equal(changed.ok,true);
   return {verified:true,principal_ref:'principal:jhn',payload_hash,single_use:true,consumed:true,evidence_ref:'test:late'};
 }});
 const r=await bridge.amend({mandate:input,approval:'own'});
 assert.equal(r.error,'mandate_version_conflict');assert.equal(s.replay().length,2);
});
test('canonical proposal digest is stable and bound to exact scope',()=>{
 const p={kind:'cop.mandate-amendment.proposal/v1',scope:{allowed_actions:['corpus.read']}};
 assert.equal(mandateProposalHash(p),mandateProposalHash(structuredClone(p)));
 assert.notEqual(mandateProposalHash(p),mandateProposalHash({...p,scope:{allowed_actions:['gmail.send']}}));
});
