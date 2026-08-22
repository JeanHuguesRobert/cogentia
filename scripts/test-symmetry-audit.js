import assert from "node:assert/strict";
import {
  auditCapabilitySymmetry,
  renderSymmetryScorecardHuman,
  CANONICAL_PROJECTIONS,
} from "./lib/symmetry-audit.js";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";

async function testSymmetryAuditSuite() {
  // 1. Test Audit Engine calculation
  const audit = auditCapabilitySymmetry();
  assert.equal(audit.ok, true);
  assert.equal(audit.protocol, "cogentia.capability_symmetry.v1");
  assert.ok(audit.overallSymmetryScore >= 80);
  assert.ok(audit.totalCapabilities >= 5);
  assert.deepEqual(audit.canonicalProjections, CANONICAL_PROJECTIONS);

  // Check individual capability symmetry
  const converseCap = audit.capabilities.find((c) => c.name === "john.converse");
  assert.equal(converseCap.isFullySymmetric, true);
  assert.equal(converseCap.symmetryScore, 100);

  // Check recommendation generation
  assert.ok(Array.isArray(audit.recommendations));

  // 2. Test Human Scorecard rendering
  const humanOutput = renderSymmetryScorecardHuman(audit);
  assert.ok(humanOutput.includes("COGENTIA CAPABILITY SYMMETRY SCORECARD"));
  assert.ok(humanOutput.includes("john.converse"));
  assert.ok(humanOutput.includes("CLI: ✔"));

  // 3. Test MCP Tool Projection: cogentia_symmetry_audit
  const core = createMcpCore({ COGENTIA_MCP_VIEW: "public" });
  const mcpAudit = await core.callTool("cogentia_symmetry_audit");
  assert.equal(mcpAudit.ok, true);
  assert.equal(mcpAudit.protocol, "cogentia.capability_symmetry.v1");
  assert.ok(mcpAudit.overallSymmetryScore >= 80);
  assert.ok(mcpAudit.totalCapabilities >= 20, "live inventory should include CLI/skills/patterns, not only 6 canned rows");
  assert.ok(mcpAudit.capabilities.some((c) => String(c.name).startsWith("skill.")));
  assert.ok(mcpAudit.capabilities.some((c) => String(c.name).startsWith("pattern.")));

  console.log(JSON.stringify({
    ok: true,
    test: "capability_symmetry_audit",
    overall_score: audit.overallSymmetryScore,
    capabilities_audited: audit.totalCapabilities,
    completed: true,
  }, null, 2));
}

testSymmetryAuditSuite().catch((err) => {
  console.error("test-symmetry-audit failed:", err);
  process.exit(1);
});
