---
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "working-note"
classification_confidence: "medium"
title: Memory, Working Memory, and Corpus Sleep Cycle
subtitle: Individual/collective memory, ephemeral working state, consolidation, dreaming, regression and traceable forgetting
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A.
date: '2026-07-03'
last_modified_at: '2026-08-16'
status: working-note — source seed
version: '0.2'
license: CC BY-SA 4.0
language: en
repository: JeanHuguesRobert/cogentia
canonical_path: cogentia/research/memory_and_corpus_sleep_cycle.md
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/memory_and_corpus_sleep_cycle.md
document_role: source
document_kind: working-note
visibility: public
lifecycle_state: working
source_or_derived: source-document
human_validation_required: true
related_documents:
  - cogentia/research/pipeline.md
  - cogentia/research/conversation_to_corpus_pipeline.md
  - cogentia/research/cogentigraphic_distillation.md
  - cogentia/research/cognitive_packets.md
  - cogentia/research/cognitive_packet_switching.md
  - cogentia/research/digital_twin_trust_model.md
  - cogentia/research/digital_twin_ubiquity.md
  - cogentia/research/cogentia_commons_living_corpus.md
  - inseme/packages/cop-core/Invariants.md
  - Inox/research/fractanet_language_abstractions.md
  - barons-Mariani/research/the_network_is_the_learning_computer.md
  - barons-Mariani/research/potentics_of_compute.md
  - marenostrum/research/qualitative_compute_growth.md
tags:
  - cogentia
  - memory
  - working-memory
  - long-term-memory
  - consolidation
  - corpus-sleep-cycle
  - dreaming
  - sleep-time-compute
  - cognitive-regression
  - continual-learning
  - replay
  - cold-handler
  - handler-substitution
  - background-compute
  - preemptible-compute
  - resource-utilization
  - forgetting
  - traceability
  - digital-twin
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
update_policy: UP-DEFAULT-REVIEWED
changelog:
  - v0.1 (2026-07-03) — initial source seed on memory regimes, temperature, consolidation and the Corpus Sleep Cycle.
  - v0.2 (2026-08-16) — added living SOTA on Dreaming/Sleep-time Compute; distinguished candidate learning from validated assimilation; added cognitive regression, cold-handler substitution, preemptible background compute, bounded mandate/budget, and an implementation ladder.
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

A second observation is now explicit:

```text
changed memory ≠ improved memory
new learning ≠ globally beneficial learning
replay ≠ guaranteed retention
```

A living corpus must therefore not only consolidate experience. It must test whether candidate assimilations preserve or improve previously acquired capabilities.

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
remembering ≠ learning
local learning ≠ global cognitive gain
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

The **Corpus Sleep Cycle** names a periodic or opportunistic consolidation process. It is analogous to sleep only as an engineering metaphor: not a neuroscience claim, but a useful image for deferred reorganization, replay, validation and re-learning.

During active work, the corpus accumulates traces and candidate learnings. During the sleep cycle, it reorganizes, tests and selectively assimilates them.

The original consolidation pipeline remains useful:

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

It is now extended by an explicit learning-validation loop:

```text
experience
→ candidate learning
→ candidate corpus delta
→ replay / cognitive regression
→ cold-handler or substitution tests when relevant
→ compare expected and observed behavior
→ accept | revise | quarantine | reject
→ assimilate validated delta
→ record evidence and residual uncertainty
```

The purpose is not to erase the day. The purpose is to transform noise into usable memory while preserving proof, and to avoid turning every local correction into an untested global rule.

---

## 6. Living state of the art: Sleep, Dreaming and background consolidation

**State of the art checked: 2026-08-16.** This section is living evidence, not a timeless taxonomy.

Several independent lines of work now converge on deferred cognition and memory consolidation between foreground interactions.

### OpenAI — Dreaming

OpenAI describes **Dreaming** as a background process that synthesizes memory from conversation history so that later conversations receive fresher and more relevant context. OpenAI states that an initial form was introduced in 2025 and described a more scalable architecture in June 2026.

Reference:
- https://openai.com/index/chatgpt-memory-dreaming/

### Anthropic — Managed Agents Dreaming

Anthropic's Managed Agents research preview uses **Dreaming** to review previous sessions and memory stores, merge duplicates, replace stale or contradicted entries, surface patterns and produce a reorganized memory store. The input store remains unchanged, allowing review or rejection of the proposed dream output.

References:
- https://claude.com/blog/new-in-claude-managed-agents
- https://platform.claude.com/docs/en/managed-agents/dreams

### Letta — Sleep-time Compute

