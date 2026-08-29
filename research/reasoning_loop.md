---
title: "Reasoning Loop — events and handlers as the agent core"
description: "Study of why Guide and Agent JHN main loops are the wrong shape, and the candidate kernel isolated in scripts/lib/reasoning-loop.js."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-08-29"
last_modified_at: "2026-08-29"
license: "CC BY-SA 4.0"
language: "en"
version: "0.1"
status: "working-note"
document_role: "source"
document_kind: "working-note"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
related:
  - "../instructions/AGENTS.shared.md"
  - "../docs/continuations_and_cognitive_packets_for_agents.md"
  - "../docs/agent-jhn-governed-step-harness.md"
  - "cognitive_packets.md"
  - "conceptual_gravity.md"
  - "operational_stance.md"
  - "../scripts/lib/reasoning-loop.js"
---

# Reasoning Loop

**Correction (2026-08-29):** a later archaeology pass
([`reasoning_loop_archaeology.md`](reasoning_loop_archaeology.md)) shows that the
JavaScript Event Loop analogue is the **outer** COP/Continuation/Scheduler, not
this inner cycle. This file remains useful as the *required-event* tournament
for the inner loop (orientation / prologue / living evidence). Do not treat
`scripts/lib/reasoning-loop.js` as a replacement for COP.

## Why this note exists

Guide and Agent JHN do not fail primarily because a particular retriever is weak.

They fail because the **main loop** is the wrong object.

JavaScript is not “a collection of good event handlers.” It is an **event loop** that dispatches **events** to **handlers**. Until that kernel exists, adding a better search, a better prompt, or a better `corpus.orient` call inside a retrieve-then-generate pipeline will not change the kind of reasoning the system can do.

`instructions/AGENTS.shared.md` is already written as a **prologue** (read order, invariants, packets/handlers, living evidence, Open-Possible, Measured Risk, mandate attenuation). Today that prologue is at best injected into a prompt. It does not get to enqueue work.

## The analogy

| JavaScript | Reasoning kernel |
|------------|------------------|
| Event loop | Reasoning loop (`scripts/lib/reasoning-loop.js`) |
| Event | Reasoning event (`cogentia.reasoning_event/v1`) |
| Event handler | Reasoning handler |
| `addEventListener` | `createHandlerRegistry` |
| `dispatchEvent` / queue | phase-ordered queue inside `createReasoningLoop().run()` |
| Host APIs (`fetch`, DOM) | Capabilities, skills, `corpus.orient`, retrieval, models |
| `Promise` / continuation | Cognitive Packet continuation (judgment boundary) |
| Program prologue | `AGENTS.shared.md` → `sharedAgentsPrologue()` |

A browser does not ask an LLM “what kind of event should happen next?”

The **runtime** decides that a click is a click. Handlers react. Some handlers are trivial; some are expensive; some wait on I/O. The scheduler remains the loop.

## What the current loops actually are

Catalogued in code as `CURRENT_LOOPS`:

### Guide turn — a pipeline

`produceGuideTurn` in `scripts/cogentia-mcp-http.js`:

```text
cache → intent → plan → retrieve → optional web → one LLM completion → answer
```

This is retrieve-then-generate. Orientation, continuations, living evidence, and Open-Possible are not events. If they appear, they appear as text in the system prompt, which the model may ignore.

### Answer engine — a smaller pipeline

`scripts/lib/agent-jhn-whatsapp/answer-core.js`:

```text
analyze → retrieve → synthesize → critique → render
```

Same shape. Critique is not a judgment *event*; it is a stage.

### Librarian — explore then write

`scripts/lib/corpus-librarian/pipeline.js`:

```text
tools explore → evidence packet → synthesizer
```

Passages first, concepts later — the opposite of Conceptual Gravity’s `Question → Concept → Source`.

### WhatsApp inbound — a transport loop

`pipeline.js` is a correct **channel** loop (admit message, policy, draft, gate). It is not a reasoning loop. It currently calls Guide or the librarian as if they were “the mind.”

### Governed step harness — the closest miss

`governed-harness.js` is important. It got authorization, bounds, and a uniform capability registry right.

Its scheduler is still:

```text
while (budget)
  step = reasoner.nextStep(state)
  authorize / execute
```

That inverts the event loop. The **model** chooses among `reason | capability_call | answer | clarify | stop`. The kernel only says whether that choice is allowed.

So:

- the model can skip orientation;
- the model can answer before living evidence;
- a continuation is a stop kind, not the normal way judgment enters the queue;
- `AGENTS.shared.md` can only influence the system prompt of `openai-step-reasoner.js`, not the dispatch order.

Authorization of *acts* is not the same as scheduling of *reasoning kinds*.

