---
title: Cogentia MCP adapter
author: unknown
affiliation: unknown
license: unknown
language: en
status: working-paper
last_modified_at: '2026-11-05'
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

Both adapters expose shared governed implementations. Corpus retrieval delegates
to the Cogentia daemon over HTTP (`/api/*`); private memory capture invokes the
v3 capability in the MCP process, without forwarding its text to the daemon.
They never open SQLite directly or mutate the corpus without policy authorization.

For client setup recipes (Claude Code, Grok, Codex, Cursor, and Fracta public service), see [connect-mcp-clients.md](connect-mcp-clients.md).

### 5 November 2026 — completed normal/super Unix pilot

The account `hosted-fred2b20250` was **actually created** on Fracta2 by
`execution_mode:super` through the temporary MCP to the root-owned broker.
Readback: UID/GID `1003:1003`, home `0750`, bash shell; root-side single-use
grant consumed, broker effect `ok:true` and `cop_reserved:true`. This
supersedes earlier "not created" statements **for this one operation only**.

The completed pilot's hardcoded privileged authorization exception has been
removed from the source to publish; in production the prior hook remains
in the executable but its systemd override was removed, so it is disabled.
Publishing to GitHub is **not** a service redeployment. The Fractanet SSH
administrative issuer route was reachable to the bootstrap shell and is
therefore not an independently proven human trust boundary. Durable mandate
issuance, COP budget reservation and protected human identity remain open.
Hosted-browser login/access for Fred is a separate workstream.

Full receipt and limitations:
[`frederic_unix_super_pilot_closure_2026-11-05.md`](../research/integration/frederic_unix_super_pilot_closure_2026-11-05.md).

### Temporary ChatGPT Unix coding bootstrap — 29 October 2026

**Operationally verified; transitional, not a replacement for governed Cogentia MCP.**
For Corpus coding work from a ChatGPT session, discover the **Cogentia Unix Shell Exec**
plugin and its callable action `mcp__Cogential_Unix_Shell_Exec__shell_exec` with
arguments `{"command":"hostname; id; uname -a"}`. The exact internal name
has **Cogential** (not Cogentia). Always check current tool availability before
claiming that it can be used; capability recall is not an access grant.

