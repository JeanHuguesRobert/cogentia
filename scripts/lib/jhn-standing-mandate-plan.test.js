import test from "node:test";
import assert from "node:assert/strict";
import {createSqliteCopEventStore} from
  "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {recordMandateDeclaration,resolveMandate,evaluateMandate} from
  "../../../inseme/packages/cop-core/src/governed-act.js";
import {recordExecutionBudgetGrant,createEventSourcedExecutionBudgetLedger} from
  "../../../inseme/packages/cop-core/src/execution-budget.js";
import {JHN_VAULT_INSTANCE_ID} from
  "../../../inseme/apps/platform/scripts/lib/vault-catalog.js";
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS} from "./john-root-mandate.js";
import {createJhnCanonicalConsentWorkflow} from "./jhn-canonical-consent-workflow.js";
import {createJhnConsentHttpHandler} from "./jhn-consent-http-handler.js";
import {johnStandingMandatePlan,STANDING_CAPABILITIES,STANDING_VAULT_CAPABILITIES} from "./jhn-standing-mandate-plan.js";

const NOW=new Date("2026-11-15T12:00:00Z");
const origin="https://jhn.baronsmariani.org",ref="mandate:jhn:john-root";
const owner="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const adminClient={from(){return {select(){return {eq(){return {single:async()=>({
  data:{id:JHN_VAULT_INSTANCE_ID,canonical_slug:"jhn",status:"autonomous",principal_id:owner}
})}}}}}}};
const authClient={auth:{getUser:async token=>({data:{user:token==="owner-session"
  ?{id:owner,email_confirmed_at:"2026-11-15T12:00:00Z",is_anonymous:false}:null}})}};
function fixture({funded=true}={}) {
  const store=createSqliteCopEventStore(":memory:");
  const initial=["browser.navigation.instances","browser.hosted.inspect",
    "cogentia.continuation.result.submit","browser.chatgpt.turn"];
  const declared=recordMandateDeclaration(store,{
    mandate_id:ref,version:"v3",principal_ref:"principal:jhn",
    logical_agent_ref:"agent:jhn",
    valid_from:"2026-11-06T00:00:00Z",valid_until:"2027-11-06T00:00:00Z",
    scope:{allowed_actions:initial,forbidden_actions:[...RESERVED_ACTIONS],
      budget_ceiling:{max_steps:2048},
      chatgpt_turn_policy:{max_consecutive_turns:8}}
  });
  assert.equal(declared.ok,true);
  if(funded)assert.equal(recordExecutionBudgetGrant(store,{
    budget_id:"budget:"+ref,mandate_ref:ref,principal_ref:"principal:jhn",
    limits:{max_steps:2048},authority_version:1,
  }).ok,true);
  const workflow=createJhnCanonicalConsentWorkflow({
    store,adminClient,authClient,clock:()=>NOW,
  });
  const plan=()=>johnStandingMandatePlan({store,at_time:NOW});
  const handler=createJhnConsentHttpHandler({
    workflow,origin,exactStandingAmendmentPlan:plan,
  });
  const http=(path,token,body)=>handler(new Request(origin+path,{
    method:"POST",
    headers:{origin,...(token?{authorization:"Bearer "+token}:{}),
      "content-type":"application/json"},
    body:JSON.stringify(body),
  }));
  return {store,workflow,plan,http};
}
test("one standing v4 plan retains signed prohibitions, budget and lifespan",()=>{
  const f=fixture();
  try{
    const before=f.store.replay().length,p=f.plan();
    assert.equal(p.ok,true,JSON.stringify(p));
    assert.equal(p.previous_version,"v3");
    assert.equal(p.next_version,"v4");
    assert.equal(p.ready_for_issuance,true);
    assert.equal(p.requires_owner_consent,true);
    assert.equal(p.mandate.expected_version,"v3");
    assert.deepEqual(p.added_capabilities,[...STANDING_CAPABILITIES]);
    assert.deepEqual(p.mandate.scope.forbidden_actions,[...RESERVED_ACTIONS]);
    assert.equal(p.mandate.scope.budget_ceiling.max_steps,2048);
    assert.equal(p.mandate.scope.chatgpt_turn_policy.max_consecutive_turns,8);
    assert.equal(p.mandate.scope.standing_operations.length,2);
    assert.deepEqual(p.mandate.scope.standing_technical_policy.dns.allowed_types,["CNAME"]);
    assert.equal(p.mandate.scope.standing_technical_policy.site.source_visibility,"already_public");
    assert.equal(f.store.replay().length,before);
  }finally{f.store.close();}
});
test("missing canonical budget refuses permanent amendment",()=>{
  const f=fixture({funded:false});
  try{assert.equal(f.plan().ok,false);}finally{f.store.close();}
});
test("owner Supabase exact consent applies ONE version, never a grant per action",async()=>{
  const f=fixture();
  try{
    const p=f.plan();
    const created=f.workflow.request({mandate:p.mandate,ttl_ms:600000});
    assert.equal(created.ok,true,JSON.stringify(created));
    assert.equal(resolveMandate(f.store,ref).version,"v3");
    const path="/api/cop/principal-consent/"+created.challenge_id;
    const approval={decision:"approve",payload_hash:created.payload_hash};
    assert.equal((await f.http(path,"untrusted-user",approval)).status,403);
    assert.equal(resolveMandate(f.store,ref).version,"v3");
    const agreed=await f.http(path,"owner-session",approval);
    assert.equal(agreed.status,200,await agreed.clone().text());
    const body=await agreed.json();
    assert.equal(body.mandate_amendment_applied,true);
    assert.equal(body.mandate_version,"v4");
    const current=resolveMandate(f.store,ref);
    assert.equal(current.version,"v4");
    assert.equal(current.scope.standing_operations.length,2);
    assert.equal(evaluateMandate(f.store,{mandate_ref:ref,version_pin:"v4",
      capability:"host.process.run",at_time:NOW}).granted,true);
    assert.equal(evaluateMandate(f.store,{mandate_ref:ref,version_pin:"v4",
      capability:"gmail.send",at_time:NOW}).granted,false);
    assert.equal((await f.http(path,"owner-session",approval)).status,409);
    const budget=createEventSourcedExecutionBudgetLedger({
      store:f.store,budget_id:"budget:"+ref,require_authority_grant:true,
    }).snapshot();
    assert.equal(budget.limits.max_steps,2048);
    assert.equal(budget.available.max_steps,2048);
    assert.equal(f.store.replay().filter(e=>
      e.payload?.kind==="MandateDeclaration").length,2);
  }finally{f.store.close();}
});
test("modified or superseded standing proposal cannot be approved",async()=>{
  const f=fixture();
  try{
    const p=f.plan(),created=f.workflow.request({mandate:p.mandate,ttl_ms:600000});
    assert.equal(created.ok,true);
    const changed=await f.http("/api/cop/principal-consent/"+created.challenge_id,
      "owner-session",{decision:"approve",payload_hash:"sha256:"+"f".repeat(64)});
    assert.notEqual(changed.status,200);
    assert.equal(resolveMandate(f.store,ref).version,"v3");
  }finally{f.store.close();}
});