## The proposed kernel

Isolated in `scripts/lib/reasoning-loop.js`. Not wired to Guide or JHN yet.

```text
prologue (AGENTS.shared projection)
  → enqueue session.prologue, mandate.bind, privacy.view,
            language.select, packet.admit, need.classify

loop:
  dequeue by phase (prologue → admit → classify → orient → evidence
                    → governance → judgment → act → terminal)
  match handlers for that event kind
  handlers may enqueue further events
  a handler may pause with a continuation (judgment boundary)
  answer.propose is not dispatched while earlier blocking events remain
```

Invariants of the kernel:

1. **The kernel never calls a model.** A model is a handler for `judgment.required` (and similar), registered from the outside.
2. **Blocking events in earlier phases starve later ones.** Orientation cannot be skipped because a handler eagerly enqueued `answer.propose`.
3. **Unhandled blocking events pause**, they do not invent an answer.
4. **Continuations are pauses**, not errors.
5. **Unknown event kinds fail at construction**, they are not forwarded to an LLM to interpret.

## Prologue

`sharedAgentsPrologue()` is the operational projection of the Read order in `AGENTS.shared.md`:

1. this shared layer;
2. continuations / packets briefing;
3. nearest `AGENTS.md`;
4. monotonic composition;
5. source documents when operational rules cannot settle the question;
6. `continuation-handling` on packet/continuation stops.

Classification then enqueues, when the need matches:

- `orientation.required` — Conceptual Gravity (`Question → Concept → Source`);
- `living_evidence.required` — leave the current frame when the question demands it;
- `open_possible.check` — exploratory / architectural needs;
- `measured_risk.check` — before acts.

Not every invariant fires every turn. Like the JS engine, only events that *happen* are dispatched. The prologue makes the *possibility* of those events part of the runtime, not part of a prompt.

## What this is not

- Not a replacement for COP authorization, Fractanet routing, or Operium.
- Not a new ontology of concept relations.
- Not a requirement that every handler be an LLM.
- Not a migration of production Guide/JHN in this note. Wiring is a later, reversible adapter: register `corpus.orient`, retrieval, and a judgment handler; point `produceGuideTurn` / the WhatsApp draft at `createReasoningLoop().run()`.

## Reality test for the kernel itself

A turn about Kudocracy or leaving the Corpus must dispatch `orientation.required` (and living evidence when the wording demands it) **even if a rogue handler tries to answer at `packet.admit`**. That test lives in `scripts/test-reasoning-loop.js`. It does not yet prove Guide quality. It proves the scheduler is no longer the model.

## Tournament (do not overfit one kernel)

A frozen battery (`scripts/lib/reasoning-loop-battery.js`) scores *scheduler variants* (`scripts/lib/reasoning-loop-variants.js`). The independent variable is who chooses the next kind of work. Retrieval quality and prompts are held out.

Run:

```bash
node scripts/test-reasoning-loop-variants.js
```

Measured result (first run):

| Variant | Pass | What it is |
|---------|------|------------|
| `pipeline_guide` | 2/8 | Today's Guide-shaped stages. Control. |
| `next_step_greedy` | 1/8 | Governed-harness shape with a greedy reasoner. Control. |
| `fifo_queue` | 7/8 | Same events as the kernel, insertion order. Fails rogue skip. |
| `phase_queue` | 8/8 | Phase-ordered event loop. |
| `barrier_set` | 8/8 | Required-set drain before terminal. |
| `packet_switch` | 8/8 | Envelope-first; required list on the packet. |

What this actually shows:

1. **Pipelines and `nextStep` fail the prologue / orientation / continuation tests.** The diagnosis is not aesthetic.
2. **Events without a scheduler policy are not enough.** FIFO still lets an eager `answer.propose` run before `orientation.required`.
3. **Three winning kernels are equivalent on this battery.** Do not pick among phase / barrier / packet by score until a test exists that splits them. Packet-switch is the best *doctrinal* fit (Cognitive Packets already say envelope first). Phase-queue is the best *JS analogy*. Barrier-set is the smallest *policy* (must-handle set, order not doctrine).

Do not add `orientation.required` as a hardcoded stage inside `pipeline_guide` just to turn that row green. That would hide the scheduler failure.

## Next wiring (only after this kernel is accepted)

1. Handler: `orientation.required` → `corpus.orient`.
2. Handler: `living_evidence.required` → bounded external search, or an explicit `external_required` continuation.
3. Handler: `judgment.required` → existing step reasoner **as a handler**, not as the loop.
4. One Guide or JHN surface switched behind a flag.
5. Keep the old pipeline until a Reality Test on the same five orientation questions plus ordinary chat shows the loop is not worse.
