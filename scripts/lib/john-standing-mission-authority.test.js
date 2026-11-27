import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {createSqliteCopEventStore} from
  "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {createEventSourcedExecutionBudgetLedger} from
  "../../../inseme/packages/cop-core/src/execution-budget.js";
import {assignPacketWork} from "../../../inseme/packages/cop-core/src/packet-work-assignment.js";
import {createCopMcpTasksPilot,packetRefForMcpTask} from "./mcp-tasks-cop-pilot.mjs";
import {buildWorkCommissioningContract} from "./work-commissioning-contract.js";
import {hashPayload} from "../../../inseme/packages/cop-core/src/cop-event-envelope.js";
import {hostname} from "node:os";
import {UnixProcessProvider} from "./unix-process-provider.js";
import {recordMandateControl} from
  "../../../inseme/packages/cop-core/src/governed-act.js";
import {issueVerifiedJohnRoot} from "./john-root-issuance.js";
import {createOfflineJohnIssuerVerifier} from "./john-offline-issuer-verifier.js";
import {resolveCallerAuth} from "./cogentia-mcp-auth.js";
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,proposalHash,
  publicKeyFingerprint} from "./john-root-mandate.js";
import {createCanonicalStandingMissionResolver,STANDING_DIAGNOSTIC_PROFILE,
  STANDING_GENERAL_HOST_PROFILE,STANDING_MANDATE_REF,STANDING_BUDGET_ID}
  from "./john-standing-mission-authority.js";
