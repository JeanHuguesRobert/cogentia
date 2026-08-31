/**
 * Live capability inventory: CLI, daemon, MCP tools/resources, skills, patterns, COP.
 * Source of truth for Capability Symmetry (#110) and S13.3 parity checks.
 */
import { TOOLS, MUTATE_TOOLS, PRIVATE_READ_TOOLS } from "./cogentia-mcp-core.js";
import { REGISTRY_TOOLS } from "./cogentia-mcp-registries.js";
import { listAgentSkills } from "./cogentia-agent-skills.js";
import { listPatterns } from "./cogentia-patterns.js";
import { listMcpPrompts, listAllResources } from "./cogentia-mcp-surface.js";

/**
 * Stabilized CLI verbs. Each must have an MCP tool and/or resource projection.
 * Write verbs may be catalog-only on the anonymous surface.
 */
export const CLI_COMMANDS = [
  { verb: "agent start", mcp_tool: "cogentia_agent_start", daemon: "/api/agent/start", risk: "read" },
  { verb: "agent health", mcp_tool: "cogentia_agent_health", daemon: "/api/agent/health", risk: "read" },
  { verb: "agent mandates plan", mcp_resource: "cogentia://cli/catalog", risk: "read" },
  { verb: "agent mandates apply", mcp_resource: "cogentia://cli/catalog", risk: "write" },
  { verb: "agent mandates verify", mcp_resource: "cogentia://cli/catalog", risk: "read" },
  { verb: "agent public-readonly verify", mcp_resource: "cogentia://cli/catalog", risk: "read" },
  { verb: "corpus plan", mcp_resource: "cogentia://cli/catalog", risk: "read" },
  { verb: "corpus apply", mcp_resource: "cogentia://cli/catalog", risk: "write" },
  { verb: "corpus verify", mcp_resource: "cogentia://cli/catalog", risk: "read" },
  { verb: "corpus privacy", mcp_tool: "cogentia_corpus_privacy", daemon: "/api/cli/corpus/privacy", risk: "read" },
  { verb: "consolidate", mcp_tool: "cogentia_consolidate", daemon: "/api/cli/corpus/consolidate", risk: "read" },
  { verb: "classify plan", mcp_resource: "cogentia://cli/catalog", risk: "read" },
  { verb: "classify apply", mcp_resource: "cogentia://cli/catalog", risk: "write" },
  { verb: "classify verify", mcp_resource: "cogentia://cli/catalog", risk: "read" },
  { verb: "classify explain", mcp_resource: "cogentia://cli/catalog", risk: "read" },
  { verb: "frontmatter schema", mcp_resource: "cogentia://cli/catalog", risk: "read" },
  { verb: "status", mcp_tool: "cogentia_status", daemon: "/api/status", risk: "read" },
  { verb: "grep", mcp_tool: "cogentia_grep", daemon: "/api/cli/grep", risk: "read" },
  { verb: "ask", mcp_tool: "cogentia_john_run", risk: "read" },
  { verb: "config hygiene-audit", mcp_tool: "cogentia_config_hygiene_audit", daemon: "/api/cli/config/hygiene-audit", risk: "private_read" },
  { verb: "docs summary", mcp_tool: "cogentia_docs_summary", daemon: "/api/cli/docs/summary", risk: "read" },
  { verb: "docs query", mcp_tool: "cogentia_docs_query", daemon: "/api/cli/docs/query", risk: "read" },
  { verb: "docs search", mcp_tool: "cogentia_search", daemon: "/api/context/search", risk: "read" },
  { verb: "docs gaps", mcp_tool: "cogentia_docs_gaps", daemon: "/api/cli/docs/gaps", risk: "read" },
  { verb: "docs inspect", mcp_tool: "cogentia_docs_inspect", daemon: "/api/cli/docs/inspect", risk: "read" },
  { verb: "docs trails", mcp_resource: "cogentia://cli/catalog", risk: "read" },
  { verb: "docs judgments", mcp_resource: "cogentia://cli/catalog", risk: "read" },
  { verb: "concepts list", mcp_tool: "cogentia_concepts_list", daemon: "/api/cli/concepts/list", risk: "read" },
  { verb: "concepts check", mcp_tool: "cogentia_concepts_check", daemon: "/api/cli/concepts/check", risk: "read" },
  { verb: "concepts graph", mcp_tool: "cogentia_concepts_graph", daemon: "/api/cli/concepts/graph", risk: "read" },
  { verb: "concepts status", mcp_tool: "cogentia_concepts_status", daemon: "/api/cli/concepts/status", risk: "read" },
  { verb: "concepts ref", mcp_tool: "cogentia_concepts_ref", daemon: "/api/cli/concepts/ref", risk: "read" },
  { verb: "concepts init", mcp_tool: "cogentia_concepts_init", daemon: "/api/ops/concepts/init", risk: "write" },
  { verb: "concepts scan-issues", mcp_resource: "cogentia://cli/catalog", risk: "read" },
  { verb: "views snapshot", mcp_tool: "cogentia_views_snapshot", daemon: "/api/views/snapshot", risk: "read" },
  { verb: "index status", mcp_tool: "cogentia_index_status", daemon: "/api/index/status", risk: "read" },
  { verb: "index search", mcp_tool: "cogentia_index_search", daemon: "/api/index/search", risk: "read" },
  { verb: "index rebuild", mcp_resource: "cogentia://cli/catalog", risk: "write" },
  { verb: "index update", mcp_resource: "cogentia://cli/catalog", risk: "write" },
  { verb: "embeddings status", mcp_tool: "cogentia_embeddings_status", daemon: "/api/cli/embeddings/status", risk: "read" },
  { verb: "git verify", mcp_tool: "cogentia_git_verify", daemon: "/api/cli/git/verify", risk: "read" },
  { verb: "continuation list", mcp_tool: "cogentia_continuation_list", daemon: "/api/cli/continuation/list", risk: "read" },
  { verb: "continuation inspect", mcp_tool: "cogentia_continuation_inspect", daemon: "/api/cli/continuation/inspect", risk: "read" },
  { verb: "continuation schema", mcp_tool: "cogentia_continuation_schema", daemon: "/api/cli/continuation/schema", risk: "read" },
  { verb: "continuation emit", mcp_tool: "cogentia_continuation_emit", daemon: "/api/ops/continuations/emit", risk: "write" },
  { verb: "continuation resolve", mcp_tool: "cogentia_continuation_resolve", daemon: "/api/ops/continuations/resolve", risk: "write" },
  { verb: "john run", mcp_tool: "cogentia_john_run", risk: "read" },
  { verb: "orient", mcp_tool: "cogentia_orient", daemon: "/api/context/orient", risk: "read" },
  { verb: "orient-benchmark", mcp_tool: "cogentia_orient_benchmark", daemon: "/api/ops/orient-benchmark", risk: "read" },
  { verb: "sleep-cycle", mcp_resource: "cogentia://cli/catalog", daemon: "/api/cli/sleep-cycle", risk: "read" },
];

