---
title: Generic ZIP Adapter
author: unknown
date: '2026-06-15'
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 84a7abb
  origin_date: '2026-06-15'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# Generic ZIP Adapter

## Purpose

The generic ZIP adapter inspects ZIP archives or extracted ZIP directories without assuming a specific provider.

It is useful when a provider export has not yet received a dedicated adapter.

## Status

Draft.

Confidence level:

```text
experimental
```

## Inputs

The adapter may receive:

- path to a ZIP archive;
- path to an extracted directory;
- provider label, if known;
- export date, if known;
- output directory;
- checksum policy;
- media reference policy.

## Expected outputs

The adapter should produce:

- file tree manifest;
- archive descriptor;
- optional checksum manifest;
- detected file categories;
- list of candidate textual files;
- list of candidate media files;
- list of skipped files;
- processing report.

## Detection rules

The adapter should classify files conservatively.

Suggested categories:

- text;
- json;
- csv;
- html;
- xml;
- image;
- video;
- audio;
- pdf;
- archive;
- unknown.

## Safety rules

The adapter must not modify the original archive.

The adapter must not import large media files into Git by default.

The adapter must not infer provider semantics unless a provider-specific adapter is available.

## Uncertainty

When file meaning is unclear, the adapter should mark it as unknown rather than inventing structure.

## Relation to other adapters

The generic ZIP adapter may delegate candidate files to:

- generic JSON adapter;
- generic HTML adapter;
- generic CSV extractor;
- generic media reference builder.

## Minimal report fields

A processing report should include:

- archive path;
- extraction path;
- number of files;
- total size;
- detected file types;
- processed files;
- skipped files;
- warnings;
- errors;
- uncertainty notes.
