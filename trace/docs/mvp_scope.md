---
document_role: operational
document_kind: operational-note
visibility: public
lifecycle_state: active
classification_source: cogentia.js
classification_version: '1'
classification_rule: operational-note
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
title: Cogentia Trace — MVP Scope
---

# Cogentia Trace — MVP Scope

## Goal

The MVP creates the minimal local-first foundation for importing an official ChatGPT/OpenAI export and transforming it into normalized, classifiable and continuable traces.

## Included

- documentation;
- schemas;
- fictive examples;
- local-first design;
- ChatGPT/OpenAI export as first target;
- continuation mechanism for judgment boundaries.

## Excluded

- Supabase;
- RAG;
- embeddings;
- Gmail import;
- Facebook import;
- public release of personal data;
- large binary storage;
- automatic publication.

## First implementation target

A later script should be added:

```text
trace/scripts/import_chatgpt_export.py
```

It should read a local OpenAI export, extract conversations, produce `events.jsonl`, and emit continuations when visibility or sensitivity decisions cannot be safely inferred.

## Success criterion

The MVP succeeds when a local export can be transformed into normalized local traces without exposing private data and without pretending to automate human judgment.
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Research Index — Cogentia](../../research/index.md)
<!-- END_AUTO: backlinks -->
