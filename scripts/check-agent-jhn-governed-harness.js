#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  AGENT_STEP_PROTOCOL,
  STEP_RESULT_PROTOCOL,
  createCapabilityRegistry,
  createGovernedHarness,
} from "./lib/agent-jhn-whatsapp/governed-harness.js";

const tests = [];
const test = (name, run) => tests.push({ name, run });
const reasoner = nextStep => ({ nextStep });

function registry(overrides = {}) {
  return createCapabilityRegistry([
    { name: "corpus.search", kind: "tool", risk: "read_only", resultVisibility: "reasoner", costUnits: 1, execute: overrides.search || (async ({ query }) => ({ excerpts: [`evidence:${query}`] })) },
    { name: "github.read", kind: "mcp", risk: "read_only", costUnits: 2, execute: async () => ({ issue: 18 }) },
    { name: "gmail.send", kind: "mcp", risk: "external_write", costUnits: 3, execute: overrides.send || (async () => ({ sent: true })) },
  ]);
}

test("the governed harness continues from an intermediate capability result to an answer", async () => {
  let reasonerCalls = 0;
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async state => {
      reasonerCalls += 1;
      return state.observations.length
        ? { kind: "answer", answer: state.observations[0].value.excerpts[0] }
        : { kind: "capability_call", capability: "corpus.search", input: { query: "FractaVolta" } };
    }),
  });
  const result = await harness.run({ text: "Explain" }, { allowedCapabilities: ["corpus.search"] });
  assert.equal(result.ok, true);
  assert.equal(result.answer, "evidence:FractaVolta");
  assert.equal(result.capabilityCalls, 1);
  assert.equal(result.stepCount, 2);
  assert.equal(reasonerCalls, 2);
  assert.deepEqual(result.steps.map(item => item.step.kind), ["capability_call", "answer"]);
  assert.notEqual(result.stopReason, "clarification_required");
  assert.equal(result.steps[0].step.protocol, AGENT_STEP_PROTOCOL);
  assert.equal(result.steps[0].result.protocol, STEP_RESULT_PROTOCOL);
});

test("private capability results are redacted before the next reasoner step", async () => {
  let observed;
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async state => {
      if (!state.observations.length) return { kind: "capability_call", capability: "github.read" };
      observed = state.observations[0];
      return { kind: "answer", answer: "done" };
    }),
  });
  const result = await harness.run({}, { allowedCapabilities: ["github.read"] });
  assert.equal(result.ok, true);
  assert.deepEqual(observed.value, { redacted: true, reason: "capability_result_private" });
  assert.deepEqual(result.observations[0].value, { issue: 18 });
  assert.equal("value" in result.steps[0].result.observation, false);
});


test("a JudgmentHandler executes a declared authorized read-only next probe before closing", async()=>{
  let reads=0;
  const harness=createGovernedHarness({requiredEvents:false,
    registry:registry({search:async({query})=>{reads++;return {excerpts:[`verified:${query}`]}}}),
    reasoner:reasoner(async(state)=>{
      const receipt=state.observations.find(x=>x.type==="capability_result");
      return receipt?{kind:"answer",answer:receipt.value.excerpts[0]}:{
        kind:"answer",answer:"The next step would be to inspect the corpus",
        next_action:{capability:"corpus.search",input:{query:"Cogentia"}}};
    }),
  });
  const r=await harness.run({text:"Check the corpus"},
    {allowedCapabilities:["corpus.search"]},{maxSteps:4,maxCapabilityCalls:1});
  assert.equal(r.ok,true);
  assert.equal(r.answer,"verified:Cogentia");
  assert.equal(reads,1);
  assert.equal(r.capabilityCalls,1);
  assert.deepEqual(r.steps.map(x=>x.result.status),["deferred","completed"]);
});

test("a suggested next probe never inherits authority from the model",async()=>{
  let reads=0;
  const harness=createGovernedHarness({requiredEvents:false,
    registry:registry({search:async()=>{reads++;return {}}}),
    reasoner:reasoner(async()=>({kind:"answer",answer:"I recommend inspecting",
      next_action:{capability:"corpus.search",input:{query:"secret"}}})),
  });
  const r=await harness.run({}, {allowedCapabilities:[]});
  assert.equal(r.ok,false);
  assert.equal(r.stopReason,"answer_next_action_not_authorized");
  assert.equal(reads,0);
  assert.equal(r.answer,"I recommend inspecting");
});

