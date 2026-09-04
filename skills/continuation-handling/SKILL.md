---
schema: cogentia.agent_skill/v1
id: cogentia.continuation-handling
version: 2
status: experimental
name: continuation-handling
description: >
  Inspect and handle Cogentia continuations and Cognitive Packet continuation
  payloads: distinguish judgment boundaries from failures, reconstruct constraints
  from durable provenance, prepare or resolve only under mandate, never assume an
  in-memory MCP session. Use when the user or tool emits a continuation, a CPKT
  handoff, step_result, continuation resolve/resume, suspended judgment, or packet
  resumption. Slash: /continuation-handling.
triggers:
  - continuation object or CLI continuation emit/list/inspect/resolve
  - Cognitive Packet with packet_kind continuation or cognitive-packet handoff
  - suspended work needing external judgment
  - resume after session, process, or MCP client change
  - step_result preparation or packaging failure report
inputs:
  - continuation_or_packet
  - applicable_mandate_or_constraints
  - optional_step_result_draft
outputs:
  - classification
  - step_result_or_refusal
  - optional_prepared_packet
  - material_trace
effects: prepare_only
requires:
  capabilities:
    - continuation.inspect
    - continuation.list
    - continuation.resolve
    - corpus.read_public
governance:
  minimum_mandate: prepare
  may_disclose: false
  may_resolve_without_mandate: false
  may_widen_authority: false
  trace_minimum: material
sources:
  - docs/agent-skills-contract.md
  - docs/continuations_and_cognitive_packets_for_agents.md
  - prompts/continuation_user_prompt.md
  - prompts/continuation_designer_prompt.md
  - prompts/cognitive_packet.md
  - research/cognitive_packets.md
  - research/cognitive_packet_switching.md
  - research/agent_resumable_cli.md
  - research/mcp_2026_cognitive_packet_sandbox_plan.md
  - research/monotonic_mandate_attenuation.md
  - research/agent_configuration_layer.md
  - research/CPKT-2026-002_continuation_handoff.md
  - research/packet_continuation_machine.md
  - trace/schemas/continuation.schema.json
document_role: "operational"
document_kind: "documentation"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "skill-procedure"
classification_confidence: "strong"
---

# Skill: continuation-handling

## What this skill is

A **method package** for agents that encounter a **suspended unit of cognitive work**.

It implements the *handling* aspect of **Cognitive Packets** whose payload kind is **continuation**, and the operational twin `cogentia.continuation.v2` used by `scripts/cogentia.js`.

It does **not**:

