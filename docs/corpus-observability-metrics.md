---
title: Corpus observability metrics
author: unknown
date: '2026-07-17'
document_role: source
document_kind: specification
visibility: public
lifecycle_state: working
update_policy: UP-DECISION-REVIEW
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: pending
  origin_date: '2026-07-17'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# Corpus observability metrics

This document defines the minimum trace contract required to measure the work
remaining in a Living Corpus. It does not authorize autonomous decisions or
publication.

## Trace fields

Continuation and propagation records should expose, when known:

- `opened_at`: when the continuation was created;
- `last_reviewed_at`: most recent review attempt;
- `resolved_at`: resolution time, when resolved;
- `resolution_actor`: human, agent, or tool that resolved it;
- `resolution_cost`: bounded compute/time estimate or measured cost;
- `reopen_count`: number of later reopenings;
- `blocked_reason`: explicit external dependency or missing judgment;
- `compute_budget`: budget granted for the attempt;
- `evidence_count`: number of recorded evidence items.

Unknown values remain explicit; they must not be replaced with inferred dates or
authors.

## Derived measures

Read-only reports may aggregate:

- open continuation count and age distribution;
- count by repository, mandate, actor, and continuation kind;
- median and percentile resolution time;
- blocked and reopened rates;
- planned versus applied changes;
- compute cost by operation and outcome.

These are operational observations, not quality scores. They must not be used to
silently rank people or infer authorial responsibility.

## Control loop

```text
observe -> measure -> prioritize -> act -> verify -> measure again
```

All aggregates must retain their generation time, registry revision, source
reports, and whether they were read-only or mutating. A future reactive Corpus
may use these measures to schedule bounded work, but judgment and mandates remain
an explicit Inversion-of-Control boundary.
