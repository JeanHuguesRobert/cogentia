---
title: "FractaCalendar & COP Integration for Corpus Periodic Workloads"
description: "Specification and operational guide for registering Cogentia background tasks into FractaCalendar via COP wake packets."
layout: default
nav_order: 9
date: 2026-09-01T00:00:00.000Z
last_modified_at: 2026-11-28T00:00:00.000Z
license: CC BY-SA 4.0
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/fracta-calendar-integration.md
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

# FractaCalendar & COP Integration for Corpus Periodic Workloads

This document outlines how Cogentia's background and periodic workloads (**Corpus Sleep Cycle**, **FractaScheduler**, and **Weekly Sunday Consolidation**) integrate with **FractaCalendar** and the **COP (Cognitive Orientation Protocol) wake architecture** (`operium#29`, `operium#31`, `operium#38`, `operium#40`, `operium#41`).

---

## 1. Principles & COP Compliance

In accordance with the FractaCalendar and COP doctrine (`operium/docs/calendar-cop-wake-protocol.md`):

1. **Projection vs Execution**: FractaCalendar is a **federated, governed projection** (`schema: operium.calendar.projection.v1`), not an un-governed runner or competing scheduler. It explains obligations through replay (`cop_events`) without becoming a secondary source of truth.
2. **`capable != authorized`**: Observing or projecting an obligation in FractaCalendar never grants an implicit mandate (`authorized: false`).
3. **One Executor**: The `source_of_truth` explicitly identifies the authoritative executor (`systemd:cogentia-sleep-cycle.timer`, `cop/node.wake.v1:...`).
4. **Packet-Shaped Delivery**: Temporal triggers deliver Cognitive Packets (`artifact_type: cop/cognitive-packet` with `packet_kind: observation` or `packet_kind: continuation`).
5. **No Domain CLI Growth**: Scheduling uses generic `cop/node.wake.v1` packets rather than inventing domain-specific CLI verbs.

---

## 2. Declared Obligations