- grant a mandate or widen authority (#79);
- execute COP Acts or external side effects;
- replace packet routing / capability registry (#80);
- treat MCP session memory as durable state;
- invent missing context when packaging failed.

## Core model (packet aspect)

```text
Cognitive Packet
  envelope  → identity, provenance, routing, transmission mode, status, traces
  payload   → kind-specific work (here: continuation)

Continuation payload / CLI object
  = suspended computation whose missing input is judgment
  ≠ error
  ≠ free-form prompt
  ≠ authorization to act in the world
```

| Layer | Role in this skill |
|-------|--------------------|
| **Envelope** | Inspect first. Enough for list/queue/archive/refuse routing without reading the whole payload. |
| **Payload (continuation)** | Inspect for judgment task, alternatives, constraints, expected result schema. |
| **Transmission** | **By copy** embeds needed context; **by reference** requires shared stable context — if unreadable, demand/fallback to by-copy. |
| **Resumption** | From durable objects (file, issue, CLI store, packet hop log) — **not** from an in-memory MCP `Mcp-Session-Id`. |
| **HandlerInstance** | Replaceable. Same packet may resume under another agent/server if provenance reconstructs constraints. |

Operational CLI form (`node scripts/cogentia.js continuation …`) serializes **`cogentia.continuation.v2`**:

```text
id, status, kind, title, question, subject, context, expected_response, resume, history, resolution
```

Research form `cogentia.continuation.v1` and CPKT handoff files (e.g. `research/CPKT-2026-002_continuation_handoff.md`) are richer envelopes; map fields rather than forcing one schema. See [references/packet-mapping.md](references/packet-mapping.md).

## When to activate

Activate when any of these appear:

1. CLI / API continuation (`continuation emit|list|inspect|resolve|resume|cancel`).
2. JSON/YAML/Markdown object with `type: continuation`, `protocol: cogentia.continuation.*`, or `packet_kind: continuation`.
3. Cognitive Packet handoff (`packet_kind: cognitive-packet/*` with continuation semantics, hop log, workstreams).
4. Tool/MCP result that reports `continuation_required` or a resume command.
5. User asks to resume work from a packet, issue handoff, or previous session without transcript.

## Procedure

### 1. Inspect (do not treat as failure)

Read the full object. Extract at least:

```text
identity          → id / packet_id / continuation_id
status            → active | dormant | resolved | cancelled | in transit | …
kind / packet_kind
question / goal / next action
subject / home / routing
context / state / workstreams
constraints / mandate / absolute constraints
alternatives / allowed_responses
expected_response / expected_result_schema
resume path       → command, return path, hop log
provenance / traces / history
transmission_mode → copy | reference (if packet)
```

CLI helpers (when in this repo):

```bash
node scripts/cogentia.js continuation list
node scripts/cogentia.js continuation inspect <id>
node scripts/cogentia.js continuation schema
```

### 2. Classify the stop reason

Use [references/judgment-boundary.md](references/judgment-boundary.md). Primary classes:

| Class | Meaning | Default agent stance |
|-------|---------|----------------------|
| **judgment_boundary** | Deterministic work stopped; external judgment is the missing input | Prepare structured `step_result` within schema and mandate |
| **technical_failure** | Tool/API/IO/error — not a semantic decision | Report failure; do not invent a “decision” |
| **packaging_failure** | Packet claims context that is missing/unstable | Report R2-style gap; prefer by-copy repair; do not guess lore |
| **mandate_gate** | Effect would require authority not present | Refuse resolve; propose preparation-only or human gate |
| **accountability_gap** | High risk/irreversibility without skin-in-the-game fields | `needs_acceptance` — do not resolve as success |

**Never** reclassify a judgment boundary as an error solely because the process paused.

### 3. Reconstruct constraints from durable provenance

Before any resolve:

1. Prefer constraints **on the object** (mandate, absolute constraints, budget, disclosure).
2. Else reconstruct from cited sources (issue, AGENTS.md, packet hop log, parent mandate).
3. Apply **monotonic attenuation** (#79): child/local profile may narrow, never widen.
4. If a consequential dimension cannot be compared → **fail closed** and report ambiguity.

MCP clients: treat each request as potentially new process. Correlate via packet id / continuation id / W3C `traceparent` if present — do not require session affinity.

### 4. Decide allowed action under mandate

```text
inspect / classify / explain     → generally allowed when object is in scope
prepare step_result draft        → prepare_only (this skill's default effect)
write continuation resolve       → requires explicit resolve mandate + schema-valid result
external Act / send / publish    → out of skill scope; COP / separate mandate
```

If mandate is missing for resolve:

- Produce a **prepared** `step_result` draft for human/principal, or
- Return `status: needs_acceptance`, or
- Emit a new continuation / packet hop describing the gate — **do not** call `continuation resolve` as success.

### 4A. Continue obvious read-only work inside the envelope

Do not create a judgment boundary merely because one procedural step ended.
When the next useful action is highly predictable, first test whether it is
already authorized and materially non-impacting.

```text
next_action_allowed :=
    within_mandate
    ∧ within_budget
    ∧ within_disclosure_ceiling
    ∧ within_effect_ceiling
    ∧ no_material_hidden_side_effect

if next_action_is_clear
and next_action_allowed
and action_is_read_only:
    execute the inspection / retrieval / verification directly
else:
    surface the exact next action and the specific gate
```

This is the **Next Logical Action Principle**:

> **When the next action is highly predictable, useful, and within mandate and
> budget, execute it directly if it is read-only and non-impacting; otherwise
> expose the action and request only the authorization actually required.**

`read_only` does not mean `free`. Reads may consume compute, provider quota,
human attention, privacy budget, or other bounded resources; some APIs also
have observable or hidden side effects. The budget and effect envelope remain
binding.

This rule does not widen this skill's declared `prepare_only` effect. It removes
unnecessary stops only for in-scope inspection, classification, retrieval and
verification that were already permitted.

### 4B. Verify a handoff before issuing it

A handoff is not valid merely because the prompt, resume instruction, or target
name is well formed. The declared input must exist in the state that the next
handler will actually see.

Before a material handoff, check proportionately:

```text
handoff_allowed :=
    target_exists
    ∧ target_retrievable_by_next_handler
    ∧ target_content_or_version_verified
    ∧ immutable_identity_known_when_required
```

If any term is false, do not issue the handoff as ready. Repair the packaging,
publish/commit the intended input under the applicable mandate, switch to
by-copy transmission, or report the precise blocker.

For Git-backed document review, the preferred sequence is:

```text
edit canonical file
→ required human arbitration
→ commit
→ fetch back from GitHub
→ verify delivered content/version
→ obtain immutable commit SHA
→ hand off that SHA to the Reviewer
```

Use Git's native semantics instead of inventing routine document-version files:

```text
stable path
→ evolving content
→ immutable commit checkpoints
```

Versioned filenames or branches are justified only by a concrete need such as
genuinely parallel or incompatible variants, not by ordinary sequential review.

This is the **Verified Handoff Principle**:

> **A continuation is not ready merely because its instructions are correct.
> Its declared input must exist, be accessible through the next handler's
> channel, and be independently retrievable before the handoff is issued.**

### 5. Produce output

#### A. Valid `step_result` (generic default)

Align with `prompts/continuation_user_prompt.md`. Prefer schema forced by `expected_response` / `expected_result_schema` when present.

Success:

```json
{
  "type": "step_result",
  "continuation_id": "<id>",
  "status": "success",
  "chosen_alternative": null,
  "result": {
    "decision": "<text>",
    "reason": "<text>"
  },
  "reason": "<concise justification>",
  "confidence": 0.0,
  "constraints_checked": true,
  "skin_in_the_game_checked": true,
  "mandate_basis": "<how authority to resolve was established, or 'prepare_only'>"
}
```

Failure (branch/task failed — still a structured judgment outcome):

```json
{
  "type": "step_result",
  "continuation_id": "<id>",
  "status": "failed",
  "failed_alternative": null,
  "reason": "<why>",
  "recoverable": true,
  "suggested_next_action": "backtrack"
}
```

Needs acceptance:

```json
{
  "type": "step_result",
  "continuation_id": "<id>",
  "status": "needs_acceptance",
  "reason": "Risk or irreversibility without accountable party / mandate.",
  "required_information": [
    "accountable_party",
    "explicit_acceptance"
  ]
}
```

Examples: [examples/](examples/).

#### B. Resume only when authorized

```bash
node scripts/cogentia.js continuation resolve <id> path/to/step_result.json
# alias:
node scripts/cogentia.js continuation resume <id> path/to/step_result.json
```

After resolve: confirm status closed/resolved in list/inspect; leave material trace (issue comment, hop log append, or commit message under agentic commit transparency when writing).

#### C. Packet hop (when input was a Cognitive Packet file)

If handling a CPKT markdown/YAML handoff:

1. Append **Hop Log** (append-only); never rewrite prior hops.
2. Fill resumability report fields (R0–R5) when the packet defines them.
3. Preserve absolute constraints (consent gates, GO-required workstreams).
4. If by-reference context is unavailable → report packaging failure and request by-copy.
5. Before declaring the hop ready, verify that every by-reference target required by the next handler is actually retrievable through that handler's available channel.

### 6. Stop conditions

Stop and hand control back when:

- classification is `mandate_gate` or `accountability_gap` and no principal is available;
- `expected_response` cannot be satisfied without inventing facts;
- resolve would widen mandate, disclosure, or effect ceiling;
- only external effect remains (send mail, merge without review, publish) — different skill/COP path;
- packaging failure blocks safe resumption.

Do **not** stop merely because the next logical step is an in-scope read-only
inspection or verification already covered by mandate and budget.

## Provider neutrality

A continuation/packet must remain answerable by a human, another model, a script, or a twin. Do not bake provider-specific assumptions into `step_result` or hop log.

## Prohibited behavior

- Treat continuation as casual chat or as a crash dump alone.
- Hide failed branches or blocked tools.
- Invent missing packet context (“lore reconstruction”).
- Resolve without mandate while claiming success.
- Silently exceed budget / disclosure constraints.
- Ask for permission solely to perform an obvious, in-scope, non-impacting read that is already within mandate and budget.
- Issue a handoff as ready without verifying that its declared target exists and is retrievable by the next handler.
- Assume in-memory MCP session continuity across clients or restarts.
- Collapse envelope routing into payload interpretation (or the reverse).
- Turn this skill into an autonomous executor of arbitrary Acts.

## Material trace minimum

For material work, record at least:

```text
continuation_id or packet_id
classification
action taken (inspect | prepare | resolve | refuse | hop)
mandate_basis or refusal reason
step_result status if any
correlation ids if present (traceparent, issue URL, commit)
handoff target + verification basis when a material handoff is emitted
```

## Quick map to Cognitive Packet Switching

This skill covers **handler-side continuation discipline**:

```text
receive packet/continuation
  → inspect envelope
  → interpret continuation payload
  → check mandate / attenuation / budget / effect envelope
  → continue obvious read-only verification when already allowed
  → prepare or resolve judgment
  → verify any next-handler target before handoff
  → emit result / refusal / next packet hop
  → leave trace
```

It does **not** implement full Fractium attractor routing, Operium placement, or COP authorization engines. Those remain #80 / Operium / Inseme COP issues. This skill keeps agents from destroying resumability at the judgment boundary — the packet aspect that fails most often in multi-session, multi-agent, multi-MCP-client work.

## References in this package

- [references/packet-mapping.md](references/packet-mapping.md) — CPKT envelope ↔ continuation.v1/v2 field map
- [references/judgment-boundary.md](references/judgment-boundary.md) — judgment vs failure decision table
- [examples/](examples/) — sample `step_result` fixtures
