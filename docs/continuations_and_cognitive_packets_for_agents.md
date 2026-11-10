---
title: Continuations and Cognitive Packets — early agent briefing
document_role: operational
document_kind: agent-orientation
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
language: en
related:
  - "../research/cognitive_packets.md"
  - "../research/agent_resumable_cli.md"
  - "../research/cognitive_packet_switching.md"
  - "../skills/continuation-handling/SKILL.md"
  - "../instructions/AGENTS.shared.md"
  - "resumable_github_issues.md"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Continuations and Cognitive Packets — early agent briefing

**Read this early.** Continuations are not a niche CLI feature. They are the
**operational form of Cognitive Packets** when work is suspended for judgment,
and agents are **handlers** of those packets (and of their CLI twin objects).

## One model (envelope + payload + handler)

```text
Cognitive Packet
  envelope  → who, when, status, routing, transmission (copy|reference), traces
  payload   → kind-specific work

payload kinds include:
  continuation | objection | hypothesis | decision | failure | routing | …

Continuation payload (or CLI cogentia.continuation.v2)
  = suspended computation whose missing input is *judgment*
  ≠ crash, ≠ free-form prompt, ≠ mandate to act in the world

Handler
  = human, agent, twin, script, or fulfiller that inspects / prepares / resolves
  = replaceable; resumability must not depend on one process or MCP session
```

**Continuations are 100% packet-shaped work:** the CLI continuation is the
operational twin of a packet whose `packet_kind` is continuation; the skill
`continuation-handling` is the **handler** procedure.

## Conversations as agile packet-routing handlers

A conversation may touch **several existing Cognitive Packets**. On a
meaningful Act or new observation, inspect candidate work loci before creating
anything: existing packet with compatible finality and lineage; several links
with different roles; or merely a durable Act receipt when no continuation is
needed. A completed packet remains a valid historical attachment even when a
new successor is justified. New packets are a last resort for work requiring
its own identity, handler, acceptance and return contract.

Do not confuse exact active-continuation `dedupe_key` matching with semantic
identification; the latter is not yet automatically implemented. Keep
attachment evidence and uncertainty explicit, and allow subsequent packet
graph revisions (re-parent, link, split, consolidate) without renumbering or
fabricating past intent. The present organization is a **revisable working
hypothesis**, not a restriction on future routing. Prefer organizing real
conversation Acts over creating simulations or perpetual task backlogs.

