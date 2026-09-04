---
title: "FractaCalendar & COP Integration for Corpus Periodic Workloads"
description: "Specification and operational guide for registering Cogentia background tasks into FractaCalendar via COP wake packets."
layout: default
nav_order: 9
date: 2026-09-01T00:00:00.000Z
last_modified_at: 2026-09-01T00:00:00.000Z
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
