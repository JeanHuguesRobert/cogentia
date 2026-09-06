---
title: "Living Frontmatter — Optimistic Schema Candidate from Reality"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-06"
version: "0.1"
license: "CC BY-SA 4.0"
language: "en"
status: "working-paper"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/living_frontmatter_optimistic_schema_candidate.md"
last_stamped_at: "unknown"
update_policy: "UP-DEFAULT-REVIEWED"
document_role: "operational-note"
document_kind: "schema-candidate"
visibility: "public"
lifecycle_state: "working"
methodology:
  - "Cogentia Commons"
  - "Optimistic Locking"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "unavailable"
  origin_date: "2026-09-06"
  derived_from:
    - "JeanHuguesRobert/cogentia#159"
    - "JeanHuguesRobert/barons-Mariani:research/presence_ecology_and_management.md"
review:
  status: "unreviewed"
  reviewed_by: []
related_documents:
  - "docs/frontmatter-schema.md"
  - "docs/frontmatter-synonym-mapping.md"
  - "docs/frontmatter-migration-v0.1.md"
  - "research/memory_and_corpus_sleep_cycle.md"
  - "JeanHuguesRobert/cogentia#159"
---

# Living Frontmatter — Optimistic Schema Candidate from Reality

## Purpose

This note records a schema candidate that emerged from a concrete Reality Test rather than from a top-down redesign. It does not replace the current frontmatter schema. Under Optimistic Locking, it may nevertheless be used by bounded new documents when the candidate representation is more faithful to known Reality and remains traceable, reversible and explicitly provisional.

## Candidate principle

```text
current schema = current best protocol
not = closed ontology
```

New documents MAY use a plausible forward-compatible representation before formal schema stabilization when:

- the information is materially known;
- the current schema would lose or distort that information;
- the candidate representation is explicit and reversible;
- no unsupported lifecycle or authority claim is introduced;
- the divergence is linked to an active schema-evolution trace.

This is an application of Optimistic Locking: optimistic on reversible representation, strict on claims of authority.

## Provenance finding

The current `origin_*` block conflates several distinct questions:

```text
Where did the intellectual/documentary work originate?
What earlier artifacts did it derive from?
Where and when was this particular artifact materialized?
```

The Reality Test suggests separating at least:

```yaml
provenance:
  origin:
    kind: conversation
    ref:
      status: unavailable
    date: YYYY-MM-DD
  derivation:
    from: []
  materialization:
    repository: owner/repo
    path: path/to/file.md
    initial_commit: <immutable commit>
```

Compatibility fields may coexist temporarily during migration when useful.

## Known versus unavailable

`unknown` should mean that the relevant fact is genuinely unknown.

When the fact is known but a durable identifier is not available, represent that distinction explicitly. For example:

```yaml
origin:
  kind: conversation
  ref:
    status: unavailable
```

This is more informative than `origin_ref: unknown` and avoids pretending that a Git commit is the intellectual origin merely because it is the first durable repository evidence.

## Emerging fields

A field not yet present in the canonical schema is not automatically erroneous. Classify observed fields as:

```text
canonical
accepted synonym
local/private experiment -> x-*
plausible corpus-wide concept -> schema candidate
accidental/ambiguous variation -> review finding
```

Repeated useful fields such as `document_kind`, `visibility`, or `lifecycle_state` are therefore evidence for schema evolution rather than merely migration noise.

## Reality Test

The first document using this candidate approach is:

`JeanHuguesRobert/barons-Mariani:research/presence_ecology_and_management.md`

Its frontmatter records both current compatibility metadata and richer candidate provenance, including conversation origin, derivation and immutable Git materialization evidence.

The implementation and broader corpus consolidation work are tracked in `JeanHuguesRobert/cogentia#159`.