The three periodic corpus workloads are declared as COP wake packets in [`deploy/fracta/calendar/`](file:///C:/tweesic/cogentia/deploy/fracta/calendar/):

| Workload | Obligation ID | Work Kind | Packet Kind | Cadence | Sched. / Execution Anchor |
|---|---|---|---|---|---|
| **Corpus Sleep Cycle** | `cogentia:sleep-cycle` | `corpus.sleep_cycle` | `observation` | Every 2h (`7200000ms`) | `systemd/cogentia-sleep-cycle.timer` |
| **FractaScheduler** | `cogentia:fracta-scheduler` | `corpus.fracta_scheduler` | `observation` | Daily at 03:00 UTC (`86400000ms`) | `systemd/fracta-scheduler.timer` |
| **Weekly Consolidation** | `cogentia:consolidation` | `corpus.consolidation` | `continuation` | Weekly Sun at 04:00 UTC (`604800000ms`) | `systemd/cogentia-consolidation.timer` |

---

## 3. Wake Packets Specification

### A. Corpus Sleep Cycle (`cop-wake.corpus-sleep-cycle.json`)
```json
{
  "id": "cop:wake:cogentia:sleep-cycle",
  "packet_type": "cop/node.wake.v1",
  "artifact_type": "cop/cognitive-packet",
  "payload": {
    "schema": "cop/node.wake.v1",
    "due_at": null,
    "cadence": { "kind": "interval", "interval_ms": 7200000 },
    "stop_condition": { "type": "none" },
    "authorized": false,
    "packet": {
      "envelope": {
        "packet_kind": "observation",
        "transmission_mode": "copy",
        "status": "active"
      },
      "payload": {
        "id": "cogentia:sleep-cycle",
        "kind": "corpus.sleep_cycle",
        "service": "cogentia",
        "project": "cogentia",
        "scope": "corpus",
        "target_node": "resource://fracta2",
        "owner_or_mandate": "corpus.sleep-cycle",
        "priority": "low",
        "interruptible": true,
        "budget": { "max_wall_time_ms": 60000, "max_pairs": 50 }
      }
    }
  }
}
```

### B. FractaScheduler Nightly (`cop-wake.fracta-scheduler.json`)
```json
{
  "id": "cop:wake:cogentia:fracta-scheduler",
  "packet_type": "cop/node.wake.v1",
  "artifact_type": "cop/cognitive-packet",
  "payload": {
    "schema": "cop/node.wake.v1",
    "due_at": null,
    "cadence": { "kind": "interval", "interval_ms": 86400000 },
    "stop_condition": { "type": "none" },
    "authorized": false,
    "packet": {
      "envelope": {
        "packet_kind": "observation",
        "transmission_mode": "copy",
        "status": "active"
      },
      "payload": {
        "id": "cogentia:fracta-scheduler",
        "kind": "corpus.fracta_scheduler",
        "service": "cogentia",
        "project": "cogentia",
        "scope": "corpus",
        "target_node": "resource://fracta2",
        "owner_or_mandate": "corpus.scheduler",
        "priority": "normal",
        "interruptible": false
      }
    }
  }
}
```

### C. Weekly Consolidation (`cop-wake.corpus-consolidation.json`)
```json
{
  "id": "cop:wake:cogentia:consolidation",
  "packet_type": "cop/node.wake.v1",
  "artifact_type": "cop/cognitive-packet",
  "payload": {
    "schema": "cop/node.wake.v1",
    "due_at": null,
    "cadence": { "kind": "interval", "interval_ms": 604800000 },
    "stop_condition": { "type": "none" },
    "authorized": false,
    "packet": {
      "envelope": {
        "packet_kind": "continuation",
        "transmission_mode": "copy",
        "status": "active"
      },
      "payload": {
        "id": "cogentia:consolidation",
        "kind": "corpus.consolidation",
        "service": "cogentia",
        "project": "cogentia",
        "scope": "corpus",
        "target_node": "resource://fracta2",
        "owner_or_mandate": "corpus.consolidation",
        "priority": "normal",
        "interruptible": false
      }
    }
  }
}
```

---

## 4. Operational Commands on Fracta Nodes

### Inspect FractaCalendar Projection
```bash
# View JSON projection of temporal obligations
operium calendar list --service cogentia

# View human-readable summary
operium calendar list --human

# View RFC 5545 iCalendar (ICS) projection (with X-OPERIUM-NOT-EXECUTOR:1)
operium calendar ics --service cogentia
```

### Schedule / Synchronize Wake Packets
```bash
operium calendar schedule --file deploy/fracta/calendar/cop-wake.corpus-sleep-cycle.json
operium calendar schedule --file deploy/fracta/calendar/cop-wake.fracta-scheduler.json
operium calendar schedule --file deploy/fracta/calendar/cop-wake.corpus-consolidation.json
```

---

## 5. General-purpose scheduled work — proposed requirements (2026-11-28)

**Status:** design proposal by the conversational agent, following the Principal's request to generalize the useful ChatGPT scheduled-task experience across Cogentia, particularly its MCP and coding-agent/Inox surfaces. No implementation, commission, grant, migration or deployment follows from this document alone.

### 5.1 User contract

One can request future work in natural language or structured form, inspect the resolved specification, obtain a durable reference, and list, inspect, amend, pause, resume, cancel or manually request a run (within the same authority checks). A task may be one-shot, calendar-recurring (timezone and civil-time semantics), relative to an event, conditional on an observed state, or opportunistic on qualified residual capacity. A condition may use a deterministic predicate or a bounded judgment handler; an external event source needs an explicit adapter, otherwise bounded polling with a known cadence is valid. Support quiet delivery when nothing materially changes, with a durable observation receipt rather than falsely claiming no run. Human approval is needed only for genuinely new decisions or applicable authority gates, not each ordinary occurrence.

Every work item, including recurring and event-triggered work, has a temporal review boundary as requested by the Principal. Distinguish earliest/due time, acceptable lateness/deadline, execution timeout, mandate validity, and relevance review/stop condition. No infinite implicit obligation. Choose proportionate horizons; crossing a review boundary triggers a relevance decision, not necessarily a human interruption or automatic deletion. Renewal is attributable and remains within mandate. A missed occurrence has an explicit policy: skip, coalesce, catch up within a bounded limit, or escalate when time-sensitive; no unbounded backlog or duplicate notification. Specify overlap handling and DST behavior. A clock or event never grants authority.

### 5.2 One canonical work contract

Reuse the existing COP work/continuation and wake objects; the following is a semantic checklist, not a new wire schema. Identity, principal and commissioning actor, scope/visibility, objective and acceptance criteria, packet or handler/capability reference, input and version/revision strategy, trigger and temporal bounds, priority/locality/preemption, mandate and bounded native resource budgets per run and cumulatively, stop/review and recovery policy, delivery contract, and idempotency identity per occurrence. Prefer a named capability, pinned artifact or intentionally latest reviewed source to an opaque vendor prompt. At the first run and each recurrence, resolve current mandate/revocation, eligibility, budget, relevance, capability and policy independently of wake creation. Read-only tasks and tasks with effects share the same core; effect authorization remains separate.

A plan/series is distinct from each occurrence/job and its child packets or continuations. Each occurrence has its own receipt, outcome, actual costs, residual obligations and delivery state. Record admitted/claimed, running, suspended, completed/failed, cancelled, obsolete or needs-reconciliation as appropriate; distinguish schedule lifecycle from execution and delivery lifecycle. Use existing COP events and projections with optimistic revisions, claims, correlation and idempotency. Do not promise exactly-once effects across arbitrary external providers: on uncertain effect, reconcile instead of blind replay. History survives pause/cancel and restart; no secret or unrestricted prompt leakage in logs. FractaCalendar projects due times, status and links; it neither owns an additional authoritative schedule nor executes because an item appears in an agenda.

### 5.3 Architecture and surfaces

Reuse [Operium calendar capabilities](https://github.com/JeanHuguesRobert/operium/blob/main/lib/calendar-capabilities.js), [wake protocol](https://github.com/JeanHuguesRobert/operium/blob/main/docs/calendar-cop-wake-protocol.md), [COPJobScheduler](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-kernel/src/jobScheduler.js), COPScheduler, EventStore claims, and the existing delivery/continuation machinery. A clock tick is not a packet and cannot itself mutate COP; its governed wake event delivers work. ONA may supply the durable temporal wake; COP admits/routes the work to a deterministic program, Inox, cognitive handler or human. Determine the single execution owner for each obligation; existing systemd timers remain valid backends. Never install a second executor for the same series. FractaScheduler can pull admitted work where configured, not mint authority.

Source audit: Operium has schedule/list/tick/resolve/ICS capabilities, while Cogentia MCP exposes private read `operium_calendar_list`; the generic lifecycle mutation surface and arbitrary cognitive-handler dispatch must be established and tested, not inferred from an existing calendar entry. COPJobScheduler has an in-process jobs projection and delay/backoff/resume paths; recurring civil-time/cron is not demonstrated by the source's future cron parameter. The MCP Tasks/COP scheduling pilot handles deferred execution/resumption of individual MCP requests; it is complementary to, not a synonym for, durable future/recurring commissioned work. Reuse it where appropriate for an occurrence; do not duplicate its state.

Expose the same contract through MCP, CLI (JSON input/output, inspectable human view), authenticated HTTP/API, and Web/FractaCalendar views. Generic lifecycle capabilities (proposed names): `task.schedule`, `task.list`, `task.get`, `task.update`, `task.pause`, `task.resume`, `task.cancel`, `task.run_now`, `task.history`, `task.result`. Resolve naming and existing operations before adding tools; do not create a CLI verb per application. Separate read and governed mutation, use standard MCP discovery and typed schemas, return durable IDs and receipts, explain refusal and available continuation. The MCP server must not be required to remain connected while work waits. Human-facing natural language maps to the same structured contract, not a hidden second scheduler.

Coding agents need a local callable library or CLI in addition to MCP; no mandatory conversation, no browser dependence. For Inox first expose a small script-level binding via the existing JS interop or generic CLI transport using named values/structured JSON and typed errors; retain deterministic noninteractive behavior and standard exit status. Later native Inox/L9 tasks, actors and reactive sets may schedule or subscribe to wakes through the same semantic capability, with explicit suspension/resumption and packet references. Do not require a particular host language or turn an Inox in-memory timer into a durable obligation. A scheduled Inox program is a handler/artifact, not an arbitrary privileged shell string.

### 5.4 Delivery and acceptance

A run produces a result with an explicit recipient and delivery contract (existing conversation, Packet return, result link, artifact or permitted notification); recipient may be an agent or program. Support pulling history/results as well as a governed notification or event subscription; failure to deliver must not cause blind rerun of completed work. One recurring series may produce many deliveries; use existing COP return/receipt semantics. Preserve ownership independent of the model/provider and allow handler substitution. Record useful results, learning and avoidable friction when material; do not manufacture net-value figures or add reporting rituals.

Smallest useful Reality Test: schedule a single bounded future read-only job via MCP, close the creating session, observe the actual wake and governed dispatch on Fracta2, obtain a persisted result via CLI or Inox, inspect history and cancel/revoke an additional pending occurrence before it starts. Then prove a short finite recurring series, a condition that closes, temporal review, restart/duplicate trigger reconciliation, and a rejected out-of-mandate request. A coding-agent consumer should schedule a tiny Inox read-only test and consume its result without ChatGPT. Test timezone/DST, missed/overlapping occurrences, budget/expiry/revocation, failed delivery and ambiguous external effects before claiming generic readiness. Reuse the existing [Operium #40](https://github.com/JeanHuguesRobert/operium/issues/40) work and MCP/COP pilot; reconcile their current code rather than blindly implementing historical issue checklists.

The morning briefing is the first useful end-to-end application after this proof: observation-only, existing Sleep Cycle and Git/COP evidence, daily 07:00 Europe/Paris, explicit horizon/review, model-substitutable synthesis and delivery to the Principal. Initially run an isolated comparison without replacing or duplicating the active OpenAI delivery. Migrate ownership only after a verified Cogentia-produced briefing and a separate deliberate switchover. The existing ChatGPT task is a working reference, not an execution backend to assume callable from Cogentia.

