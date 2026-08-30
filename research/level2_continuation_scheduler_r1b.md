---
title: "Level-2 Continuation / Exploration Scheduler — R1-B Implementation Note"
description: "Implementation-first exploration of the smallest useful Level-2 Continuation / Exploration Scheduler for COP."
author: "Jean Hugues Noël Robert, baron Mariani / Grok (xAI) / Antigravity"
affiliation: "Institut Mariani / C.O.R.S.I.C.A. / Cogentia"
date: "2026-08-30"
last_modified_at: "2026-08-30"
license: "CC BY-SA 4.0"
language: "en"
version: "0.1"
status: "working-note"
document_role: "source"
document_kind: "architectural-report"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
related:
  - "reasoning_loop.md"
  - "reasoning_loop_archaeology.md"
  - "../instructions/AGENTS.shared.md"
  - "../docs/continuations_and_cognitive_packets_for_agents.md"
  - "../docs/agent-jhn-governed-step-harness.md"
  - "../scripts/lib/continuation-frontier-f2a.js"
  - "../scripts/test-continuation-frontier-resumption.js"
---

# Level-2 Continuation / Exploration Scheduler (R1-B)

Implementation-first exploratory analysis answering the question:
> **What is the smallest implementable Level-2 Exploration Scheduler that would provide useful new capability to COP?**

Inspected baseline revisions:
* `cogentia`: commit `4d1a504f15aa71cd11eaf367a4300ad77cfae27f` (F2a: OR Choice Point + Continuation Frontier Reality Test)
* `inseme`: commit `d97d7e7852e1b6b38ecc71acfd94235f17572840` (docs(cop): encapsulate session state in formal Cognitive Packet JSON)

---

## 1. Existing COP Substrate

The foundational substrate for Level 2 already exists across COP/Core and Cogentia. Level 2 does not invent an independent machine:

| Substrate Element | Concrete File & Symbol | Role in Codebase |
| :--- | :--- | :--- |
| **Continuation Descriptor (Spec)** | `inseme/packages/cop-core/Architecture.md` (§2.7, §5.5) | Canonical `type = "cop/continuation"` Artifact. Holds `state`, `conditions` (`waitForEvents`, `resumeAfter`), `handlerProfile`, `retry`. |
| **Continuation Construction** | `inseme/packages/cop-kernel/src/continuation.js` (`createContinuationDescriptor`) | In-memory message/artifact generator for suspended execution descriptors. |
| **Operational Continuation** | `cogentia/docs/continuations_and_cognitive_packets_for_agents.md` (`cogentia.continuation.v2`) | Protocol twin object holding `id`, `question`, `subject`, `context`, `payload`, `closure` metadata. |
| **Packet Lineage & Combinators** | `inseme/packages/cop-kernel/src/copComposition.js` (`copFork`, `copAll`, `copRace`) | Spawns child task packets with upstream/downstream lineage and Promise-like combinators over packet returns. |
| **Inner Reasoning Loop (Level 3)** | `cogentia/scripts/lib/agent-jhn-whatsapp/governed-harness.js` (`createGovernedHarness().run`) | Single-continuation bounded execution kernel (`maxSteps`, `maxCostUnits`, `maxElapsedMs`) with authorization, required-event discharge, receipts, and yield. |
| **Required Event Policy** | `cogentia/scripts/lib/required-events.js` (`requiredEventsForTurn`) | Inner prologue/orientation enforcement before reasoner step proposal (`packet_required_events`). |
| **Surface Accounting** | `cogentia/scripts/lib/cop-surface-accounting.js` | Monotonic spend tracking and cost settlement against execution limits. |
| **Frontier Fact Projection (F2a)** | `cogentia/scripts/lib/continuation-frontier-f2a.js` (`projectFrontier`) | Pure projection of append-only facts (`continuation_registered`, `choice_point_opened`, `allocation_decided`, `branch_run`) into live Choice Points. |

---

