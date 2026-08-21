/**
 * Capability Symmetry Audit Engine (Issue #110 & Corpus Axiom).
 *
 * Axiom: Every capability mobilizable by an agent or system must be projected symmetrically:
 * 1. Human CLI: Accessible to a human operator via Terminal / CLI / REPL.
 * 2. Human Web UX: Accessible to a human user via Browser UI / OpenAI-compatible WebUI.
 * 3. Machine MCP: Accessible to AI agents and IDEs via Model Context Protocol (MCP JSON-RPC).
 * 4. Machine API /v1: Accessible over standard HTTP REST / SSE API (/v1/chat/completions).
 * 5. COP Cognitive Packet: Governed under COP lifecycle, Odyssey trace, and double-entry accounting.
 */

export const CANONICAL_PROJECTIONS = [
  "human_cli",
  "human_web_ux",
  "machine_mcp",
  "machine_api_v1",
  "cop_packet",
];

export const CAPABILITY_INVENTORY = [
  {
    name: "john.converse",
    category: "reasoning",
    description: "Conversational governed reasoning and question answering",
    projections: {
      human_cli: { available: true, target: "john repl / john run" },
      human_web_ux: { available: true, target: "Open WebUI / LibreChat via /v1/chat/completions" },
      machine_mcp: { available: true, target: "cogentia_john_run" },
      machine_api_v1: { available: true, target: "POST /v1/chat/completions (SSE)" },
      cop_packet: { available: true, target: "protocol: cognitive_packet.v0" },
    },
  },
  {
    name: "john.research",
    category: "research",
    description: "Multi-step governed corpus research with tool mobilize & accounting",
    projections: {
      human_cli: { available: true, target: "john repl (.eval) / john run --request" },
      human_web_ux: { available: true, target: "Guide Web UI / Open WebUI custom model" },
      machine_mcp: { available: true, target: "cogentia_john_run (capability: john.research)" },
      machine_api_v1: { available: true, target: "POST /guide/v1/chat/completions" },
      cop_packet: { available: true, target: "protocol: cognitive_packet.v0" },
    },
  },
  {
    name: "corpus.search",
    category: "retrieval",
    description: "Hybrid semantic & keyword search across corpus documents",
    projections: {
      human_cli: { available: true, target: "scripts/search.js / john inspect" },
      human_web_ux: { available: true, target: "https://jhn.baronsmariani.org / Guide UI" },
      machine_mcp: { available: true, target: "cogentia_search / cogentia_search_multi" },
      machine_api_v1: { available: true, target: "POST /guide/search" },
      cop_packet: { available: true, target: "stimulus-admitted tool capability" },
    },
  },
  {
    name: "cop.handoff",
    category: "delegation",
    description: "Cross-machine Cognitive Packet handoff without shared RAM",
    projections: {
      human_cli: { available: true, target: "john handoff pack / unpack / run / send" },
      human_web_ux: { available: false, target: "Pending Web Handoff visualizer" },
      machine_mcp: { available: true, target: "cogentia_john_run (delegation envelope)" },
      machine_api_v1: { available: true, target: "POST /api/cop/packet (REST)" },
      cop_packet: { available: true, target: "protocol: john.request.handoff" },
    },
  },
  {
    name: "cop.continuations",
    category: "governance",
    description: "Human judgment boundary pause & resume tokens (issue #80)",
    projections: {
      human_cli: { available: true, target: "john inspect continuations" },
      human_web_ux: { available: true, target: "Guide continuations cockpit / ops" },
      machine_mcp: { available: true, target: "cogentia_continuation_list / inspect / resolve" },
      machine_api_v1: { available: true, target: "GET/POST /api/continuations" },
      cop_packet: { available: true, target: "status: paused_for_judgment" },
    },
  },
  {
    name: "cop.accounting",
    category: "accounting",
    description: "Provisional token spend settlement and double-entry ledger",
    projections: {
      human_cli: { available: true, target: "john inspect (accounting) / trace-view" },
      human_web_ux: { available: true, target: "FractaBlog feed / ops dashboard" },
      machine_mcp: { available: true, target: "cogentia_consolidate / surface accounting" },
      machine_api_v1: { available: true, target: "GET /api/ops/emit-static" },
      cop_packet: { available: true, target: "postings: debit/credit balanced" },
    },
  },
];

