---
title: Cogentia MCP adapter
author: unknown
date: '2026-06-30'
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 6775ef3
  origin_date: '2026-06-30'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Cogentia MCP Adapter & Architecture Specification

`scripts/cogentia-mcp.js` is a thin MCP (Model Context Protocol) stdio server for the Cogentia Context Gateway. `scripts/cogentia-mcp-http.js` exposes the same tools over HTTP at `/mcp`. 

Both adapters act as thin facades: they delegate execution to the Cogentia daemon over HTTP (`/api/*`). They never open SQLite, read corpus files directly, rebuild the index, execute raw shell commands, or mutate the corpus without policy authorization.

For client setup recipes (Claude Code, Grok, Codex, Cursor, and Fracta public service), see [connect-mcp-clients.md](connect-mcp-clients.md).

---

## 1. Architectural Invariants & Trust Model

The MCP layer is a **surface**, not a second product. All semantic identity, citations, and execution state remain grounded in **Cognitive Packets, Continuations, and Git Markdown files**.

```text
Tool availability is not authorization.
Authorization is not execution.
Caller mediation remains the execution boundary.
```

1. **Thin Adapter:** The MCP layer contains zero side logic or database connections. It maps MCP `tools/call` JSON-RPC messages directly to daemon HTTP routes.
2. **Tiered Trust Boundaries:** Tools are grouped into strict Trust Tiers (P0 through P4). Public facades default to read-only (`P0`). Mutation tools (`P3`) require explicit administrative token attestation or agent mandate claims.
3. **Stateless Resume & Continuations:** Tools return or point to durable **Continuation IDs** (`ctn_[hex]`). Clients do not rely on transient server session affinity.
4. **Line-Level Citations:** All retrieval tools return `source_id` citations (`#L123-L145`). Agents must cite these references when claiming corpus content.

---

## 2. Configuration & Client Setup

### Stdio Configuration (`mcpServers`)

For local agents (Claude Code, Cursor, Codex, Grok CLI):

```json
{
  "mcpServers": {
    "cogentia": {
      "command": "node",
      "args": ["C:/tweesic/cogentia/scripts/cogentia-mcp.js"],
      "env": {
        "COGENTIA_DAEMON_URL": "http://127.0.0.1:8790",
        "COGENTIA_MCP_VIEW": "public"
      }
    }
  }
}
```

### Environment Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `COGENTIA_DAEMON_URL` | `http://127.0.0.1:8790` | Daemon HTTP endpoint address |
| `COGENTIA_MCP_VIEW` | `public` | View visibility mode (`public` or `full`) |
| `COGENTIA_ADMIN_TOKEN` | *none* | Admin token required before requesting `full` view |
| `COGENTIA_MCP_ALLOW_MUTATE` | `0` | Set to `1` to enable write tools under `COGENTIA_ADMIN_TOKEN` |
| `COGENTIA_MCP_JHN_MUTATE` | `0` | Set to `1` for Agent JHN / subagent mandate attestation |
| `COGENTIA_MCP_JHN_TOKEN` | *none* | Agent JHN shared secret token for mutate attestation |
| `COGENTIA_MCP_TIMEOUT_MS` | `15000` | Gateway request timeout in milliseconds |

---

## 3. Trust Tiers & Tool Reference

Tools are registered in `scripts/lib/cogentia-mcp-core.js`. They are categorized into 5 Trust Tiers:

### Trust Tiers Summary

* **P0 Public:** Model-facing, read-only tools. Safe for all remote clients, public Fracta facades, and ChatGPT connectors.
* **P1 Read Local:** Local-only read tools for inspecting active continuations, issue graphs, and Git status.
* **P2 Session & Skills:** Session bootstrap, Agent Skills inventory (`skill_list`, `skill_get`, `skill_export`), and continuation schemas.
* **P3 Mutate:** Write/mutation operations (`continuation_emit`, `continuation_resolve`, `issues_sync`). Strictly blocked unless explicit token attestation is provided.
* **P4 Admin / Inspection:** Internal repository health, mandate attenuation checks, privacy leak reports, and ops projections.

---

### Comprehensive Tool Table

