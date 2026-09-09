---
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
license: CC BY-SA 4.0
language: en
title: Frontmatter Synonym Mapping — v0.1
date: '2026-05-27'
last_modified_at: '2026-09-09'
status: working-paper — auto-filled (frontmatter cleanup)
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/frontmatter-synonym-mapping.md
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
# Frontmatter Synonym Mapping — v0.1

This document lists synonyms observed across the corpus and their associated equivalence rules.

## Principles

- Synonyms are **tolerated** when an equivalence rule is documented here.
- There is **no deadline** for the use of legacy forms unless an explicit deprecation decision is made.
- When a synonym is deprecated, it will be marked `deprecated` in this document.
- A meaningful field does **not** become invalid merely because it is not yet registered in the shared schema. Local vocabulary is allowed to emerge before normalization.
- The `x-` prefix is optional: use it when explicitly marking an extension boundary is useful, not as a mechanical quarantine for unfamiliar fields.

## Synonym Mapping

### 1. Core Fields

| Observed keys                                | Recommended canonical name | Equivalence rule |
|----------------------------------------------|----------------------------|------------------|
| `author`, `authors`                          | `author` or `creator`      | See the detailed rule below |
| `creator`                                    | `creator`                  | Predominantly mechanical production |
| `affiliation`, `affiliations`                | `affiliation`              | Equivalent |
| `date`, `created`                            | `date`                     | Primary semantic date of the document |
| `last_modified_at`, `updated`, `last_updated` | `last_modified_at`        | Date of the latest actual modification |
| `license`, `licence`, `spdx-license-identifier` | `license`               | `license` is the preferred form |
| `language`, `lang`                           | `language`                 | Equivalent |
| `version`, `input_version`                   | `version`                  | Equivalent |

### 2. Provenance & Process

| Observed keys                                | Recommended canonical name | Equivalence rule |
|----------------------------------------------|----------------------------|------------------|
| `source_document`, `derived_from`, `predecessor` | `source_document`       | Primary source document |
| `ai_assisted_by`, `chatgpt`, `grok`, `claude`, `gemini`, `agent`, `agent_last` | `ai_assisted_by` | List of AI agents; order by importance where possible |
| `reviewed_by`, `review_context`              | `reviewed_by`              | Equivalent for human reviewers |
| `human_arbitration_by`                       | `human_arbitration_by`     | Person who made the final arbitration |
| `version_history`, `changelog`               | `version_history`          | Version history |

### 3. Navigation & Jekyll

| Observed keys           | Canonical name | Notes |
|-------------------------|----------------|-------|
| `nav_order`             | `nav_order`    | Standard Jekyll field |
| `parent`, `grand_parent`| `parent`       | Navigation hierarchy |
| `layout`                | `layout`       | Standard Jekyll field |

### 4. Legacy Fields / Fields to Remove

| Obsolete keys                                        | Recommended action |
|------------------------------------------------------|--------------------|
| `repository`, `path`, `intended_path`, `canonical_path`, `canonical_slug`, `repository_candidate` | Remove. Replace with `canonical_url` where necessary |
| `en`, `fr` translation links                         | Replace with `translations`, represented as an array of objects or links |

### 5. `author` / `creator` Rule (important)

- Use **`author`** when an identifiable human author exists, in accordance with copyright law.
- Use **`creator`** when production is predominantly or entirely mechanical, with no immediate human author—for example, complete automated generation by an AI system.

Examples:
- Document written primarily by a human → `author: "Jean Hugues Noël Robert, baron Mariani"`
- Document generated automatically by AI without significant human intervention → `creator: "Claude 4.3 (automated generation)"`

### 6. Experimental / Specific Fields

Many fields appear only once or twice, particularly in `barons-Mariani`. Examples include:
- `merge_audit`, `decision_stack`, `vector_clock`, `claimed_ops`, `ghost_ops`, and others.

**Rule:** These fields may remain under their natural names while their semantics are local or evolving. Recurrence is evidence that a field may deserve documentation or promotion into shared vocabulary; it is **not** by itself a reason to rename it with `x-`. Existing `x-` fields may remain when the prefix conveys a useful extension boundary, but migration away from `x-` is allowed when a natural name is clearer.