The plugin is backed by the experimental one-tool Node MCP provider
[`scripts/experimental/jhn-shell-mcp.mjs`](https://github.com/JeanHuguesRobert/cogentia/blob/experiment/minimal-jhn-shell-mcp-20261029/scripts/experimental/jhn-shell-mcp.mjs),
running as Unix user `ubuntu` on `fracta2` at `127.0.0.1:8798/mcp`, reached
via OpenAI `tunnel-client` outbound Secure MCP Tunnel (profile
`jhn-fracta2-shell`). No public incoming port is necessary. This is **not**
the normal `cogentia_fracta2_shell_probe` tool, and does not cure the normal
MCP's private-tool authentication/discovery issue.

**Reality Test:** On 2026-10-29 a direct ChatGPT tool call executed
`hostname; id; uname -a` on `fracta2` under UID/GID 1001 (`ubuntu`),
`exit_code=0`, with real stdout, empty stderr and invocation ID
`676491f0-a5e5-4076-be99-d3197084b7e9`. A second shell call confirmed
matching `started` / `finished` receipts in
`~/.config/jhn-shell-mcp/audit.jsonl`. Evidence:
[Cogentia #294, Reality Test](https://github.com/JeanHuguesRobert/cogentia/issues/294#issuecomment-6495527010).

**Use discipline:** Re-check the current mandate and the target before every
coding action; prefer narrow inspect/edit/test commands, preserve production
services, do not print credentials, and inspect the exit code and receipt.
`shell_exec` accepts arbitrary shell text and inherits the service Unix
privileges; its private tunnel is not itself a COP side-effect policy.
The JSONL receipts are experimental **not** canonical COP Acts. If the
tool is absent, report the missing live connector rather than substituting
`cogentia_john_run` / `mock.echo` or claiming execution. Work toward
integrating `host.process.run` into the governed provider under
[Cogentia #294](https://github.com/JeanHuguesRobert/cogentia/issues/294);
do not turn this shortcut into a competing permanent gateway.


---

### Governed Unix process surface — integration status (29 October 2026)

The normal Cogentia MCP catalog now declares two semantic core operations:
`cogentia_host_process_prepare` (private-read EXPOSE) and
`cogentia_host_process_run` (private-mutate EXECUTE). The latter delegates to
`host.process.run` through the existing v3 host-capability router, selecting
`unix-process` as a provider when explicitly requested. It is not a raw-shell
implementation inside MCP. The prepare response includes the command, node,
provider, timeout and canonical payload hash; the pre-existing
`cogentia_side_effect_grant` can mint a hash-bound, single-use grant only after
its authorization conditions are satisfied. Execution uses that grant and
records the existing side-effect receipt. A tested standalone core path confirms
EXPOSE → grant → native Unix execution → receipt → replay refusal.

**Deployment and authority boundary:** this is source-level implementation
and isolated integration testing, **not yet a successful ChatGPT call through
normal deployed MCP**. The running adapter has a public view; anonymous discovery
must hide protected tools (unless an OAuth issuer advertises them without
conferring invocation rights). A real JHN/admin caller must satisfy the normal
mutate authorization conditions and grant flow. The temporary tunnel connector
remains separate while the normal adapter's deployment/authentication is tested.
Do not relax the public tier simply to expose process execution.

## 1. Architectural Invariants & Trust Model

The MCP layer is a **surface**, not a second product. All semantic identity, citations, and execution state remain grounded in **Cognitive Packets, Continuations, and Git Markdown files**.

```text
Tool availability is not authorization.
Authorization is not execution.
Caller mediation remains the execution boundary.
```

1. **Thin Adapter:** The MCP layer maps calls to shared capability implementations or daemon HTTP routes, with authorization enforced before private capture. It does not maintain a parallel capture implementation or database connection.
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
| `COGENTIA_HOST_FS_ROOT` | *none* | Required sandbox root for `host.fs.*`; no blanket filesystem export |
| `COGENTIA_HOST_NODE_ID` | `node:local` | Target node id for host capability routing |
| `COGENTIA_HOST_FS_PROVIDER` | `desktop-commander` | Provider id; not the public semantic name |
| `COGENTIA_DC_MCP_INDEX` | auto | Explicit path to extracted Desktop Commander `dist/index.js` |
| `COGENTIA_DC_MCP_COMMAND` / `COGENTIA_DC_MCP_ARGS` | extracted or `npx` | Override DC spawn; prefer extracted binary over `npx -y` |

### Private KYS/AMI capture

`cogentia_memory_capture` accepts `{ "text": "..." }` and runs the same
`memory.capture` capability as `cogentia memory capture --stdin`. It is hidden
from unauthenticated discovery and requires private-read access. It stores
nothing and makes no provider or daemon call. The complete result, including
raw text and diagnostics, is private.

Local stdio requires full view and an admin token; mutation can remain disabled.
HTTP `POST /mcp` verifies a credential on each capture request, even on a
full-view server. The legacy `POST /tools/cogentia_memory_capture` shortcut is
blocked. The capture text limit is 262144 UTF-8 bytes.

See [the capture contract and usage examples](memory-capture.md#cli-and-mcp-surfaces-282)
for exact authorization paths, envelope semantics, transport limits and checks.

Host filesystem tools (`cogentia_host_fs_list` / `_read` / `_search` / `_write`) are **private-read or mutate**, never on the anonymous public catalogue. They are Cogentia semantic capabilities (`host.fs.*`). Desktop Commander is one local provider behind COP and #171, not a tool the client should name.

Existing Cogentia surfaces (stdio MCP, HTTP `/mcp`, later `browser.fractavolta.com` / Agent John) consume those Cogentia tools. They must not open Desktop Commander, KasmVNC, or CDP as a substitute. Hosted-browser CDP remains a separate capability family (`docs/cdp_hosted_browser_session_bridge.md`). `fracta2` is not required for the local provider Reality Test.

Full Reality Test report, launcher notes, observed DC tool list, and evidence levels: [host_fs_desktop_commander.md](host_fs_desktop_commander.md).

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
| `cogentia_status` / `state` / `repos` / `plugins` | **P0** | Daemon cockpit reads (`/api/status`, `/api/state`, `/api/repos`, `/api/plugins`) |
| `cogentia_agent_health` | **P0** | AI router / agent gateway health |
| `cogentia_grep` | **P0** | Corpus grep (`/api/cli/grep`) |
| `cogentia_docs_summary` / `docs_query` / `docs_snippet` | **P0** | Documentation catalog reads |
| `cogentia_get_doc` | **P0** | Document metadata by `repo:path` |
| `cogentia_index_status` / `index_search` | **P0** | Local FTS index status and raw search |
| `cogentia_pattern_list` / `pattern_get` | **P2** | Patterns / Anti-patterns (#110); not Skills, not authority |
| `cogentia_cli_catalog` | **P0** | Live CLI/MCP/skill/pattern inventory (maximum visible set) |
| `cogentia_memory_capture` | **P4** private-read | In-memory KYS/AMI normalization; result stays private; no daemon or storage |
| `cogentia_host_fs_list` | **P4** private-read | Bounded directory list on a selected host node (`host.fs.list`) |
| `cogentia_host_fs_read` | **P4** private-read | Bounded file read (`host.fs.read`) |
| `cogentia_host_fs_search` | **P4** private-read | Bounded host search (`host.fs.search`) |
| `cogentia_host_fs_write` | **P3 Mutate** + #171 | Bounded file write; fails closed without `side_effect_authorization` |
| `cogentia_communication_prepare` | **P4** private-read | EXPOSE a `gmail.send` payload; does not send |
| `cogentia_communication_send` | **P3 Mutate** + #171 | EXECUTE prepared mail; dry-run unless a transport is injected |
| `cogentia_github_prepare` | **P4** private-read | EXPOSE a `github.write` mutation; does not write |
| `cogentia_github_write` | **P3 Mutate** + #171 | EXECUTE prepared GitHub write; dry-run unless a transport is injected |
| `cogentia_git_prepare` | **P4** private-read | EXPOSE a `git.commit` or `git.push`; does not mutate |
| `cogentia_git_write` | **P3 Mutate** + #171 | EXECUTE prepared git mutation; dry-run unless a local transport is injected |
| `cogentia_side_effect_grant` | **P3 Mutate** + #171 | Mint UI: grant after EXPOSE; `confirm` must match `payload_hash` |
| `cogentia_side_effect_record` | **P3 Mutate** + #171 | VERIFY after native execute: consume grant, hop `effect-verified`; does not send |

Anonymous `tools/list` still hides mutate tools. The **maximum set** is also advertised as MCP resources (`resources/list`, `skill://…`, `cogentia://pattern/…`, `cogentia://cli/catalog`) and experimental `skills/list` (SEP-2640). Use `cogentia_cli_catalog` or `resources/read` of `cogentia://capability/catalog` to see gated verbs even when they are omitted from the public tool list.

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
| **Modern Era** | `2026-07-28` | Optional `server/discover`, stateless per-request `_meta`, `MCP-Protocol-Version` headers, `resources` / `prompts` / `completions`, experimental `io.modelcontextprotocol/skills` |

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

## HTTP `HEAD` semantics

Public read endpoints accept `HEAD` with the same status and relevant headers
as `GET`, but no response body. SSE endpoints (`/sse`, `GET /mcp`) remain
stream-only and return `405` to `HEAD`; mutation routes remain `POST` only.
Use `GET /guide/health` when the diagnostic body is needed.

For a bounded, no-paid-provider evaluation, set
`COGENTIA_GUIDE_SYNTHESIS_PROVIDER=openrouter_free` together with
`COGENTIA_GUIDE_OPENROUTER_FREE_FALLBACK=1` and an explicit
`COGENTIA_GUIDE_OPENROUTER_FREE_MODEL`. This mode is opt-in; it bypasses the
daemon, OpenAI, and paid OpenRouter candidates for synthesis.

### 5 November 2026 — privileged broker issuer-boundary correction (source only)

A critical trust-boundary defect was confirmed: the running `cogentia-super`
root service previously read the COP side-effect grant file at
`/var/lib/cogentia/side-effect-authorization.json`, owned by the unprivileged
`ubuntu` account. Restricting that file to `0600` fixes disclosure to other
users, but cannot stop its owner from forging `authority_origin: principal`
that the root broker would accept. A transport token, hash confirmation, or
ordinary-user ownership must never be elevated to Principal authority.

The source-level broker now requires, **when running as root**, a regular
non-symlink grant file owned by root and inaccessible to group/others,
inside a root-owned directory not writable by group/others. Its future
root-only path is `/var/lib/cogentia-super/authorizations.json`; the service
source matches it. Unit tests cover owner mismatch, permissive modes,
symlinks and missing files. A trusted issuer pathway still has to be
implemented against the canonical Inseme authority and budget before
provisioning the new root-owned store and deploying this change. **Do not
copy the existing ubuntu-writable grants into the root-only store**; doing
so would launder unauthenticated decisions. Old service continues running
until a separately verified and authorized deployment. No privileged Unix
account was created by these tests.

### 5 November 2026 — #299 canonical authority admission preflight (not activated)

`scripts/lib/cop-super-admission.js` provides a **non-executing**, fail-closed
preflight for an integration with Inseme's `evaluateMandate()` and its
canonical event-sourced execution-budget ledger. It accepts only mandate
references (not caller-provided declaration objects), requires verified
principal and actor context, `super` intent, successful mandate evaluation
and a budget ledger with an authority grant for the same mandate. It
**does not** mint `side_effect_authorization`, reserve budget, or invoke the
broker: a real atomic Inseme reservation, issuer provenance, and a trusted
production store connector remain mandatory prior to execution.

Read-only Supabase check of JHN on 2026-11-05: `cop_mandates` 0 rows,
`cop_accounting_budget` 0 rows, and `cop_event_log` 0 event types containing
Mandate or Budget. Existing persistent COP tables therefore cannot yet supply
a verified funded mandate for super execution. No synthetic authority was
inserted and the live MCP/broker authorization policy was not changed.

### 5 November 2026 — Fracta2 super broker observed; end-to-end authority still unverified

**Live observation (read-only; not an execution authorization):**
`cogentia-super.service` is `active (running)` on Fracta2 and runs as
`root` with group `ubuntu`. The Unix socket
`/run/cogentia-super/broker.sock` exists with ownership `root:ubuntu`
and mode `0660`. The unit selects the authorization store path
`/var/lib/cogentia/side-effect-authorization.json`. These observations
supersede the earlier *not deployed* description **for the broker process
only**. They do **not** demonstrate an effective authenticated Principal
mandate, durable COP reservation, correct MCP feature-flag configuration,
or a successful `super` execution through the deployed ChatGPT MCP.

The two-phase implementation exists: `cogentia_host_process_prepare`
exposes the exact target/provider/command/mode and payload hash;
`cogentia_side_effect_grant` or `cogentia.js effect grant` can mint a
single-use hash-bound authorization; `cogentia_host_process_run` consumes
it through the governed route. The CLI is the documented **mint UI**;
no separate human-facing browser approval UI is evidenced. Hash
confirmation alone proves agreement of payload bytes, **not independent
human authentication**; do not manufacture a Principal-issued grant from
chat text. A `normal` prepared payload cannot authorize `super`: a new
EXPOSE with `execution_mode: super` is required, and the privileged
broker must still validate and accept its authority chain. The MCP input
schema used by the connected client must be checked for support of
`execution_mode`, rather than assuming source-level support is live.

**Reality-test pending:** inspect MCP runtime feature enablement, trusted
Principal/mandate evidence and broker-side verification before any
privileged act. Keep the ordinary shell gateway's `NoNewPrivileges=true`.

### 1 November 2026 — one COP authority, no mandate labyrinth

The mandate is the single policy decision for normal and super effects.
The router, MCP, broker and OS are enforcement/transport mechanisms,
not independently governed authorization systems. An explicit
`sudo -n` in a super script is an anti-accident execution syntax, not a
second grant or a per-command policy. The root-local experimental grant
store used for the Fracta2 smoke test is temporary and MUST be replaced by
one canonical, atomic, revocable COP authorization-and-reservation service
before automatic agent activation. Do not turn the prototype grant registry
or the intermediate `credentialResolver` into additional mandate authorities.
The latter adapter was removed to avoid institutionalizing duplication.

### 1 November 2026 — general-purpose super scripts governed by mandate

`host.process.run` uses the same general script interface for `normal` and
`super`; there is deliberately **no per-command allowlist**. The privileged
executor is a distinct, operator-installed broker. The governed script
starts as `ubuntu`; individual root operations require an explicit
`sudo -n` prefix, just as in an administrator SSH shell. Entering super
does not automatically elevate every command. Its authority is derived
from a COP grant bound to the exact script/payload/target/mode, or from a
trusted mission resolver with explicit `allowed_execution_modes: ['super']`.
A normal mission verdict must not authorize super. Mission verification
belongs to trusted code, not user-provided text or shell arguments.

The MCP core accepts a trusted `missionAuthorityResolver` and
`privilegedExecutor` at construction time, never from tool arguments.
Operational safeguards are mandate scope, identity, duration, revocation,
budget, atomic reservation, accounting, receipt, and audit, rather than an
ever-expanding list of individual commands. The privileged broker may execute
arbitrary scripts *once they are governed*, but must not itself be callable
through the ordinary MCP credential or an ungoverned socket.

**Status:** This is a source-level integration point, not a deployed root
executor or verified durable COP mandate service. Keep `NoNewPrivileges=true`
for the ordinary shell MCP; independently install and verify the broker and
durable revocable authorization before enabling `super`. Root scripts can
alter the mandate verifier or logs unless those are protected outside the
privileged host's control; no mandate policy alone provides isolation against
a compromised administrator.

### 31 October 2026 — two execution modes, one semantic process capability

`host.process.run` now accepts `execution_mode: normal | super` (default `normal`).
The **normal** provider allows commands up to 32 KiB, at most 120 s synchronous
execution, and 256 KiB output; the temporary local shell MCP additionally
allows 64 KiB request bodies. These are independent *resource* bounds, not
privilege grants. A remote client's own response timeout may be lower, so use
existing durable jobs/continuations for long-running work rather than assuming
a 120 s uninterrupted HTTP request.

**Super is an explicitly modelled, fail-closed intent, NOT a deployed privilege.**
Preparation binds `execution_mode` in the COP side-effect payload hash: a normal
grant cannot be reused for super. Both the host capability router and the native
Unix provider refuse `super` with `privileged_executor_unavailable`; they cannot
silently fall back to normal execution. A production super implementation needs
an independently governed privileged process boundary, an authority resolver
that cannot be spoofed by a shell argument, command-specific budget and audit,
and an operator-installed service/sudo policy. Keep `NoNewPrivileges=true` on
the temporary arbitrary-command MCP and preserve the already-tested read-only
SSH/Caddy workflows. Do **not** enable sudo in that unrestricted temporary
server: its bearer token alone is not a sufficient administrator mandate.

The temporary experimental implementation is source-controlled at
`scripts/experimental/jhn-shell-mcp.mjs`, with a loopback-only integration test.
The operational service uses `/home/ubuntu/.config/jhn-shell-mcp/server.mjs`;
changing the source file alone does not reload a running service. Restart and
validate its actual reported tool schema and receipts before claiming live
activation. No public anonymous discovery of governed mutate tools is allowed.
