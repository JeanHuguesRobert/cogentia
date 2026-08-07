---
title: Path — make cogentia.js useful through MCP to any compliant agent
date: '2026-08-07'
document_role: operational
document_kind: design-path
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: d763b00
  origin_date: '2026-08-07'
  derived_from:
    - docs/cogentia-mcp.md
    - docs/connect-mcp-clients.md
    - docs/agent-skills-contract.md
    - skills/continuation-handling/SKILL.md
    - research/mcp_2026_cognitive_packet_sandbox_plan.md
    - research/cognitive_packets.md
related_issues:
  - 'https://github.com/JeanHuguesRobert/cogentia/issues/82'
  - 'https://github.com/JeanHuguesRobert/cogentia/issues/80'
  - 'https://github.com/JeanHuguesRobert/cogentia/issues/40'
---

# Path — cogentia.js useful through MCP (any compliant agent)

## Goal

Any **MCP-compliant agent** — Grok Build, Codex, Claude Code, Cursor, Gemini CLI, ChatGPT connectors, custom clients — can use the **same cognitive verbs** that `scripts/cogentia.js` implements, without embedding provider SDKs, reading SQLite, or assuming an in-memory session.

```text
Agent (MCP client)
  → MCP tools/list + tools/call  (legacy initialize OR modern server/discover)
  → scripts/cogentia-mcp.js | cogentia-mcp-http.js  (thin dual-era adapter)
  → daemon HTTP API  (cogentia.js daemon)
  → cogentia.js command implementations
  → corpus / continuations / views (source of truth)
```

**Invariant:** MCP is a **surface**, not a second product. Semantic identity of work stays on **Cognitive Packets / continuations / citations**. Skills (`skills/*`) teach agents *when* and *how* to call tools; they do not replace tools.

---

## Why this path (including “you, Grok”)

Today this Grok session has GitHub/Gmail/etc. MCP tools, but **no Cogentia MCP server** in the live tool list. Corpus work falls back to `gh`, filesystem reads, and ad-hoc shell — which bypasses:

- budgeted context packs and `source_id` citations;
- the continuation axiom (emit → inspect → resolve);
- public vs full view policy;
- dual-era protocol behaviour already implemented in `cogentia-mcp-core.js`.

Making cogentia.js useful “to me” is therefore the same problem as making it useful to any other agent: **connect a standard MCP client to a correct, tiered tool surface whose handlers are real projections of the CLI/daemon**.

---

## Current state (honest)

### What already works

| Piece | Status |
|-------|--------|
| Dual-era MCP core (`2025-11-25` + `2026-07-28` discover) | Implemented (`scripts/lib/cogentia-mcp-core.js`) |
| Stdio + HTTP adapters | Implemented |
| Public Fracta facade | Running (`https://cogentia.fractavolta.com/mcp`) |
| Read tools: search, context_pack, get_lines, health, views_snapshot, … | Wired to daemon `/api/context/*`, `/api/views/*` |
| Continuation *tools named* | Present in `TOOLS[]` |
| Skill `continuation-handling` | On `main` (method package for agents) |

### Gaps that block “useful for any agent”

1. **Docs drift** — `docs/cogentia-mcp.md` under-lists tools; `connect-mcp-clients.md` is closer but still incomplete vs code.
2. **Some MCP handlers are stubs or overloads** — e.g. `cogentia_continuation_list` / `inspect` currently hit `/api/views/snapshot` rather than a dedicated continuation inspect route; agents get cockpit JSON instead of a true continuation object.
3. **CLI ≫ MCP** — `cogentia.js` has agent/corpus/classify/docs/embeddings/… verbs; MCP exposes a thin subset. Agents cannot yet do session-start, privacy check, or skill inventory via MCP.
4. **Trust tiers mixed in one list** — mutations (`continuation_resolve`, `issues_sync`, emit) appear beside public read tools; public facades must not silently enable write without policy.
5. **No first-class packet-shaped tool result** — responses are daemon JSON; agents need a stable envelope: `{ result, citations?, continuation?, mandate_hint?, protocol_era }`.
6. **Client onboarding incomplete for Grok** — no project `.grok/config.toml` MCP entry in the workspace path agents actually open (`C:\tweesic` or `cogentia/`).
7. **Skills not discoverable over MCP** — local `SKILL.md` only; experimental Skills-over-MCP stays in #82 sandbox (correct), but agents need at least a **read tool** for skill list + body.

