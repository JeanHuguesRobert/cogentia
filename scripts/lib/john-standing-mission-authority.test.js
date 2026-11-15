import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {createSqliteCopEventStore} from
  "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {createEventSourcedExecutionBudgetLedger} from
  "../../../inseme/packages/cop-core/src/execution-budget.js";
import {recordMandateControl} from
  "../../../inseme/packages/cop-core/src/governed-act.js";
import {issueVerifiedJohnRoot} from "./john-root-issuance.js";
import {createOfflineJohnIssuerVerifier} from "./john-offline-issuer-verifier.js";
import {resolveCallerAuth} from "./cogentia-mcp-auth.js";
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,proposalHash,
  publicKeyFingerprint} from "./john-root-mandate.js";
import {createCanonicalStandingMissionResolver,STANDING_DIAGNOSTIC_PROFILE,
  STANDING_MANDATE_REF,STANDING_BUDGET_ID} from "./john-standing-mission-authority.js";
import {resolveHostMissionAuthority} from "./host-mission-authority.js";

const AT=new Date("2026-11-15T12:00:00Z");
const REF=STANDING_MANDATE_REF;
const transport="mandate:chatgpt-corpus-coding";
const key=generateKeyPairSync("ed25519");
const pem=key.publicKey.export({type:"spki",format:"pem"});
const fingerprint=publicKeyFingerprint(pem);
const signProposal=proposal=>sign(null,canonicalProposalBytes(proposal),key.privateKey).toString("base64");
function auth(actor="agent:jhn"){
  return resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:"1",
    COGENTIA_MCP_JHN_TOKEN:"fixture-never-production"},{
      headers:{authorization:"Bearer fixture-never-production"},
      meta:{"cogentia.actor":actor,"cogentia.mandate_ref":transport},
    });
}
const operation={profile:STANDING_DIAGNOSTIC_PROFILE,
  capability:"host.process.run",target:"node:fracta2",
  provider:"unix-process",execution_mode:"normal"};
