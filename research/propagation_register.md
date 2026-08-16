---
title: "Propagation Register"
subtitle: "Provider-neutral backlog of pending corpus propagations"
author: "Jean Hugues Noël Robert"
repository: "cogentia"
status: "working source — operational registry"
version: "0.3"
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

This document is the provider-neutral working register of **pending corpus propagations**. It prevents the recurrent chain `local insight → local stabilization → incomplete propagation → later inconsistency / cognitive debt`.

The register is not doctrinal truth. Source truth remains in the act, packet, commit, review, issue, experiment or other evidence that created the propagation obligation. This register is a reconstructible operational projection.

> **Source facts stay where they are produced; propagation obligations are consolidated as projections until their expected effects have been verified.**

## State model

```text
discovered → propagation_needed → propagation_in_progress → propagated → verified
```

Additional states: `propagation_debt`, `quarantined`, `rejected`, `blocked`.

`propagated != verified`: behaviorally material changes require verification.

## Propagation levels

```text
0 = observe only
1 = suggested propagation
2 = prepared propagation / human approval expected
3 = whitelisted automatic projection only where explicitly authorized
```

The register itself grants no write authority.

## Sleep Cycle integration

The Corpus Sleep Cycle SHOULD inspect this register and related source traces to detect stale branches, debt, duplicates, contradictions and regressions; re-score candidates under bounded budgets; propose replay/regression and cold-handler tests; distinguish `observed`, `inferred`, `planned` and `tested`; and never claim an unexecuted test succeeded.

This is the provider-neutral substrate anticipated by `cogentia#58`; GitHub Issues/Kanban remain projections, not canonical state.

## Entries

### PR-2026-001 — FractaLog source facts should become packet-local

```yaml
propagation:
  id: PR-2026-001
  status: propagation_in_progress
  discovered_at: 2026-08-16
  source_refs:
    - "inseme/packages/cop-kernel/docs/packet-strict-accounting-cascade.md"
    - "conversation checkpoint R55"
  source_summary: >-
    Packet-strict accounting already converged on packet-local source facts and
    higher-level projections. The same source/projection discipline applies to
    packet-borne FractaLog traces: the Cognitive Packet carries or directly
    references source trace facts; higher-level FractaLog views federate them.
  observed_gap:
    - "FractaVolta/research/fractalog.md still primarily presents separate governed log objects"
    - "inseme/research/cop_mission_stigmergy_exploration.md still carries fractalogRef as if a Mission may own a separate source log"
  completed_targets:
    - "inseme/research/cop_fractalog_profile.md v0.2 now defines packet-local source traces and projection/federation semantics"
  targets:
    - "JeanHuguesRobert/FractaVolta:research/fractalog.md"
    - "JeanHuguesRobert/inseme:research/cop_mission_stigmergy_exploration.md"
  expected_effects:
    - "packet-local trace facts are preferred source location for packet-borne acts"
    - "higher FractaLog views are projections/federations, not duplicated mutable source ledgers"
    - "append-only, custody, privacy, delayed-transparency and mandate-trace semantics remain intact"
    - "content-addressed references remain valid packet-local representations for non-inline evidence"
  priority: high
  confidence: high
  propagation_level: 2
  evidence_refs:
    - "inseme commit 459cc65a533309888648220b2ac92edac9d9a6fd"
  blockers: []
  next_action: "Align FractaVolta fractalog.md and Mission stigmergy semantics, then add/replay a source-vs-projection regression fixture."
  verification:
    status: planned
    evidence_refs: []
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
    Operium owns the operational layers for capacity inventory: durable slow
    catalogue, fast volatile advertisements and node-local projections.
    Cogentia/COP expresses governed requirements, mandates, budgets and packet-local
    consumption; Operium federates available capacities.
  observed_gap:
    - "Operium declarations are not yet generic enough for heterogeneous compute/inference/subscription/free-tier capacities"
    - "COP requirements and Operium candidates lack a stabilized bridge"
    - "lean-mode personal capacity remains poorly visible to scheduling"
  targets:
    - "JeanHuguesRobert/operium:catalogue / ONA capacity advertisements after schema inventory"
    - "JeanHuguesRobert/inseme:requirements / scheduler / Packet Attractor bridge after declaration shape stabilizes"
    - "analytical accounting and Sleep Cycle projection links only"
  expected_effects:
    - "Operium owns the federated operational capacity view"
    - "local sources remain authoritative for legitimately declared/measured facts"
    - "global views carry freshness, provenance and measurement/confidence state"
    - "Cognitive Packets express requirements; Operium returns candidates; capability does not imply authority"
    - "actual consumption remains packet-local and projects into analytical accounting"
    - "lean-mode scheduling may prefer already-paid/free/prepaid admissible capacity when total cost justifies it"
    - "Sleep/background work consumes qualified residual capacity only under mandate and bounded budget"
  priority: high
  confidence: high
  propagation_level: 2
  evidence_refs:
    - "operium/research/federated-capacity-registry.md"
  blockers:
    - "provider-specific quotas and entitlements may be difficult to measure"
    - "subscription UI capacity must not be confused with API-automatable capacity"
    - "existing Operium fields must be inventoried before schema freeze"
  next_action: "Dogfood a read-only JHR capacity inventory, then define the smallest requirements-to-candidates bridge with COP."
  verification:
    status: planned
    evidence_refs: []
```

## Operational discipline

A propagation SHOULD close as `verified`, not merely `propagated`, when its expected effect is behaviorally material. Operational learning SHOULD carry an appropriate regression case; network-level learning SHOULD use cold-handler/substitution testing when feasible. A local gain that breaks a previously validated case creates new cognitive-regression debt.

## Relationship to work tracking

```text
canonical propagation intelligence
!= GitHub Issues
!= one Kanban board
!= one provider UI
```

This Markdown/YAML registry is a minimal inspectable bootstrap and may later be represented as structured packets or another provider-neutral work-state substrate.
