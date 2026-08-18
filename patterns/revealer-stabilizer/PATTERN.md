---
title: "Revealer / Stabilizer"
status: experimental
kind: pattern
schema: cogentia.pattern/v1
aliases:
  - "Révélateur / Stabilisateur"
  - "Revealer/Stabilizer"
document_role: operational
visibility: public
lifecycle_state: experimental
---

# Revealer / Stabilizer

> Le révélateur rend visible ; le stabilisateur rend viable.

## Context

A system contains a contradiction, pathology, asymmetry, failure mode, or harmful equilibrium that is either insufficiently visible or insufficiently corrected.

## Forces

- What remains invisible is difficult to correct.
- Mere revelation can produce anger, disruption, polarization, or attention without durable repair.
- Stabilization without adequate revelation can treat symptoms while preserving the hidden cause.
- Durable intervention requires both legibility and a viable response.
- A stabilizer can itself reveal further hidden structure, so the pattern is potentially recursive.

## Resolution

Use a paired intervention:

```text
Reveal
→ make the problem legible and attributable
→ design a stabilizer that changes the operating conditions
→ observe the effects
→ reveal residual or newly created problems
→ stabilize again where useful
```

Compact form:

```text
Revealer → Stabilizer → new Revealer → new Stabilizer → ...
```

The Revealer may be a measurement, trace, audit, publication, contradiction, case study, whistleblowing event, simulation, comparison, registry, or other mechanism that makes a relevant condition visible.

The Stabilizer may be a procedure, protocol, automation, rule, incentive change, capability, control mechanism, infrastructure, governance change, or other intervention that makes the resulting state more viable.

## Failure modes / candidate anti-patterns

### Revelation Without Stabilization

The problem is exposed repeatedly but no mechanism changes the conditions that reproduce it.

Typical consequence:

```text
revelation → attention / anger → exhaustion → return to prior equilibrium
```

### Stabilization Without Revelation

A corrective mechanism is introduced without making the underlying contradiction sufficiently legible.

Typical consequence:

```text
symptom treatment → opacity preserved → root cause reproduced
```

## Consequences

- Separates diagnosis from durable correction without disconnecting them.
- Encourages interventions that learn recursively from their own effects.
- Reduces the temptation to confuse denunciation with repair.
- Reduces the temptation to impose technocratic repair without shared understanding of the problem.
- Supports cross-domain reuse because neither Revealer nor Stabilizer is tied to one implementation form.

## Pattern-mining evidence

This pattern was not invented for the Pattern Language. It was mined from repeated prior use across the Corpus, including anti-corruption, EDF interactions, assisted rule-of-law work, game-theoretic analysis, political strategy, museum doctrine, territorial experimentation, and operational formulas.

Pattern-mining signals:

```text
Repetition            = strong
Cross-domain transfer = strong
Compression gain      = strong
Recurring structure   = strong
```

## Provenance

The canonical compact formulation already present in the Corpus is:

> Le révélateur rend visible ; le stabilisateur rend viable.

Related operational formulations include:

- diagnostic without a stabilizer tends to feed anger;
- stabilization without diagnosis tends to reproduce blindness;
- naming a failure is insufficient; build what can absorb or correct it.

## Governance

This Pattern is descriptive/generative, not an authority source.

```text
Pattern availability ≠ mandate
Pattern recognition ≠ proof
Frequency in the Corpus ≠ truth
```

Use it to generate and review interventions, then let evidence and Reality determine whether the proposed Revealer/Stabilizer pair actually works.
