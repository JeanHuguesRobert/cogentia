---
title: "Memory, Working Memory, and Corpus Sleep Cycle"
subtitle: "Individual/collective memory, ephemeral working state, long-term consolidation and traceable forgetting"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-07-03"
status: "working-note — source seed"
version: "0.1"
license: "CC BY-SA 4.0"
language: "en"
repository: "JeanHuguesRobert/cogentia"
canonical_path: "cogentia/research/memory_and_corpus_sleep_cycle.md"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/memory_and_corpus_sleep_cycle.md"
document_role: "source"
document_kind: "working-note"
visibility: "public"
lifecycle_state: "working"
source_or_derived: "source-document"
human_validation_required: true
related_documents:
  - "cogentia/research/pipeline.md"
  - "cogentia/research/conversation_to_corpus_pipeline.md"
  - "cogentia/research/cogentigraphic_distillation.md"
  - "cogentia/research/cognitive_packets.md"
  - "cogentia/research/cognitive_packet_switching.md"
  - "cogentia/research/digital_twin_trust_model.md"
  - "cogentia/research/digital_twin_ubiquity.md"
  - "cogentia/research/cogentia_commons_living_corpus.md"
  - "inseme/packages/cop-core/Invariants.md"
  - "Inox/research/fractanet_language_abstractions.md"
tags:
  - cogentia
  - memory
  - working-memory
  - long-term-memory
  - consolidation
  - corpus-sleep-cycle
  - ephemeral
  - forgetting
  - traceability
  - digital-twin
---

# Memory, Working Memory, and Corpus Sleep Cycle

## 0. Purpose

This note records a memory doctrine that must be developed further in Cogentia and reflected in Inox, COP and Fractanet.

The starting observation is simple:

```text
keeping everything indefinitely, at small granularity and at high temperature,
is neither efficient nor robust over time
```

Raw accumulation is not memory. Memory requires selection, temperature, consolidation, accessibility, responsibility, and sometimes lawful forgetting.

This document is a source seed, not a final specification.

---

## 1. The memory problem

A living corpus receives many traces:

- conversations;
- issues;
- commits;
- files;
- scanned documents;
- emails;
- decisions;
- failed paths;
- hypotheses;
- derived products;
- personal and collective events;
- AI outputs;
- human judgments.

If every small trace remains permanently hot, the corpus becomes noisy, expensive, fragile, difficult to query, and easier to capture by volume. The result is not better memory, but uncontrolled sedimentation.

A corpus must therefore distinguish:

```text
trace ≠ memory
archive ≠ active memory
summary ≠ proof
forgetting ≠ falsification
consolidation ≠ erasure
```

---

## 2. Two axes

The first axis is scale:

```text
individual ↔ collective
```

The second axis is temporal/operational status:

```text
working / ephemeral ↔ long-term / consolidated
```

This yields four regimes.

| Regime | Definition | Examples | Main risk |
|---|---|---|---|
| Individual working memory | short-lived operational context for a person, agent or task | current prompt context, scratchpad, active continuation, temporary plan | overfitting to transient noise |
| Individual long-term memory | durable memory of a person or sovereign digital twin | stable corpus, commitments, doctrine, decisions, biography, validated relationships | fossilization, privacy exposure |
| Collective working memory | temporary shared tension around a project, issue, PR, incident or debate | GitHub issue, branch, draft, meeting notes, project board | unresolved proliferation |
| Collective long-term memory | durable institutional or common memory | statutes, source documents, releases, public decisions, validated doctrine | capture by official archive or loss of dissenting trace |

The same datum may move between regimes over time.

Example:

```text
conversation fragment
→ working memory
→ issue
→ source document
→ derived public article
→ cold archive
→ occasional reactivation
```

---

## 3. Memory temperature

A useful corpus needs memory temperature.

| Temperature | Meaning | Typical handling |
|---|---|---|
| Hot | currently active, repeatedly used, decision-relevant | context packs, local cache, active continuation |
| Warm | recently useful or likely to be reused | indexed, summarized, linked |
| Cold | retained mainly for proof, completeness or future archaeology | archived, lower retrieval priority |
| Frozen | legally, emotionally, historically or institutionally preserved | immutable archive, restricted transformation |
| Obsolete | superseded, invalidated or no longer useful | marked, linked to replacement, not hidden |
| Forgettable | eligible for deletion, redaction or non-retention | governed forgetting policy |

Temperature is not moral value. It is operational status.

---

## 4. Ephemeral memory is not a defect

Some memory should be ephemeral:

- scratchpads;
- failed local plans;
- temporary ranking signals;
- short-lived context windows;
- transient tool outputs;
- intermediate AI generations;
- speculative branches;
- cache entries.

The error is not ephemerality. The error is **unaccounted ephemerality** when consequences matter.

A system should say:

```text
this was temporary
this was superseded
this was discarded
this was consolidated
this was preserved as proof
this was forgotten under policy
```

---

## 5. Corpus Sleep Cycle

The **Corpus Sleep Cycle** names a periodic consolidation process. It is analogous to sleep only as an engineering metaphor: not a neuroscience claim, but a useful image for deferred reorganization.

During the active day, the corpus accumulates traces. During the sleep cycle, it reorganizes them.

Candidate stages:

```text
ingest
→ deduplicate
→ cluster
→ classify
→ extract entities/dates/places/projects
→ link to existing concepts
→ detect contradictions
→ identify repeated formulations
→ summarize
→ decide memory temperature
→ promote stable items
→ cool stale items
→ mark obsolete items
→ generate review tasks
→ request human checkpoint when needed
→ update indexes/projections
```

