---
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
license: CC BY-SA 4.0
language: en
title: Frontmatter Schema — v0.1 (Corpus)
date: '2026-05-27'
last_modified_at: '2026-09-09'
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

The machine-readable companion is [`frontmatter-schema.v0.1.json`](frontmatter-schema.v0.1.json). The Cogentia CLI reads that file for `cogentia frontmatter schema` and enforces it via `cogentia frontmatter verify` (or alias `check`); changes to the field vocabulary or its governing principles must keep both artifacts aligned.

## Philosophy

- **Flat fields** by default, for readability and simplicity.
- A deliberate mixture of **formal structure** and **natural language**, especially for AI agents.
- **Equivalence rules** rather than a prohibition on synonyms, in the TIMTOWTDI spirit: “There Is More Than One Way.”
- Priority is given to **traceability**, **portability**, and **privacy protection**.
- The schema must remain **evolvable** and **pragmatic**. We avoid needless complexity: clear equivalence rules are preferred to excessive rigidity.
- **Unregistered is not invalid.** A meaningful local field may emerge before the shared schema has learned its semantics.

## General Rules

- All substantive documents—research, specifications, and important notes—must carry frontmatter.
- Every tracked corpus document must carry minimum traceability metadata, regardless of repository or directory. Missing information must be declared explicitly (`unknown`, `unreviewed`, `[]`, or a field-specific `null`), never filled by assumption.
- Default values should be preferred to reduce writing overhead.
- Synonyms are tolerated **if and only if** an equivalence rule is documented in [`frontmatter-synonym-mapping.md`](frontmatter-synonym-mapping.md).
- `privacy` defaults to `public`. It only needs to be specified when the document falls outside that regime.
- A document that is **entirely automated**, with no human contributor, must be readily identifiable through the `generated_by` field.
- Unknown or repository-local fields are not automatically errors and must not be mechanically renamed merely because they are absent from the shared vocabulary.

---

## Field Schema (v0.1)

### 1. Core Fields (required for every tracked document)

| Field | Type | Default | Required? | Notes |
|---|---|---|---:|---|
| `title` | string | — | Yes | — |
| `subtitle` | string | — | No | — |
| `description` | string | — | Recommended | Short summary |
| `author` | string | — | Yes | Known human author, otherwise `unknown` |
| `creator` | string | — | No | Use when production is predominantly or entirely mechanical; not automatically equivalent to `author` |
| `affiliation` | string | Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica | Yes | — |
| `date` | ISO 8601 string or `null` | — | Yes | Primary semantic date; use `null` when unknown, never `unknown` |
| `last_modified_at` | ISO 8601 string | — | No | Date of latest actual modification |
| `license` | string | `CC BY-SA 4.0` | Yes | — |
| `language` | string | — | Yes | Actual document language |

### 1 bis. Language, audience and derivation context

`language` has **no corpus-wide default**. Select it from the document's audience, function, and target scene.

| Field | Type | Required? | Notes |
|---|---|---:|---|
| `target_audience` | string or array | Recommended for derived products | Intended readers or users |
| `target_scene` | string | Recommended for derived products | e.g. technical, academic, political, electoral, local, public, internal |
| `document_function` | string | Recommended for derived products | e.g. specification, research, brief, speech, publication, implementation instruction |

Technical infrastructure, protocols, specifications, schemas, agent instructions, and international research normally use English. Corsican, territorial, political, electoral, local, family, and audience-specific public products normally use French unless their intended audience requires another language. Ask before drafting when classification is genuinely ambiguous.

### 2. Provenance & Traceability

Common traceability fields include `canonical_url`, `last_stamped_at`, `version`, `status`, `methodology`, `generated_by`, `ai_assisted_by`, `reviewed_by`, `human_arbitration_by`, `version_history`, and `update_policy`.

`update_policy` defaults to `UP-DEFAULT-REVIEWED`. `canonical_url` is required for substantive documents. `last_stamped_at` is generated automatically. `generated_by` is required when production is entirely automated.

Every tracked document must also declare minimum `provenance` and `review` blocks:

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

`origin_ref` must be immutable or externally verifiable. A current branch name alone is insufficient. For generated documents, also record `generated_by` and the input documents. For historical or unattributed material, preserve uncertainty explicitly.

### 3. Documentary Provenance

`source_document` identifies a clear primary source document when one exists. `additional_sources` may list complementary sources. `derived_from` is a tolerated document-level synonym of `source_document`, distinct from `provenance.derived_from`.

Do not force a source document when none is clearly sovereign. In transdisciplinary work, references in the document body may be more honest. Do not encode subjective source “types” such as sovereign or symmetric merely for classification.

### 4. Navigation & Publication (Jekyll)

Standard Jekyll fields such as `layout`, `permalink`, `nav_order`, `parent`, and `has_children` remain permitted.

