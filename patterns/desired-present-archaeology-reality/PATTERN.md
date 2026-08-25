---
title: "Desired Present / Archaeology / Reality"
status: experimental
kind: pattern
schema: cogentia.pattern/v1
id: desired-present-archaeology-reality
aliases:
  - "Présent Désiré / Archéologie / Réalité"
  - "Desired Present / Archaeology / Reality"
  - "Normative / Explanatory / Empirical Triad"
document_role: operational
visibility: public
lifecycle_state: experimental
tags:
  - pattern
  - doctrine
  - corpus-evolution
  - document-roles
  - semantic-typing
---

# Desired Present / Archaeology / Reality

> **Desired Present states. Archaeology explains. Reality tests.**

## Context

In an evolving multi-repository corpus, documents are subjected to continuous semantic propagation, agent-assisted consolidation, and incremental discovery. Without clear role separation, normative specifications tend to inflate into narrative essays, historical rationale gets lost or duplicated, and empirical failure evidence gets smoothed over or retrospectively normalized.

## Forces

- **Normative specifications require compression**: As an architecture is better understood, its specification should compress toward essential invariants and conformance rules, not grow indefinitely with narrative commentary.
- **Conceptual depth requires accumulation**: Historical lineage, prior art comparisons, design rationales, and exploration of alternatives require space to grow without cluttering normative standards.
- **Empirical truth requires preservation**: Reality tests, failure residues, benchmarks, and execution receipts must not be rewritten after the fact merely to align with current doctrine.
- **Unchecked mutation causes semantic drift**: Automated tools and consolidating agents risk collapsing these distinct categories into ambiguous "working notes", destroying the epistemic integrity of the corpus.

## Resolution

Partition the corpus documentation according to the three distinct semantic epistemic roles:

```text
       [ Desired Present ]
    (Normative Specification)
         "What MUST be"
       /               \
      /                 \
(Informs / Bounds)   (Tested against)
    /                     \
   v                       v
[ Archaeology ]  <--->  [ Reality ]
 (Rationale & SOTA)     (Evidence & Residue)
   "Why it is"         "What actually happened"
```

### 1. Desired Present (Normative Specification)
- **Purpose**: Defines the current normative definitions, architectural invariants, conformance boundaries, and formal profiles.
- **Behavior**: Tends toward **directional compression** and generalization as the domain is mastered.
- **Policy**: `UP-DESIRED-PRESENT`.
- **Constraint**: Narrative background, historical genealogies, and prior-art essays must be redirected to Archaeology. Metadata fields defining semantic type (e.g. `document_kind: architecture-specification`) must never be mutated silently into casual working notes.

### 2. Archaeology (Explanatory & Living Rationale)
- **Purpose**: Preserves and deepens the conceptual genealogy, prior art, comparative analysis, design rationales, and emerging research programs.
- **Behavior**: May expand freely as knowledge accumulates.
- **Policy**: `UP-ARCHAEOLOGY-LIVING`.
- **Constraint**: Must explain and motivate, but must not silently usurp normative authority or redefine the formal specification outside its sovereign document.

### 3. Reality (Evidence, Tests & Residue)
- **Purpose**: Preserves empirical observations, execution logs, failure traces, benchmarks, and unresolved residues.
- **Behavior**: Immutable empirical record; updates are strictly additive notes or new test runs.
- **Policy**: `UP-REALITY-EVIDENCE`.
- **Constraint**: Must never retrospectively normalize or clean up failure data to agree with doctrine. Reality challenges the Desired Present but does not silently rewrite it.

## Anti-Patterns & Failure Modes

### 1. Normative Inflation / Explanatory Dilution
A concise normative specification is progressively expanded with conversational rationale, implementation anecdotes, and comparative literature until it loses its conformance character.
- *Remedy*: Factor out narrative and rationale into an Archaeology document (e.g. an Appendix or companion research paper) and retract the specification to its normative core.

### 2. Retrospective Normalization
Test receipts or recorded failures are edited after an architectural change to make past experiments appear compliant with new definitions.
- *Remedy*: Lock empirical receipts under `UP-REALITY-EVIDENCE` and record discrepancies as explicit continuations or new Reality test iterations.

### 3. Silent Semantic Type Downgrade
A consolidation or refactoring tool silently downgrades a document\`s classification (e.g., `document_kind: architecture-specification` -> `document_kind: working-note`), stripping it of strict invariants.
- *Remedy*: Semantic Mutation Type Checking (deterministic validation blocking unauthorized metadata transitions).
