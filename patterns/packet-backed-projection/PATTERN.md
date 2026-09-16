---
schema: cogentia.pattern/v1
id: packet-backed-projection
kind: pattern
status: experimental
title: Packet-Backed Projection
aliases:
  - Packet-Backed Incremental Projection
  - Bidirectional Packet Projection
  - Lossless Packet-Backed Projection
  - Projection incrémentale adossée à un Packet
language: en
document_role: operational
document_kind: pattern
visibility: public
origin: "Interaction Registry / SQL projection design exploration, 2026-09-16"
related_issues:
  - cogentia#110
  - inseme#76
related_documents:
  - research/living_frontmatter_optimistic_schema_candidate.md
  - interaction_packets/architecture.md
lifecycle_state: active
classification_source: cogentia.js
classification_version: '1'
classification_rule: explicit-metadata
classification_confidence: medium
---

# Packet-Backed Projection

## Intent

Let a relational schema expose the small, queryable, indexed surface that an application needs now while preserving the richer information object from which that surface is derived, so the representation can evolve incrementally without silent information loss.

Compact rule:

> **Columns are the current projection; the Packet preserves the richer state.**

A system may simplify, normalize, index, aggregate or rewrite a projection without making its current SQL shape the closed ontology of the underlying information.

## Context

A system stores evolving domain information in SQL because relational columns are excellent for filtering, joining, constraining, indexing and operational reads.

The same domain object often contains more information than the current application needs to expose as columns. New properties may appear before they deserve a schema migration, and later usage may show that some Packet properties deserve promotion into first-class relational columns.

The system also needs traceability across transformations and may need to reconstruct how a current row relates to a richer earlier state.

## Problem

Two common extremes are both costly:

```text
model everything relationally in advance
→ premature schema commitment + speculative migrations

store everything only in JSON
→ weak relational semantics + awkward queries + indexing drift
```

A third failure is worse: a narrow SQL view is later treated as if it were the whole object, so writes through that view silently erase information the writer did not know existed.

## Forces

- SQL columns should remain small, useful and easy to query.
- Domain reality often evolves faster than stable relational schemas.
- Unknown or currently-unused information must not be destroyed merely because one projection does not expose it.
- A JSON/Packet field must not become an unstructured dumping ground.
- Frequently queried properties should eventually gain proper columns, indexes or constraints.
- Write paths should remain simple for ordinary application code.
- Traceability should survive projection, update, reconciliation and later reprojection.
- Large artifacts should be referenced rather than duplicated.
- Historical state is valuable in some rows but not worth full event sourcing everywhere.
- Schema evolution should be driven by observed use, not by speculative completeness.

## Resolution

Represent the domain object as a richer **Packet** and treat SQL columns as a situated projection of that Packet.

```text
Packet P(t)
   ↓ project()
SQL columns C(t)
```

The row MUST retain either:

1. the richer Packet inline, commonly as `jsonb`;
2. a durable reference to that Packet;
3. or, when useful, both a reference and the exact snapshot used for the projection.

Typical metadata:

```text
packet / packet_ref
packet_schema_version
packet_hash
projection_version
projected_at
as_of
revision
history_ref? / history?
```

The exact names are local implementation choices. The semantics are the Pattern.

## Bidirectional write-back

A write through SQL MUST update only the Packet properties represented by the projection and preserve information outside that projection.

Conceptually:

```text
stored Packet P0
+
inverse projection of changed columns ΔC
↓
merge_preserving_unknown(P0, ΔC)
↓
Packet P1
```

The inverse projection is a **PartialPacket**, not a claim to reconstruct the entire object from columns alone.

Useful operations are:

```text
project(packet)       -> columns
inflate(columns)      -> PartialPacket
merge(packet, patch)  -> packet'
recordRevision(...)   -> trace of the transformation when useful
```

Core invariant:

> **Code may understand only the properties it currently needs; its ignorance of the rest must not become information destruction.**

## Null, absence and deletion

Do not silently collapse these states:

```text
NULL
absent
explicit delete
```

A projection must define write-back semantics for nullable or optional fields when ambiguity could erase information. A SQL `NULL` is not automatically permission to delete a Packet property.

## Incremental promotion

Properties SHOULD move from Packet-only representation into relational structure when real usage creates enough pressure.

```text
rare / experimental property
→ Packet only

repeatedly useful property
→ projection candidate

frequently queried / joined property
→ SQL column

stable structural property
→ index / constraint / dedicated relation where justified
```

This is **promotion on pressure**: normalize progressively from observed use rather than attempting to predict the final schema.