| Tool Name | Trust Tier | Role & Description |
| :--- | :--- | :--- |
| `cogentia_health` | **P0** | Returns daemon, corpus index, and vector cache health |
| `cogentia_search` | **P0** | Citable Markdown corpus search (keyword, hybrid, semantic) |
| `cogentia_context_pack` | **P0** | Budgeted, deterministic context pack for a given query |
| `cogentia_context_pack_batch` | **P0** | Batch budgeted context packs for multi-query prompts |
| `cogentia_get_lines` | **P0** | Read exact line-number intervals from a document with citations |
| `cogentia_explain` | **P0** | Inspect retrieval signals, ranking scores, and term weights |
| `cogentia_guide_resolve` | **P0** | Resolve concept or Guide topics against the corpus index |
| `cogentia_views_snapshot` | **P0** | Redacted session cockpit snapshot (preferred at session start) |
| `cogentia_issue_graph` | **P0** | Read-only issue graph mapping work items to target documents |
| `cogentia_issues_list` | **P0** | List tracked GitHub issues for a registered repository |
| `cogentia_continuation_list` | **P1** | List active continuation queue (`alive`, `hibernating`, `closed`) |
| `cogentia_continuation_inspect` | **P1** | Inspect a specific continuation payload and execution status |
| `cogentia_git_verify` | **P1** | Check git clean/dirty state and ahead/behind branch status |
| `cogentia_agent_start` | **P2** | Cold-start agent session summary, repository map, and playbook |
| `cogentia_skill_list` | **P2** | Inventory portable Agent Skills (method packages) |
| `cogentia_skill_get` | **P2** | Fetch full `SKILL.md` body and metadata for a specific skill |
| `cogentia_skill_export` | **P2** | Export an Agent Skill as a portable Method Package JSON |
| `cogentia_continuation_schema` | **P2** | Field/command schema for `cogentia.continuation.v2` |
| `cogentia_emit_static` | **P2** | Read-only static site / Markdown view export projections |
| `cogentia_continuation_emit` | **P3 Mutate** | Create/emit a new continuation packet (`requires auth`) |
| `cogentia_continuation_resolve` | **P3 Mutate** | Fulfill and resolve an active continuation (`requires auth`) |
| `cogentia_issues_sync` | **P3 Mutate** | Materialize GitHub issue packets into `.cogentia/issues` (`requires auth`) |
| `cogentia_docs_inspect` | **P4** | Inspect full document metadata by reference |
| `cogentia_docs_gaps` | **P4** | Identify documentation index and navigation gaps |
| `cogentia_corpus_privacy` | **P4** | Public-view privacy leak analysis (scans for raw paths/codes) |
| `cogentia_consolidate` | **P4** | Read-only publish-readiness check for Views Store |
| `cogentia_embeddings_status` | **P4** | Detailed embedding cache status and vector provider info |
| `cogentia_mandate_attenuation_check`| **P4** | Verify parent vs. child mandate authority bounds (`PASS`/`WARN`/`FAIL`) |

---

## 4. Packet-Shaped Tool Result Envelopes (`cogentia.mcp_tool_result/v1`)

Every successful or failed `tools/call` response is wrapped in a standardized, self-describing **Cognitive Packet Envelope**:

```json
{
  "ok": true,
  "tool": "cogentia_search",
  "protocol_era": "2026-07-28",
  "view": "public",
  "data": {
    "results": [ ... ]
  },
  "citations": [
    {
      "source_id": "doc:cogentia:docs/cogentia-mcp.md#L45-L60",
      "repository": "cogentia",
      "path": "docs/cogentia-mcp.md",
      "lines": [45, 60]
    }
  ],
  "continuation": null,
  "skill_hint": "continuation-handling",
  "mandate_hint": null,
  "error_class": null,
  "correlation": {
    "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
  },
  "envelope": {
    "kind": "cogentia.mcp_tool_result/v1"
  }
}
```

* **`citations`**: Automatically extracted from retrieval hits so agents can cite exact line ranges.
* **`continuation`**: Present when a tool result is or points to an asynchronous suspended judgment (`ctn_[hex]`).
* **`correlation`**: Echoes `traceparent` (and `baggage`) from request `params._meta` for cross-system telemetry.

---

## 5. Dual-Era Protocol Architecture

The adapter supports two protocol eras transparently:

| Era | Protocol Versions | Handshake & Entry |
| :--- | :--- | :--- |
| **Legacy Era** | `2025-11-25`, `2025-06-18`, `2024-11-05` | Standard `initialize` handshake $\rightarrow$ `tools/list` $\rightarrow$ `tools/call` |
| **Modern Era** | `2026-07-28` | Optional `server/discover`, stateless per-request `_meta`, `MCP-Protocol-Version` headers |

Unsupported versions return JSON-RPC error code `-32022` (`UnsupportedProtocolVersionError`) listing supported versions.

---

## 6. Execution & Testing Commands

### Smoke Tests

```powershell
# Dual-era protocol test
node scripts/test-mcp-dual-era.js

# Stdio server test
node scripts/test-mcp-stdio-all.js

# Live HTTP adapter test
node scripts/test-mcp-live.js
```

### Running Adapters

```powershell
# Stdio Adapter (for local AI clients like Claude Code, Cursor, Grok)
node scripts/cogentia-mcp.js

# HTTP Adapter (for web connectors and remote endpoints)
COGENTIA_DAEMON_URL=http://127.0.0.1:8790 COGENTIA_MCP_VIEW=public PORT=8791 node scripts/cogentia-mcp-http.js
```
