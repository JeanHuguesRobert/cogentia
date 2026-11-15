import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {johnChatgptTurnMandatePlan} from './jhn-chatgpt-turn-mandate-plan.js';
const REF='mandate:jhn:john-root';
function fixture(allowed=['browser.hosted.inspect'],forbidden=['gmail.send']){
 const store=createMemoryCopEventStore();
 recordMandateDeclaration(store,{mandate_id:REF,version:'v2',principal_ref:'principal:jhn',
 logical_agent_ref:'agent:jhn',valid_from:'2026-11-01T00:00:00Z',
 valid_until:'2027-11-06T00:00:00Z',
 scope:{allowed_actions:allowed,forbidden_actions:forbidden,budget_ceiling:{max_steps:2048}}});
 recordExecutionBudgetGrant(store,{budget_id:'budget:mandate:jhn:john-root',
 mandate_ref:REF,principal_ref:'principal:jhn',limits:{max_steps:2048}});
 return store;
}
test('standing browser ChatGPT turn plan preserves previous scope, denies unrelated domains, never issues a grant',()=>{
 const store=fixture(),before=store.replay().length;
 const p=johnChatgptTurnMandatePlan({store,at_time:new Date('2026-11-15')});
 assert.equal(p.ok,true);
 assert.equal(p.requires_owner_consent,true);
 assert.deepEqual(p.added_capabilities,['browser.chatgpt.turn']);
 assert.deepEqual(p.mandate.scope.allowed_actions,['browser.hosted.inspect','browser.chatgpt.turn']);
 assert.deepEqual(p.mandate.scope.forbidden_actions,['gmail.send']);
 assert.equal(p.target_policy.origin,'https://chatgpt.com');
 assert.equal(p.target_policy.browser_instance_id,'fracta2-hosted');
 assert.equal(p.target_policy.max_consecutive_turns,8);
 assert.equal(p.budget_snapshot_for_review.budget_id,'budget:mandate:jhn:john-root');
 assert.equal(store.replay().length,before);
});
test('no unsolicited override of explicit forbidden action or an already completed amendment',()=>{
 assert.equal(johnChatgptTurnMandatePlan({store:fixture([],['browser.chatgpt.turn'])}).error,'browser_chatgpt_turn_forbidden');
 assert.equal(johnChatgptTurnMandatePlan({store:fixture(['browser.chatgpt.turn'])}).already_authorized_in_scope,true);
});