The reverse is also legitimate: a column that no longer earns its relational cost may be deprecated while the richer Packet representation remains available.

## Agile development loop

```text
1. Observe Reality
2. Capture the richer state in a Packet
3. Implement the smallest useful relational projection
4. Use it
5. Observe actual queries and writes
6. Promote useful properties
7. Reproject / backfill
8. Deprecate unnecessary relational structure
9. Repeat
```

This connects directly to Optimistic Schema:

```text
current schema = current best projection
not = closed ontology
```

## Traceability through transformations

A projection may be lossy locally without becoming lossy globally if the richer source remains retrievable.

Where traceability matters, keep enough derivation metadata to answer:

```text
what changed?
when?
by whom / by which agent?
from which source or interaction?
from which Packet/revision?
under which projection version?
```

A useful transformation trace can contain compact references rather than repeated large values:

```text
input_ref / input_hash
source_ref
previous_revision
patch
output_ref / output_hash
projection_version
changed_at
changed_by
```

Prefer storing large artifacts once and referencing them many times.

> **Store facts once, reference them many times; store changes, not copies.**

## Optional row history

A row MAY carry its own lightweight history when useful.

Three useful levels are:

```text
0 — current state only
1 — current state + small inline history/deltas
2 — current state + reference to external revision history
```

When history grows, move it to an append-only revision relation rather than allowing an unbounded JSON field to become operationally expensive.

Periodic checkpoints may bound reconstruction cost:

```text
snapshot
→ delta
→ delta
→ ...
→ snapshot
```

A revision counter also supports optimistic concurrency:

```text
UPDATE ...
SET ..., revision = revision + 1
WHERE id = ? AND revision = expected_revision
```

Thus one small mechanism can support traceability, conflict detection, reconciliation and optional historical reconstruction.

## Temporal distinction

When relevant, keep distinct:

```text
occurred_at       = when the represented event happened
as_of             = state-of-world horizon described by the Packet
projected_at      = when this SQL projection was computed
projection_version = which projection logic produced it
changed_at        = when the stored row/revision changed
```

Do not invent all timestamps mechanically; preserve the distinctions when the domain needs them.

## SQL schema trigger

When creating or materially modifying a SQL schema that stores semantic or evolving domain state, apply this Pattern unless the table is demonstrably outside its context (for example a purely technical join table, ephemeral cache, migration ledger, or raw immutable evidence table).

The schema review should ask:

```text
Is this row a projection of a richer information object?
Could future fields exist before they deserve columns?
Could a narrow write accidentally erase unknown information?
Would provenance/revision/history materially improve traceability?
```

If yes, the design SHOULD include Packet backing and non-destructive reconciliation from the start because the implementation cost is usually small compared with later recovery from information loss.

If the Pattern is deliberately not applied to a semantic/evolving table, record the reason rather than silently defaulting to a closed relational ontology.

## Cheap test

A conforming implementation should be able to demonstrate at least:

```text
P0
→ project(P0) = C0
→ modify C0 into C1
→ merge(P0, inflate(C1)) = P1
→ project(P1) = C1
```

and prove that Packet properties outside the projection survive the round trip.

Test explicitly that `null`, absence and delete semantics do not cause unintended erasure.

## Consequences

Positive:

- relational reads stay simple and fast;
- schemas can grow incrementally from real demand;
- unfamiliar future fields do not force immediate migrations;
- narrow writers do not destroy richer state;
- transformations remain traceable;
- historical reconstruction can be added proportionately;
- Packet and SQL representations can evolve independently but remain reconcilable;
- projection code is small enough to generate or standardize.

Costs / risks:

- projection and inverse-projection semantics must be explicit;
- two representations can drift if reconciliation is poorly implemented;
- careless `jsonb` use can become schema avoidance rather than incremental design;
- histories can grow without compaction or externalization;
- provenance references must remain durable if values are not stored inline.

## Non-goals

- Do not force every SQL table to contain a Packet.
- Do not replace relational modeling with JSON blobs.
- Do not duplicate large source artifacts merely to make rows self-contained.
- Do not require full event sourcing where lightweight revisions are sufficient.
- Do not treat a Packet as canonical evidence when it is itself only a projection of an external source; preserve the evidence chain.
- Do not promote a property into a column merely because it exists.

## Relationship to Pattern Mining

This Pattern emerged from a concrete Interactions Registry scaling discussion, then generalized across SQL projections, Digital Twin state, Atlas derivations, Olé Olé observations and trace-preserving transformations.

Its status remains experimental. Cross-domain usefulness is evidence for further testing, not proof that every system should adopt the same physical representation.