const request=(caller=auth(),extra={})=>({
  actor:caller.actor,principal:caller.principal_ref,mandate:transport,
  capability:"host.process.run",target:"node:fracta2",
  provider:"unix-process",execution_mode:"normal",
  command:"hostname",payload_hash:"sha256:fixture-exact-command",
  caller_auth:caller,...extra,
});
function fixture({actions=true,standing=true,steps=8,issuerValid=true,
  until="2027-01-01T00:00:00Z"}={}){
  const store=createSqliteCopEventStore(":memory:");
  const proposal={kind:ROOT_MANDATE_KIND,mandate_id:REF,version:"v1",
    principal_ref:"principal:jhn",logical_agent_ref:"agent:jhn",
    valid_from:"2026-01-01T00:00:00Z",valid_until:until,
    scope:{allowed_actions:actions?["host.process.run"]:["browser.hosted.inspect"],
      forbidden_actions:[...RESERVED_ACTIONS],
      ...(standing?{standing_operations:[operation]}:{})},
    max_delegation_depth:2,budget_limits:{max_steps:steps}};
  const issued=issueVerifiedJohnRoot({store,proposal,
    approval:{kind:"cogentia.principal-signature/v1",
      principal_ref:"principal:jhn",payload_hash:proposalHash(proposal),
      key_fingerprint:fingerprint,signature_base64:signProposal(proposal)},
    trustedPublicKeyPem:pem,now:new Date("2026-11-01T00:00:00Z")});
  assert.equal(issued.ok,true,JSON.stringify(issued));
  const verifyIssuer=issuerValid
    ?createOfflineJohnIssuerVerifier({trustedPublicKeyPem:pem,now:()=>AT})
    :()=>({verified:false});
  const resolver=createCanonicalStandingMissionResolver({store,verifyIssuer,now:()=>AT});
  return {store,resolver,ledger:()=>createEventSourcedExecutionBudgetLedger({
    store,budget_id:STANDING_BUDGET_ID,require_authority_grant:true})};
}
test("same signed standing mandate admits repeated bounded actions; each effect is accounted",async()=>{
  const f=fixture();
  try{
    const first=await resolveHostMissionAuthority(f.resolver,request());
    assert.ok(first?.authority_id);
    assert.equal(first.canonical_cop,true);
    assert.equal(first.mandate_version,"v1");
    const budgetBefore=f.ledger().snapshot();
    assert.equal(budgetBefore.reserved.max_steps,1);
    assert.equal((await first.finalize({attempted:true,ok:true,receipt:{status:"success"}})).accounting_complete,true);
    const after=f.ledger().snapshot();
    assert.equal(after.reserved.max_steps,0);
    assert.equal(after.settled.max_steps,1);
    const second=await resolveHostMissionAuthority(f.resolver,request());
    assert.ok(second?.authority_id);
    assert.notEqual(second.authority_id,first.authority_id);
    assert.equal((await second.finalize({attempted:true,ok:false,receipt:{status:"failed"}})).budget_action,"settle");
    assert.equal(f.ledger().snapshot().settled.max_steps,2);
    assert.equal((await second.finalize({attempted:true})).duplicate,true);
    assert.equal(f.ledger().snapshot().settled.max_steps,2);
  }finally{f.store.close();}
});
test("blocked before dispatch: missing scope, forged issuer, and unsigned capability",async()=>{
  for(const config of [{standing:false},{actions:false},{issuerValid:false}]){
    const f=fixture(config);
    try{
      assert.equal((await f.resolver(request())).allowed,false);
      assert.equal(f.ledger().snapshot().reserved.max_steps,0);
    }finally{f.store.close();}
  }
});
test("rejects forged caller, arbitrary command, wrong host/provider, super, and mandate spoof",async()=>{
  const f=fixture();
  try{
    const base=request();
    for(const changed of [
      {caller_auth:{...base.caller_auth}}, // WeakSet brand lost
      {actor:"agent:someone-else"},
      {mandate:"mandate:spoofed"},
      {principal:"principal:other"},
      {command:"hostname; touch /tmp/injected"},
      {command:"Get-Content Env:CLOUDFLARE_API_KEY"},
      {command:"sudo systemctl restart caddy"},
      {target:"node:other"},
      {provider:"desktop-commander"},
      {execution_mode:"super"},
      {payload_hash:""},
    ]){
      assert.equal((await f.resolver({...base,...changed})).allowed,false,JSON.stringify(changed,(k,v)=>k==="caller_auth"?"[omitted]":v));
    }
    assert.equal(f.ledger().snapshot().reserved.max_steps,0);
  }finally{f.store.close();}
});
test("pre-dispatch failure releases a reserved step; attempted failure settles one",async()=>{
  const f=fixture();
  try{
    const grant=await f.resolver(request());
    assert.equal(grant.allowed,true);
    const a=await grant.finalize({attempted:false,ok:false,receipt:{status:"not_dispatched"}});
    assert.equal(a.budget_action,"release");
    assert.equal(f.ledger().snapshot().settled.max_steps,0);
    assert.equal(f.ledger().snapshot().reserved.max_steps,0);
  }finally{f.store.close();}
});
test("budget exhausted refuses further dispatch without requesting Principal approval",async()=>{
  const f=fixture({steps:1});
  try{
    const one=await f.resolver(request());
    assert.equal(one.allowed,true);
    assert.equal((await one.finalize({attempted:true,ok:true})).ok,true);
    const two=await f.resolver(request());
    assert.equal(two.allowed,false);
    assert.equal(two.reason,"budget_exhausted");
    assert.equal(f.ledger().snapshot().settled.max_steps,1);
  }finally{f.store.close();}
});
test("canonical revocation prevents the next action under the same standing mandate",async()=>{
  const f=fixture();
  try{
    const before=await f.resolver(request());
    assert.equal(before.allowed,true);
    await before.finalize({attempted:false});
    const revoked=recordMandateControl(f.store,{
      principal_ref:"principal:jhn",mandate_ref:REF,action:"revoke",
      reason:"fixture revocation"});
    assert.equal(revoked.ok,true);
    const next=await f.resolver(request());
    assert.equal(next.allowed,false);
    assert.equal(f.ledger().snapshot().reserved.max_steps,0);
  }finally{f.store.close();}
});
test("revocation between reservation and dispatch invalidates the standing authorization",async()=>{
  const f=fixture();
  try{
    const granted=await resolveHostMissionAuthority(f.resolver,request());
    assert.equal(granted.canonical_cop,true);
    assert.equal(await granted.beforeDispatch(),true);
    const revoked=recordMandateControl(f.store,{
      principal_ref:"principal:jhn",mandate_ref:REF,action:"revoke",
      reason:"revoked before provider call"});
    assert.equal(revoked.ok,true);
    assert.equal(await granted.beforeDispatch(),false);
    assert.equal((await granted.finalize({attempted:false})).budget_action,"release");
    assert.equal(f.ledger().snapshot().reserved.max_steps,0);
    assert.equal(f.ledger().snapshot().settled.max_steps,0);
  }finally{f.store.close();}
});
test("host router prevents TOCTOU invocation and releases reservation automatically",async()=>{
  const {createHostCapabilityRouter}=await import("./host-capability-router.js");
  const f=fixture();
  let invocations=0;
  const router=createHostCapabilityRouter({
    cacheKey:"standing-revocation-race",providerName:"unix-process",
    missionAuthorityResolver:async input=>{
      const grant=await f.resolver(input);
      if(grant.allowed)recordMandateControl(f.store,{
        principal_ref:"principal:jhn",mandate_ref:REF,action:"revoke",
        reason:"fixture race after reservation"});
      return grant;
    },
    providerFactory:async()=>({start:async()=>{},
      invoke:async()=>{invocations++;return {ok:true,stdout:"unexpected"};}}),
  });
  const caller=auth();
  const ctx={actor:caller.actor,principal:caller.principal_ref,
    mandate:caller.mandate_ref,trustedCallerAuth:caller,
    auth:{lockers:{private:{write:true}}},
    target:"node:fracta2",provider:"unix-process"};
  try{
    await assert.rejects(()=>router.invoke("host.process.run",
      {command:"hostname"},ctx),
      error=>error.error_class==="standing_authority_revoked_or_changed_before_dispatch");
    assert.equal(invocations,0);
    assert.equal(f.ledger().snapshot().reserved.max_steps,0);
    assert.equal(f.ledger().snapshot().settled.max_steps,0);
  }finally{await router.stop();f.store.close();}
});

