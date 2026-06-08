---
title: "Cognitive Programming"
subtitle: "From Event-Driven Systems to Cognitive Packet Switching Networks"
version: "0.1.1"
status: "working-paper"
date: "2026-06-02"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
repository: "JeanHuguesRobert/cogentia"
intended_path: "research/cognitive_programming.md"
issue: "JeanHuguesRobert/cogentia#26"
license: "CC BY-SA 4.0"
language: "en"
tags:
  - cogentia
  - cognitive-programming
  - cognitive-packets
  - cognitive-packet-switching
  - cognitive-packet-switching-network
  - cop
  - inox
  - fractanet
  - continuations
  - traceability
  - map-and-territory
  - operational-cognition
related_documents:
  - "cogentia/research/cognitive_packets.md"
  - "cogentia/research/cognitive_packet_switching.md"
  - "cogentia/research/pipeline.md"
  - "cogentia/research/agent_resumable_cli.md"
  - "inseme/packages/cop-core/README.md"
  - "inseme/packages/cop-core/Architecture.md"
  - "FractaVolta/research/fractanet.md"
  - "FractaVolta/research/generalized_packet_networks.md"
  - "Inox/README.md"
changelog:
  - "v0.1 — initial source concept"
  - "v0.1.1 — added references and neighboring-work section"
---

# Cognitive Programming

## From Event-Driven Systems to Cognitive Packet Switching Networks

**Jean Hugues Noël Robert, baron Mariani**  
Institut Mariani / C.O.R.S.I.C.A.  
1 cours Paoli, F-20250 Corte, Corsica

*Working paper — v0.1.1 — June 2026*

---

## Object

This document introduces **Cognitive Programming** as a programming model for systems in which the primary unit of work is not only an instruction, function, object, event, signal, workflow step, or agent, but a **cognitive packet**.

A cognitive packet is a bounded unit of cognitive work carrying enough structure to be routed, resumed, criticized, transformed, executed, audited, archived, or reintegrated.

The purpose of cognitive programming is not merely to produce documents, prompts, traces, workflows, or agent conversations.

Its purpose is operational:

> **Cognitive Programming is the programming of traceable continuity between map and territory: cognitive packets carry theory into decision and action, actions produce effects, traces bring those effects back into the corpus, and the model is corrected accordingly.**

The theory is the map.  
The act is part of the territory.  
The trace is the bridge.  
The correction updates the map.

---

## Abstract

Most contemporary programming models remain organized around execution: procedural instructions, functional transformations, object interactions, event handlers, reactive propagation, workflow graphs, or agent orchestration.

These models remain useful. They are not obsolete.

However, AI-assisted work, human-in-the-loop systems, multi-agent coordination, institutional traceability, public governance, software automation, and field experimentation increasingly require something else: a durable, routable, inspectable, and resumable unit of cognitive work.

This paper calls that unit the **cognitive packet**.

Cognitive programming begins from the packet:

```text
packet → router → handler → packet
```

A cognitive packet has an envelope for routing and a payload for meaning. It may carry a continuation, decision, hypothesis, objection, task, failure, mandate, proof fragment, transformation request, or operational instruction.

In a cognitive programming system, agents are not the architecture. Agents are handlers. Models are replaceable. Tools are replaceable. Runtimes are replaceable. The durable structure is carried by packets, events, artifacts, continuations, traces, and the corpus or runtime substrate into which they are reintegrated.

Fractanet may therefore be described, with proper attribution and layer distinction, as a **Cognitive Packet Switching Network**: a distributed network in which cognitive work circulates as bounded, routable, resumable, auditable packets across humans, AI agents, tools, repositories, runtimes, edge nodes, and material operations.

---

## 1. Why another programming model?

Programming has repeatedly changed its primary unit.

Procedural programming centered the instruction.  
Functional programming centered the transformation.  
Object-oriented programming centered the object and message.  
Event-driven programming centered the event.  
Reactive programming centered propagation.  
Workflow systems centered the process graph.  
Agent frameworks center agents, tools, memory, and orchestration.

Cognitive programming centers another unit:

> **What must be transmitted so that the work can be correctly continued?**

