---
schema: cogentia.agent_skill/v1
id: cogentia.projection-delta-review
version: 3
status: experimental
name: projection-delta-review
description: Reconcile a bounded, locality-aware Corpus delta against a target projection to detect silent omissions and propagation failures, propose explicit dispositions, generate coverage/journal views, and emit localized Continuation candidates.
triggers:
  - projection freeze preparation
  - campaign journal generation
  - corpus delta coverage review
  - next-edition continuation preparation
inputs: [from_reference, to_reference, target_projection, source_corpus]
outputs: [delta_items, projection_coverage_report, campaign_journal_candidate, localized_continuation_candidates]
effects: read_only
requires:
  capabilities: [corpus_retrieval, version_comparison, semantic_analysis]
governance:
  minimum_mandate: read_public
  may_disclose: false
  may_resolve_without_mandate: false
  trace_minimum: material
sources:
  - ../../patterns/delta-disposition/PATTERN.md
  - ../../schemas/delta-disposition.v0.schema.json
  - ../../research/locality_principle.md
---

# Projection Delta Review

## Purpose

Apply **Delta Disposition** as a locality-aware projection reconciliation review. V0 is intentionally agentic and read-only: prove the semantic method before building a large implementation.

The review MUST preserve **future editorial freedom**. A frozen previous projection is evidence and comparison context, not a template for the next projection. Delta constrains attention and explicit disposition, not chapter structure, ordering, wording or reuse.

## Procedure

1. **Establish comparison envelope.** Resolve `from_reference`, `to_reference`, target projection, covered window, inspected surfaces and exclusions. Stop or emit a Continuation rather than guessing unavailable references.
   - Record whether the target projection was independently composed or inherited from the previous projection.
   - If structural inheritance is merely accidental/inertial, flag it as a possible editorial-capture risk; do not repair it by silently rewriting the projection.
2. **Resolve Minimum Sufficient Locality.** Determine the smallest sufficient set of localities under mandate, privacy, risk, freshness and epistemic requirements. Prefer references/bounded projections over copying remote state; make locality crossings explicit.
3. **Collect candidate delta evidence.** Use commits/files, Corpus documents, materially relevant Issues/comments, projection contracts/manifests, Continuations/decisions and admitted source events. Git diff is evidence, not the semantic delta. Do not sweep unrelated global changes merely because accessible.
4. **Build semantic DeltaItems.** Group traces representing one development. Record sources, semantic home/locality, summary, intrinsic `significance`, `projection_relevance`, impact dimensions (`content`, `epistemic`, `structural`), confidence and target-projection refs. High significance may have no projection relevance; modest local change may be highly relevant.
5. **Test salience before accumulation.** Ask whether apparently absent knowledge is missing or merely insufficiently salient, linked, ordered, named or projected. Prefer the smallest sufficient intervention over duplication.
6. **Seek disposition.** Use the schema vocabulary. Prefer `NEEDS_RESEARCH`, `NEEDS_DECISION` or `UNKNOWN` over fabricated closure. Machine-proposed judgment is not authorization.
7. **Produce Projection Coverage Report.** Highlight undisposed relevant items, partial integration, epistemic/structural propagation failures, stale deferrals, contradictions, post-candidate source changes, suspicious cross-locality copying, and accidental structural inheritance from a previous projection. Coverage is an aid, not proof of completeness. A radically recomposed target may still have excellent coverage.
8. **Produce Campaign Journal candidate.** Narrate starting point, inflow, learning, corrections, Reality responses, UNKNOWN, new possibilities, deferrals and next campaign. It is one projection of reconciliation, not a changelog or source of truth.
9. **Produce localized Continuation candidates.** For actionable `DEFERRED`, `NEEDS_RESEARCH`, `NEEDS_DECISION` and `UNKNOWN`, propose Continuations in the smallest sufficient locality. Kinds may include editorial, source/research, epistemic, verification and tooling. Reference canonical semantic homes rather than copying ownership into a global backlog. Revalidate inherited Continuations.
10. **Stop before effects.** V0 is read-only. Expose any proposed mutation through the normal authorization gate.

## Outputs

1. **DeltaItems** — locality-aware semantic inventory.
2. **Projection Coverage Report** — relevance, impact, anomalies and dispositions.
3. **Campaign Journal candidate** — human-readable delta narrative.
4. **Localized Continuation candidates** — actionable remainder without global backlog capture.

## First Reality Case

**Suicide Corse n°2**: from frozen 17 September 2026 edition to current Corpus; target candidate n°2 is intentionally free to use a radically different plan. Resolve MSL rather than sweeping the whole Corpus. Success includes finding content, epistemic or structural propagation failures, or traceably finding none, **without treating prior chapter structure as a coverage requirement**. Record false positives, reviewer effort and any editorial-capture false positive.

## Evolution toward the ideal tool

- **V1:** locality-aware deterministic collectors, stable DeltaItem IDs, regression fixtures.
- **V2:** Packet-backed disposition history, cross-projection graph, localized Continuations.
- **V3:** governed freeze gate, optimistic locking, human review UI.
- **V4 — Projection Reconciliation Engine:** on-demand/scheduled service, Ubikia integration, FractaCarta navigation of trace/DeltaItem/impact/disposition/projection/Continuation, multiple projections, propagation alerts, provenance drill-down and historical replay.

Preserve one semantic model across CLI, agents and human UI.