`date` is a Jekyll-reserved typed field. The #168 GitHub Pages Reality Test showed that `date: unknown` and `date: "unknown"` pass YAML parsing but fail Jekyll's date consumer. Preserve epistemic absence as `date: null` at top level; `provenance.origin_date: unknown` remains valid because its semantics differ. `frontmatter verify/check` rejects a non-ISO, non-null top-level `date`, and `frontmatter plan/apply --fix` may mechanically repair only the `unknown` sentinel to `null` without inventing a date.

### 5. Semantics & Future Traceability

Shared semantic fields currently include `webid`, `rights`, `tags`, `related_documents`, `related_projects`, `document_role`, `derivation_mode`, `adapted_products`, `purpose`, `adaptation_context`, `target_audience`, `target_scene`, and `document_function`.

The shared list is deliberately incomplete: domain vocabulary may emerge locally before promotion to the shared schema.

---

## Specific Rules

### Rule for `status`

Official base values are `draft`, `working-paper`, `stable`, `under-review`, `deprecated`, and `superceded`. Multiple simultaneous statuses are allowed, and a natural-language qualifier may follow a base value.

### Rule for `generated_by`

`generated_by` is a string or a single ordered list, with contributors ordered by decreasing importance. Entirely automated production must be immediately visible.

### Rule for Synonyms and Stylistic Tolerance

Synonyms are tolerated when a clear equivalence rule is documented in [`frontmatter-synonym-mapping.md`](frontmatter-synonym-mapping.md). There is no deadline for alternative forms unless an explicit deprecation decision is made. Excessive uniformity is not a goal.

`derived` is the umbrella English category for a product made from another artifact. Use `document_role: adapted` and `derivation_mode: directed` when a product intentionally adds context, audience, or editorial direction. `adapted_products` is a declaration, not proof of publication.

### Rule for Extensions and Emerging Vocabulary

- Unregistered fields may remain under their **natural, meaningful names** while their semantics are local or evolving.
- The `x-` prefix is **optional**. Use it when explicitly marking an extension boundary adds information, for example to avoid a concrete collision or to identify a deliberately namespaced experiment.
- Never add `x-` mechanically merely because a field is unfamiliar to the current shared schema or to a migration tool.
- Recurrence is evidence that a local field may deserve documentation, synonym mapping, or promotion into shared vocabulary; recurrence is not itself a reason to rename it.
- Existing `x-` fields may remain when the prefix is meaningful. Migration away from `x-` is allowed when the natural name is clearer and its semantics are understood.
- Preserve semantic information first; normalize only after a stable equivalence or shared need has emerged.

This is the frontmatter application of Optimistic Locking: permit small, visible, reversible semantic evolution rather than attempting to predict and freeze every future field in advance.

### Rule for Privacy

Every document is public by default; `privacy: public` need not be repeated. Other values should be introduced only when a concrete need arises.

---

## Fields to Remove During Migration

The following fields are legacy and must no longer be used in new documents: `repository`, `path`, `intended_path`, `canonical_path`, `canonical_slug`, `repository_candidate`.

---

## Tooling and CLI Verification

```bash
node scripts/cogentia.js frontmatter schema
node scripts/cogentia.js frontmatter schema --json
node scripts/cogentia.js frontmatter verify path/to/document.md
node scripts/cogentia.js frontmatter check path/to/document.md --json
node scripts/cogentia.js frontmatter verify
node scripts/cogentia.js frontmatter verify path/to/document.md --strict-role
node scripts/cogentia.js frontmatter scaffold path/to/new-doc.md --title "Title" --role operational --lang en
node scripts/cogentia.js frontmatter plan --fix [paths...]
node scripts/cogentia.js frontmatter apply --fix [paths...]
```

Underlying modular library: [`scripts/lib/frontmatter-validator.js`](../scripts/lib/frontmatter-validator.js).

The validator enforces minimum shared invariants. It must not turn absence from the shared vocabulary into a blanket invalidation of meaningful local fields.

---

## Notes

- The schema is designed to be readable by humans and AI agents.
- It balances formal structure with natural-language expressiveness.
- It is explicitly evolvable without excessively disruptive changes.

### Accelerating the Ingestion of New Repositories

1. Identify structural files such as `index.md`, `concepts.md`, and `corpus-status.md` and apply only the light maintenance treatment that is actually useful.
2. Run migration/scanning in dry-run mode first.
3. Remove genuinely deprecated fields mechanically where safe.
4. Group unfamiliar fields by similarity **without treating unfamiliarity as invalidity**.
5. Preserve meaningful local names while semantics are being learned.
6. When recurrence reveals a stable cross-document concept, propose documentation, synonym mapping, or promotion to shared vocabulary.
7. Use `x-` only where an explicit extension namespace adds information.
8. Do not normalize everything in one pass. Traceability and factual correctness take priority over uniformity.

The objective is for ingestion to become increasingly mechanical where semantics are stable while remaining deliberately permissive where the Corpus is still learning its own vocabulary.

---

*Version: 0.1 — Working draft*
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Frontmatter Migration — v0.1](frontmatter-migration-v0.1.md)
- [Research Index — Cogentia](../research/index.md)
<!-- END_AUTO: backlinks -->
