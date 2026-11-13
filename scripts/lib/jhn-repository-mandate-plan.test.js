import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration,recordMandateControl,resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {johnRepositoryMandatePlan} from './jhn-repository-mandate-plan.js';
const REF='mandate:jhn:john-root';
function fixture(scope={allowed_actions:['browser.hosted.inspect'],
 forbidden_actions:['gmail.send','communication.send','irreversible.delete'],
 budget_ceiling:{max_steps:2048}}){
 const store=createMemoryCopEventStore();
 recordMandateDeclaration(store,{mandate_id:REF,version:'v1',principal_ref:'principal:jhn',
  logical_agent_ref:'agent:jhn',valid_until:'2027-11-06T00:00:00Z',scope});
 return store;
}
test('planning is nonmutating and retains restrictions and budget',()=>{
 const store=fixture(),before=store.replay().length;
 const r=johnRepositoryMandatePlan({store,at_time:new Date('2026-11-13T00:00:00Z')});
 assert.equal(r.ok,true);
 assert.equal(r.ready_for_issuance,false);
 assert.deepEqual(r.added_capabilities,['github.write','git.commit','git.push']);
 assert.equal(r.repository_policy.selection,'owned_or_administered');
 assert.equal(r.repository_policy.include_future,true);
 assert.deepEqual(r.mandate.scope.forbidden_actions,['gmail.send','communication.send','irreversible.delete']);
 assert.deepEqual(r.mandate.scope.budget_ceiling,{max_steps:2048});
 assert.equal(store.replay().length,before);
 assert.deepEqual(resolveMandate(store,REF).scope.allowed_actions,['browser.hosted.inspect']);
});
test('explicit prohibition, revocation and expired mandate refuse planning',()=>{
 const s=fixture({allowed_actions:['browser.hosted.inspect'],forbidden_actions:['git.push']});
 assert.equal(johnRepositoryMandatePlan({store:s}).error,'explicitly_forbidden_repository_action');
 const revoked=fixture();
 recordMandateControl(revoked,{principal_ref:'principal:jhn',mandate_ref:REF,action:'revoke',reason:'test'});
 assert.equal(johnRepositoryMandatePlan({store:revoked}).ok,false);
 const expired=fixture();
 assert.equal(johnRepositoryMandatePlan({store:expired,at_time:new Date('2028-01-01')}).ok,false);
});
