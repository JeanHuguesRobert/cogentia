---
title: "Propagation Register"
subtitle: "Provider-neutral backlog of pending corpus propagations"
author: "Jean Hugues Noël Robert"
repository: "cogentia"
status: "working source — operational registry"
version: "0.2"
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
  - "https://github.com/JeanHuguesRobert/operium/blob/main/research/federated-capacity-registry.md"
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

### PR-2026-002 — Operium Federated Capacity Registry and analytical resource accounting

```yaml
propagation:
  id: PR-2026-002
  status: propagation_in_progress
  discovered_at: 2026-08-16
  source_refs:
    - "operium/docs/operium-node-agent.md"
    - "operium/research/federated-capacity-registry.md"
    - "inseme/research/cogentia_accounting_architecture.md"
    - "inseme/packages/cop-kernel/docs/packet-strict-accounting-cascade.md"
    - "conversation checkpoints R55-R59"
  source_summary: >-
    Operium already owns the natural operational layers for resource/capacity
    inventory: a durable slow catalogue, fast volatile advertisements and
    node-local operational projections. Cogentia/COP should express governed
    capacity requirements, mandates, budgets and packet-local consumption facts,
    while Operium federates what capacities are actually available. This avoids a
    competing capacity authority inside Cogentia.
  observed_gap:
    - "Operium catalogue and ONA advertisements do not yet expose a sufficiently generic qualified-capacity declaration for compute, inference, free-tier, subscription, quota and other heterogeneous resources"
    - "Cogentia/COP capability matching and Operium operational capacity inventory are not yet connected by a clear requirements-to-candidates contract"
    - "personal lean-mode capacity such as subscriptions, free tiers, local machines and VPS resources remains poorly visible to scheduling"
  targets:
    - "JeanHuguesRobert/operium:research/federated-capacity-registry.md"
    - "JeanHuguesRobert/operium:catalogue / ONA capacity advertisements, after schema inventory"
    - "JeanHuguesRobert/inseme:packet requirements / scheduler / Packet Attractor integration, after Operium declaration shape stabilizes"
    - "JeanHuguesRobert/inseme:research/cogentia_accounting_architecture.md for analytical projection links only"
    - "JeanHuguesRobert/cogentia:research/memory_and_corpus_sleep_cycle.md for residual-capacity consumption only"
  expected_effects:
    - "Operium is the operational authority/projection layer for available capacities; Cogentia does not create a competing central capacity registry"
    - "each node/provider/source remains authoritative for the capacity facts it legitimately declares or measures"
    - "global capacity views are federated projections with freshness, provenance, confidence/measurement status and visibility"
    - "capacity descriptions may include access mode, quota, fixed/marginal cost, availability, automation, jurisdiction, privacy/security and preemptibility where material"
    - "Cognitive Packets express requirements; Operium returns candidate capacities; capability does not imply authority"
    - "actual consumption remains packet-local and projects into analytical accounting"
    - "lean-mode scheduling may prefer already-paid/free/prepaid admissible capacity before new purchase when total cost including attention and risk justifies it"
    - "Sleep/background work may consume qualified residual capacity only under explicit mandate and bounded budget"
    - "capacity-state changes may make previously blocked propagation/background packets admissible for reevaluation"
  priority: high
  confidence: high
  propagation_level: 2
  evidence_refs:
    - "Operium ONA: slow catalogue, fast blackboard, node-local hot projections; Git registry remains durable truth"
    - "Cogentia Accounting Architecture: packet/treatment-level imputation and multidimensional analytical views"
    - "packet strict accounting: source spend facts remain packet-local; consolidated spend is a projection"
  blockers:
    - "actual quotas and subscription entitlements are provider-specific and may be difficult to measure automatically"
    - "subscription UI capacity must not be confused with API-automatable capacity"
    - "the existing Operium catalogue/ONA capacity fields must be inventoried before freezing a new schema"
  next_action: "Inventory existing Operium catalogue and ONA capacity fields; dogfood a read-only JHR capacity inventory; then define the smallest requirements-to-candidates bridge with COP."
  verification:
    status: planned
    evidence_refs:
      - "operium/research/federated-capacity-registry.md created 2026-08-16"
  notes: >-
    Architectural correction after R58: the earlier candidate direction of
    extending Cogentia capabilityRegistry as the federated capacity authority was
    too centralizing and duplicated Operium's established role. capabilityRegistry
    may remain a local/runtime matching primitive, but Operium owns the federated
    operational view.
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
