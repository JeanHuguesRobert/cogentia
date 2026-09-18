---
schema: cogentia.agent_skill/v1
id: cogentia.projection-delta-review
version: 1
status: experimental
name: projection-delta-review
description: Review a living Corpus delta against a target projection to detect silent omissions, propose explicit dispositions, generate a coverage report, campaign-journal candidate, and revalidated backlog candidate.
triggers:
  - projection freeze preparation
  - campaign journal generation
  - corpus delta coverage review
  - next-edition backlog preparation
inputs:
  - from_reference
  - to_reference
  - target_projection
  - source_corpus
outputs:
  - delta_items
  - projection_coverage_report
  - campaign_journal_candidate
  - backlog_candidate
effects: read_only
requires:
  capabilities:
    - corpus_retrieval
    - version_comparison
    - semantic_analysis
governance:
  minimum_mandate: read_public
  may_disclose: false
  may_resolve_without_mandate: false
  trace_minimum: material
sources:
  - ../../patterns/delta-disposition/PATTERN.md
  - ../../schemas/delta-disposition.v0.schema.json
---

# Projection Delta Review

## Purpose

Apply the experimental **Delta Disposition** Pattern to a real projection.

This V0 Skill is intentionally agentic and read-only. It should prove the semantic method before Cogentia acquires a large implementation.

## Inputs

Resolve explicitly:

- `from_reference`: previous frozen projection, commit, tag, or other stable Corpus reference;
- `to_reference`: current commit/reference, commonly HEAD;
- `target_projection`: candidate edition/product being reviewed;
- `source_corpus`: repositories, paths, issues and other Corpus surfaces in scope.

If a reference is ambiguous or not retrievable, stop or emit a Continuation rather than guessing.

## Procedure

### 1. Establish the comparison envelope

Record immutable references when available, covered time window, repositories/surfaces inspected, and known exclusions.

### 2. Collect candidate delta evidence

Use structural evidence first where available:

- commits and changed files;
- created/updated Corpus documents;
- materially relevant Issues/comments;
- projection contracts and manifests;
- explicit Continuations and decisions;
- other source events already admitted to the Corpus.

Do not equate a Git diff with the semantic delta.

### 3. Build semantic DeltaItems

Group related low-level traces when they represent one meaningful development.

For each candidate, record source references, concise summary, significance, confidence and target-projection references if found.

Trivial mechanical changes may be excluded, but record the exclusion policy.

### 4. Seek a disposition

Use the vocabulary from `delta-disposition.v0.schema.json`.

Do not force certainty. Prefer `NEEDS_RESEARCH`, `NEEDS_DECISION` or `UNKNOWN` over fabricated closure.

A machine may **propose** a disposition. A disposition requiring judgment is not thereby authorized or finalized.

### 5. Produce Projection Coverage Report

Highlight especially:

- significant items with no target representation and no explicit disposition;
- items apparently integrated only partially;
- deferred items whose rationale is stale;
- contradictions between current Corpus and projection;
- source changes after the candidate projection's reference point.

The report is an aid to review, not proof of completeness.

### 6. Produce Campaign Journal candidate

Narrate the intelligible delta from the same DeltaItems:

- starting point;
- Corpus inflow;
- learning;
- corrections;
- Reality responses;
- UNKNOWN;
- newly possible work;
- explicit deferrals;
- next campaign.

Do not reduce this to a Git changelog.

### 7. Produce candidate backlog

Select still-actionable dispositions:

- `DEFERRED`
- `NEEDS_RESEARCH`
- `NEEDS_DECISION`
- `UNKNOWN` when action remains plausible

Revalidate inherited backlog items against the current Corpus. Never carry them forward merely because they existed before.

### 8. Stop before effects

V0 is read-only. Do not modify the projection, issue, backlog, journal, repository or freeze state.

If the Principal wants changes, expose the exact proposed write and use the normal external side-effect authorization gate.

## Output shape

Prefer four clearly separable outputs:

1. **DeltaItems** — structured semantic inventory.
2. **Projection Coverage Report** — anomalies and dispositions.
3. **Campaign Journal candidate** — human-readable delta narrative.
4. **Backlog candidate** — actionable remainder after freeze.

## First Reality Case

Use **Suicide Corse n°2**:

- from: frozen 17 September 2026 edition;
- to: current Corpus reference;
- target: candidate n°2;
- success signal: find materially relevant new elements lacking explicit treatment, or establish with traceable evidence that none were found.

Record false positives and reviewer effort as carefully as successful detections.

## Evolution toward the ideal tool

V0 deliberately leaves collection and semantic grouping to an agent. Subsequent stages should separate deterministic work from judgment:

- V1: deterministic collectors and stable DeltaItem IDs;
- V2: Packet-backed disposition event history and cross-projection graph;
- V3: governed freeze gate and human review UI;
- V4: on-demand/scheduled service, Ubikia integration and FractaCarta trace/disposition/projection/backlog visualization.

Preserve one semantic model across CLI, agents and human UI.
