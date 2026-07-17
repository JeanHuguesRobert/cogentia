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
title: Cogentia Trace — Inversion of Control
---

# Cogentia Trace — Inversion of Control

Cogentia Trace must not pretend to decide alone when a decision requires human judgment.

Instead, the CLI must be able to interrupt itself, emit a structured decision request, and resume later from a continuation.

## Principle

```text
tool computes
  -> tool detects judgment boundary
  -> tool suspends
  -> tool emits continuation
  -> human or calling agent answers
  -> tool resumes
```

## Judgment boundaries

Typical cases:

- visibility classification;
- sensitivity classification;
- publication approval;
- anonymization decision;
- vectorization decision;
- packet creation;
- escalation or closure of an interaction.

## Doctrine

The tool suggests and prepares. The human judges and decides.

This follows the pattern already explored in `cogentia.js`: externalized judgment through continuations.
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Research Index — Cogentia](../../research/index.md)
<!-- END_AUTO: backlinks -->
