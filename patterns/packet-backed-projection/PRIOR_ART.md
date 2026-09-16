---
title: "Packet-Backed Projection — Prior Art and Defensive Disclosure Notes"
status: working-paper
document_role: research
document_kind: prior-art-note
visibility: public
language: en
date: 2026-09-16
update_policy: UP-DEFAULT-REVIEWED
lifecycle_state: active
classification_source: cogentia.js
classification_version: '1'
classification_rule: explicit-metadata
classification_confidence: medium
---

# Packet-Backed Projection — Prior Art and Defensive Disclosure Notes

## Purpose

This note records known neighboring mechanisms and the deliberately narrow scope of the `Packet-Backed Projection` Pattern disclosure.

It is **not** a patentability opinion, exhaustive novelty search, legal opinion, or claim that the individual mechanisms are new. The purpose is the opposite: make the combined technical teaching public, inspectable and difficult to later describe as undisclosed.

State of review: web/public documentation checked on 2026-09-16.

## Closely related prior art

### System-versioned temporal tables

Microsoft SQL Server system-versioned temporal tables keep the current row in the current table and automatically place previous row versions in a separate history table with validity periods.

Reference:

- https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables

Relevant overlap:

```text
current relational state
+ historical versions
+ point-in-time reconstruction
```

Material difference from this Pattern:

```text
history is primarily table-level/shared
no Packet-backed richer state requirement
no lossless inverse projection requirement
no usage-driven Packet-field promotion rule
```

### Oracle blockchain table row versions and user chains

Oracle AI Database 26ai documents blockchain-table `WITH ROW VERSION` and `USER CHAIN` features. Rows sharing selected user-defined key values can be sequenced in a row-version sequence/user chain, and Oracle provides a view showing only the latest row version.

References:

- https://docs.oracle.com/en/database/oracle/oracle-database/26/admin/managing-tables.html
- https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/CREATE-TABLE.html

This is strong prior art for local/key-scoped row-version chains.

Relevant overlap:

```text
versions scoped by business/user-defined key
local sequence number
latest-state projection/view
local chain verification
```

Material difference from this Pattern:

```text
Packet backing is not the organizing concept
no bidirectional partial-Packet reconciliation rule
no explicit preserve-unknown invariant
no promotion-on-pressure schema evolution rule
local history is composed here with an ordinary mutable SQL current-state projection
```

### MVCC / row-version chains

MVCC engines maintain multiple row versions or version chains to support concurrency and consistent reads. These mechanisms show that row-local version addressing is not novel as a storage/concurrency technique.

Their historical versions are generally engine-internal and may be garbage-collected; they are not necessarily durable semantic/audit history.

### Event sourcing and per-entity / per-aggregate streams

Event-sourced systems commonly maintain a stream per entity or aggregate, with local stream revisions and optional global ordering/correlation.

Relevant overlap:

```text
entity-local chronology
append-oriented history
local revisions
cross-stream/global correlation where required
```

Material difference from this Pattern:

```text
the SQL row remains the directly queryable current state
full event replay is not required
history is optional/proportional
Packet state may preserve information not promoted into relational columns
```

### Document revision trees / versioned documents

Document databases and version-control-like systems demonstrate object-local revision ancestry and content-addressed references.

Relevant overlap:

```text
object-local revision identity
parent revision references
content hashes / deduplication
```

This Pattern reuses those ideas where useful but applies them to the relational row as a current-state projection boundary.

### Relational lenses / bidirectional transformations

Relational lenses address the database view-update problem: propagating changes from a relational view back to its source while maintaining consistency. Incremental relational lenses extend this with change-propagating semantics.

Reference:

- Rudi Horn, Roly Perera, James Cheney, "Incremental Relational Lenses", 2018: https://arxiv.org/abs/1807.01948

Relevant overlap:

```text
bidirectional projection/update
view update propagation
small change -> small source update
```

Material difference from this Pattern:

```text
the Packet may contain deliberately unprojected/unknown future information
merge-preserving-unknown is a first-class invariant
schema promotion is driven by observed usage pressure
row-local durable history is an optional companion mechanism
```

## The disclosed composition

The Pattern intentionally publishes the following composition:

```text
SQL current-state columns
= situated typed/indexable projection

+

richer Packet inline and/or by durable reference

+

project(Packet) -> Columns
inflate(Columns) -> PartialPacket
merge_preserving_unknown(Packet, PartialPacket) -> Packet'

+

NULL != absent != explicit delete

+

usage-driven promotion:
Packet-only property
→ observed pressure
→ SQL column
→ index/constraint/relation only when justified

+

optional entity/row-local revision chain:
row.current -> history_head -> local revisions

+

small deltas and references rather than repeated large values

+

periodic checkpoints when replay cost justifies them

+

optimistic row revision / conflict detection

+

optional global correlation by reference:
act_ref / transaction_ref / import_ref / mandate_ref

+

traceability back to source evidence and projection version
```

The Pattern does not depend on one physical storage layout. For example, all entity revisions may live in one shared SQL table while remaining **logically local** by `(entity_type, entity_id, revision)` and `previous_revision`.

## Local History / Global Reference

The specific locality principle disclosed is:

> **Keep history as local as the thing whose history it is; introduce global ordering or correlation only when a real cross-object invariant requires it.**

For relational systems this locality is particularly circumscribed because the row is already the natural unit of current state.

Example:

```text
row A
  current columns
  packet_ref
  revision = 17
  history_head = A17

A17 -> A16 -> A15

row B
  current columns
  packet_ref
  revision = 8
  history_head = B8

B8 -> B7
```

A genuinely cross-row operation remains correlatable without making a global log the mandatory history path:

```text
             act:xyz
            /   |   \
          A17  B42  C8
```

## Development-method contribution

The intended contribution is architectural and methodological rather than a claim to a novel primitive:

> **Do not design the final relational ontology in advance. Preserve a richer Packet, expose the smallest useful SQL projection, let real usage create pressure, promote fields when that pressure becomes material, and preserve local transformation/history traces without destroying information outside the current projection.**

This connects Packet-Backed Projection to Optimistic Schema and incremental/agile development.

## Defensive publication boundary

The public disclosure should be read broadly enough to cover equivalent implementations of the composition, including:

- inline `json/jsonb` Packets;
- Packet references to object/content-addressed stores;
- reference + inline snapshot hybrids;
- generated or handwritten projection functions;
- database triggers, application-layer reconciliation, ORM hooks, generated columns or stored procedures;
- inline row histories;
- one shared `entity_revisions` table carrying many logically local histories;
- physically partitioned/per-entity histories;
- full snapshots, deltas, or checkpoint-plus-delta histories;
- hashes and content-addressed artifacts;
- local revision numbers with optional global transaction/Act references;
- PostgreSQL, SQLite, MySQL/MariaDB, SQL Server, Oracle or other relational implementations.

The disclosure is not limited to the exact example field names or DDL.

## What is not claimed

Do not claim as new, by itself:

- temporal tables;
- MVCC row versions;
- row-local version chains;
- event sourcing;
- per-aggregate streams;
- JSON columns;
- audit logs;
- content-addressed storage;
- optimistic locking;
- bidirectional/lens-style view updates;
- delta storage;
- checkpoints;
- schema migration;
- document revision ancestry.

The Pattern's potentially distinctive value is the **explicit composition and development rule**, not exclusive ownership of those ingredients.

## Publication evidence

Canonical public source:

- `patterns/packet-backed-projection/PATTERN.md`
- this `PRIOR_ART.md`

Git commits provide immutable repository checkpoints. A later GitHub release/tag, independent archive, SWHID and/or DOI can strengthen preservation, timestamp evidence and discoverability without changing the technical teaching already disclosed by the public commits.
