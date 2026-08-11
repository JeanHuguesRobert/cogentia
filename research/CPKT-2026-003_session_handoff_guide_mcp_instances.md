---
packet_id: CPKT-2026-003
packet_kind: cognitive-packet/v0.1
packet_version: 1
created: "2026-07-29"
title: "Session handoff — Guide fail-fast, dual-era MCP, instance map"
home_of_record: "the human author (acceptance authority for every workstream)"
subscribing_homes:
  - "JeanHuguesRobert/cogentia (Guide, MCP, daemon fail-fast)"
  - "JeanHuguesRobert/inseme (instance map, JHN / Pertitellu)"
  - "JeanHuguesRobert/operium (ops control plane — do not fork under cogentia/deploy)"
carrier: "the human author (opens the next session on any machine / any coding agent)"
status: "open — awaiting Hop 1 (any coding-capable agent with repo write access)"
visibility: public
document_role: operational
document_kind: cognitive-packet-handoff
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
related_documents:
  - "research/CPKT-2026-002_continuation_handoff.md"
  - "docs/cogentia-mcp.md"
  - "docs/cogentia-magistral-boundary.md"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/research/instance_map.md"
  - "https://github.com/JeanHuguesRobert/operium/blob/main/docs/magistral-coding-agent-routing.md"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# CPKT-2026-003 — Session handoff (Guide fail-fast · dual-era MCP · instance map)

**You are a cognitive processor receiving a cognitive packet.** Prefer a coding-capable agent with write access to `cogentia` and `inseme` (and SSH to `fracta` only when deploying). This file plus the **commits already on `main`** are the complete working state. **No chat transcript is required.** If something essential is missing, that is a packaging failure — report it in R2 rather than reconstructing lore.

**Warm-up (optional):** `git pull` on `cogentia` and `inseme`; open this packet; run:

```bash
cd cogentia
node scripts/test-mcp-dual-era.js
node scripts/test-guide-fail-fast.js
```

If either test fails, stop and report; do not re-implement A/B from scratch.

---

## Envelope

**1. Identity.** CPKT-2026-003. Append-only hop log. Each processor declares version only in its hop header.

**2. Home.** Home of record: the human author. Subscribing homes as in frontmatter. Ops control plane: **Operium**, not a second doctrine under `cogentia/deploy/`.

**3. Goal.** Resume the 2026-07-28/29 spine **without redoing closed work**: Guide/daemon fail-fast when Magistral has no chat LLM; dual-era MCP; locked instance names; then the next open workstreams below.

**4. Mandate.** Repository writes under agentic commit transparency (mandate, provenance, human review, reversibility). Read each repo’s `AGENTS.md` / `Claude.md` before writing. Absolute constraints:

- (a) **Do not re-implement** Guide fail-fast or dual-era MCP if `main` already contains them (verify SHAs below).
- (b) **Do not rename** founding instances without revising `inseme/research/instance_map.md` and a human decision.
- (c) **No local LLM** for production Guide unless zero other option (author rule).
- (d) Fracta live ops: observe with Operium / trust perimeter; prefer `fracta-guide-stack` / systemd units over freestyle process surgery.
- (e) Binary public/private corpus via registre-mariani remains; fine-grained mesh ACL deferred.

**5. State — closed vs open.**

### Closed (do not redo)

| Workstream | Artifact | Evidence |
|------------|----------|----------|
| **A — Guide / daemon fail-fast** | Probe AI-router `/health`; treat `llm: false` as no chat; skip intent/planner/synthesis LLM chain; extractive fallback after retrieval | cogentia **`c30aa0f`**, docs/tests **`b5aa82e`** |
| **B — MCP dual-era** | Legacy `initialize` (2025-11-25…); modern `server/discover` + per-request `_meta` / headers for **2026-07-28**; tools-only (no Apps/Tasks yet) | same commits; server version **0.3.0** |
| **C — Instance map** | Locked names: **`pertitellu-corte`** first collective; **`jhn`** personal TwinRoot; **`fractavolta-public-guide`** infant public surface | inseme **`f8f984d`**, cross-links **`e187615`** |
| **Deploy A+B on fracta** | `main` pulled; `cogentia` + `mcp-cogentia` restarted | fracta HEAD was **`b5aa82e`** after deploy/docs pull; smoke: `context.chat.available=false`, `reason=llm_false`, chat `extractive_fallback` (~seconds of retrieval, not 3×15s LLM timeouts); modern discover + legacy initialize OK |

**Key files (cogentia):**