test("a final-answer suggestion must never silently send external communications",async()=>{
  let sends=0;
  const harness=createGovernedHarness({requiredEvents:false,
    registry:registry({send:async()=>{sends++;return {sent:true}}}),
    reasoner:reasoner(async()=>({kind:"answer",answer:"I'll send the message",
      next_action:{capability:"gmail.send",input:{body:"hello"}}})),
  });
  const r=await harness.run({}, {allowedCapabilities:["gmail.send"],
    confirmedCapabilities:["gmail.send"]},{maxExternalEffects:1});
  assert.equal(r.ok,false);
  assert.equal(r.stopReason,"answer_next_action_not_authorized");
  assert.equal(sends,0);
});

test("a next-action recommendation cannot replay an already completed explicit read",async()=>{
  let reads=0;
  const harness=createGovernedHarness({requiredEvents:false,
    registry:registry({search:async()=>{reads++;return {excerpts:["a result"]}}}),
    reasoner:reasoner(async(state)=>state.observations.length?{
      kind:"answer",answer:"Read again",next_action:{capability:"corpus.search",input:{query:"X"}}
    }:{kind:"capability_call",capability:"corpus.search",input:{query:"X"}}),
  });
  const r=await harness.run({}, {allowedCapabilities:["corpus.search"]},
    {maxSteps:4,maxCapabilityCalls:3});
  assert.equal(reads,1);
  assert.equal(r.stopReason,"answer_next_action_duplicate");
});

test("a repeated or unaffordable recommended probe cannot run twice",async()=>{
  let reads=0;
  const harness=createGovernedHarness({requiredEvents:false,
    registry:registry({search:async()=>{reads++;return {ok:true}}}),
    reasoner:reasoner(async()=>({kind:"answer",answer:"Need another look",
      next_action:{capability:"corpus.search",input:{query:"same"}}})),
  });
  const r=await harness.run({}, {allowedCapabilities:["corpus.search"]},
    {maxSteps:5,maxCapabilityCalls:4});
  assert.equal(r.stopReason,"answer_next_action_duplicate");
  assert.equal(reads,1);
  const constrained=await harness.run({}, {allowedCapabilities:["corpus.search"]},
    {maxSteps:3,maxCapabilityCalls:0});
  assert.equal(constrained.stopReason,"capability_call_budget");
  assert.equal(reads,1);
});

test("registration does not grant authorization", async () => {
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async state => state.observations.length ? { kind: "stop", reason: "done" } : { kind: "capability_call", capability: "github.read" }),
  });
  const result = await harness.run({}, { allowedCapabilities: [] });
  assert.equal(result.observations[0].reason, "not_in_authorization_envelope");
  assert.equal(result.capabilityCalls, 0);
});

test("unknown capabilities fail closed", async () => {
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async state => state.observations.length ? { kind: "stop", reason: "done" } : { kind: "capability_call", capability: "unknown.tool" }),
  });
  const result = await harness.run({}, { allowedCapabilities: ["unknown.tool"] });
  assert.equal(result.observations[0].reason, "unknown_capability");
});

test("external writes require confirmation", async () => {
  let sends = 0;
  const harness = createGovernedHarness({
    registry: registry({ send: async () => { sends += 1; return { sent: true }; } }),
    reasoner: reasoner(async state => state.observations.length ? { kind: "stop", reason: "done" } : { kind: "capability_call", capability: "gmail.send" }),
  });
  const denied = await harness.run({}, { allowedCapabilities: ["gmail.send"] });
  assert.equal(denied.observations[0].reason, "confirmation_required");
  assert.equal(sends, 0);
});

test("confirmation alone never increases the default zero external-effect budget", async () => {
  let sends = 0;
  const harness = createGovernedHarness({
    registry: registry({ send: async () => { sends += 1; return { sent: true }; } }),
    reasoner: reasoner(async () => ({ kind: "capability_call", capability: "gmail.send" })),
  });
  const result = await harness.run({}, { allowedCapabilities: ["gmail.send"], confirmedCapabilities: ["gmail.send"] });
  assert.equal(result.ok, false);
  assert.equal(result.stopReason, "external_effect_budget");
  assert.equal(result.externalEffects, 0);
  assert.equal(result.capabilityCalls, 0);
  assert.equal(sends, 0);
});

