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
update_policy: UP-DEFAULT-REVIEWED
origin: "Suicide Corse campaign-journal and freeze/backlog exploration, 2026-09-18"
lifecycle_state: active
classification_source: cogentia.js
classification_version: '1'
classification_rule: explicit-metadata
classification_confidence: medium
---

# Delta Disposition

## Intent

Prevent significant new Corpus material from disappearing silently between evolving source state and a frozen projection.

The Pattern gives each significant element of a Corpus delta an explicit **disposition** relative to a target projection, then turns still-actionable dispositions into a candidate backlog for the next cycle.

Compact form:

```text
Corpus(from) -> Corpus(to)
        |
 significant delta
        |
    DeltaItems
        |
 disposition against Projection(to)
        |
 Projection Coverage Report
        |
 freeze -> still-actionable dispositions -> candidate backlog
```

## Context

A living Corpus evolves while articles, books, legal dossiers, research syntheses, software documentation, campaign journals or other projections are periodically rendered and frozen.

The projection cannot and should not contain everything. The failure to include something is therefore not itself an error. The dangerous case is **silent loss**: material that deserved consideration has no traceable editorial or operational disposition.

## Forces

- A living Corpus changes faster than any one projection.
- Publication requires selection.
- Not every new trace deserves publication.
- Human attention is scarce and omission can be accidental.
- A changelog can locate changes without understanding their significance.
- A backlog can preserve useful work but can also become a second, stale source of truth.
- Freeze should stabilize an edition without pretending that unfinished inquiry has vanished.
- Previously deferred work can become more or less important as new evidence arrives.

## Resolution

For every sufficiently significant delta item, seek one explicit disposition:

- `INTEGRATED` — represented materially in the target projection.
- `NO_IMPACT` — considered; no target-projection consequence.
- `REJECTED` — deliberately not used; rationale retained.
- `DEFERRED` — relevant but intentionally postponed.
- `NEEDS_RESEARCH` — cannot yet be disposed without more evidence.
- `NEEDS_DECISION` — requires human or otherwise mandated judgment.
- `UNKNOWN` — significance or disposition remains unresolved.
- `SUPERSEDED` — replaced by a later item or stronger representation.

Closed dispositions normally do not enter the next backlog. Still-actionable dispositions are candidates for it.

```text
at-least-once consideration != at-least-once publication
```

The invariant is **disposition, not inclusion**.

## Freeze rule

A freeze SHOULD be able to expose:

```text
Frozen Projection N
Campaign / Delta Journal N
Coverage Report N
Candidate Backlog N -> N+1
```

The candidate backlog is a projection of still-actionable dispositions, not a new source of truth. At the next cycle:

```text
Backlog(N) + Delta(N -> N+1)
            |
      requalification
            |
     Disposition(N+1)
```

Do not blindly copy backlog items forward. Re-evaluate them against the current Corpus.

## Judgment boundary

Significance and disposition are semantic judgments. Structural tooling may collect candidate changes, references and evidence, but MUST NOT silently invent a semantic disposition when evidence or mandate is insufficient.

Use `NEEDS_DECISION`, `NEEDS_RESEARCH`, `UNKNOWN`, or a Continuation/Cognitive Packet as appropriate.

## Cheap test

Before freezing a projection, ask:

1. What materially changed in the relevant Corpus window?
2. Which changes plausibly matter to this projection?
3. For each such item, can we point to an explicit disposition?
4. Which significant items have no disposition?
5. Which open dispositions still deserve action after freeze?
6. Has each carried-forward item been revalidated against current Corpus state?

A useful implementation should find at least some omissions or unresolved decisions that ordinary editorial review would otherwise miss, without flooding the reviewer with trivial diffs.

## Consequences

Positive:

- makes silent omission detectable;
- separates consideration from publication;
- creates a principled freeze-to-next-cycle backlog;
- preserves rejected and deferred reasoning;
- makes campaign journals and coverage reports derivable from the same semantic delta;
- supports cross-projection propagation checks.

Costs and risks:

- false-positive significance judgments;
- disposition bureaucracy;
- stale backlogs if revalidation is skipped;
- overconfidence if a machine-generated coverage report is mistaken for proof of completeness;
- accidental creation of a competing source of truth.

## Relationship to Packet-Backed Projection

A mature implementation may store current disposition state as a projection over richer Packet history. Preserve non-projected information and provenance; do not turn the first relational schema into a closed ontology.

## Reality Case

The first planned Reality Case is **Suicide Corse n°2** in `JeanHuguesRobert/barons-Mariani`: compare the frozen 17 September 2026 projection with the current Corpus and candidate n°2, then test whether the method detects material new elements that lack an explicit disposition.

## Maturity path

- **V0 — agentic/read-only:** GitHub + explicit from/to + candidate projection; produce DeltaItems, Coverage Report, Campaign Journal candidate and candidate backlog.
- **V1 — mechanical collection:** deterministic commit/file/issue collection, stable DeltaItem identifiers, semantic review delegated to a handler.
- **V2 — Packet-backed state:** durable disposition events, cross-projection references, backlog generation and revalidation.
- **V3 — governed freeze gate:** human review surface, unresolved-disposition gate, optimistic-lock verification and immutable freeze receipt.
- **V4 — ideal tool:** on-demand or scheduled execution, Ubikia orchestration, FractaCarta visualization of trace -> disposition -> projection -> backlog, propagation across multiple projections, explainable alerts and drill-down to provenance.

Each stage must remain useful independently. Do not build V4 merely to validate V0.
