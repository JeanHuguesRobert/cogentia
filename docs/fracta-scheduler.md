---
title: "FractaScheduler — Multi-Level Distributed Corpus Sleep Cycle"
description: "Architecture, CLI, MCP tools, and systemd automation for autonomous corpus maintenance and sleep cycle consolidation."
layout: default
nav_order: 8
date: 2026-08-26T00:00:00.000Z
last_modified_at: 2026-08-26T00:00:00.000Z
license: CC BY-SA 4.0
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/fracta-scheduler.md
document_role: operational
document_kind: documentation
visibility: public
lifecycle_state: active
author: "Jean Hugues Noël Robert, baron Mariani"
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "high"
---

# FractaScheduler

The **FractaScheduler** is the multi-level, distributed scheduling and maintenance engine of the Living Corpus (JHN Architecture).

It operationalizes the **Corpus Sleep Cycle**, automating convergence, issue ingestion, semantic mutation audits, continuation hygiene, and Views Store exports without requiring manual human oversight.

---

## 1. Principles & Measured Risk

FractaScheduler operates strictly under the **Measured Risk doctrine** (`research/measured_risk.md`):

* **Bounded Exposure**: Operations run locally in the Git sandbox and memory cache.
* **100% Recovery Paths**: Reversible state, deterministic tests, and immutable issue packets.
* **Attention Preservation**: Background agents do not interrupt humans with permission questions.
* **Boundary Escalation**: If an unrecoverable violation or hard authority boundary is crossed (e.g. blocking semantic mutation), the scheduler records a structured escalation rather than failing silently or hallucinating fixes.

---

## 2. The 6 Deterministic Stages

Each FractaScheduler run executes the following stages in sequence:

```text
1. corpus_convergence      -> Reach fixed-point across all 20 tracked repositories
2. semantic_mutation_audit -> Audit 1,850+ markdown docs against update policies
3. issues_sync             -> Ingest GitHub issues into immutable .cogentia/issues/ packets
4. continuations_hygiene   -> Maintain and count active continuation backlogs
5. views_export            -> Generate corpus-state.md, corpus-state.json and Views snapshot
6. git_hygiene_audit       -> Verify uncommitted/dirty states across the 20 repositories
```

---

## 3. Interfaces

### CLI Commands

```bash
# Check scheduler status, system load, and active signals
node scripts/cogentia.js scheduler status

# Run an autonomous maintenance cycle
node scripts/cogentia.js scheduler run --mode sleep

# Quick dry-run cycle
node scripts/cogentia.js scheduler run --mode quick --dry-run --json
```

### HTTP Daemon Routes

* `GET /api/cli/scheduler/status` : Returns current load, recommended mode, and corpus signals.
* `GET /api/cli/scheduler/run?mode=sleep&dryRun=false` : Triggers a maintenance cycle.

### MCP Tools

* `cogentia_scheduler_status` : Inspects load and running state from an agent session.
* `cogentia_scheduler_run` : Launches an autonomous cycle under an agent mandate.

### Agent Skill

* Declarative package at `skills/fracta-scheduler/SKILL.md` (`schema: cogentia.agent_skill/v1`).

---

## 4. Production Deployment (Operium / Systemd)

On the Fracta VPS, FractaScheduler is managed by systemd:

* **Service**: `systemd/fracta-scheduler.service`
* **Timer**: `systemd/fracta-scheduler.timer` (triggers daily at 03:00 UTC).