---

## Design principles

1. **One verb space** — every MCP tool maps to a documented `cogentia.js` command or daemon route that command already uses. No MCP-only side logic.
2. **Thin adapter** — MCP never opens SQLite, never holds provider keys, never rebuilds indexes.
3. **Tiered surfaces** — `public` ⊂ `local_read` ⊂ `local_ops` ⊂ `governed_mutate`. Hosts choose tier by env + token, not by agent self-declaration alone.
4. **Continuation axiom** — tools may return or *point to* a continuation; the client agent must inspect and decide (skill `continuation-handling`). Never block the MCP request on human judgment.
5. **Stateless resume** — tool results and continuations carry durable ids. No requirement for `Mcp-Session-Id` affinity across clients (aligns MCP 2026-07-28 + Cognitive Packets).
6. **Cite or refuse** — retrieval tools return `source_id` (or equivalent); agents must cite them when claiming corpus content.
7. **Skills recommend, tools execute reads, mandates authorize writes.**

---

## Trust tiers

| Tier | Env / auth | Tools (intent) | Who |
|------|------------|----------------|-----|
| **P0 public** | `COGENTIA_MCP_VIEW=public`, Fracta HTTP | health, search, context_pack(_batch), get_lines, explain, views_snapshot (redacted), guide_resolve, issue_graph (public), skill_list/get (public skills only) | Any remote agent, ChatGPT connector, Grok over HTTPS |
| **P1 local_read** | stdio → local daemon, public or full read token | P0 + git_verify metadata, issues_list, continuation_list/inspect (real objects), agent_start summary | Grok/Codex on the workstation |
| **P2 local_ops** | full view + admin token | P1 + emit_static, publish_registry, nav_benchmark, consolidate *read-only dry paths* | Operator agents |
| **P3 governed_mutate** | full view + admin + explicit mutate flag | continuation_emit, continuation_resolve, issues_sync | Only with human-visible mandate; map to skill governance |

Public Fracta stays **P0**. Mutations never ship on the anonymous public facade.

Default for new Grok project config: **P1** via local stdio when daemon is up; fallback **P0** HTTP to Fracta for read-only when daemon is down.

---

## Target tool surface (CLI → MCP)

Map is intentional, not exhaustive of every CLI flag on day one.

### A. Session bootstrap (always list first in `instructions`)

| MCP tool | `cogentia.js` | Notes |
|----------|---------------|--------|
| `cogentia_views_snapshot` | `views snapshot` | Keep as cockpit |
| `cogentia_agent_start` | `agent start` | **Add** — one-shot “what matters now” for agents |
| `cogentia_health` | `agent health` / daemon health | Keep |

### B. Corpus read (P0)

| MCP tool | CLI / route | Notes |
|----------|-------------|--------|
| `cogentia_search` | `docs search` / `/api/context/search` | Keep |
| `cogentia_context_pack` | pack route | Keep |
| `cogentia_context_pack_batch` | pack-batch | Keep |
| `cogentia_get_lines` | lines route | Keep |
| `cogentia_explain` | explain route | Keep |
| `cogentia_guide_resolve` | guide-resolve | Keep |
| `cogentia_docs_inspect` | `docs inspect` | **Add** (bounded) |
| `cogentia_skill_list` | `validate-agent-skills` inventory | **Add** read-only |
| `cogentia_skill_get` | read `skills/<id>/SKILL.md` | **Add** public skills only |

### C. Continuations / packets (P1 read, P3 write)

