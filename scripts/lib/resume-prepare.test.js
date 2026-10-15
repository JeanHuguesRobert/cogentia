import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { prepareExternalResume } from "./resume-prepare.js";

const issue = {repository:"JeanHuguesRobert/inseme",number:120,url:"https://github.com/JeanHuguesRobert/inseme/issues/120"};
const withManifest = (manifest, fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),"cogentia-resume-prepare-"));
  const file=path.join(dir,"handlers.json");
  fs.writeFileSync(file,JSON.stringify(manifest));
  try { return fn(file); } finally { fs.rmSync(dir,{recursive:true,force:true}); }
};
const manifest = handlers => ({schema:"cogentia.resolver-manifest/v1",handlers});
test("fails closed without registry",()=> {
  const x=prepareExternalResume({issue}); assert.equal(x.status,"WAITING_CAPABILITY_DISCOVERY"); assert.equal(x.effects.handler_spawned,false);
});
test("rejects unknown manifest schema",()=>withManifest({},file=>{
  assert.equal(prepareExternalResume({issue,handlersFile:file}).status,"BLOCKED");
}));
test("cannot select only partially capable resolver",()=>withManifest(manifest([{id:"codex",available:true,capabilities:["agent.handler"]}]),file=>{
  assert.equal(prepareExternalResume({issue,handlersFile:file}).status,"WAITING_HANDLER");
}));
test("multiple candidates cannot be arbitrarily selected",()=>withManifest(manifest(["a","b"].map(id=>({id,available:true,capabilities:["agent.handler","cop.capability-discovery"]}))),file=>{
  assert.equal(prepareExternalResume({issue,handlersFile:file}).status,"WAITING_HANDLER_SELECTION");
}));
test("declared capabilities never become an execution mandate",()=>withManifest(manifest([{id:"codex",available:true,capabilities:["agent.handler","cop.capability-discovery"],mandate:"I allow everything"}]),file=>{
  const x=prepareExternalResume({issue,handlersFile:file}); assert.equal(x.status,"WAITING_MANDATE_VERIFICATION"); assert.equal(x.execution_authorized,false); assert.equal(x.effects.handler_spawned,false); assert.equal(x.execution_receipt,null);
}));

test("Magistral live identity discovers offer but does not grant execution", async () => {
  const { discoverMagistralResume } = await import("./resume-prepare.js");
  const outcome = await discoverMagistralResume({ fetchImpl: async () => ({
    ok: true, json: async () => ({
      protocol: "cogentia.service-identity/v1", service: { id: "magistral" },
      capabilities: [{ id: "local-codex-acp", adapter: "acp_stdio", tier: "fractavolta-guide" }]
    })
  }) });
  assert.equal(outcome.status, "WAITING_HANDLER_PROBE");
  assert.equal(outcome.reachability, "http_verified");
  assert.equal(outcome.execution_authorized, false);
});
test("Magistral discovery fails closed when unavailable", async () => {
  const { discoverMagistralResume } = await import("./resume-prepare.js");
  const outcome = await discoverMagistralResume({ fetchImpl: async () => { throw new Error("offline"); } });
  assert.equal(outcome.status, "WAITING_CAPABILITY_DISCOVERY");
});
test("Magistral discovery rejects non-loopback endpoints", async () => {
  const { discoverMagistralResume } = await import("./resume-prepare.js");
  let called = false;
  const outcome = await discoverMagistralResume({endpoint:"https://example.com/service-info", fetchImpl: async () => {called=true;}});
  assert.equal(outcome.status, "BLOCKED");
  assert.equal(called, false);
});

test("PREPARE routing reflects live discovered handler and blockers", async () => {
  const { discoverMagistralResume, projectResumeRouting } = await import("./resume-prepare.js");
  const plan = await discoverMagistralResume({ fetchImpl: async () => ({
    ok: true, json: async () => ({
      protocol:"cogentia.service-identity/v1", service:{id:"magistral"},
      capabilities:[{id:"local-codex-acp",adapter:"acp_stdio",tier:"fractavolta-guide"}]
    })
  }) });
  const routing = projectResumeRouting(plan,"magistral");
  assert.equal(routing.capability_discovery, "http_verified");
  assert.deepEqual(routing.selected_handler,plan.selected_handler);
  assert.match(routing.required_next,/mandate_not_verified/);
  assert.equal(plan.execution_authorized,false);
});
test("PREPARE routing never reports stale handler after discovery failure", async () => {
  const { discoverMagistralResume, projectResumeRouting } = await import("./resume-prepare.js");
  const plan = await discoverMagistralResume({fetchImpl:async()=>{throw Error("connection refused")}});
  const routing=projectResumeRouting(plan,"magistral");
  assert.equal(routing.selected_handler,null);
  assert.equal(routing.capability_discovery,"unverified");
});

