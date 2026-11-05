import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCopSuperAdmission as assess} from './cop-super-admission.js';
const base={store:{listTopic(){return[]},append(){}},evaluateMandate:(_,q)=>({granted:true,mandate_ref:q.mandate_ref,principal_ref:q.expected_principal_ref}),ledger:{snapshot:()=>({has_grant:true,mandate_ref:'mandate:m'}),reserve(){}},mandate_ref:'mandate:m',principal_ref:'principal:p',actor_ref:'agent:a',target:'node:fracta2',execution_mode:'super',demand:{operations:1}};
test('fails closed when required authority or budget is absent',()=>{
 for(const [patch,error] of [[{store:null},'canonical_authority_unavailable'],[{ledger:null},'canonical_budget_unavailable'],[{demand:null},'budget_demand_required'],[{execution_mode:'normal'},'super_mode_required'],[{actor_ref:null},'authority_context_required']])assert.equal(assess({...base,...patch}).error,error);
});
test('rejects revoked, missing, stale and mismatched authority',()=>{
 for(const error of ['mandate_not_found','mandate_revoked','mandate_expired','mandate_version_mismatch'])assert.equal(assess({...base,evaluateMandate:()=>({granted:false,error})}).error,error);
 assert.equal(assess({...base,evaluateMandate:()=>({granted:true,mandate_ref:'other',principal_ref:'principal:p'})}).error,'authority_identity_mismatch');
 assert.equal(assess({...base,ledger:{snapshot:()=>({has_grant:false}),reserve(){}}}).error,'budget_authority_mismatch');
});
test('positive admission is not authorization or budget reservation',()=>{
 let reserved=0;const x=assess({...base,ledger:{snapshot:base.ledger.snapshot,reserve(){reserved++}}});
 assert.equal(x.admitted,true);assert.equal(x.reservation,null);assert.equal(x.requires_canonical_reservation,true);assert.equal(reserved,0);
});
