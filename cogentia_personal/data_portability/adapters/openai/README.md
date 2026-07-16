---
title: OpenAI Adapter — Cogentia Personal Data Portability
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

# OpenAI Adapter — Cogentia Personal Data Portability

## Status

Draft provider adapter note.

This adapter concerns personal exports from OpenAI services, especially ChatGPT conversation exports.

## Why OpenAI matters

For some users, ChatGPT conversations may represent one of the richest long-term personal trace corpora.

They may contain:

- research conversations;
- drafting processes;
- legal or administrative preparation;
- personal reflections;
- technical reasoning;
- project memory;
- family and patrimonial context;
- political or institutional strategy;
- emotionally sensitive material.

This makes OpenAI exports especially relevant for Cogentia Personal.

## Sensitivity principle

OpenAI conversations are not uniformly publishable.

Some conversations may be suitable for public derivative publication after review and redaction.

Other conversations may be strictly private.

Some conversations may contain third-party data, legal context, family matters, personal health, grief, financial constraints, political strategy, or other sensitive material.

The adapter must therefore support sensitivity classification rather than assuming that a conversation corpus is either entirely public or entirely private.

## Private register relation

A private register may store real OpenAI export traces.

For example, a private register may contain:

- raw OpenAI export manifests;
- normalized Markdown conversations;
- private indexes;
- sensitivity classifications;
- references to derived public documents;
- redaction decisions;
- transmission notes.

The generic OpenAI adapter must not contain real private conversations.

## Public derivative relation

A public repository may contain only:

- generic adapter code;
- schemas;
- fictitious examples;
- anonymized examples;
- redacted derivatives intentionally published;
- methodological documents that do not expose private data.

The default rule is:

```text
Private first. Public only after explicit review.
```

## Expected export content

OpenAI exports may include conversation records and metadata.

The exact format may change over time.

The adapter should therefore avoid hard-coding assumptions unless they are versioned and documented.

## Initial mapping targets

The adapter should attempt to map conversations to generic Cogentia Personal traces.

Potential fields:

- conversation identifier;
- title;
- creation date;
- update date;
- message order;
- role or author;
- message content;
- model metadata when available;
- attachments or file references when available;
- project or concept tags when inferred or manually assigned;
- sensitivity status;
- evidence level.

## Suggested sensitivity statuses

Suggested initial statuses:

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

These statuses are advisory and should be adapted by private instances.

## Processing rules

The adapter should:

- preserve the raw export as source or source reference;
- generate Markdown traces for conversations;
- keep message order explicit;
- mark inferred tags as inferred;
- mark summaries as summaries;
- separate raw conversation content from interpretation;
- generate indexes by chronology, project, concept, and sensitivity;
- avoid publishing real conversations by default;
- generate redaction candidates but not decide publication alone.

## Evidence levels

Suggested evidence levels:

- raw_export;
- provider_metadata;
- user_assertion;
- inferred;
- agent_interpretation;
- externally_verified.

A summary generated from a conversation is not the conversation itself.

A derived article is not the raw trace.

A public post based on a private conversation is a derivative product.

## Relation to Cogentia corpus method

OpenAI conversations can act as source material for a reactive corpus.

A conversation may generate:

- a private trace;
- a normalized Markdown conversation;
- a research note;
- a public article;
- a legal memo;
- a project document;
- a commit in another repository.

The adapter should preserve these relations without confusing the layers.

## Redaction policy

Redaction should be explicit, reviewable, and traceable.

A redacted derivative should record:

- source conversation identifier;
- redaction date;
- redaction reason;
- redaction operator;
- publication status;
- residual risk.

## Open questions

- How should long conversations be split into stable Markdown traces?
- Should messages be individual traces or should conversations be primary traces?
- How should attachments be referenced?
- How should private summaries be distinguished from public derivatives?
- How should user-controlled tags be reconciled with agent-inferred tags?
- How should sensitive conversations be excluded from public corpus generation by default?

## Final rule

OpenAI exports may be among the most valuable Cogentia Personal sources.

They must also be treated as highly sensitive by default.

The adapter must help transform conversation history into a usable corpus without collapsing the boundary between private memory and public knowledge.
