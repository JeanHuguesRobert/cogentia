import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration,resolveMandate,evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant,createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {JHN_VAULT_INSTANCE_ID} from '../../../inseme/apps/platform/scripts/lib/vault-catalog.js';
import {createJhnCanonicalConsentWorkflow} from './jhn-canonical-consent-workflow.js';
import {createJhnConsentHttpHandler} from './jhn-consent-http-handler.js';
import {johnRepositoryMandatePlan} from './jhn-repository-mandate-plan.js';

const origin='https://jhn.baronsmariani.org';
const ref='mandate:jhn:john-root',budgetId='budget:mandate:jhn:john-root';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const adminClient={from(){return {select(){return {eq(){return {single:async()=>({data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:'jhn',status:'autonomous',principal_id:owner}})}}}}}}};
const authClient={auth:{getUser:async token=>({data:{user:token==='owner-session'?{id:owner,email_confirmed_at:'2026-11-13T12:00:00Z',is_anonymous:false}:null}})}};
function fixture(){
 const store=createSqliteCopEventStore(':memory:');
 recordMandateDeclaration(store,{mandate_id:ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
  valid_from:'2026-11-06T00:00:00Z',valid_until:'2027-11-06T00:00:00Z',
  scope:{allowed_actions:['browser.hosted.inspect'],forbidden_actions:['gmail.send','communication.send','irreversible.delete'],budget_ceiling:{max_steps:2048}}});
 recordExecutionBudgetGrant(store,{budget_id:budgetId,mandate_ref:ref,principal_ref:'principal:jhn',limits:{max_steps:2048},authority_version:1});
 const workflow=createJhnCanonicalConsentWorkflow({store,adminClient,authClient,clock:()=>new Date('2026-11-13T12:00:00Z')});
 const plan=()=>johnRepositoryMandatePlan({store,at_time:new Date('2026-11-13T12:00:00Z')});
 const handler=createJhnConsentHttpHandler({workflow,origin,exactRepositoryAmendmentPlan:plan});
 const request=(path,token,body='{}')=>handler(new Request(origin+path,{method:'POST',headers:{origin, ...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},body}));
 return {store,workflow,plan,request};
}
test('owner session creates fixed repository review and applies v2 once, with same funded budget',async()=>{
 const f=fixture();try{
  const path='/api/cop/principal-consent/repository-request';
  assert.equal((await f.request(path,null)).status,401);
  assert.equal((await f.request(path,'attacker')).status,403);
  assert.equal((await f.request(path,'owner-session','{"repos":["*"]}')).status,400);
  assert.equal(f.store.replay().filter(x=>x.payload?.kind==='PrincipalConsentRequested').length,0);
  const createdResponse=await f.request(path,'owner-session');
  assert.equal(createdResponse.status,201,await createdResponse.clone().text());
  const created=await createdResponse.json();
  const expected=f.workflow.inspect({challenge_id:created.challenge_id});
  assert.equal(expected.proposal.kind,'cop.mandate-amendment.proposal/v1');
  assert.equal(expected.proposal.scope.repository_policy.ownership_check,'provider_enforced');
  assert.deepEqual(expected.proposal.scope.forbidden_actions,['gmail.send','communication.send','irreversible.delete']);
  assert.equal(expected.proposal.scope.budget_ceiling.max_steps,2048);
  assert.equal(f.store.replay().filter(x=>x.payload?.kind==='MandateDeclaration').length,1);
  const approval=JSON.stringify({decision:'approve',payload_hash:created.payload_hash});
  const url='/api/cop/principal-consent/'+created.challenge_id;
  assert.equal((await f.request(url,'attacker',approval)).status,403);
  const resultResponse=await f.request(url,'owner-session',approval);
  assert.equal(resultResponse.status,200,await resultResponse.clone().text());
  const result=await resultResponse.json();
  assert.equal(result.mandate_amendment_applied,true);
  assert.equal(result.mandate_version,'v2');
  assert.equal(resolveMandate(f.store,ref).scope.allowed_actions.includes('git.push'),true);
  assert.equal(evaluateMandate(f.store,{mandate_ref:ref,version_pin:'v2',capability:'git.push'}).granted,true);
  assert.equal(evaluateMandate(f.store,{mandate_ref:ref,version_pin:'v2',capability:'gmail.send'}).granted,false);
  assert.equal((await f.request(url,'owner-session',approval)).status,409);
  const before=createEventSourcedExecutionBudgetLedger({store:f.store,budget_id:budgetId,require_authority_grant:true}).snapshot();
  assert.equal(before.available.max_steps,2048);
  assert.equal(before.authority_version,1);
  const budget=createEventSourcedExecutionBudgetLedger({store:f.store,budget_id:budgetId,require_authority_grant:true});
  const reserved=budget.reserve({idempotency_key:'post-v2-test',expected_version:before.version,demand:{max_steps:1}});
  assert.equal(reserved.ok,true);
  assert.equal(reserved.snapshot.available.max_steps,2047);
 }finally{f.store.close();}
});
test('unfunded canonical mandate cannot create repository request',async()=>{
 const f=fixture();try{
  const plan=f.plan();
  assert.equal(plan.ready_for_issuance,true);
  const gate=createJhnConsentHttpHandler({workflow:f.workflow,origin,exactRepositoryAmendmentPlan:()=>({...plan,ready_for_issuance:false})});
  const r=await gate(new Request(origin+'/api/cop/principal-consent/repository-request',{method:'POST',headers:{authorization:'Bearer owner-session',origin},body:'{}'}));
  assert.equal(r.status,409);
 }finally{f.store.close();}
});