**Spirit of Synthesis:** consider connections across several packet
histories when they can genuinely make an additional capability or useful
continuation reachable; do not confuse more tags, links or compressed
summaries with a generative result. See
[Potentics §3.5](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/potentics.md#35-spirit-of-synthesis)
and [the cognitive-packet anti-proliferation rule](../research/cognitive_packets.md).
Existing-packet attachment is preferable to creating a new synthetic umbrella
solely to represent this cross-link.

## Conversation renewal without breaking work continuity (MCP schema freshness)

**Observed FBF case, 2026-11-10:** after deploying a new optional
strategy parameter with local and remote_first values on cogentia_code_search,
and refreshing both Cogentia MCP connectors, an **already-running ChatGPT
conversation** still exposed only query, repo and limit. A **new conversation**
exposed strategy through both connectors. The live daemon already included
the parameter. This is evidence of per-conversation schema staleness in this
case, not proof of universal ChatGPT behavior.

**Normative implication:** renewing a conversation is an ordinary handler
replacement for gaining updated MCP contracts, not a reason to lose ongoing
work or create duplicate Cognitive Packets. Before handoff, update the
**existing authoritative work loci** with material decisions, evidence,
current status, unresolved questions, applicable mandate/budget constraints,
exact next step and acceptance criteria; record the source commit/endpoint,
and which capability signatures were actually advertised, accessible and
tested. The successor must cold-start by verified references, without
requiring the predecessor's private model memory or a full transcript.

**Practical recipe:** identify the active packet(s)/Issue(s) and semantic
relations; persist material deltas and a hop receipt; open a fresh conversation
after connector refresh; resolve packet references; inspect the **new
conversation's actual** offered tool contracts; recheck permissions; resume
from the recorded next action. If the new signature remains stale, report
that precise gap. Renewal alone never grants new authority. One conversation
can involve several packets; never multiply packets solely to replace a
handler. Copy a bounded self-describing continuation only when a durable
reference cannot be accessed.

## CPS work handling: park, handoff, resume

These are three **single-step intentions over existing packet identities**,
not actions on a conversation transcript. \`park\` preserves work and suspends
this handler's participation; \`handoff\` makes its scope retrievable by a
successor; \`resume\` resolves current packet state and continues, possibly
with a different handler or MCP schema. Keep packet lifecycle separate from
handler claim state. Use existing COP PacketClaim only for incompatible
concurrent work, and a Judgment Continuation only for an actual judgment
boundary. Do not manufacture a packet or separate session store for each
conversation change. For the canonical convergence, see
[CPS Park/Handoff/Resume](../research/cognitive_packet_switching.md#park--handoff--resume--converging-on-existing-cps-primitives-2026-11-10).

## Why tools emit continuations (IoC)

When a structural tool hits a judgment boundary, it must **not** hide an
OpenAI-compatible call inside itself. It **exposes** the missing judgment:

```text
tool computes → judgment boundary → emit continuation
  → external handler supplies step_result → tool resumes
```

Analogy: a **Promise/Future across process boundaries** (no shared RAM), with
**schema- and judgment-bearing** fulfillment, traveling as a **packet**
(by **copy** or by **reference**).

Deep doctrine: [`research/agent_resumable_cli.md`](../research/agent_resumable_cli.md),
[`research/cognitive_packets.md`](../research/cognitive_packets.md).
A dated path audit of IoC vs embedded OpenAI-compatible calls exists as a
**private** working note under `research/` and is not linked from public views.

## Transmission: by copy vs by reference

| Mode | Data | Use when |
|------|------|----------|
| **by copy** | Context embedded in the packet | Foreign agent, paste, no shared store |
| **by reference** | Ids / paths / store keys | Same registry, daemon, or stable corpus |

If a reference is unreadable → fail packaging; prefer repair **by copy**. Do not invent lore.

## What agents must do when they see one

1. **Do not treat as a mere error** — classify (judgment boundary vs technical failure).  
2. **Inspect envelope first**, then payload.  
3. **Reconstruct constraints** from the object / durable provenance (monotonic attenuation).  
4. **Prepare** a structured `step_result` under mandate; **resolve** only with authority.  
5. **Leave a trace** (id, classification, action, mandate basis).

Operational skill: [`skills/continuation-handling/SKILL.md`](../skills/continuation-handling/SKILL.md).

```bash
node scripts/cogentia.js continuation list
node scripts/cogentia.js continuation inspect <id>
node scripts/cogentia.js continuation schema
# resolve only under mandate:
node scripts/cogentia.js continuation resolve <id> step_result.json
```

## Durable terminal trace

Continuation records are runtime queue state and may be excluded from Git. A
terminal decision must therefore also be recorded in the registry repository's
tracked `.cogentia/audit.jsonl`.

`continuation resolve` and `continuation cancel` append one typed
`cogentia.continuation.audit.v1` event. The event records the continuation id,
terminal status, subject, decision, reason, and terminal timestamp. For records
resolved by an earlier CLI version, run the explicit, idempotent repair command:

```bash

## Handler initiative: continue when the next step is obvious

A handler SHOULD NOT stop merely to ask whether it may perform a clearly implied
non-impacting or independently authorized, narrowly recoverable **internal** next step when that step is already within the
inherited mandate, budget, disclosure rules and effect ceiling.

Read-only is not a magic exemption. Retrieval can consume compute, API quota,
attention, privacy budget, or other bounded resources, and some nominal reads
can have hidden side effects. The handler therefore checks the whole operating
envelope, not only the HTTP verb or tool label.

```text
if next_action_is_clear
and within_mandate
and within_budget
and within_disclosure_and_effect_ceiling
and (read_only or trusted_mandate_derived_internal_effect)
and no_material_hidden_side_effect:
    execute the inspection / verification directly
else:
    prepare safely, test the missing gate, and escalate only a material judgment
```

Canonical compression:

> **Do not stop at an obvious continuation. Surface it — or execute it directly
> when it is non-impacting or a strictly controlled, verified recoverable internal effect inside mandate and budget.**

## Verified handoffs

A continuation is not ready to hand off merely because its instructions are
correct. Its declared input must actually exist and be available to the next
handler through the channel that handler can use.

Before issuing a material handoff, verify proportionately:

```text
target exists
∧ target is retrievable by the next handler
∧ target content/version was checked
∧ immutable identity is known when the review or replay requires immutability
```

For Git-backed artifacts, prefer the simplest native model:

```text
stable canonical path
→ evolving content
→ immutable commit checkpoints
```

Routine revisions do not require versioned filenames or branches. Use a branch
only when there is a concrete need for genuinely parallel or incompatible work.
For an external review handoff, the normal sequence is:

```text
edit canonical file
→ required human arbitration
→ commit
→ fetch back from GitHub
→ verify delivered content/version
→ obtain immutable commit SHA
→ issue reviewer handoff using that SHA
```

This is the **Verified Handoff Principle**: a handler must verify the next
handler's actual input, not merely its own intention about what that input
should be.

### Accessible Inputs Gate

Verified handoff includes a harder feasibility condition: the next handler must
be able to perform the first actionable step with the channels and artifacts it
actually has.

```text
required_input_exists
∧ exact_reference_known
∧ target_handler_can_retrieve
∧ retrieval_path_verified
∧ first_step_feasible
```

If any essential term is false, the continuation is not ready. Repair the
reference, copy the smallest sufficient context, expose a verified alternate
retrieval path, or return **BLOCKED** with the missing dependency.

A producer-side artifact is not a delivered artifact. In particular:

```text
visible in current chat
≠ visible to coding agent

present on local disk
≠ present in repository

mentioned in an Issue
≠ retrievable by Issue handler
```

The maxim is operational rather than decorative:

> **Ad impossibilia nemo tenetur** — do not attribute failure to a handler when
> the handoff itself withheld an essential input.

For GitHub-Issue continuations, see
[`docs/resumable_github_issues.md`](resumable_github_issues.md).


## Concurrent handlers: claim, refresh, reconcile

When more than one handler can resume the same Packet or continuation, private session memory is not enough coordination.

The minimum operational sequence is:

```text
observe current claim / baseline
→ acquire a scoped claim when incompatible work requires one
→ work
→ refresh current state before a material effect
→ compare baseline / local work / current state
→ integrate | reconcile | explicit fork
→ publish durable result
→ release claim
```

A claim coordinates work. It never creates mandate or semantic authority.

```text
HandlerInstance ≠ LogicalAgent
claim ≠ authority
Git conflict-free ≠ semantic compatibility
```

Cogentia already contains a tested prototype in
[`scripts/lib/resolver-registry.js`](../scripts/lib/resolver-registry.js):
two resolvers racing to claim the same continuation use atomic create-if-absent,
so exactly one wins. The isolated check is
[`scripts/check-resolver-registry.js`](../scripts/check-resolver-registry.js).

That prototype is only the first enforcement layer. It does not yet provide
distributed lease renewal, sub-packet scopes, provider-side fencing, or automatic
late-result reconciliation. Until those exist, every material effect still
requires a live refresh and reconciliation against the baseline used to begin work.

If an overlapping active claim is observed, do not duplicate blindly. Choose the
smallest appropriate response:

```text
different compatible scope
| cooperate with current holder
| explicit fork
| wait / return
| challenge only a stale or expired claim under the applicable rules
```

Deep doctrine:
[`research/cognitive_packets.md#107-concurrent-handlers-scoped-claims-and-reconciliation`](../research/cognitive_packets.md#107-concurrent-handlers-scoped-claims-and-reconciliation).


## Handlers, not session memory

A packet/continuation must remain answerable by a **different** agent or human
after process restart. Prefer packet id / continuation id / hop log / files —
**not** “I still have the chat context.”

## Read next (depth)

| Order | Document |
|-------|----------|
| 1 | This briefing |
| 2 | [`skills/continuation-handling/SKILL.md`](../skills/continuation-handling/SKILL.md) |
| 3 | [`research/cognitive_packets.md`](../research/cognitive_packets.md) |
| 4 | [`research/agent_resumable_cli.md`](../research/agent_resumable_cli.md) |
| 5 | [`research/cognitive_packet_switching.md`](../research/cognitive_packet_switching.md) |
| 6 | [`docs/resumable_github_issues.md`](resumable_github_issues.md) — GitHub Issues as cold-handler-resumable by-reference packets |
