---
document_role: source
document_kind: data-portability
visibility: public
lifecycle_state: active
classification_source: cogentia.js
classification_version: '1'
classification_rule: data-portability
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
title: OpenAI Export Adapter — MVP Framing
---

# OpenAI Export Adapter — MVP Framing

## Status

Draft framing document for a generic reusable MVP.

This document belongs to Cogentia Personal Data Portability.

It describes a generic tool that can be reused by other people. It must not contain real private conversations.

## Purpose

The MVP should take a local OpenAI or ChatGPT data export, extract conversations, convert them into Markdown traces, classify their sensitivity conservatively, and produce manifests and indexes.

The MVP must help a person decide what remains private and what may later become a public derivative.

It must not decide automatically what is publishable.

## Core principle

Private first.

Public only after explicit review.

The tool extracts, maps, indexes, and reports.

The human decides what may be published, redacted, transformed, or kept private.

## Input

The MVP should accept:

```text
openai_export.zip
```

or:

```text
an extracted OpenAI export directory
```

The tool must not assume that OpenAI export formats are stable.

It should inspect the file tree and detect useful JSON, HTML, TXT, or other structured files.

## Generic output layout

Suggested output:

```text
personal_data/
  sources/openai/<export-date>/
    export.md
    file_manifest.md
    checksum_manifest.md
    processing_report.md
  markdown/openai/<export-date>/
    conversations/
      <conversation-id>.md
  index/
    chronology.md
    sensitivity.md
    projects.md
    concepts.md
    publishable_candidates.md
    private_only.md
```

The exact layout may evolve, but the categories should remain stable.

## Private register use case

A private register may receive the generated real traces.

Example:

```text
registre-mariani/personal_data/
```

Such a private register may contain real conversations, legal traces, family material, grief-related material, strategic material, and other sensitive content.

It must not be confused with the generic public tool.

## Public generic layer

The public generic layer may contain:

- code;
- schemas;
- templates;
- mapping rules;
- documentation;
- fictitious examples;
- anonymized tests.

It must not contain real private conversations.

## MVP functions

### 1. Inspect

Inspect the export file tree and produce:

```text
file_manifest.md
```

For each file, record when possible:

- path;
- extension;
- size;
- probable type;
- processed or skipped;
- reason for skipping.

### 2. Normalize conversations

Detect conversations and convert them into Markdown files.

Each conversation trace should include YAML frontmatter.

Example fields:

```yaml
id: trace.openai.<date>.<conversation-id>
source_provider: openai
source_export: export.openai.<date>
title: null
created_at: null
updated_at: null
status: markdown
sensitivity: private
evidence_level: raw_export
contains_third_party_data: unknown
publishability: undecided
related_projects: []
related_concepts: []
related_media: []
```

Default sensitivity should be conservative.

The tool should not assign `public_possible` by default.

### 3. Generate indexes

Generate indexes for navigation:

- chronology;
- projects;
- concepts;
- sensitivity;
- private-only traces;
- publishable candidates.

A publishable candidate is not a publishable document.

It is only a trace that may deserve human review for possible public reuse.

### 4. Generate processing report

The processing report should include:

- date and time;
- tool version;
- input path;
- output path;
- number of files inspected;
- number of conversations detected;
- number of conversations normalized;
- number of skipped files;
- errors;
- warnings;
- uncertain assumptions.

### 5. Support conservative classification

The MVP may suggest sensitivity classes, but must not decide publication.

Suggested classes:

- public_possible;
- private;
- sensitive;
- third_party;
- legal_sensitive;
- family_sensitive;
- health_sensitive;
- financial_sensitive;
- political_strategy;
- grief_or_intimate;
- publishable_derivative_exists;
- do_not_publish.

Initial default:

```text
private
```

or:

```text
unclassified
```

Never:

```text
public_possible
```

unless explicitly configured or manually reviewed.

## Non-goals

The MVP must not:

- publish conversations;
- push generated traces to a public repository;
- decide legal disclosure;
- infer certainty from ambiguous traces;
- remove or rewrite raw sources;
- merge private instance data into the public generic layer;
- use real private conversations as examples.

## Implementation preference

A first implementation may use JavaScript or TypeScript for broad reuse.

A later Inox implementation may better express capability boundaries, governed execution, and traceability.

The specification should remain runtime-independent.

## Command-line target

Possible future command:

```bash
cogentia-personal-openai normalize \
  --input ~/Downloads/openai-export \
  --output ./personal_data \
  --language fr \
  --default-sensitivity private \
  --no-public-export
```

Possible report command:

```bash
cogentia-personal-openai report ./personal_data/sources/openai/2026-06-12/
```

## MVP formula

The MVP publishes nothing.

It transforms an OpenAI export into a private, navigable, versionable, classifiable, and auditable corpus.

Any public derivative is a second act: human, explicit, reviewed, redacted if needed, and traceable.