Letta introduced **Sleep-time Compute** in 2025 as a way to move useful reasoning out of latency-sensitive interactions and into periods where compute would otherwise be idle. Its sleep-time agent can rewrite or improve the primary agent's memory asynchronously, with persistent context bridging sleep-time work and later foreground behavior.

Reference:
- https://www.letta.com/blog/sleep-time-compute/

### Research convergence

Recent research includes explicit offline memory consolidators and “sleep” paradigms for language models and agents, including Auto-Dreamer and *Language Models Need Sleep*. Continual-learning work also emphasizes replay, transfer, repair and catastrophic-forgetting evaluation.

Important caution: replay is not automatically beneficial. 2026 work shows that, depending on sample/task relationships, replay can itself increase forgetting. Therefore the Corpus Sleep Cycle must treat replay as an experiment whose effect is measured, not as a guaranteed preservation mechanism.

Representative references:
- Ye et al., *Auto-Dreamer: Learning Offline Memory Consolidation for Language Agents*, arXiv:2605.20616, 2026.
- Behrouz, Hashemi, Mirrokni, *Language Models Need Sleep: Learning to Self-Modify and Consolidate Memories*, arXiv:2606.03979, 2026.
- Mahdaviyeh et al., *Replay can provably increase forgetting*, Conference on Lifelong Learning Agents / PMLR 330, 2026.
- Feng et al., *FOREVER: Forgetting Curve-Inspired Memory Replay for Language Model Continual Learning*, ACL 2026.

### Position of the Corpus Sleep Cycle

The term **Sleep Cycle** predates this convergence inside the Cogentia corpus, but no priority claim is useful here. The convergence is evidence that background consolidation is becoming a general systems pattern.

Cogentia's intended extension is broader than memory cleanup alone:

```text
memory consolidation
+ contradiction detection
+ candidate corpus mutation
+ learning persistence tests
+ cognitive regression
+ handler substitution
+ governed forgetting
+ opportunistic resource use
+ traceable human arbitration
```

---

## 7. Consolidation is not compression alone

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
- create a derived product for a specific public;
- derive a candidate operational rule from a real failure;
- generate a regression case that must survive future changes.

Formula:

```text
consolidation = compression + classification + linkage + judgment + routing + validation
```

Without judgment, consolidation degenerates into summarization.
Without validation, consolidation can become a mechanism for durable error propagation.

---

## 8. Candidate learning, assimilation and regression

A new lesson should not immediately become canonical merely because it solved the latest problem.

Distinguish:

```text
experience
candidate_learning
candidate_delta
validated_learning
assimilated_learning
```

A useful assimilation unit is provisionally:

```text
Learning = {
  corpus_delta,
  evidence,
  regression_case,
  scope,
  mandate,
  budget,
  known_limits
}
```

The key safety condition is:

```text
ChangedBehavior ≠ ImprovedBehavior
```

A locally successful learning can produce **cognitive regression** elsewhere. A later rule may also overwrite, mask, contradict or context-dilute an earlier capability.

Therefore a candidate delta should be testable against a **Cognitive Regression Suite** composed primarily from real historical cases rather than synthetic examples alone.

Desired loop:

```text
new incident
→ operational yield
→ candidate corpus patch
→ new cognitive regression case
→ run old + new cases
→ compare capability before/after
→ assimilate only if acceptable
```

A regression is not limited to exact-output mismatch. It may include:

- a previously avoided failure reappears;
- a previously respected mandate is bypassed;
- an earlier distinction becomes blurred;
- provider substitution stops working;
- context cost rises enough to reduce downstream capability;
- a new rule creates contradictory behavior elsewhere;
- the system becomes less able to identify uncertainty;
- a formerly available route or capability becomes inaccessible.

---

## 9. Cold handlers and learning persistence

To determine whether learning belongs to the network/corpus rather than to one agent's private state, the Sleep Cycle should support **cold-handler** and **handler-substitution** tests.

A cold handler receives only the transferable state that an ordinary successor would legitimately receive. It must not rely on the private memory of the handler involved in the original incident.

A learning is more strongly materialized when its relevant behavioral effect survives substitution:

```text
same corpus delta
+ fresh GPT / Claude / Grok / Codex / human / deterministic handler
→ materially equivalent learned behavior
```

This yields an operational test:

```text
Behavior(H2, Corpus_after, Case)
≠
Behavior(H2, Corpus_before, Case)
```

where `H2` did not participate in the original learning event.

This is not a requirement that every learning be provider-independent in every detail. It is a test of where the learned capability actually resides.

---

