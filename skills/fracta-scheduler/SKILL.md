---
schema: cogentia.agent_skill/v1
id: cogentia.fracta-scheduler
status: "working-paper — experimental"
name: fracta-scheduler
version: "0.1.0"
title: "FractaScheduler — Multi-level Distributed Corpus Sleep Cycle"
description: "Autonomous scheduling engine for background maintenance, convergence, mutation audits, and Views Store exports under Measured Risk."
governance_tier: operational
requires_lockers:
  - public:read
  - public:write
capabilities_provided:
  - scheduler.run-cycle
  - scheduler.status
  - corpus.sleep-cycle
tools:
  - cogentia_scheduler_status
  - cogentia_scheduler_run
effects: governed_write
sources:
  - docs/fracta-scheduler.md
  - scripts/lib/fracta-scheduler.js
  - scripts/check-fracta-scheduler.js
entrypoint:
  command: "node scripts/cogentia.js scheduler run --mode sleep"
author: unknown
affiliation: unknown
date: null
last_modified_at: "2026-10-27"
license: CC BY-SA 4.0
language: en
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: unknown
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
document_role: "operational"
document_kind: "documentation"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "skill-procedure"
classification_confidence: "strong"
---

# FractaScheduler

The **FractaScheduler** coordinates the autonomous background life of the Living Corpus.

## Core Invariants

1. **Measured Risk**: Runs within a bounded blast radius (local sandbox / Git).
2. **Deterministic Stages**:
   - `corpus_convergence` (reach fixed point).
   - `semantic_mutation_audit` (detect drift against update policies).
   - `issues_sync` (materialize issue packets under `.cogentia/issues/`).
   - `continuations_maintenance` (count and garbage collect closed continuations).
   - `views_export` (export `corpus-state.md` and views snapshot).
   - `git_hygiene_audit` (verify clean repositories).
3. **Escalations**: Interrupts human via Continuations only if an unrecoverable hard boundary is crossed.