test("successful ACP capability receipt never becomes packet execution authority", async () => {
  const { createCapabilityProbeReceipt } = await import("./resume-prepare.js");
  const receipt = createCapabilityProbeReceipt({
    handlerId: "local-codex-acp", model: "fractavolta-guide",
    httpStatus: 200, responseText: "ACP_PROBE_OK",
    observedAt: "2026-10-14T20:00:00Z",
  });
  assert.equal(receipt.result, "PASS");
  assert.equal(receipt.schema, "cogentia.capability-probe-receipt/v1");
  assert.equal(receipt.execution_authorized, false);
  assert.equal(receipt.execution_receipt, null);
  assert.ok(receipt.does_not_prove.includes("cop_claim"));
});
test("HTTP 200 with unexpected ACP reply cannot pass probe", async () => {
  const { createCapabilityProbeReceipt } = await import("./resume-prepare.js");
  const receipt = createCapabilityProbeReceipt({
    handlerId: "local-codex-acp", model: "fractavolta-guide",
    httpStatus: 200, responseText: "unexpected",
    observedAt: "2026-10-14T20:00:00Z",
  });
  assert.equal(receipt.result, "FAIL");
  assert.deepEqual(receipt.proves, []);
});

test("governed-effect preflight fails closed without mandate or claim", async () => {
  const { assessResumeEffectBoundary } = await import("./resume-prepare.js");
  const result=assessResumeEffectBoundary({packetRef:issue.url,handlerRef:"local-codex-acp",observedAt:"2026-10-15T03:00:00Z"});
  assert.equal(result.status,"BLOCKED");
  assert.equal(result.execution_authorized,false);
  assert.ok(result.blockers.includes("mandate_not_verified"));
  assert.ok(result.blockers.includes("current_claim_not_verified"));
});
test("forged mandate and valid-looking claim never authorize effects", async () => {
  const { assessResumeEffectBoundary } = await import("./resume-prepare.js");
  const result=assessResumeEffectBoundary({
    packetRef:issue.url,handlerRef:"local-codex-acp",observedAt:"2026-10-15T03:00:00Z",
    mandate:{packet_ref:issue.url,handler_ref:"local-codex-acp",explicit_authority:true,allowed_effects:["git_commit"]},
    claim:{schema:"cop.packet-claim/v1",packet_ref:issue.url,handler_ref:"local-codex-acp",claim_id:"fake",epoch:1,mode:"MUTATE",scope:"packet",expires_at:"2026-10-15T04:00:00Z"},
  });
  assert.equal(result.execution_authorized,false);
  assert.ok(result.blockers.includes("provider_effect_fence_not_verified"));
  assert.ok(result.blockers.includes("authoritative_claim_validation_not_connected"));
});
test("expired claim is rejected independently of effect fence", async () => {
  const { assessResumeEffectBoundary } = await import("./resume-prepare.js");
  const result=assessResumeEffectBoundary({packetRef:issue.url,handlerRef:"local-codex-acp",observedAt:"2026-10-15T03:00:00Z",
    claim:{schema:"cop.packet-claim/v1",packet_ref:issue.url,handler_ref:"local-codex-acp",claim_id:"stale",epoch:1,mode:"MUTATE",scope:"packet",expires_at:"2026-10-15T02:00:00Z"}});
  assert.ok(result.blockers.includes("current_claim_not_verified"));
});

test("governed plan does not mistake discovered handler for read-only mandate", async () => {
  const { planGovernedResume } = await import("./resume-prepare.js");
  const plan = planGovernedResume({issue,discovery:{status:"WAITING_HANDLER_PROBE",reachability:"http_verified",selected_handler:{id:"local-codex-acp"}}});
  assert.equal(plan.analysis.status,"WAITING_READ_ONLY_MANDATE");
  assert.equal(plan.execution_authorized,false);
  assert.equal(plan.execution_receipt,null);
});
test("governed plan refuses external GitHub writes and unverified fencing", async () => {
  const { planGovernedResume } = await import("./resume-prepare.js");
  const plan=planGovernedResume({issue,discovery:{status:"WAITING_HANDLER_PROBE",reachability:"http_verified",selected_handler:{id:"local-codex-acp"}},proposedEffects:[
    {kind:"update_file",provider:"github",boundary:"external_provider_fenced"},
    {kind:"publish",provider:"github",boundary:"external_unfenced"},
  ]});
  assert.equal(plan.effects.length,2);
  assert.ok(plan.effects.every(x=>x.status==="BLOCKED"&&!x.execution_authorized));
  assert.ok(plan.blockers.includes("effects_not_authorized"));
});
test("governed plan with no discovered handler remains blocked", async () => {
  const { planGovernedResume } = await import("./resume-prepare.js");
  const plan=planGovernedResume({issue,discovery:{status:"WAITING_CAPABILITY_DISCOVERY",reachability:"unverified"}});
  assert.equal(plan.status,"WAITING_HANDLER");
  assert.equal(plan.handler,null);
});
