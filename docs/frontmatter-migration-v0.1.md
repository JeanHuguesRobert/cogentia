---
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
license: CC BY-SA 4.0
language: en
title: Frontmatter Migration — v0.1
date: '2026-05-27'
last_modified_at: '2026-07-16'
status: working-paper — operational migration note aligned with current tooling
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/frontmatter-migration-v0.1.md
last_stamped_at: 2026-06-01T00:00:00.000Z
ai_assisted_by:
  - GPT-5.6 Thinking (English translation + operational alignment)
document_role: operational
document_kind: documentation
visibility: public
lifecycle_state: working
classification_source: cogentia.js
classification_version: '1'
classification_rule: documentation
classification_confidence: medium
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: unknown
  origin_date: '2026-05-27'
  derived_from:
    - cogentia/docs/frontmatter-migration-v0.1.md (French source version)
review:
  status: unreviewed
  reviewed_by: []
update_policy: UP-DEFAULT-REVIEWED
---

# Frontmatter Migration — v0.1

This document defines the operational migration model for bringing existing corpus frontmatter into alignment with the [Frontmatter Schema — v0.1](frontmatter-schema.md) and the [Frontmatter Synonym Mapping — v0.1](frontmatter-synonym-mapping.md).

It began as a migration plan. The migration tool now exists, so this version distinguishes clearly between:

- safe mechanical transformations;
- semantic decisions requiring human or agent judgment;
- validation and corpus regeneration after changes.

## 1. Context

- The repositories are maintained within one coordinated corpus.
- There is no large external installed base depending on every historical frontmatter form.
- Migration can therefore be direct, but it must remain traceable and reversible through Git.
- Broad mechanical cleanup is useful; broad semantic guessing is not.
- The corpus accepts stylistic diversity, but canonical output should remain predictable enough for tools and agents.

## 2. Objectives

The migration aims to:

1. move documents toward a more coherent and semantically richer metadata schema;
2. reduce technical debt caused by legacy fields and undocumented variants;
3. preserve readability for humans and AI agents;
4. improve provenance, review status, and traceability;
5. prepare future alignment with Dublin Core, Schema.org, Solid, and linked-data practices;
6. avoid embedding undocumented semantic judgments in migration code.

## 3. Governing Principle

The migration follows **Option A**:

> Apply only safe mechanical transformations automatically.  
> Materialize every ambiguous or interpretive case as a continuation.

The migration tool must not decide, by guesswork:

- whether `author` or `creator` is correct;
- whether a rich `status` should be normalized;
- whether one document is sovereign over another;
- whether an experimental field belongs in the canonical schema;
- whether a document should be public, private, translated, deprecated, or superseded;
- whether incomplete provenance may be reconstructed from assumptions.

The tool identifies such cases and emits work for later judgment.

## 4. Canonical Mapping Rules

The authoritative mapping remains [`frontmatter-synonym-mapping.md`](frontmatter-synonym-mapping.md). The table below summarizes the migration behavior.

| Observed form | Preferred canonical form | Migration rule |
|---|---|---|
| `author`, `authors` | `author` or `creator` | Do not treat them as automatically equivalent. Preserve or request judgment according to the human-authorship rule. |
| `date`, `created` | `date` | Use the primary semantic date of the document. |
| `last_modified_at`, `updated`, `last_updated` | `last_modified_at` | Use the latest actual modification date. |
| `source_document`, `derived_from`, `predecessor` | `source_document` | Use only when a clear primary source document exists. |
| `tags`, `keywords` | `tags` | Prefer `tags`; migrate only when the meaning is genuinely equivalent. |
| `license`, `licence`, `spdx-license-identifier` | `license` | Prefer `license`. |
| `language`, `lang` | `language` | Record the actual document language; do not infer it solely from path or title. |
| `en`, `fr` translation links | `translations` | Replace ad hoc language-link fields with a structured translation list. |