/**
 * Runs a complete Capability Symmetry Audit across the system.
 */
export function auditCapabilitySymmetry(options = {}) {
  const inventory = options.inventory || CAPABILITY_INVENTORY;
  const results = [];
  let totalSlots = 0;
  let satisfiedSlots = 0;

  for (const cap of inventory) {
    const projectionStates = {};
    const missing = [];
    const available = [];

    for (const proj of CANONICAL_PROJECTIONS) {
      totalSlots += 1;
      const entry = cap.projections[proj];
      const isAvailable = Boolean(entry && entry.available);
      projectionStates[proj] = {
        available: isAvailable,
        target: entry?.target || "missing",
      };

      if (isAvailable) {
        satisfiedSlots += 1;
        available.push(proj);
      } else {
        missing.push(proj);
      }
    }

    const symmetryScore = Math.round((available.length / CANONICAL_PROJECTIONS.length) * 100);

    results.push({
      name: cap.name,
      category: cap.category,
      description: cap.description,
      symmetryScore,
      isFullySymmetric: symmetryScore === 100,
      availableProjections: available,
      missingProjections: missing,
      projections: projectionStates,
    });
  }

  const overallScore = totalSlots > 0 ? Math.round((satisfiedSlots / totalSlots) * 100) : 100;
  const fullySymmetricCount = results.filter((r) => r.isFullySymmetric).length;

  return {
    ok: true,
    protocol: "cogentia.capability_symmetry.v1",
    timestamp: new Date().toISOString(),
    overallSymmetryScore: overallScore,
    totalCapabilities: results.length,
    fullySymmetricCount,
    canonicalProjections: CANONICAL_PROJECTIONS,
    capabilities: results,
    recommendations: results
      .filter((r) => !r.isFullySymmetric)
      .map((r) => ({
        capability: r.name,
        missing: r.missingProjections,
        action: `Add ${r.missingProjections.join(", ")} projection for '${r.name}'`,
      })),
  };
}

/**
 * Renders a human-readable Capability Symmetry scorecard.
 */
export function renderSymmetryScorecardHuman(auditResult) {
  const lines = [];
  lines.push("===============================================================================");
  lines.push(`  COGENTIA CAPABILITY SYMMETRY SCORECARD (Score: ${auditResult.overallSymmetryScore}%)`);
  lines.push("===============================================================================");
  lines.push(`Total Capabilities: ${auditResult.totalCapabilities} | Fully Symmetric (100%): ${auditResult.fullySymmetricCount}`);
  lines.push("");

  for (const cap of auditResult.capabilities) {
    const badge = cap.isFullySymmetric ? "[SYMMETRIC 100%]" : `[PARTIAL ${cap.symmetryScore}%]`;
    lines.push(`* ${cap.name.padEnd(20)} ${badge.padEnd(18)} (${cap.category})`);
    lines.push(`    CLI: ${cap.projections.human_cli.available ? "✔ " + cap.projections.human_cli.target : "✖ missing"}`);
    lines.push(`    Web: ${cap.projections.human_web_ux.available ? "✔ " + cap.projections.human_web_ux.target : "✖ missing"}`);
    lines.push(`    MCP: ${cap.projections.machine_mcp.available ? "✔ " + cap.projections.machine_mcp.target : "✖ missing"}`);
    lines.push(`    API: ${cap.projections.machine_api_v1.available ? "✔ " + cap.projections.machine_api_v1.target : "✖ missing"}`);
    lines.push(`    COP: ${cap.projections.cop_packet.available ? "✔ " + cap.projections.cop_packet.target : "✖ missing"}`);
    lines.push("");
  }

  if (auditResult.recommendations.length) {
    lines.push("--- Actionable Symmetry Gaps ---");
    for (const rec of auditResult.recommendations) {
      lines.push(`  -> ${rec.action}`);
    }
  }

  return lines.join("\n");
}