## 2. Minimal Missing Capability

### What COP Can Do Today
* **Level 1 (COP Scheduler / Completion Loop):** Detects when an event arrives, matches `waitForEvents` or timer ticks, and wakes runnable handlers in `topicSeq` order.
* **Level 3 (Reasoning Loop):** Advances **one** funded continuation until it completes, stops, or yields a continuation-shaped pause.
* **Combinators (`copComposition.js`):** Spawns subordinate child tasks (`copFork`) or joins packet returns (`copAll`, `copRace`).

### What COP Cannot Do (Missing Level 2)
1. **Represent Decision Bifurcation / Alternative Hypotheses (OR Choice Points):** `copFork` models parent-to-child delegated work (AND/Promise-like tree), not alternative mutually exclusive branches of exploration where succeeding in one renders sibling branches obsolete.
2. **Track Coexisting Possibilities without Immediate Execution:** Neither COP Level 1 nor the Level 3 harness has a concept of a **Continuation Frontier** where multiple alternatives remain live and addressable while scarce cognition is allocated to only one.
3. **Decouple Readiness from Cognition Allocation:** COP Level 1 equates *runnable* with *must-execute-next*. Level 2 requires distinguishing **Readiness** (`runnable` vs `waiting`), **Viability** (`live` vs `obsolete` vs `exhausted`), and **Allocation** (`funded` vs `unfunded`).
4. **Preserve Suspended Alternatives Across Context Switches:** When Branch A is suspended (due to step budget slice or waiting for external evidence), COP lacks a scheduler to park Branch A, fund Branch B, and later resume Branch A with its exact accumulated state and receipts intact.

---

## 3. Smallest Implementation

The smallest Level-2 Exploration Scheduler is an **append-only event projector paired with a deterministic allocation policy**.

```text
COP Level 1 Event / Completion Runtime (inbox, ticks, wake conditions)
        ↓
COP Level 2 Exploration Scheduler (pure frontier projection + allocation policy)
        ↓ [funds 1 branch]
COP Level 3 Governed Reasoning Loop (`createGovernedHarness.run`)
        ↓
Reality receipts / immutable facts
        ↓ [updates frontier projection]
Level 2 re-evaluates frontier (obsoletes, exhausts, or switches funding)
```

### Data Shape: Append-Only Facts & Frontier Projection

```javascript
// Facts appended to the COP log
[
  {
    protocol: "cogentia.f2a_fact/v1",
    type: "choice_point_opened",
    payload: {
      id: "cp-decision-1",
      mode: "OR",
      parentRef: "cont-parent-0",
      branchRefs: ["cont-branch-A", "cont-branch-B"]
    }
  },
  {
    protocol: "cogentia.f2a_fact/v1",
    type: "allocation_decided",
    payload: {
      choicePointId: "cp-decision-1",
      funded: ["cont-branch-A"],
      unfunded: ["cont-branch-B"],
      policy: "explicit"
    }
  },
  {
    protocol: "cogentia.f2a_fact/v1",
    type: "branch_run",
    payload: {
      continuationRef: "cont-branch-A",
      choicePointId: "cp-decision-1",
      stopReason: "step_budget_slice",
      resumptionState: { observations: [ /* ... */ ] },
      costUnits: 1,
      stepCount: 1
    }
  }
]
```

### Pure Derived Frontier (`projectFrontier`)

```javascript
{
  protocol: "cogentia.continuation_frontier.f2a/v1",
  continuations: { "cont-branch-A": { ... }, "cont-branch-B": { ... } },
  choicePoints: [
    {
      id: "cp-decision-1",
      mode: "OR",
      parentRef: "cont-parent-0",
      resolvedBy: null,
      branches: [
        {
          continuationRef: "cont-branch-A",
          readiness: "runnable",
          viability: "live",
          allocation: "unfunded",
          executionCount: 1,
          costUnits: 1
        },
        {
          continuationRef: "cont-branch-B",
          readiness: "runnable",
          viability: "live",
          allocation: "funded",
          executionCount: 0,
          costUnits: 0
        }
      ]
    }
  ]
}
```