test("external writes still require confirmation when an explicit effect budget exists", async () => {
  let sends = 0;
  const harness = createGovernedHarness({
    registry: registry({ send: async () => { sends += 1; return { sent: true }; } }),
    reasoner: reasoner(async state => state.observations.length ? { kind: "stop", reason: "done" } : { kind: "capability_call", capability: "gmail.send" }),
  });
  const result = await harness.run({}, { allowedCapabilities: ["gmail.send"] }, { maxExternalEffects: 1 });
  assert.equal(result.observations[0].reason, "confirmation_required");
  assert.equal(result.externalEffects, 0);
  assert.equal(sends, 0);
});

test("explicitly bounded and confirmed external writes can reach a stub executor", async () => {
  // This isolated harness contract does not issue or verify a COP mandate.
  // A confirmedCapabilities test fixture is NOT evidence of live send authority.
  let sends = 0;
  const harness = createGovernedHarness({
    registry: registry({ send: async () => { sends += 1; return { sent: true }; } }),
    reasoner: reasoner(async state => state.observations.length ? { kind: "answer", answer: "stub completed" } : { kind: "capability_call", capability: "gmail.send" }),
  });
  const result = await harness.run(
    {},
    { allowedCapabilities: ["gmail.send"], confirmedCapabilities: ["gmail.send"] },
    { maxExternalEffects: 1 },
  );
  assert.equal(result.ok, true);
  assert.equal(result.externalEffects, 1);
  assert.equal(result.capabilityCalls, 1);
  assert.equal(sends, 1);
});

test("capability-call and cost budgets stop execution", async () => {
  const harness = createGovernedHarness({ registry: registry(), reasoner: reasoner(async () => ({ kind: "capability_call", capability: "github.read" })) });
  const calls = await harness.run({}, { allowedCapabilities: ["github.read"] }, { maxCapabilityCalls: 1, maxSteps: 4 });
  assert.equal(calls.stopReason, "capability_call_budget");
  const cost = await harness.run({}, { allowedCapabilities: ["github.read"] }, { maxCostUnits: 1, maxSteps: 4 });
  assert.equal(cost.stopReason, "cost_budget");
});

test("a rejected answer becomes an observation for the next step", async () => {
  let reviews = 0;
  const harness = createGovernedHarness({
    registry: registry(),
    reasoner: reasoner(async state => ({ kind: "answer", answer: state.observations.length ? "grounded answer" : "draft" })),
    reviewer: async ({ answer }) => (++reviews === 1 ? { accepted: false, answer, issues: ["not_grounded"] } : { accepted: true, answer }),
  });
  const result = await harness.run({});
  assert.equal(result.answer, "grounded answer");
  assert.equal(result.stepCount, 2);
});

test("clarification is a terminal step requiring user input", async () => {
  const harness = createGovernedHarness({ registry: registry(), reasoner: reasoner(async () => ({ kind: "clarify", question: "Which account?" })) });
  const result = await harness.run({});
  assert.equal(result.stopReason, "clarification_required");
  assert.equal(result.question, "Which account?");
  assert.equal(result.steps[0].result.status, "requires_input");
});

test("step results never expose arguments, values, or error messages", async () => {
  const secret = "sk-private-secret";
  const harness = createGovernedHarness({
    registry: registry({ search: async () => { throw Object.assign(new Error(secret), { code: "unsafe code" }); } }),
    reasoner: reasoner(async state => state.observations.length ? { kind: "stop", reason: "done" } : { kind: "capability_call", capability: "corpus.search", input: { secret } }),
  });
  const result = await harness.run({}, { allowedCapabilities: ["corpus.search"] });
  const safeResult = JSON.stringify(result.steps.map(item => item.result));
  assert.equal(safeResult.includes(secret), false);
  assert.equal(safeResult.includes("unsafe code"), false);
  assert.equal(result.steps[0].result.status, "failed");
});

let passed = 0;
const failures = [];
for (const item of tests) {
  try { await item.run(); passed += 1; }
  catch (error) { failures.push({ name: item.name, error: error.stack || error.message }); }
}
console.log(JSON.stringify({ ok: failures.length === 0, passed, failed: failures.length, total: tests.length, real_capability_calls: 0, external_writes: 0, failures }, null, 2));
if (failures.length) process.exit(1);