| MCP tool | CLI | Notes |
|----------|-----|--------|
| `cogentia_continuation_list` | `continuation list --json` | **Fix** handler → real list, not only snapshot |
| `cogentia_continuation_inspect` | `continuation inspect` | **Fix** → full v2 object |
| `cogentia_continuation_schema` | `continuation schema` | **Add** |
| `cogentia_continuation_emit` | `continuation emit` | P3 |
| `cogentia_continuation_resolve` | `continuation resolve` | P3; accept structured `step_result` JSON |
| `cogentia_packet_prepare` | (new thin helper or docs path) | **Optional** — wrap continuation/CPKT markdown template for handoff |

Skill `continuation-handling` is the **method**; these tools are the **verbs**.

### D. Issues / graph (P1)

| MCP tool | Notes |
|----------|--------|
| `cogentia_issues_list` | Align with real issues list, not only graph overload |
| `cogentia_issue_graph` | Keep read-only graph |
| `cogentia_issues_sync` | P3 only |

### E. Ops projections (P2)

emit_static, publish_registry, nav_benchmark, consolidate_weekly — keep, but gate by tier; fix consolidate so it is not an accidental alias of emit_static.

---

## Packet-shaped tool results

Every tool result SHOULD be normalizable to:

```json
{
  "ok": true,
  "tool": "cogentia_context_pack",
  "protocol_era": "legacy|modern",
  "view": "public|full",
  "data": {},
  "citations": [{ "source_id": "…", "repo": "…", "path": "…" }],
  "continuation": null,
  "skill_hint": "continuation-handling|corpus-evidence-retrieval|null",
  "mandate_hint": "read_public|prepare|resolve_under_mandate"
}
```

Rules:

- If work is suspended → set `continuation` to `{ id, question, resume }` (or full inspect ref), never require the client to parse free prose.
- If `continuation` is set → `skill_hint` defaults to `continuation-handling`.
- Errors: `ok: false`, stable `error_class` (`daemon_unavailable`, `unauthorized`, `validation`, `not_found`, `tier_forbidden`).

This is the MCP-facing expression of Cognitive Packet **envelope** fields without forcing every payload through a single schema on day one.

---

## Client recipes (any agent)

### 1. Grok Build (this agent) — recommended local path

**Project or user config** (`~/.grok/config.toml` or `cogentia/.grok/config.toml`):

```toml
[mcp_servers.cogentia]
command = "node"
args = ["C:\\tweesic\\cogentia\\scripts\\cogentia-mcp.js"]
env = {
  COGENTIA_DAEMON_URL = "http://127.0.0.1:8790",
  COGENTIA_MCP_VIEW = "public"
}
enabled = true
startup_timeout_sec = 30
```

Prerequisites:

```powershell
cd C:\tweesic\cogentia
$env:COGENTIA_REGISTRY = 'C:\tweesic\JeanHuguesRobert\.cogentia.json'  # if used
node scripts\cogentia.js daemon --host 127.0.0.1 --port 8790
```

Verify:

```bash
grok mcp doctor cogentia
```

**Remote read-only fallback** (no local daemon):

```toml
[mcp_servers.cogentia_public]
url = "https://cogentia.fractavolta.com/mcp"
enabled = true
```

After reconnect, this agent should see tools named `cogentia_*` via `search_tool` / tool list — same as GitHub MCP tools today.

### 2. Codex / Claude Code / Cursor

Stdio recipe already in `docs/connect-mcp-clients.md`. Point at the same `cogentia-mcp.js` + daemon. Prefer project-scoped config so clones share the path.

### 3. Pure remote HTTP clients

`POST https://cogentia.fractavolta.com/mcp` with dual-era negotiation. Tools limited to **P0**. Document smoke matrix per client (already sketched in MCP 2026 sandbox plan Phase 6).

### 4. Agents without MCP

CLI remains first-class:

```bash
node scripts/cogentia.js views snapshot --json
node scripts/cogentia.js continuation list --json
```

MCP must not become the only door; it is the **interop** door.

---

## Implementation phases

### Phase 0 — Connect & evidence (1 session)

