---
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
license: CC BY-SA 4.0
language: en
title: Frontmatter Schema — v0.1 (Corpus)
date: '2026-05-27'
last_modified_at: '2026-07-16'
status: working-paper — auto-filled (frontmatter cleanup)
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/frontmatter-schema.md
last_stamped_at: 2026-06-01T00:00:00.000Z
ai_assisted_by:
  - GPT-5.6 Thinking (English translation)
document_role: operational
document_kind: documentation
visibility: public
lifecycle_state: working
classification_source: cogentia.js
classification_version: '1'
classification_rule: documentation
classification_confidence: medium
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
---
# Frontmatter Schema — v0.1 (Corpus)

This document defines the metadata schema (frontmatter) used across the multi-repository corpus.

## Philosophy

- **Flat fields** by default, for readability and simplicity.
- A deliberate mixture of **formal structure** and **natural language**, especially for AI agents.
- **Equivalence rules** rather than a prohibition on synonyms, in the TIMTOWTDI spirit: “There Is More Than One Way.”
- Priority is given to **traceability**, **portability**, and **privacy protection**.
- The schema must remain **evolvable** and **pragmatic**. We avoid needless complexity: clear equivalence rules are preferred to excessive rigidity.

## General Rules

- All substantive documents—research, specifications, and important notes—must carry frontmatter.
- Every tracked corpus document must carry minimum traceability metadata, regardless of repository or directory. Missing information must be declared explicitly (`unknown`, `unreviewed`, or `[]`), never filled by assumption.
- Default values should be preferred to reduce writing overhead.
- Synonyms are tolerated **if and only if** an equivalence rule is documented in [`frontmatter-synonym-mapping.md`](frontmatter-synonym-mapping.md).
- `privacy` defaults to `public`. It only needs to be specified when the document falls outside that regime.
- A document that is **entirely automated**, with no human contributor, must be readily identifiable through the `generated_by` field.

---

## Field Schema (v0.1)

### 1. Core Fields (required for every tracked document)

| Field                | Type                  | Default                              | Required? | Notes |
|----------------------|-----------------------|--------------------------------------|-----------|-------|
| `title`              | string                | —                                    | Yes       | — |
| `subtitle`           | string                | —                                    | No        | — |
| `description`        | string                | —                                    | Recommended | Short summary |
| `author`             | string                | —                                    | Yes       | Known human author, otherwise `unknown` |
| `creator`            | string                | "Jean Hugues Noël Robert, baron Mariani" | No | Use when production is predominantly or entirely mechanical. Equivalence rule: `author` and `creator` are not automatically equivalent. |
| `affiliation`        | string                | "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica" | Yes | — |
| `date`               | string (ISO 8601)     | —                                    | Yes       | Primary semantic date, otherwise `unknown` |
| `last_modified_at`   | string (ISO 8601)     | —                                    | No        | Date of the latest actual modification |
| `license`            | string                | "CC BY-SA 4.0"                       | Yes       | — |
| `language`           | string                | "fr"                                 | Yes       | — |

### 2. Provenance & Traceability (required for every tracked document)

| Field                    | Type                    | Default | Notes |
|--------------------------|-------------------------|---------|-------|
| `canonical_url`          | string                  | —       | Required for substantive documents |
| `last_stamped_at`        | string (ISO 8601)       | —       | Generated automatically |
| `version`                | string                  | —       | — |
| `status`                 | string or list          | —       | Controlled base list plus free-form qualifier. See the rules below. |
| `methodology`            | string or array         | —       | Method implementation, for example “Cogentia Commons.” The Second Method is implicit. |
| `generated_by`           | string or list          | —       | Ordered by decreasing importance. Use a single field. |
| `ai_assisted_by`         | array                   | —       | List of participating AI systems |
| `reviewed_by`            | array                   | —       | — |
| `human_arbitration_by`   | string                  | —       | Person who made the final arbitration |
| `version_history`        | array                   | —       | — |
| `update_policy`          | string                  | `UP-DEFAULT-REVIEWED` | Identifier from the [update-policy registry](update-policy-registry.md) |

### 2 bis. Minimum Provenance (required)

Each document must also declare a `provenance` block and a `review` block:

```yaml
provenance:
  origin_type: "repository" # repository, external-repository, generated, conversation, unknown
  origin_repository: "owner/repository" # or unknown
  origin_ref: "<immutable commit, tag, or URL>" # or unknown
  origin_date: "YYYY-MM-DD" # or unknown
  derived_from: []
review:
  status: "unreviewed"
  reviewed_by: []
```

`origin_ref` must be immutable or externally verifiable. A current branch name alone is not sufficient. For generated documents, also record `generated_by` and the input documents. For historical or unattributed material, use `unknown` explicitly and preserve the uncertainty.

### 3. Documentary Provenance

| Field                    | Type          | Default | Notes |
|--------------------------|---------------|---------|-------|
| `source_document`        | string        | —       | **Primary source document**, when one clearly exists |
| `additional_sources`     | array         | —       | Complementary source documents, where relevant |
| `derived_from`           | string        | —       | **Equivalence rule:** tolerated synonym of `source_document` |

