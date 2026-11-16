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
