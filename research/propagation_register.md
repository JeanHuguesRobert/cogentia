---
title: "Propagation Register"
subtitle: "Provider-neutral backlog of pending corpus propagations"
author: "Jean Hugues Noël Robert"
repository: "cogentia"
status: "working source — operational registry"
version: "0.1"
date: "2026-08-16"
last_modified_at: "2026-08-16"
language: "en"
document_role: "source"
document_kind: "operational-registry"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
related_issues:
  - "cogentia#58"
  - "cogentia#91"
  - "cogentia#99"
related_documents:
  - "research/cognitive_packets.md"
  - "research/memory_and_corpus_sleep_cycle.md"
  - "prompts/redactor.md"
update_policy: "UP-DEFAULT-REVIEWED"
---

# Propagation Register

## Purpose

This document is the provider-neutral working register of **pending corpus propagations**.

It exists to prevent a recurrent failure mode:

```text
local insight or correction
→ local stabilization
→ expected effects elsewhere
→ incomplete propagation
→ later inconsistency / cognitive debt
```

The register is not a new source of doctrinal truth. The source remains the act, packet, commit, review, issue, conversation checkpoint, experiment, or other evidence from which the propagation obligation arose.

The register is a **reconstructible operational projection** of effects that still need to travel through the Corpus.

GitHub Issues, Kanban boards, Daily Brief sections, Sleep Cycle reports and future agent-native work surfaces MAY project or enrich this state. None of those provider surfaces is canonical by itself.

## Core rule

> **Source facts stay where they are produced; propagation obligations are consolidated as projections until their expected effects have been verified.**

## State model

```text
discovered
→ propagation_needed
→ propagation_in_progress
→ propagated
→ verified
```

Additional states:

```text
propagation_debt
quarantined
rejected
blocked
```

Definitions:

- `discovered` — a possible propagation effect has been noticed but not yet qualified;
- `propagation_needed` — a concrete target/effect has been identified;
- `propagation_in_progress` — at least one target is being amended;
- `propagated` — the expected target changes were made;
- `verified` — the target behavior/content was checked after propagation;
- `propagation_debt` — an earlier decision or stabilized insight is known to have been propagated incompletely;
- `quarantined` — propagation may be useful but is withheld pending clarification/review;
- `rejected` — propagation was considered and deliberately not performed;
- `blocked` — propagation is warranted but cannot currently proceed.

## Minimal entry shape

```yaml
propagation:
  id:
  status:
  discovered_at:
  source_refs: []
  source_summary:
  observed_gap: []
  targets: []
  expected_effects: []
  priority: low|medium|high|urgent
  confidence: low|medium|high
  propagation_level: 0|1|2|3
  evidence_refs: []
  blockers: []
  next_action:
  verification:
    status: not_tested|planned|tested|passed|failed
    evidence_refs: []
  notes:
```

`propagation_level` reuses the Daily Brief propagation vocabulary from `cogentia#91`:

```text
0 = observe only
1 = suggested propagation
2 = prepared propagation / human approval expected
3 = whitelisted automatic projection only where explicitly authorized
```

The register itself does not grant write authority.

## Sleep Cycle integration

The Corpus Sleep Cycle SHOULD inspect this register and related source traces as one input among others.

Its role is to:

- detect stale pending branches;
- identify propagation debt;
- detect duplicates and contradictions;
- re-score candidates under bounded compute/time budgets;
- propose replay or cognitive-regression tests when a propagation changes behavior;
- use cold-handler / handler-substitution tests when provider-independent assimilation is material;
- distinguish `observed`, `inferred`, `planned`, and `tested` states;
- never claim that an unexecuted propagation or test succeeded.

This aligns with `cogentia#58`: bounded stochastic reevaluation may select pending branches from this registry, but MUST NOT mutate source artifacts automatically unless a separate mandate authorizes it.

## Entries

### PR-2026-001 — FractaLog source facts should become packet-local