This is not a minor implementation concern. It is becoming one of the central architectural questions of AI-era systems.

When work crosses boundaries between humans, AI agents, tools, repositories, legal procedures, public institutions, physical deployments, software runtimes, and long-term archives, the system must preserve more than a task label or a trace.

It must preserve:

- what is being worked on;
- what is already established;
- what has been decided;
- what remains assumed;
- what constraints must be preserved;
- what action is expected;
- what would count as incorrect resumption;
- what has been done;
- what effects have been observed;
- what must return to the model for correction.

This is the domain of cognitive programming.

---

## 2. Existing models and their limits

### 2.1 Procedural programming

Procedural programming asks:

> What instruction should run next?

This remains necessary. But it does not by itself preserve the cognitive state required to resume work across agents, tools, humans, and time.

### 2.2 Functional programming

Functional programming asks:

> What output follows from this input?

It provides clarity, composability, and referential discipline. But many cognitive operations are not pure transformations. They include judgment, uncertainty, authority, traceability, external effects, and correction.

### 2.3 Object-oriented programming

Object-oriented programming asks:

> Which object owns this state and behavior?

It is useful for encapsulation, but often mixes identity, authority, state, and behavior in ways that are not adequate for distributed human-AI cognition.

### 2.4 Event-driven programming

Event-driven programming asks:

> What happened, and who should handle it?

This is close to cognitive programming, but insufficient. An event records or announces something. It does not necessarily carry the cognitive structure required to continue correctly.

### 2.5 Reactive programming

Reactive programming asks:

> What changes must propagate?

It is powerful for dataflow, interfaces, streams, and live systems. But propagation is not continuation. A signal does not necessarily carry reasons, objections, decisions, risks, assumptions, or authority.

### 2.6 Workflow systems

Workflow systems ask:

> Which step comes next in the process?

They are useful for durable execution, retries, approvals, and long-running processes. But a workflow graph often makes the path primary. Cognitive programming makes the packet primary.

The route matters, but the route is not the unit of work.

### 2.7 Agentic programming

Agent frameworks ask:

> Which agent should act, with which tools and memory?

This is useful but dangerous if the agent becomes the architecture. In cognitive programming, agents are handlers. They may change. The packet remains.

---

## 3. The missing unit: cognitive work

The missing unit is **bounded cognitive work**.

A cognitive unit may be:

- a claim;
- a hypothesis;
- an objection;
- a decision;
- a continuation;
- a task;
- a proof fragment;
- a failure report;
- a mandate;
- a routing request;
- a transformation request;
- a public statement;
- an operational instruction;
- a field observation;
- a correction;
- a traceable act.

The common property is not that these objects are all “ideas” in the abstract philosophical sense.

The common property is operational:

> A cognitive unit is a bounded unit of usefulness that can be formulated, transmitted, routed, resumed, criticized, transformed, acted upon, audited, or reintegrated.

This is what cognitive packets make explicit.

---

## 4. Cognitive packets as programming primitives

A cognitive packet has two layers:

```text
cognitive packet
├── envelope
└── payload
```

The **envelope** carries routing and protocol metadata:

- packet kind;
- provenance;
- origin;
- status;
- routing target;
- context reference;
- trace references;
- validation requirements;
- handler type;
- risk level;
- durability;
- freshness;
- fallback route.

The **payload** carries the cognitive work itself:

- continuation;
- decision;
- hypothesis;
- objection;
- evidence;
- task;
- method;
- operation;
- transformation request;
- failure report;
- publication draft;
- action request;
- correction.

The rule is simple:

> **The envelope routes. The payload means.**

A cognitive router should be able to inspect the envelope without fully interpreting the payload.

A handler should be able to interpret the payload according to its declared kind.

This separation is the key to cognitive packet switching.

---

## 5. Cognitive Packet Switching

Cognitive Packet Switching begins with the packet:

```text
packet → router → handler → packet
```

In a pipeline, the path is primary.  
In an agent graph, the agents are primary.  
In a cognitive packet switching system, the packet is primary.

A packet may be routed to:

- a human reviewer;
- an AI agent;
- a CLI tool;
- a GitHub issue;
- a document editor;
- a legal reviewer;
- a publication queue;
- a scheduler;
- an event bus;
- a field operator;
- an archive;
- a governance process;
- an Inox node;
- a COP runtime.

The router does not need omniscience. Its competence is correct dispatch.

The handler does not need to own the system. Its competence is interpretation and action on a declared payload kind.

A successful handler may produce:

- a successor packet;
- an event;
- an artifact;
- a decision;
- a trace;
- an act;
- a correction;
- a continuation.

---

## 6. Continuations and inversion of control

The decisive programming move is **inversion of control through continuations**.

The weak pattern is:

```text
tool → embedded AI API → hidden judgment → tool continues
```

The stronger pattern is:

```text
tool → continuation packet → external judgment → structured result → tool resumes
```

The tool does not need to know which model, human, runtime, or future system will supply the missing judgment.

It must know how to say:

- where it stopped;
- why deterministic computation is insufficient;
- what alternatives exist;
- what constraints apply;
- what result schema is expected;
- how to resume;
- what risks exist if resumption is wrong.

A continuation is not a summary.

A summary compresses the past.

A continuation enables future action.

---

## 7. Fractanet as a Cognitive Packet Switching Network

Fractanet is the architectural name for the distributed cognitive mesh that emerges when the following layers are composed:

- packet-based infrastructure;
- Cognitive Packets;
- Cognitive Packet Switching;
- COP as durable orchestration protocol;
- Inox as portable execution substrate;
- Cogentia as corpus and method;
- physical, institutional, and software actions as operational outputs.

Fractanet may therefore be described as a **Cognitive Packet Switching Network**.

This expression must be used with attribution and precision.

The term **Cognitive Packet Network** has an important prior lineage, notably in the work of Erol Gelenbe, where cognitive packets designate adaptive network packets capable of learning routing decisions in communication networks.

This prior work should be explicitly acknowledged and honored.

Fractanet does not claim ownership over the expression. It extends the packet-switching intuition to another layer: distributed cognition.

In Fractanet, the packets are not merely communication packets carrying adaptive routing intelligence. They are cognitive packets carrying resumable cognitive work:

- continuations;
- decisions;
- objections;
- hypotheses;
- tasks;
- traces;
- failures;
- mandates;
- transformation requests;
- operational actions.

Compact formulation:

> **Gelenbe showed that packets could become cognitive within the network. Fractanet shows that cognition itself can become packet-switched.**

---

## 8. COP as durable cognitive orchestration

COP — Cognitive Orchestration Protocol — is the durable coordination layer.

COP does not “think”.

COP makes cognitive work:

- represented;
- ordered;
- persisted;
- replayed;
- audited;
- shared;
- resumed.

Its core primitives are:

| COP primitive | Cognitive programming role |
|---|---|
| Event | durable record of a cognitive or operational fact |
| Topic | scope of coherence |
| Task | structured objective |
| Step | atomic unit of work |
| Artifact | durable output |
| Continuation | suspended resumable state |
| Bus | circulation surface |
| Scheduler | coordination mechanism |
| Store | projection and reconstruction |
| Agent | stateless handler |

The central rule:

> **Durable cognitive work does not live inside the agent. It lives in events, artifacts, continuations, traces, and the corpus or runtime substrate.**

This makes agents replaceable.

It also makes responsibility clearer: an AI agent may suggest, structure, critique, or transform, but the accountable act must remain traceable to an actor, authority, mandate, or process.

---

## 9. Inox as execution substrate

Inox is the candidate language and runtime substrate for Fractanet nodes.

It is relevant to cognitive programming because it is designed around:

- a concatenative stack-based VM;
- named values;
- actors;
- reactive sets;
- strict control plane / data plane separation;
- portability from comfortable hosts to edge and bare-metal devices.

COP defines how cognition is durably represented and coordinated.

Inox aims to define how a minimal node can execute, route, react, and continue.

The relationship can be summarized as:

```text
Cognitive Packet = unit
COP = durable orchestration protocol
Inox = portable execution substrate
Fractanet = distributed cognitive packet switching network
```

Inox should not yet be presented as a mature implementation of the entire system.

