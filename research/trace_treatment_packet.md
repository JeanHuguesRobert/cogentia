---
title: "Trace Treatment Packet"
subtitle: "Experimental Cognitive Packet profile for processing new traces with progressive rigor"
description: "Experimental method profile: a raw trace is not automatically a Cognitive Packet; the independent cognitive work opened by a trace may be packetized when it benefits from routing, resumption, contradiction, authorization, branching, propagation or closure."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-09-30"
last_modified_at: "2026-09-30"
version: "0.1"
status: "experimental working note"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "method-profile"
visibility: "public"
lifecycle_state: "experimental"
update_policy: "UP-DEFAULT-REVIEWED"
related_documents:
  - "research/cognitive_packets.md"
  - "research/cognitive_packet_closure_and_packet_native_semantics.md"
  - "research/interroger_le_reel.md"
  - "research/semantic_propagation_rule.md"
  - "patterns/packet-backed-projection/PATTERN.md"
review:
  status: "unreviewed"
  reviewed_by: []
---

# Trace Treatment Packet

## 1. Status and non-claim

This note defines an **experimental profile** of the existing Cognitive Packet pattern. It does **not** add a new primitive to Cognitive Packets, COP, Fractanet, or `cogentia.js`.

The motivating distinction is:

```text
TRACE
= something received or observed from Reality

TRACE TREATMENT PACKET
= independently resumable cognitive work opened by that trace
```

A trace is not made true, important, or canonical because it is packetized.

> **Packetization improves traceability and resumability; it does not replace epistemology.**

The existing Cognitive Packet rule remains applicable:

> **self-describing ≠ self-validating.**

## 2. Packetization threshold

Do **not** create one Packet per trace.

A Trace Treatment Packet deserves independent identity when the work opened by the trace can usefully be handled independently in at least one of these dimensions:

```text
routing
resumption
authorization
contradiction / review
branching
retry
return
reuse
archival value
semantic propagation
closure
```

A trivial trace may be qualified inline. Several related traces may belong to one Packet. A large artifact may remain an external reference inside the closure of one Packet.

Working rule:

> **Packetize the treatment when the treatment becomes an independent unit of cognitive work.**

## 3. Progressive rigor

The Packet SHOULD begin with the smallest useful state and acquire structure only when epistemic consequence requires it.

Minimal candidate:

```yaml
packet_kind: trace-treatment
trace:
  ref: ...
question: "What, if anything, does this trace change?"
state:
  qualification: pending
next_action: inspect
```

A consequential case may later materialize:

```yaml
qualification:
  observed: []
  reported: []
  inferred: []
  unknown: []

relations: []
tests: []
effects: []
open: []

closure:
  status: open
```

Principle:

> **Preserve provenance immediately; formalize progressively.**

Candidate proportionality rule:

```text
required_structure ∝ epistemic consequence
```

This is a heuristic, not a numerical law.

## 4. Default lifecycle

```text
TRACE
  ↓
ADMIT
  ↓
QUALIFY
  ↓
RELATE
  ↓
TEST
  ↓
DISPOSE
  ↓
PROPAGATE
  ↓
CLOSE
```

### ADMIT
Identify the trace, its origin, acquisition time when known, access conditions, and stable reference when available.

### QUALIFY
Separate, at minimum when material:

```text
direct observation
reported statement / testimony
source assertion
inference
hypothesis
contradiction
unknown
```

### RELATE
Link the trace to the smallest useful neighborhood: concept, person, Reality Case, chronology, hypothesis, interaction, source, project, or existing Packet.

### TEST
Ask only what is needed to discriminate materially among live interpretations. Tests may include source retrieval, independent corroboration, adverse search, a probe addressed to Reality, or domain review.

### DISPOSE
Possible local dispositions include:

```text
ignore_as_non_material
hold
integrate
correct
contradict
open_hypothesis
open_probe
open_investigation
escalate_for_judgment
```

### PROPAGATE
If the trace materially changes a source meaning, conclusion, status, or public representation, apply the Semantic Propagation Rule. A dependency hit means inspect, not rewrite.

### CLOSE
Close the Packet when the work opened by **this trace treatment** has reached an explicit resumable frontier.