import {resolveHostMissionAuthority} from "./host-mission-authority.js";
import {reserveEventSourcedDelegatedBudget} from "../../../inseme/packages/cop-core/src/delegated-budget.js";
import {canonicalPayloadHash} from "./side-effect-authorization.js";

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
function fixture({actions=true,standing=true,general=false,steps=8,issuerValid=true,
  until="2027-01-01T00:00:00Z",resolvePacketContext=null}={}){
  const store=createSqliteCopEventStore(":memory:");
  const proposal={kind:ROOT_MANDATE_KIND,mandate_id:REF,version:"v1",
    principal_ref:"principal:jhn",logical_agent_ref:"agent:jhn",
    valid_from:"2026-01-01T00:00:00Z",valid_until:until,
    scope:{allowed_actions:actions?["host.process.run"]:["browser.hosted.inspect"],
      forbidden_actions:[...RESERVED_ACTIONS],
      ...(standing?{standing_operations:[general
        ?{...operation,profile:STANDING_GENERAL_HOST_PROFILE}:operation]}:{})},
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
  const resolver=createCanonicalStandingMissionResolver({store,verifyIssuer,now:()=>AT,resolvePacketContext});
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

test("one signed general host profile permits different commands on the same node, with per-effect COP accounting",async()=>{
  const f=fixture({general:true,steps:5});
  try {
    const commands=["hostname","pwd","printf CHECK_GENERAL_EXECUTION",
      "git status --short","sudo -n systemctl is-active caddy"];
    for(const command of commands){
      const granted=await f.resolver(request(auth(),{command}));
      assert.equal(granted.allowed,true,command+":"+granted.reason);
      assert.equal(await granted.beforeDispatch(),true);
      const out=await granted.finalize({attempted:true,ok:true,receipt:{status:"success"}});
      assert.equal(out.accounting_complete,true);
    }
    assert.equal(f.ledger().snapshot().settled.max_steps,5);
    assert.equal(f.ledger().snapshot().reserved.max_steps,0);
    assert.equal((await f.resolver(request(auth(),{command:"echo beyond budget"}))).allowed,false);
    assert.equal((await f.resolver(request(auth(),{provider:"desktop-commander"}))).allowed,false);
    assert.equal((await f.resolver(request(auth(),{execution_mode:"super"}))).allowed,false);
  } finally{f.store.close();}
});
test("v4 diagnostics-only profile remains unable to run general shell code",async()=>{
  const f=fixture({general:false});
  try{
    for(const command of ["git status --short","sudo -n systemctl is-active caddy"]){
      const denied=await f.resolver(request(auth(),{command}));
      assert.equal(denied.allowed,false);
    }
    assert.equal(f.ledger().snapshot().reserved.max_steps,0);
  }finally{f.store.close();}
});

test("provider response is hash-bound to durable accounting, without copying its contents",async()=>{
  const {createHostCapabilityRouter}=await import("./host-capability-router.js");
  const f=fixture({general:true});
  const response={ok:true,upstream_tool:"fixture",stdout:'{"request_id":"fixture-ticket","state":"verified"}',
    stderr:"fixture-private-output",exit_code:0,output_truncated:false};
  const router=createHostCapabilityRouter({cacheKey:"standing-receipt-fbf",providerName:"unix-process",
    missionAuthorityResolver:f.resolver,providerFactory:async()=>({start:async()=>{},invoke:async()=>response})});
  const caller=auth(),ctx={actor:caller.actor,principal:caller.principal_ref,mandate:caller.mandate_ref,
    trustedCallerAuth:caller,auth:{lockers:{private:{write:true}}},target:"node:fracta2",provider:"unix-process"};
  try{
    const result=await router.invoke("host.process.run",{command:"hostname"},ctx);
    const settlement=f.store.listTopic("execution-budget:"+STANDING_BUDGET_ID).find(e=>e.event_type==="ExecutionBudgetSettlement");
    assert.equal(settlement.payload.evidence.trace_id,result.trace.trace_id);
    assert.equal(settlement.payload.evidence.provider_receipt_hash,canonicalPayloadHash(response));
    assert.equal(result.trace.provider_receipt.receipt_hash,settlement.payload.evidence.provider_receipt_hash);
    assert.equal(settlement.payload.evidence.accounting_locality,"principal");
    assert.equal(settlement.payload.evidence.packet_ref,null);
    assert.equal(result.trace.verification.cop_spend.accounting_locality,"principal");
    assert.ok(!JSON.stringify(settlement).includes("fixture-private-output"));
    assert.ok(!JSON.stringify(settlement).includes("fixture-ticket"));
  }finally{await router.stop();f.store.close()}
});
test("commissioned COP Task executes real Unix process under its local allocation, returns only summary",async()=>{
  const {createHostCapabilityRouter}=await import("./host-capability-router.js");
  const primary="sqlite:fixture-local";
  const local=createSqliteCopEventStore(":memory:");
  let packet=null,context=null,allocation=null,rootBefore=null;
  const f=fixture({general:true,steps:2,resolvePacketContext:q=>
    q.packet_ref===packet&&q.actor_ref==="agent:jhn"?context:null});
  const router=createHostCapabilityRouter({cacheKey:"standing-packet-real",providerName:"unix-process",
    missionAuthorityResolver:f.resolver,
    // On Fracta2 exercise the built-in provider and target check. Elsewhere
    // this fixture binds the signed fixture target to a real local provider.
    ...(hostname().toLowerCase()!=="fracta2"?{providerFactory:async()=>new UnixProcessProvider()}: {})});
  const caller=auth(),ctx={actor:caller.actor,principal:caller.principal_ref,mandate:caller.mandate_ref,
    trustedCallerAuth:caller,auth:{lockers:{private:{write:true}}},target:"node:fracta2",provider:"unix-process"};
  const args={command:"hostname"};
  const toolName="fixture-host-process";
  const built=buildWorkCommissioningContract({intent:{
    submission_key:"standing-packet-fixture",request_hash:hashPayload(args),
    principal_ref:caller.principal_ref,responsible_agent_ref:caller.actor,
    capability:"host.process.run",mandate_ref:REF,mandate_version:"v1",
    parent_budget_ref:STANDING_BUDGET_ID,allocation:{max_steps:2}
  },context:{verified:true,principal_ref:caller.principal_ref,
    request_hash:hashPayload(args),requesting_agent_ref:caller.actor,
    commissioned_by_principal_ref:caller.principal_ref,
    commissioning_ref:"fixture:commissioned-host-process",destination_ref:"fixture:local",
    recipient_ref:caller.principal_ref,result_visibility:"restricted"}});
  assert.equal(built.ok,true,JSON.stringify(built));
  const pilot=createCopMcpTasksPilot({store:local,toolName,primaryStoreId:primary,
    prepareCreation:()=>({admitted:true,submission_key:"standing-packet-fixture",
      assignment:built.assignment,access_context:built.contract}),
    async handler(input,{taskId,auth:actualCaller}){
      assert.equal(actualCaller,caller);
      packet=packetRefForMcpTask(taskId);
      const budget="budget:"+packet;
      allocation=reserveEventSourcedDelegatedBudget({store:f.store,child_store:local,
        child_source_ref:primary+"#"+packet,parent_ledger:f.ledger(),
        child_budget_id:budget,child_mandate_ref:REF,principal_ref:caller.principal_ref,
        allocation:built.contract.funding.allocation,idempotency_key:packet});
      assert.equal(allocation.ok,true,JSON.stringify(allocation));
      context={store:local,primary_store_id:primary,budget_id:budget,allocation_ref:allocation.reservation.reservation_id};
      rootBefore=f.store.replay();
      const result=await router.invoke("host.process.run",input,{...ctx,packet_ref:packet});
      assert.equal(result.ok,true,JSON.stringify(result));
      assert.equal(result.stdout.trim(),hostname());
      assert.equal(result.identity.hostname,hostname());
      assert.equal(result.trace.verification.cop_spend.accounting_locality,"packet");
      assert.equal(result.trace.verification.cop_spend.packet_ref,packet);
      assert.equal(result.trace.verification.cop_spend.budget_id,budget);
      const settlement=local.listTopic("execution-budget:"+budget).find(e=>e.event_type==="ExecutionBudgetSettlement");
      assert.equal(settlement.payload.evidence.provider_receipt_hash,result.trace.provider_receipt.receipt_hash);
      assert.ok(settlement.payload.evidence.assignment_ref);
      assert.equal(allocation.child_ledger.snapshot().settled.max_steps,1);
      assert.deepEqual(f.store.replay(),rootBefore);
      await assert.rejects(()=>router.invoke("host.process.run",input,{...ctx,packet_ref:"pkt-unknown"}),
        e=>e.error_class==="authorization_missing");
      const originalContext=context;
      context={...context,allocation_ref:"fixture:wrong-allocation"};
      await assert.rejects(()=>router.invoke("host.process.run",input,{...ctx,packet_ref:packet}),
        e=>e.error_class==="authorization_missing");
      context=originalContext;
      // A changed assignment between admission and dispatch invalidates
      // the prepared work, without moving the spend to the root budget.
      const g=await f.resolver(request(caller,{packet_ref:packet}));
      assert.equal(g.allowed,true,JSON.stringify(g));
      assert.equal(assignPacketWork(local,{packet_ref:"packet:"+packet,
        responsible_agent_ref:"agent:fixture-other",commissioned_by_principal_ref:caller.principal_ref,
        assignment_id:"fixture-transfer",expected_revision:1,source_ref:"fixture:transfer"}).ok,true);
      assert.equal(await g.beforeDispatch(),false);
      assert.equal((await g.finalize({attempted:false})).budget_action,"release");
      await assert.rejects(()=>router.invoke("host.process.run",input,{...ctx,packet_ref:packet}),
        e=>e.error_class==="authorization_missing");
      assert.deepEqual(f.store.replay(),rootBefore);
      assert.equal(allocation.close().ok,true);
      return {hostname:result.stdout.trim(),trace_id:result.trace.trace_id};
    }});
  try{
    const {taskId}=await pilot.adapter.create({name:toolName,args,auth:caller});
    const done=await pilot.run(taskId,caller);
    assert.equal(done.status,"completed",JSON.stringify(done));
    assert.equal(done.result.hostname,hostname());
    assert.equal(f.ledger().snapshot().settled.max_steps,1);
    assert.equal(f.ledger().snapshot().reserved.max_steps,0);
    assert.equal(local.auditTopicCommitment("execution-budget:budget:"+packet).ok,true);
    await assert.rejects(()=>router.invoke("host.process.run",args,{...ctx,packet_ref:packet}),
      e=>e.error_class==="authorization_missing");
    console.log("COMMISSIONED_PACKET_REAL_UNIX_PASS",JSON.stringify({hostname:done.result.hostname,
      packet_local_steps:1,parent_summary_steps:1,assignment_transfer_rechecked:true}));
  }finally{await router.stop();local.close();f.store.close()}
});
