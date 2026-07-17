---
document_role: source
document_kind: spec
visibility: public
lifecycle_state: active
classification_source: cogentia.js
classification_version: '1'
classification_rule: spec
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
title: Normalize Export — Specification
---

# Normalize Export — Specification

## Status

Draft specification for Cogentia Personal Data Portability.

This document describes the expected behavior of a future generic export normalizer.

It is not tied to a specific private register.

## Goal

Convert a provider data export into a structured set of manifests, Markdown traces, media references, and indexes without modifying the raw source.

## Non-goals

The normalizer must not:

- replace the raw export;
- publish private data;
- decide what is legally safe to disclose;
- infer certainty from ambiguous traces;
- store large media files in Git by default;
- assume that every provider export has a stable format.

## Inputs

A normalizer may receive:

- a provider name;
- a local path to an extracted export;
- a path to the original archive, if available;
- an output directory;
- a selected language for generated human-readable files;
- a redaction profile;
- a media storage policy;
- a checksum policy.

## Outputs

A normalizer should produce:

```text
personal_data/
  sources/<provider>/<export-date>/
    export.md
    file_manifest.md
    checksum_manifest.md
    processing_report.md
  markdown/<provider>/<export-date>/
    ... generated Markdown traces ...
  media/references/<provider>-<export-date>.md
  index/
    chronology.md
    providers.md
    concepts.md
    people.md
    projects.md
```

The exact layout may vary, but the categories should remain stable.

## Processing stages

### 1. Register export

Create an export descriptor using the generic export schema.

Record:

- provider;
- export date;
- received date;
- source directory;
- output directory;
- sensitivity;
- large-media policy;
- verification status.

### 2. Inspect file tree

Generate a file manifest.

For each file, record when possible:

- relative path;
- extension;
- MIME type if available;
- size;
- detected category;
- whether it is textual;
- whether it is media;
- whether it was processed;
- reason for skipping, if skipped.

### 3. Compute checksums

When enabled, compute checksums for selected files.

Default checksum algorithm:

```text
sha256
```

For very large files, checksum computation may be optional or deferred.

### 4. Extract textual traces

Extract textual content from supported formats.

Initial candidates:

- `.txt`
- `.md`
- `.json`
- `.csv`
- `.html`
- `.xml`

Each extracted unit should be converted into a Markdown trace with frontmatter.

### 5. Generate media references

For media files, generate descriptive references instead of storing the media itself in Git by default.

Media categories:

- photo;
- video;
- audio;
- scan;
- PDF;
- other.

A media reference should include:

- source provider;
- source export;
- original filename;
- path or external reference;
- date or period when available;
- checksum when available;
- size when available;
- sensitivity;
- storage policy;
- backup locations when known.

### 6. Build indexes

Build indexes useful for human navigation and AI agents.

Initial indexes:

- chronology;
- providers;
- concepts;
- people;
- projects;
- media;
- sensitivity levels;
- processing gaps.

Indexes must not present inferred relations as certain unless explicitly verified.

### 7. Redaction support

The normalizer may support redaction helpers.

Redaction must be explicit.

A redacted trace must preserve a relation to the original source without exposing the redacted content.

Suggested statuses:

- raw;
- normalized;
- markdown;
- redacted;
- interpreted;
- contested;
- archived.

### 8. Generate processing report

Every run should generate a processing report.

The report should include:

- date and time;
- tool version;
- input path;
- output path;
- number of files inspected;
- number of files processed;
- number of traces generated;
- number of media references generated;
- skipped files;
- errors;
- warnings;
- uncertainty notes.

## Evidence levels

The normalizer should support these evidence levels:

- raw_export;
- provider_metadata;
- user_assertion;
- inferred;
- agent_interpretation;
- externally_verified.

## Language policy

The generic tool may use English identifiers for technical compatibility.

Generated human-readable files may use another language according to instance configuration.

A private legal register may therefore use French human-readable content while keeping stable English technical directory names such as `personal_data/`.

## Implementation candidates

Possible implementations:

- Inox, for governed, capability-oriented, traceable execution;
- JavaScript, for broader adoption;
- both, if the generic specification remains independent from a specific runtime.

## Minimal viable version

The MVP should:

1. register an export;
2. inspect the file tree;
3. generate a file manifest;
4. extract text from JSON, TXT, CSV, and HTML;
5. generate Markdown traces;
6. generate media references;
7. generate a processing report.

## Open questions

- How much provider-specific logic should be embedded in the generic normalizer?
- Should provider adapters be separate packages?
- Should redaction be manual-first or semi-automatic?
- Should checksums be mandatory for all files or only for archival candidates?
- How should very large provider-regenerable ZIP files be represented?
- How should the system handle deleted, unavailable, or policy-changed provider exports?
