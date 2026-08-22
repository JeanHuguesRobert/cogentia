import { listAgentSkills, getAgentSkill, exportSkillAsMethodPackage, resolveRepoRoot } from "./cogentia-agent-skills.js";
import {
  extractCorrelation,
  wrapToolResult,
  wrapToolError,
  ENVELOPE_KIND,
} from "./cogentia-mcp-envelope.js";
import { resolveCallerAuth, deriveLockers } from "./cogentia-mcp-auth.js";
import { compareMandateAttenuation } from "./mandate-attenuation.js";
import { runJohnRequest } from "./john-run.js";
import { auditCapabilitySymmetry } from "./symmetry-audit.js";
import { listPatterns, getPattern } from "./cogentia-patterns.js";
import {
  serverCapabilityBlock,
  LIST_TTL_MS,
  listAllResources,
  readMcpResource,
  readDirectoryResource,
  listMcpPrompts,
  getMcpPrompt,
  listSkillsSep2640,
  getSkillSep2640,
  completeMcp,
} from "./cogentia-mcp-surface.js";

export const SERVER_NAME = "cogentia-mcp";
export const SERVER_VERSION = "0.9.0";
export { ENVELOPE_KIND, wrapToolResult, wrapToolError, extractCorrelation };
export { resolveCallerAuth, deriveLockers } from "./cogentia-mcp-auth.js";

/** Default negotiated version for legacy initialize when client omits one. */
export const PROTOCOL_VERSION = "2025-11-25";
/** Modern (stateless) era introduced by the 2026-07-28 MCP revision. */
export const PROTOCOL_VERSION_MODERN = "2026-07-28";
/** Dual-era: modern + legacy handshake revisions we still answer. */
export const SUPPORTED_PROTOCOLS = new Set([
  PROTOCOL_VERSION_MODERN,
  PROTOCOL_VERSION,
  "2025-06-18",
  "2024-11-05",
]);
export const LEGACY_PROTOCOLS = new Set([PROTOCOL_VERSION, "2025-06-18", "2024-11-05"]);
export const MODERN_PROTOCOLS = new Set([PROTOCOL_VERSION_MODERN]);

export const MCP_META = {
  protocolVersion: "io.modelcontextprotocol/protocolVersion",
  clientInfo: "io.modelcontextprotocol/clientInfo",
  clientCapabilities: "io.modelcontextprotocol/clientCapabilities",
  serverInfo: "io.modelcontextprotocol/serverInfo",
};

/** JSON-RPC error code for UnsupportedProtocolVersionError (MCP 2026-07-28). */
export const ERR_UNSUPPORTED_PROTOCOL_VERSION = -32022;

/** Tools that write continuations/issues — require full view + COGENTIA_MCP_ALLOW_MUTATE=1. */
export const MUTATE_TOOLS = new Set([
  "cogentia_continuation_resolve",
  "cogentia_continuation_emit",
  "cogentia_issues_sync",
  "cogentia_concepts_init",
]);

/**
 * Read-only tools whose key names and metadata are still operationally
 * sensitive. They are available to an administrator or to an attested JHN
 * agent, never to the anonymous public catalogue.
 */
export const PRIVATE_READ_TOOLS = new Set([
  "cogentia_config_hygiene_audit",
]);

