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
[`research/cognitive_packets.md`](../research/cognitive_packets.md),
[`research/ioc_continuation_openai_path_audit_2026-08-12.md`](../research/ioc_continuation_openai_path_audit_2026-08-12.md).

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

## Handler initiative: continue when the next step is obvious

A handler SHOULD NOT stop merely to ask whether it may perform a clearly implied
**read-only, non-impacting** next step when that step is already within the
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
and read_only
and no_material_hidden_side_effect:
    execute the inspection / verification directly
else:
    surface the exact next action and the gate that prevents direct execution
```

Canonical compression:

> **Do not stop at an obvious continuation. Surface it — or execute it directly
> when it is read-only, non-impacting, and already inside mandate and budget.**

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
