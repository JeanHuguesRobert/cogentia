---
title: "Corpus Sleep Cycle : Preemptible Monte Carlo Audit on Residual Capacity"
subtitle: "Governed background consistency, contradiction detection, and adaptive exploration without automatic mutation"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-08-31"
status: "architecture-specification"
version: "1.0"
repository: "JeanHuguesRobert/cogentia"
canonical_path: "cogentia/docs/corpus-sleep-cycle-monte-carlo.md"
document_role: "source"
document_kind: "architecture-specification"
visibility: "public"
lifecycle_state: "working"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "high"
related_documents:
  - "cogentia/research/memory_and_corpus_sleep_cycle.md"
  - "cogentia/research/corpus-consistency/README.md"
  - "operium/research/federated-capacity-registry.md"
  - "cogentia/docs/corpus-responsibility-contract.md"
tags:
  - cogentia
  - corpus-sleep-cycle
  - monte-carlo
  - background-compute
  - preemptible-compute
  - residual-capacity
  - consistency-audit
  - review-queue
  - continuations
---

# Corpus Sleep Cycle : Preemptible Monte Carlo Audit on Residual Capacity

## 1. Executive Summary

This document specifies the implementation of the **Corpus Sleep Cycle** as a governed consumer of qualified residual capacity (GitHub Issue #124).

The system replaces legacy, un-governed SQLite scanners with a modern, preemptible Monte Carlo document-pair audit engine integrated into the Cogentia v3 capability architecture.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Operium / Local Capacity Qualification                   │
│        (Checks load average, free RAM, active foreground RPC requests)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Qualified Idle Capacity
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               Adaptive Multi-Factor Monte Carlo Pair Sampler                │
│    • Inverse historical sample count (coverage boost)                       │
│    • Semantic / tag distance & proximity balance                            │
│    • Document freshness / modification recency                              │
│    • Cross-repository & branch provenance                                   │
│    • Tension signals (unreviewed, hypotheses, deprecations)                 │
│    • Seedable PRNG (Mulberry32) for reproducible exploration batches        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Candidate Pairs (Doc A, Doc B)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       6-Angle Consistency Evaluator                         │
│  1. possible_contradiction: contradictory claims, status/lifecycle mismatch │
│  2. duplication: repeated formulations and near-duplicate paragraphs        │
│  3. semantic_drift: differing definitions of identical concepts/terms       │
│  4. weak_hypothesis: unbacked claims in canonical/source documents          │
│  5. missing_link: high conceptual co-occurrence without cross-references    │
│  6. overgeneralization: universal quantifiers contradicted by qualifiers    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Candidate Signals (with Citations & Provenance)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                Governed Append-Only Advisory Review Queue                   │
│                  (.cogentia/sleep_cycle_review_queue.jsonl)                 │
│       INVARIANT: ZERO automatic mutation of source markdown documents       │
│            All outputs remain strictly advisory for human review            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Checkpoints & Metrics
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                Evaluation Metrics & Resumption Continuations                │
│   • Coverage Progression (pair & document coverage ratios, sampling entropy)│
│   • True Cognitive Gain (signal yield rate, weighted semantic tension)      │
│   • Preemption Checkpoints & Resumable Continuation Packets                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Invariants

1. **Zero Automatic Source Mutation**:
   Under no circumstances does the Corpus Sleep Cycle automatically edit, patch, publish, delete, or reclassify source documents. All findings are structured advisory signals that land exclusively in the governed Review Queue.

2. **Residual Capacity Qualification**:
   Sleep compute executes only when Operium or local telemetry qualifies that residual capacity is available (low CPU load, sufficient RAM, zero active foreground requests) or when explicitly forced by an operator with a designated budget.

3. **Strict Privacy Boundaries**:
   The engine enforces visibility rules (`privacy-views.js`). In public mode or on untrusted nodes, private repositories (such as `registre-mariani`) are completely omitted from sampling and pair analysis to prevent secret exfiltration.

4. **Deterministic Reproducibility & Continuations**:
   Any run can be deterministically reproduced given a seed and budget. If interrupted by timeout or rising foreground demand, the engine saves a checkpoint and emits a `cogentia.continuation.v1` packet allowing seamless resumption without duplicate pair evaluations.

5. **Cognitive Gain vs Raw Coverage Distinction**:
   Evaluation metrics distinguish mere combinatorial coverage (visiting pairs) from real cognitive value (surfacing actionable contradictions, drifts, and missing bridges).

---

## 3. Architecture & Components

### 3.1 Adaptive Pair Sampler (`pair-sampler.js`)

For a corpus with $N$ documents, the pair space contains $N(N-1)/2$ possible combinations. The adaptive sampler uses tournament selection with multi-factor weighting:

$$W(D_A, D_B) = W_{\text{coverage}} \cdot W_{\text{proximity}} \cdot W_{\text{freshness}} \cdot W_{\text{provenance}} \cdot W_{\text{tension}}$$

Where:
- $W_{\text{coverage}} = \frac{1}{1 + 2 \cdot \text{samples}(A, B)} \cdot \frac{1}{1 + \sqrt{\text{samples}(A) \cdot \text{samples}(B)}}$
- $W_{\text{proximity}} = 0.5 + 0.5 \cdot \text{JaccardSimilarity}(D_A, D_B)$
- $W_{\text{freshness}} = \max\left(0.2, \frac{1}{1 + \text{ageDays}_{\min} / 30}\right)$
- $W_{\text{provenance}} = 1.3$ if $\text{repo}(A) \neq \text{repo}(B)$ else $1.0$
- $W_{\text{tension}} = 1.25$ per document with unreviewed status or tension markers (`TODO`, `hypothesis`, `superseded`)

### 3.2 6-Angle Consistency Evaluator (`audit-evaluator.js`)

Each sampled pair $(D_A, D_B)$ is audited across 6 consistency dimensions:

| Angle | Signal Kind | Description |
|---|---|---|
| **1** | `possible_contradiction` | Opposing assertions, conflicting invariant polarities, or lifecycle status mismatches |
| **2** | `duplication` | High n-gram similarity in paragraph text or repeated definitions |
| **3** | `semantic_drift` | Diverging definitions or meanings for the same concept/tag across versions |
| **4** | `weak_hypothesis` | Unbacked speculative assertions in canonical/source documents |
| **5** | `missing_link` | 3+ shared concept tags without cross-reference in `related_documents` |
| **6** | `overgeneralization` | Universal assertions ("always", "never", "all") contradicted by specific exceptions |

### 3.3 Governed Review Queue (`review-queue.js`)

Findings are recorded in `.cogentia/sleep_cycle_review_queue.jsonl`. Each record contains:
- `id`: deterministic SHA-1 signal identifier
- `signal_kind`: one of the 6 kinds
- `severity`: `info` | `warning` | `error`
- `doc_a` & `doc_b`: `{ id, repo, path, title, status, excerpt }`
- `finding`: human-readable explanation of the tension
- `uncertainty` & `confidence`: calibrated confidence score
- `method`: rule/model reference
- `review_status`: `pending_review` (or `accepted` / `rejected` / `quarantined` after operator decision)
- `provenance`: `{ timestamp, run_id, node, capacity_ref }`

### 3.4 Evaluation Metrics (`metrics.js`)

- **Pair Coverage Ratio**: $\frac{\text{unique\_pairs\_sampled}}{\text{total\_possible\_pairs}}$
- **Sampling Entropy**: Normalized Shannon entropy $H / \log_2(N)$ measuring exploration dispersion
- **Signal Yield Rate**: $\frac{\text{signals\_count}}{\text{pairs\_sampled}}$
- **Cognitive Gain Score**: $\left(\sum w_i \cdot \text{confidence}_i\right) \times \sqrt{\text{distinct\_problem\_clusters}}$
- **Marginal Resource Efficiency**: $\frac{\text{Cognitive Gain}}{\text{Elapsed Seconds}}$

---

## 4. Acceptance Criteria Verification

| Criterion | Implementation & Evidence | Status |
|---|---|---|
| **1. Qualification, Budget & Preemption** | `idle-qualification.js` checks CPU/RAM/RPCs; wall-time and pair-count budgets trigger clean preemption. | **PASS** |
| **2. Reproducible Batch & Continuation Resumption** | Seeded PRNG (`createRng`) + `emitSleepCycleContinuation` / checkpoint restoration with zero duplicate re-runs. | **PASS** |
| **3. Traceable Signals with Citations** | Standardized JSON signal records with 2 source citations, line excerpts, uncertainty, and provenance. | **PASS** |
| **4. Strict Review Queue & Zero Mutation** | Append-only storage in `.cogentia/sleep_cycle_review_queue.jsonl`; file mtime verification in tests. | **PASS** |
| **5. Coverage vs Cognitive Gain Metrics** | `evaluateAuditMetrics` reports separate coverage progression, entropy, signal yields, and cognitive gain. | **PASS** |

---

## 5. Usage & CLI Operations

```bash
# Run Monte Carlo Sleep Cycle audit with default bounds (30 pairs, 10s budget)
node scripts/cogentia.js sleep-cycle

# Run on forced mode with custom pair count and seed
node scripts/cogentia.js sleep-cycle --force --max-pairs 50 --seed 42

# Run with machine-readable JSON output
node scripts/cogentia.js sleep-cycle --force --json

# Resume an interrupted / preempted sleep cycle run
node scripts/cogentia.js sleep-cycle --resume cont_sleep_audit_1725055000_1725055010

# Run full test suite
node scripts/test-corpus-sleep-cycle.js
```
