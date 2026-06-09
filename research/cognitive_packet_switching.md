---
title: "Cognitive Packet Switching"
subtitle: "A Protocol Layer for Routable Ideas, Continuations, and Agent Orchestration"
version: "1.0"
status: "published"
date: "2026-06-01"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
language: "en"
intended_path: "research/cognitive_packet_switching.md"
tags:
  - cogentia
  - cognitive-packets
  - cognitive-packet-switching
  - tcp-ip-of-ideas
  - agent-orchestration
  - continuations
  - packet-switching
  - generalized-packet-networks
  - human-ai-cooperation
  - workflow-systems
  - traceability
  - cop
  - cognitive-orchestration-protocol
  - cogentia-commons
changelog_policy: "omitted from published document; reconstruct from conversation or Git history if needed"
last_reviewed_by:
  - "Grok — v0.1 critique"
  - "Grok — v0.2 critique"
related_projects:
  - "Cogentia"
  - "Cogentia Commons"
  - "Fractanet"
  - "Generalized Packet Networks"
  - "Cognitive Packets"
  - "Agent-Resumable CLI"
  - "Cogentia Pipeline"
  - "COP — Cognitive Orchestration Protocol"
  - "Ubikia"
derived_from:
  - "FractaVolta/research/generalized_packet_networks.md"
  - "cogentia/research/cognitive_packets.md"
  - "cogentia/research/agent_resumable_cli.md"
  - "cogentia/research/pipeline.md"
  - "cogentia/COGENTIA.md"
  - "inseme/research/COP_STATE_OF_PLAY.md"
  - "inseme/packages/cop-core/README.md"
  - "inseme/packages/cop-core/REACTIVE_COGNITIVE_EXTENSION.md"
derived_products_planned:
  - "TCP/IP for Ideas — Hacker News optimized post"
  - "TCP/IP des idées — French public note"
  - "Agent orchestration by cognitive packets — technical explainer"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cognitive_packet_switching.md
last_stamped_at: 2026-06-01
corpus_role: "source"
---

# Cognitive Packet Switching

## A Protocol Layer for Routable Ideas, Continuations, and Agent Orchestration

**Jean Hugues Noël Robert, baron Mariani**  
Institut Mariani / C.O.R.S.I.C.A.  
1 cours Paoli, F-20250 Corte, Corsica

*Published source document — v1.0 — June 2026*

---

## Object and associated documents

### Object of this document

This document defines **Cognitive Packet Switching** as an integrative source concept within the Cogentia / Fractanet corpus.

Its purpose is to connect several lines of work:

1. **Generalized Packet Networks** — the cross-domain idea that operational systems can be studied through bounded packets occupying constrained resources;
2. **Cognitive Packets** — the envelope/payload format for transmitting resumable cognitive work;
3. **Agent-Resumable CLI** — the inversion-of-control pattern by which tools emit continuations instead of embedding AI dependencies;
4. **Cogentia Pipeline** — the method by which cognitive work circulates through critique, transformation, publication, and corpus reintegration;
5. **Cogentia Commons** — the Git / corpus / document implementation profile;
6. **COP — Cognitive Orchestration Protocol** — the event / artifact / continuation implementation profile for durable cognitive orchestration;
7. **Cogentia** — the broader framework for distributed knowledge production under AI conditions.

The document is intentionally self-contained. The associated documents provide traceability and deeper grounding, but should not be required to understand the core argument.

### Associated documents

This document should be read together with:

- [`FractaVolta/research/generalized_packet_networks.md`](https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/generalized_packet_networks.md) — general packet framework;
- [`cogentia/research/cognitive_packets.md`](cognitive_packets.md) — cognitive packet envelope/payload format;
- [`cogentia/research/agent_resumable_cli.md`](agent_resumable_cli.md) — continuation-based inversion of control for CLI tools;
- [`cogentia/research/pipeline.md`](pipeline.md) — method note: pipeline on the surface, packet network in depth;
- [`cogentia/COGENTIA.md`](../COGENTIA.md) — identity document for Cogentia as framework, protocol, CLI, and open corpus;
- [`inseme/research/COP_STATE_OF_PLAY.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/research/COP_STATE_OF_PLAY.md) — state of play for COP as asynchronous orchestration and traceability substrate;
- [`inseme/packages/cop-core/README.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/README.md) — COP core specification package (normative Architecture.md and data model);
- [`inseme/packages/cop-core/REACTIVE_COGNITIVE_EXTENSION.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/REACTIVE_COGNITIVE_EXTENSION.md) — reactive cognitive extension for control-plane / data-plane packet circulation.
- Runtime implementation of the COP Bus, per-topic sub-buses, federation, Scheduler, JobScheduler and Task/Continuation helpers lives in `inseme/packages/cop-kernel` (the active substrate for Fractanet packet routing experiments in the bac-à-sable).

---

## Executive Summary

AI-assisted knowledge work increasingly crosses boundaries: humans, AI agents, command-line tools, repositories, workflow engines, publication systems, operational runtimes, governance processes, and future digital twins all need to resume and transform work started elsewhere.

Current systems often model this as a workflow, graph, orchestration layer, trace, memory, or prompt chain. These are useful, but they leave one question under-specified:

> What is the unit of cognitive work that actually circulates?

This document proposes **Cognitive Packet Switching** as an answer.

The core primitive is the **cognitive packet**: a bounded unit of cognitive work with an **envelope** for routing and a **payload** for meaning. The envelope lets a router dispatch the packet without understanding the whole content. The payload is interpreted by a competent handler: human, model, script, tool, repository, review queue, publication process, runtime, or governance process.

The decisive move is **inversion of control**. Instead of embedding AI judgment inside every tool, a tool may emit a continuation packet: “I stopped here; this judgment is missing; here are the alternatives, constraints, expected result, and resumption path.”

This makes agents replaceable handlers rather than the architecture itself.

The proposal is not tied to a single implementation substrate. The corpus already contains two complementary implementation profiles:

1. **Cogentia Commons** — the long-memory corpus/document profile, based on Git, Markdown, issues, commits, source documents, derived products, and reintegration;
2. **COP — Cognitive Orchestration Protocol** — the operational event profile, based on immutable events, durable artifacts, topics, tasks, steps, stateless agents, continuations, stores, schedulers, replay, and auditability.

“**TCP/IP for Ideas**” is the public shorthand for this proposal. It is not a literal claim that cognition obeys TCP/IP. It means: make the unit of circulation explicit, routable, resumable, inspectable, and traceable.

Compact formulation:

> Cognitive Packet Switching is a packet-switched model of knowledge work in which ideas become bounded cognitive packets, envelopes make them routable, payloads preserve meaning, continuations make them resumable, traces make them auditable, and corpus or event reintegration makes them cumulative.

---

## Abstract

Most current workflow systems model AI-assisted work as pipelines, graphs, orchestrators, agents, tasks, traces, or durable execution states. These are useful but incomplete. They often leave underspecified the unit of cognitive work that must circulate through the system.

This paper proposes **Cognitive Packet Switching** as a minimal protocol layer for such circulation.

The core idea is simple: treat ideas broadly understood — claims, objections, decisions, tasks, proofs, methods, mandates, continuations, and transformation requests — as **bounded cognitive packets**. Each packet carries an **envelope** for routing and a **payload** for meaning. The envelope can be read by routers without interpreting the whole payload. The payload is handled by a competent human, artificial agent, script, tool, repository, runtime, or publication process.

The proposed layer does not replace workflow engines, agent protocols, tracing systems, Git repositories, event buses, operational runtimes, or human judgment. It defines the semantic unit that can move through them.

---

## Keywords

Cognitive Packet Switching; TCP/IP for Ideas; cognitive packets; continuations; agent orchestration; inversion of control; envelope and payload; routable ideas; human-AI cooperation; Generalized Packet Networks; Fractanet; Cogentia; Cogentia Commons; COP; Cognitive Orchestration Protocol; workflow systems; traceability; corpus reintegration; event orchestration.

---

# 1. The problem

AI-assisted knowledge work often fails in a mundane way:

> The next actor does not know exactly what should be continued.

The next actor may be a human, an AI agent, a local script, a command-line tool, a workflow engine, a GitHub issue, an event bus, a runtime, a publication process, a reviewer, an archive, a governance process, or a future digital twin.

The failure is rarely only a lack of memory. It is a failure of **resumability**.

A summary may say what happened.  
A trace may record what happened.  
A task may request what should be done.  
A workflow graph may define where execution should go.  
A prompt may instruct an agent.

But none of these, by itself, guarantees that another actor can correctly continue the work.

The missing object is a bounded, transmissible, inspectable unit of cognitive work.

---

# 2. From workflows to packets

Most workflow systems begin with the process:

```text
step A → step B → step C
```

Most agent orchestration systems begin with agents:

```text
agent A → tool B → agent C → memory D
```

Cognitive Packet Switching begins with the packet:

```text
packet → router → handler → packet
```

In a pipeline, the path is primary.  
In an agent graph, the agents are primary.  
In a packet-switched cognitive system, the packet is primary.

The packet carries enough structure to be routed, resumed, transformed, rejected, archived, criticized, or reintegrated into a corpus or event substrate.

---

# 3. Generalized packet premise

This document builds on the broader idea of **Generalized Packet Networks**.

A generalized packet is:

> a bounded unit of operational usefulness that occupies constrained resources.

A generalized network is:

> a structure that stores, routes, transforms, delays, amplifies, prioritizes, or governs packets.

This abstraction applies across different substrates only with discipline. A data packet is not an energy packet. A vote is not a parcel. A mandate is not a prompt. A cognitive packet is not a TCP/IP packet.

The point is not physical identity.  
The point is operational recurrence.

Across many domains, useful units circulate through constrained networks.

In cognitive work, the useful unit is an idea in a broad operational sense.

---

# 4. What counts as an idea?

In this document, “idea” is used broadly.

An idea is not only an abstract concept. It may be a claim, intuition, objection, decision, question, proof fragment, task, method, mandate, narrative fragment, continuation, transformation request, publication draft, correction, warning, route, control signal, or failure report.

The common property is not philosophical abstraction. The common property is operational boundedness.

An idea, in this sense, is:

> a bounded unit of cognitive usefulness that can be formulated, transmitted, routed, resumed, criticized, transformed, executed, or reintegrated.

This is the meaning of “TCP/IP for ideas”: not a literal network protocol, but a minimal protocol layer for the circulation of bounded cognitive work.

---

# 5. Cognitive packets

A **cognitive packet** is a structured unit of cognitive work designed to be transmitted between humans, artificial agents, tools, repositories, runtimes, or publication processes.

It has two layers:

```text
cognitive packet
├── envelope
└── payload
```

The **envelope** contains routing and protocol metadata that can be inspected without interpreting the whole content.

The **payload** contains the cognitive work itself.

The envelope may contain:

- packet kind;
- transmission mode;
- origin;
- provenance;
- status;
- routing target;
- context reference;
- trace references;
- risk level;
- expected handler type;
- validation requirements;
- fallback route;
- durability / freshness / pressure hints.

The payload may contain:

- claim;
- objection;
- continuation;
- decision;
- hypothesis;
- evidence;
- task;
- method;
- transformation request;
- operation;
- control instruction;
- failure report;
- publication draft.

The envelope routes.  
The payload means.

---

# 6. Routing, continuations, and inversion of control

The central routing principle is:

> A cognitive router should not need to understand the whole payload. It should know where the packet can go next.

A router may inspect:

```yaml
packet_kind: continuation
status: active
route_to: technical_review
risk_level: medium
context_mode: copy
```

without interpreting the full intellectual content of the continuation. The handler then interprets the payload.

This enables **inversion of control**.

The weak pattern is:

```text
tool → embedded AI API → hidden judgment → tool continues
```

The stronger pattern is:

```text
tool → continuation packet → external judgment → structured result → tool resumes
```

The tool does not need to know which model, human, script, runtime, or future system will supply the missing judgment.

It only needs to expose:

- where it stopped;
- why deterministic computation is insufficient;
- what alternatives exist;
- what constraints apply;
- what result schema is expected;
- how to resume;
- what risks exist if resumption is incorrect.

This makes intelligence replaceable.

A continuation is therefore not merely a summary. It is the resumable form of unfinished cognitive work.

A continuation packet should answer:

```text
What is being continued?
Where did the work stop?
What has already been decided?
What assumptions remain active?
What constraints must be preserved?
What result is expected?
What would count as invalid resumption?
What should happen next?
```

Summary compresses the past.  
Continuation enables future action.

---

# 7. Cognitive routers

A **cognitive router** is any actor or mechanism that dispatches cognitive packets based on their envelope.

It may be:

- a human editor;
- an AI agent;
- a CLI tool;
- a GitHub issue workflow;
- a local script;
- a repository index;
- a publication queue;
- an event bus;
- a scheduler;
- a control-plane runtime;
- a governance process;
- a future agent orchestration runtime.

A router may receive, inspect, validate, queue, route, reject, escalate, archive, split, merge, transform, mark stale, request by-copy context, or produce successor packets.

A router does not need to be omniscient.

Its competence is not full understanding.  
Its competence is correct dispatch.

---

# 8. Agents as handlers

In this model, agents are not the architecture.

Agents are handlers.

A handler is any actor capable of interpreting and acting on a declared payload kind.

Examples:

| Handler type | Payload kind |
|---|---|
| critic | objection, weakness, falsification |
| researcher | source request, evidence packet |
| editor | transformation request, publication draft |
| engineer | technical continuation, failure report |
| legal reviewer | legal-risk packet |
| human principal | decision, mandate, approval |
| archive agent | provenance, trace, classification |
| router | envelope inspection, dispatch |
| publication agent | derived product request |
| runtime agent | operation, event, continuation, control packet |

The practical consequence is:

> Agent orchestration should start with routable cognitive packets, not with agents.

Agents can change.  
Models can change.  
Tools can change.  
Repositories can move.  
Runtimes can be replaced.  
The packet remains the stable unit of work.

---

# 9. Packet-switched cognitive work

A classical linear model of knowledge production looks like this:

```text
idea → draft → final publication
```

A packet-switched model looks more like this:

```text
intuition
→ fragment
→ cognitive packet
→ critique
→ revision
→ source document
→ derived product
→ public feedback
→ corpus reintegration
→ new continuation
```

A more operational model may look like this:

```text
event
→ packet
→ router
→ handler
→ artifact
→ continuation
→ event
```

The difference matters.

Linear workflow tends toward premature closure. Packet-switched workflow preserves alternatives, objections, branches, transformations, runtime events, and future continuations.

In this model, a publication is not the end of the process. It is one delivery form. A runtime artifact is not the end either. Feedback, events, traces, and failures may generate new packets, which may return to the corpus or continue through an operational event substrate.

The system becomes cumulative only if packets are reintegrated somewhere durable.

---

# 10. Two implementation profiles

Cognitive Packet Switching is not tied to one persistence substrate.

The present corpus contains at least two different implementation profiles.

## 10.1 Corpus/document profile — Cogentia Commons

In the corpus/document profile, cognitive packets circulate through a versioned knowledge substrate: Git repositories, Markdown source documents, GitHub Issues, commits, review prompts, objections, derived products, and reintegration notes.

This profile is slow, asynchronous, cumulative, and publication-oriented.

Its strength is long memory.

It is suitable for:

- source documents;
- working papers;
- objections;
- public notes;
- derived products;
- corpus reintegration;
- slow review and critique;
- traceable intellectual genealogy;
- code produced as a derived product.

In this profile, the network is made operational by persistence, versioning, backlinks, issues, explicit continuation packets, and public reintegration.

Cogentia Commons asks:

> How can cognitive work survive, be reviewed, become source, generate derived products, and return to the corpus?

## 10.2 Operational/event profile — COP

In the operational/event profile, cognitive packets circulate through **COP — Cognitive Orchestration Protocol**.

COP provides a protocol surface for durable cognitive processes based on immutable Events, durable Artifacts, Topics, Tasks, Steps, stateless Agents, Continuations, event transport, stores, schedulers, replay, and auditability.

This profile is suitable for operational orchestration, process control, human-in-the-loop systems, multi-agent runtime coordination, and potentially live or near-live applications where packets must be routed through an event substrate.

Its strength is operational responsiveness.

COP asks:

> How can cognitive work be represented, ordered, persisted, replayed, audited, and coordinated across runtime systems?

The current COP corpus prioritizes asynchronous, event-driven, strongly traceable orchestration. Reactive or live applications require runtime profiles and remain distinct from the core protocol.

## 10.3 Same principle, different temporal scales

The two profiles do not compete.

They instantiate the same packet-switching principle at different temporal and operational scales:

| Profile | Substrate | Time scale | Main strength |
|---|---|---|---|
| Cogentia Commons | Git, Markdown, issues, commits, documents | slow / cumulative | memory, publication, genealogy |
| COP | events, artifacts, topics, tasks, steps, continuations | async / operational / potentially live | orchestration, replay, auditability |

Cogentia Commons is the long-memory document profile.  
COP is the operational event profile.

Both instantiate Cognitive Packet Switching.

---

# 11. Corpus and event reintegration

A cognitive packet-switching system requires memory.

Without memory, packets circulate but do not accumulate.

A versioned corpus provides:

- canonical source documents;
- provenance;
- revision history;
- objections;
- decisions;
- derived products;
- reintegration points;
- traceability;
- continuity across sessions;
- resistance to context-window loss.

An event substrate provides:

- immutable event logs;
- durable artifacts;
- topic-local ordering;
- task and step context;
- continuation resumption;
- causal links;
- replay;
- auditability;
- operational coordination.

These two memory forms are complementary.

The corpus preserves meaning over long intellectual cycles.  
The event substrate preserves causality over operational cycles.

Cognitive Packet Switching needs at least one durable reintegration substrate. In richer systems, it may need both.

---

# 12. Derived products

A derived product is a transformation of source material for a particular audience, medium, or operational use.

Examples include Hacker News posts, Substack articles, Facebook posts, GitHub issues, technical READMEs, legal memos, public speeches, grant applications, prompt contracts, CLI tutorials, executable code, runtime schemas, and operational profiles.

A derived product may be faithful without being complete.

This is important. A short public post about “TCP/IP for Ideas” should not require the reader to digest the entire source corpus. Instead, it should expose one route through the source material.

A good derived product is therefore:

```text
self-contained
traceable
audience-specific
faithful to source
clear about non-claims
able to generate feedback packets
```

---

# 13. Governance note: capacity and obscurity

Although this document is technical in form, its implications are not limited to AI workflows.

A system that cannot route, resume, audit, and attribute cognitive work remains vulnerable to opacity. Decisions disappear into conversations, tools, undocumented judgments, untraceable summaries, transient runtime calls, or institutional memory loss.

This connects Cognitive Packet Switching to two broader notions developed elsewhere in the corpus:

- **Autonomy of Capacity**: autonomy should be measured by what a person, institution, or territory can actually do, verify, transmit, and continue.
- **Impunity by Obscurity**: when acts, judgments, transformations, and responsibilities are not traceable, responsibility becomes difficult to assign and capture becomes easier to hide.

Cognitive Packet Switching does not solve governance by itself. It provides a technical and procedural layer through which cognitive acts can become more explicit, routable, attributable, and contestable.

---

# 14. Minimal example

A minimal cognitive packet might look like this:

```yaml
packet_kind: continuation
status: active
origin: draft_note
route_to: technical_review
context_mode: copy
risk_level: medium

envelope:
  protocol: cognitive_packet.v0
  provenance:
    source_documents:
      - "generalized_packet_networks.md"
      - "cognitive_packets.md"
      - "agent_resumable_cli.md"
      - "pipeline.md"
  routing:
    preferred_handler: "technical critic"
    fallback_handler: "human reviewer"

payload:
  object: "TCP/IP for Ideas"
  current_state: >
    We propose cognitive packet switching as a protocol layer
    for routing resumable cognitive work across humans, agents,
    tools, repositories, runtimes, and publications.
  decisions:
    - "Use TCP/IP as analogy, not identity."
    - "Keep the public version self-contained."
    - "Treat agents as replaceable handlers, not as the architecture."
  open_questions:
    - "Is the minimal schema too heavy?"
    - "Can routers safely dispatch packets without reading payloads?"
    - "How should failed continuations be represented?"
  next_action: >
    Produce a critical review focused on novelty, prior art,
    overclaiming, and implementation feasibility.
  resumption_risks:
    - "Confusing analogy with literal TCP/IP."
    - "Overstating novelty."
    - "Underexplaining how routing decisions are made."
```

A minimal operational packet may look like this:

```json
{
  "eventType": "cop.packet.created",
  "topic": "topic:example",
  "task": "task:review",
  "step": "step:technical-critique",
  "packet": {
    "envelope": {
      "packetKind": "continuation",
      "routeTo": "technical-review",
      "riskLevel": "medium",
      "trace": {
        "cause": "event:previous",
        "correlationId": "corr:example"
      }
    },
    "payload": {
      "object": "TCP/IP for Ideas",
      "nextAction": "Review novelty and implementation feasibility"
    }
  }
}
```

The examples show the same architecture across two substrates:

```text
envelope     → route
payload      → interpret
continuation → resume
trace        → audit
```

---

# 15. Relationship to existing systems

Cognitive Packet Switching does not replace existing systems.

It is compatible with:

- workflow engines;
- agent frameworks;
- durable execution systems;
- command-line tools;
- Git repositories;
- issue trackers;
- event buses;
- schedulers;
- process-control runtimes;
- document management systems;
- publication platforms;
- human editorial processes.

Its claim is narrower:

> These systems still need a semantic unit of cognitive circulation.

A workflow engine may execute steps.  
An agent framework may call tools.  
A trace system may record events.  
A repository may store documents.  
An event bus may carry operational events.  
A publication platform may distribute text.

A cognitive packet defines what cognitive work is being moved, resumed, transformed, executed, or reintegrated.

---

# 16. Non-claims

This document does not claim that Cognitive Packet Switching is literally TCP/IP.

It does not claim that cognitive work obeys the same laws as data networking.

It does not claim that all ideas should be packetized.

It does not claim to replace human judgment.

It does not claim to replace workflow engines, agent protocols, orchestration frameworks, Git repositories, or event substrates.

It does not claim complete novelty. It builds on continuations, message passing, workflow callbacks, human-in-the-loop systems, software design patterns, packet switching, Git-based versioning, event sourcing, durable execution, and agent-tool protocols.

It does not claim that envelope-based routing is always safe. Some packets may require payload inspection before routing. Some packets may be malformed, hostile, stale, incomplete, or misleading.

It does not claim that COP is already a mature real-time runtime. COP is a protocol and data model; reactive or live systems require runtime profiles and implementation work.

It does not claim that packet structure validates packet truth.

A well-formed packet may still contain false claims.

---

# 17. Failure modes

Cognitive Packet Switching introduces its own risks.

## 17.1 Over-packetization

Not every thought deserves a packet. Some work is too fluid, private, affective, or exploratory to be immediately formalized.

## 17.2 False routability

A packet may appear routable while lacking enough context for safe handling. This is especially dangerous when context is referenced but not actually available.

## 17.3 Router overreach

A router may silently interpret payloads while pretending only to inspect envelopes. This creates hidden judgment.

## 17.4 Schema bureaucracy

The packet format may become too heavy, discouraging use. A minimal useful schema is preferable to an exhaustive one.

## 17.5 Stale packets

A packet may remain structurally valid while its context, assumptions, route, or operational event state has expired. Freshness must be explicit.

## 17.6 Agent capture

If only one model or vendor can process the packets, the protocol is contaminated. Handler replaceability is a soundness condition.

## 17.7 Loss of responsibility

If agents route and transform packets without attribution, traceability collapses. Every meaningful action should remain attributable.

## 17.8 Runtime/corpus mismatch

A packet produced in a fast operational event substrate may not be suitable for long-term corpus reintegration without condensation, review, or transformation.

Conversely, a corpus document may be too slow or too large for operational orchestration without a derived runtime packet.

---

# 18. Implementation sketch

A minimal implementation does not require a full platform.

## 18.1 Corpus/document implementation

A first corpus implementation can use:

- Markdown;
- YAML frontmatter;
- JSON packets;
- Git repositories;
- GitHub Issues;
- CLI commands;
- static indexes;
- human review;
- ordinary copy/paste.

Minimal commands might include:

```bash
cogentia packet create
cogentia packet inspect
cogentia packet route
cogentia packet resume
cogentia packet archive
cogentia packet derive
cogentia packet reintegrate
```

Consolidation note, 2026-06-09: these `packet` commands describe a possible packet-facing CLI layer, not the current `scripts/cogentia.js` v2 surface. The current CLI implements corpus navigation and verification (`docs`, `corpus`, `state`, `git`) plus explicit external judgment through `cogentia.continuation.v2`. Packet commands should be introduced only after the minimal routing schema and resumption contract stabilize.

## 18.2 Operational/event implementation

A first operational implementation can use:

- immutable events;
- durable artifacts;
- task / step identifiers;
- continuation descriptors;
- event bus;
- store;
- scheduler;
- replay and audit logs;
- stateless agents.

Minimal operations might include:

```text
emit packet event
project packet state
route packet
suspend continuation
resume continuation
store artifact
record causal link
replay topic
audit decision path
```

The first useful implementation should be boring.

If the protocol cannot work with Markdown, JSON, Git, copy/paste, and ordinary event logs, it is probably too complex.

---

# 19. Design principles

| Principle | Meaning |
|---|---|
| Packets before agents | Do not start with agent identity. Start with the unit of work. |
| Envelope before payload | Inspect kind, origin, route, risk, freshness, and durability before interpreting meaning. |
| Continuation before summary | The goal is not only to describe the past, but to enable correct resumption. |
| Replaceable handlers | A handler may be a human, model, script, tool, institution, runtime, or future digital twin. |
| Traceable transformations | Every significant transformation should leave a trace. |
| Durable reintegration | Important results should return to a versioned source layer, an event substrate, or both. |
| Profile-aware implementation | Slow corpus workflows and operational event flows instantiate the same principle under different constraints. |
| Self-contained derived products | Public derivatives should be readable without forcing the whole source corpus on the reader. |
| Protocol humility | Packet structure makes content more inspectable, not automatically true or safe. |

---

# 20. Open questions

1. What is the minimal useful schema for a cognitive packet?
2. Which fields belong in the envelope and which belong in the payload?
3. When must a router inspect payload content before dispatch?
4. How should packet freshness be represented?
5. How should failed continuations be recorded?
6. How should malicious or misleading packets be handled?
7. Can packet routing be made explainable without becoming too heavy?
8. What is the relation between cognitive packets and existing agent protocols?
9. What is the relation between cognitive packets and workflow engine state?
10. What belongs to Cogentia Commons, and what belongs to COP?
11. How should fast operational packets be reintegrated into the long-memory corpus?
12. Can a Git-based implementation scale far enough before a dedicated runtime is needed?
13. How should human responsibility be preserved when agents route or transform packets?
14. Can derived products reliably produce feedback packets for corpus reintegration?

Consolidation note, 2026-06-09:

- The Git/corpus profile is now materially implemented through `scripts/cogentia.js` v2 for document inventory, source/derived role inspection, generated navigation views, gaps, corpus verification, and external-judgment continuations.
- The operational/event profile is being exercised in `inseme/packages/cop-kernel` through SubBus, federation, topic-aware scheduling, packet creation, and a reactive router-agent demo with a lightweight capability registry.
- The missing bridge is still the packet-facing layer: schema validation, `packet route`, failed-continuation semantics, security policy, and reintegration from operational packets back into the long-memory corpus.
- The open questions above should therefore be read as stabilization targets for that bridge, not as evidence that the corpus/document layer is unimplemented.

---

# 21. Transformation Map

| Source element | Transformation in this document |
|---|---|
| Generalized Packet Networks | Recast as the abstract framework from which cognitive packets derive. |
| Cognitive Packets | Elevated from envelope/payload format to the unit of cognitive switching. |
| Agent-Resumable CLI | Generalized from CLI continuation to inversion of control for agent orchestration. |
| Cogentia Pipeline | Reframed as packet-switched cognitive work rather than a linear workflow. |
| Cogentia identity document | Integrated as the broader framework of corpus, traceability, and replaceable agents. |
| Cogentia Commons | Identified as the corpus/document implementation profile of Cognitive Packet Switching. |
| COP | Identified as the operational/event implementation profile of Cognitive Packet Switching. |
| COP Reactive Cognitive Extension | Interpreted as a control-plane / data-plane path toward reactive packet circulation. |
| Autonomy of Capacity | Connected through the ability to route, resume, verify, and continue cognitive work. |
| Impunity by Obscurity | Connected through the need to make cognitive acts attributable and contestable. |
| Public phrase “TCP/IP for Ideas” | Treated as a shorthand and future derived product, not as a literal technical claim. |

---

# 22. Self-evaluation

| Criterion | Evaluation | Comment |
|---|---|---|
| Self-contained readability | Strong | The reader can understand the argument without reading the whole corpus. |
| Corpus fidelity | Strong | The document integrates existing source documents without contradicting them. |
| Technical clarity | Good | Envelope/payload, router/handler, continuation, and implementation-profile distinctions are explicit. |
| Novelty discipline | Good | Non-claims reduce overclaiming; prior-art mapping remains incomplete. |
| Implementation readiness | Stronger (2026-06 restart) | Two implementation profiles identified: Git/corpus and COP event. Key COP switching substrate (SubBus + per-topic + federation + interest propagation, topic-aware COPJobScheduler/Task helpers) in cop-kernel and exercised in bac-à-sable. 2026-06 work: SubBus listener hygiene + proper async delivery (no leaks, reliable routed chains), `resetForTest()` + auto-reset in pipeline (schedulers, jobSchedulers, new CapabilityRegistry) to prevent timer/pending accumulation, `asCognitivePacket` improvements (defaults, validation, cop.packet.created emission), reactive subscribing "Cogentia router agent" demo (`cognitive-packet-router-demo.js`) that also wires a lightweight `CapabilityRegistry` stub for `requiredCapability` decisions (still envelope-only). See `inseme/packages/cop-kernel/docs/SESSION_RESUME_cognitive-packet-router-2026-06.md` + compatibility report. Conceptually aligned and operationally advancing the switching layer while actively avoiding technical debt. |
| Public usability | Strong | “TCP/IP for Ideas” is memorable if kept as analogy, not identity. |
| Governance relevance | Good | Capacity and obscurity links are present but do not dominate the technical paper. |
| Risk handling | Good | Failure modes now include runtime/corpus mismatch. |
| Next derivation potential | Strong | The document can generate HN, Substack, schema, issue-template, and COP-profile derivatives. |

---


# 23. Core formulation

The compact formulation is:

> Cognitive Packet Switching is a packet-switched model of knowledge work in which ideas become bounded cognitive packets, envelopes make them routable, payloads preserve meaning, continuations make them resumable, traces make them auditable, and corpus or event reintegration makes them cumulative.

Or shorter:

> **TCP/IP for ideas: a minimal protocol layer for routing resumable cognitive work.**

---

# 24. Conclusion

AI-assisted work does not only need better agents.

It needs better units of circulation.

If cognitive work continues to move as informal prompts, fragile summaries, hidden traces, opaque tool calls, transient events, vendor-specific memories, and unintegrated runtime artifacts, agent orchestration will remain brittle.

Cognitive Packet Switching proposes a different primitive:

```text
routable cognitive packets
handled by replaceable agents
preserved in a durable substrate
continued through explicit continuations
```

That durable substrate may be a long-memory corpus, an operational event system, or both.

The goal is not to automate thought away.

The goal is to make thought transmissible, criticizable, resumable, operational, and accountable across humans, agents, tools, repositories, runtimes, and publications.

The network gives topology.  
The packet gives operation.  
The continuation gives future.  
The trace gives accountability.  
The corpus gives memory.  
The event substrate gives causality.


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Corpus Status — cogentia](corpus-status.md)
- [Research Index — Cogentia](index.md)

<!-- END_AUTO: backlinks -->
