---
title: "Interaction evidence in the Corpus Sleep Cycle"
author: unknown
affiliation: unknown
license: CC BY-SA 4.0
date: "2026-10-23"
status: "working-paper — synthetic prototype"
language: en
document_role: operational
document_kind: implementation-handoff
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/interaction-evidence-sleep-cycle.md
generated_by: Codex
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 3dcf5fa33dd76ccd3bb40739d39440f241dbefdd
  origin_date: "2026-10-23"
  derived_from:
    - https://github.com/JeanHuguesRobert/cogentia/issues/271
    - corpus-sleep-cycle-monte-carlo.md
review:
  status: unreviewed
  reviewed_by: []
---

# Implementation boundary

Scoped delivery consists of exactly these six files:

- [Mission](../scripts/lib/corpus-sleep-cycle/interaction-evidence.js)
- [Engine integration](../scripts/lib/corpus-sleep-cycle/sleep-cycle-engine.js)
- [Queue supersession view](../scripts/lib/corpus-sleep-cycle/review-queue.js)
- [Exports](../scripts/lib/corpus-sleep-cycle/index.js)
- [Synthetic acceptance tests](../scripts/check-interaction-evidence.js)
- [This handoff](interaction-evidence-sleep-cycle.md)

Proposed commit: `feat(sleep-cycle): prototype advisory interaction evidence mission`.
Publication target: `JeanHuguesRobert/cogentia`, current `main`, excluding all
unrelated changes. Commit/push have not been executed by this handler.