```yaml
propagation:
  id: PR-2026-001
  status: propagation_debt
  discovered_at: 2026-08-16
  source_refs:
    - "inseme/packages/cop-kernel/docs/packet-strict-accounting-cascade.md"
    - "conversation checkpoint R55"
  source_summary: >-
    COP strict accounting has already converged on packet-local source facts with
    higher-level consolidated projections. Recent architectural work reached the
    same conclusion for trace/log source material: the Cognitive Packet should
    carry or directly reference its own source trace facts, while FractaLog
    federation produces higher-level projections.
  observed_gap:
    - "FractaVolta/research/fractalog.md still models FractaLog primarily as a separate governed log object"
    - "inseme/research/cop_fractalog_profile.md still says a FractaLog entry is normally a COP Event plus profile metadata"
    - "inseme/research/cop_mission_stigmergy_exploration.md keeps fractalogRef as a separate Mission reference"
  targets:
    - "JeanHuguesRobert/FractaVolta:research/fractalog.md"
    - "JeanHuguesRobert/inseme:research/cop_fractalog_profile.md"
    - "JeanHuguesRobert/inseme:research/cop_mission_stigmergy_exploration.md"
  expected_effects:
    - "state packet-local trace facts as the preferred source location for packet-borne acts"
    - "treat FractaLog views above the packet as projections/federations rather than duplicated source ledgers"
    - "preserve append-only, custody, privacy, delayed-transparency and mandate-trace semantics"
    - "avoid claiming that every FractaLog fact must physically reside inline when a content-addressed reference is the correct packet-local representation"
  priority: high
  confidence: high
  propagation_level: 2
  evidence_refs:
    - "packet strict accounting: one physical provider call has exactly one owning packet; consolidated spend is a projection"
  blockers: []
  next_action: "Perform surgical amendments in the three target documents, then verify consistency against COP packet accounting and FractaLog invariants."
  verification:
    status: planned
    evidence_refs: []
  notes: >-
    This is an explicit propagation debt: implementation/accounting semantics have
    advanced farther than the current FractaLog source documents.
```

### PR-2026-002 — Federated Capacity Registry and analytical resource accounting

```yaml
propagation:
  id: PR-2026-002
  status: propagation_needed
  discovered_at: 2026-08-16
  source_refs:
    - "inseme/research/cogentia_accounting_architecture.md"
    - "inseme/packages/cop-kernel/src/capabilityRegistry.js"
    - "inseme/packages/cop-kernel/docs/packet-strict-accounting-cascade.md"
    - "conversation checkpoint R55"
  source_summary: >-
    Compute and other capacities are heterogeneous, distributed and locally
    authoritative. Cogentia analytical accounting already supports dimensions such
    as provider, capability, model/resource, packet/treatment and beneficiary,
    while COP already has a capability registry and packet-local resource
    accounting. These should converge into a federated capacity registry rather
    than a separate centralized inventory.
  observed_gap:
    - "no canonical provider-neutral registry currently inventories heterogeneous compute/subscription/free-tier/local capacities"
    - "capability discovery, resource availability and analytical cost/usage views are not yet explicitly unified"
    - "personal lean-mode capacity such as subscriptions/free tiers is largely invisible to scheduling"
  targets:
    - "JeanHuguesRobert/inseme:packages/cop-kernel/src/capabilityRegistry.js"
    - "JeanHuguesRobert/inseme:research/cogentia_accounting_architecture.md"
    - "JeanHuguesRobert/cogentia:research/memory_and_corpus_sleep_cycle.md"
    - "relevant scheduler / packet-attractor documents after implementation evidence exists"
  expected_effects:
    - "each node/provider remains authoritative for its declared capacities"
    - "global capacity views are federated projections with freshness, provenance, confidence and visibility"
    - "capacity descriptions include access mode, quota, fixed/marginal cost, availability, automation, jurisdiction, privacy/security and preemptibility where material"
    - "actual consumption remains packet-local and projects into analytical accounting"
    - "schedulers prefer already-paid/free/idle admissible capacity before new purchase when total cost including human attention and risk justifies it"
    - "Sleep/background work can consume qualified residual capacity only under explicit mandate and bounded budget"
  priority: high
  confidence: high
  propagation_level: 1
  evidence_refs:
    - "Cogentia Accounting Architecture: packet/treatment-level imputation and multidimensional analytical views"
    - "COP capabilityRegistry implementation"
    - "packet strict accounting own/consolidated projection semantics"
  blockers:
    - "actual quotas and subscription entitlements are provider-specific and may be difficult to measure automatically"
    - "subscription UI capacity must not be confused with API-automatable capacity"
  next_action: "Inventory existing capability registry schema and scheduler consumers; propose the smallest compatible capacity-declaration extension before code changes."
  verification:
    status: planned
    evidence_refs: []
  notes: >-
    The first practical dogfood case is Jean Hugues Robert's own distributed
    compute capacity in lean mode, but the schema must remain generic and
    federation-ready.
```

## Operational discipline

A propagation entry SHOULD be closed as `verified`, not merely `propagated`, when the expected downstream effect is behaviorally material.

Where a propagation captures an operational learning, verification SHOULD include an appropriate regression case. When the learning is intended to belong to the network rather than a handler's private memory, use a cold-handler or handler-substitution test when feasible.

A propagation that produces a local gain but breaks a previously validated case creates a new propagation/cognitive-regression debt; it must not be silently counted as successful learning.

## Relationship to work tracking

This registry intentionally follows the non-capture direction of `cogentia#99`:

```text
canonical propagation intelligence
!= GitHub Issues
!= one Kanban board
!= one provider UI
```

The registry may later be represented as structured packets or another provider-neutral work-state substrate. This Markdown/YAML form is a minimal, inspectable bootstrap, not a commitment to Markdown as the final runtime representation.
