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

### Production: automatically reconcile an accepted public CPS judgment

The **already-existing ONA CPS tick** can complete the *local* half of the
legacy judgment workflow, without any new provider turn or scheduler. Enable
this separately with the private runtime flag
`COGENTIA_CPS_PUBLIC_LEGACY_SETTLEMENT_ENABLED=1` (off by default).

`runResidentPublicLegacyJudgmentSettlement` examines only COP declarations
explicitly created with `assignment_ref=legacy:ctn_...` and a previously
recorded, accepted and completed result from the signed browser worker. It
checks that the file remains byte-for-byte identical to the published
`origin/main` version, that the answer obeys the continuation's original
schema, the parent join is completed, and the parent temperature is active.
Only then can the **existing** Cogentia `continuation resolve` CLI write the
host-local SQLite state with optimistic concurrency. Each ONA cycle settles
at most **one** such previously accepted continuation. Missing/ambiguous
results and stale documents remain pending/reviewable, not reexecuted.

A successful local CAS is followed by an idempotent canonical COP event
`cogentia.legacy-continuation-settlement/v1` with phase
`local_resolution_confirmed`, causally referring to the original returned
result. Because the local and COP SQLite stores are distinct, a process
failure between them is resolved by replay: an already resolved continuation
is **not** written twice, and a missing COP receipt can be recovered without
rerunning the JudgmentHandler. A stale or independently resolved local work
item is not overwritten. No model output by itself can close a user mandate.

The first actual pilot on 2026-11-16 was the published public
`cogentia/test/README.md` (`ctn_5d825a54`). The signed v5 JudgmentHandler
returned `{"decision":"index","reason":...}`, the local existing CLI
recorded `resolved`, the canonical COP parent recorded
`local_resolution_confirmed` and a retry returned `already_resolved` with
one causal receipt. The active host-local count fell from **392 to 391**.

Read-only settlement preview or manual reconciliation of an explicitly
selected public task:

```bash
node scripts/ops/settle-public-legacy-judgment.mjs --id=ctn_...
node scripts/ops/settle-public-legacy-judgment.mjs --id=ctn_... --apply
```

Do not generalize this to private Barons Mariani records or semantic-search
requests without the distinct confidentiality and embedding-provider
contracts. Existing sqlite-vec acceleration was separately rebuilt from
11,524 stored 1,536-dimensional embeddings at **zero API spend**. The vector
cache is now healthy, but it does not magically supply query embeddings for
117 historical semantic-search continuations or increase corpus embedding
coverage beyond 11,524 of 41,286 chunks.

### Bounded autonomous assignment of public legacy judgments (#194, 2026-11-16)

A **second, separately opt-in** phase of the *existing* ONA CPS job can now
select a small cohort without human dispatch of every task:
`COGENTIA_CPS_PUBLIC_LEGACY_AUTO_ASSIGN_ENABLED=1`. It requires the earlier
`COGENTIA_CPS_PUBLIC_LEGACY_SETTLEMENT_ENABLED=1` and the independently
configured signed CPS JudgmentHandler. It does **not** create a new timer,
authentication issuer, queue, extra budget or independent LLM provider.

`legacy-public-judgment-auto-assign.js` deliberately restricts the first
production cohort to **at most two assignments total**. The policy chooses
one unresolved document-role judgment at a time, from already published
byte-for-byte identical public `cogentia` sources under the narrowly defined
`skills/*/SKILL.md`, `patterns/*/{PATTERN,PRIOR_ART}.md`, or
`mcp-apps/README.md` paths. Local fixtures, personal Barons Mariani sources,
other repositories, modified worktrees, symlink escapes and sources larger
than 20 KB are excluded. Candidates are sorted deterministically, and COP
parent temperature must allow work. A finite two-slot cohort avoids a
permanent, silently expanding budget commitment.

The assigned browser route is reused *only after* the existing actual
`assignedWorker.admit` validates the signed Principal/actor/mandate,
independently reviewed provider permission and available COP budget.
A **durable selection intent** is serialized in COP before invoking the
existing budget-reserving, packet-claiming CPS preparer. Each candidate is
idempotently keyed by its legacy continuation ID. A failed or ambiguous
preparation remains fenced and is reported as needing reconciliation, not
reissued until an operator studies the receipt. The COP transaction also
rechecks outstanding browser turns and parent temperature. Results are
returned to the parent through the normal CPS event topic, and the resident
CAS-based local settlement phase runs on later ticks.