export const LEGACY_SYMMETRY_CAPABILITIES = [
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
      human_cli: { available: true, target: "docs search / grep" },
      human_web_ux: { available: true, target: "https://jhn.baronsmariani.org / Guide UI" },
      machine_mcp: { available: true, target: "cogentia_search / cogentia_grep" },
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
      human_cli: { available: true, target: "continuation list / inspect / resolve" },
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
  {
    name: "operium.calendar.list",
    category: "ops",
    description: "FractaCalendar projection of temporal obligations (read-only; not an executor)",
    projections: {
      human_cli: { available: true, target: "operium calendar list / operium node calendar" },
      human_web_ux: { available: true, target: "La Nasa node pack (mesh/auth); public /ops/console stays empty of node calendar" },
      machine_mcp: { available: true, target: "operium_calendar_list (private-read / JHN)" },
      machine_api_v1: { available: true, target: "GET /node/calendar and GET /ops/node/:id/calendar" },
      cop_packet: { available: true, target: "cop/node.query.v1 query=calendar" },
    },
  },
];

function mcpProjection(toolName, resourceUri) {
  if (toolName) return { available: true, target: toolName };
  if (resourceUri) return { available: true, target: resourceUri };
  return { available: false, target: "missing" };
}

function rowToCapability(row) {
  const mcp = mcpProjection(row.mcp_tool, row.mcp_resource);
  const web = row.risk === "write"
    ? { available: false, target: "governed mutate; not anonymous web" }
    : { available: true, target: "Guide / daemon HTTP used by web surfaces" };
  return {
    name: `cli.${row.verb.replace(/\s+/g, ".")}`,
    category: row.risk === "write" ? "mutate" : "cli",
    description: `CLI verb: ${row.verb}`,
    projections: {
      human_cli: { available: true, target: row.verb },
      human_web_ux: web,
      machine_mcp: mcp,
      machine_api_v1: row.daemon
        ? { available: true, target: row.daemon }
        : { available: mcp.available, target: mcp.target },
      cop_packet: { available: true, target: "packet-shaped MCP result / continuation" },
    },
  };
}