```text
packet_closed ≠ ultimate_truth_established
```

A Packet may close while a downstream hypothesis, investigation, or Reality Case remains open.

## 5. Fractal composition

A Trace Treatment Packet MAY create or reference downstream work when the branch deserves independent handling:

```text
Trace Treatment Packet
    ├── Hypothesis Packet
    ├── Objection / Review Packet
    ├── Probe Packet
    ├── Interaction Packet
    ├── Semantic Propagation Packet
    └── Act-preparation Packet
```

Do not duplicate rich source material merely to make a Packet large. Use referential or materializable closure where the handler environment can reliably resolve it.

Authority lineage and semantic relations MUST remain conceptually distinct.

## 6. Human / AI boundary

AI handlers may, within mandate:

- retrieve and compare sources;
- qualify candidate observations;
- propose competing hypotheses;
- search for adverse evidence;
- identify semantic dependents;
- prepare propagation;
- draft an Act;
- prepare a closure.

Human judgment remains required where an existing mandate, rights, privacy, risk, legal, reputational, doctrinal, publication, or external-side-effect boundary requires it.

For public contributions prepared through a conversational Guide:

```text
Guide
→ draft / preparation
→ human review
→ human email or GitHub contribution
→ external trace
→ intake / qualification
→ possible Corpus integration
```

Invariant:

> **A prepared contribution is not an executed contribution; assistance must not erase the imputability of the human Act.**

## 7. Anti-bureaucracy rules

The experiment fails if Packet structure becomes more expensive than the epistemic risk it controls.

Therefore:

1. no mandatory large schema for low-consequence traces;
2. no duplicate recording of metadata already supplied reliably by Git, GitHub, email, or the source artifact;
3. no new durable Packet when inline treatment remains sufficient;
4. no new Packet kind when an existing Packet/Interaction/Continuation already carries the work adequately;
5. no database, runtime, API or ontology change until repeated Reality Tests demonstrate a real need;
6. prefer references over copying when closure remains valid;
7. preserve the raw trace even when derived projections are simplified.

Candidate operational maxim:

> **Packetize early enough to preserve continuity; formalize only as much as the consequence requires.**

## 8. Gold-standard properties by construction

The profile seeks to make high research rigor emerge from ordinary handling:

| Property | Minimal packet contribution |
|---|---|
| provenance | stable trace reference + origin |
| auditability | explicit transformations and disposition |
| falsifiability | live alternatives / test when material |
| adverse review | contradiction or reviewer branch when warranted |
| reproducibility | retrievable inputs + declared transformations |
| versioning | Git / durable event history |
| epistemic calibration | observed / reported / inferred / unknown separation |
| imputability | actor / authority path for binding Acts |
| reversibility | preserve source and prior state |
| resumability | explicit frontier and next action |

## 9. Metrics

The first dogfood campaign SHOULD observe:

```text
friction
resumability
traceability
epistemic preservation
contradiction coverage
propagation completeness
packet overhead
closure quality
```

Candidate ratio:

```text
bureaucratic_ratio
=
effort spent documenting the method
/
effort spent learning something about Reality
```

The ratio is diagnostic, not a target to minimize at any epistemic cost.

## 10. Initial Reality Tests

1. **RT-TTP-001 — Tony Toma / Minesteggio**  
   Retrospective reconstruction of an already completed treatment.

2. **RT-TTP-002 — Next live trace**  
   Prospective blank test: instantiate the Packet when the next materially independent trace arrives in an active Living Publication.

3. **RT-TTP-003 — Rossignol field observation**  
   Cross-domain test using physical/field observation rather than primarily documentary material.

Acceptance direction:

> The profile is useful if it preserves or improves rigor, resumption, contradiction and propagation while adding little enough friction that handlers naturally keep using it.

## 11. Implementation stance

For now:

```text
Git
+ Markdown / YAML
+ GitHub Issues when durable continuation is useful
+ existing Cognitive Packet semantics
```

Not yet:

```text
new core schema
new database
new Packet runtime primitive
new API
mandatory universal ontology
```

**Dogfood first. Runtime later, if Reality justifies it.**
