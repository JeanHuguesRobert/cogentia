---
title: "RT-TTP-002 — Next Live Trace"
description: "Prospective Reality Test template for opening a Trace Treatment Packet at the moment the next materially independent trace arrives in an active Living Publication."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-09-30"
last_modified_at: "2026-09-30"
version: "0.1"
status: "armed prospective reality test"
license: "CC BY-SA 4.0"
language: "en"
document_role: "reality-test"
document_kind: "experiment-protocol"
visibility: "public"
lifecycle_state: "armed"
update_policy: "UP-DEFAULT-REVIEWED"
related_documents:
  - "../../trace_treatment_packet.md"
review:
  status: "unreviewed"
  reviewed_by: []
---

# RT-TTP-002 — Next Live Trace

## Purpose

Test the profile prospectively, rather than reconstructing it after successful work.

The test activates on the next **materially independent new trace** encountered in an active Living Publication such as *Suicide Corse* or *Rise & Fall*.

A trace does not qualify merely because it is new. It qualifies when its treatment can usefully be resumed, routed, contradicted, branched, propagated, authorized, or closed independently.

## Start packet

Use no more structure than this at admission:

```yaml
packet_kind: trace-treatment
trace:
  ref: ...
  origin: ...
question: "What, if anything, does this trace change?"
state:
  qualification: pending
next_action: inspect
```

Do not fill absent fields with guesses.

## Required observations during treatment

Record only when they become material:

- direct observations;
- reported statements;
- inferences;
- live alternatives or contradictions;
- tests performed;
- downstream work spawned;
- semantic dependents inspected;
- human judgment boundaries encountered;
- closure reason.

## Acceptance questions

At closure or suspension, answer:

1. Did Packet identity save context or enable a clean continuation?
2. Did it preserve a distinction that ordinary prose might have blurred?
3. Did it help find a contradiction, dependent, or open question?
4. Could a cold handler continue from the Packet and referenced Corpus?
5. What structure was never used?
6. What useful structure was missing?
7. Was Packet creation itself a noticeable friction?
8. Would inline treatment have been simpler without losing material guarantees?

## Stop condition

The test is not required to reach truth. It reaches a result when the trace treatment is:

```text
closed
or
suspended at an explicit resumable frontier
```

## Anti-overfit rule

Do not select an artificially convenient trace merely to make the profile succeed. The **next naturally qualifying trace** is the test input.

## Current status

`ARMED`.

No runtime automation is implied. A human or agent may instantiate the profile manually using Markdown, a GitHub Issue, or another existing Cognitive Packet carrier.