**Single-flight includes results, not just dispatches:** after a browser
click, the next candidate remains blocked until the previous child has a
canonical `returned` result and its legacy parent has the causal
`local_resolution_confirmed` receipt. This prevents the scheduler from
mistaking delivery to a browser for completion of a cognitive job. A task
which returns `needs_more_context`, is stale/ambiguous or cannot be settled
halts this small cohort instead of allowing a runaway stream of LLM turns.

The ONA job detail distinguishes `auto_assignment=assigned_pending_judgment`,
`auto_assignment=browser_turn_in_flight`, `auto_assignment=legacy_child_not_reconciled`,
`auto_assignment=cohort_exhausted`, and `auto_assignment=no_public_candidate`.
The value `auto_assigned=1` means a signed CPS continuation was declared
this tick; it does **not** claim a returned model result or resolved local
continuation. Disable the phase by setting the private environment flag to
`0` and restarting ONA via its existing owner-admin route. The earlier
CPS wake/dispatch and local result reconcilers remain independent.

Test fixture coverage: published-only content, no transport admission => no
selection effects, one unresolved browser child at a time, two-slot finite
cohort across a reopened COP Store, no duplicate claims, and an ambiguous
preparation halting in a durable `selection_intent_needs_reconciliation`.
Extension to private documents, further public repositories, high-volume
judgments or independent FractaSchedulers on other nodes is *not* authorized
by this initial cohort policy.

### Reviewed *barons-Mariani* public cohort — explicit second disclosure policy (2026-11-16)

The **public GitHub visibility of a repository is not consent to relay every
file in it to an external provider**. Review of the active document-role
continuations in `JeanHuguesRobert/barons-Mariani` identified 244 active
judgments. Of those, 106 files were verified as byte-identical to the
published `origin/main` and had explicit `visibility: public` metadata.
Personal/family memory (`memory/marie-louise`), suicide/testimony materials,
identity/revocation registers, investigations of individuals, internal
infrastructure journals, and ambiguous metadata remain excluded from any
automatic model disclosure, even if the repository or a source is public.

Three **named and manually content-reviewed** public files form the only
second-cohort policy (`barons-school-1755-public-v1`):

1. `projects/school/README.md` — School public project-index, no sensitive
   personal data beyond published authorship metadata.
2. `projects/school/editorial-architecture.md` — public methodology and
   editorial architecture, no private documents embedded.
3. `projects/1755/magazine/2026-10-09-une-cote-pour-la-constitution.md` —
   public historical research article identifying an archival collection
   reference; no confidential archival reproduction or private witness
   testimony included.

This is an *exact path allowlist*, not a regex permitting arbitrary new files.
The existing `legacy-public-judgment-cps.js` now accepts a separately passed,
known public repository (`barons-Mariani`) and requires an **explicit
`visibility: public` frontmatter declaration**, in addition to the original
byte-for-byte `origin/main` check, size limit, safe relative path and no
symlink escape. No private drafts are passed to ChatGPT. The same signed v5
CPS `browser.chatgpt.turn` admission, independent provider permission,
existing PacketClaim and COP budget govern each turn. No new capability or
provider was introduced.

Activate the cohort only with the separate private ONA flag
`COGENTIA_CPS_BARONS_REVIEWED_AUTO_ASSIGN_ENABLED=1`, alongside the existing
public-legacy settlement flag. The canonical journal records the cohort ID,
source digest, independently admitted authorization references and
`selection_intent`; the three-slot limit is enforced transactionally under
SQLite's existing COP claim boundary. Previous `cogentia-public-v1` two-slot
records keep their historical keys and remain exhausted. Both cohorts share
the same **global** single-flight guard, including unsettled results.

The ONA logs a separate `barons_assignment` and `barons_assigned` pair,
so an assignment is not mistaken for return or local resolution. The
resident CAS reconciler resolves the host-local continuation using the
*source repository's* verified path, but runs the already-existing Cogentia
`continuation resolve` CLI from its own tool repository. A successful local
CAS is followed by one causal COP `local_resolution_confirmed`; an ambiguous
or stale result is fenced rather than retried. No user-private folder or
entire family sub-project has been enabled.

Safety tests: reject missing `visibility: public`, unpublished local changes,
unreviewed candidate paths, repository mismatch; three cases complete
sequentially through COP parent joins and a separate local SQLite CAS,
without reissuing work; a fourth is blocked by the cohort limit. This is a
narrow policy extension of the general existing handler, not a new service.

### FBF — ambiguous browser dispatch in reviewed Barons cohort (2026-11-16)