The prudent formulation is:

> **Inox is the natural candidate for the node-level language of Fractanet, while COP can already be validated in TypeScript or other environments.**

---

## 10. From documents to acts

Cognitive programming must not be reduced to document production.

Documents are important because they stabilize, version, transmit, and audit cognitive work.

But documents are not the only output.

A cognitive packet may produce or govern:

- a document;
- a Git commit;
- an email sent;
- a legal filing;
- a public statement;
- a meeting request;
- a sensor reading;
- a physical installation;
- a software deployment;
- a donation;
- a vote;
- a mandate;
- a contract;
- an institutional interaction;
- a field experiment;
- a correction of the model.

An artifact is therefore not only a text.

An artifact is any durable output that can be referenced, inspected, audited, or used as evidence of a transformation.

An event is not only a software event.

An event may be a meaningful act or fact in the operational chain.

Cognitive programming becomes operational when the loop closes:

```text
theory
→ packet
→ decision
→ act
→ trace
→ observed effect
→ correction of theory
```

The goal is not to replace action with documentation.

The goal is to make action traceable enough that theory and practice can progressively coincide.

---

## 11. Map and territory

The theory is the map.

The practice is the territory.

A map is useful only if it helps navigate the territory. A theory is useful only if it helps act in reality, observe effects, and correct itself.

Cognitive programming provides a method for this loop:

```text
map → action → territory → trace → map correction
```

A bad system hides the gap between theory and practice.

A cognitive system exposes it.

It asks:

- What did the model predict?
- What did the actor decide?
- What act was performed?
- What effect occurred?
- What trace supports that claim?
- What part of the model must be corrected?
- What continuation follows?

This is why cognitive programming is not merely intellectual.

It is operational, institutional, software, political, material, and experimental.

---

## 12. What changes for developers?

The developer’s work changes.

The developer no longer writes only:

- functions;
- classes;
- handlers;
- workflows;
- prompts;
- agents;
- tool calls.

The developer now defines:

- packet kinds;
- envelope schemas;
- payload schemas;
- route rules;
- handler contracts;
- continuation formats;
- validation requirements;
- replay semantics;
- trace policies;
- authority boundaries;
- failure modes;
- reintegration loops.

The cognitive programmer programs the conditions under which work can be correctly continued.

Compact formulation:

> **The cognitive programmer does not merely program execution. The cognitive programmer programs traceable continuation.**

Or:

> **Programming cognitively means programming the passage from thought to act and from act back to corrected thought.**

---

## 13. Minimal implementation profile

A minimal cognitive programming system requires:

```text
1. Packet schema
2. Router
3. Handler interface
4. Event log
5. Artifact store
6. Continuation format
7. Replay or reconstruction mechanism
8. Trace export
9. Human decision boundary
```

A minimal runtime loop:

```text
tool detects uncertainty
→ emits cognitive packet
→ router reads envelope
→ handler interprets payload
→ handler produces result
→ COP records event
→ artifact is stored
→ tool resumes
→ act is performed
→ effect is traced
→ corpus/model is corrected
```

A minimal file layout:

```text
cognitive-programming-mvp/
  schemas/
    cognitive_packet.schema.json
    continuation_payload.schema.json
    decision_payload.schema.json
  src/
    router.ts
    handler.ts
    event_log.ts
    artifact_store.ts
  examples/
    institutional_interaction/
      packet.yaml
      event-log.jsonl
      artifact.md
      continuation.yaml
```

The first implementation should probably be TypeScript.

Inox should come later as a node-level substrate once the semantic invariants are stable.

---

## 14. First operational use case: Interaction Packets

A strong first use case is the already existing **Interaction Packets** practice.

This use case is operational because it includes:

- emails sent;
- replies received;
- silences;
- refusals;
- relances;
- corrections;
- public traces;
- institutional consequences;
- possible public accountability.

A packet may encode:

```yaml
packet_kind: interaction_trace
status: active
subject: "Institutional request"
actor: "Jean Hugues Noël Robert"
recipient: "Institutional actor"
act:
  type: email_sent
  timestamp: "..."
expected_effect:
  - "acknowledgment"
  - "reply"
  - "meeting"
  - "refusal"
trace:
  - "sent email"
  - "received response"
interpretation:
  status: "response received: negative"
correction:
  - "Initial interpretation as no response was wrong"
next_action:
  - "update public dashboard"
  - "watch for later institutional effect"
```

This is a perfect test case because it directly links:

```text
theory → institutional act → response → trace → correction
```

---

## 15. Relationship to existing work

### 15.1 Event-driven systems

Cognitive programming includes event-driven logic but does not stop at events.

An event says that something happened.

A cognitive packet says what can be continued.

### 15.2 Reactive systems

Cognitive programming includes reactivity but does not reduce cognition to signal propagation.

A signal propagates change.

A cognitive packet propagates structured, resumable, accountable work.

### 15.3 Workflow engines

Cognitive programming can run through workflow engines, but it does not begin with the workflow graph.

It begins with the packet.

### 15.4 Agent frameworks

Cognitive programming can use agents, but agents are handlers.

They are not the architecture.

### 15.5 Tool protocols

Tool protocols connect models and systems to external capabilities.

Cognitive programming defines the semantic unit that circulates through those capabilities.

### 15.6 Gelenbe’s Cognitive Packet Networks

Gelenbe’s prior work on Cognitive Packet Networks must be explicitly acknowledged.

The relationship is not denial but extension by layer distinction.

Communication-layer cognitive packets optimize routing in networks.

Fractanet-level cognitive packets carry and route distributed cognitive work.

The two meanings are related by packet-switching intuition, not identical by substrate.

---

## 16. Objections and limits

### Objection 1 — This is only workflow terminology.

No.

Workflow makes the path primary.

Cognitive programming makes the packet primary.

The same packet may move through multiple paths, handlers, documents, runtimes, institutions, and material contexts.

### Objection 2 — This is only document automation.

No.

Documents are maps.

Cognitive programming links maps to acts, acts to traces, traces to observed effects, and effects back to model correction.

### Objection 3 — Agents already do this.

Partially.

Agents often handle messages, tools, memory, and traces. But cognitive programming makes the unit of continuation explicit, durable, routable, auditable, and independent of any one agent.

### Objection 4 — The term Cognitive Packet Network already exists.

Yes.

It must be acknowledged. The prior work should be honored.

Fractanet uses the expression at another layer: distributed cognition rather than adaptive communication routing.

### Objection 5 — This is too broad.

The answer is implementation discipline.

A cognitive programming system must define schemas, invariants, routing rules, handlers, traces, replay semantics, and examples.

Without implementation profile, the idea remains metaphor.

With implementation profile, it becomes architecture.

---

## 17. Research programme

The next steps are:

1. stabilize the terminology;
2. define packet schemas;
3. define COP-compatible event mappings;
4. build a TypeScript MVP;
5. test on Interaction Packets;
6. export traces to the corpus;
7. define an Inox node profile;
8. test edge execution;
9. connect software acts to material/institutional effects;
10. refine the map from the territory.

The core research question:

> **Can cognitive work be packetized without losing responsibility, context, material effect, or human judgment?**

The core engineering question:

> **What is the minimal runtime able to route, handle, persist, resume, audit, and correct cognitive packets?**

The core political question:

> **Can such systems reduce capture by making acts, mandates, continuations, and effects traceable?**

---

## 18. Compact formulation

Cognitive programming can be summarized in one line:

> **Cognitive Programming is the programming of traceable continuation between thought, decision, action, effect, and correction.**

Or:

> **Software executes. Cognitive software continues.**

Or:

> **Fractanet is a Cognitive Packet Switching Network for turning theory into traceable action and action into corrected theory.**

---

## 19. References and neighboring work

This section is intentionally minimal. The present document is a source concept and design note, not a full survey.

### 19.1 Cognitive Packet Networks

The prior networking lineage must be acknowledged explicitly:

- Gelenbe, E., Lent, R., Xu, Z. (2001). “Design and performance of a cognitive packet network.” *Performance Evaluation*, 46(2–3), 155–176.

