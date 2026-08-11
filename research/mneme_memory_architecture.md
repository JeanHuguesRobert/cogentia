---
title: Mneme Memory Architecture
author: Jean Hugues Noël Robert
date: '2026-07-31'
document_role: source
document_kind: architecture
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: main
  origin_date: '2026-07-31'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Mneme Memory Architecture

## Purpose

This note defines a portable and governed memory model for Cogentia Personal,
collective Cogentia, and Digital Twin instances.

It introduces the **mneme** as an addressable unit of external memory. It does
not claim to model a biological engram or to read human thought. It defines
the conditions under which traces, assertions, acts, interpretations and
summaries can remain useful, attributable, contestable and portable.

French doctrinal form: **mnème**.  
International and technical form: **mneme**.

## Definition

> A mneme is an addressable, durable and governed memory unit that links
> situated content to its sources, provenance, epistemic status, relations,
> versions and access rules.

A mneme is neither a raw file nor a reconstructed human memory. It is the
governed layer between source material and contextual use.

## Core distinction

| Object | Role | Default persistence |
|---|---|---|
| Source asset | Original file, capture, message, record or sensor output | durable |
| Locator | Precise address inside a source asset | durable |
| Mneme | Governed assertion or memory unit | durable or explicitly expiring |
| Memory view | Mandate-filtered selection of mnemes | temporary by default |
| Working context | Task-local material used by an agent or person | ephemeral by default |
| Cogentigram | Versioned structural model of Cogentia | durable, but not biographical memory |
| Cogentiscope run | Method or protocol producing a Cogentigram | durable and reproducible when material |

Raw exports are the territory. A mneme is a governed map element. A memory
view is a situated reading of that map.

## Mneme kinds

The initial vocabulary is deliberately small:

- `observation` — what was observed without attributing intention;
- `assertion` — what an identifiable source or author states;
- `act` — what was done;
- `decision` — a competent, attributable and effective decision;
- `interpretation` — a qualified inference;
- `synthesis` — a versioned summary derived from identified sources.

A message is first a source asset. It may support one or more mnemes. It does
not become a decision merely because it contains an opinion or an instruction.

## Mandatory facets

Every mneme should carry, at minimum:

```yaml
id: mneme:...
kind: observation | assertion | act | decision | interpretation | synthesis
time:
  observed_at: ...
  valid_from: ...
  valid_until: ...
provenance:
  origin: source | human-authored | agent-derived | computed
  sources: []
epistemic_status:
  confidence: captured | asserted | attested | corroborated | inferred | contested | refuted
governance:
  owner: ...
  visibility: private | delegated | institutional | publishable | public
  capabilities: [discover, read, summarize, cite, export]
  retention: ephemeral | review | retained | archival | legal-hold
relations:
  derived_from: []
  supports: []
  contradicts: []
  supersedes: []
integrity:
  content_hash: sha256:...
  revision: 1
```

An agent-generated inference must remain identifiable as such. Confidence,
provenance and authority are independent properties.

## Memory regimes

The same content may be represented at different granularities and under
different access regimes. No automatic promotion is allowed.

```text
fine trace -> working context -> explicit promotion -> retained mneme
                                 -> redacted or public derivative
```

The working context is not a small permanent archive. It is task-bound,
minimal, expiring and not consolidated without an explicit rule or decision.

## Relation to Cogentia, Cogentigram and Cogentiscope

The mneme model must not be confused with the Cogentia triad.

- **Cogentia** is the persistent structure of thought and behaviour being
  inferred.
- **Cogentigram** is a measured, partial and revisable representation of that
  structure.
- **Cogentiscope** is the instrument or protocol that produces the
  representation.

A Cogentiscope may use mnemes among its observations, but a Cogentigram does
not need to retain the biographical memories from which it was inferred.

> Mnemes preserve governed contents. Cogentigrams preserve hypotheses about
> structural coherence.

## Portable storage model

The model remains independent of particular suppliers. It recognizes four
controlled storage families and one source family:

1. versioned repositories for text, schemas, manifests and source doctrine;
2. shared relational registers for queries, relations and access state;
3. autonomous local nodes, including filesystem and SQLite;
4. object stores for large immutable or encrypted assets;
5. external source systems where traces originate before capture.

One representation is declared authoritative for each purpose. Replicas,
indexes, vector stores and caches are reconstructible projections, not the
sole authority.

## Implementation boundary

The portable core knows capabilities, not suppliers:

```text
versioned repository
relational register
local node
object store
source adapter
inference engine
```

GitHub, PostgreSQL/Supabase, SQLite, S3-compatible buckets and AI providers are
replaceable adapters. A migration is complete only when the data, schemas,
access rules, provenance and necessary execution context can be restored and
used elsewhere.

## Initial implementation path

1. Define a versioned mneme schema and validator in Cogentia.
2. Produce Markdown/YAML source examples without personal data.
3. Map source assets and locators to mneme identifiers.
4. Materialize SQL, search and graph indexes as rebuildable projections.
5. Keep agent working context outside the retained corpus unless explicitly
   promoted.
6. Add export, checksum and reconstruction tests before treating a storage
   adapter as portable.

## Open questions

- Canonical identifier and serialization rules;
- relationship between mneme revisions and source revisions;
- capability syntax for delegated access;
- redaction and selective disclosure profiles;
- COP event and artifact mappings;
- conformance scenarios for portability and recovery.
