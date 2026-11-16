---
title: "FractaScheduler — Multi-Level Distributed Corpus Sleep Cycle"
description: "Architecture, CLI, MCP tools, and systemd automation for autonomous corpus maintenance and sleep cycle consolidation."
layout: default
nav_order: 8
date: 2026-08-26T00:00:00.000Z
last_modified_at: 2026-08-26T00:00:00.000Z
license: CC BY-SA 4.0
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/fracta-scheduler.md
document_role: operational
document_kind: documentation
visibility: public
lifecycle_state: active
author: "Jean Hugues Noël Robert, baron Mariani"
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "high"
---

# FractaScheduler

The **FractaScheduler** is the multi-level, distributed scheduling and maintenance engine of the Living Corpus (JHN Architecture).

It operationalizes the **Corpus Sleep Cycle**, automating convergence, issue ingestion, semantic mutation audits, continuation hygiene, and Views Store exports without requiring manual human oversight.

---

## 1. Principles & Measured Risk

FractaScheduler operates strictly under the **Measured Risk doctrine** (`research/measured_risk.md`):

* **Bounded Exposure**: Operations run locally in the Git sandbox and memory cache.
* **100% Recovery Paths**: Reversible state, deterministic tests, and immutable issue packets.
* **Attention Preservation**: Background agents do not interrupt humans with permission questions.
* **Boundary Escalation**: If an unrecoverable violation or hard authority boundary is crossed (e.g. blocking semantic mutation), the scheduler records a structured escalation rather than failing silently or hallucinating fixes.

---

## 2. The 6 Deterministic Stages

Each FractaScheduler run executes the following stages in sequence:

```text
1. corpus_convergence      -> Reach fixed-point across all 20 tracked repositories
2. semantic_mutation_audit -> Audit 1,850+ markdown docs against update policies
3. issues_sync             -> Ingest GitHub issues into immutable .cogentia/issues/ packets
4. continuations_hygiene   -> Maintain and count active continuation backlogs
5. views_export            -> Generate corpus-state.md, corpus-state.json and Views snapshot
6. git_hygiene_audit       -> Verify uncommitted/dirty states across the 20 repositories
```

---

## 3. Interfaces

### CLI Commands

```bash
# Check scheduler status, system load, and active signals
node scripts/cogentia.js scheduler status

# Run an autonomous maintenance cycle
node scripts/cogentia.js scheduler run --mode sleep

# Quick dry-run cycle
node scripts/cogentia.js scheduler run --mode quick --dry-run --json
```

### HTTP Daemon Routes

* `GET /api/cli/scheduler/status` : Returns current load, recommended mode, and corpus signals.
* `GET /api/cli/scheduler/run?mode=sleep&dryRun=false` : Triggers a maintenance cycle.

### MCP Tools

* `cogentia_scheduler_status` : Inspects load and running state from an agent session.
* `cogentia_scheduler_run` : Launches an autonomous cycle under an agent mandate.

### Agent Skill

* Declarative package at `skills/fracta-scheduler/SKILL.md` (`schema: cogentia.agent_skill/v1`).

---

## 4. Production Deployment (Operium / Systemd)

On the Fracta VPS, FractaScheduler is managed by systemd:

* **Service**: `systemd/fracta-scheduler.service`
* **Timer**: `systemd/fracta-scheduler.timer` (triggers daily at 03:00 UTC).


---

## 5. COP Distributed Work Frontier — opt-in pull (2026-11-16, Inseme #194)

The six historical **Corpus maintenance** stages are unchanged by default.
When a node explicitly supplies the `pullContinuations` hook to
`runFractaCycle`, its **existing FractaScheduler cycle** gains an additional
`cop_continuation_work_pull` stage after continuation maintenance, with at
most three dispatches per cycle (`max_steps=3`). In dry-run it performs
**zero dispatches**. This is **not** a second scheduler, message queue or
background service. Without a configured hook, existing CLI/HTTP/MCP
maintenance behavior does not silently dispatch cognitive work.

The reusable implementation is
`scripts/lib/continuation-pull.js` (`pullReadyContinuations`), which connects
existing components rather than replacing them:

1. `continuation-placement.js` projects candidate continuations by existing
   FractaRouting locality/capability/age rules, plus COP temperature for both
   the packet **and** its continuation. Parked/suspended/archived/deleted work
   is excluded from the read-only preview. It is not an effect authorization.
2. The configured host supplies the **actual handler resolver** and an
   independent `admit({continuation,packet_ref,handler_id,node})` decision
   with `granted:true` and `authorization_ref`. The adapter does not mint
   mandates, prove provider eligibility or infer identity from a profile.
3. The **existing COPScheduler** obtains the authoritative
   `EventStorePacketClaimCoordinator` claim (serialized with temperature under
   SQLite `BEGIN IMMEDIATE`). It rechecks admission before invoking the
   handler. The pull adapter does not maintain another claim registry.
4. After claim, an idempotent `dispatch_intent` event is committed on the
   continuation topic **before** invoking the handler. A valid
   `receipt_ref` and explicit `packet_status` are required to atomically
   append `dispatch_settled` and an ordinary COP
   `cop.continuation-dispatch/v1 handler_completed` child fact. On a crash
   after intent but before confirmed result, the continuation remains
   `needs_reconciliation`: it is NOT blindly reexecuted.
5. The already-existing `reconcilePacketParentContinuations` projects that
   child result into its parent. A `join_wait` and explicitly configured
   `parentJoinExecutor` can resume the parent through COPScheduler exactly
   once; otherwise results are retained without inventing parent decisions.

### Verification and limits

- Tests: `node --test scripts/lib/continuation-placement.test.js
  scripts/lib/continuation-pull.test.js` (no external provider effects).
- An actual FractaScheduler cycle processes two children, records two child
  results, triggers a declared `all` join and returns to the parent exactly
  once; a fresh process sees no work to repeat.
- Two independent Node processes competing over the same COP SQLite Store
  produce exactly one handler effect and one canonical result.
- Park/Resume remains **selective**; ambiguous effects are fenced; a mere
  matching capability declaration does not authorize a handler.
- All testing uses one authoritative journal, not replicated multi-master
  storage. The provider's own externally consequential effect requires its
  mandate/budget check and epoch verification at the actual effect boundary.
  A local handler that cannot safely interrupt an already-running remote
  operation must preserve its late receipt as residue.

**Production gap:** the source now supports the bounded drain, but live
FractaNodes must still configure trusted continuation snapshots, an actual
capable handler resolver and the existing COP mandate/budget admission
before enabling this optional hook. The historical Corpus scheduler must not
be treated as such an authority simply because it runs on the same node.

### Two-machine execution receipt — reality test, 2026-11-16

A test on Fracta2 used this **actual bounded FractaScheduler stage**, with
two previously registered children and a declared `all` join. The first
SHA-256 handler executed locally on Fracta2. The second handler executed a
PowerShell SHA-256 computation on the **ThinkPad Windows host** over the
existing authenticated SSH route. Each handler produced a host-identified,
cryptographically checked result and appended its *own canonical COP effect
receipt* before returning an explicit `receipt_ref` to the pull adapter.
COP recorded both child settlements and reentered the parent's actual
COPScheduler exactly **once**. A second FractaScheduler cycle executed no
further handler or parent continuation; the COP journal commitment audit
passed. Test-only journal: `/tmp/cop-real-remote-handler-194/journal.sqlite`.

This test proves a remote **handler** and a central authoritative COP Store,
not a remote deployment of the entire FractaScheduler on the ThinkPad. The
only mandate admission used was a clearly marked **isolated test fixture**
for harmless SHA-256 calculations. No production scheduler hook, autonomous
browser action, third-party communication or real Cognitive Packet was
activated by this test. Both a trusted continuation snapshot and real
mandate/budget verification still have to be configured for production.