test("FBF: one v4→v5 permanent amendment enables general existing host execution, not another tool per task",async()=>{
  const f=fixture();
  try{
    // The historic v3→v4 signed lineage is preserved exactly.
    const v4=f.plan();
    const first=f.workflow.request({mandate:v4.mandate,ttl_ms:600000});
    assert.equal(first.ok,true);
    const firstReply=await f.http("/api/cop/principal-consent/"+first.challenge_id,
      "owner-session",{decision:"approve",payload_hash:first.payload_hash});
    assert.equal(firstReply.status,200,await firstReply.clone().text());
    assert.equal(resolveMandate(f.store,ref).version,"v4");

    const v5=f.plan();
    assert.equal(v5.ok,true,JSON.stringify(v5));
    assert.equal(v5.previous_version,"v4");
    assert.equal(v5.next_version,"v5");
    assert.deepEqual(v5.added_capabilities,[]);
    assert.deepEqual(v5.removed_obsolete_capabilities,["dns.record.ensure","site.static.release"]);
    const next=v5.mandate.scope;
    assert.ok(next.allowed_actions.includes("host.process.run"));
    assert.ok(!next.allowed_actions.includes("dns.record.ensure"));
    assert.ok(!next.allowed_actions.includes("site.static.release"));
    assert.deepEqual(next.forbidden_actions,[...RESERVED_ACTIONS]);
    assert.equal(next.budget_ceiling.max_steps,2048);
    assert.equal(next.standing_operations.length,2);
    assert.ok(next.standing_operations.every(x=>x.profile==="host.process-general/v1"));
    assert.equal("standing_technical_policy" in next,false);
    // Generic host targets use signed data, not model-chosen aliases.
    assert.deepEqual(next.standing_operations.map(x=>x.target),
      ["node:fracta2","node:i7-thinkpad-jhr"]);
    assert.equal(resolveMandate(f.store,ref).version,"v4","proposal alone did not amend");

    const challenge=f.workflow.request({mandate:v5.mandate,ttl_ms:600000});
    assert.equal(challenge.ok,true);
    const approved=await f.http("/api/cop/principal-consent/"+challenge.challenge_id,
      "owner-session",{decision:"approve",payload_hash:challenge.payload_hash});
    assert.equal(approved.status,200,await approved.clone().text());
    const active=resolveMandate(f.store,ref);
    assert.equal(active.version,"v5");
    assert.equal(evaluateMandate(f.store,{mandate_ref:ref,version_pin:"v5",
      capability:"host.process.run",at_time:NOW}).granted,true);
    assert.equal(evaluateMandate(f.store,{mandate_ref:ref,version_pin:"v5",
      capability:"gmail.send",at_time:NOW}).granted,false);
    const budget=createEventSourcedExecutionBudgetLedger({
      store:f.store,budget_id:"budget:"+ref,require_authority_grant:true
    }).snapshot();
    assert.equal(budget.available.max_steps,2048);
    const v6=f.plan();
    assert.equal(v6.ok,true);
    assert.equal(v6.previous_version,"v5");
    assert.equal(v6.next_version,"v6");
    assert.deepEqual(v6.added_capabilities,[...STANDING_VAULT_CAPABILITIES]);
    assert.deepEqual(v6.mandate.scope.forbidden_actions,[...RESERVED_ACTIONS]);
    assert.equal(v6.mandate.scope.vault_policy.instance_ref,"instance:jhn");
    assert.equal(v6.mandate.scope.vault_policy.agent_visible_values,false);
    assert.equal(v6.mandate.scope.budget_ceiling.max_steps,2048);
    assert.equal(resolveMandate(f.store,ref).version,"v5");
    const challenge6=f.workflow.request({mandate:v6.mandate,ttl_ms:600000});
    assert.equal(challenge6.ok,true);
    assert.equal((await f.http("/api/cop/principal-consent/"+challenge6.challenge_id,
      "untrusted-user",{decision:"approve",payload_hash:challenge6.payload_hash})).status,403);
    assert.equal(resolveMandate(f.store,ref).version,"v5");
    const approval6=await f.http("/api/cop/principal-consent/"+challenge6.challenge_id,
      "owner-session",{decision:"approve",payload_hash:challenge6.payload_hash});
    assert.equal(approval6.status,200,await approval6.clone().text());
    assert.equal(resolveMandate(f.store,ref).version,"v6");
    for(const action of STANDING_VAULT_CAPABILITIES) {
      assert.equal(evaluateMandate(f.store,{mandate_ref:ref,version_pin:"v6",
        capability:action,at_time:NOW}).granted,true,action);
    }
    for(const action of ["private.disclose","sensitive.disclose","gmail.send",
      "security.credentials.change","irreversible.delete"]) {
      assert.equal(evaluateMandate(f.store,{mandate_ref:ref,version_pin:"v6",
        capability:action,at_time:NOW}).granted,false,action);
    }
    assert.equal(f.plan().already_authorized_in_scope,true);
  }finally{f.store.close();}
});