---

## 4. Operations

### Required Operations (Minimal Slice)
1. **`fork` (`openOrChoicePoint`)**: Opens an OR Choice Point with $\ge 2$ alternative continuation branches linked to a parent reference.
2. **`pause` (`yieldContinuation` / `branch_run` fact)**: Inner Level-3 loop executes a funded budget slice and yields, preserving explicit resumption state in the continuation.
3. **`resume` (`fundAndRun`)**: Level-2 scheduler selects a `live + runnable` branch, marks it `funded`, and invokes the Level-3 `createGovernedHarness.run` with its saved resumption state.
4. **`drop` / `obsolete` (`or_objective_satisfied` / `branch_exhausted`)**:
   * If a funded branch succeeds, sibling branches transition viability $\to$ `obsolete` (retaining immutable residue for provenance).
   * If a branch fails or exhausts its budget without satisfying the objective, it transitions $\to$ `exhausted`, preserving untouched sibling alternatives as `live`.

### Explicitly Deferred / Rejected Operations
* **`backtrack`**: **REJECTED**. In an immutable event-sourced COP architecture, backtracking is an anti-pattern. State is never rewound. The scheduler simply allocates cognition to a different live continuation on the frontier.
* **`hibernate` / `wake`**: **DEFERRED**. Delegated to COP Level 1 (`waitForEvents`, `resumeAfter` in §5.5). Level 2 treats a branch as `readiness: runnable` or `waiting` based on Level 1 events.
* **`converge`**: **DEFERRED**. Multi-branch join synthesis (AND/DAG reduction) is not required for the minimal slice. OR resolution + residue preservation is sufficient.
* **`mcts_score` / `ucb_select`**: **DEFERRED**. Replaced by deterministic policies (`explicit`, `fallback-sequence`).

---

## 5. Reality Test

Implemented and verified in `scripts/test-continuation-frontier-resumption.js`:
* Branch A executes a 1-step slice and yields (`stopReason=step_budget_slice`).
* Level-2 scheduler switches funding to Branch B.
* Branch B fails / falsifies its hypothesis (`viability: exhausted`).
* Level-2 scheduler re-funds Branch A.
* Branch A resumes with its accumulated observations and completes successfully **without re-running step 1 or orientation**.
* Sibling branches maintain strict per-branch accounting and immutable residue.

---

## 6. COP Compatibility

1. **Inversion of Control (IoC):** The Reasoner is an effector proposing steps; it does not own the scheduler. The Continuation does not own the Exploration Scheduler.
2. **Pure Projection over Immutable Events:** The Frontier is derived by replaying append-only COP event facts.
3. **Reuses Existing COP Continuation Artifacts (`cop/continuation`):** Branches are standard continuation descriptors bearing state, handler profiles, and execution bounds.
4. **Preserves Monotonic Accounting and Lineage:** Every branch execution slice maps directly to a standard COP step execution receipt with `costUnits`, `stepCount`, and `parentEventIds` intact.
5. **No Ontology Proliferation:** Does not introduce new classes (`MCTSNode`, `AgentGraph`, `WorkflowEngine`).

---

## 7. Blind Spots & Future Explorations

1. **Non-Trivial Continuation Closure `Closed(p,h,E)`:** Testing cross-process / cross-node resumption without shared memory.
2. **Shared Evidence Across Sibling Branches:** Causal mechanism for sharing verified immutable receipts across sibling branches without re-running tools/orientation.
3. **Heuristic & Multi-Objective Scheduling Policies:** Value-of-cognition, uncertainty reduction, and Measured Risk exposure envelopes.
4. **Complex Topology & Join Convergence:** AND-branching, quorum joining, and speculative hedging.
5. **Asynchronous Reality Interrupts:** External Level-1 events invalidating dormant branches while another branch is running.