### 7. Patterns Observed During the Ingestion of New Repositories (2026-05, revised 2026-09)

Earlier ingestion passes across `barons-Mariani`, `cogentia`, `FractaVolta`, and other repositories frequently prefixed unfamiliar fields with `x-`. That treatment is now considered **over-cautious** when applied mechanically: it can freeze provisional schema boundaries, obscure useful domain vocabulary, and turn discovery into normalization before semantics are understood.

**a. “Packet” projects and network descriptions—FractaVolta style and some Cogentia documents**
- Frequent fields: `address`, `email`, `website`, `keywords`.
- Historical treatment: often converted to `x-address`, `x-email`, and similar fields, or grouped under `x-contact`.
- Current guidance: preserve meaningful natural names unless an explicit extension namespace is useful. Do not add `x-` merely because the shared schema does not yet know the field.

**b. Political work and Autonomy of Capacity—`barons-Mariani` / `autonomia`**
- Frequent fields: `type`, `branch`, `source_file`, `date_creation`, `date_derniere_entee`, `institutional_frame`, `public_dashboard`, and others.
- These documents are often “source material,” “campaign rhetoric,” or “working stock.”
- Historical treatment: many fields were prefixed with `x-`, especially `type`, `branch`, and `source_file`.
- Current guidance: preserve the repository's meaningful vocabulary first. Normalize only when a stable equivalence or shared semantic need has emerged.

**c. Structural corpus files—`index.md`, `concepts.md`, `corpus-status.md`**
- These files occur in nearly every repository.
- They are often maintained by tools, either generated or automatically updated.
- They generally receive `creator` rather than `author`, `status: working-paper`, the license and affiliation fields, while otherwise remaining relatively light.
- Ingestion guidance: identify these three file types early and apply the standardized “maintenance” treatment.

**d. Practical rule for a new repository**
1. Run the migration/scanning tool in dry-run mode.
2. Group unfamiliar fields by similarity without treating unfamiliarity as invalidity.
3. Preserve local fields under natural names while their semantics are being learned.
4. When recurrence reveals a stable cross-document concept, propose documentation, synonym mapping, or promotion to shared vocabulary.
5. Use `x-` only when an explicit extension boundary adds information.
6. Preserve highly descriptive status values unless they are genuinely inconsistent.

## General Equivalence Rules

- Synonyms are accepted when an equivalence rule is documented here.
- There is **no deadline** for using legacy forms unless an explicit deprecation decision is made and marked `deprecated` in this document.
- Tolerance for different styles is intentional and reflects the personality of human authors and AI agents.
- **Unregistered is not invalid.** Registration follows demonstrated semantic usefulness; it need not precede experimentation.

## Future Updates

This document will be extended after each migration pass or whenever significant new synonyms are observed.

---

## Practical Checklist: Quickly Ingesting a New Repository

When adding a repository to the corpus:

1. Scan it in broad/dry-run mode to identify unfamiliar fields and genuinely problematic statuses.
2. Identify the three structural file types—[`index.md`](../research/index.md), [`concepts.md`](../research/concepts.md), and [`corpus-status.md`](../research/corpus-status.md)—and apply the standard “maintenance” treatment: `creator`, base fields, and `working-paper`.
3. Group experimental fields that recur across several files, but preserve their natural names during discovery unless there is a concrete ambiguity or collision.
4. Promote or map a recurring field only when its semantics have become sufficiently stable to justify shared vocabulary.
5. Use `x-` where an explicit extension namespace is useful; never as an automatic response to an unfamiliar key.
6. Do not normalize everything in one pass. Priority belongs to factual correctness, traceability, and removal of genuinely deprecated fields.
7. Record newly learned patterns here for subsequent ingestion passes.

Objective: ingestion should become increasingly mechanical where semantics are stable, while remaining deliberately permissive where the Corpus is still learning its own vocabulary.
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Frontmatter Migration — v0.1](frontmatter-migration-v0.1.md)
- [Frontmatter Schema — v0.1 (Corpus)](frontmatter-schema.md)
- [Research Index — Cogentia](../research/index.md)
<!-- END_AUTO: backlinks -->
