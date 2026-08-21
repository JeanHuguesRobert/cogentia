import assert from "node:assert/strict";
import {
  DiagnosticContext,
  JohnRepl,
  CapabilityInspector,
  PacketOdysseyInspector,
  ContinuationInspector,
  AccountingInspector,
  TopologyInspector,
} from "./lib/john-diagnostic/index.js";
import { packHandoffPacket } from "./lib/john-handoff.js";

async function runDiagnosticAudit() {
  // 1. Test DiagnosticContext registration and mode toggles
  const ctx = new DiagnosticContext({ mode: "diagnostic" });
  assert.equal(ctx.mode, "diagnostic");
  assert.equal(ctx.listInspectors().length, 5);
  assert.equal(ctx.setMode("conversational"), "conversational");
  assert.throws(() => ctx.setMode("invalid_mode"), /Invalid mode/);

  // 2. Test CapabilityInspector (Introspection on nature, providers, rate cards, risk)
  const capInsp = ctx.getInspector("capabilities");
  const allCaps = await capInsp.inspect();
  assert.ok(allCaps.length >= 3);
  const researchCap = allCaps.find((c) => c.name === "john.research");
  assert.equal(researchCap.riskLevel, "bounded");
  assert.equal(researchCap.provider, "governed.step_reasoner");

  const filteredCaps = await capInsp.inspect("code-analysis");
  assert.equal(filteredCaps.length, 1);
  assert.equal(filteredCaps[0].name, "code-analysis");

  const detail = await capInsp.getDetail("code-analysis");
  assert.equal(detail.ok, true);
  assert.equal(detail.capability.riskLevel, "read_only");
  assert.equal(detail.audit.rateCard, "2 units/call");

  const notFoundDetail = await capInsp.getDetail("non-existent");
  assert.equal(notFoundDetail.ok, false);

  // 3. Test PacketOdysseyInspector
  const sampleReq = {
    version: "john.request.v1",
    request_id: "req-diag-001",
    principal: { id: "user:investigator" },
    mandate: { id: "mandate:investigation", version: "1" },
    budget: { id: "budget:diag" },
    execution_budget: { max_steps: 2, max_tool_calls: 1, max_subagents: 0, max_elapsed_ms: 5000, max_external_effects: 0 },
    exposure: "read_only",
    capability: "john.converse",
    input: { prompt: "Diagnostic probe" },
    handler: { id: "mock.echo", kind: "mock" },
    ithaca: { return_target: "session:diag" },
  };
  const packet = packHandoffPacket(sampleReq, { targetNode: "node:target-probe" });
  const packetInsp = ctx.getInspector("packets");
  const packetReport = packetInsp.inspectPacket(packet);
  assert.equal(packetReport.ok, true);
  assert.equal(packetReport.packetId, "urn:cop:packet:john:req-diag-001");
  assert.equal(packetReport.ithaca.return_target, "session:diag");
  assert.ok(packetReport.odyssey);

  assert.throws(() => packetInsp.inspectPacket({}), /Invalid Cognitive Packet/);

  // 4. Test ContinuationInspector (Human Judgment Boundaries #80)
  const contInsp = new ContinuationInspector({
    continuations: [
      { id: "cont-001", status: "alive", description: "Review Git patch", allowed_actions: ["approve", "reject"] },
      { id: "cont-002", status: "paused_for_judgment", description: "Mandate elevation requested", allowed_actions: ["grant", "deny"] },
    ],
  });
  const aliveList = await contInsp.list("alive");
  assert.equal(aliveList.ok, true);
  assert.equal(aliveList.continuations.length, 1);

  const judgmentCont = await contInsp.inspect("cont-002");
  assert.equal(judgmentCont.ok, true);
  assert.equal(judgmentCont.requiresHumanJudgment, true);
  assert.deepEqual(judgmentCont.actionOptions, ["grant", "deny"]);

  // 5. Test TopologyInspector
  const topInsp = ctx.getInspector("topology");
  const nodes = topInsp.listNodes();
  assert.ok(nodes.nodesCount >= 3);

  const probeOk = await topInsp.probeNode("node:workstation:john-cli");
  assert.equal(probeOk.ok, true);
  assert.equal(probeOk.reachable, true);

  const probeUnknown = await topInsp.probeNode("node:unknown-alien-machine");
  assert.equal(probeUnknown.ok, false);
  assert.equal(probeUnknown.reachable, false);

  // 6. Test JohnRepl Command Evaluation & Modes
  const repl = new JohnRepl({ mode: "diagnostic" });

  // Test Help command
  const helpOutput = await repl.executeCommand(".help");
  assert.ok(helpOutput.includes("John Diagnostic & Investigation Commands"));

  // Test Mode toggle
  assert.ok((await repl.executeCommand(".mode conversational")).includes("conversational"));
  assert.equal(repl.context.mode, "conversational");

  // Test Evaluation in Conversational mode (clean semantic yield)
  const convEval = await repl.executeCommand("Hello John");
  assert.ok(convEval.includes("Mock handler received: Hello John"));
  assert.ok(!convEval.includes("--- Diagnostic Event Trace"));

  // Test Evaluation in Diagnostic mode (full event trace + accounting summary)
  await repl.executeCommand(".mode diagnostic");
  assert.equal(repl.context.mode, "diagnostic");
  const diagEval = await repl.executeCommand(".eval Investigate system state");
  assert.ok(diagEval.includes("--- Diagnostic Event Trace"));
  assert.ok(diagEval.includes("[john.run.started]"));
  assert.ok(diagEval.includes("[john.packet.admitted]"));
  assert.ok(diagEval.includes("[john.run.completed]"));
  assert.ok(diagEval.includes("--- Accounting Settlement:"));

  // Test Capability introspection command
  const capCmdRes = await repl.executeCommand(".capabilities");
  assert.ok(capCmdRes.includes("john.research"));

  // Test Specific Capability Detail command
  const capDetailCmd = await repl.executeCommand(".cap code-analysis");
  assert.ok(capDetailCmd.includes("2 units/call"));

  // Test Node Probe command
  const probeCmd = await repl.executeCommand(".probe node:workstation:john-cli");
  assert.ok(probeCmd.includes("tier-1-direct-hop"));

  // Test Exit command
  const exitRes = await repl.executeCommand(".exit");
  assert.equal(exitRes, "__EXIT__");

  console.log(JSON.stringify({
    ok: true,
    test: "john_diagnostic_repl",
    inspectors_tested: ["capabilities", "packets", "continuations", "accounting", "topology"],
    repl_modes_tested: ["diagnostic", "conversational"],
    completed: true,
  }, null, 2));
}

runDiagnosticAudit().catch((err) => {
  console.error("test-john-diagnostic failed:", err);
  process.exit(1);
});