## 10. Individual and collective consolidation

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
- Which operational learning should be generalized beyond its originating agent or project?

The individual/collective boundary is critical because a collective archive can capture an individual, and an individual memory can distort a collective trace.

---

## 11. Background compute and opportunistic execution

The Sleep Cycle is a natural **background workload**.

Unlike foreground interaction, many consolidation tasks tolerate:

- higher latency;
- interruption;
- migration;
- heterogeneous processors;
- lower-priority queues;
- variable execution windows;
- partial progress with resumable checkpoints.

Therefore they are good candidates for compute that would otherwise remain unused.

Operational principle:

```text
foreground demand has priority
sleep work consumes qualified residual capacity
sleep work is preemptible
progress is checkpointed
no preemption loses authoritative state
```

The existing `idle-qualification.js` and `run-corpus-sleep-cycle.js` are early implementation surfaces for this idea.

### Mandate and budget remain mandatory

“Idle” does not mean “free” and does not create authority.

Every background cycle must operate under explicit bounds such as:

```yaml
sleep_cycle:
  mandate: <explicit scope>
  max_wall_time: <duration>
  max_compute: <provider/resource budget>
  max_cost: <currency budget>
  max_energy_or_power: <optional physical bound>
  allowed_models: []
  allowed_repositories: []
  privacy_scope: <scope>
  preemptible: true
  human_checkpoint: <policy>
```

A scheduler must be able to stop or defer the cycle when:

- foreground demand rises;
- budget is exhausted;
- resource qualification fails;
- privacy/mandate boundaries are reached;
- a proposed mutation requires human arbitration.

### Utilization hypothesis

The broader Corpus contains a recurring hypothesis: as useful AI workloads expand, available compute tends to attract additional work rather than remain idle for long. Background consolidation, indexing, simulation, regression and exploration create elastic demand capable of absorbing residual capacity.

This supports — but does not prove — a **persistent compute scarcity / high-utilization hypothesis**:

```text
more available compute
→ more economically or cognitively useful candidate work
→ pressure toward high utilization
```

The hypothesis must remain distinct from a physical law. Compute is constrained by energy, hardware, cooling, materials, network capacity, maintenance, capital and geography. Improvements in energy technology can move those bounds without eliminating resource constraints.

The Sleep Cycle should therefore optimize **value per marginal residual resource**, not maximize consumption for its own sake.

---

## 12. COP implications

COP preserves traceability, but traceability does not require everything to remain hot.

A COP-aligned memory system should distinguish:

```text
immutable event
projection
summary
artifact
candidate learning
validated learning
regression evidence
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
regression testing protects retained capability
forgetting protects sovereignty
```

A future COP sleep-cycle event family should make the learning transition observable, for example:

```text
candidate_learning.created
regression_case.selected
regression_run.completed
candidate_learning.revised
candidate_learning.accepted
candidate_learning.quarantined
candidate_learning.rejected
learning.assimilated
```

---

## 13. Inox and Fractanet implications

Inox should eventually expose memory and learning verbs and dialect surfaces.

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
dream
replay
regress
validate
assimilate
quarantine
checkpoint
```

Candidate memory/learning packet envelope fields:

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
learning:
  status: candidate | validating | assimilated | quarantined | rejected
  evidence: []
  regression_cases: []
  handler_substitution_required: false
  mandate_ref: null
  budget_ref: null
```

Fractanet must route not only energy, compute or inference packets, but also memory and learning packets under mandate, regime, priority, budget and retention constraints.

Sleep work is a particularly natural workload for an Energy/Compute Packet Network because it is generally interruptible and schedulable around resource availability.

---

## 14. Relation to scanned paper archives

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

## 15. Robustness doctrine

A robust memory system should avoid both extremes:

```text
raw hoarding without consolidation
premature summarization without proof
```

It should now also avoid:

```text
local correction promoted without regression testing
replay assumed to be harmless
background compute treated as unbounded or ownerless
```

Required safeguards:

- never confuse summary with source;
- preserve provenance;
- keep dissent and contradiction visible when relevant;
- cool rather than delete by default;
- delete/redact only under explicit policy;
- use checkpoints for stabilizing consequential memory;
- maintain indexes as projections, not as source truth;
- allow future replay or re-interpretation when proof matters;
- attach a regression case to consequential reusable learnings when practical;
- test candidate assimilation against representative prior capabilities;
- use cold/substituted handlers when locating learning matters;
- keep candidate mutations reversible until validated;
- bound every background run by mandate, priority and budget.

---

## 16. Progressive implementation ladder

The Sleep Cycle should be implemented progressively. The first useful version need not be autonomous.

