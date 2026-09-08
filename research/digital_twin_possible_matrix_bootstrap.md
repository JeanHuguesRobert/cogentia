---
title: "Possible Matrix v0 — Digital Twin bootstrap projection"
subtitle: "Longitudinal capacities, reachable possibilities, evidence and causal discipline"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-09"
last_modified_at: "2026-09-09"
version: "0.1"
status: "working-paper"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "research"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/digital_twin_possible_matrix_bootstrap.md"
related_research:
  - "research/personal_digital_twin_convergence.md"
  - "research/digital_twin_trust_model.md"
  - "research/reality_probe_selection.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/potentics.md"
provenance:
  origin_type: "conversation"
  origin_repository: "unknown"
  origin_ref: "unknown"
  origin_date: "2026-09-09"
  derived_from:
    - "barons-Mariani/memory/marie-louise/possible_matrix.md"
review:
  status: "unreviewed"
  reviewed_by: []
ai_assisted_by:
  - "GPT-5.6 Sol"
---

# Possible Matrix v0.2 — design note

## Decision

Keep the human-readable Markdown matrix as the current documentary source.

Add a machine-readable YAML **working derived projection** validated by a generic JSON Schema.

Do not promote the YAML to authoritative source until a round-trip / generated-projection Reality Test shows that human and machine views can remain synchronized.

## Digital Twin bootstrap role

The Marie-Louise Reality Case revealed that this work is not exceptional to a post-hoc research dossier. A comparable reconstruction is a **normal bootstrap task for a new Cogentia Digital Twin**.

A Twin cannot be bootstrapped only from a profile, a bag of memories, or a personality summary. A minimally useful initial model should reconstruct, as evidence permits:

- capacities already expressed or exercised;
- possibilities that were opened, maintained, frictioned, closed, or reopened;
- loads and obligations consuming resources without being silently promoted to causes;
- actors, institutions, resources, and mechanisms that changed practical reachability;
- descendant possibilities made accessible or compromised;
- source provenance, epistemic status, counterevidence, and unknowns;
- the next Reality probes that would most reduce uncertainty.

Canonical compression:

```text
new Twin bootstrap
→ gather traces
→ reconstruct capacities and Possible graph
→ type dynamics and uncertainty
→ identify missing discriminating evidence
→ only then derive higher-level characterization
```

This is complementary to, not a replacement for, other Twin bootstrap layers such as identity, intent, Cogentigram, Relatogram, mandate, rights, trust maturity, memory/corpus indexing, and current operational state.

The matrix is therefore best understood as a **bootstrap view of lived capability and reachable possibility**, with the Marie-Louise corpus serving as the first longitudinal Reality Case.

## Normalization

The v0.1 prose sometimes mixes state and qualification:

- `OPEN (tentative)`
- `REOPEN + EXPAND`

v0.2 separates:

- `dynamics`: closed vocabulary (`capacity`, `open`, `maintain`, `friction`, `close`, `reopen`, `load`, `unknown`);
- `scope_delta`: `narrow`, `same`, `expand`, `unknown`;
- `qualifiers`: free bounded annotations such as `attempt`, `posthumous`.

This keeps the state vocabulary stable.

## Epistemic structure

No universal confidence score is introduced.

Each evidence reference records:

- source class;
- epistemic status (`voice`, `trace`, `third_party`, `fact`, `inference`, `unknown`);
- exactly what the source supports;
- visibility.

Each event records causal assessment separately:

- `direct`
- `supported`
- `inferred`
- `unknown`
- `not_claimed`

and may carry:

- `counterevidence`
- `alternative_explanations`
- `prohibited_inference`

This follows Cogentia's doctrine against the `single-score illusion`.

## Graph structure

`possible_registry` gives stable possible IDs.

Events reference those IDs and can name `descendant_possible_ids`.

This is enough for a first graph without prematurely defining a universal Potentics ontology.

## Reality Probe bridge

`next_probes` is intentionally compatible in spirit with `research/reality_probe_selection.md`:

- objective
- target
- expected discriminant
- priority

It does not yet implement cost, risk, attention or mandate. Those can be added only when an actual Cogentia execution path needs them.

## Canonicality

Recommended first stage:

```text
possible_matrix.md
    documentary / human-readable source

        ↓ explicit projection

possible_matrix.yaml
    machine-readable working projection

        ↓ validate

possible-matrix.v0.schema.json
    generic structural contract
```

Future stage, only after Reality testing:

```text
machine data
    ↔ deterministic renderer/parser
    ↔ human projection
```

Avoid two independently edited authorities.


## Documentary ordering

v0.2 adds a required integer `sequence`.

It is **not** a timestamp and does not increase date precision. It provides deterministic documentary ordering for events whose dates may only be known to month, academic year or range.

Therefore:

```text
when
    what the sources justify about calendar time

sequence
    stable order used by computation
```

A future event insertion should preserve existing IDs and may require renumbering only while this schema is experimental. Before stable promotion, a non-renumbering order key should be considered if external references begin to depend on sequence values.

## Validation beyond JSON Schema

JSON Schema validates record shape but does not conveniently enforce every graph invariant used here.

The v0.2 candidate additionally checks mechanically:

- event IDs are unique;
- Possible IDs are unique;
- `sequence` is deterministic;
- every `possible_id` and `descendant_possible_id` resolves to `possible_registry`.

Those checks are candidates for a future `cogentia.js possible-matrix validate` command.