**Observed production incident:** the first reviewed Barons continuation,
`ctn_04ba31c3` (`projects/school/README.md`), was automatically admitted
and assigned. ONA next committed
`chatgpt-browser:ctn_chatgpt_browser_41f023c6f0492e434557a7d638fcc075:first-dispatch-intent`
under COP. John separately reserved and settled budget for `ensure_tab`,
`status`, and `submit`, but the CPS continuation topic contains **no**
`ui_click_dispatched_not_model_result` receipt and no accepted/result-return
fact. This is an **uncertain external effect**. Accounting the browser request
is not evidence that ChatGPT accepted the submission. The running ONA correctly
returned `dispatch_needs_reconciliation` and blocked all subsequent assignments
under the global single-flight policy; no blind retransmission occurred.

A bounded read-only browser inspection found no visible message containing
the exact continuation ID in either accessible ChatGPT conversation tab; the
marked Judgment tab's composer was empty and had no visible send-failure
indicator. These observations are **not sufficient proof of non-delivery**:
one additional tab was not inspectable, and browser UI state may be stale or
lost after a navigation. The pre-existing safe failed-draft recovery predicate
requires an explicit send-failure banner **and** a still-bound draft, neither
of which was observed. Do not reinsert/resend merely because a message is
not visible. The historical CPS intent, claim, budget accounting and lineage
must remain immutable and inspectable.

**Diagnostic improvement:** after a new dispatch intent, if John rejects the
attempt or a provider exception occurs, the assigned CPS dispatcher now writes
one idempotent `cop.continuation-browser-dispatch/v1` event with phase
`delivery_unconfirmed`, a **sanitized fixed-shape diagnostic code**, and
`retry_authorized:false`. This preserves the reason for *future* ambiguous
calls without leaking provider text, prompts or credentials. It **does not**
authorize a retry or retroactively fabricate a delivery result for the
incident above. Recovery requires either independent receipt evidence, or an
explicitly chosen new attempt after the previous one is quarantined with its
uncertainty preserved. A separate, independently budgeted provider or local
handler is a viable alternative, but it requires the relevant mandate and
must not pretend to be the original delivered browser continuation.

**Operational choices:** (A) safest: leave the affected parent/child parked for
manual reconciliation, retaining the remaining two items queued; (B) after
independent operator confirmation that no request was sent, record an
explicit abandonment/compensation and create a *new* attempt under a new
correlation ID and budget, never edit the old intent; (C) authorize a separate
trusted cognitive provider/local handler for the three public documents with
its own receipts and accounting. None of these is automatic under the
initial three-slot policy.

### CPS delivery quarantine / independent work progress (2026-11-16, #194)

**Do not confuse a failed delivery with a failed cognitive packet.** After
an ambiguous browser submission, the canonical `first-dispatch-intent` and
all budget accounting remain immutable. Merely parking a child or clearing
a local queue is insufficient to suppress an unknown external effect.

The pre-existing `cop.packet-temperature/v1` is the sole temperature
mechanism: `changePacketTemperature(parent, 'parked')` atomically cools the
parent **and its linked descendants**. A later `Resume(parent)` only warms
that parent; it never implicitly resumes any child. Each cooling event
retains its causal lineage and is reconstructible from COP after restart.

The CPS bridge adds a narrowly typed, append-only
`cogentia.cps-browser-delivery-quarantine/v1` **quarantine receipt**. The
receipt is permitted only when the original child declaration and
`cop.packet-parent-continuation/v1 child_linked` are present, and the
original `first-dispatch-intent` exists without a confirmed browser delivery
receipt or returned model result. It causally references the original
intent and the parent cooling transition. The original request remains
`delivery_unknown`, `retry_authorized:false`; no second prompt is ever
emitted for that continuation, and any future model return remains intact.
A later result is evidence to reconcile *separately*, not an implicit resume.

`inspectQuarantinedBrowserDelivery` requires **both** an exact quarantine
receipt and matching `parked` parent/child temperatures. If the receipt is
missing, corrupt, or a parent or child has been rewarmed, the old uncertain
submission becomes a hard blocker again. Only a validated quarantine allows
the old child to be projected as `parked`, removed from **runnable** work, and
excluded from the single-flight blocker for *independent* new assignments.
The original canonical event is never deleted, rewritten, marked complete,
or disguised as a browser return.

