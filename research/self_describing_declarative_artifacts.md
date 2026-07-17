---
title: "Self-Describing Declarative Corpus Artifacts"
description: "Working doctrine for making durable Corpus artifacts self-describing, traceable, and orchestrable."
author: "Jean Hugues Noël Robert"
creator: "Jean Hugues Noël Robert, with Cogentia-assisted structuring"
date: "2026-07-16"
last_modified_at: "2026-07-16"
document_role: "source"
document_kind: "working-doctrine"
visibility: "public"
lifecycle_state: "working"
status: "working-paper"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/self_describing_declarative_artifacts.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "unknown"
  origin_date: "2026-07-16"
  derived_from:
    - "docs/frontmatter-schema.md"
    - "docs/update-policy-registry.md"
    - "scripts/metadata-audit.js"
    - "scripts/metadata-plan.js"
    - "scripts/metadata-maintain.js"
    - "scripts/metadata-apply.js"
    - "https://github.com/JeanHuguesRobert/operium"
review:
  status: "under-review"
  reviewed_by: []
last_reviewed_at: "2026-07-16"
last_verified_at: "2026-07-16"
generated_by:
  - "human-directed conversational drafting"
  - "Codex (structuring and frontmatter validation)"
---

# Self-Describing Declarative Corpus Artifacts

## Status and purpose

This is a working doctrine. It records a design direction for human review; it is not yet a
canonical replacement for the Cogentia methodology or any repository-local mandate.

The Corpus should be made of durable artifacts that describe themselves sufficiently for humans,
agents, and deterministic tools to understand what they are, where they came from, and how they
may change.

## The artifact as a declarative unit

A durable artifact combines substantive content with a metadata envelope:

```text
content
+ identity
+ provenance
+ role
+ lifecycle
+ update policy
+ review state
+ temporal state
+ relationships
```

The result is a small declarative system. It does not execute authority by itself. It declares
state and constraints that external orchestration can inspect and enforce.

## Core declaration

Every durable artifact should be self-describing or have a traceable metadata sidecar. At minimum,
the metadata should make it possible to answer:

- What is this artifact?
- Is it source, derived, generated, operational, historical, or a decision?
- Who authored it, or is authorship unknown?
- Where did it originate?
- What immutable reference supports that origin?
- Which update policy governs it?
- When was it last modified, reviewed, and verified?
- What remains uncertain?
- Which artifacts does it depend on or supersede?

## Declarative autonomy and authority

Self-description is not self-authorization:

```text
declarative autonomy ≠ authority autonomy
```

An artifact may declare a policy, but it cannot grant itself permissions. A derived product may
declare its source, but it cannot become canonical by declaration. A service record may declare a
health observation, but Operium must provide the operational evidence.

## Orchestration loop

Cogentia and Operium provide the external orchestration:

```text
artifact declares state and policy
  → deterministic tool audits invariants
  → continuation delegates unresolved judgment
  → authorized update changes the declaration
  → audit records the transition
  → infrastructure evidence verifies runtime claims
```

The current Cogentia tools demonstrate the first implementation:

- `metadata:audit` provides a read-only machine report;
- `metadata:maintain` performs bounded on-demand triage;
- `metadata:plan` creates additive dry-run proposals;
- `metadata:apply` enforces hashes and idempotent application;
- `metadata:resolve` records explicit unknowns while adding Git-backed origin evidence.

Operium remains the authority for infrastructure health, deployment state, capability availability,
and recovery evidence. Cogentia remains the authority for corpus mandate, provenance, and
traceability invariants.

## Dogfooding and skin in the game

This document is intentionally an implementation witness. Its own frontmatter declares its role,
provenance, update policy, review state, timestamps, and unresolved origin reference. The Corpus
can audit it, plan its updates, and expose its incompleteness.

The feasibility claim is therefore operational rather than rhetorical:

```text
self-describing artifact
+ deterministic orchestration
+ external judgment when needed
+ explicit mandate
+ observable health
= living, inspectable Corpus
```

The Corpus must expose its own metadata debt, stale references, uncertain authorship, and failed
checks. A system that hides its own incompleteness is not demonstrating the quality it claims.

## Boundaries and open questions

- Which artifact kinds require embedded frontmatter versus sidecar metadata?
- Which fields are intrinsic content identity versus mutable envelope state?
- How should payload hashes exclude or include mutable review metadata?
- Which update-policy defaults are appropriate for each repository role?
- Which unresolved fields require human judgment rather than an authorized agent?

These questions remain open and should be handled through continuations or explicit decisions, not
silent normalization.
