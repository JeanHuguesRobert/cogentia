import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCopSuperAdmission} from './cop-super-admission.js';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {evaluateMandate,recordMandateDeclaration,recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger,recordExecutionBudgetGrant} from '../../../inseme/packages/cop-core/src/execution-budget.js';
const base={mandate_ref:'mandate:super-test',principal_ref:'principal:test',actor_ref:'agent:test',target:'node:fracta2',execution_mode:'super',demand:{max_steps:1},evaluateMandate};
test('real Inseme evaluator refuses unissued authority despite a budget',()=>{
 const store=createMemoryCopEventStore();
 recordExecutionBudgetGrant(store,{budget_id:'budget:super-test',mandate_ref:base.mandate_ref,principal_ref:base.principal_ref,limits:{max_steps:2}});
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:super-test',limits:{max_steps:2},require_authority_grant:true});
 const denied=assessCopSuperAdmission({...base,store,ledger});
 assert.equal(denied.admitted,false);assert.equal(denied.error,'mandate_not_found');
});
test('real Inseme evaluator resolves a declared mandate, without executing or reserving',()=>{
 const store=createMemoryCopEventStore();
 recordMandateDeclaration(store,{mandate_id:base.mandate_ref,version:'v1',principal_ref:base.principal_ref,logical_agent_ref:base.actor_ref,scope:{allowed_actions:['host.process.run']}});
 recordExecutionBudgetGrant(store,{budget_id:'budget:super-test',mandate_ref:base.mandate_ref,principal_ref:base.principal_ref,limits:{max_steps:2}});
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:'budget:super-test',limits:{max_steps:2},require_authority_grant:true});
 const result=assessCopSuperAdmission({...base,store,ledger});
 assert.equal(result.admitted,true,JSON.stringify(result));
 assert.equal(result.reservation,null);
});
