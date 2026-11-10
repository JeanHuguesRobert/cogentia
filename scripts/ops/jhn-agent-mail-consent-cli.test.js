import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {agentMailMandatePlan} from './jhn-agent-mail-consent-cli.js';
test('mail plan adds only missing capabilities and preserves existing root scope',()=>{
 const store=createMemoryCopEventStore();
 recordMandateDeclaration(store,{mandate_id:'mandate:jhn:john-root',version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',scope:{allowed_actions:['browser.hosted.inspect'],forbidden_actions:['gmail.send'],budget_ceiling:{max_steps:2048}}});
 const plan=agentMailMandatePlan(store);
 assert.equal(plan.ok,true);
 assert.deepEqual(plan.added_capabilities,['agent.mail.send','agent.mail.receive']);
 assert.deepEqual(plan.mandate.scope.allowed_actions,['browser.hosted.inspect','agent.mail.send','agent.mail.receive']);
 assert.deepEqual(plan.mandate.scope.forbidden_actions,['gmail.send']);
 assert.equal(plan.mandate.scope.budget_ceiling.max_steps,2048);
 assert.equal(store.replay().length,1);
});