test("Supabase-linked Principal activates standing mandate in one authenticated POST, without challenge",async()=>{
  const f=fixture();try{
    const endpoint="/api/cop/principal-consent/standing-apply";
    const before=f.store.replay().length;
    assert.equal((await f.http(endpoint,"untrusted-user",{})).status,403);
    assert.equal((await f.http(endpoint,"owner-session",{scope:{allowed_actions:["arbitrary"]}})).status,400);
    assert.equal(f.store.replay().length,before,"rejected requests cannot create consent events");
    const first=await f.http(endpoint,"owner-session",{});
    assert.equal(first.status,200,await first.clone().text());
    const a=await first.json();
    assert.equal(a.mandate_amendment_applied,true);
    assert.equal(a.mandate_version,"v4");
    const again=await f.http(endpoint,"owner-session",{});
    assert.equal(again.status,200,await again.clone().text());
    assert.equal((await again.json()).mandate_version,"v5");
    assert.equal(resolveMandate(f.store,ref).version,"v5");
    const third=await f.http(endpoint,"owner-session",{});
    assert.equal(third.status,200,await third.clone().text());
    assert.equal((await third.json()).mandate_version,"v6");
    const fourth=await f.http(endpoint,"owner-session",{});
    assert.equal(fourth.status,200);
    assert.equal((await fourth.json()).already_authorized_in_scope,true);
    const events=f.store.replay();
    assert.equal(events.filter(e=>e.payload?.kind==="PrincipalConsentRequested").length,0);
    assert.equal(events.filter(e=>e.payload?.kind==="PrincipalAuthenticatedMandateIntent").length,3);
    assert.equal(events.filter(e=>e.payload?.kind==="MandateDeclaration").length,4);
    assert.equal(events.filter(e=>e.payload?.kind==="MandateDeclaration")
      .at(-1).payload.metadata.amendment.approval_scheme,
      "supabase_authenticated_owner_direct_intent_v1");
    assert.equal(evaluateMandate(f.store,{mandate_ref:ref,version_pin:"v5",
      capability:"gmail.send",at_time:NOW}).granted,false);
  }finally{f.store.close();}
});
