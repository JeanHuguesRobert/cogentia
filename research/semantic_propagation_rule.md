---
title: "Semantic Propagation Rule for the Reactive Corpus"
subtitle: "When a source meaning changes, dependent assertions must become visible"
description: "Operational source rule for the Cogentia Commons Living/Reactive Corpus: materially changed source definitions trigger dependency discovery, mechanical regeneration where deterministic, and explicit continuations where semantic judgment is required."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-08-22"
last_modified_at: "2026-08-22"
version: "0.1"
status: "working source rule"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "method-rule"
visibility: "public"
lifecycle_state: "working"
methodology:
  - "Second Method"
  - "Living Corpus"
  - "Reactive Corpus"
related_documents:
  - "research/cogentia_commons_living_corpus.md"
  - "research/derived_products.md"
  - "research/pipeline.md"
  - "research/cognitive_packets.md"
  - "research/cognitive_packet_switching.md"
  - "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/raix.md"
tags:
  - reactive-corpus
  - living-corpus
  - semantic-propagation
  - dependency
  - continuation
  - provenance
  - source-derived
update_policy: "UP-DEFAULT-REVIEWED"
---

# Semantic Propagation Rule for the Reactive Corpus

## 1. Rule

The Living Corpus already distinguishes source documents from generated views and derived products, and describes the corpus as reactive without allowing opaque semantic rewriting.

This note makes one consequence explicit:

> **When the meaning of a source concept changes materially, the corpus should make dependent assertions visible for review. Mechanical consequences may be regenerated mechanically; semantic consequences must become explicit continuations or human/agent review tasks.**

Short form:

```text
material source change
→ dependency discovery
→ classify consequences
   ├─ deterministic → regenerate
   ├─ semantic → continuation/review
   └─ binding human judgment → human arbitration
→ preserve provenance
→ close propagation only when stale dependents are accounted for
```

## 2. Why this is different from ordinary rebuilds

A conventional reactive build system notices that file `B` depends on file `A` and rebuilds `B` after `A` changes.

A Reactive Corpus has an additional problem: semantic dependency is not always declared as a machine-readable import.

A concept may appear in:

- source papers;
- derived products;
- indexes;
- specifications;
- prompts or agent contracts;
- code comments and implementation assumptions;
- issues and continuations;
- public publications.

The required reaction is therefore not always "rewrite everything". It is first:

> **Find what may have become stale, incomplete or newly enrichable.**

## 3. Classification of propagation consequences

### 3.1 Mechanical consequence

Examples:

- generated index entry;
- backlinks;
- document catalog;
- corpus-status view;
- derived metadata whose transformation rule is deterministic.

Action: regenerate automatically and preserve the generating source/version.

### 3.2 Semantic consequence

Examples:

- a source paper uses an older, narrower definition;
- an argument remains valid but now misses an important consequence;
- a comparison to prior art must be refreshed;
- an implementation assumption may have changed.

Action: emit a continuation or bounded review packet. Do not silently rewrite doctrine merely because a dependency changed.

### 3.3 Binding consequence

Examples:

- public political position;
- institutional commitment;
- legal or reputational assertion;
- doctrinal change requiring human authorship or arbitration.

Action: surface to a living human according to the Living Corpus methodological boundary.

## 4. Minimal propagation record

A semantic propagation event should be reconstructible from at least:

```yaml
source_change:
  concept: RAIX
  old_meaning: generalized redundancy
  new_meaning: generalized organized array of capabilities
  reason: external investigation + internal contradiction
  date: 2026-08-22

dependents:
  - Fractanet
  - Potentics of Compute
  - The Network is the Learning Computer

actions:
  - canonical source created/updated
  - addenda created where safe partial editing was unavailable
  - indexes/derived views queued or regenerated

open:
  - integrate addenda into parent sources when appropriate
  - review terminology and prior-art comparison
```

The exact schema is provisional. The invariant is provenance and resumability.

## 5. Running example: RAIX

The 2026-08-22 investigation of inexpensive ESP32-class, NPU and heterogeneous edge compute exposed a semantic mismatch in the Corpus.

Fractanet described RAIX mainly as generalized redundancy. Discussion of compute arrays made clear that the RAID lineage also includes aggregation and parallel performance. The concept was therefore corrected to:

> **RAIX = organized plurality of capabilities.**

Possible modes include aggregation, parallelism, redundancy, specialization and diversity/exploration.

That correction propagates naturally:

```text
external hardware/SOTA observation
        ↓
RAIX definition corrected
        ↓
Fractanet architecture affected
        ↓
Potentics of Compute gains a measurable collective-capability question
        ↓
Learning Computer gains dynamic composition of temporary computers
        ↓
prior-art lineage expands toward systolic arrays, CGRAs,
distributed inference, swarm systems and biological collective organization
```

This is exactly the behavior the term **Reactive Corpus** should denote at the semantic level.

## 6. Design constraint: reaction without semantic explosion

A reactive corpus can become noisy if every source edit recursively creates unlimited work.

Propagation therefore needs boundedness:

1. Only **material semantic changes** trigger semantic propagation.
2. Dependents are prioritized by authority and proximity: canonical sources before derived products.
3. A dependency hit means "inspect", not "rewrite".
4. Existing documents are preferred over new documents when safe editing is available.
5. Addenda are acceptable temporary stabilizers when direct integration risks damaging a large reviewed source.
6. Low-value distant effects may be recorded without immediate action.
7. Propagation consumes an explicit attention/compute budget.

## 7. Relationship to Cognitive Packets

A propagation can itself be represented as bounded unfinished cognitive work:

```text
source semantic delta
+ affected-concept envelope
+ candidate dependents
+ required judgments
+ provenance
→ Semantic Propagation Packet
```

This is a candidate specialization of Cognitive Packet, not yet a requirement for the core protocol.

The packet may travel through search, dependency analysis, reviewers, generators and human arbitration, then return when the affected corpus neighborhood is stable enough.

## 8. Operational acceptance test

For a material source change, the Reactive Corpus passes the test if a future human or agent can answer:

1. What changed semantically?
2. Why did it change?
3. Which authoritative sources depended on the previous meaning?
4. Which consequences were mechanical and regenerated?
5. Which consequences required judgment?
6. Which remain open?
7. Can the propagation be resumed without reconstructing the original conversation?

If these questions cannot be answered, the corpus reacted incompletely.

## 9. Implementation direction

A future `cogentia.js` capability could support a workflow conceptually similar to:

```text
semantic-delta
→ search concepts/links/phrases/related_documents
→ rank candidate dependents
→ classify mechanical vs semantic effects
→ regenerate deterministic views
→ emit continuations for judgments
→ maintain propagation status
```

This should remain assistive rather than sovereign. Semantic dependency discovery will necessarily contain false positives and omissions. The tool's job is to reduce forgotten propagation, not to decide doctrine.
