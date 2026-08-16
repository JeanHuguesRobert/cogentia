---
title: "Propagation Register"
subtitle: "Provider-neutral backlog of pending corpus propagations"
author: "Jean Hugues Noël Robert"
repository: "cogentia"
status: "working source — operational registry"
version: "0.4"
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
  - "docs/corpus-responsibility-contract.md"
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
  status: propagated
  discovered_at: 2026-08-16
  source_refs:
    - "inseme/packages/cop-kernel/docs/packet-strict-accounting-cascade.md"
    - "conversation checkpoint R55"
  source_summary: >-
    Packet-strict accounting already converged on packet-local source facts and
    higher-level projections. The same source/projection discipline applies to
    packet-borne FractaLog traces: the Cognitive Packet carries or directly
    references source trace facts; higher-level FractaLog views federate them.
  completed_targets:
    - "inseme/research/cop_fractalog_profile.md v0.2 — commit 459cc65a533309888648220b2ac92edac9d9a6fd"
    - "FractaVolta/research/fractalog.md v0.2 — commit 5000997a61ae6a72e9b20edf431b50a13d7b0340"
    - "inseme/research/cop_mission_stigmergy_exploration.md — commit fbb61ee22c906dd3582e4691ae8910bc565f6fb1"
  expected_effects:
    - "packet-local trace facts are preferred source location for packet-borne acts"
    - "higher FractaLog views are projections/federations, not duplicated mutable source ledgers"
    - "append-only, custody, privacy, delayed-transparency and mandate-trace semantics remain intact"
    - "content-addressed references remain valid packet-local representations for non-inline evidence"
  priority: high
  confidence: high
  propagation_level: 2
  blockers: []
  next_action: "Add/replay a source-vs-projection FractaLog regression scenario in the existing COP bac-a-sable, then move to verified only on observed PASS."
  verification:
    status: planned
    evidence_refs:
      - "inseme/sandbox/cop-continuation-bac-a-sable"
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
    - "operium/research/federated-capacity-registry.responsibility.yaml"
  blockers:
    - "provider-specific quotas and entitlements may be difficult to measure"
    - "subscription UI capacity must not be confused with API-automatable capacity"
    - "existing Operium fields must be inventoried before schema freeze"
  next_action: "Dogfood a read-only JHR capacity inventory, then define the smallest requirements-to-candidates bridge with COP."
  verification:
    status: planned
    evidence_refs: []
```

### PR-2026-003 — Corpus Responsibility Map, freshness and routing regressions

```yaml
propagation:
  id: PR-2026-003
  status: propagation_in_progress
  discovered_at: 2026-08-16
  source_refs:
    - "JeanHuguesRobert/research/corpus-map.md"
    - "cogentia/research/index.md"
    - "cogentia/research/concepts.md"
    - "conversation checkpoints R63-R68"
  source_summary: >-
    The Corpus already has a coarse human-facing repository map and strong document/concept
    indexing, but architectural responsibility, authority boundaries and canonical experimental
    surfaces are not represented precisely enough for cold handlers. This caused a concrete
    navigation failure: proposing a new COP sandbox before discovering the existing canonical one.
  observed_gap:
    - "corpus-map.md is coarse and curated rather than a typed responsibility graph"
    - "research/index.md and concepts.md freshness is not reliably represented by their frontmatter timestamps"
    - "cogentia.js indexes documents and concepts but has no first-class responsibility relation vocabulary"
    - "no permanent routing regression previously asserted COP behavioral testing -> existing Inseme sandbox"
  completed_targets:
    - "cogentia/docs/corpus-responsibility-contract.md — typed relation contract"
    - "inseme/sandbox/cop-continuation-bac-a-sable/cop-testing.responsibility.yaml — distributed source claim"
    - "operium/research/federated-capacity-registry.responsibility.yaml — distributed source/boundary claims"
    - "cogentia/scripts/corpus-responsibilities.js — read-only list/check/route/freshness bootstrap"
    - "cogentia/scripts/responsibility-routing-regressions.yaml — permanent routing expectations"
    - "cogentia/scripts/test-corpus-responsibilities.js — multi-repo regression runner with explicit skip on incomplete workspace"
  expected_effects:
    - "cold handlers can ask where a responsibility lives instead of relying on private memory"
    - "responsibility claims remain local to legitimate source owners; global maps are projections"
    - "ambiguous responsibility claims are surfaced rather than silently resolved"
    - "negative must_not_duplicate boundaries become machine-readable"
    - "index/concepts freshness can be compared to Git source activity rather than trusting metadata timestamps"
    - "COP behavioral tests route to inseme/sandbox/cop-continuation-bac-a-sable"
    - "federated capacity operational authority routes to Operium"
  priority: high
  confidence: high
  propagation_level: 2
  evidence_refs:
    - "cogentia commit 046cb9d336da4696e7199d5b47b3d65cc46c50e6"
    - "inseme commit 4b48e2bb67da08c6adff424428cbaf2ffe533a98"
    - "operium commit 81e248919ccc9e171f437c6b92c5d93be9ed565d"
    - "cogentia commit 4c966366eb3e91c5958e1cc8b54164e0041e0dee"
    - "cogentia commit 39c14186435522ca9116bbfa52cbff294846f279"
    - "cogentia commit 1e72a08118bdc5577935c51120635e81056b355f"
  blockers:
    - "bootstrap scanner is not yet wired as first-class cogentia.js responsibilities commands"
    - "corpus plan/apply/verify does not yet generate a responsibility projection"
    - "freshness check is intentionally coarse and should later use registry-aware relevance rather than all research activity"
  next_action: "Wire the bootstrap into cogentia.js as responsibilities list/check/route/freshness, then expose a generated responsibility view through corpus plan/apply/verify without semantic inference."
  verification:
    status: planned
    evidence_refs:
      - "scripts/test-corpus-responsibilities.js"
      - "scripts/responsibility-routing-regressions.yaml"
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