**Cold-parent safety (FBF, Inseme #194):** the common COP parent reconciler now
stores late child notifications even while a parent is parked, but suppresses
all join, fallback and cancellation dispatch during that state. A later
explicit `Resume(parent)` releases only the parent's gate; its next tick
can reuse already returned child results and resume the parent's real
continuation once, with children still cold. The invariant is tested in both
Inseme's canonical parent join suite and Cogentia's pull integration tests.

### Production observation / two source stores (Inseme #194, 2026-11-16)

ONA's pre-existing `cps:chatgpt-return-reconcile` 60-second job now performs
an additional **read-only** production frontier projection after the normal
CPS work. It reads the **host-local Cogentia continuation SQLite** and the
**canonical COP event journal** (the latter already owned by the CPS job).
It does not replicate the two stores, rewrite old continuations, invent missing
handlers, queue work to a provider, or create another timer. Disable this
observation only via `COGENTIA_COP_WORK_FRONTIER_ENABLED=0` if necessary.

Inspect an aggregate status safely from the FractaNode shell:

```bash
node scripts/ops/ona-chatgpt-cps-reconcile.mjs --frontier
```

The inspection does not expose question bodies, private document titles,
mandate secrets or historical prompt contents. The in-process ONA job records
aggregate numbers in its normal job detail event. It separates:

- **`local.active`**: legacy open continuations, **not** a number of runnable
  work items; `resume.command=continuation resolve` is an output adapter, not
  the cognitive handler contract.
- **`local.requiring_contract`**: legacy active continuations lacking a
  `resumeTo`/`resume_to` executable handler contract (so should never be
  auto-dispatched just because their status is `active`).
- **`cop.specialized_cps_ready`**: already-owned, currently assigned browser
  dispatch / result wake / next-step queues. They remain exclusive to their
  separately governed CPS worker (so a generic work-pull must never
  process or double-count them).
- **`cop.needs_reconciliation`**: effects whose durable intent exists but
  whose outcome cannot safely be inferred.
- **`generic_runnable`**: deliberately zero until an actual handler route,
  registered continuation packet reference, verified mandate and provider
  budget are all available at the effect boundary. A matching declaration
  is insufficient authorization.

Live Fracta2 preflight on 2026-11-16: 467 local records (392 `active`, 75
not-active), of which all 392 active records lacked an executable handler
contract. 19 COP continuation declarations, **zero** assigned CPS-ready /
result-wake / next-step events and **zero** unsettled CPS effects. The
resident loop therefore has no legitimate generic work to dispatch yet.
This is a **read-only production rollout**, not evidence that the historic
cognitive backlog has been processed. The next step is to bind actual
JudgmentHandler and semantic-search contracts to selected legacy
continuations, after checking provider capability, mandate, budget and
relevance against their up-to-date sources; rollout one child per cycle
before broadening the bounded drain.

### First governed legacy → CPS pilot (public document role, #194)

The bounded, reusable admission bridge
`scripts/lib/legacy-public-judgment-cps.js` takes one **active** host-local
`index.document_role_judgment` continuation, checks its structured-response
contract, validates a public `cogentia` repository-relative Markdown path,
requires that the source content match `origin/main` **byte for byte**, and
prepares one *self-contained* JudgmentHandler question. It never transfers
unpublished drafts, untracked files, symlink escapes, secret questions or
private repositories to a model.

```bash
# Read-only preview; no budget reservation, no browser request:
node scripts/ops/promote-public-legacy-judgment.mjs --id=ctn_...
# Actual one-task COP declaration (only if mandate and budget authorize):
node scripts/ops/promote-public-legacy-judgment.mjs --id=ctn_... --apply
```

`--apply` calls the **already-existing** signed-v5
`prepareAssignedChatgptCpsContinuation`, whose idempotent CPS continuation
gets its own COP PacketClaim and one execution-budget reservation. It then
links that child to the original legacy continuation topic and registers an
ordinary `all` join. The **resident** assigned-browser worker remains the
only authorized provider dispatcher: preparing does not send a browser turn.
The resulting answer stays an inspectable returned child; the older legacy
continuation is **not** marked resolved until a later handler verifies the
schema-specific `decision` and `reason`, preserves provenance and performs a
CAS update in the local continuation SQLite. Do not confuse an LLM answer or
`handler_completed` with approval of a document's visibility classification.

This deliberately starts with a single *already published public document*,
not bulk promotion of hundreds of private or ambiguous documents. Broader
promotion depends on evidence of task relevance, provider correctness,
privacy, mandate and budget per candidate. The provider permissions are
independent of having a browser connector technically reachable.