export const TOOLS = [
  {
    name: "cogentia_agent_start",
    description:
      "Cold-start bootstrap for agents: read-only session summary (repos, gaps, privacy signals, active continuations, recommended next actions, MCP playbook). Prefer with or just after views_snapshot. Does not write the corpus.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_skill_list",
    description:
      "List portable Agent Skills (method packages) available from this Cogentia deployment. Skills recommend procedures; they do not grant mandate. Use skill_get for full SKILL.md body.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_skill_get",
    description:
      "Fetch one Agent Skill by id or slug (e.g. continuation-handling or cogentia.continuation-handling). Returns metadata and markdown body so clients without a git checkout can learn the method.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          description: "Skill slug or cogentia.<slug> id",
        },
        meta_only: {
          type: "boolean",
          description: "If true, omit markdown body (metadata only).",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_skill_export",
    description:
      "Export an Agent Skill as a self-contained portable Method Package JSON (issue #82). Includes metadata, required capabilities, source paths, and markdown body.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          description: "Skill slug or cogentia.<slug> id",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_continuation_schema",
    description:
      "Return the cogentia.continuation.v2 operational schema (fields, liveness, CLI/MCP commands). Use before preparing a step_result.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_docs_inspect",
    description:
      "Inspect one corpus document by repo:path or repo/path.md (public metadata only). Use after search/pack to understand a document before citing or editing.",
    inputSchema: {
      type: "object",
      properties: {
        ref: {
          type: "string",
          minLength: 1,
          description: "Document reference, e.g. cogentia/research/cognitive_packets.md",
        },
      },
      required: ["ref"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_docs_gaps",
    description:
      "List documents not referenced by their repo research/index.md (navigation gaps). Read-only publish-readiness signal.",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name or 'all' (default all)" },
        limit: { type: "integer", minimum: 1, maximum: 500, description: "Max gaps to return (default 100)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_corpus_privacy",
    description:
      "Read-only privacy check: public views that may leak private/confidential material. Returns codes and paths, not secret bodies.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_config_hygiene_audit",
    description:
      "Run the read-only configuration-cache hygiene audit for one configured Digital Twin instance. Returns statuses and Vault metadata only; never configuration values or secret-derived fingerprints. Requires full access or attested Agent JHN.",
    inputSchema: {
      type: "object",
      properties: {
        instance: {
          type: "string",
          enum: ["jhn"],
          description: "Configured Digital Twin instance id (currently jhn).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_consolidate",
    description:
      "Read-only publish-readiness consolidate report (gaps, privacy, active continuations). Default quick mode for MCP; not the weekly write pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        full: {
          type: "boolean",
          description: "If true, run full audit including git/worktree (slower). Default false (quick).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_embeddings_status",
    description:
      "Read-only embedding cache status (built, count, model, dimensions, providers). Does not index, store, or call providers.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_mandate_attenuation_check",
    description:
      "Compare parent vs child mandate/constraint envelopes for monotonic attenuation (#79). Returns PASS/WARN/FAIL per dimension. Read-only; does not grant authority. Use before subagent spawn or nested resolve.",
    inputSchema: {
      type: "object",
      properties: {
        parent: {
          type: "object",
          description: "Parent constraint envelope (effects, repos, budget, …)",
          additionalProperties: true,
        },
        child: {
          type: "object",
          description: "Child constraint envelope (must not widen parent)",
          additionalProperties: true,
        },
      },
      required: ["parent", "child"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_views_snapshot",
    description:
      "Session bootstrap / agent cockpit: compact situational picture (corpus health signals, alive continuations, open issues summary, key Views Store URLs). Prefer this first. Does not dump SQLite vectors or chunk bodies. Implementation lives in cogentia.js.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 40,
          description: "Max alive continuations to list (default 12).",
        },
        include_remote: {
          type: "boolean",
          description: "If true, probe Supabase inventory (slower; needs credentials on daemon host).",
        },
        no_store_probe: {
          type: "boolean",
          description: "If true, skip HTTP probe of the public Views Store API.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_search",
    description: "Explore the Cogentia corpus with short, citable search results.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1 },
        repo: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
        mode: { type: "string", enum: ["keyword", "hybrid", "semantic"] },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_context_pack",
    description: "Build a deterministic, budgeted context pack for a broad corpus question.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1 },
        repo: { type: "string" },
        budget: { type: "integer", minimum: 256, maximum: 50000 },
        limit: { type: "integer", minimum: 1, maximum: 50 },
        format: { type: "string", enum: ["json", "markdown"] },
        mode: { type: "string", enum: ["keyword", "hybrid", "semantic"] },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_context_pack_batch",
    description: "Build deterministic, budgeted context packs for multiple corpus queries in one read-only batch.",
    inputSchema: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: { type: "string", minLength: 1 },
        },
        repo: { type: "string" },
        budget: { type: "integer", minimum: 256, maximum: 50000 },
        limit: { type: "integer", minimum: 1, maximum: 50 },
        mode: { type: "string", enum: ["keyword", "hybrid", "semantic"] },
      },
      required: ["queries"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_get_lines",
    description: "Retrieve a bounded, citable line interval from an allowed corpus document.",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string", minLength: 1, description: "Document reference in repo:path form." },
        start: { type: "integer", minimum: 1 },
        end: { type: "integer", minimum: 1 },
      },
      required: ["ref", "start", "end"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_explain",
    description: "Explain the deterministic retrieval signals for a Cogentia result.",
    inputSchema: {
      type: "object",
      properties: { result_id: { type: "string", minLength: 1 } },
      required: ["result_id"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_health",
    description: "Check whether the public Cogentia Context Gateway and its index are available.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_issue_graph",
    description: "Build a read-only graph of issues and their target documents.",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string" },
        state: { type: "string", enum: ["open", "closed", "all"] },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_guide_resolve",
    description:
      "3-Layer S7 Navigation Engine: Resolves concept queries via 1-hop canonical alias lookup, hard admissibility pre-filter, and Attractor Card similarity. Guaranteed zero-drift 1-hop resolution.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1, description: "Concept query (e.g. 'Potentics', 'Channel Fragmentation', 'ERP')" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_locate",
    description:
      "Resolve a subject to concrete corpus locations by composing guide routing, the concept registry, and full-text search (v3 module corpus.locate, #80/#108). Returns candidate repo/path targets with the authority (canonical_candidate, concept_registry_definition, lexical_match, ...) and reasons behind each.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", minLength: 1, description: "Subject to locate, e.g. a concept name or free-text topic" },
        intent: { type: "string", description: "Optional caller intent label, echoed back in the result" },
      },
      required: ["subject"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_concepts_list",
    description: "List the typed concept registry (research/concepts.md) for one repo or all repos. Read-only, view-filtered (v3 module concepts.list, #80/#108).",
    inputSchema: {
      type: "object",
      properties: { repo: { type: "string", description: "Repository name, or 'all' (default)" } },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_concepts_check",
    description: "Check the concept registry for warnings (duplicate/ambiguous definitions, missing fields). Read-only, view-filtered (v3 module concepts.check).",
    inputSchema: {
      type: "object",
      properties: { repo: { type: "string", description: "Repository name, or 'all' (default)" } },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_concepts_graph",
    description: "Mermaid concept graph for one repo or all repos. Read-only, view-filtered (v3 module concepts.graph).",
    inputSchema: {
      type: "object",
      properties: { repo: { type: "string", description: "Repository name, or 'all' (default)" } },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_concepts_status",
    description: "Per-concept status/warnings table for one repo or all repos. Read-only, view-filtered (v3 module concepts.status).",
    inputSchema: {
      type: "object",
      properties: { repo: { type: "string", description: "Repository name, or 'all' (default)" } },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_concepts_init",
    description:
      "Bootstrap empty research/index.md and research/concepts.md skeletons for one repo, if missing (mechanical only -- no-op if the files already exist; never rewrites content). First write capability extended to authorized MCP callers (v3 module concepts.init, #80/#108). Requires mutate access.",
    inputSchema: {
      type: "object",
      properties: { repo: { type: "string", minLength: 1, description: "Repository name to initialize" } },
      required: ["repo"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_concepts_ref",
    description: "Resolve a concept name to its canonical file (research/concepts.md of the defining repo). Read-only, view-filtered (v3 module concepts.ref).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, description: "Concept name to resolve" },
        repo: { type: "string", description: "Optional repository scope (default all)" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_git_verify",
    description: "Check ahead/behind and dirty state across all 10 monorepo repositories.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_emit_static",
    description: "Generate or verify the llms.txt static projection artifact across all 10 repositories.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_publish_registry",
    description: "Publish or verify the versioned registry.json authoritative artifact.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_nav_benchmark",
    description: "Execute the S6 navigation benchmark suite over seed queries.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_continuation_list",
    description: "List active or alive continuation decision packets across the corpus registry.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["alive", "hibernating", "closed", "active", "resolved", "cancelled", "dormant", "all"] },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_issues_list",
    description: "List GitHub issues for a registered repository.",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string" },
        state: { type: "string", enum: ["open", "closed", "all"] },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_continuation_inspect",
    description: "Inspect full state, context, and question for a specific continuation ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1, description: "Continuation ID to inspect" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_continuation_resolve",
    description:
      "Resolve or resume an active continuation. Note: When a Cogentia tool emits a continuation, it is up to the tool user / client agent to decide and act upon that continuation.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1, description: "Continuation ID to resolve" },
        decision: { type: "string", minLength: 1, description: "Decision text or JSON resolution payload" },
        reason: { type: "string", description: "Rationale for the decision" },
      },
      required: ["id", "decision"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_continuation_emit",
    description: "Emit a new external judgment request / continuation packet.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", minLength: 1, description: "Decision question or request text" },
        subject: { type: "string", description: "Subject topic or component ID" },
        kind: { type: "string", description: "Continuation kind (e.g. decision, approval, judgment)" },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_issues_sync",
    description: "Synchronize GitHub issue packets locally under .cogentia/issues.",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Target repository name or 'all'" },
        state: { type: "string", enum: ["open", "closed", "all"] },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_consolidate_weekly",
    description: "Run Sunday Corpus Consolidation pipeline: audit index, triage continuations, emit llms.txt projections, and generate Weekly Sprint Digest.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_john_run",
    description:
      "Execute a portable COP-governed agent request via John (issue #112). Admits the request as an authoritative Cognitive Packet under mandate and execution budget boundaries, routes to the specified handler, and returns the canonical yield, accounting, and Odyssey trace.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", minLength: 1, description: "Input prompt or instruction." },
        capability: { type: "string", description: "Target capability name (default: john.converse)." },
        principal_id: { type: "string", description: "Principal identity id (e.g. principal:operator or jhn)." },
        mandate_id: { type: "string", description: "Mandate authorizing execution." },
        mandate_version: { type: "string", description: "Mandate version (default: 1)." },
        budget_id: { type: "string", description: "Budget reservation id." },
        exposure: { type: "string", enum: ["none", "read_only", "bounded", "consequential"], description: "Exposure level." },
        max_steps: { type: "integer", minimum: 1, maximum: 1000, description: "Max reasoner steps." },
        max_tool_calls: { type: "integer", minimum: 0, maximum: 100, description: "Max tool/capability calls." },
        max_elapsed_ms: { type: "integer", minimum: 100, maximum: 60000, description: "Max elapsed time in ms." },
        handler: {
          type: "object",
          description: "Handler specification (id, kind, options). Defaults to mock.echo if omitted.",
        },
        ithaca: {
          type: "object",
          description: "Optional custom Ithaca return target.",
        },
        request: {
          type: "object",
          description: "Complete raw john.request.v1 object (alternative to individual fields).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_symmetry_audit",
    description:
      "Audit Capability Symmetry across Human projections (CLI, Web UX) and Machine projections (MCP, API /v1, COP Cognitive Packet) per Issue #110 and Corpus Axioms.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_status",
    description: "Lightweight daemon status (/api/status).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_state",
    description: "Corpus workspace state snapshot (/api/state).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_repos",
    description: "List registered corpus repositories and their state (/api/repos).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_plugins",
    description: "List daemon plugins and their HTTP routes (/api/plugins).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_agent_health",
    description: "Agent gateway / AI router health (/api/agent/health).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_cli_status",
    description: "Unified CLI status view (/api/cli/status).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_cli_state",
    description: "Unified CLI state view (/api/cli/state).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_grep",
    description: "Full-text grep over active corpus markdown (/api/cli/grep).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1 },
        repo: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_docs_summary",
    description: "Numeric documentation inventory summary (/api/cli/docs/summary).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_docs_query",
    description: "Query the documentation catalog (/api/cli/docs/query).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        repo: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_docs_snippet",
    description: "Fetch a documentation snippet by ref (/api/cli/docs/snippet).",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string", minLength: 1 },
        start: { type: "integer", minimum: 1 },
        end: { type: "integer", minimum: 1 },
      },
      required: ["ref"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_get_doc",
    description: "Retrieve metadata / allowed view of a corpus document (/api/context/doc). ref form: repo:path.",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string", minLength: 1, description: "Document reference repo:path" },
      },
      required: ["ref"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_index_status",
    description: "Local SQLite/FTS index status (/api/index/status).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_index_search",
    description: "Raw FTS index search (/api/index/search). Prefer cogentia_search for citable results.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1 },
        repo: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_pattern_list",
    description:
      "List Cogentia Patterns and Anti-patterns (Christopher Alexander sense, issue #110). Patterns guide generation; they do not grant mandate.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cogentia_pattern_get",
    description: "Fetch one Pattern or Anti-pattern by id/slug (PATTERN.md body + metadata).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1, description: "Pattern slug or id" },
        meta_only: { type: "boolean" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "cogentia_cli_catalog",
    description: "Return the live CLI/MCP/skill/pattern capability inventory (maximum visible set).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

async function resolveResourceRead(uri, env) {
  const read = readMcpResource(uri, { env });
  if (!read.ok) return read;
  if (read.deferred === "inventory") {
    const { buildCapabilityInventory, CLI_COMMANDS } = await import("./capability-inventory.js");
    const inventory = buildCapabilityInventory({ env });
    const payload = read.uri === "cogentia://cli/catalog"
      ? { ok: true, uri: read.uri, commands: CLI_COMMANDS }
      : inventory;
    return {
      ok: true,
      uri: read.uri,
      mimeType: "application/json",
      text: JSON.stringify(payload, null, 2),
    };
  }
  return read;
}

function parseAllowMutate(env, view) {
  if (view !== "full") return false;
  const raw = String(env.COGENTIA_MCP_ALLOW_MUTATE || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function createMcpCore(env = process.env) {
  const daemonUrl = validateDaemonUrl(env.COGENTIA_DAEMON_URL || "http://127.0.0.1:8790");
  // Phase 4 inventory-backed tools need headroom; Fracta Guide already uses 90s.
  const requestTimeoutMs = boundedInteger(env.COGENTIA_MCP_TIMEOUT_MS, 60000, 1000, 120000);
  const requestedView = String(env.COGENTIA_MCP_VIEW || "public").toLowerCase();
  const adminToken = String(env.COGENTIA_ADMIN_TOKEN || "");
  const view = requestedView === "full" && adminToken ? "full" : "public";
  const staticAllowMutate = parseAllowMutate(env, view);
  const jhnMutateConfigured =
    /^(1|true|yes)$/i.test(String(env.COGENTIA_MCP_JHN_MUTATE || "").trim()) &&
    Boolean(String(env.COGENTIA_MCP_JHN_TOKEN || "").trim());
  /** Default tool list (anonymous). Per-request list may include mutate for JHN. */
  const allowPrivateReadStatic = view === "full";
  const tools = TOOLS.filter((tool) =>
    (staticAllowMutate || !MUTATE_TOOLS.has(tool.name)) &&
    (allowPrivateReadStatic || !PRIVATE_READ_TOOLS.has(tool.name))
  );

  const instructions =
    "Playbook: (1) cogentia_agent_start and/or cogentia_views_snapshot — situation and load.mode_recommendation. " +
    "(2) cogentia_skill_list then cogentia_skill_get id=continuation-handling when work may suspend or resume. " +
    "(3) cogentia_context_pack or cogentia_search for evidence; cogentia_get_lines before asserting a passage; always cite source_id. " +
    "(4) cogentia_continuation_schema if preparing a step_result; list → inspect → prepare; resolve/emit only if mutate tools are listed and mandate allows. " +
    "Continuations are non-blocking judgment boundaries, not crashes. Skills recommend methods and never grant authority. " +
    "Discover the maximum capability set via server/discover, resources/list, skills/list (SEP-2640 experimental), and cogentia_cli_catalog / cogentia_pattern_list — not tools/list alone. " +
    "MCP is a thin dual-era adapter (legacy initialize + modern server/discover); corpus truth lives in cogentia.js / the daemon. " +
    "Tool results are packet-shaped (cogentia.mcp_tool_result/v1): read citations, continuation, skill_hint, error_class, correlation — no MCP session affinity required. " +
    "Agent JHN (or agent:jhn.subagent:*) may use mutate tools when the server enables JHN attestation " +
    "(Authorization Bearer + X-Cogentia-Actor / _meta cogentia.actor); anonymous public remains read-only. " +
    `Active view=${view}; mutate_static=${staticAllowMutate ? "on" : "off"}; jhn_mutate_configured=${jhnMutateConfigured ? "yes" : "no"}.`;

  function serverInfo() {
    return { name: SERVER_NAME, version: SERVER_VERSION };
  }

  function serverCapabilities() {
    return serverCapabilityBlock();
  }

  /** Legacy handshake path (2025-11-25 and earlier). */
  function initialize(params = {}) {
    const forced = String(env.COGENTIA_MCP_FORCE_PROTOCOL || "").trim();
    if (forced && SUPPORTED_PROTOCOLS.has(forced)) {
      return {
        protocolVersion: forced,
        capabilities: serverCapabilities(),
        serverInfo: serverInfo(),
        instructions,
      };
    }
    const requested = String(params.protocolVersion || "");
    let negotiated = PROTOCOL_VERSION;
    if (LEGACY_PROTOCOLS.has(requested)) negotiated = requested;
    else if (MODERN_PROTOCOLS.has(requested)) negotiated = requested;
    else if (SUPPORTED_PROTOCOLS.has(requested)) negotiated = requested;
    return {
      protocolVersion: negotiated,
      capabilities: serverCapabilities(),
      serverInfo: serverInfo(),
      instructions,
    };
  }

  /** Modern discovery (2026-07-28 server/discover). */
  function discover() {
    let experimental = {
      skills_over_mcp: "experimental",
      skills_delivery: "sep2640_and_tools_first",
      skills_extension: "io.modelcontextprotocol/skills",
      jhn_mutate: jhnMutateConfigured ? "token_attested" : "disabled",
      note: "SEP-2640 Skills Over MCP is experimental; tools-first skill_list/get remain for hosts without the extension (#82).",
    };
    try {
      const inv = listAgentSkills({ env, repoRoot: resolveRepoRoot(env) });
      experimental = {
        ...experimental,
        skills_count: inv.count,
        skill_ids: (inv.skills || []).map((s) => s.id),
      };
    } catch {
      experimental.skills_count = 0;
    }
    return {
      resultType: "complete",
      supportedVersions: [...SUPPORTED_PROTOCOLS],
      capabilities: serverCapabilities(),
      instructions,
      ttlMs: 3_600_000,
      cacheScope: "public",
      experimental,
      _meta: {
        [MCP_META.serverInfo]: serverInfo(),
        experimental,
      },
    };
  }

  function resolveRequestProtocol(message, transport = {}) {
    const paramsMeta = message?.params && typeof message.params === "object" ? message.params._meta : null;
    const topMeta = message && typeof message._meta === "object" ? message._meta : null;
    const meta = (paramsMeta && typeof paramsMeta === "object" ? paramsMeta : null)
      || (topMeta && typeof topMeta === "object" ? topMeta : null)
      || {};
    const fromMeta = String(meta[MCP_META.protocolVersion] || "").trim();
    const fromHeader = String(transport.protocolVersionHeader || "").trim();
    const method = String(message?.method || "");

    if (method === "initialize") {
      return {
        era: "legacy",
        protocolVersion: LEGACY_PROTOCOLS.has(String(message.params?.protocolVersion || ""))
          ? String(message.params.protocolVersion)
          : PROTOCOL_VERSION,
        meta,
      };
    }

    const requested = fromHeader || fromMeta;
    if (requested) {
      if (!SUPPORTED_PROTOCOLS.has(requested)) {
        return { era: "error", protocolVersion: requested, meta, unsupported: true };
      }
      return {
        era: MODERN_PROTOCOLS.has(requested) ? "modern" : "legacy",
        protocolVersion: requested,
        meta,
      };
    }

    if (method === "server/discover") {
      return { era: "modern", protocolVersion: PROTOCOL_VERSION_MODERN, meta };
    }

    return { era: "legacy", protocolVersion: PROTOCOL_VERSION, meta };
  }

  function attachModernMeta(result, protocolVersion) {
    if (!result || typeof result !== "object" || Array.isArray(result)) return result;
    const existing = result._meta && typeof result._meta === "object" ? result._meta : {};
    return {
      ...result,
      _meta: {
        ...existing,
        [MCP_META.protocolVersion]: protocolVersion,
        [MCP_META.serverInfo]: existing[MCP_META.serverInfo] || serverInfo(),
      },
    };
  }

  function toolsForAuth(auth) {
    const allow = auth?.allowMutate === true;
    const allowPrivateRead = view === "full" || auth?.auth === "jhn";
    return TOOLS.filter((tool) =>
      (allow || !MUTATE_TOOLS.has(tool.name)) &&
      (allowPrivateRead || !PRIVATE_READ_TOOLS.has(tool.name))
    );
  }

  function toolsListResult(era, auth) {
    const callerTools = toolsForAuth(auth).map((tool) => ({
      ...tool,
      annotations: {
        readOnlyHint: !MUTATE_TOOLS.has(tool.name),
        destructiveHint: MUTATE_TOOLS.has(tool.name),
        openWorldHint: false,
      },
    }));
    const base = {
      tools: callerTools,
      _cogentia: {
        view,
        allowMutate: auth?.allowMutate === true,
        auth: auth?.auth || "none",
        actor: auth?.actor || null,
        mutate_tools: [...MUTATE_TOOLS],
        private_read_tools: [...PRIVATE_READ_TOOLS],
        jhn_mutate_configured: jhnMutateConfigured,
        auth_reason: auth?.reason || null,
      },
    };
    if (era === "modern") {
      return { ...base, ttlMs: LIST_TTL_MS, cacheScope: view === "public" ? "public" : "private" };
    }
    return base;
  }

  function requireMutate(name, auth) {
    if (auth?.allowMutate) return;
    const err = new Error(
      `tier_forbidden: ${name} requires either (full view + admin + COGENTIA_MCP_ALLOW_MUTATE=1) ` +
        `or Agent JHN attestation (COGENTIA_MCP_JHN_MUTATE=1 + token + actor agent:jhn|agent:jhn.subagent:*). ` +
        `reason=${auth?.reason || "none"}`
    );
    err.error_class = "tier_forbidden";
    throw err;
  }

  function requirePrivateRead(name, auth) {
    if (view === "full" || auth?.auth === "jhn") return;
    const err = new Error(
      `tier_forbidden: ${name} requires full access or an attested Agent JHN caller. ` +
        `reason=${auth?.reason || "none"}`
    );
    err.error_class = "tier_forbidden";
    throw err;
  }

  function callerAuthFor(message, transport = {}) {
    const paramsMeta = message?.params && typeof message.params === "object" ? message.params._meta : null;
    const topMeta = message && typeof message._meta === "object" ? message._meta : null;
    const meta = (paramsMeta && typeof paramsMeta === "object" ? paramsMeta : null)
      || (topMeta && typeof topMeta === "object" ? topMeta : null)
      || {};
    return resolveCallerAuth(env, {
      meta,
      headers: transport.headers || {},
      view,
      staticAllowMutate,
    });
  }

  /**
   * @param {object} message
   * @param {{ protocolVersionHeader?: string, mcpMethod?: string, mcpName?: string, headers?: object }} [transport]
   */
  async function handleJsonRpc(message, transport = {}) {
    if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
      return jsonRpcError(message?.id ?? null, -32600, "Invalid Request");
    }
    if (message.id === undefined) return null;

    if (transport.mcpMethod) {
      const headerMethod = String(transport.mcpMethod).trim();
      if (headerMethod && headerMethod !== message.method) {
        return jsonRpcError(message.id, -32600, `Mcp-Method header (${headerMethod}) does not match body method (${message.method})`);
      }
    }
    if (transport.mcpName && message.method === "tools/call") {
      const headerName = String(transport.mcpName).trim();
      const bodyName = String(message.params?.name || "");
      if (headerName && bodyName && headerName !== bodyName) {
        return jsonRpcError(message.id, -32600, `Mcp-Name header (${headerName}) does not match tools/call name (${bodyName})`);
      }
    }

    const resolved = resolveRequestProtocol(message, transport);
    if (resolved.unsupported) {
      return unsupportedProtocolVersionError(message.id, resolved.protocolVersion);
    }

    const auth = callerAuthFor(message, transport);

    try {
      if (message.method === "initialize") {
        return jsonRpcResult(message.id, initialize(message.params || {}));
      }
      if (message.method === "server/discover") {
        const result = attachModernMeta(discover(), resolved.protocolVersion || PROTOCOL_VERSION_MODERN);
        return jsonRpcResult(message.id, result);
      }
      if (message.method === "ping") {
        const result = resolved.era === "modern" ? attachModernMeta({}, resolved.protocolVersion) : {};
        return jsonRpcResult(message.id, result);
      }
      if (message.method === "tools/list") {
        let result = toolsListResult(resolved.era, auth);
        if (resolved.era === "modern") result = attachModernMeta(result, resolved.protocolVersion);
        return jsonRpcResult(message.id, result);
      }
      if (message.method === "resources/list") {
        let result = {
          resources: listAllResources({ env }),
        };
        if (resolved.era === "modern") {
          result = { ...result, ttlMs: LIST_TTL_MS, cacheScope: view === "public" ? "public" : "private" };
          result = attachModernMeta(result, resolved.protocolVersion);
        }
        return jsonRpcResult(message.id, result);
      }
      if (message.method === "resources/read") {
        const uri = String(message.params?.uri || "");
        const read = await resolveResourceRead(uri, env);
        if (!read.ok) {
          return jsonRpcError(message.id, -32602, "Unknown resource", { uri, error: read.error });
        }
        let result = {
          contents: [
            {
              uri: read.uri || uri,
              mimeType: read.mimeType || "text/plain",
              text: read.text,
            },
          ],
        };
        if (resolved.era === "modern") result = attachModernMeta(result, resolved.protocolVersion);
        return jsonRpcResult(message.id, result);
      }
      if (message.method === "resources/directory/read") {
        const uri = String(message.params?.uri || "");
        const dir = readDirectoryResource(uri, { env });
        if (!dir.ok) {
          return jsonRpcError(message.id, -32602, "Unknown directory resource", { uri, error: dir.error });
        }
        let result = { resources: dir.resources };
        if (resolved.era === "modern") {
          result = { ...result, ttlMs: LIST_TTL_MS, cacheScope: view === "public" ? "public" : "private" };
          result = attachModernMeta(result, resolved.protocolVersion);
        }
        return jsonRpcResult(message.id, result);
      }
      if (message.method === "prompts/list") {
        let result = { prompts: listMcpPrompts({ env }) };
        if (resolved.era === "modern") {
          result = { ...result, ttlMs: LIST_TTL_MS, cacheScope: "public" };
          result = attachModernMeta(result, resolved.protocolVersion);
        }
        return jsonRpcResult(message.id, result);
      }
      if (message.method === "prompts/get") {
        const name = String(message.params?.name || "");
        const prompt = getMcpPrompt(name, { env });
        if (!prompt.ok) {
          return jsonRpcError(message.id, -32602, "Unknown prompt", { name, error: prompt.error });
        }
        const { ok: _ok, ...body } = prompt;
        let result = body;
        if (resolved.era === "modern") result = attachModernMeta(result, resolved.protocolVersion);
        return jsonRpcResult(message.id, result);
      }
      if (message.method === "completion/complete") {
        let result = completeMcp(message.params || {}, { env });
        if (resolved.era === "modern") result = attachModernMeta(result, resolved.protocolVersion);
        return jsonRpcResult(message.id, result);
      }
      if (message.method === "skills/list") {
        let result = listSkillsSep2640({ env });
        if (resolved.era === "modern") {
          result = { ...result, ttlMs: LIST_TTL_MS, cacheScope: "public" };
          result = attachModernMeta(result, resolved.protocolVersion);
        }
        return jsonRpcResult(message.id, result);
      }
      if (message.method === "skills/get") {
        const uri = String(message.params?.uri || "");
        const got = getSkillSep2640(uri, { env });
        if (!got.ok) {
          return jsonRpcError(message.id, -32602, "Unknown skill", { uri, error: got.error });
        }
        let result = { skill: got.skill };
        if (resolved.era === "modern") result = attachModernMeta(result, resolved.protocolVersion);
        return jsonRpcResult(message.id, result);
      }
      if (message.method === "tools/call") {
        const name = String(message.params?.name || "");
        const args = message.params?.arguments || {};
        const correlation = extractCorrelation(resolved.meta || {});
        const ctx = {
          protocolEra: resolved.era === "modern" ? "modern" : "legacy",
          view,
          allowMutate: auth.allowMutate,
          correlation,
        };
        try {
          const data = await callTool(name, args, { correlation, auth });
          const envelope = wrapToolResult(name, data, ctx);
          if (auth.auth === "jhn") {
            envelope.actor = auth.actor;
            envelope.mandate_hint = "resolve_under_mandate";
            envelope.auth = "jhn";
          }
          let result = mcpToolResult(envelope);
          if (resolved.era === "modern") {
            result = attachModernMeta(result, resolved.protocolVersion);
            if (correlation.traceparent) {
              result._meta = {
                ...result._meta,
                traceparent: correlation.traceparent,
                ...(correlation.tracestate ? { tracestate: correlation.tracestate } : {}),
              };
            }
          }
          return jsonRpcResult(message.id, result);
        } catch (toolError) {
          const envelope = wrapToolError(name, toolError, ctx);
          let result = {
            content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }],
            isError: true,
            structuredContent: envelope,
          };
          if (resolved.era === "modern") {
            result = attachModernMeta(result, resolved.protocolVersion);
          }
          return jsonRpcResult(message.id, result);
        }
      }
      return jsonRpcError(message.id, -32601, "Method not found");
    } catch (error) {
      return jsonRpcResult(message.id, {
        content: [{ type: "text", text: error.message }],
        isError: true,
      });
    }
  }

  async function callTool(name, args = {}, callOpts = {}) {
    const auth = callOpts.auth || (() => {
      const base = {
        allowMutate: staticAllowMutate,
        auth: view === "full" ? "admin" : "none",
        reason: view === "full" ? "admin_full_view" : "none",
      };
      return { ...base, lockers: deriveLockers(base) };
    })();
    if (MUTATE_TOOLS.has(name)) requireMutate(name, auth);
    if (PRIVATE_READ_TOOLS.has(name)) requirePrivateRead(name, auth);
    if (!TOOLS.some((t) => t.name === name)) {
      throw new Error(`Unknown tool: ${name}`);
    }
    switch (name) {
      case "cogentia_agent_start":
        return daemonGet("/api/agent/start", {});
      case "cogentia_skill_list":
        // Package-local skills (COGENTIA_REPO_ROOT or repo containing this package).
        return listAgentSkills({ env, repoRoot: resolveRepoRoot(env) });
      case "cogentia_skill_get": {
        requireString(args.id, "id");
        const skill = getAgentSkill(args.id, {
          env,
          repoRoot: resolveRepoRoot(env),
          includeBody: args.meta_only !== true,
        });
        if (!skill.ok) {
          const err = new Error(skill.error || "skill_not_found");
          err.error_class = skill.error || "skill_not_found";
          throw err;
        }
        return skill;
      }
      case "cogentia_skill_export": {
        requireString(args.id, "id");
        const pkg = exportSkillAsMethodPackage(args.id, {
          env,
          repoRoot: resolveRepoRoot(env),
        });
        if (!pkg.ok) {
          const err = new Error(pkg.error || "skill_not_found");
          err.error_class = pkg.error || "skill_not_found";
          throw err;
        }
        return pkg;
      }
      case "cogentia_continuation_schema":
        return daemonGet("/api/cli/continuation/schema", {});
      case "cogentia_docs_inspect":
        requireString(args.ref, "ref");
        return daemonGet("/api/cli/docs/inspect", { ref: args.ref });
      case "cogentia_docs_gaps":
        return daemonGet("/api/cli/docs/gaps", {
          repo: typeof args.repo === "string" ? args.repo : "all",
          limit: boundedOptional(args.limit, 1, 500) || 100,
        });
      case "cogentia_corpus_privacy":
        return daemonGet("/api/cli/corpus/privacy", {});
      case "cogentia_config_hygiene_audit":
        return daemonGet("/api/cli/config/hygiene-audit", {
          instance: enumOptional(args.instance, ["jhn"], "instance") || "jhn",
        }, { privateRead: auth?.auth === "jhn" });
      case "cogentia_consolidate":
        return daemonGet("/api/cli/corpus/consolidate", {
          full: args.full === true ? "1" : undefined,
        });
      case "cogentia_embeddings_status":
        return daemonGet("/api/cli/embeddings/status", {});
      case "cogentia_mandate_attenuation_check": {
        if (!args.parent || typeof args.parent !== "object") {
          throw new Error("parent must be an object");
        }
        if (!args.child || typeof args.child !== "object") {
          throw new Error("child must be an object");
        }
        return compareMandateAttenuation(args.parent, args.child);
      }
      case "cogentia_views_snapshot":
        return daemonGet("/api/views/snapshot", {
          limit: boundedOptional(args.limit, 1, 40),
          include_remote: args.include_remote === true ? "1" : undefined,
          no_store_probe: args.no_store_probe === true ? "1" : undefined,
        });
      case "cogentia_search":
        requireString(args.query, "query");
        return daemonGet("/api/context/search", {
          q: args.query,
          repo: args.repo,
          limit: boundedOptional(args.limit, 1, 50),
          mode: enumOptional(args.mode, ["keyword", "hybrid", "semantic"], "mode"),
        });
      case "cogentia_context_pack":
        requireString(args.query, "query");
        return daemonGet("/api/context/pack", {
          q: args.query,
          repo: args.repo,
          budget: boundedOptional(args.budget, 256, 50000),
          limit: boundedOptional(args.limit, 1, 50),
          format: enumOptional(args.format, ["json", "markdown"], "format"),
          mode: enumOptional(args.mode, ["keyword", "hybrid", "semantic"], "mode"),
        });
      case "cogentia_context_pack_batch":
        if (!Array.isArray(args.queries) || !args.queries.length) throw new Error("queries must be a non-empty array");
        return daemonPost("/api/context/pack-batch", {
          queries: args.queries,
          repo: args.repo,
          budget: boundedOptional(args.budget, 256, 50000),
          limit: boundedOptional(args.limit, 1, 50),
          mode: enumOptional(args.mode, ["keyword", "hybrid", "semantic"], "mode") || "hybrid",
        });
      case "cogentia_get_lines":
        requireString(args.ref, "ref");
        return daemonGet("/api/context/lines", {
          ref: args.ref,
          start: boundedRequired(args.start, 1, Number.MAX_SAFE_INTEGER, "start"),
          end: boundedRequired(args.end, 1, Number.MAX_SAFE_INTEGER, "end"),
        });
      case "cogentia_explain":
        requireString(args.result_id, "result_id");
        return daemonGet("/api/context/explain", { result_id: args.result_id });
      case "cogentia_health":
        return daemonGet("/api/context/health", { quick: "1" });
      case "cogentia_issue_graph":
        return daemonGet("/api/issues/graph", {
          repo: args.repo || "all",
          state: enumOptional(args.state, ["open", "closed", "all"], "state") || "open",
          limit: boundedOptional(args.limit, 1, 100) || 25,
        });
      case "cogentia_guide_resolve":
        requireString(args.query, "query");
        return daemonGet("/api/context/guide-resolve", { q: args.query });
      case "cogentia_locate":
        requireString(args.subject, "subject");
        return daemonGet("/api/context/locate", { subject: args.subject, intent: args.intent });
      case "cogentia_concepts_list":
        return daemonGet("/api/cli/concepts/list", { repo: args.repo || "all" });
      case "cogentia_concepts_check":
        return daemonGet("/api/cli/concepts/check", { repo: args.repo || "all" });
      case "cogentia_concepts_graph":
        return daemonGet("/api/cli/concepts/graph", { repo: args.repo || "all" });
      case "cogentia_concepts_status":
        return daemonGet("/api/cli/concepts/status", { repo: args.repo || "all" });
      case "cogentia_concepts_ref":
        requireString(args.name, "name");
        return daemonGet("/api/cli/concepts/ref", { name: args.name, repo: args.repo || "all" });
      case "cogentia_concepts_init":
        requireString(args.repo, "repo");
        return daemonPost("/api/ops/concepts/init", { repo: args.repo }, { auth: callOpts.auth });
      case "cogentia_emit_static":
        return daemonGet("/api/ops/emit-static", {});
      case "cogentia_publish_registry":
        return daemonGet("/api/ops/publish-registry", {});
      case "cogentia_nav_benchmark":
        return daemonGet("/api/ops/nav-benchmark", {});
      case "cogentia_git_verify":
        return daemonGet("/api/cli/git/verify", {});
      case "cogentia_continuation_list":
        return daemonGet("/api/cli/continuation/list", {
          status:
            enumOptional(
              args.status,
              ["alive", "hibernating", "closed", "active", "resolved", "cancelled", "dormant", "all"],
              "status"
            ) || "alive",
          kind: typeof args.kind === "string" ? args.kind : undefined,
        });
      case "cogentia_issues_list":
        return daemonGet("/api/issues/graph", {
          repo: args.repo || "all",
          state: enumOptional(args.state, ["open", "closed", "all"], "state") || "open",
        });
      case "cogentia_continuation_inspect":
        requireString(args.id, "id");
        return daemonGet("/api/cli/continuation/inspect", { id: args.id });
      case "cogentia_continuation_resolve":
        requireString(args.id, "id");
        requireString(args.decision, "decision");
        return daemonPost("/api/ops/continuations/resolve", {
          id: args.id,
          decision: args.decision,
          reason: args.reason || "",
          correlation: callOpts.correlation || undefined,
          actor: callOpts.auth?.actor || undefined,
          mandate_ref: callOpts.auth?.mandate_ref || undefined,
          auth: callOpts.auth?.auth || undefined,
        });
      case "cogentia_continuation_emit":
        requireString(args.question, "question");
        return daemonPost("/api/ops/continuations/emit", {
          question: args.question,
          subject: args.subject || "general",
          kind: args.kind || "decision",
          correlation: callOpts.correlation || undefined,
          actor: callOpts.auth?.actor || undefined,
          mandate_ref: callOpts.auth?.mandate_ref || undefined,
          auth: callOpts.auth?.auth || undefined,
        });
      case "cogentia_issues_sync":
        return daemonPost("/api/ops/issues/sync", {
          repo: args.repo || "all",
          state: enumOptional(args.state, ["open", "closed", "all"], "state") || "open",
          actor: callOpts.auth?.actor || undefined,
          auth: callOpts.auth?.auth || undefined,
        });
      case "cogentia_consolidate_weekly":
        return daemonGet("/api/ops/emit-static", {});
      case "cogentia_john_run": {
        let req = args.request;
        if (!req || typeof req !== "object") {
          const reqPrompt = String(args.prompt || args.input?.prompt || "").trim();
          if (!reqPrompt) {
            throw new Error("prompt is required for cogentia_john_run");
          }
          req = {
            version: "john.request.v1",
            request_id: args.request_id || `mcp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            principal: { id: args.principal_id || callOpts.auth?.actor || "principal:mcp-caller" },
            mandate: {
              id: args.mandate_id || (callOpts.auth?.mandate_ref || "mandate:mcp-caller"),
              version: args.mandate_version || "1",
            },
            budget: { id: args.budget_id || "budget:mcp" },
            execution_budget: {
              max_steps: boundedOptional(args.max_steps, 1, 1000) || 4,
              max_tool_calls: boundedOptional(args.max_tool_calls, 0, 100) || 2,
              max_subagents: 0,
              max_elapsed_ms: boundedOptional(args.max_elapsed_ms, 100, 60000) || 15000,
              max_external_effects: 0,
            },
            exposure: args.exposure || (auth.allowMutate ? "bounded" : "read_only"),
            capability: args.capability || "john.converse",
            input: { prompt: reqPrompt },
            handler: args.handler || { id: "mock.echo", kind: "mock" },
            ithaca: args.ithaca || undefined,
          };
        }
        const events = await runJohnRequest(req);
        const completed = events.find((e) => e.type === "john.run.completed");
        const failed = events.find((e) => e.type === "john.run.failed");
        const settled = events.find((e) => e.type === "john.accounting.settled");
        const admitted = events.find((e) => e.type === "john.packet.admitted");

        return {
          ok: Boolean(completed),
          request_id: req.request_id,
          packet_id: admitted?.data?.packet_id || null,
          status: completed ? "completed" : "failed",
          text: completed?.data?.result?.text || failed?.data?.text || "",
          yield: completed?.data?.result?.yield || null,
          accounting: settled?.data || null,
          odyssey: completed?.data?.result?.odyssey || failed?.data?.odyssey || null,
          events_count: events.length,
          events,
        };
      }
      case "cogentia_symmetry_audit": {
        const { buildCapabilityInventory } = await import("./capability-inventory.js");
        const live = buildCapabilityInventory({ env });
        return auditCapabilitySymmetry({ inventory: live.capabilities });
      }
      case "cogentia_status":
        return daemonGet("/api/status", {});
      case "cogentia_state":
        return daemonGet("/api/state", {});
      case "cogentia_repos":
        return daemonGet("/api/repos", {});
      case "cogentia_plugins":
        return daemonGet("/api/plugins", {});
      case "cogentia_agent_health":
        return daemonGet("/api/agent/health", {});
      case "cogentia_cli_status":
        return daemonGet("/api/cli/status", {});
      case "cogentia_cli_state":
        return daemonGet("/api/cli/state", {});
      case "cogentia_grep":
        requireString(args.query, "query");
        return daemonGet("/api/cli/grep", {
          q: args.query,
          query: args.query,
          repo: args.repo,
          limit: boundedOptional(args.limit, 1, 200),
        });
      case "cogentia_docs_summary":
        return daemonGet("/api/cli/docs/summary", {});
      case "cogentia_docs_query":
        return daemonGet("/api/cli/docs/query", {
          q: args.query,
          query: args.query,
          repo: args.repo,
          limit: boundedOptional(args.limit, 1, 200),
        });
      case "cogentia_docs_snippet":
        requireString(args.ref, "ref");
        return daemonGet("/api/cli/docs/snippet", {
          ref: args.ref,
          start: boundedOptional(args.start, 1, Number.MAX_SAFE_INTEGER),
          end: boundedOptional(args.end, 1, Number.MAX_SAFE_INTEGER),
        });
      case "cogentia_get_doc":
        requireString(args.ref, "ref");
        return daemonGet("/api/context/doc", { ref: args.ref });
      case "cogentia_index_status":
        return daemonGet("/api/index/status", {});
      case "cogentia_index_search":
        requireString(args.query, "query");
        return daemonGet("/api/index/search", {
          q: args.query,
          repo: args.repo,
          limit: boundedOptional(args.limit, 1, 100),
        });
      case "cogentia_pattern_list":
        return listPatterns({ env, repoRoot: resolveRepoRoot(env) });
      case "cogentia_pattern_get": {
        requireString(args.id, "id");
        const pattern = getPattern(args.id, {
          env,
          repoRoot: resolveRepoRoot(env),
          includeBody: args.meta_only !== true,
        });
        if (!pattern.ok) {
          const err = new Error(pattern.error || "pattern_not_found");
          err.error_class = pattern.error || "pattern_not_found";
          throw err;
        }
        return pattern;
      }
      case "cogentia_cli_catalog": {
        const { buildCapabilityInventory } = await import("./capability-inventory.js");
        return buildCapabilityInventory({ env });
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async function daemonGet(route, params, options = {}) {
    const url = new URL(route, daemonUrl);
    url.searchParams.set("view", view);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
    const headers = { Accept: "application/json, text/markdown" };
    if (view === "full") {
      headers.Authorization = `Bearer ${adminToken}`;
    } else {
      headers["X-Cogentia-Entry"] = "public";
    }
    if (options.privateRead === true) headers["X-Cogentia-Private-Read"] = "attested";
    let response;
    try {
      response = await fetch(url, { method: "GET", headers, redirect: "error", signal: AbortSignal.timeout(requestTimeoutMs) });
    } catch (error) {
      throw new Error(`Cogentia daemon unavailable at ${daemonUrl.origin}: ${error.message}`);
    }
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const detail = typeof body === "object" ? (body.message || body.error) : body;
      throw new Error(`Cogentia daemon returned HTTP ${response.status}: ${detail || "request failed"}`);
    }
    return body;
  }

  async function daemonPost(route, body, options = {}) {
    const url = new URL(route, daemonUrl);
    // Mirror daemonGet: the daemon's own view resolution (daemonRequestView)
    // reads ?view= from the URL, not just the Authorization header -- without
    // this, an admin-authenticated POST would still resolve to public view
    // at the daemon and fail any new invokeCapability governance check.
    url.searchParams.set("view", view);
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (view === "full") {
      headers.Authorization = `Bearer ${adminToken}`;
    } else if (options.auth?.auth === "jhn") {
      // Forward the same JHN token this MCP process was itself configured
      // with, so a daemon-side capability gate (invokeCapability + governance)
      // can independently re-verify via resolveCallerAuth instead of trusting
      // self-reported actor/auth fields in the body (the pre-existing pattern
      // for the 3 legacy mutate tools, left as-is -- see MUTATE_TOOLS).
      const jhnToken = String(env.COGENTIA_MCP_JHN_TOKEN || "");
      if (jhnToken) headers.Authorization = `Bearer ${jhnToken}`;
      if (options.auth.actor) headers["X-Cogentia-Actor"] = options.auth.actor;
      headers["X-Cogentia-Entry"] = "public";
    } else {
      headers["X-Cogentia-Entry"] = "public";
    }
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch (error) {
      throw new Error(`Cogentia daemon unavailable at ${daemonUrl.origin}: ${error.message}`);
    }
    const contentType = response.headers.get("content-type") || "";
    const parsed = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const detail = typeof parsed === "object" ? (parsed.message || parsed.error) : parsed;
      throw new Error(`Cogentia daemon returned HTTP ${response.status}: ${detail || "request failed"}`);
    }
    return parsed;
  }

  return {
    daemonUrl,
    requestTimeoutMs,
    view,
    allowMutate: staticAllowMutate,
    jhnMutateConfigured,
    tools,
    allTools: TOOLS,
    mutateTools: [...MUTATE_TOOLS],
    privateReadTools: [...PRIVATE_READ_TOOLS],
    initialize,
    discover,
    resolveRequestProtocol,
    handleJsonRpc,
    callTool,
    callPackBatch(queries, options = {}) {
      return callTool("cogentia_context_pack_batch", {
        queries,
        repo: options.repo,
        budget: options.budget,
        limit: options.limit,
        mode: options.mode || "hybrid",
      });
    },
  };
}

export function mcpToolResult(data) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text", text }],
    ...(typeof data === "object" && data !== null ? { structuredContent: data } : {}),
  };
}

/** @deprecated Prefer wrapToolResult; kept for direct callTool consumers in tests. */
export function mcpToolResultRaw(data) {
  return mcpToolResult(data);
}

export function jsonRpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

export function jsonRpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: "2.0", id, error };
}

export function unsupportedProtocolVersionError(id, requested) {
  return jsonRpcError(id, ERR_UNSUPPORTED_PROTOCOL_VERSION, "Unsupported protocol version", {
    supported: [...SUPPORTED_PROTOCOLS],
    requested: String(requested || ""),
  });
}

/** Build transport hints from Node HTTP request headers (Streamable HTTP). */
export function transportFromHttpRequest(req) {
  const headers = req?.headers || {};
  const get = name => {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return value == null ? "" : String(Array.isArray(value) ? value[0] : value).trim();
  };
  return {
    protocolVersionHeader: get("mcp-protocol-version") || get("MCP-Protocol-Version"),
    mcpMethod: get("mcp-method") || get("Mcp-Method"),
    mcpName: get("mcp-name") || get("Mcp-Name"),
    // Pass raw headers for JHN / admin attestation (Authorization, X-Cogentia-Actor, …).
    headers,
  };
}

export function validateDaemonUrl(value) {
  const url = new URL(value);
  if (!new Set(["http:", "https:"]).has(url.protocol) || url.username || url.password) {
    throw new Error("COGENTIA_DAEMON_URL must be an HTTP(S) URL without embedded credentials");
  }
  return url;
}

export function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(parsed, max)) : fallback;
}

function requireString(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be a non-empty string`);
}

function boundedRequired(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer from ${min} to ${max}`);
  return value;
}

function boundedOptional(value, min, max) {
  return value === undefined ? undefined : boundedRequired(value, min, max, "value");
}

function enumOptional(value, allowed, name) {
  if (value === undefined) return undefined;
  if (!allowed.includes(value)) throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  return value;
}