## 5. Legacy Fields Removed Mechanically

The following fields are considered legacy and may be removed by a safe textual transformation:

- `repository`
- `path`
- `intended_path`
- `canonical_path`
- `canonical_slug`
- `repository_candidate`

Where a durable public pointer is required, use `canonical_url`.

Removal of these fields is not itself a semantic decision. Their historical values remain recoverable from Git history.

## 6. Current Migration Tool

The implemented tool is:

```text
scripts/migrate-frontmatter.js
```

Its current behavior is deliberately narrow.

### 6.1 Mechanical behavior

It:

- scans Markdown documents in the configured repository scope;
- detects top-level frontmatter keys;
- removes the legacy fields listed above;
- preserves the remaining YAML text, order, quoting, comments, and formatting as far as possible;
- reports what would change in dry-run mode;
- writes changes only in apply mode.

The tool uses textual filtering for safe removal rather than reconstructing the complete YAML document.

### 6.2 Judgment detection

In broad mode, it detects cases such as:

- `author` and `creator` appearing together;
- `generated_by` conflicting with human authorship;
- known synonyms still in use;
- non-canonical or complex status values;
- experimental fields lacking an `x-` prefix;
- unknown top-level fields;
- missing `canonical_url`;
- very poor frontmatter;
- documentary provenance requiring clarification.

It does not resolve these cases. It emits continuations using the `cogentia.continuation.v1` protocol.

### 6.3 Current commands

Dry-run across all registered migration repositories:

```bash
node scripts/migrate-frontmatter.js --dry-run --all --broad
```

Apply safe removals and emit continuations:

```bash
node scripts/migrate-frontmatter.js --apply --all --broad
```

Limit the operation to one repository:

```bash
node scripts/migrate-frontmatter.js --apply --repo barons-Mariani --broad
```

List emitted continuations:

```bash
node scripts/cogentia.js continuation list
```

The current implementation scans `research/` directories. Expanding the scope to other documentation directories must be explicit and reviewed.

## 7. Migration Workflow

### Phase 0 — Preflight

Before applying changes:

1. ensure each target repository has a clean or intentionally understood Git working tree;
2. identify the exact repositories and directories in scope;
3. confirm that current schema and synonym-mapping documents are available;
4. run the migration in dry-run mode;
5. review the summary before any write operation.

### Phase 1 — Mechanical Dry Run

Run:

```bash
node scripts/migrate-frontmatter.js --dry-run --all --broad
```

Review separately:

- legacy fields proposed for removal;
- files that would generate continuations;
- unexpected fields;
- documents with very poor frontmatter;
- repository or directory coverage gaps.

A dry run must not modify files or create continuations.

### Phase 2 — Mechanical Application

Run the tool in apply mode only after reviewing the dry run.

The apply pass may:

- remove mechanically safe legacy fields;
- emit continuations for semantic decisions.

It must not silently rewrite rich metadata into a guessed canonical form.

### Phase 3 — Continuation Resolution

Continuations should be grouped by decision class, for example:

- human authorship versus mechanical creation;
- status normalization;
- documentary provenance;
- experimental field classification;
- missing canonical metadata;
- language and translation structure.

Batch resolution is encouraged when the same rule clearly applies to a coherent document family. The result must still remain attributable and reviewable.

### Phase 4 — Validation

After changes:

1. inspect the Git diff;
2. validate YAML parsing;
3. check that required metadata is present or explicitly marked `unknown`, `unreviewed`, or `[]`;
4. run repository-level status and strict corpus verification;
5. inspect links, translation relationships, and generated navigation;
6. rerun the migration dry run to identify remaining cases.

Useful corpus commands include:

```bash
node scripts/cogentia.js status
node scripts/cogentia.js corpus plan --json
node scripts/cogentia.js corpus verify --strict
```

### Phase 5 — Generated Views and Stamping

Mechanical generated views may be refreshed only after reviewing the plan:

```bash
node scripts/cogentia.js corpus plan --json
node scripts/cogentia.js corpus apply
node scripts/cogentia.js corpus verify --strict
```

`last_stamped_at` should be generated by corpus tooling rather than manually fabricated.

## 8. Suggested Repository Order

The historical migration order remains useful:

1. `barons-Mariani` — largest and most heterogeneous metadata population;
2. `cogentia` — schema, tooling, prompts, and corpus operations;
3. `inseme`;
4. `marenostrum`;
5. `FractaVolta`;
6. `Inox`.

This order is not normative. A smaller repository may be processed first when it provides a clearer test case for a new migration rule.

## 9. Structural Files

The following files occur in most repositories and should receive a consistent maintenance treatment:

- `research/index.md`
- `research/concepts.md`
- `research/corpus-status.md`

They are often generated or mechanically maintained. They normally use:

- `creator` rather than a falsely attributed human `author`;
- base traceability fields;
- a working or active lifecycle status;
- light metadata suited to generated structural views.

Their exact treatment remains governed by the schema and synonym mapping.

## 10. Experimental Fields

A field should not be promoted into the primary schema merely because it appears once.

Recommended sequence:

1. observe the field;
2. identify repeated use across documents;
3. determine whether the semantics are genuinely shared;
4. prefix repository- or experiment-specific fields with `x-`;
5. promote a field only after documenting its meaning and migration rule.

Typical clusters include:

- packet or network descriptions: `address`, `email`, `website`, `keywords`;
- political or source-material documents: `type`, `branch`, `source_file`, institution-specific dates and workflow markers.

The practical rule is:

> Prefix first; normalize semantically later.

## 11. Language and Translation Handling

Language migration is not a purely mechanical frontmatter operation.

The `language` field must describe the actual document content. The current schema default may reduce writing overhead, but migration must not blindly apply a default to mixed-language repositories.

Current corpus direction:

- infrastructure documents—architectures, protocols, specifications, technical roadmaps, operational tooling, and canonical metadata—should normally use English;
- explicitly localized, political, territorial, editorial, or audience-specific documents may remain French or another language;
- translated documents should preserve a traceable relationship through `translations`, provenance, or an explicit source-document relationship;
- translating a document does not authorize silent changes to controlled identifiers, protocol names, code, or schema values.

## 12. Non-Goals

This migration does not aim to:

- erase all historical variation;
- impose one writing style across the corpus;
- infer missing facts;
- replace human copyright judgment;
- normalize every experimental field immediately;
- declare documents public by assumption when their sensitivity is unclear;
- rewrite document content merely because metadata is being migrated;
- hide uncertainty behind apparently complete frontmatter.

## 13. Completion Criteria

A migration pass is complete when:

- safe legacy fields have been removed;
- remaining synonyms are either accepted by documented rules or scheduled for resolution;
- required metadata is present or uncertainty is explicit;
- provenance and review blocks are present where required;
- ambiguous semantic cases have continuations or documented decisions;
- YAML and links validate;
- generated corpus views remain coherent;
- the Git diff is understandable and reviewable;
- no automatic step has claimed judgment it did not possess.

## 14. Current Status and Continuation

The migration framework is operational but not finished.

Immediate continuations:

1. align `migrate-frontmatter.js` comments and user-facing output with English infrastructure-language policy;
2. decide whether the current `research/`-only scan should expand to `docs/`, prompts, and repository roots;
3. reconcile the tool's known-field list with the required `provenance` and `review` blocks;
4. define a stable validation command for frontmatter across all repositories;
5. resolve the controlled spelling of `superceded` versus `superseded` through an explicit migration decision;
6. preserve a clear distinction between top-level documentary `derived_from` and `provenance.derived_from`.

---

*Version 0.1 — Operational working paper*

<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Frontmatter Schema — v0.1 (Corpus)](frontmatter-schema.md)
<!-- END_AUTO: backlinks -->
