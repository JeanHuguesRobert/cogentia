---
title: "GitHub Issues taxonomy — shared classification and controlled reconciliation"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-11-17"
last_modified_at: "2026-11-17"
version: "0.1"
status: "working-paper — operational first increment"
license: "CC BY-SA 4.0"
language: "en"
document_role: operational
document_kind: agent-pattern
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/github-issues-taxonomy.md
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "https://github.com/JeanHuguesRobert/cogentia/issues/339"
  origin_date: "2026-11-17"
  derived_from:
    - research/CPKT-2026-006_fix_bugs_first_dashboard_handoff.md
    - docs/resumable_github_issues.md
review:
  status: unreviewed
  reviewed_by: []
---

# Shared taxonomy for GitHub Issues

Cogentia owns the **shared meaning**; each native GitHub repository owns its
Issues and their labels. No independent backlog or issue-history store is
created by taxonomy reconciliation. This extends the Fix Bugs First work model
of [CPKT-2026-006](../research/CPKT-2026-006_fix_bugs_first_dashboard_handoff.md).

## Independent dimensions

- **Kind:** native `bug`, `enhancement`, `documentation`; `research`,
  `idea-to-explore` and `cpkt` supplement GitHub's categories.
- **Work state:** GitHub open/closed is authoritative; `blocked`, `parked`,
  `ready` are optional, evidence-dependent qualifiers, not synonyms.
- **Urgency:** `urgency:now`, `urgency:soon`, `urgency:deferred`.
- **Importance:** `importance:essential`, `importance:high`.
- **Role:** `umbrella` coordinates related work without erasing child Issues.
- **Local domains:** existing labels such as `cop`, `fractanet`, `autonomia`,
  `subsystem:mesh`, `severity:critical` remain owned locally.

Never infer urgency from severity, importance from recency, or `parked` from
inactivity. Do not convert every research idea into a delivery obligation.
A `cpkt` must remain resumable by reference with an accessible first step.

## Commands

```bash
node scripts/cogentia.js issues taxonomy plan --output /tmp/issues-taxonomy.json
node scripts/cogentia.js issues taxonomy apply --from /tmp/issues-taxonomy.json --dry-run
node scripts/cogentia.js issues taxonomy apply --from /tmp/issues-taxonomy.json
node scripts/cogentia.js issues taxonomy verify --from /tmp/issues-taxonomy.json

# Optional scopes:
node scripts/cogentia.js issues taxonomy plan --repo cogentia,inseme --output /tmp/scoped.json
node scripts/cogentia.js issues taxonomy plan --all --output /tmp/all.json
```

`plan` never writes to GitHub. A default run covers the four active core
repositories: Cogentia, barons-Mariani, Inseme and Operium. `--all` discovers
non-archived repositories owned by the linked account; outside the four core
repositories it creates only label definitions needed by actual proposed
classifications. A private repository may be read and updated only with the
right Principal and mandate. Do not commit raw plan JSON containing private
content or references without an appropriate disclosure review.

`apply` is an **explicit mutation**. The hashed plan is bound to an owner,
a schema version, expected issue timestamps, titles and current labels, and
expires after 72 hours. It checks all targets before writing, then rechecks
each issue just before the additive label mutation. A conflict stops the batch
without overwriting another agent's edits. Batch-level atomicity is not
claimed: verified earlier writes are retained; rerun a fresh plan after
recoverable partial failure. Existing local labels are never deleted.
Existing common-label definitions are reconciled only when their observed
previous state matches the plan's expected state.

Every real `apply` requires a distinct effective COP authorization/budget
decision and an effect receipt. Shell access or a configured `gh` token does
not grant semantic authority. Operator-specific credentials may require a
native authorized transport and subsequent COP verification; do not claim
that a failed governed transport performed a mutation.

`verify` reads GitHub again to distinguish pending writes, complete writes
and concurrent divergence. The implementation is idempotent: a fresh `plan`
after complete reconciliation proposes zero additions.

## Judgment and closure

The first classifier uses only **explicit title markers** for automatic
labels. It does not guess the intended type from broad prose. All existing
labels are retained. It raises `consider_close` candidates when there is
explicit completion evidence or multiple checked tasks and no unchecked
task. It may flag an explicit duplicate reference.

**Neither issue closure nor duplicate consolidation is automatic.** A
designated agent must verify the current acceptance evidence, successor and
effect on linked packets, then invoke GitHub's native completed/duplicate
closure within mandate. This rule preserves "memory without false activity".

## Ongoing stewardship

The existing Cogentia issues sync/export and Fix Bugs First dashboard should
consume normalized labels as derived views. Run `plan --all` periodically
under an existing authorized maintenance schedule; only apply when there is
verified drift and a live mandate. The plan exposes a per-repository `judgment_queue` of issues with no labels and
no explicit classification signal; private-repository titles are omitted. Its
order is oldest update first for inspection, **not** a priority ranking.
Report unlabelled issues as an **evidence queue**, not an agent-quality failure
to be eliminated by fabricated labels.

Work owner: [Cogentia #339](https://github.com/JeanHuguesRobert/cogentia/issues/339).
Related specialized research triage:
[barons-Mariani #23](https://github.com/JeanHuguesRobert/barons-Mariani/issues/23).
