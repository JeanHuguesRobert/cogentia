---
title: "Packet Closure Closed(p,h,E) & Durable Cross-Process Continuation Transport — F3 Reality Test"
description: "Experimental validation of autonomous serialization, process death resilience, and evaluated relational closure Closed(p,h,E) for Cognitive Packet continuations."
author: "Jean Hugues Noël Robert, baron Mariani / Grok (xAI) / Antigravity"
affiliation: "Institut Mariani / C.O.R.S.I.C.A. / Cogentia"
date: "2026-08-31"
last_modified_at: "2026-08-31"
license: "CC BY-SA 4.0"
language: "en"
version: "1.0"
status: "conformed"
document_role: "report"
document_kind: "architectural-report"
visibility: "public"
lifecycle_state: "active"
update_policy: "UP-DEFAULT-REVIEWED"
related:
  - "level2_continuation_scheduler_r1b.md"
  - "cognitive_packet_closure_and_packet_native_semantics.md"
  - "documents_as_cognitive_packets.md"
  - "../docs/continuations_and_cognitive_packets_for_agents.md"
  - "../scripts/lib/packet-capsule.js"
  - "../scripts/test-continuation-closure-f3.js"
---

# Packet Closure $\text{Closed}(p, h, E)$ & Durable Cross-Process Continuation Transport (F3 Reality Test)

> **GitHub Issue #128 Resolution Report**  
> Direct successor to Level-2 Continuation Scheduler exploratory note R1-B ([`research/level2_continuation_scheduler_r1b.md`](./level2_continuation_scheduler_r1b.md)), Reality Test F1 (Governed Step Harness & Required Events), and Reality Test F2a (OR Choice Point & pure Frontier projection).

---

## 1. Executive Summary

In Reality Test **F2a**, the exploration scheduler and continuation resumption were demonstrated across coexisting branches within a single shared memory heap. F2a deliberately postponed evaluating **Packet Closure** ($\text{Closed}(p, h, E)$) and cross-process durability.

**Reality Test F3 resolves this foundational gap.**

F3 proves that:
1. Cognitive continuations can be packaged into **self-contained, content-addressed capsules** with zero implicit dependency on process RAM or author session state.
2. An emitting process can terminate (**Process Death**) without corrupting or invalidating the continuation.
3. A distinct process and admissible handler ($h$) operating in a compatible environment ($E$) can evaluate cryptographic and relational closure ($\text{Closed}(p, h, E) = \text{true}$), materialize the continuation, and complete the cognitive turn with **strict causal and surface accounting continuity**.
4. Incompatible handlers or environments are rejected *prior to execution* with structured diagnostic failure codes, distinguishing **declared closure** from **evaluated closure**.

---

## 2. The 3 Reality Questions & Experimental Answers

| Reality Question | Experimental Finding | Verification Mechanism | Status |
| :--- | :--- | :--- | :---: |
| **Q1. Can a suspended continuation (`cop/continuation`) be serialized autonomously without hidden RAM state?** | **YES.** All necessary state (causal frontier, step receipts, observations, required event receipts, surface accounting, handler profiles, and dependency references) is serialized into canonical JSON encapsulated inside an immutable content-addressed capsule (`cogentia.continuation_capsule/v1`). | `test("1 — Autonomous serialization")` & `test("2 — Integrity")` | **PASS** |
| **Q2. Can the emitting process terminate (`process death`) without corrupting resumption?** | **YES.** Process 1 executes Turn 1 slice (1 tool call + orientation discharge), encapsulates the continuation to a disk file (`.cpkt`), and terminates via `process.exit(0)`. Process 2 starts with zero shared memory, reads the capsule from disk, and resumes Step 2 successfully. | `test("4 — Process Death Reality Test")` | **PASS** |
| **Q3. Can a distinct handler ($h$) and environment ($E$) evaluate $\text{Closed}(p, h, E)$ and resume with causal/accounting continuity?** | **YES.** Relational closure $\text{Closed}(p, h, E)$ is evaluated. When closed, Process 2 resumes from Step 1 observation without re-running orientation. Cumulative surface accounting is strictly monotonic ($1 + 0 = 1$ cost units). Inadmissible handlers are rejected before execution. | `test("3 — Relational Closure")` & `test("5 — Inadmissible cross-process handler")` | **PASS** |

---

## 3. Mathematical & Relational Formulation: $\text{Closed}(p, h, E)$

As defined in [`research/cognitive_packet_closure_and_packet_native_semantics.md`](./cognitive_packet_closure_and_packet_native_semantics.md):

$$\text{Closed}(p, h, E) = \text{Integrity}(p) \land \text{ProtocolCompatible}(p, E) \land \text{HandlerSatisfied}(p, h) \land \text{EnvironmentSatisfied}(p, E) \land \text{BudgetViable}(p)$$

Where:
* $p$ = Continuation Packet / Capsule
* $h$ = Admissible Handler Profile (declaring available capabilities $\mathcal{C}_h$ and required event handlers $\mathcal{E}_h$)
* $E$ = Shared Execution Environment (declaring supported protocols $\mathcal{P}_E$, store resolvers, and file root)

### Evaluation Rules

```text
1. Integrity(p):
     hash(canonical_payload(p)) == p.content_sha256
     hash(capsule_text(p)) == p.capsule_sha256

2. ProtocolCompatible(p, E):
     p.protocol ∈ E.supportedProtocols

3. HandlerSatisfied(p, h):
     p.handlerProfile.requiredCapabilities ⊆ h.capabilities
     p.handlerProfile.requiredEventHandlers ⊆ h.supportedEvents

4. EnvironmentSatisfied(p, E):
     ∀ file ∈ p.dependencies.files : E.resolveFile(file) == true
     ∀ store ∈ p.dependencies.stores : E.resolveStore(store) == true

5. BudgetViable(p):
     p.accounting.remainingBudget.maxSteps > 0
     p.accounting.remainingBudget.maxCostUnits > 0
```

