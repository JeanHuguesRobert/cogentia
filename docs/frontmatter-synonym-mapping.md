---
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
language: "en"
title: "Frontmatter Synonym Mapping — v0.1"
date: "2026-05-27"
last_modified_at: "2026-07-16"
status: "working-paper — auto-filled (frontmatter cleanup)"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/frontmatter-synonym-mapping.md
last_stamped_at: 2026-06-01
ai_assisted_by:
  - "GPT-5.6 Thinking (English translation)"
document_role: "operational"
document_kind: "documentation"
visibility: "public"
lifecycle_state: "working"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "documentation"
classification_confidence: "medium"
---
# Frontmatter Synonym Mapping — v0.1

This document lists synonyms observed across the corpus and their associated equivalence rules.

## Principles

- Synonyms are **tolerated** when an equivalence rule is documented here.
- There is **no deadline** for the use of legacy forms unless an explicit deprecation decision is made.
- When a synonym is deprecated, it will be marked `deprecated` in this document.

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

**Rule:** These fields may remain for now. If their use expands, they will be reviewed to determine whether they should be normalized or converted into `x-` extensions.

### 7. Patterns Observed During the Ingestion of New Repositories (2026-05)

During broad migration passes across `barons-Mariani`, `cogentia`, `FractaVolta`, and other repositories, several clusters of experimental fields recurred. The following treatment was used to accelerate future ingestion.

**a. “Packet” projects and network descriptions—FractaVolta style and some Cogentia documents**
- Frequent fields: `address`, `email`, `website`, `keywords`.
- Observed treatment: often converted to `x-address`, `x-email`, and similar fields, or grouped under `x-contact`.
- Ingestion guidance: when several of these fields appear in project-description files, convert them to `x-` fields in one mechanical pass.

**b. Political work and Autonomy of Capacity—`barons-Mariani` / `autonomia`**
- Frequent fields: `type`, `branch`, `source_file`, `date_creation`, `date_derniere_entee`, `institutional_frame`, `public_dashboard`, and others.
- These documents are often “source material,” “campaign rhetoric,” or “working stock.”
- Observed treatment: many fields were prefixed with `x-`, especially `type`, `branch`, and `source_file`. Rich descriptive status values were legitimately retained.
- Guidance: do not normalize everything too quickly. These repositories have their own style. Prefix recurring structural fields with `x-` and preserve rich statuses.

**c. Structural corpus files—`index.md`, `concepts.md`, `corpus-status.md`**
- These files occur in nearly every repository.
- They are often maintained by tools, either generated or automatically updated.
- Observed treatment: they generally receive `creator` rather than `author`, `status: working-paper`, the license and affiliation fields, while otherwise remaining relatively light.
- Ingestion guidance: identify these three file types early and apply the standardized “maintenance” treatment.

**d. Practical rule for a new repository**
1. Run `migrate-frontmatter.js --dry-run --broad`, or its equivalent, on `research/`.
2. Group `unknown_non_x_field_*` entries by similarity.
3. For clusters recurring across more than three or four files, propose a common `x-` prefix.
4. Preserve highly descriptive status values unless they are genuinely inconsistent.
5. Apply the “structural” treatment—`creator` plus the base fields—to `index.md`, `concepts.md`, and `corpus-status.md`.

## General Equivalence Rules

- Synonyms are accepted when an equivalence rule is documented here.
- There is **no deadline** for using legacy forms unless an explicit deprecation decision is made and marked `deprecated` in this document.
- Tolerance for different styles is intentional and reflects the personality of human authors and AI agents.

## Future Updates

This document will be extended after each migration pass or whenever significant new synonyms are observed.

---

## Practical Checklist: Quickly Ingesting a New Repository

When adding a repository to the corpus:

1. Scan it using the broad mode, such as `--broad`, to identify `unknown_non_x_field_*` entries and problematic statuses.
2. Identify the three structural file types—[`index.md`](../research/index.md), [`concepts.md`](../research/concepts.md), and [`corpus-status.md`](../research/corpus-status.md)—and apply the standard “maintenance” treatment: `creator`, base fields, and `working-paper`.
3. Group experimental fields that recur across several files:
   - Packet or project descriptions → often use `x-` for `address`, `email`, `website`, and `keywords`.
   - Political or autonomy-related work → often use `x-` for `type`, `branch`, and `source_file`, while tolerating highly descriptive statuses.
4. Do not normalize everything in one pass. Priority should be given to removing genuinely legacy fields and prefixing recurrent experimental clusters.
5. Record new observed patterns here for use in subsequent ingestion passes.

Objective: after two or three repositories have been processed this way, ingestion of a new repository should become increasingly mechanical for roughly 80% of cases.
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Frontmatter Schema — v0.1 (Corpus)](frontmatter-schema.md)
- [Research Index — Cogentia](../research/index.md)
<!-- END_AUTO: backlinks -->
