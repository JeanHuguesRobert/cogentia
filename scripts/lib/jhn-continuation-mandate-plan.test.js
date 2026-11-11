import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration,recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {findJohnContinuationBudgetId,johnContinuationMandatePlan} from './jhn-continuation-mandate-plan.js';

const REF='mandate:jhn:john-root';
const AT=new Date('2026-11-11T12:00:00Z');
function createFixture({allowed=['browser.hosted.inspect'],forbidden=['gmail.send'],budget=true}={}) {
  const store=createMemoryCopEventStore();
  const mandate=recordMandateDeclaration(store,{
    mandate_id:REF,version:'v1',principal_ref:'principal:jhn',
    logical_agent_ref:'agent:jhn',valid_from:'2026-11-01T00:00:00Z',
    valid_until:'2026-12-01T00:00:00Z',
    scope:{allowed_actions:allowed,forbidden_actions:forbidden,
      budget_ceiling:{max_steps:7}},
  });
  assert.equal(mandate.ok,true);
  if(budget)assert.equal(recordExecutionBudgetGrant(store,{
    budget_id:'budget:jhn:fixture',mandate_ref:REF,principal_ref:'principal:jhn',
    limits:{max_steps:7}
  }).ok,true);
  return store;
}
test('missing/ambiguous canonical budget grants are refused',()=>{
  assert.equal(findJohnContinuationBudgetId([]).error,'canonical_budget_not_funded');
  const grant=(budget_id)=>({event_type:'ExecutionBudgetGrant',payload:{budget_id,mandate_ref:REF}});
  assert.equal(findJohnContinuationBudgetId([grant('a'),grant('b')]).error,'canonical_budget_ambiguous');
  assert.equal(findJohnContinuationBudgetId([grant('a'),grant('a')]).budget_id,'a');
  assert.equal(findJohnContinuationBudgetId([grant('a'),{event_type:'ExecutionBudgetGrant',payload:{budget_id:'b',mandate_ref:'mandate:other'}}]).budget_id,'a');
});
test('proposal adds only continuation.resolve, preserves constraints and never mutates store',()=>{
  const store=createFixture();
  const before=store.replay().length;
  const result=johnContinuationMandatePlan({store,at_time:AT});
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.deepEqual(result.added_capabilities,['continuation.resolve']);
  assert.deepEqual(result.mandate.scope.allowed_actions,['browser.hosted.inspect','continuation.resolve']);
  assert.deepEqual(result.mandate.scope.forbidden_actions,['gmail.send']);
  assert.equal(result.mandate.expected_version,'v1');
  assert.deepEqual(result.budget_snapshot_for_review.limits,{max_steps:7});
  assert.equal(result.mandate_amended,false);
  assert.equal(store.replay().length,before);
});
test('missing grant, explicit prohibition and expired mandate all refuse',()=>{
  assert.equal(johnContinuationMandatePlan({store:createFixture({budget:false}),at_time:AT}).error,'canonical_budget_not_funded');
  assert.equal(johnContinuationMandatePlan({store:createFixture({forbidden:['continuation.resolve']}),at_time:AT}).error,'continuation_resolve_forbidden');
  assert.equal(johnContinuationMandatePlan({store:createFixture(),at_time:new Date('2027-01-01')}).error,'mandate_expired');
  const revoked=createFixture();
  assert.equal(recordMandateControl(revoked,{principal_ref:'principal:jhn',mandate_ref:REF,action:'revoke'}).ok,true);
  assert.equal(johnContinuationMandatePlan({store:revoked,at_time:AT}).error,'canonical_root_mandate_unavailable');
});
test('existing authorization is reported without amendment',()=>{
 const result=johnContinuationMandatePlan({store:createFixture({allowed:['continuation.resolve']}),at_time:AT});
 assert.equal(result.ok,true);
 assert.equal(result.already_authorized_in_scope,true);
 assert.equal(result.requires_owner_consent,undefined);
});