- [x] Add Grok MCP config (`cogentia/.grok/config.toml` + workspace `.grok/config.toml`) for local stdio and public HTTP.
- [ ] Start local daemon; `grok mcp doctor cogentia` green (operator / session reload).
- [ ] Smoke from a Grok session with tools loaded: health → views_snapshot → search → get_lines.
- [x] Record evidence rows in `docs/agent-skills-compatibility.md`.

**Exit:** Grok (and one other client if available) can call Cogentia tools without shell hacks. Config is in place; live tool injection needs session reload.

### Phase 1 — Honest tools (fix the façade)

- [x] Wire `continuation_list` / `inspect` to real daemon routes (`GET /api/cli/continuation/list|inspect`); public-safe sanitization on inspect.
- [x] Gate mutate tools by tier (`COGENTIA_MCP_ALLOW_MUTATE=1` + full view + admin token); remove fake public mutate stubs; real emit/resolve on full-view daemon POST.
- [x] Align `docs/cogentia-mcp.md` tool table with `TOOLS[]`.
- [x] Tests: extend `test-mcp-dual-era.js` with mutate gate + continuation list/inspect live optional.
- [x] **Initial production deploy: Fracta VPS** (`git pull` → `5401f0e`, restart `cogentia.service` + `mcp-cogentia.service`). Public `https://cogentia.fractavolta.com/mcp` serves P0/P1 with mutate hidden (17 tools).

**Exit:** `continuation-handling` skill can be executed **only via MCP tools** against a real continuation id (when daemon holds continuations).

### Phase 2 — Agent bootstrap completeness

- [ ] Add `cogentia_agent_start`, `cogentia_skill_list`, `cogentia_skill_get`, `cogentia_continuation_schema`.
- [ ] Enrich server `instructions` string: ordered playbook (snapshot → skill_get continuation-handling → search/pack → cite → continuation loop).
- [ ] Optional: resources for `skills/*/SKILL.md` if client supports MCP resources (tools-first remains mandatory).

**Exit:** cold-start agent without repo checkout can still learn continuation method over MCP (public skill text).

### Phase 3 — Packet envelope on results

- [ ] Normalize tool responses with `citations` / `continuation` / `skill_hint` / `error_class`.
- [ ] Propagate W3C `traceparent` from modern `_meta` into continuation history when present (sandbox plan correlation).
- [ ] Document mapping to Cognitive Packet envelope fields.

**Exit:** multi-hop handoff works across two different MCP clients without shared session.

### Phase 4 — CLI parity slices (demand-driven)

Promote additional `cogentia.js` verbs only when an agent workflow fails without them:

1. `docs inspect` / gaps (navigation).
2. `corpus privacy` / `consolidate` (publish readiness, read-only).
3. embeddings status (not full index mutate over public MCP).

Avoid dumping the entire CLI into tools/list (context window poison). Prefer **few sharp tools** + skills.

### Phase 5 — Experimental Skills-over-MCP

Per #82: sandbox only (`sandbox/mcp-2026-cognitive-packet/`). No production claim until client evidence matrix is filled. Local `SKILL.md` + `skill_get` remains the portable baseline.

---

## Playbook baked into server instructions (target text)

```text
1. cogentia_views_snapshot (or agent_start) — situation
2. cogentia_skill_get id=continuation-handling — method if work may suspend
3. cogentia_context_pack or search — evidence; cite source_id
4. cogentia_get_lines — verify claims
5. If continuation appears: inspect → prepare step_result → resolve only if tier+mandate allow
6. Never treat continuation as a crash; never invent missing packet context
```

---

## Deployment topology

### Initial production: Fracta VPS (current)

```text
Internet
  → Caddy cogentia.fractavolta.com
  → mcp-cogentia.service  127.0.0.1:8791  (node scripts/cogentia-mcp-http.js)
  → cogentia.service      127.0.0.1:8790  (node scripts/cogentia.js daemon)
```