test("router preserves branded caller and accounts a successful provider effect exactly once",async()=>{
  const {createHostCapabilityRouter}=await import("./host-capability-router.js");
  const f=fixture();
  const router=createHostCapabilityRouter({
    cacheKey:"standing-admission-fbf",providerName:"unix-process",
    missionAuthorityResolver:f.resolver,
    providerFactory:async()=>({start:async()=>{},
      invoke:async()=>({ok:true,upstream_tool:"fake",stdout:"fracta2",exit_code:0})}),
  });
  const caller=auth();
  const ctx={actor:caller.actor,principal:caller.principal_ref,
    mandate:caller.mandate_ref,trustedCallerAuth:caller,
    auth:{lockers:{private:{write:true}}},target:"node:fracta2",
    provider:"unix-process"};
  try{
    const a=await router.invoke("host.process.run",{command:"hostname"},ctx);
    assert.equal(a.ok,true);
    assert.equal(a.trace.authority_origin,"verified_mission");
    assert.equal(a.trace.verification.accounting_complete,true);
    assert.equal(f.ledger().snapshot().settled.max_steps,1);
    await assert.rejects(()=>router.invoke("host.process.run",
      {command:"rm -rf /tmp/something"},ctx),e=>e.error_class==="authorization_missing");
    assert.equal(f.ledger().snapshot().settled.max_steps,1);
  }finally{await router.stop();f.store.close();}
});