This is the smallest synthetic, observational prototype for
[issue #271](https://github.com/JeanHuguesRobert/cogentia/issues/271), including
the normative follow-up extension and cold-resume repair in its comments.
It is implemented locally, not deployed or scheduled. The default Monte Carlo
mission and systemd cadence are unchanged. No source, register, account, SQL
projection, weekly ChatGPT task or GitHub issue is mutated by this mission.
Only the existing advisory queue and existing continuation directory receive
runtime writes. Source adapters are trusted, separately authorized readers;
the engine cannot turn an arbitrary adapter function into a read-only sandbox.

## Existing interfaces and gaps

| Existing interface | Reuse / minimal addition |
| --- | --- |
| `runMonteCarloAudit` qualification and budgets | Explicit `mission: interaction_evidence`; the default remains the pair audit |
| `SleepCycleReviewQueue` and its decisions log | Typed findings, typed receipts, idempotent append, supersession projection |
| Sleep Cycle continuation files | Persist exact snapshot cursor; reattach authorized adapter on resume |
| `syncInteractionTracesCore` | Existing Markdown/continuation inventory, not an event reconciliation engine |
| Interaction Packets Markdown/YAML | Source-owned representations supplied as public normalized status views |
| JHN SQL desk read capabilities | Existing projection seam in `cogentia-mcp-registries.js`; no new database or schema |

Occam / FixBugsFirst review: reuse queue, decisions, qualification and
continuations. Detect confirmed stale assertions before proposing follow-up.
Add no scheduler, source writer, dependency, database, provider model call or
pattern store. A rejected follow-up is remembered through existing review
decisions; an observed reply supersedes the prior proposal. Superseded findings
remain immutable but disappear from the pending advisory view.

## Source authority audit

The issue identifies the profile register and private register as canonical;
its repair comment requires also inspecting Cogentia's register. Local public
inspection confirms multiple independently maintained representations rather
than an established universal synchronization direction. The Cogentia overview
describes Gmail → YAML → readable register. The inspected CADA packet explicitly
names native mail as source evidence and distinguishes original source
disclosure from public-summary disclosure. The profile register has its own
canonical URL. The WhatsApp placement document routes private living memory to
the private register. Therefore this prototype treats originals as evidence,
YAML as structured source-owned statements, Markdown/dashboard/SQL as compared
representations. It does not silently select one public register to overwrite
the other. Ownership and per-case reconciliation remain review obligations.

References: [interaction overview](../interaction_packets/overview.md),
[Cogentia register](../interaction_packets/mail_trace.md),
[profile register](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/interaction_packets/mail_trace.md),
[private placement contract](agent-jhn-whatsapp-interaction-register.md),
[Pattern Mining](../patterns/pattern-mining/PATTERN.md),
[Non-Resolutive Response Patterns](../research/non_resolutive_response_patterns.md).

## Adapter contract and privacy

An adapter exposes `{ authorized: true, readSnapshot({signal, from, through}) }`.
It must enforce actual source permission, least privilege, a bounded date-scoped
read, and AbortSignal cancellation. The prototype accepts at most 1,000 cases
per immutable snapshot. Incremental windows are caller-owned: advance the next
`from` only after completion; use overlap to accommodate delayed source events.
A failed read never advances the cursor and is not retried internally.

Each case contains an explicit source-owner approved public disclosure view:

```js
{
  id: "pub:fictional-case", revision: "pub:reviewed-v1",
  visibility: "public", disclosure_approved: true,
  observation_scope: {
    from: "2026-10-01T10:00:00+02:00", through: "2026-10-23T10:00:00+02:00",
    channel_inspected: true, complete: true, search_verified: true
  },
  expectations: { substantive: true, delivery: false },
  events: [{ kind: "sent", at: "2026-10-01T10:00:00+02:00",
             ref: "pub:fictional-source", match: "confirmed" }],
  representations: [{ ref: "pub:fictional-yaml", status: "awaiting" }]
}
```

Public aliases must be separately authorized opaque references resolved inside
the source owner's trust domain. Merely hashing a private locator is insufficient.
The engine allows only `pub:` aliases and enumerated fields; it drops bodies,
subjects, correspondents, raw connector errors and unknown fields. Private cases
are excluded entirely, not transformed into public findings. A future private
queue adapter requires its own explicit storage/disclosure boundary. A public
queue cannot be used as a private evidence store even on a trusted workstation.

Event kinds: sent, auto_ack, human_reply, substantive_reply, refusal,
delivery_failure, partial_delivery_failure, document_receipt, delivery,
followup_sent. A partial failure is not treated as failure of the principal
recipient; the adapter must establish recipient scope. The adapter must
establish confirmed correlation and semantic classification; the prototype
does not infer them from a subject match, domain guess or message prose.

Optional follow-up policy: `{basis, not_before, evidence_ref, risk_reviewed}`.
`basis` is legal, announced, conventional or courtesy. A legal review window is
a supplied reviewed fact, never a deadline calculated by this engine. The
`not_before` window is a justified earliest review time, not an inferred legal
expiry. Closed cases, observed resolution, sent follow-ups and declined
follow-ups suppress another proposal. Incomplete coverage, ambiguous matching,
uninspected channels and stale coverage at a review window yield VERIFY.
No rule sends a message, reopens an old Packet or applies a proposed correction.

## Typed output and exact resume

`interaction_evidence` findings include decision, severity, reason, uncertainty
problems, separate timestamps/latencies, source aliases, proposed corrections,
supersession links and a prepared advisory-only continuation envelope. Missing
replies have null latency. Zero only means a grounded same-instant event.
Acknowledgment, documentary receipt, delivery and substantive resolution stay
distinct. Register status is evidence about the register, not proof of receipt.

Receipts are append-only `cogentia.interaction-receipt/v1` records with
COMPLETED, PREEMPTED, PARTIAL or BLOCKED_SECURITY, phase and stable error code.
Opaque errors are not silently retried. BLOCKED_SECURITY denotes missing or
denied authorized adapter access; network/timeout/invalid snapshot produces
PARTIAL. No raw exception text enters public output. Expected task failures
return typed receipts; no GitHub Actions workflow was changed.

The checkpoint carries a digest of the approved public snapshot, frozen
observation window and next case index. On resume a changed snapshot is refused
with CHECKPOINT_SNAPSHOT_MISMATCH. Evidence is enqueued before advancing the
cursor; replay after a crash deduplicates by stable finding ID. Observation
time alone does not issue another recommendation. Resume is programmatic:

```js
import { runMonteCarloAudit } from "../scripts/lib/corpus-sleep-cycle/index.js";
const result = await runMonteCarloAudit({
  root: authorizedRuntimeRoot, mission: "interaction_evidence",
  adapter: authorizedPublicDisclosureAdapter,
  from: "2026-10-01T10:00:00+02:00", now: "2026-10-23T10:00:00+02:00",
  maxCases: 20, maxWallTimeMs: 1000, readTimeoutMs: 500,
  // resume: prior.continuation.id, // frozen window is restored
  minePatterns: true
});
```

Normal qualification remains active. `force` is an operator override subject
to a designated budget, as in the existing engine. The continuation explicitly
requires reattaching the authorized adapter; there is no invented CLI credential
router. Max-case, wall-time and foreground checks preempt between cases; the
adapter read has a timeout. Snapshot normalization is synchronous and bounded
by case count, not a hard CPU interrupt or an unbounded mailbox scan.

Optional PatternCandidate generation recognizes only repeated documentary
receipt without delivery evidence. It reuses the same queue, records recurrence,
counterexamples and uncertainty, stays provisional and requires another real
case plus overlap review. Different causes do not establish one pattern or
intent. Original questions, referrals and residual uncertainty must be supplied
by a future richer reviewed source adapter; no semantic extraction is claimed.

## Verification receipt and next handler

Baseline: main at `3dcf5fa33dd76ccd3bb40739d39440f241dbefdd`, synchronized with
origin/main when inspected. Existing unrelated WIP was preserved.
During work, another handler advanced main to
`8cbb3a3e6ad319eab5ae2a73d747d6fdffa28f83` (memory-capture capability),
also equal to origin/main. No overlap with the six #271 files was observed;
the scoped patch was verified on that current mainline without altering the
other handler's work.

Synthetic checks: `node --test scripts/check-interaction-evidence.js` (12 passed).
Existing regression suite: `node scripts/check-corpus-sleep-cycle.js` (8 passed).
The fixture suite verifies distinct exact latencies, no-reply observations,
stale views, zero source writes, private-field exclusion, deduplication,
persisted continuation resume, foreground/budget preemption, denied/hung
adapters, document/delivery separation, search/channel gaps, follow-up advice,
review rejection, reply supersession and provisional pattern counterexamples.

Access probes on 2026-10-23: connected Gmail profile and one bounded outgoing
message-ID search returned successfully; the private mail register was opened
read-only without exporting its contents. These probes establish access only,
not successful mailbox reconciliation or proof of no reply. No live message
body was ingested by this prototype. No private identifiers are retained here.

Remaining implementation work (issue stays open):

1. Implement source-owned authorized Gmail and repository adapters, pinned to
   exact revisions, with stored private alias resolution and semantic review.
2. Parse actual YAML, readable copies, dashboards and SQL views; audit malformed
   Markdown rows, date disagreements, duplicate cases and missing links. The
   prototype accepts normalized representations; it does not parse these stores.
3. Exercise a bounded real case inside its owning privacy domain. Preserve
   Q, R, referrals, verified facts and residual uncertainty; never convert an
   uninspected channel or failed search into a silence claim.
4. Resolve one authoritative correction pathway shared with the existing weekly
   ChatGPT task. Both may contribute evidence; neither receives automatic write
   authority. Task identity/configuration has not been inspected or changed.
5. Review connector permission policy, incremental freshness and source ownership
   before enabling unattended reads. Keep cadence separate from mailbox budgets.
6. Any source correction is enacted by a separately authorized handler after
   review, optimistic revision check and post-write verification. Publication,
   commit/push and deployment are separate effects.

Recovery: remove the scoped local prototype patch to return to default-only
behavior. Runtime queue history remains append-only evidence. Do not remove
unrelated WIP or claim that a local draft is already available to a remote cold
handler. Publish the scoped implementation and this handoff only under explicit
execution authority, then verify the delivered commit before posting a receipt.
