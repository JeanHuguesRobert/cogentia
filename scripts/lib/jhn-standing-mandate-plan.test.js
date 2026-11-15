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
import {johnStandingMandatePlan,STANDING_CAPABILITIES} from "./jhn-standing-mandate-plan.js";

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
