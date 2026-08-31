---
title: "F3 Reality Test: Packet Closure and Durable Cross-Process Continuation"
date: "2026-08-31"
status: "verified-reality-test"
document_role: "source"
document_kind: "test-report"
visibility: "public"
lifecycle_state: "active"
language: "en"
update_policy: "UP-DEFAULT-REVIEWED"
related:
  - "level2_continuation_scheduler_r1b.md"
  - "cognitive_packet_closure_and_packet_native_semantics.md"
  - "../scripts/test-continuation-closure-f3.js"
---

# F3 Reality Test: `Closed(p,h,E)`

Issue #128 tests a narrower claim than F2a: a paused `cop/continuation` can be transported without retaining emitter RAM, and a compatible independent handler can resume it.

## Method

`scripts/test-continuation-closure-f3.js` starts a separate Node emitter. The emitter completes its required orientation event and one governed `corpus.search` step, serializes the causal frontier, receipts, accounting, handler requirements, protocol, and declared dependencies into a checksummed continuation capsule, writes that capsule, and exits.

The parent process then creates a fresh registry and harness. It evaluates `Closed(p,h,E)` against capsule integrity, protocol support, handler capabilities/events, filesystem dependencies, and remaining accounting; only then does it materialize the fresh harness state from the capsule.

## Observed assertions

1. The emitting process exits successfully before any resume occurs.
2. The new process resumes from the capsule with the original observations, step record, and required-event receipt.
3. Orientation is not run a second time; the prior receipt is causal residue, not hidden runtime state.
4. Cumulative step and cost accounting are retained (`1` completed capability step before resume; the resumed answer reaches step `2` without a further capability cost).
5. Closure fails closed for a tampered payload, missing handler capability/event support, or an unsatisfied declared filesystem dependency.

## Boundary

Passing F3 establishes durable transport and materialization relative to the supplied handler and environment. It does not grant capability authorization, execute an unfunded continuation, prove remote-node identity, or make a declared closure universally runnable. `Closed(p,h,E)` remains relational and evaluated at materialization time.