In that lineage, cognitive packets concern adaptive routing in communication networks. In Fractanet, the phrase is used at another layer: distributed cognition, continuations, traceable action, and corpus/runtime reintegration.

### 19.2 Reactive systems

The Reactive Manifesto describes reactive systems as responsive, resilient, elastic, and message-driven. Cognitive programming can use reactive techniques, but it does not reduce cognitive work to propagation. The relevant cognitive unit is the resumable packet, not only the message or signal.

### 19.3 Tool protocols

The Model Context Protocol (MCP) and similar tool protocols standardize access to tools, data, and external resources. Cognitive programming occupies a different layer: it defines the semantic unit of cognitive work that may circulate through such protocols.

### 19.4 Workflow engines and agent frameworks

Workflow engines, durable execution systems, and agent frameworks provide useful execution and orchestration substrates. Cognitive programming is not a replacement for them. It defines what must be carried through them for the work to remain routable, resumable, auditable, and correctable.

---

## 20. Continuation packet

```yaml
type: cognitive_packet
version: "0.1.1"
envelope:
  packet_kind: continuation
  transmission_mode: copy
  status: active
  self_describing: true
  provenance:
    actor: "Jean Hugues Noël Robert / ChatGPT"
    date: "2026-06-02"
  context_ref:
    repository: "JeanHuguesRobert/cogentia"
    intended_document: "research/cognitive_programming.md"
    issue: "JeanHuguesRobert/cogentia#26"
  routing:
    next_handler: "corpus_editor"
    expected_output: "review, correction, and possible publication as v0.1.1 source document"
  traces:
    - "cogentia/research/cognitive_packets.md"
    - "cogentia/research/cognitive_packet_switching.md"
    - "cogentia/research/pipeline.md"
    - "inseme/packages/cop-core/README.md"
    - "inseme/packages/cop-core/Architecture.md"
    - "FractaVolta/research/fractanet.md"
    - "FractaVolta/research/generalized_packet_networks.md"
    - "Inox/README.md"

payload:
  object: "Stabilize Cognitive Programming as a source concept in the Cogentia corpus."
  established_state:
    - "Cognitive packets are defined as envelope/payload units of cognitive work."
    - "Cognitive Packet Switching is defined as packet → router → handler → packet."
    - "COP provides the durable event/artifact/continuation substrate."
    - "Inox is positioned as the long-term execution substrate for Fractanet nodes."
    - "Fractanet can be described as a Cognitive Packet Switching Network with proper attribution to Gelenbe."
    - "Cognitive Programming must include documents and acts, theory and practice, map and territory."
    - "v0.1.1 adds a minimal references and neighboring-work section."
  decisions:
    - "Do not reduce Cognitive Programming to document production."
    - "Define it as traceable continuity between thought, decision, action, effect, and correction."
    - "Keep agents as handlers, not architecture."
    - "Keep human responsibility explicit."
    - "Use TypeScript first for MVP; Inox later for node-level execution."
  constraints:
    - "Acknowledge prior Cognitive Packet Network work."
    - "Avoid metaphorical overreach."
    - "Define implementation profiles."
    - "Preserve operational material effects."
    - "Do not confuse map with territory."
  next_action:
    - "Review this v0.1.1 draft."
    - "Extract key claims as cognitive packets."
    - "Create cognitive_programming_mvp.md or COP Cognitive Programming Profile."
    - "Test on Interaction Packets."
  resumption_risks:
    - "Over-documenting without operational test."
    - "Under-specifying the packet schema."
    - "Confusing event traces with continuations."
    - "Forgetting the material and institutional effects of acts."
    - "Overclaiming Inox maturity."
```

---

## 21. Status

This document is a v0.1.1 working paper.

It should be corrected by:

- tightening definitions;
- strengthening references;
- extracting packet schemas;
- testing the first operational use case;
- creating a minimal implementation profile.

The next artifact should be either:

```text
research/cognitive_programming_mvp.md
```

or:

```text
inseme/packages/cop-core/COGNITIVE_PROGRAMMING_PROFILE.md
```


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Corpus Status — cogentia](corpus-status.md)
- [Research Index — Cogentia](index.md)

<!-- END_AUTO: backlinks -->