### Level 0 — manual consolidation

Human/agent review of a bounded set of traces with explicit candidate updates.

### Level 1 — deterministic housekeeping

```text
deduplicate
index
link
validate frontmatter
mark obvious supersession
scan for structural corruption
```

No semantic mutation without review.

### Level 2 — candidate-learning generation

Generate proposed corpus deltas from incidents, corrections, reviews and repeated patterns. Do not automatically assimilate them.

### Level 3 — cognitive regression

Associate candidate learnings with historical cases and replay a bounded regression subset before promotion.

### Level 4 — cold-handler / provider substitution

Replay selected cases using fresh or alternative handlers to test whether learning is actually materialized in transferable state.

### Level 5 — opportunistic background scheduling

Run Levels 1–4 preemptibly on qualified idle/residual compute under explicit mandate and budget.

### Level 6 — governed self-modification

Allow the system to propose and, only within explicitly authorized scopes, apply reversible Corpus modifications after passing required checks. Consequential or public stabilization remains subject to the applicable human checkpoint.

At every level:

```text
trace first
reversibility where possible
no implied authority
failure is evidence
```

---

## 17. Minimal MVP

A practical next Corpus Sleep Cycle MVP can operate nightly, manually or opportunistically on a bounded set of traces.

Inputs:

- new GitHub issues;
- new Markdown documents and commits;
- conversation-derived packets;
- recent corrections and reviewer yields;
- imported scans or normalized traces;
- active project files;
- historical regression cases.

Outputs:

- duplicate clusters;
- candidate source-document updates;
- candidate learnings;
- candidate regression cases;
- regression results;
- handler-substitution results where requested;
- obsolete/superseded markers;
- concept links;
- index update proposals;
- review tasks;
- memory-temperature suggestions;
- privacy/visibility warnings;
- budget/resource utilization report.

Minimum policy:

```text
no automatic public stabilization without applicable human checkpoint
no deletion without explicit policy
no summary promoted as source without provenance
no consequential candidate learning promoted without evidence
no background execution beyond its mandate/budget
foreground work may preempt sleep work
```

The first end-to-end Reality test should reuse a real historical incident. The Markdown/TeX transformation failure of 2026-08-16 is a suitable candidate: the new final-artifact-validation rule should be replayed with a cold handler and compared against the pre-learning Corpus state.

---

## 18. Open questions

1. Which memory temperature vocabulary should become canonical?
2. Should memory temperature live in frontmatter, sidecar files, COP artifacts, or all three?
3. How should individual and collective memory boundaries be encoded?
4. What is the minimal human checkpoint for promoting working memory to long-term memory?
5. How should contradiction be preserved without polluting active context?
6. Which traces are proof, which are learning material, and which are disposable work products?
7. How should the future digital twin ask for more memory rather than hallucinate missing memory?
8. What should be the first real Corpus Sleep Cycle command in `cogentia.js`?
9. What is the minimal schema for a durable Cognitive Regression Case?
10. How should regression subsets be selected so replay itself does not create bias or excessive cost?
11. Which learnings require cold-handler or multi-provider substitution tests?
12. How should a candidate Corpus mutation be sandboxed before promotion?
13. How should sleep work be priced and scheduled across heterogeneous idle compute?
14. Should marginal energy/exergy, carbon, water or locality constraints become first-class budget dimensions in Fractanet scheduling?
15. How should a Sleep Cycle measure net cognitive gain rather than merely number of changes applied?

---

## 19. Next artifacts

Candidate continuations:

- `cogentia/docs/corpus-sleep-cycle-mvp.md` — operational MVP and event flow;
- `cogentia/docs/cognitive-regression-suite.md` — test-case schema, replay policy and scoring;
- `cogentia/docs/memory-temperature-policy.md` — policy vocabulary;
- `cogentia/scripts/run-corpus-sleep-cycle.js` — preemptible runner, progressively replacing simulated audit steps with real evidence;
- `Inox/research/inox_memory_verbs.md` — language/runtime surface;
- `inseme/packages/cop-core/MemoryProfile.md` — COP implementation profile;
- `FractaVolta/research/fractanet_memory_packets.md` — Fractanet packetization of memory and learning;
- `marenostrum` / `barons-Mariani` — link the persistent-compute-scarcity hypothesis to existing work on qualitative compute growth and Potentics of Compute rather than duplicating that doctrine here.

Working formula:

```text
A living corpus does not learn by keeping everything active
or by accepting every correction.

It learns by transforming experience into governed candidate memory,
testing whether that memory preserves and improves capability,
then assimilating what survives Reality.
```
