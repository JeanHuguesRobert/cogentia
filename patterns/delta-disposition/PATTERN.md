---
schema: cogentia.pattern/v1
id: delta-disposition
kind: pattern
status: experimental
document_role: operational
document_kind: pattern
visibility: public
language: en
date: '2026-09-18'
last_modified_at: '2026-09-19'
version: '0.2'
update_policy: UP-DEFAULT-REVIEWED
origin: "Suicide Corse campaign-journal and freeze/backlog exploration, 2026-09-18"
lifecycle_state: active
classification_source: cogentia.js
classification_version: '1'
classification_rule: explicit-metadata
classification_confidence: medium
related_documents:
  - ../../research/locality_principle.md
---

# Delta Disposition

## Intent

Prevent significant Corpus material from disappearing silently when a living, distributed Corpus is reconciled with a bounded projection.

The Pattern gives each relevant semantic delta an explicit **disposition relative to a target projection**. Open dispositions remain owned by their smallest sufficient locality and may be exposed as localized Continuations for later cycles.

```text
Question / Projection
        ↓
Minimum Sufficient Locality
        ↓
relevant delta
        ↓
Semantic Impact
(content / epistemic / structural)
        ↓
Disposition
        ↓
Projection Coverage
   ↙             ↘
Campaign Journal  localized Continuations
```

## Context and forces

A living Corpus evolves while projections are periodically rendered and frozen. A projection cannot and should not contain everything. The dangerous case is **silent loss**: material that deserved consideration has no traceable disposition relative to the projection.

A second failure mode is **global capture**: a projection-specific review copies or takes ownership of source state that properly belongs to another locality.

Do not collapse intrinsic importance into projection relevance. A high-significance Corpus development may have no relevance to a particular projection; a modest local development may be highly relevant to one precise passage. Source-role, provenance or structural changes may affect interpretation without adding publishable content.

## Minimum Sufficient Locality

Before collecting a broad delta, determine the **Minimum Sufficient Locality (MSL)** for the target question/projection under mandate, privacy, risk, freshness, cost and epistemic requirements.

Prefer:

```text
local source/state
→ explicit reference
→ bounded projection
→ replication only when justified
```

A projection may depend on several localities without absorbing ownership of their material:

```text
projection scope ≠ source ownership
coverage review ≠ corpus replication
```

## Semantic qualification

For each DeltaItem distinguish:

- **significance** — importance of the development in its own locality;
- **projection_relevance** — importance of that development for the target projection.

Identify zero or more impact dimensions:

- **content** — may alter material represented in the projection;
- **epistemic** — may alter authority, confidence, provenance, contradiction status or interpretation;
- **structural** — may alter navigation, relationships, classification, salience, dependency or projection mechanics.

Other dimensions may be added later; V0 does not freeze a closed ontology.

## Resolution

For every sufficiently projection-relevant DeltaItem, seek one explicit disposition:

- `INTEGRATED` — represented materially in the target projection.
- `NO_IMPACT` — considered; no target-projection consequence.
- `REJECTED` — deliberately not used; rationale retained.
- `DEFERRED` — relevant but intentionally postponed.
- `NEEDS_RESEARCH` — cannot yet be disposed without more evidence.
- `NEEDS_DECISION` — requires human or otherwise mandated judgment.
- `UNKNOWN` — significance, relevance, impact or disposition remains unresolved.
- `SUPERSEDED` — replaced by a later item or stronger representation.

```text
at-least-once consideration ≠ at-least-once publication
```

The invariant is **disposition, not inclusion**.

## Salience before accumulation

Before proposing new content, test whether the relevant knowledge is actually missing or merely insufficiently salient, related, navigable or projected.

A link, relation, reordering, distinction, name, diagram, bounded projection or framing may be the smallest sufficient intervention. Do not obtain salience by hiding provenance, objections, uncertainty, contradictions or alternative paths.

## Freeze and localized Continuations

A freeze SHOULD expose:

```text
Frozen Projection N
Campaign / Delta Journal N
Coverage Report N
Localized open Continuations
```

Still-actionable dispositions commonly include `DEFERRED`, `NEEDS_RESEARCH`, `NEEDS_DECISION` and actionable `UNKNOWN`.

Open work does not become globally owned by the frozen projection. A projection-specific Continuation SHOULD reference the canonical object/locality that remains authoritative. Useful Continuation kinds may include editorial, source/research, epistemic, verification and tooling.

At the next cycle:

```text
localized Continuations(N) + Delta(N→N+1)
                    ↓
              requalification
                    ↓
             Disposition(N+1)
```

Never carry an item forward merely because it appeared in a previous backlog or Continuation.

## Judgment boundary

Significance, projection relevance, semantic impact and disposition are judgments. Structural tooling may collect candidate changes, references and evidence, but MUST NOT silently invent semantic closure when evidence or mandate is insufficient.

Use `NEEDS_DECISION`, `NEEDS_RESEARCH`, `UNKNOWN`, or a Continuation/Cognitive Packet as appropriate.

## Cheap test

Before freezing a projection, ask:

1. What is the Minimum Sufficient Locality for this review?
2. What materially changed within or across explicitly referenced localities?
3. Which changes are relevant to this projection independently of intrinsic significance?
4. Is the effect content, epistemic, structural, or combined?
5. Is apparently missing knowledge absent or merely insufficiently salient?
6. For each relevant item, is there an explicit disposition?
7. Which relevant items have no disposition?
8. Which open dispositions still deserve action after freeze?
9. Does each follow-up remain owned by or referenced to the proper locality?
10. Has each carried-forward item been revalidated against current Corpus state?

## Consequences

Benefits include detecting silent omission and propagation failures, reducing noise through MSL, distinguishing significance from relevance, preserving locality, and deriving journal/coverage views from the same semantic reconciliation.

Risks include false-positive relevance judgments, choosing locality too narrowly, stale Continuations, disposition bureaucracy, overconfidence in generated coverage, and accidental global capture.

## Packet-Backed Projection and FractaCarta

A mature implementation may store disposition events as Packets and expose current disposition/coverage as projections. Preserve non-projected information and provenance.

FractaCarta is a natural navigation/review surface:

```text
trace → DeltaItem → impact → disposition → projection → Continuation
```

The Map preserves source locality and provenance rather than owning mapped Territory.

## Reality Case

The first Reality Case is **Suicide Corse n°2** in `JeanHuguesRobert/barons-Mariani`: compare the frozen 17 September 2026 projection with current relevant Corpus localities and candidate n°2, then test whether the method detects projection-relevant developments lacking explicit treatment.

## Maturity path

- **V0 — agentic/read-only:** resolve MSL + explicit from/to + candidate projection; produce DeltaItems, Coverage Report, Campaign Journal candidate and localized Continuation candidates.
- **V1 — deterministic collection:** locality-aware collectors, stable DeltaItem identifiers, explicit comparison envelopes, regression fixtures and noise/reviewer-cost measurement.
- **V2 — Packet-backed reconciliation:** durable disposition events, cross-projection graph, localized Continuations and revalidation, provenance-preserving propagation checks.
- **V3 — governed freeze gate:** human review surface, unresolved relevant-disposition gate, optimistic-lock verification and immutable freeze receipt.
- **V4 — Projection Reconciliation Engine:** on-demand/scheduled service, Ubikia orchestration, FractaCarta navigation, arbitrary from/to references, multiple target projections, stale/propagation alerts, provenance drill-down and historical replay.

The Campaign Journal is one human-readable projection of the reconciliation graph, not the engine itself.