**Important rule:**
- Use `source_document` only when there is a **clear and identifiable** source document.
- When no clear sovereign source document exists, as is often the case in transdisciplinary work, do not force this field. Put references in the document body instead.
- Do not specify a source “type” such as sovereign or symmetric in frontmatter; doing so would be redundant and subjective.

### 4. Navigation & Publication (Jekyll)

Standard Jekyll fields such as `layout`, `permalink`, `nav_order`, `parent`, and `has_children` remain permitted.

### 5. Semantics & Future Traceability (preparation for Solid / Linked Data)

| Field               | Type   | Notes |
|---------------------|--------|-------|
| `webid`             | string | Planned for later; a GitHub pointer is currently acceptable |
| `rights`            | string | More granular than `license`, when needed |
| `tags`              | array  | — |
| `related_documents` | array  | — |
| `related_projects`  | array  | — |
| `document_role`     | string | Examples: `source`, `symmetric-derived`, `synthesis`, `operational-note`, `translation` |

---

## Specific Rules

### Rule for `status`

- The `status` field is based on a **controlled list** of base values.
- A document may have **multiple simultaneous statuses**.
- A **natural-language qualifier** may be added after a dash or as a sentence.
- Current official base values:
  - `draft`
  - `working-paper`
  - `stable`
  - `under-review`
  - `deprecated`
  - `superceded`

Accepted examples:
- `status: "working-paper"`
- `status: "working-paper, superceded"`
- `status: "working-paper — version revised after objections raised on 2026-05-27"`
- `status: ["working-paper", "under-review"]`

### Rule for `generated_by`

- `generated_by` is a **single list**, or a string when there is only one agent.
- The list is **ordered by decreasing importance**: the most involved agent comes first and the least involved comes last.
- Use the most precise description available, including the agent and its role where useful.
- If the document is **entirely automated**, with no human agent, this must be immediately visible—for example by placing an AI agent first or stating the fact explicitly.

Example:
```yaml
generated_by:
  - "Jean Hugues Noël Robert"
  - "Claude 4.3 (drafting + structuring)"
  - "Grok 4.3 (critical review)"
```

Entirely automated example:
```yaml
generated_by: "Claude 4.3 (complete automated generation)"
```

### Rule for Synonyms and Stylistic Tolerance

- Synonyms are **tolerated** when a clear equivalence rule is documented in [`frontmatter-synonym-mapping.md`](frontmatter-synonym-mapping.md).
- There is **no deadline** for the use of alternative forms unless an explicit deprecation decision is made and marked `deprecated` in the mapping file.
- “Style” is part of the personality of the author, whether human or agent. Excessive uniformity is not a goal.

Main equivalence rules—see the mapping file for the complete list:
- `author` / `authors` ↔ `creator`, subject to the copyright rule explained in the mapping;
- `date` / `created` → equivalent;
- `last_modified_at` / `updated` → equivalent;
- `source_document` / `derived_from` → `source_document` preferred;
- `tags` / `keywords` → `tags` preferred.

### Rule for Extensions

- Extension fields must begin with the `x-` prefix, for example `x-my-experiment` or `x-internal-note`.
- These fields are unrestricted.
- Philosophy: **flexible at input, strict at output**, inspired by IETF principles.

**Practical guidance from the 2026 ingestion passes:**
- When the same experimental field appears in several files within one repository—for example `address`, `type`, `branch`, or `source_file`—move it quickly under an `x-` prefix to avoid polluting the primary schema.
- Recurring observed clusters include:
  - “Packet” projects and network descriptions: `address`, `email`, `website`, `keywords`;
  - Political work and source material: `type`, `branch`, `source_file`, and specific creation dates.
- Do not force immediate semantic normalization. Prefix first in order to preserve readability.

Additional synonyms may be introduced provided that an equivalence rule is documented in this file.

### Rule for Privacy

- By default, every document is considered **public**.
- It is not necessary to add `privacy: public`.
- Other values will be introduced only when a concrete need arises.

---

## Fields to Remove During Migration

The following fields are considered legacy and must no longer be used in new documents:

- `repository`
- `path`
- `intended_path`
- `canonical_path`
- `canonical_slug`
- `repository_candidate`

---

## Notes

- This schema is designed to be **readable by humans and AI agents**.
- It seeks a balance between formal structure and natural-language expressiveness.
- It is explicitly designed to remain **evolvable** without excessively disruptive changes.

### Accelerating the Ingestion of New Repositories

To accelerate the onboarding of a new repository:

- Begin by identifying structural files such as [`index.md`](../research/index.md), [`concepts.md`](../research/concepts.md), and [`corpus-status.md`](../research/corpus-status.md), then apply a light and consistent treatment—usually `creator`, the base fields, and `working-paper`.
- Do not attempt complete semantic normalization during the first pass. The first pass should remove legacy fields and prefix recurring experimental clusters with `x-`.
- Use the patterns documented in [`frontmatter-synonym-mapping.md`](frontmatter-synonym-mapping.md), particularly the “Patterns Observed During Ingestion” section.

The objective is for every newly ingested repository to make subsequent ingestions more mechanical.

---

*Version: 0.1 — Working draft*
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Frontmatter Migration — v0.1](frontmatter-migration-v0.1.md)
- [Research Index — Cogentia](../research/index.md)
<!-- END_AUTO: backlinks -->