### Declared Closure vs Evaluated Closure

A critical architectural distinction verified in F3:
* **Declared Closure:** Frontmatter metadata where the producer asserts `closure: { state: "closed", admissible_environment: "cogentia-v3-runtime" }`.
* **Evaluated Closure:** Relational verdict computed at materialization time by `evaluatePacketClosure(p, h, E)`.

A packet that asserts `state: "closed"` but is handed to a handler lacking required capabilities (e.g. `corpus.search`) yields:
```json
{
  "ok": false,
  "closed": false,
  "declared_closure": { "state": "closed" },
  "evaluated_closure": { "handler_compatible": false },
  "missing": { "capabilities": ["corpus.search"] },
  "error": "incompatible_handler: missing [corpus.search]"
}
```

---

## 4. End-to-End Cross-Process Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           PROCESS 1 (Emitter)                           │
│                                                                         │
│  Turn Input: "How do Kudos affect Cognitive Packet routing?"            │
│    ↓                                                                    │
│  [Orientation Required Event] → Discharged (Receipt stored)             │
│    ↓                                                                    │
│  [Reasoner Step 1] → capability_call: corpus.search("Kudos routing")    │
│    ↓                                                                    │
│  [Observation 1] → { excerpts: ["Kudos adjust routing priority..."] }   │
│    ↓                                                                    │
│  Step Budget Slice Reached (maxSteps: 1) → Turn Yields                  │
│    ↓                                                                    │
│  packContinuationToCapsule(continuation)                                │
│    ↓                                                                    │
│  Writes `continuation-slice1.cpkt` to disk (SHA-256 stamped)            │
│    ↓                                                                    │
│  PROCESS 1 TERMINATES (process.exit(0)) [Process Death]                 │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                             DISK / TRANSPORT
                         (No shared RAM / memory)
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                           PROCESS 2 (Receiver)                          │
│                                                                         │
│  Fresh Node.js Process Boot                                             │
│    ↓                                                                    │
│  Reads `continuation-slice1.cpkt` from disk                             │
│    ↓                                                                    │
│  evaluatePacketClosure(capsule, h_2, E_2) → Closed(p,h,E) == TRUE       │
│    ↓                                                                    │
│  materializeContinuation(capsule) → Reconstitutes initialState          │
│    - sequence: 1                                                        │
│    - costUnits: 1                                                       │
│    - observations: [OrientationResult, CapabilityResult]                │
│    ↓                                                                    │
│  [Reasoner Step 2] → Reads Observation 1 → Returns Answer               │
│    ↓                                                                    │
│  [Reviewer] → Answer Accepted                                           │
│    ↓                                                                    │
│  Turn Completed:                                                        │
│    - totalSteps: 2                                                      │
│    - cumulativeCostUnits: 1 (Step 1: 1, Step 2: 0)                      │
│    - orientationRunsInP2: 0 (No redundant orientation re-execution)     │
│    ↓                                                                    │
│  PROCESS 2 TERMINATES (process.exit(0)) [Success]                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Artifacts and Modules Implemented

### 1. `scripts/lib/packet-capsule.js`
* Added `packContinuationToCapsule(continuation, options)`
* Added `unpackContinuationCapsule(capsuleText, options)`
* Added `evaluatePacketClosure(packetOrCapsule, handler, environment)` (and alias `evaluateContinuationClosure`)
* Added `materializeContinuation(capsuleTextOrObject, handler, environment)`

### 2. `scripts/lib/agent-jhn-whatsapp/governed-harness.js`
* Added `options.initialState` and `authorization.initialState` support in `createGovernedHarness`
* Monotonic preservation of prior `sequence`, `costUnits`, `capabilityCalls`, `observations`, and `requiredEventReceipts`
* Avoidance of redundant orientation execution when resuming from a verified causal frontier

### 3. `scripts/test-continuation-closure-f3.js`
* Complete 5-part reality test suite verifying autonomous serialization, checksum tampering detection, relational closure evaluation, real cross-process transport across process death, and inadmissible handler rejection.

### 4. `scripts/test-packet-capsule.js`
* Expanded to 9 unit tests verifying document packing, continuation packing, unpack, tamper detection, and materialization.

---

## 6. Test Suite Results

```text
> node scripts/test-continuation-closure-f3.js

ok  - 1 — Autonomous serialization: continuation packs into self-contained capsule without RAM references
ok  - 2 — Integrity: detects corrupted or tampered continuation payload
ok  - 3 — Relational Closure: evaluates Closed(p,h,E) across valid and invalid handlers/environments
ok  - 4 — Process Death Reality Test: Process 1 yields -> dies; Process 2 materializes -> completes turn
ok  - 5 — Inadmissible cross-process handler is rejected before execution

All 5 F3 Reality Tests passed successfully!
```

---

## 7. Next Milestones

With **F1** (Governed Step Harness & Required Events), **F2a** (OR Choice Points & Frontier Projection), and **F3** (Packet Closure $\text{Closed}(p, h, E)$ & Cross-Process Transport) fully verified and conformed:

1. **F4 (Cross-Node Transport & Ithaca Return):** Transporting continuation capsules over network boundaries (e.g. mesh/Tailscale node-to-node) with mutual cryptographic attestation.
2. **Shared Evidence Across Sibling Branches:** Causal mechanism for sharing verified immutable receipts across sibling exploration branches on the Continuation Frontier.
3. **Continuous Monte Carlo Audit Integration:** Connecting the Level-2 Continuation Frontier with background Monte Carlo exploration and sleep cycles.
