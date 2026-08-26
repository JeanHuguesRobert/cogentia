---
schema: cogentia.agent_skill/v1
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
entrypoint:
  command: "node scripts/cogentia.js scheduler run --mode sleep"
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
