import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareContinuationProduction} from './continuation-production-recipes.mjs';
const base={producer_ref:'cogentia.local.emit',origin_ref:'mission:one',
  trigger_ref:'fact:wait',idempotency_key:'dedupe:alpha',work_ref:'work:one',
  privacy:'private',resumption_context:{mode:'referential',state_ref:'git:source'},
  return_contract:{owner_ref:'mission:one',result_slot_ref:'continuation:one/resolution',
    delivery:'event',after_delivery:'caller_decides'}};
const kinds={
  judgment_boundary:{question:'Is the public README a useful index?',
    expected_response:{required:['decision','reason']}},
  data_dependency:{dependency_ref:'vector:query',input_fingerprint:'sha256:123',
    expected_response:{format:'float32[1536]'}},
  external_capability_wait:{question:'Provide readable authoritative source',
    required_capabilities:['corpus.read']},
  checkpoint_resume:{checkpoint_ref:'checkpoint:s1',resume_handler_ref:'handler:sleep'},
  temporal_recurrence:{due_at:'2026-11-24T08:00:00+01:00',mission_ref:'mission:weekly'},
  composition:{parent_ref:'packet:parent',child_refs:['packet:child'],join_policy:'all'},
  external_io:{effect_intent_ref:'effect:submit',correlation_ref:'turn:pending',
    delivery_state:'uncertain'},
};

test('all seven classes prepare deterministic, effect-free proposals with distinct requirements',()=>{
 for(const [producer_class,class_input] of Object.entries(kinds)){
  const x=prepareContinuationProduction({...base,producer_class,class_input});
  assert.equal(x.ok,true,JSON.stringify(x));
  assert.equal(x.external_effects,0);
  assert.equal(x.proposal.provider_dispatched,false);
  assert.equal(x.proposal.cop_authority_granted,false);
  assert.equal(x.proposal.carrier_not_chosen,true);
  assert.equal(x.proposal.return_contract.after_delivery,'caller_decides');
  const replay=prepareContinuationProduction({...base,producer_class,class_input});
  assert.deepEqual(replay,x);
  const missing=prepareContinuationProduction({...base,producer_class,class_input:{}});
  assert.equal(missing.status,'class_specific_fields_incomplete');
 }
});

test('stable identity, changed source fingerprint and no implicit widening of privacy',()=>{
 const one=prepareContinuationProduction({...base,
   producer_class:'judgment_boundary',class_input:kinds.judgment_boundary});
 const reordered=prepareContinuationProduction({
   class_input:{expected_response:{required:['decision','reason']},
     question:'Is the public README a useful index?'},
   producer_class:'judgment_boundary',...base});
 assert.equal(one.proposal.identity_ref,reordered.proposal.identity_ref);
 assert.equal(one.proposal.request_fingerprint,reordered.proposal.request_fingerprint);
 const changed=prepareContinuationProduction({...base,producer_class:'judgment_boundary',
   class_input:{...kinds.judgment_boundary,question:'Changed judgment'}});
 assert.equal(changed.proposal.identity_ref,one.proposal.identity_ref);
 assert.notEqual(changed.proposal.request_fingerprint,one.proposal.request_fingerprint);
 const implicit=prepareContinuationProduction({...base,privacy:undefined,
   producer_class:'judgment_boundary',class_input:kinds.judgment_boundary});
 assert.equal(implicit.proposal.privacy,'restricted');
});

test('a reply-slot-only command never suffices as an actual return contract',()=>{
 const r=prepareContinuationProduction({...base,producer_class:'judgment_boundary',
   return_contract:{resume:{command:'continuation resolve one'}},
   class_input:kinds.judgment_boundary});
 assert.equal(r.status,'return_contract_incomplete');
 const empty=prepareContinuationProduction({...base,producer_class:'judgment_boundary',
   class_input:kinds.judgment_boundary,resumption_context:{mode:'referential'}});
 assert.equal(empty.status,'resumption_context_incomplete');
});

test('explicit unknown kind, untrusted date and non-JSON work fail closed',()=>{
 assert.equal(prepareContinuationProduction({...base,producer_class:'routing',
   class_input:{}}).status,'unknown_production_class');
 assert.equal(prepareContinuationProduction({...base,producer_class:'temporal_recurrence',
   class_input:{due_at:'tomorrow',mission_ref:'mission:weekly'}}).status,
   'class_specific_fields_incomplete');
 const cyclic={...kinds.judgment_boundary};cyclic.self=cyclic;
 assert.equal(prepareContinuationProduction({...base,producer_class:'judgment_boundary',
   class_input:cyclic}).status,'proposal_not_json_serializable');
});
