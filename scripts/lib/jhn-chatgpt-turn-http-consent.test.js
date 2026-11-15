import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration,resolveMandate,evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {JHN_VAULT_INSTANCE_ID} from '../../../inseme/apps/platform/scripts/lib/vault-catalog.js';
import {createJhnCanonicalConsentWorkflow} from './jhn-canonical-consent-workflow.js';
import {createJhnConsentHttpHandler} from './jhn-consent-http-handler.js';
import {johnChatgptTurnMandatePlan} from './jhn-chatgpt-turn-mandate-plan.js';
const origin='https://jhn.baronsmariani.org',ref='mandate:jhn:john-root';
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const adminClient={from(){return {select(){return {eq(){return {single:async()=>({data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:'jhn',status:'autonomous',principal_id:user}})}}}}}}};
const authClient={auth:{getUser:async token=>({data:{user:token==='owner'?
 {id:user,email_confirmed_at:'2026-11-15T06:00:00Z',is_anonymous:false}:null}})}};
test('standing browser consent applies exact signed v3, no more and no less',async()=>{
 const store=createSqliteCopEventStore(':memory:');
 try {
 recordMandateDeclaration(store,{mandate_id:ref,version:'v2',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
 valid_from:'2026-11-01T00:00:00Z',valid_until:'2027-11-06T00:00:00Z',
 scope:{allowed_actions:['browser.hosted.inspect','cogentia.continuation.result.submit'],
 forbidden_actions:['gmail.send','communication.send'],budget_ceiling:{max_steps:2048}}});
 recordExecutionBudgetGrant(store,{budget_id:'budget:'+ref,mandate_ref:ref,principal_ref:'principal:jhn',limits:{max_steps:2048}});
 const workflow=createJhnCanonicalConsentWorkflow({store,adminClient,authClient,
   clock:()=>new Date('2026-11-15T06:00:00Z')});
 const plan=()=>johnChatgptTurnMandatePlan({store,at_time:new Date('2026-11-15T06:00:00Z')});
 const handler=createJhnConsentHttpHandler({workflow,origin,
   exactChatgptTurnAmendmentPlan:plan,
   requestExactChatgptTurnConsent:()=>workflow.request({mandate:plan().mandate,ttl_ms:600000})});
 const post=(path,token,data='{}')=>handler(new Request(origin+path,{method:'POST',
   headers:{origin, ...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},
   body:data}));
 const path='/api/cop/principal-consent/chatgpt-turn-request';
 assert.equal((await post(path,null)).status,401);
 assert.equal((await post(path,'attacker')).status,403);
 assert.equal((await post(path,'owner',JSON.stringify({action:'browser.hosted.evaluate'}))).status,400);
 const created=await post(path,'owner');
 assert.equal(created.status,201,await created.clone().text());
 const challenge=await created.json();
 const inspect=workflow.inspect({challenge_id:challenge.challenge_id});
 assert.equal(inspect.proposal.scope.chatgpt_turn_policy.origin,'https://chatgpt.com');
 assert.equal(inspect.proposal.scope.chatgpt_turn_policy.browser_instance_id,'fracta2-hosted');
 assert.equal(resolveMandate(store,ref).version,'v2');
 const url='/api/cop/principal-consent/'+challenge.challenge_id;
 const approval=JSON.stringify({decision:'approve',payload_hash:challenge.payload_hash});
 assert.equal((await post(url,'attacker',approval)).status,403);
 const approved=await post(url,'owner',approval);
 assert.equal(approved.status,200,await approved.clone().text());
 assert.equal((await approved.json()).mandate_amendment_applied,true);
 assert.equal(resolveMandate(store,ref).version,'v3');
 assert.equal(evaluateMandate(store,{mandate_ref:ref,version_pin:'v3',capability:'browser.chatgpt.turn'}).granted,true);
 assert.equal(evaluateMandate(store,{mandate_ref:ref,version_pin:'v3',capability:'gmail.send'}).granted,false);
 assert.equal((await post(url,'owner',approval)).status,409);
 }finally{store.close()}
});
