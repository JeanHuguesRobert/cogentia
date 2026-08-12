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