- Working tree: `/srv/cogentia/repos/cogentia` (track `main`).
- Public env: `COGENTIA_MCP_VIEW=public` (no `COGENTIA_MCP_ALLOW_MUTATE`).
- Deploy procedure (operator):

```bash
ssh fracta
cd /srv/cogentia/repos/cogentia
git pull --ff-only origin main
sudo systemctl restart cogentia.service mcp-cogentia.service
curl -fsS http://127.0.0.1:8790/api/context/health?quick=1
curl -fsS http://127.0.0.1:8791/health
# External: tools/list should show 17 tools; mutate absent; emit → tier_forbidden
```

Operium owns ops doctrine (`operium/docs/fracta-trust-perimeter.md`); this path only names the app surface.

### Later: Netlify Edge (Deno) — not yet

A second public or edge projection of the **same** thin MCP contract may run as a **Netlify Edge Function** on the Deno runtime (precedent: Ophelia / legacy agent edge handlers under Inseme Netlify), for:

- lower latency near clients;
- burst scaling without VPS RAM pressure;
- optional per-site front doors (e.g. JHN) that still call Fracta daemon or a hosted gateway.

Constraints when that path is opened:

1. Edge code remains an **adapter** — no SQLite, no provider keys, no corpus rewrite.
2. Prefer **proxy** to Fracta `:8790`/trusted gateway or a minimal edge-safe tool subset (P0 only) if loopback daemon is unreachable from the edge.
3. Reuse dual-era JSON-RPC handlers from `cogentia-mcp-core.js` via a Deno-compatible port or HTTP hop to the Node MCP service — do not fork semantics.
4. Mutate tools stay **off** on any anonymous edge URL.
5. Fracta VPS remains the **system of record** for daemon state and continuations until an explicit multi-region design says otherwise.

Track as a follow-up issue when Ophelia-style Deno edge scaffolding is reused; do not block Fracta P1 on Edge.

## Non-goals

- Replacing `cogentia.js` CLI with MCP-only workflows.
- Running index rebuild, embedding provider calls, or secret-bearing ops on public MCP.
- Claiming universal Skills-over-MCP support.
- Giving remote agents P3 mutate by default.
- Collapsing COP Acts into MCP tool success codes.
- Premature Netlify Edge rewrite of the Fracta daemon.

---

## Success criteria

| Criterion | Measure |
|-----------|---------|
| Any compliant client can discover tools | `tools/list` or `server/discover` returns stable names |
| Grok included | This agent’s live session lists `cogentia_*` tools |
| Corpus answers are citable | `source_id` present on search/pack/lines |
| Continuations are agent-resumable | list → inspect → resolve path works without shell |
| Public is safe | Fracta P0 has no mutate tools or mutate returns tier_forbidden |
| Dual-era clients work | smoke test green for legacy + modern |
| Method is portable | `skill_get(continuation-handling)` returns skill text over MCP |

---

## Immediate next actions (ordered)

1. **Connect Grok** — add MCP server config + ensure daemon or public URL; doctor + smoke.
2. **Phase 1 fixes** — real continuation list/inspect + mutate gating (highest leverage for the new skill).
3. **Doc sync** — regenerate tool tables from `TOOLS[]` (single source in code, docs cite or generate).
4. **Phase 2 bootstrap tools** — agent_start + skill_list/get.
5. **Phase 3 envelopes** — packet-shaped results.

---

## Relation to open issues

| Issue | Role on this path |
|-------|-------------------|
| #82 Agent Skills | Method packages + experimental MCP skill discovery; this path supplies the tools skills call |
| #80 packet-first modules | Capabilities behind tools; MCP remains adapter |
| #40 Guide CLI/MCP/web | Guide tools already partial; keep under P0 |
| #36 Turing MCP | Later: continuation language for multi-step MCP scripts — not required for P0–P2 |

---

## One-sentence north star

**Expose the real `cogentia.js` verbs through a tiered, dual-era MCP adapter so any compliant agent — including Grok — can boot, retrieve with citations, and handle continuations as Cognitive Packet work, without forking a second cognitive stack.**
