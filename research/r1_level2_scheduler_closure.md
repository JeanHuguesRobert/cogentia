---
title: "R1 Closure: Level-2 Exploration Scheduler"
date: "2026-09-01"
status: "closure-report"
document_role: "source"
document_kind: "architectural-report"
visibility: "public"
lifecycle_state: "active"
language: "en"
update_policy: "UP-DEFAULT-REVIEWED"
related:
  - "level2_continuation_scheduler_r1b.md"
  - "packet_closure_f3_reality_test.md"
  - "continuation_convergence_f4_reality_test.md"
  - "agent_john_reasoning_loop_v2_surface_integration.md"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md"
---

# R1 Closure: Level-2 Exploration Scheduler

R1 establishes a bounded, replayable exploration layer between COP’s event/wake scheduler and the
governed reasoning loop. It is not a new authority plane, workflow engine, or hidden agent memory.

## Provenance and observed results

| Stage | Reality result | Durable evidence |
| --- | --- | --- |
| F1/F1.2 | Required events are dispatched before unrestricted steps; capability authorization and budgets remain kernel-enforced. | `scripts/test-agent-jhn-f1-required-events.js`, `scripts/test-agent-jhn-governed-harness.js` |
| F2a | OR branches coexist as a pure Frontier projection; allocation is separate from readiness and viability. | `scripts/test-continuation-frontier-f2a.js` |
| F3 | A checksummed continuation survives emitter process death and materializes only under compatible `Closed(p,h,E)`. | `scripts/test-continuation-closure-f3.js` |
| F4 | Shared evidence is causally referenced once; AND/quorum joins preserve exhausted residue. | `scripts/test-continuation-convergence-f4.js` |
| Surface bridge | Agent John owns a reversible V2 loop; Guide and WhatsApp are derived projections with legacy fallback. | `scripts/test-agent-jhn-reasoning-loop-v2.js`, `scripts/test-guide-reasoning-loop.js`, `scripts/test-whatsapp-reasoning-loop-v2.js` |

## Canonical contract

The formal reusable contract is now proposed for Inseme COP/Core Architecture §5.5.6. It separates:

```text
Level 1 — COP event delivery, ordering, ticks and wake conditions
Level 2 — replayable Frontier, explicit funding, OR/AND/quorum convergence
Level 3 — bounded governed Handler execution
```

Agent John is the Cogentia Personal Digital Twin runtime. Guide and WhatsApp are constrained
surface projections, not independent cognitive identities. The V2 flag is intentionally opt-in;
live activation requires a separate Operium-governed deployment observation and rollback check.

## Non-claims and residue

This closes the smallest tested scheduler contract for Cogentia Issue #123; it does not canonize
Convergence as doctrine or authorize a large scheduler implementation. In particular, R1 does not
prove remote-node trust, universal consensus, effective independence scoring, remote evidence-store
replication, or authorization for external effects. The Guide bridge still retains legacy planner,
web-evidence, and provider-synthesis implementations behind governed capability boundaries. Their
deeper decomposition and the bounded diversity-versus-coupling reality test remain future work,
not a closure claim.
