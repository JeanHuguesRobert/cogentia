---
title: "Corpus Sleep Cycle : Preemptible Monte Carlo Audit on Residual Capacity"
subtitle: "Governed background consistency, contradiction detection, and adaptive exploration without automatic mutation"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-08-31"
status: "working-paper — architecture specification"
version: "1.1"
last_modified_at: "2026-10-24"
license: CC BY-SA 4.0
language: en
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/corpus-sleep-cycle-monte-carlo.md
provenance:
  origin_type: unknown
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
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

## Optional interaction-evidence mission

`run-corpus-sleep-cycle.js` runs the observational interaction mission when
`COGENTIA_INTERACTION_CONFIG` points to an authorized configuration. It shares
capacity qualification and the cycle's wall budget; it runs before repository
sync to avoid starvation. It does not require another scheduler. Operium owns
activation and rollback through
[`deploy-cogentia-interactions-fracta.sh`](https://github.com/JeanHuguesRobert/operium/blob/main/scripts/ops/deploy-cogentia-interactions-fracta.sh).

The configuration names a private `stateRoot`, `authorized: true`, a bounded
`maxCases` (at most 50), `readTimeoutMs`, and source `repositories` with `name`
and `root`. `refreshRepositories: true` fetches canonical main revisions into
private reconstructible Git caches, never pulling or resetting source checkouts.
`projectionFiles` may name existing JSON SQL-projection exports (`path`, `name`)
whose rows contain `id`, `date`, `status`; no database is created or modified.
Repository YAML, readable registers and tabular dashboards are compared by
interaction ID. Missing links, malformed rows, conflicting dates, duplicate
rows and status disagreements produce advisory diagnostics.

All source aliases, original locators, metadata caches, normalized snapshots,
findings and decisions stay in the private runtime directory. Public mode
excludes private cases. Source citations pair opaque aliases with a private
resolver containing exact content hashes and observed Git revisions. No source
body or locator appears in service output. Configuration/storage denial and
connector denial yield typed BLOCKED_SECURITY receipts; read failures yield
PARTIAL receipts. The public log contains only status, code and aggregate
counts. `COGENTIA_SLEEP_STATE_ROOT` separates the public Monte Carlo runtime
queue from read-only corpus directories.

The Gmail reader uses Python's standard-library IMAP client, EXAMINE and
BODY.PEEK header reads. It uses exact source-reviewed Gmail message IDs and
provider thread correlation, with at most 80 messages per thread. Each case has
a date-scoped incremental window with a three-day overlap, retaining earlier
metadata evidence. Credentials come from a systemd `gmail-password` credential
and `INTERACTION_GMAIL_USER`; the existing secret is never printed or embedded
in source. Protocol references: [Google IMAP extensions](https://developers.google.com/workspace/gmail/imap/imap-extensions)
and [RFC 9051](https://www.rfc-editor.org/rfc/rfc9051.html).

Coverage is explicit: All Mail excludes Spam/Trash. Unclassified messages remain
unclassified; neither human authorship nor substantive resolution is inferred
from thread membership. Provider INTERNALDATE observations are stored separately
from established send/reply timestamps, and do not fabricate exact reply latency.
Bounded observations therefore return PARTIAL / SOURCE_COVERAGE_LIMITED and
VERIFY advice where classification or coverage is insufficient. They cannot
justify an exhaustive no-reply assertion, legal deadline or automatic follow-up.
An acknowledgment does not contradict an explicitly substantive awaiting claim.

Batch cursors rotate through source-addressable cases first, newest first within
that group, then the remaining cases. A frozen normalized snapshot
and the existing mission checkpoint allow process replacement without losing
or duplicating findings. Earlier rejected advice remains rejected; later
evidence supersedes outdated pending advice. Original sources are preserved.

For an observational activation, use `--skip-repo-sync --skip-consolidation
--no-cop-evidence` so the Sleep Cycle cannot also invoke the independently owned
weekly consolidation or mutate source checkouts. The separately scheduled
weekly task may contribute evidence; source corrections remain a single
separately authorized review/handler pathway. Enabling this reader grants no
send or source-correction authority. Current execution state belongs in the
[owning Packet](https://github.com/JeanHuguesRobert/cogentia/issues/271).

`--interactions-only` is an explicitly selected bounded source probe; it returns
after the interaction phase, without running the Monte Carlo audit or weekly
consolidation. Document discovery in normal audits also checks the wall budget
and emits a preemption continuation when it expires. Operators may temporarily
override CPU idle priority for a budgeted forced probe; scheduled runs retain
residual-capacity qualification and their configured low priority.

Checks: `node --test scripts/check-interaction-evidence.js
scripts/check-interaction-sources.js`, `python scripts/check-gmail-readonly.py`,
and the existing `node scripts/check-corpus-sleep-cycle.js` regression suite.

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