The purpose is not to erase the day. The purpose is to transform noise into usable memory while preserving proof where required.

---

## 6. Consolidation is not compression alone

Compression reduces volume. Consolidation increases capability.

A good consolidation pass may:

- merge duplicate fragments;
- create a stable formulation;
- identify an unresolved contradiction;
- generate an issue;
- update an index;
- move a working hypothesis into a source document;
- demote a stale artifact;
- mark a path as obsolete;
- preserve a raw trace as proof but remove it from ordinary active context;
- create a derived product for a specific public.

Formula:

```text
consolidation = compression + classification + linkage + judgment + routing
```

Without judgment, consolidation degenerates into summarization.

---

## 7. Individual and collective consolidation

Individual consolidation asks:

- What matters for this person?
- What changed their commitments, beliefs, obligations, risks or capacities?
- What belongs to the future digital twin?
- What should remain private, restricted, public, or forgotten?

Collective consolidation asks:

- What did the group decide?
- Which issue remains open?
- Which doctrine was stabilized?
- Which dissent must remain visible?
- Which artifact is authoritative?
- Which derived product was produced for which public?

The individual/collective boundary is critical because a collective archive can capture an individual, and an individual memory can distort a collective trace.

---

## 8. COP implications

COP preserves traceability, but traceability does not require everything to remain hot.

A COP-aligned memory system should distinguish:

```text
immutable event
projection
summary
artifact
retention policy
visibility policy
temperature
obsolescence marker
human validation anchor
```

Events and Artifacts may remain immutable in the COP sense, while projections, indexes, summaries and context packs are recomputed, cooled, superseded or retired.

Rule:

```text
immutability protects proof
consolidation protects usability
forgetting protects sovereignty
```

---

## 9. Inox and Fractanet implications

Inox should eventually expose memory verbs and dialect surfaces.

Candidate verbs:

```text
remember
recall
promote
cool
freeze
obsolete
forget
summarize
cluster
link
consolidate
checkpoint
```

Candidate memory packet envelope fields:

```yaml
memory:
  owner: individual | collective
  regime: working | long_term
  temperature: hot | warm | cold | frozen | obsolete | forgettable
  retention_policy: until_superseded | legal_hold | right_to_forget | forever | ttl
  visibility: private | restricted | public
  stability_level: raw | interpreted | reviewed | source | canonical
  derives_from: []
  supersedes: []
  requires_checkpoint: true
```

Fractanet must route not only energy, compute or inference packets, but also memory packets under mandate, regime and retention constraints.

---

## 10. Relation to scanned paper archives

Digitizing paper is not just space saving. It is memory transformation.

A scanned document may follow this path:

```text
raw scan
→ OCR/searchable layer
→ metadata
→ classified document
→ corpus-linked fragment
→ interpreted note
→ source document or derived product
→ cold proof archive
```

The raw scan may remain as proof. The active memory should usually be a linked, classified, searchable and possibly summarized representation.

---

## 11. Robustness doctrine

A robust memory system should avoid both extremes:

```text
raw hoarding without consolidation
premature summarization without proof
```

Required safeguards:

- never confuse summary with source;
- preserve provenance;
- keep dissent and contradiction visible when relevant;
- cool rather than delete by default;
- delete/redact only under explicit policy;
- use checkpoints for stabilizing consequential memory;
- maintain indexes as projections, not as source truth;
- allow future replay or re-interpretation when proof matters.

---

## 12. Minimal MVP

A first practical Corpus Sleep Cycle MVP could operate nightly or manually on a bounded set of traces.

Inputs:

- new GitHub issues;
- new Markdown documents;
- conversation-derived packets;
- imported scans or normalized traces;
- active project files.

Outputs:

- duplicate clusters;
- candidate source-document updates;
- obsolete/superseded markers;
- concept links;
- index update proposals;
- review tasks;
- memory-temperature suggestions;
- privacy/visibility warnings.

Minimum policy:

```text
no automatic public stabilization without human checkpoint
no deletion without explicit policy
no summary promoted as source without provenance
```

---

## 13. Open questions

1. Which memory temperature vocabulary should become canonical?
2. Should memory temperature live in frontmatter, sidecar files, COP artifacts, or all three?
3. How should individual and collective memory boundaries be encoded?
4. What is the minimal human checkpoint for promoting working memory to long-term memory?
5. How should contradiction be preserved without polluting active context?
6. Which traces are proof, which are learning material, and which are disposable work products?
7. How should the future digital twin ask for more memory rather than hallucinate missing memory?
8. What should be the first real Corpus Sleep Cycle command in `cogentia.js`?

---

## 14. Next artifacts

Candidate continuations:

- `cogentia/research/corpus_sleep_cycle.md` — full source document;
- `cogentia/docs/corpus-sleep-cycle-mvp.md` — operational MVP;
- `cogentia/docs/memory-temperature-policy.md` — policy vocabulary;
- `Inox/research/inox_memory_verbs.md` — language/runtime surface;
- `inseme/packages/cop-core/MemoryProfile.md` — COP implementation profile;
- `FractaVolta/research/fractanet_memory_packets.md` — Fractanet packetization of memory.

Working formula:

```text
A living corpus does not remember by keeping everything active.
It remembers by transforming traces into governed, retrievable, situated, revisable and sometimes forgettable memory.
```