- `scripts/lib/ai-router-client.js` — `interpretRouterCapabilities`, enriched `aiRouterHealth`
- `scripts/cogentia.js` — daemon `ai_router_chat_unavailable` fail-fast
- `scripts/cogentia-mcp-http.js` — `guideChatCapability`, extractive path
- `scripts/lib/cogentia-mcp-core.js` — dual-era protocol
- `scripts/test-mcp-dual-era.js`, `scripts/test-guide-fail-fast.js`
- `docs/cogentia-mcp.md`, `docs/cogentia-magistral-boundary.md`

**Key files (inseme):**

- `research/instance_map.md`
- pointers in `research/index.md`, personal-instance doctrine §8, JHN runbook

### Open workstreams (priority)

**W1. Conversational Guide restoration (only if desired).**  
Magistral on fracta was observed as **`llm: false`**, `router_only: true` (embeddings OK). Fail-fast is correct under that health. Restoring `mode=conversational` means fixing the **chat path** (Magistral map / coding-agent gateway / timeouts — Operium: `docs/magistral-coding-agent-routing.md`), not undoing fail-fast. Smoke when healthy: Potentics question → conversational + sources; when unhealthy: still extractive + `guide_chat_fail_fast`.

**W2. JHN personal instance dogfood.**  
Runbook: `inseme/apps/platform/docs/RUNBOOK_JHN_PERSONAL_INSTANCE.md`. Own Supabase + Netlify; **do not** share DB/site with `lepp.fr`. TwinRoot / mandates after smoke (`inseme#17` vicinity).

**W3. Pertitellu / LePP migration plan.**  
`survey` → `inseme` `apps/platform` for **`pertitellu-corte` only after** W2 smoke. First collective remains lepp.fr until bascule.

**W4. MCP Apps verticals (later sprint).**  
Serra / Rhuma — keep Apps in the modern MCP story; **not** required for dual-era tools-only adapter. Do not block W1–W3.

**W5. Optional packaging hygiene.**  
- Ensure fracta still on latest `cogentia` `main` before any Guide change.  
- Views Store / cockpit may list this packet if you export continuations (optional).  
- Session-local SSH/mesh fixes from earlier days are **host state**, not this packet.

**6. Needs.** Write access: `cogentia`, `inseme` (and `operium` only for ops doctrine/routing profiles). SSH `fracta` for deploy smoke. Carrier brings nothing else if `main` is current.

**7. Routing policy.** Any coding-capable agent. Chat-only processors may package or advise but must not invent SHAs or claim deploy without evidence. Private chat memory does not travel.

**8. Completion conditions (for Hop 1+).**

- Hop reports R0–R5 filled.  
- Confirmed closed table SHAs still on `origin/main` (or notes supersession).  
- Next workstream chosen explicitly (W1–W4) with a first concrete action and exit criterion.  
- No silent instance renames; no reimplementation of A/B without failing tests.

**9. Return path.** Commits on subscribing repos; this packet’s hop log appended; short note to the author when a workstream closes.

**10. Trace.** Hop Log below.

---

## How to resume (checklist)

```text
1. git pull JeanHuguesRobert/cogentia (main)
2. git pull JeanHuguesRobert/inseme (main)
3. Read this packet end-to-end
4. Read inseme/research/instance_map.md (names)
5. node scripts/test-mcp-dual-era.js
6. node scripts/test-guide-fail-fast.js
7. Optional live: curl -fsS https://cogentia.fractavolta.com/guide/health  → context.chat
8. Ask author: W1 (chat path) vs W2 (JHN) vs other
```

---

## Resumability report — fill after first working block of Hop 1

- **R0.** Provider/agent, machine, repos writable (yes/no), fracta SSH (yes/no), side-channels beyond this packet.
- **R1.** Could you begin without external clarification? (0/1/2) Assumptions.
- **R2.** What was missing that this packet should have carried?
- **R3.** What did the packet carry that you did not need?
- **R4.** Instruction conflicts?
- **R5.** Portability score, 0–10.

---

## Hop Log (append-only)

### Hop 0 — Packaging. Processor: Grok (xAI, coding CLI on workstation), 2026-07-29. Packet version 1.

Packaged the 2026-07-28/29 spine: Fractanet/SSH context deferred as host state; Guide timeout root cause (llm:false + serial chat); A fail-fast; B dual-era MCP; C instance map; deploy to fracta with measured smoke; commits pushed to product `main` and docs/tests backfilled. Deliberately omitted full transcript. Handover: packet to carrier for Hop 1.

### Hop 1 — [processor, date, packet version — append here]