export function buildCapabilityInventory(options = {}) {
  const skills = listAgentSkills(options);
  const patterns = listPatterns(options);
  const prompts = listMcpPrompts(options);
  const resources = listAllResources(options);
  const mcpTools = [
    ...TOOLS.map((t) => t.name),
    ...REGISTRY_TOOLS.map((t) => t.name),
  ];

  const skillCaps = (skills.skills || []).map((s) => ({
    name: `skill.${s.slug}`,
    category: "skill",
    description: s.description || s.name,
    projections: {
      human_cli: { available: true, target: `skills/${s.slug}/SKILL.md` },
      human_web_ux: { available: true, target: "readable markdown" },
      machine_mcp: { available: true, target: `cogentia_skill_get / skill://cogentia/${s.slug}/SKILL.md` },
      machine_api_v1: { available: true, target: "skills/list + resources/read" },
      cop_packet: { available: true, target: "method package; no mandate" },
    },
  }));

  const patternCaps = (patterns.patterns || []).map((p) => ({
    name: `${p.kind}.${p.slug}`,
    category: p.kind,
    description: p.description || p.title,
    projections: {
      human_cli: { available: true, target: p.path },
      human_web_ux: { available: true, target: "readable markdown" },
      machine_mcp: { available: true, target: `cogentia_pattern_get / cogentia://pattern/${p.slug}/PATTERN.md` },
      machine_api_v1: { available: true, target: "resources/read" },
      cop_packet: { available: true, target: "generative guidance; no mandate" },
    },
  }));

  const cliCaps = CLI_COMMANDS.map(rowToCapability);

  return {
    ok: true,
    protocol: "cogentia.capability_inventory/v1",
    generated_at: new Date().toISOString(),
    mcp_tools: mcpTools.sort(),
    mcp_tool_count: mcpTools.length,
    mutate_tools: [...MUTATE_TOOLS],
    private_read_tools: [...PRIVATE_READ_TOOLS],
    mcp_resources: resources.map((r) => r.uri),
    skills: skills.skills || [],
    patterns: patterns.patterns || [],
    prompts: prompts.map((p) => p.name),
    cli_commands: CLI_COMMANDS,
    capabilities: [
      ...LEGACY_SYMMETRY_CAPABILITIES,
      ...cliCaps,
      ...skillCaps,
      ...patternCaps,
    ],
  };
}

export function assertCliMcpCoverage(inventory = buildCapabilityInventory()) {
  const missing = [];
  for (const row of inventory.cli_commands) {
    if (!row.mcp_tool && !row.mcp_resource) {
      missing.push(row.verb);
      continue;
    }
    if (row.mcp_tool && !inventory.mcp_tools.includes(row.mcp_tool)) {
      missing.push(`${row.verb} (tool ${row.mcp_tool} not registered)`);
    }
  }
  return { ok: missing.length === 0, missing };
}