The existing ONA CPS dispatcher and the public-document selector both use
this same projection. They continue to check current packet temperature,
mandate, PacketClaim, provider permission and budget at real dispatch.
The other work packets in the original three-slot Barons reviewed cohort
retain their exact independently audited document paths. Each assignment
still consumes its slot, including the quarantined one: the quota never
silently expands. The ONA read-only frontier reports `parked_cps` separately
from `reconciliation` and `cps_pending`.

**Browser isolation is essential:** `browser.chatgpt.turn` `ensure_tab` now
reuses only an unmarked, empty, idle root ChatGPT editor (`/`), never an
already marked Judgment *conversation*. If there is no safe root, it creates
a fresh exact-origin, unfocused tab using the pre-existing capability. This
prevents a late response in a quarantined conversation from sharing the next
judgment's browser conversation. It does not make an ambiguous earlier click
certainly unsent.

Read-only preview of one exact original CPS continuation:

```sh
node scripts/ops/park-uncertain-cps-delivery.mjs --id=ctn_chatgpt_browser_<id>
```

If and only if owner-authorized quarantine is appropriate, the same existing
COP primitives are invoked explicitly with `--apply`, recording temperature
transitions and the causal quarantine event. No new scheduler, database,
general suspension service, or provider grant was introduced. A crash after
cooling but before the quarantine receipt remains fail-closed; rerunning the
same bounded command is idempotent.

The test suite verifies wrong/missing links, unknown versus confirmed
browser deliveries, `Parked` without quarantine still blocking, cascaded
cooling, idempotence, late returns, parent-only resume, independent
second/third cohort jobs, and strict browser conversation separation.

### Strictly proven *pre-submit* recovery (FBF, 2026-11-16)

The preceding quarantine is intentionally irreversible without explicit
consideration when the external delivery is truly unknown. A second observed
failure mode, on the *next* reviewed public document's newly created browser
root, is much narrower: the existing governed dispatcher returned the typed
error `composer_not_ready`. Its implementation aborts **before** issuing any
John `submit` action. The canonical ledger independently confirms that the
original `chatgpt-turn:jhn-cps-submit-<continuation>` reservation is absent;
only `ensure_tab` and `status` were recorded. A subsequent read-only browser
inspection found the original newly created, exact-origin root compose area
present, blank, editable and idle; the initial status had run before hydration
was complete. This is **proven pre-submit failure**, not an ambiguous click.

The CPS dispatcher now admits *exactly one* additional browser attempt for
this narrow state. `inspectPreSubmitRecovery` requires **all** of:
original dispatch intent; typed `delivery_unconfirmed` with exact
`diagnostic_code=composer_not_ready`; no original John submit reservation;
no confirmed browser click; no model return; no earlier recovery intent; and
current runnable packet temperature. The existing signed mandate, issuer,
provider permission, claim and budget are checked **again**, inside the
existing serialized SQLite COP transaction. It writes a causal event
`cop.continuation-browser-pre-submit-recovery/v1` with phase
`pre_submit_recovery_intent` before touching the browser.

The recovery uses *fresh deterministic John request IDs* ending
`--recovery-1` for `ensure_tab`, `status` and `submit`; this prevents collision
with the original, settled John preflight IDs. It uses the existing browser
capability and the same core answer/return correlation ID, not a new provider
or a second scheduler. When submitted, the single original CPS delivery
receipt references the recovery intent. If the recovery itself is uncertain,
its separate `delivery_unconfirmed` receipt blocks any further retry: **one
recovery, no loop**. A confirmed or possibly invoked original submit can
never take this path, regardless of whether its UI result is visible.

This pre-submit path does **not** convert the earlier
`ctn_chatgpt_browser_41f023c6f0492e434557a7d638fcc075` unknown-click
incident into a safe retry; it remains parked with `retry_authorized:false`.
The new pre-submit recovery is justified only by the stronger, separate
negative evidence about the actual submit action. All steps remain accounted
in the pre-existing COP budget and parent lineage.

### FBF — an old completed CPS prompt left as *shared root-tab draft*

During the third reviewed Barons-Mariana assignment, two successive John
preflights (the first and its single safe recovery) reported
`composer_not_ready`, each **before** a `submit` reservation. Read-only
inspection of the two newly created ChatGPT root tabs found a non-empty
5,348-character editor draft. Both drafts were bound to the *previous*
completed CPS continuation, not to the third one. Comparing them to the
previous signed COP declaration's deterministic prompt demonstrated exact
agreement **after only normalizing line breaks created by the rich-text
editor**. The root tab was not merely slow to hydrate: a prior machine-owned
draft had been restored into the new root tab. The safe pre-submit guard did
the correct thing by declining to overwrite it.

