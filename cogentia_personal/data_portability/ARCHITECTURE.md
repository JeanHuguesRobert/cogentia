---
document_role: source
document_kind: architecture
visibility: public
lifecycle_state: active
classification_source: cogentia.js
classification_version: '1'
classification_rule: architecture
classification_confidence: medium
author: unknown
date: unknown
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
update_policy: UP-DEFAULT-REVIEWED
title: Cogentia Personal Data Portability — Architecture
---

# Cogentia Personal Data Portability — Architecture

## Status

Draft architecture note.

This document records the main architectural choices for the generic Cogentia Personal data portability layer.

## Purpose

Cogentia Personal Data Portability turns legal data exports into a sovereign, navigable, versioned trace corpus.

The architecture must support both:

1. private personal instances containing real data;
2. generic reusable tooling that contains no real private data.

## Core separation

The generic layer belongs to Cogentia Personal.

A private register is an instance using this layer.

The generic layer may contain schemas, templates, tools, examples, and documentation.

A private instance may contain real personal data, legal traces, family archives, patrimonial continuity notes, private decisions, and access rules.

The two must never be confused.

## Why Git

Git provides:

- versioned continuity;
- diffable text history;
- distributed copies;
- commit-level traceability;
- reproducible publication or private preservation workflows;
- compatibility with existing developer and archival practices.

Git is especially appropriate for:

- Markdown;
- metadata;
- manifests;
- indexes;
- schemas;
- scripts;
- documentation.

Git is not a default archive for large media files or massive raw exports.

## Why Markdown

Markdown provides a durable human-readable layer.

It is:

- simple;
- portable;
- readable without specialized software;
- easy to version;
- easy for AI agents to parse;
- compatible with static publishing systems;
- suitable for long-term corpus navigation.

Markdown is the map, not the territory.

The raw export remains the source.

## Why YAML frontmatter

YAML frontmatter provides structured metadata at the beginning of human-readable Markdown documents.

It allows each trace to remain readable by humans while also being processable by tools and AI agents.

Frontmatter should record:

- identifier;
- source provider;
- source export;
- source file;
- evidence level;
- status;
- sensitivity;
- related entities;
- media references;
- verification status.

## Why manifests

Manifests preserve provenance, scope, and processing state.

They should record:

- what was received;
- where it came from;
- what was processed;
- what was skipped;
- what was transformed;
- what remains uncertain;
- where large files are stored or referenced.

A manifest is not a summary. It is an accountability layer.

## Why checksums

Checksums support integrity verification.

The default algorithm should be:

```text
sha256
```

Checksums are especially useful for:

- raw archives;
- important media files;
- exported databases;
- legal or patrimonial evidence;
- cold storage verification;
- disaster recovery checks.

For very large provider-regenerable exports, checksums may be optional or deferred, but the decision should be recorded.

## Large-file strategy

Large files should not be committed to Git by default.

The architecture supports several storage modes:

- regular Git for text, metadata, manifests, schemas, indexes, and scripts;
- Git LFS for selected medium-size files useful in repository workflows;
- external storage for large media files;
- cold or offline storage for disaster recovery;
- provider-regenerable status when an export can be requested again;
- institutional storage when long-term preservation requires a legal or archival custodian.

The media object and its descriptive trace must remain distinct.

## Provider-regenerable sources

Some raw exports may be very large and can be requested again from the provider.

Such exports may be treated as provider-regenerable rather than fully backed up.

This is not sovereign preservation.

It is a pragmatic status based on current access to the provider, the account, and the export mechanism.

The risk must be explicit:

- provider account loss;
- policy change;
- export format change;
- delayed retrieval;
- incomplete future export;
- provider failure or refusal.

## Language policy

The generic layer uses English for technical compatibility and international reuse.

Private instances may use their own reference language for human-readable content.

A private legal register may use French text while keeping stable English technical directory names such as:

```text
personal_data/
```

## Evidence policy

A trace is not truth by itself.

A trace must be qualified by its evidence level.

Supported evidence levels:

- raw_export;
- provider_metadata;
- user_assertion;
- inferred;
- agent_interpretation;
- externally_verified.

Interpretation must never be silently merged into raw-source representation.

## Redaction policy

Redaction must be explicit and traceable.

A redacted trace should preserve a relation to the source while avoiding exposure of sensitive content.

The system should support:

- private originals;
- redacted working copies;
- public or shareable derivatives;
- logs of redaction decisions.

## Runtime strategy

The architecture should remain independent from a specific runtime.

Two implementation targets are especially relevant:

- Inox, for governed, capability-oriented, traceable execution;
- JavaScript, for broad developer adoption.

Inox may better express capability boundaries and traceable composition.

JavaScript may support faster adoption and integration with existing tools.

The specification must remain stable enough to support both.

## Minimal viable architecture

The MVP should support:

1. export registration;
2. file-tree inspection;
3. source manifest generation;
4. checksum generation;
5. text extraction;
6. Markdown trace generation;
7. media reference generation;
8. index generation;
9. frontmatter validation;
10. processing reports.

## Design formula

Raw exports are the territory.

Markdown traces are the map.

Git provides versioned continuity.

Manifests provide accountability.

Checksums provide integrity.

Media references preserve traceability without turning Git into a heavy archive.

Private registers preserve real lives.

Cogentia Personal provides the reusable method.
