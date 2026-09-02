---
title: "R1 Level-2 evidence residue — proved / overclaimed / still open"
description: "Code review of F2a, F3, F4 and the Antigravity resumption test against the R1 closure claims. Not a reopening of #123 as a project."
author: "Grok (xAI) — residue after R1 closure, for Jean Hugues Noël Robert"
affiliation: "Institut Mariani / C.O.R.S.I.C.A. / Cogentia"
date: "2026-09-02"
last_modified_at: "2026-09-02"
license: "CC BY-SA 4.0"
language: "en"
version: "0.2"
status: "working-note"
document_role: "source"
document_kind: "audit-report"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
related:
  - "r1_level2_scheduler_closure.md"
  - "level2_continuation_scheduler_r1b.md"
  - "packet_closure_f3_reality_test.md"
  - "continuation_convergence_f4_reality_test.md"
  - "reasoning_loop_archaeology.md"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/123"
  - "https://github.com/JeanHuguesRobert/cogentia/pull/143"
---

# R1 Level-2 evidence residue

This note is **not** a bid to reopen Cogentia #123 as a scheduler project. It is a residue record after R1 was closed (`6a3cc79`, PR #143) so Rossignol (#144) and later work treat Level 2 as a **working hypothesis with named holes**, not as a fully proven runtime.

Inspected revision: `origin/main` at `6a3cc79`. Re-run 2026-09-02 in a detached worktree (`handoffs/worktrees/cogentia-r1-residue`). The Rossignol working tree has diverged (different evidence APIs, extra harness `sharedEvidence` import); that drift is **not** F3/F4 evidence.

### Runs at `6a3cc79`

| Command | Result |
| --- | --- |
| `node scripts/test-continuation-frontier-f2a.js` | 7/7 pass |
| `node scripts/test-continuation-closure-f3.js` | pass |
| `node scripts/test-continuation-convergence-f4.js` | pass |
| `node scripts/test-continuation-frontier-resumption.js` | 1/1 pass |

Passing is not the same as proving the claim. Two probes on the same revision:

```text
executeFundedBranch(A, { ok: false, stopReason: "step_budget" })
  → A.viability === "exhausted"

fresh harness.run after a maxSteps:1 slice (same orientation handler object)
  → orientation count 1 then 2; second-run observations are [orientation_result]
```

The resumption test therefore **passes while orientation re-fires**. F3’s process-death path is the one that actually keeps `orientationRuns === 0`.

## Discriminants

| Claim | Status | What the merged code actually tests |
| --- | --- | --- |
| F1/F1.2: required events before unrestricted `nextStep`; capability path unified | **Proved** (provisionally, as before) | `test-agent-jhn-f1-required-events.js` + harness. Not re-litigated. |
| F2a: OR branches coexist; funded ≠ runnable; success obsoletes sibling without running it; fallback after failure; replay | **Proved** | `test-continuation-frontier-f2a.js`. Choice Point is a Cogentia fact, not COP/Core. |
| Yield / `step_budget` ≠ exhausted | **Still open** in the F2a executor | `executeFundedBranch` still appends `branch_exhausted` on any `!ok`, including `step_budget`. F3 does **not** go through that executor. |
| Antigravity “resume A without re-running orientation / step 1” | **Overclaimed** | `test-continuation-frontier-resumption.js` starts a **new** `harness.run()` with no capsule / `initialState`. It never asserts orientation-run count after the second slice. `snapshot.observations.length > 0` can pass because orientation **re-fires**. Still cited by the R1-B note. |
| F3: emitter process death; resume from checksummed capsule | **Proved** (same machine, same tree) | `test-continuation-closure-f3.js` `spawnSync`s `--emit`, then parent reads only the capsule file. |
| F3: orientation not re-run on resume | **Proved** (in F3’s harness path) | Resume harness asserts `orientationRuns === 0`. Skip rule: if `initialState` already has receipts **or** `sequence > 0`, `pendingRequired = []`. |
| F3: `Closed(p,h,E)` evaluated, not merely declared | **Proved, narrow** | Integrity (payload SHA-256), protocol, required capabilities/events, declared environment id, listed files exist, remaining budget `> 0`. Fails closed on tamper, missing capability, missing file, wrong environment id. |
| F3: remote-node / foreign-host trust | **Not claimed by F3 note; not proved** | Child and parent share `cwd` and the Cogentia tree. Handler is a new in-process harness, not another host. |
| F3: closure accounting binds the resume budget | **Overclaimed if read as binding** | Capsule stores `remainingBudget`; resume `run()` passes **fresh** `{ maxSteps: 2, … }`. Closure check is not what the second loop uses. |
| F4: share verified evidence by causal parent event, not by copy | **Proved as projection** | `publishVerifiedEvidence` + `shareEvidence` record `parentEventIds`. Recipients get `{ evidenceId, parentEventIds }`, not a duplicated receipt object. |
| F4: that sharing is a live F1 orientation computed once then reused by funded harnesses | **Overclaimed if read that way** | The test increments a **local** `orientationComputations` counter and never calls `createGovernedHarness`. `execute()` returns synthetic `{ ok: true/false }`. |
| F4: AND/quorum join with exhausted residue + replay | **Proved as projection** | Three-branch AND, quorum 2, C exhausted, join records `succeededRefs` / `residueRefs`, `projectFrontier` is deterministic. |
| F4: merge of remote evidence stores / multi-node consensus | **Not claimed; not proved** | Explicit in the F4 note. |
| #123 isolation: A–D Branch Records before synthesis | **Process miss** | Issues #134–#137 are still open without records. Closure used trajectory E only. |
| COP/Core Level-2 contract (Inseme §5.5.6) | **Specified, not executed here** | Inseme PR #60. Cogentia tests still use continuation-**shaped** v2 objects and a Cogentia fact log, not instantiated `cop/continuation` artifacts. |

## What this means for Rossignol / later work

Safe to reuse as working machinery:

- one-continuation governed loop (F1.2);
- OR Frontier projection + explicit funding (F2a);
- capsule pack / `evaluatePacketClosure` / `materializeContinuation` + harness `initialState` (F3);
- AND/quorum **fact** join + evidence **references** (F4).

Do **not** assume, without a further Reality Test:

- parking a frontier branch on `step_budget` and later `executeFundedBranch` (it would mark the branch exhausted);
- the Antigravity resumption file as proof of pause/resume;
- F4 as “siblings skip orientation because they saw a shared receipt in the harness”;
- live Guide/WhatsApp V2 (PR #143 already withholds that).

Smallest honest next tests, if anyone funds them (not required to close R1 again):

1. `executeFundedBranch`: `stopReason=step_budget` → viability stays `live`; only terminal failure/exhaustion maps to `exhausted`.
2. F4 + real harness: one orientation handler run, published as evidence, two funded siblings resume with that receipt and `orientationRuns === 1` globally.
3. Keep F3’s process-death test; do not rename it remote-node.

## Rossignol-tree drift (local, 2026-09-02)

The `feat/rossignol-runner-issue-141` working tree no longer matches `origin/main` F4 APIs (`publishVerifiedEvidence` / `shareEvidence` / `joinChoicePoint` / fact `id`). It adds `createDurableFactLog`, `evidence_published`, AND `satisfied` viability, and harness import of `sharedEvidence` as fake required-event receipts. That may be useful for the watch runner; it is a **second** implementation, not extra proof of the merged F4 test. Do not cite the Rossignol tree as F3/F4 closure evidence.
