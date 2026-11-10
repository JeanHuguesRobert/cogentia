import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {JHN_VAULT_INSTANCE_ID} from '../../../inseme/apps/platform/scripts/lib/vault-catalog.js';
import {createJhnCanonicalConsentWorkflow} from './jhn-canonical-consent-workflow.js';
import {createJhnConsentHttpHandler} from './jhn-consent-http-handler.js';
import {agentMailMandatePlan} from '../ops/jhn-agent-mail-consent-cli.js';
const origin='https://jhn.baronsmariani.org',owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const adminClient={from(){return {select(){return {eq(){return {single:async()=>({data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:'jhn',status:'autonomous',principal_id:owner}})}}}}}}};
const authClient={auth:{getUser:async token=>({data:{user:token==='principal-live-session'?{id:owner,email_confirmed_at:'2026-11-10T11:00:00Z',is_anonymous:false}:null}})}};
function fixture(){
 const store=createSqliteCopEventStore(':memory:');
 recordMandateDeclaration(store,{mandate_id:'mandate:jhn:john-root',version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-01-01T00:00:00Z',scope:{allowed_actions:['browser.navigation.instances','browser.hosted.inspect'],forbidden_actions:['gmail.send'],budget_ceiling:{max_steps:1024}}});
 const workflow=createJhnCanonicalConsentWorkflow({store,adminClient,authClient,clock:()=>new Date('2026-11-10T11:00:00Z')});
 const plan=agentMailMandatePlan(store);
 const requested=workflow.request({mandate:plan.mandate,ttl_ms:600000});
 assert.equal(requested.ok,true);
 const handler=createJhnConsentHttpHandler({workflow,origin,exactAgentMailAmendmentPlan:()=>agentMailMandatePlan(store)});
 const url=origin+'/api/cop/principal-consent/'+requested.challenge_id;
 const invoke=(token,hash=requested.payload_hash)=>handler(new Request(url,{method:'POST',headers:{authorization:'Bearer '+token,origin,'content-type':'application/json'},body:JSON.stringify({decision:'approve',payload_hash:hash})}));
 return {store,requested,workflow,invoke};
}
test('exact mail-only amendment is applied once following authenticated human approval',async()=>{
 const f=fixture();try{
  assert.equal((await f.invoke('attacker')).status,403);
  assert.equal((await f.invoke('principal-live-session','sha256:'+'a'.repeat(64))).status,403);
  const response=await f.invoke('principal-live-session');
  assert.equal(response.status,200,await response.clone().text());
  const body=await response.json();
  assert.equal(body.mandate_amendment_applied,true);
  assert.equal(body.mandate_version,'v2');
  assert.equal(f.workflow.inspect({challenge_id:f.requested.challenge_id}).status,'consumed');
  const events=f.store.replay().filter(e=>e.payload?.kind==='MandateDeclaration');
  assert.equal(events.length,2);
  assert.deepEqual(events[1].payload.scope.allowed_actions,['browser.navigation.instances','browser.hosted.inspect','agent.mail.send','agent.mail.receive']);
  assert.equal((await f.invoke('principal-live-session')).status,409);
  assert.equal(f.store.replay().filter(e=>e.payload?.kind==='MandateDeclaration').length,2);
 }finally{f.store.close();}
});
test('different extension cannot autoapply through the mail-only owner option',async()=>{
 const f=fixture();try{
  // Change the *active* plan after challenge creation, forcing exact guard to refuse.
  // A real mandate change would also make the existing amendment stale.
  const guarded=createJhnConsentHttpHandler({workflow:f.workflow,origin,exactAgentMailAmendmentPlan:()=>({ok:false})});
  const result=await guarded(new Request(origin+'/api/cop/principal-consent/'+f.requested.challenge_id,{
    method:'POST',headers:{authorization:'Bearer principal-live-session',origin,'content-type':'application/json'},
    body:JSON.stringify({decision:'approve',payload_hash:f.requested.payload_hash})
  }));
  assert.equal(result.status,200);
  assert.equal((await result.json()).grants_mandate_authority,false);
  assert.equal(f.store.replay().filter(e=>e.payload?.kind==='MandateDeclaration').length,1);
 }finally{f.store.close();}
});
