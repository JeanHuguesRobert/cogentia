import test from 'node:test';
import assert from 'node:assert/strict';
import {assessProportionateRisk} from './proportionate-risk.js';
import {assessPresumedEffect} from './side-effect-authorization.js';
const base={objective:'Deploy tested MCP Apps UI',expected_gain:'useful',exposure:'negligible',mandate_ref:'mandate:jhn:maintenance',recovery:'verified',durable_capacity_loss:false,ruin_possible:false,independent_recovery:true,third_party_commitment:false,critical_control_change:false,uncertain_tail:false};
const assess=patch=>assessProportionateRisk({...base,...patch});
test('A requires a valuable bounded reversible action, and never authorizes',()=>{
 const r=assess({}); assert.equal(r.control,'A');assert.equal(r.advisory_only,true);assert.equal(r.grants_authority,false);
});
test('B requires a human confirmation for bounded maintenance or modest uncertainty',()=>{
 assert.equal(assess({exposure:'bounded'}).control,'B');
 assert.equal(assess({recovery:'unverified'}).control,'B');
 assert.equal(assess({expected_gain:'none'}).control,'B');
 assert.equal(assess({uncertain_tail:true}).control,'B');
});
test('ruin, irreversible control changes, commitments or unbounded black swans cannot be traded for upside',()=>{
 for(const patch of [{ruin_possible:true,expected_gain:'essential'}, {exposure:'catastrophic',expected_gain:'essential'}, {critical_control_change:true}, {durable_capacity_loss:true}, {third_party_commitment:true}, {uncertain_tail:true,independent_recovery:false}]) {
  const r=assess(patch); assert.equal(r.control,'C',JSON.stringify(patch));assert.equal(r.grants_authority,false);
 }
});
test('missing assertions are never presumed safe; no caller can create a grant',()=>{
 const r=assessProportionateRisk({objective:'restart'});assert.equal(r.control,'C');assert.equal(r.ok,false);assert.ok(r.errors.includes('recovery_invalid'));
});

test('existing side-effect advisory can only escalate controls, not relax established mandate/third-party constraints',()=>{
 const safe={action_class:'git.commit',within_mandate:true,within_budget:true,recovery_verified:true,negligible_residue:true,low_exposure:true,privacy_cleared:true};
 assert.equal(assessPresumedEffect({...safe,risk_assessment:base}).decision,'mandate_derived_candidate');
 assert.equal(assessPresumedEffect({...safe,risk_assessment:{...base,ruin_possible:true}}).decision,'escalate');
 assert.equal(assessPresumedEffect({...safe,risk_assessment:{...base,exposure:'bounded'}}).decision,'escalate');
 assert.equal(assessPresumedEffect({...safe,within_mandate:false,risk_assessment:base}).reason,'outside_mandate');
 assert.equal(assessPresumedEffect({...safe,action_class:'gmail.send',risk_assessment:base}).decision,'explicit_principal_authorization');
});

test('Nuance B++ preserves coarse B control without inventing authority',()=>{
 const r=assess({exposure:'bounded',cognitive_judgment:{position:'very_high',rationale:'Dependency chain needs review',uncertainties:['fallback not exercised'],evidence_refs:['cop:receipt:42']}});
 assert.equal(r.control,'B');assert.equal(r.nuance.label,'B++');assert.equal(r.nuance.affects_authority,false);assert.equal(r.control_projection,'coarse_pedagogical');
 assert.equal(r.grants_authority,false);
});
test('Nuance cannot override hard C boundary',()=>{
 const r=assess({ruin_possible:true,cognitive_judgment:{position:'low',rationale:'Operator considers it minor'}});
 assert.equal(r.control,'C');assert.equal(r.nuance.label,'C−');assert.equal(r.grants_authority,false);
});
test('Malformed cognitive narrative fails validation rather than silently disappearing',()=>{
 const r=assess({cognitive_judgment:{position:'extreme',rationale:'not supported'}});
 assert.equal(r.ok,false);assert.ok(r.errors.includes('cognitive_judgment_invalid'));
});

test('agent may open a lower-risk path with comparable outcome but cannot authorize it',()=>{
 const r=assess({exposure:'bounded',alternative_paths:[{path:'Use a read-only health check before any restart',rationale:'May restore confidence without changing service state',relative_risk:'lower',relative_effort:'lower',outcome_equivalence:'partial',unknowns:['Whether restart is actually necessary']}]});
 assert.equal(r.ok,true);assert.equal(r.control,'B');
 assert.equal(r.alternative_paths[0].relative_risk,'lower');
 assert.equal(r.alternative_paths[0].outcome_equivalence,'partial');
 assert.equal(r.alternative_paths[0].authorization_required_separately,true);
 assert.equal(r.grants_authority,false);
});
test('alternatives cannot downgrade hard risk or invent equivalence',()=>{
 const input={ruin_possible:true,alternative_paths:[{path:'Other route',rationale:'Agent hypothesis',relative_risk:'lower',relative_effort:'unknown',outcome_equivalence:'unknown'}]};
 assert.equal(assess(input).control,'C');
 assert.equal(assess({alternative_paths:[{path:'Other route',rationale:'No evidence',relative_risk:'magic',relative_effort:'lower',outcome_equivalence:'equivalent'}]}).ok,false);
});
