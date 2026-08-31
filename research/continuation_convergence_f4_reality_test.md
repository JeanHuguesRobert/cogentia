---
title: "F4 Reality Test: Causal Evidence Sharing and Multi-Branch Convergence"
date: "2026-08-31"
status: "working-reality-test"
document_role: "source"
document_kind: "test-report"
visibility: "public"
lifecycle_state: "active"
language: "en"
update_policy: "UP-DEFAULT-REVIEWED"
related:
  - "level2_continuation_scheduler_r1b.md"
  - "../scripts/test-continuation-convergence-f4.js"
---

# F4 Reality Test: Causal Evidence Sharing and Convergence

F4 extends the F2a frontier projection without turning it into a scheduler. A verified orientation receipt is published once as an immutable fact, then shared with sibling branches through its event id. Each share records `parentEventIds`; it does not duplicate or mutate the receipt.

The test opens a three-branch `AND` frontier with quorum two. Two branches succeed, one is exhausted, and a deterministic join records the synthesis together with the exhausted branch as explicit residue. Replaying the append-only facts reconstructs the same projection.

This proves causal reference sharing and bounded AND/quorum convergence. It does not authorize execution, merge remote evidence stores, or claim universal multi-node consensus.
