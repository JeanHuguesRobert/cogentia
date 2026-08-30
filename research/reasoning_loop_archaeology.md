---
title: "Reasoning Loop archaeology — nested loops, existing pieces, smallest contract"
description: "Architectural report answering the ChatGPT/Grok-Build brief: map existing loops, test the two-loop hypothesis, do not add another kernel yet."
author: "Grok (xAI) — archaeology for Jean Hugues Noël Robert"
affiliation: "Institut Mariani / C.O.R.S.I.C.A. / Cogentia"
date: "2026-08-29"
last_modified_at: "2026-08-30"
license: "CC BY-SA 4.0"
language: "en"
version: "0.5"
status: "working-note"
document_role: "source"
document_kind: "architectural-report"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
related:
  - "reasoning_loop.md"
  - "../instructions/AGENTS.shared.md"
  - "../docs/agent-jhn-governed-step-harness.md"
  - "../docs/john-cli.md"
  - "measured_risk.md"
  - "operational_stance.md"
  - "cognitive_packets.md"
  - "conceptual_gravity.md"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/112"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md"
---

# Reasoning Loop archaeology

This note answers the brief in `reasoning-loop-grok-build.txt`: **architecture clarification and code archaeology, not a refactor.**

It also corrects an earlier Cogentia working hypothesis (`research/reasoning_loop.md` + `scripts/lib/reasoning-loop.js`): we analogized the Reasoning Loop to the JavaScript Event Loop. Against COP and the John/Guide code, **that analogy belongs to the outer loop**.

## Verdict in one page

ChatGPT’s nested-loop hypothesis **fits the existing architecture**. An addendum (2026-08-29) further splits the outer layer. Against the code, **three levels** are more accurate than two:

```text
1. EVENT / COMPLETION LOOP     COP Scheduler + ticks + wake conditions
                               (true JS event-loop analogue: what became runnable?)

2. CONTINUATION / EXPLORATION SCHEDULER
                               among live possible futures, which deserve cognition now?
                               (mostly MISSING; copFork/All/Race are Promise-like, not this)

3. REASONING LOOP              bounded run-to-yield on ONE funded continuation
                               observe → orient → propose one step → gate → execute
                               → receipt → verify local progress → continue | yield
```

Do not collapse (2) into (3). A chronological `while (nextStep)` cannot allocate across a frontier.

Do **not** reduce COP to “event wake/delivery only.” COP/Core is the **causal/resumable substrate**: events, parentage, packets, artifacts, continuations, wake/resume, replay, handler constraints, durable protocol state. The **Cognitive Scheduler policy** (which live future deserves scarce cognition) stays in Cogentia, above that substrate. COP correctly **refuses** to own the inner reasoning algorithm ([Architecture.md](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) §1.1, §3.5, §5).

The inner loop **does not yet exist as one primitive**. It is scattered:

| Piece | Where | Owns inner loop? |
|-------|--------|------------------|
| Propose one step | `openai-step-reasoner.js` `nextStep` | No — also *schedules kinds* |
| Loop + bounds | `governed-harness.js` `while (sequence < maxSteps)` | Partial — reasoner still chooses the kind |
| Gate | harness `authorize()` + `john.request.v1` envelope | Yes, for capability calls |
| Execute | capability `execute()` / Guide HTTP | Adapter |
| Receipt | harness observation; `john.tool.receipt` | Partial |
| Orient | `corpus.orient` (#122) | Not in the loop |
| Verify progress | `critiqueAnswer` (answer-core) | No — post-hoc answer lint, not step liveness |
| Yield | COP continuation doctrine; harness `clarify`/`stop` | Incomplete — no durable sleep/wake in the harness |
| Outer admit | `runJohnRequest` packet hops | Yes, John-specific projection of COP |

**Do not** merge the tournament kernels (`phase_queue` / `barrier_set` / `packet_switch`) into COP/Core. They are candidate *inner* schedulers for required cognitive events (prologue, orientation, living evidence) **before** a replaceable reasoner may propose a step.

The candidate definition in the brief is usable if we split “event-driven” to mean the outer COP loop:

> Inner Reasoning Loop — the governed, bounded, restartable cycle through which a LogicalAgent observes situated state, orients, proposes **one** cognitive step, submits consequential acts to authorization, records a receipt from Reality, evaluates whether useful progress occurred, and either continues, yields through a Continuation, escalates, or terminates.

Invariant (keep; already stated in `docs/agent-jhn-governed-step-harness.md`):

> The Reasoner proposes the next cognitive step; it does not own the loop, the authority, or the stopping budget.

Today the harness owns bounds and authority; **the reasoner still owns which *kind* of step is next**. That is the inner-loop defect. The Guide public turn does not even have that inner loop: it is retrieve → one completion.

---

## A. Existing implementation map

| Responsibility | File / function | Layer |
|----------------|-----------------|--------|
| Outer loop driver (packet admit → hop → handler → Ithaca) | `scripts/lib/john-run.js` `runJohnRequest` | John / Cogentia projection of COP |
| Outer ops scheduler (sleep cycle, not cognitive) | `scripts/lib/fracta-scheduler.js` `runFractaCycle` | Cogentia corpus ops |
| COP scheduler semantics (delivery, ticks, continuation scan) | inseme `cop-core/Architecture.md` §5.2 | COP/Core (spec; not this Node loop) |
| Inner loop driver | `scripts/lib/agent-jhn-whatsapp/governed-harness.js` `createGovernedHarness().run` | Cogentia kernel (lab) |
| Reasoner | `openai-step-reasoner.js` `nextStep`; test doubles in `test-agent-jhn-*.js` | Provider adapter |
| Step representation | `cogentia.agent_step/v1`, `cogentia.step_result/v1` in harness | Cogentia |
| Capability registry | harness `createCapabilityRegistry` | Cogentia |
| Authorization gate | harness `authorize`; `john.request.v1` mandate/budget/exposure; MCP mutate lockers | Cogentia + COP/Mandate |
| Execution | capability `execute`; Guide `produceGuideTurn`; librarian `answerWithLibrarian` | Guide / WhatsApp / librarian |
| Observation / receipt | harness `observations`; `john.tool.receipt` | Cogentia / John |
| Progress / completion | harness: `answer` + optional `reviewer`; answer-core `critiqueAnswer` (locale, citations, freshness warning) | **Missing as liveness** |
| Budgets | `john.request.v1` `execution_budget`; harness `maxSteps/maxCapabilityCalls/maxElapsedMs/maxCostUnits` | John + Cogentia |
| Continuations | CLI `cogentia.continuation.v2`; COP `cop/continuation`; harness `clarify` returns in-process, not a durable continuation | COP + Cogentia, **not wired through harness** |
| Retry | COP scheduler redelivery (spec); not in harness | COP |
| Wake-up / ticks | COP §5.2.4 ticks; FractaScheduler stages | COP / Cogentia ops |
| Sub-agent waiting | Agent-gateway REPL/expect-loop; john budget `max_subagents` unused in harness | Gateway / John contract |
| Accounting | `john.accounting.settled`; `cop-surface-accounting.js` | COP accounting projection |
| Trace | harness `steps[]`; john NDJSON events; Odyssey hops | John / Cogentia |
| Terminal state | harness `completed/stopped/clarification_required`; john `run.completed/failed/cancelled` | John + Cogentia |
| Guide public turn | `scripts/cogentia-mcp-http.js` `produceGuideTurn` | Guide |
| WhatsApp channel | `agent-jhn-whatsapp/pipeline.js` | WhatsApp adapter |
| Orientation | `scripts/lib/corpus-orient.js` | Cogentia capability, **not in any loop** |
| Tournament inner schedulers | `scripts/lib/reasoning-loop*.js` | Experiment only |

Layering in the brief **fits**:

```text
COP/Core          events, causality, packets, artifacts, scheduler, continuations, replay
COP/Mandate+Budget+Exposure   john.request.v1, lockers, accounting
Cogentia inner loop           not extracted yet (harness + required-event policy)
John / LogicalAgent           durable identity using the above
Reasoner adapters             OpenAI nextStep, later Grok/Claude/human/coding agents
```

Do **not** move a planning algorithm into COP/Core. Architecture §1.1 already: COP does not prescribe how handlers are implemented.

---

## B. State-machine reconstruction

### 1. Agent-JHN reasoner-driven Guide step loop (`ba9cf08`)

```text
createGovernedHarness({ registry, reasoner, reviewer }).run(input, authorization, limits)

state = { observations, steps, sequence=0, capabilityCalls, costUnits }

while sequence < maxSteps:
  if elapsed >= maxElapsedMs → STOP time_budget
  sequence += 1
  step = reasoner.nextStep(snapshot)     # KIND chosen here
  normalize step ∈ { reason, capability_call, answer, clarify, stop }

  reason           → record observation, continue
  answer           → reviewer(answer); if accepted COMPLETE else continue
  clarify          → TERMINAL clarification_required   (in-process, not COP continuation)
  stop             → TERMINAL reasoner_stop
  capability_call  → authorize(allowed, confirmed)
                     if denied: observation, continue
                     if budgets hit: STOP
                     execute() → observation (optionally redacted)
                     continue

STOP step_budget
```

Guide is **not** the loop. `guide-step-capability.js` is a `corpus.search` tool the reasoner may call. The production WhatsApp path still uses `produceGuideTurn` / librarian, not this harness (`docs/agent-jhn-governed-step-harness.md` “Current boundary”).

### 2. John headless COP packet loop (`7612d34`, #112)

```text
validate john.request.v1
packet = buildCognitivePacketFromJohnRequest
emit john.run.started
emit john.packet.admitted          # COP admission projection
emit john.capability.resolved
emit john.handler.started
hop: handler
  if mock → echo
  if governed_reasoner | step_reasoner | model
       → INNER harness.run(...)
       → for each capability_call: john.tool.requested + receipt|rejected
packet.yield = { semantic_yield, operational_yield }
hop: return Ithaca
emit john.accounting.settled
emit john.run.completed | failed
```

This **is** an outer loop (admit, hop, yield, account). The inner cognitive cycle is whatever the handler is. Continuations: `clarify` does not emit `cop/continuation` or sleep; the run ends in-process.

### 3. COP Scheduler / Continuation (spec)

```text
Events (at-least-once, topicSeq) → Projector (pure) → Store
Scheduler delivers Events to HandlerInstance.onEvent
Ticks MAY scan resumable continuations; ticks are not Events
Handler is stateless; durable state in Events/Artifacts/Store
Replay reconstructs structure; does NOT re-run LLM/human
Continuation: yield, resume when condition Events arrive
```

This **is** the JS-event-loop analogue: external events, handlers, no busy-wait, sleep/wake.

### 4. Guide public turn (production mind)

```text
cache? → parse intent → (optional plan) → retrieve → optional web
      → one LLM completion → answer
```

No inner loop. No orientation event. `AGENTS.shared.md` is prompt-shaped if present at all.

### 5. Measured Risk (doctrine loop, not a runtime)

```text
objective → uncertainty → exposure → recovery → principals
         → mandate → act → observe Reality → adapt → assimilate
```

Must **compose** with both loops, not be copied into a second risk engine.

---

## C. Convergence analysis

| Mechanism | Classification |
|-----------|----------------|
| COP Event / Artifact / Continuation / Scheduler | generic primitive — **outer loop**; do not fork |
| `john.event.v1` stream | John-specific **projection** of COP Events |
| `cogentia.agent_step/v1` | Cogentia inner-step vocabulary; keep out of COP/Core |
| `reasoner.nextStep` | provider-shaped adapter that currently **usurps** inner scheduling |
| harness `authorize` | same concept as COP capability gate; John-specific implementation |
| Guide `produceGuideTurn` | John/Guide policy pipeline; **not** a loop |
| `critiqueAnswer` | same *name family* as Verifier; **different concept** (answer lint vs progress) |
| `corpus.orient` | inner **ORIENT** step/event; currently orphan capability |
| tournament `phase_queue` / `barrier_set` / `packet_switch` | experimental inner **required-event** policy; packet_switch names align with Cognitive Packets |
| tournament `pipeline_guide` / `next_step_greedy` | accurate models of current defects |
| FractaScheduler | generic primitive for **corpus ops**, not cognitive turns |
| Operational Stance | situation policy **above** the inner loop; not a scheduler |
| Human Attention Budget | budget dimension for adaptive inner budget; not implemented as loop input |
| DeepSeek Harness / Buzz / OpenClaw | study patterns (#112); adapters later, not COP core |

Same name, different concept: “scheduler” (COP event delivery vs Fracta sleep cycle vs our tournament phase scheduler). Prefer **COP Scheduler** for outer wake/delivery; **inner loop driver** or **cognitive cycle** for observe-orient-step.

---

## D. Smallest generic contract (after archaeology)

Do not introduce a new authority boundary. Do not replace packets or continuations.

Reuse names already in the corpus:

```text
ReasoningCycleState     situated observations, orientation packet, receipts, budgets
ReasoningStep           cogentia.agent_step/v1   (reasoner proposes)
StepResult              cogentia.step_result/v1  (kernel records)
Observation             receipt / Reality answer (artifact-worthy)
LoopDecision            continue | yield | wait | escalate | complete | fail | cancel
                        (yield/wait MUST map to cop/continuation, not in-RAM pause)
```

`branch` can wait; it is not needed in P0 of the contract.

Required inner cycle (one tick):

```text
OBSERVE     current packet + receipts + orientation (if already run)
ORIENT      if classification says corpus/governance need and not yet done
            → corpus.orient is a step/event, not an LLM mood
PROPOSE     reasoner.nextStep — only after blocking required events
GATE        mandate / budget / exposure / confirmation
EXECUTE     HandlerInstance
RECEIPT     immutable observation/event
VERIFY      progress evaluator ≠ reasoner
DECIDE      continue | yield (continuation) | complete | fail | escalate
```

The tournament result still applies **inside ORIENT/required events**:

- pipeline and greedy `nextStep` fail prologue/orientation/continuation tests;
- FIFO events without starvation still let an eager answer skip orientation;
- phase / barrier / packet are tied; **packet_switch is the best doctrinal fit** for required-event policy because COP/Cognitive Packets already say envelope first.

The inner reasoner remains replaceable. The inner **driver** (while-budget, required events, verify, yield) is Cogentia, not COP/Core.

Adaptive budget: keep `max_steps` as a ceiling. Contract MUST allow a later verifier to say “another step is not worth its cost” without inventing an optimizer now.

---

## E. Liveness / termination invariants (minimal)

These are **not** all hard errors. They are LoopDecision inputs.

1. **Bound**: `max_steps`, `max_tool_calls`, `max_elapsed_ms`, `max_external_effects` remain ceilings. Exhaustion → `fail` or `yield`, never silent continue.
2. **No busy-wait**: waiting on human, child, time, or missing capability → `yield` continuation, not another `nextStep`.
3. **No-op detection** (soft): same capability + same arguments N times; or N steps with identical observation hash → verifier may `escalate` / `yield` / `fail`.
4. **Described but not performed**: `kind=reason` notes that request a tool, followed by no `capability_call` → not automatically illegal (reason is allowed) but a liveness signal.
5. **False completion**: `kind=answer` without verifier-accepted completion condition → `continue` or `escalate`, not `complete` (harness already has a reviewer hook; it currently defaults to accept).
6. **Parent must not poll children**: child in flight → parent `wait`/`yield`, not extra LLM turns (OpenClaw lesson from #112; not implemented).
7. **Stale Reality**: if a receipt is older than a declared freshness need (`living_evidence`) → required event again, not reuse.
8. **Exposure envelope broken** → stop / damage-control (Measured Risk; do not duplicate).

`idle-qualification.js` is **machine** idle (load, RAM). Do not reuse it as cognitive liveness.

---

## F. Smallest Reality Test

**Do not** rewrite Guide, COP, or WhatsApp.

**Do not** treat `scripts/lib/reasoning-loop.js` as production inner loop until it is driven by the **existing harness tests**.

Candidate experiment (smallest that proves unification):

```text
Keep governed-harness.js as the inner driver (bounds, authorize, execute, receipts).
Before the first reasoner.nextStep:
  run required-event policy (packet_switch or phase_queue) for this turn
  so orientation / living-evidence / prologue cannot be skipped
After each capability_result:
  call a stub verifier (no-op except: repeated identical capability+input → stopReason=no_progress)
Yield: map harness clarify → emit continuation object in the result (shape only);
  do not persist COP store yet
Existing tests must still pass:
  scripts/test-agent-jhn-governed-harness.js
  scripts/test-agent-jhn-guide-step-loop.js
  scripts/test-john.js
Plus tournament battery still discriminating on pipeline vs kernel
```

Success: **same observable Guide-step-loop behavior** on the isolated test, **plus** a corpus question cannot `answer` before `orientation.required` even with a greedy reasoner.

Failure: if wrapping the harness breaks authorization or receipts, the abstraction is wrong — do not push it into John or Guide.

---

## Relationship of the loops (keep separate)

```text
Measured Risk / Operational Stance     situation policy (why this envelope)
        ↓
1. EVENT / COMPLETION LOOP             what became runnable? (COP Scheduler)
        ↓
2. CONTINUATION / EXPLORATION SCHEDULER
                                       which possible futures get cognition?
                                       (missing as policy; do not fake with nextStep)
        ↓
3. REASONING LOOP                      one funded continuation, run-to-yield
        ↓
Reality receipts                       artifacts/events
        ↓
Measured Risk update                   new exposure / learning / residue
        ↓
asynchronous frontier change           dormant branches may become obsolete
                                       without being executed
```

Overlaps to avoid:

- Do not put Measured Risk’s COMMIT/OBSERVE inside COP/Core as a planner.
- Do not put COP ticks inside `nextStep`.
- Do not put `corpus.orient` inside COP.
- Do not let Operational Stance become a step kind.

---

## Challenge to the brief’s candidate definition

The definition is **almost** right. Two corrections from the code:

1. **“Event-driven”** in that sentence should not mean “the inner cycle is an event loop.” Inner cycle is a **bounded run-to-yield**. Outer COP is event-driven.
2. **“Selects one bounded cognitive step”** must not mean the LLM selects among orientation / living-evidence / answer as peers. Required cognitive events are kernel-scheduled; the reasoner proposes among *authorized remaining* steps.

With those two corrections, the definition can be tested. It is **not** canonical yet.

## What not to do now

Exactly the brief’s non-goals, plus: do not keep generating tournament variants until a test splits phase / barrier / packet. Use **packet_switch** as required-event policy for the F experiment if a choice is needed; leave the other two in the tournament so they cannot silently rot.

Do not implement a continuation-frontier allocator because of the addendum. Leave room for it: ReasoningLoop operates on **one funded continuation**; a future Cognitive Scheduler allocates across many.

---

## G. Addendum — continuation frontier (answers)

Source: later brief in `reasoning-loop-grok-build.txt` (Continuation Frontier, Choice Points, Cognitive Scheduling). Inspected against `inseme/packages/cop-core/Architecture.md` §1.8 / §5, `inseme/packages/cop-kernel/src/copComposition.js`, and Cogentia `CONTINUATION_LIVENESS` in `scripts/cogentia.js`.

### Formulations — keep as testable, not canonical

| Claim | Against the code |
|-------|------------------|
| A Continuation captures a possible future computation | **Yes, COP §1.8** — suspended work + resume conditions. Cogentia v2 is the operational twin. |
| A Choice Point creates several possible futures | **Not represented.** `copFork` spawns a *child task packet* with lineage, not alternative hypotheses. |
| Continuation Frontier preserves live possibilities | **No.** Closest object is `continuation list` filtered by liveness (`alive` / `hibernating` / `closed`). A queue, not a frontier. The comment “continuations remain exploration-graph nodes forever; closed is not deletion” is the right *residue* instinct, not a scheduler. |
| Cognitive Scheduler allocates scarce cognition across that frontier | **Missing.** COP delivers runnable events in `topicSeq` order. The inner harness asks `nextStep`. Neither allocates among possible futures. |
| Reasoning Loop advances one or more selected possibilities until they yield | **One at a time, in-process, today.** “Or more” would be the missing allocator. Prefer: loop advances **one funded** continuation. |

The OS analogy (continuations ≈ processes, frontier ≈ population, scheduler ≈ allocation) is useful **as a boundary finder**. It must not become a second COP.

### The 15 questions

1. **Continuation graph?** COP has a **causal DAG of Events** (`parentEventIds`) and packet **lineage** (`upstream_packet_id` / `downstream_packet_ids`). Continuations are **individual artifacts**, not a graph of possible futures.

2. **Choice points?** Nowhere as a first-class object. Fork means child work, not OR-branch of hypotheses.

3. **`copFork` / `copAll` / `copRace` / `copSequence` / `copCascadeCancel`?** Implemented in **cop-kernel**, not COP/Core. They are **Promise-like packet combinators** (all, first+cancel, sequence, cascade cancel). They are *beginnings of a composition algebra*, **not** yet an algebra of cognitive exploration (`copQuorum`, `copFallback`, `copHedge` are proposed, not found in that file).

4. **Frontier?** No. Alive-continuation counts in FractaScheduler / views snapshot are load signals.

5. **Who runs next?** COP Scheduler: events that are **runnable**. John inner loop: **reasoner**. Guide: **scripted stages**. No exploration policy.

6. **Selection policy?** Chronological / runnable-first (COP); greedy model (harness); sequential stages (Guide). Not expected value, novelty, or Measured Risk.

7. **Reality reconfigures a dormant branch without resuming it?** **No.** Ticks can make a continuation *runnable* when wake conditions hold. They do not mark a sibling **obsolete** because new evidence contradicted its assumptions. That “The Real Responds → frontier changes → cognition reallocated” loop is doctrine-shaped (`Le Réel Répond`), not implemented.

8. **Shared evidence without breaking causality?** **Possible at the data model** (immutable Artifacts, cross-references, parentEventIds). **Not** a sibling-blackboard in the reasoning runtime.

9. **Explicit join/converge?** `copAll` joins *packet yields*. No `join(continuations)` that synthesizes surviving cognitive branches.

10. **Rejected branch residue?** Artifacts are immutable; cancelled packets carry `residue[]`; Cogentia does not delete closed continuations. There is **no** structured “failed hypothesis, reusable when X” lifecycle.

11. **State distinctions?**

    | Addendum | Today |
    |----------|--------|
    | waiting for an event | COP resume conditions; Cogentia `dormant` → liveness `hibernating` |
    | voluntarily dormant | **same bucket** as waiting (`dormant`) |
    | obsolete | **missing** |
    | cancelled | `cancelled` / `aborted` → `closed` |
    | exhausted | **missing** (budget stop is a harness `stopReason`, not a continuation status) |
    | completed | `resolved` / `completed` → `closed` |
    | runnable vs waiting | COP implicit; not a Cogentia status |

    Reconcile by **extending projections**, not a parallel state machine. `obsolete` / `exhausted` / `joined` would be Cogentia or COP/AI profile additions after need is shown.

12. **Richer policies without coupling to COP/Core?** Keep COP continuation = resumable computation + wake conditions. Put **frontier projection + allocation policy** in Cogentia (Cognitive Scheduler). Combinators stay cop-kernel. **Do not** put expected value into COP/Core.

13. **One continuation per ReasoningLoop?** **Yes.** Higher-level scheduler allocates among many. That is the better existing split than making the inner loop a multi-process OS.

14. **Two verifiers?** **Yes, conceptually.** Local progress (this continuation: did Reality move?) vs global value (is this continuation still worth cognition vs siblings?). Implement **only local** in F. Do not invent a global scoring function now.

15. **Reality Test with fork two continuations?** That would prove the *frontier*, not the *inner loop*. It is **F2**, after F1. F1 remains: wrap harness so greedy `nextStep` cannot skip orientation; stub local no-progress; `clarify` returns a continuation *shape*. Fork/preserve/resume would require packet lineage + a second funded run — larger than “do not expand implementation.”

### What the addendum changes in the contract

Inner `LoopDecision` should **not** be limited to continue / complete / fail. The **shape** should allow later:

```text
yield / wait          → COP continuation (already required)
fork(...)             → copFork lineage (exists as packet spawn, not choice-point)
join / fallback       → combinators exist as Promises, not frontier ops
mark-obsolete         → missing
discover-new-possible → Open-Possible skill; not a loop opcode yet
```

P0 of the inner loop still only needs: `continue | yield | complete | fail | escalate`. The type must not **forbid** fork/join later. That is “leave room,” not “implement the OS.”

### What not to do because of this addendum

- Do not treat `copRace` as cognitive exploration.
- Do not add a Prolog DFS.
- Do not put a multi-objective allocator in `governed-harness.js`.
- Do not duplicate continuation status in a new enum that ignores `CONTINUATION_LIVENESS`.
- Do not delay F1 until a frontier exists.

---

## H. ChatGPT ping-pong v3 — accepted refinements (no extra implementation)

Source: `reasoning-loop-grok-build.txt` 2026-08-29 09:02 (reply to Grok’s F: briefing).

**F1 is accepted in principle** (Strangler wrap of `governed-harness.js`). Repeated identical capability+input → `no_progress` is a **test heuristic**, not final doctrine. Legitimate retry when Reality changed, freshness expired, evidence incomplete, or an explicit retry policy applies. Eventual rule is closer to: same action + equivalent causal context + no observation delta + no retry justification.

**Do not canonize the name `packet_switch`.** Keep it in the tournament. Envelope-first *semantics* are accepted; “switch” will collide with switching continuation A vs B once a frontier exists. Better names later: `packet_required_events` / `packet_obligations`. Choose after F1.

**Orthogonal projections, not one bigger status enum.** Readiness/liveness ≠ viability (live/obsolete/exhausted) ≠ termination ≠ topology. **JOINED is a relation/event**, not a continuation state.

**Frontier transformation is an intent.** Reasoning may *propose* fork/wait/obsolete/join; Cognitive Scheduler + governance *realize*. P1 of the inner contract: `frontier_intents[]` on LoopDecision, not direct mutation of a global frontier. Do not implement the schema now.

**Frontier is a derived projection**, not a second canonical store. Basis: Events + Artifacts + Packets + Continuations + relations + Handler Profiles + environment + Closure facts + Reality.

### Continuation Closure — already in the Corpus

Do **not** invent `Closed(p,h,E)`. It is already a working source:

- `cogentia/research/cognitive_packet_closure_and_packet_native_semantics.md` v0.2  
  Packet Closure is **relational**: relative to a declared admissible-handler class `h` and shared environment `E`. Excludes hidden predecessor RAM; does **not** require universal zero-knowledge self-bootstrap.
- `cogentia/research/documents_as_cognitive_packets.md` (RT-001 arbitration)
- `barons-Mariani/research/jhn_architecture_packet_closure_addendum.md` (historical; integrated into JHN architecture v0.3)
- inseme#58 COP Packet Closure
- Runtime fragment: `scripts/lib/packet-capsule.js` — **declared** `closure:` metadata plus checksum integrity. It does **not** evaluate `Closed(p,h,E)`, HandlerProfile compatibility, environment satisfiability, or materializability. Declared closure metadata ≠ verified Packet Closure.

ChatGPT’s four-way split **matches** the closure paper’s table (§13):

| Question | Existing concept |
|----------|------------------|
| Internally valid? | integrity (packet schema / capsule checksum) |
| Can another declared admissible handler continue it without private RAM? | **Packet Closure** `Closed(p,h,E)` |
| Is this handler class compatible? | Handler Environment / admissibility |
| May it execute under mandate/budget/exposure? | authorization / governance |
| Is a wake condition true *now*? | runnable-now (COP scheduler) |

Possibility frontier ≠ materializable/executable frontier. Closure is a **constraint facet**, not a scalar score. It makes the frontier naturally **distributed**.

**F1 does NOT test Continuation Closure.** `clarify` → continuation-shaped yield is RAM-local. Later **F3** (after F1; distinct from F2 fork/preserve):

```text
run → yield → capture explicit state → materialize Closed(p,h,E)
→ emit durable packet/artifacts → original process may die
→ rematerialize on another compatible handler
→ resume with same causal/accounting identity
```

Use `packet-capsule.js` + the closure note as the starting substrate; do not invent a parallel closure dialect.

---

## I. F1 Reality Test (2026-08-30, ChatGPT delta v4)

**Boundary (implemented):** `createGovernedHarness` kernel-discharges `requiredEventsForTurn()` (`orientation.required` / `living_evidence.required` from `classifyNeed`) **before** unrestricted `reasoner.nextStep`. Policy name in observations: `packet_required_events` (not canonized as `packet_switch`). Bounds, authorize, execute, receipts unchanged. Production Guide/WhatsApp paths not modified.

**No-progress:** opt-in `noProgressHeuristic: true`. Second identical capability+input → `stopReason=no_progress`. Documented as an F1 heuristic only; legitimate repetition when Reality changed, freshness expired, evidence incomplete, retry authorized, or causal context changed.

**Clarify:** returns continuation-shaped yield with `f1_does_not_test_continuation_closure: true` and `closed: false`. Not durable, not `Closed(p,h,E)`.

**Tests run:**

| Suite | Result |
|-------|--------|
| `test-agent-jhn-f1-required-events.js` | 6/6 pass |
| `test-agent-jhn-governed-harness.js` | 10/10 pass |
| `test-agent-jhn-guide-step-loop.js` | 3/3 pass |
| `test-john.js` | pass |
| `test-reasoning-loop.js` | pass (defect wording updated) |
| `test-reasoning-loop-variants.js` | pass; pipeline 2/8 and greedy 1/8 still fail as controls |

**Contradiction found:** none architectural. The Guide-step-loop assertion omitted an already-sent `surface: "agent-john"` field; assertion aligned to current capability payload (not a Guide rewrite).

**Not in F1:** Cognitive Scheduler, frontier, Choice Points, `Closed(p,h,E)`, COP/Core changes, WhatsApp/Guide production paths.
