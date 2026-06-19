---
document_role: "source"
document_kind: "data-portability"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "data-portability"
classification_confidence: "medium"
---

# Cogentia Personal Data Portability — Provider Adapters

## Status

Draft adapter architecture note.

This document defines how provider-specific data export formats should be handled without contaminating the generic Cogentia Personal data portability core.

## Purpose

Provider exports are unstable, heterogeneous, and often poorly documented.

The architecture must therefore separate:

1. the generic data portability core;
2. provider-specific adapters;
3. private instances containing real data.

## Core principle

The core defines stable concepts.

Adapters translate provider-specific exports into those stable concepts.

Private instances store real traces.

The three layers must remain separate.

## Layer 1 — Generic core

The generic core includes:

- schemas;
- templates;
- format policy;
- normalizer specification;
- evidence levels;
- storage policies;
- media reference rules;
- validation rules;
- processing report conventions.

The core must not include provider-specific assumptions except where explicitly documented.

## Layer 2 — Provider adapters

A provider adapter knows how to inspect and normalize exports from one provider or export family.

An adapter may define:

- expected file tree patterns;
- known filenames;
- known JSON keys;
- known HTML structures;
- conversation extraction rules;
- post extraction rules;
- media reference extraction rules;
- metadata mapping rules;
- provider-specific warnings;
- known format changes over time.

Adapters must convert provider-specific material into the generic schemas.

## Layer 3 — Private instances

A private instance contains real exported data and locally generated traces.

It may use adapters, but it must not be used as a public fixture or example.

## Adapter naming

Suggested adapter names:

```text
adapter_meta
adapter_google
adapter_openai
adapter_github
adapter_linkedin
adapter_substack
adapter_generic_zip
adapter_generic_json
adapter_generic_html
```

Names should remain descriptive and stable.

## Adapter structure

Suggested structure:

```text
cogentia_personal/data_portability/adapters/
  README.md
  meta/
    README.md
    mapping.yaml
    warnings.md
  google/
    README.md
    mapping.yaml
    warnings.md
  openai/
    README.md
    mapping.yaml
    warnings.md
  generic_json/
    README.md
    mapping.yaml
```

## Mapping files

A `mapping.yaml` file may describe how provider fields map to generic trace fields.

Example:

```yaml
provider: example_social
adapter_id: adapter_example_social
status: draft

records:
  conversations:
    source_pattern: messages/*.json
    record_id: $.id
    timestamp: $.created_at
    author: $.sender.name
    text: $.content.text
    media: $.attachments[]

maps_to:
  trace:
    source_provider: provider
    source_record_id: record_id
    captured_at: timestamp
    related_media: media
```

This example is fictitious.

## Provider instability

Adapters must assume that provider exports may change.

Each adapter should document:

- tested export date;
- tested language or locale;
- tested account type;
- known missing fields;
- known changed structures;
- unknown or ambiguous fields;
- whether the provider can regenerate the export.

## Versioning

Adapters should be versioned.

Suggested version fields:

```yaml
adapter_version: 0.1.0
provider_export_format_date: 2026-06-11
schema_version: cogentia_personal.data_portability.trace.v0
```

## Validation

Adapters should produce validation reports.

A validation report should include:

- files inspected;
- files matched;
- records extracted;
- records skipped;
- unmapped fields;
- ambiguous fields;
- errors;
- warnings;
- confidence level.

## Confidence levels

Suggested adapter confidence levels:

- experimental;
- partial;
- usable;
- verified;
- obsolete.

## Redaction and privacy

Adapters must not publish private data.

Test fixtures must be fictitious, synthetic, or anonymized.

If a provider export contains third-party data, the adapter should flag that risk rather than attempting to decide legal permissibility.

## Media handling

Adapters should detect large media files and generate media references.

They should not import large media into Git by default.

They may record:

- original path;
- provider filename;
- media type;
- size;
- checksum if available or computed;
- relation to textual trace;
- storage policy.

## Generic fallback adapters

When no provider adapter exists, generic fallback adapters may still help:

- generic ZIP tree inspector;
- generic JSON extractor;
- generic CSV extractor;
- generic HTML text extractor;
- generic media reference builder.

Fallback adapters should be conservative and should mark uncertainty explicitly.

## Implementation targets

Adapters may be implemented in:

- Inox, for governed capability-oriented processing;
- JavaScript, for broad adoption;
- both, if mappings and schemas remain implementation-independent.

## Final rule

Provider adapters translate unstable exports into stable Cogentia Personal traces.

They must not merge provider assumptions into the generic core.

They must not leak private instance data into the reusable layer.