Two generic remedies share the EXISTING `browser.chatgpt.turn` capability:

* `ensure_tab` on a newly created exact-origin root now waits for its editor
  to hydrate, under the current browser lease, using a bounded read-only
  `statusCode` probe. A new tab is not declared safe merely because its URL
  has changed. If the editor remains unready, the separate downstream status
  still fails closed. No extra browser turn or backend daemon is introduced.
* `clear_owned_draft` is a narrowly constrained cleanup of an **already
  completed and locally resolved** CPS Judgment prompt, never a generic editor
  wipe. The caller must supply the exact already admitted prompt and
  continuation ID from COP. On the browser side, the action requires an
  **unmarked root tab** on `https://chatgpt.com/`, an idle editor and a
  normalized exact match of **all** draft text to that canonical prompt.
  Only then does it delete the editor contents using the existing DOM
  interaction, verify empty text, and return a governed John receipt.
  Personal conversations, drafts with any mismatch, unknown IDs, generating
  tabs or arbitrary caller-provided JavaScript are refused. The operation
  never clicks Send or claims that the old CPS result was returned twice.

Reusable audited operator recipe, read-only unless `--apply` is explicitly
present:

```sh
node scripts/ops/clear-owned-cps-browser-draft.mjs --id=<previous completed CPS id> --tab=<exact root tab id>
node scripts/ops/clear-owned-cps-browser-draft.mjs --id=<previous completed CPS id> --tab=<exact root tab id> --apply
```

The recipe verifies the previous *child* returned/completed, the prior
*parent* has an actual `local_resolution_confirmed`, a fresh root tab and
its exact prompt. It routes the action through the ALREADY signed John MCP
browser turn (with its independent budget) and appends a distinct causal
`cogentia.cps-browser-owned-draft/v1 verified_owned_draft_cleared` receipt.
Its idempotency key prevents repeating the effect after restart. This is a
browser-draft cleanup only; no COP source, returned Judgment answer, local
continuation or immutable edition is deleted or revised.

#### FBF: validated browser code, not merely a mocked acknowledgment

The first governed cleanup of a previously completed CPS prompt returned
`john_cop_receipt_missing`. A separate read-only inspection confirmed the
entire 5,348-character draft was still present. The John budget reservation
and settlement were nevertheless recorded; these are **accounting**, not a
verified successful editor mutation. The actual `page.evaluate` source had
been constructed using an interpolated JavaScript template containing
`\r`/`\n` regular expressions; the runtime-generated source failed to
compile (`SyntaxError: Invalid regular expression`).

The static browser recipe now uses `String.raw` for those literal backslashes,
and the capability regression test runs `node:vm.Script` against the **actual
substituted page script**, not just its mock callback result. Because the
original John request ID was already accounted, the bounded CLI cleanup uses
a **new, deterministic `--recovery-1` John request ID**; no replay of the
previous accounting entry. A fresh exact-match read check remains mandatory
before any new editor change, and the canonical COP owned-draft receipt is
written only after the browser returns `cleared:true`.

### Final bounded continuation after two *proven no-submit* preflight failures

A third reviewed public Judgment continuation reached `composer_not_ready`
**twice**: original preflight and one separate recovery. Both its original
and recovery John ledgers show only `ensure_tab` and `status`, **no**
`submit` reservation. A separate, successfully governed browser cleanup then
removed one independently verified stale prompt from a root tab, leaving the
editor blank and writing a canonical causal `verified_owned_draft_cleared`
receipt. This new evidence admits **one final** pre-submit attempt, never an
unbounded status polling or third blind submission.

The existing `inspectPreSubmitRecovery` is fail-closed: before recovery #2
it requires original intent/typed preflight failure, recovery #1 intent and
typed preflight failure, no John `submit` reservation in either previous
attempt, no prior confirmed delivery, no result return, no recovery #2
intent, a real separate canonical owned-draft-cleared receipt and an active
packet temperature. The final intent is recorded under
`pre-submit-recovery-intent-2` with causal references to the older failure
and the cleanup receipt, and new John request IDs with suffix
`--recovery-2`. All independent issuer, mandate, provider and budget gates
remain at the original dispatcher, including its serialized COP transaction.
After recovery #2, no further recovery is automatically available regardless
of how the browser responds. A previous attempt with *any* budgeted submit
is ineligible. This does not apply to the first genuinely ambiguous browser
click, whose parent remains `Parked` with unknown delivery.
