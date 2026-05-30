---
title: "Cognitive Packets"
subtitle: "An Envelope and Payload Format for Human–AI and Multi-Agent Cooperation"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-05-21"
status: working-paper — Working paper
version: "0.3"
license: "CC BY-SA 4.0 for text; MIT for associated schemas or code"
spdx: "CC-BY-SA-4.0"
operational_prompt: cogentia/prompts/cognitive_packet.md
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cognitive_packets.md
last_stamped_at: 2026-05-26
---

# Cognitive Packets

<!-- BEGIN_AUTO: trails -->
> 🧭 **Trail: From Method to Machine**
> ⬅️ Previous: [Agent-Resumable CLI](agent_resumable_cli.md) | ➡️ Next: [Agent Navigation Guide](../docs/agent_context_server.md)

<!-- END_AUTO: trails -->

## An Envelope and Payload Format for Human–AI and Multi-Agent Cooperation

**Jean Hugues Noël Robert, baron Mariani**  
Institut Mariani / C.O.R.S.I.C.A.  
1 cours Paoli, F-20250 Corte, Corsica

*Working paper — May 2026 — v0.3*

---

## Version note

**v0.3** introduces the **envelope and payload** distinction. A cognitive packet now has two layers:

- an **envelope** carrying kind-agnostic metadata (protocol header, provenance, context reference, transmission mode, routing, traces) that any agent — human or machine — can read without interpreting the inner work;
- a **payload** carrying the kind-specific cognitive content (continuation, objection, hypothesis, decision, failure, or routing), validated by an agent that understands the declared kind.

Continuations are no longer one *kind of packet*; they are the canonical *payload* of a packet whose `packet_kind = continuation`. The earlier `cogentia.continuation.v1` protocol maps directly to this payload — no semantic change to the existing CLI primitive, only a clearer transport story.

**v0.2** added **self-describing cognitive packets**. A packet transmitted by copy may include a minimal protocol header explaining how to interpret the packet and how to produce another one. From v0.3, that protocol header lives in the envelope (it travels with every kind, not just continuations). The rule still holds: **self-describing does not mean self-validating**.

## Genre note

This document is a **design pattern** in the sense of Christopher Alexander and the Gang of Four — not a formal specification, not an academic proof, not a normative protocol.

A pattern names something already present, in many forms, in domains that have solved related problems. It codifies a recurring structure so that practitioners recognize what they were already doing, share a vocabulary, and discuss variants. SBAR (healthcare handoffs, since 2002) and Architecture Decision Records (software, since 2011) are the closest existing patterns — the latter explicitly described by its author as "in a format similar to an Alexandrian pattern". Cognitive packets transpose the same family of patterns to the case where one or more agents in the loop are not human.

The reader looking for formal proofs, exhaustive related work, normative schemas, or completeness should expect to be disappointed. The reader who recognizes the problem and finds a useful name for it is the intended audience.

See Appendix C for known uses of the same pattern family in adjacent domains.

---

## Abstract

Current agent protocols increasingly standardize how artificial agents communicate, call tools, access resources, delegate tasks, and produce execution traces. Yet they often leave underspecified the unit of cognitive work that must be transmitted for a task to be reliably resumed across humans, artificial agents, tools, conversations, repositories, and workflow systems.

This paper introduces **cognitive packets**: structured units of cognitive work composed of two layers. An **envelope** carries kind-agnostic metadata — protocol header, provenance, context reference, transmission mode, routing, traces — that any receiver can read without interpreting the inner work. A **payload** carries the kind-specific cognitive content — continuation, objection, hypothesis, decision, failure, or routing — validated by an agent capable of handling that kind. A cognitive packet is neither a prompt, nor a message, nor a task, nor a trace, although it may contain or produce all four.

The paper distinguishes two transmission modes. A packet may be transmitted **by copy**, embedding the necessary context for portability, or **by reference**, assuming a shared, stable, and accessible context. This distinction mirrors pass-by-value and pass-by-reference semantics in programming.

The envelope/payload split is the standard envelope-and-content pattern familiar from HTTP, email, and most transport protocols. Here it serves a specific cooperative purpose: a routing agent (human or machine) can validate, dispatch, queue, archive, or acknowledge a packet by reading the envelope alone, leaving the cognitive interpretation of the payload to whoever can handle the declared kind. New kinds may be added without modifying the envelope.

Version 0.2 introduced **self-describing packets** — the envelope may carry not only the state required to resume work but also the minimal convention required to interpret the packet and produce another one. From v0.3 the protocol header lives in the envelope, so self-description benefits every kind, not only continuations. This enables protocol propagation by copy/paste without requiring prior installation, shared tooling, or a preloaded system prompt.

Cognitive packets are presented as a minimal semantic payload layer compatible with agent-to-agent protocols, tool protocols, workflow engines, command-line tools, Git repositories, todo systems, and ordinary copy/paste. Their role is not to replace existing infrastructure, but to make human–AI and multi-agent cooperation more resumable, auditable, and operationally reliable.

---

## Keywords

cognitive packets; envelope and payload; continuation; multi-agent systems; agent orchestration; human-AI cooperation; copy/paste; pass by value; pass by reference; self-describing envelope; resumability; traceability; Cogentia; second method; agent-resumable CLI.

---

# 1. Introduction

Multi-agent systems increasingly exchange messages, tasks, tool calls, artifacts, traces, and state snapshots. This is useful but insufficient.

A message may communicate content without preserving the state required to resume work.  
A task may request action without exposing decisions already taken.  
A trace may record what happened without carrying the next usable point of continuation.  
A prompt may instruct an agent without distinguishing facts, assumptions, constraints, and decisions.

The practical result is familiar: work is restarted, summarized inaccurately, decontextualized, over-expanded, or continued from the wrong premise.

The proposed answer is deliberately narrow:

> Define a minimal unit of cognitive work that can be copied, referenced, routed, inspected, resumed, rejected, archived, or branched.

That unit is a **cognitive packet**.

Version 0.2 adds one more requirement for portable packets:

> A cognitive packet transmitted by copy should be self-describing when the receiver may not already know the protocol.

This means that the packet may include its own minimal instructions for interpretation and reproduction.

---

# 2. Problem Statement

Current agent infrastructures provide increasingly capable execution surfaces, but they do not by themselves guarantee cognitive continuity.

The core problem is not transport. Existing systems can already move messages.

The core problem is not tool access. Existing systems can already connect agents to files, APIs, databases, and command-line programs.

The core problem is not execution tracing. Existing systems can already record spans, tool calls, handoffs, and intermediate events.

The unresolved problem is:

> What exactly must be transmitted so that another actor can correctly continue the work?

This is a payload problem.

A continuation payload must preserve at least:

- the object of work;
- the current state;
- decisions already taken;
- assumptions still open;
- constraints to respect;
- provenance and traces;
- the next useful action;
- risks of incorrect resumption.

A portable continuation payload may also need to preserve:

- the minimal protocol convention required to interpret it;
- the rule that a receiver may produce a new packet after resumption;
- the warning that protocol structure does not validate content.

---

# 3. Scope

This paper does **not** propose:

- a new agent runtime;
- a replacement for Agent2Agent, MCP, OpenAI Agents SDK, LangGraph, AutoGen, CrewAI, or workflow engines;
- a comprehensive AI safety theory;
- a governance protocol;
- a universal ontology of cognition.

It proposes a narrower object:

> a minimal, transport-neutral, human-readable and machine-readable continuation payload.

This payload may be carried by many systems:

- copy/paste;
- Markdown;
- JSON;
- email;
- GitHub issues;
- todo lists;
- A2A messages;
- MCP resources or tool outputs;
- CLI continuations;
- workflow engine state;
- Git commits;
- Cogentia repositories.

---

# 4. Related Work and Layer Distinction

## 4.1 Agent-to-agent protocols

Agent-to-agent protocols standardize how agents communicate, discover each other, send messages, manage tasks, and exchange artifacts. In such systems, a cognitive packet is not the transport protocol. It is a candidate payload carried inside a message, task, or artifact.

```text
Agent-to-agent protocol:
  How agents exchange work.

Cognitive packet:
  What structured cognitive state is exchanged.
```

## 4.2 Tool protocols

Tool protocols such as MCP standardize how agents discover and invoke external tools and resources.

```text
Tool protocol:
  Access this file, database, API, command, or resource.

Cognitive packet:
  Here is the state of work that depends on those resources.
```

## 4.3 Agent SDKs and orchestration frameworks

Agent SDKs and orchestration frameworks provide agents, tools, handoffs, memory, graph state, guardrails, traces, and execution control.

```text
Orchestration runtime:
  Execute and coordinate agents.

Cognitive packet:
  Preserve the resumable unit of work being coordinated.
```

## 4.4 Workflow engines

Workflow engines manage durable execution, retries, callbacks, approvals, and state transitions.

```text
Workflow state:
  The process is at step N.

Cognitive packet:
  This is what is understood, decided, assumed, constrained, traceable, and next actionable.
```

## 4.5 Tracing

Execution traces record what happened. They are primarily retrospective.

```text
Trace:
  What happened.

Cognitive packet:
  What can be continued.
```

## 4.6 Continuations

In programming language theory, a continuation represents the rest of a computation. In Scheme, `call/cc` captures the current continuation as a first-class value.

A cognitive packet does not capture a runtime stack. It externalizes enough cognitive state to allow another actor to continue work across process, tool, agent, or conversation boundaries.

```text
Runtime continuation:
  The rest of computation.

Cognitive packet:
  The next resumable state of cognitive work.
```

## 4.7 Self-description and bootstrapping

A self-describing packet resembles a small bootloader or protocol header. It carries enough of the convention to let an otherwise unprepared receiver interpret the packet and produce a new one.

The analogy must remain limited. A self-describing packet is not self-executing code and must not be treated as trusted instruction. It is an inspectable payload with a protocol header.

---

# 5. Definition

A **cognitive packet** is a structured unit of cognitive work designed to be transmitted between humans, artificial agents, tools, or repositories.

It is composed of two layers:

- an **envelope** — kind-agnostic metadata that any receiver can read without interpreting the inner work: protocol header, provenance, transmission mode, context reference, routing, and traces;
- a **payload** — kind-specific cognitive content, validated by an agent that understands the declared kind.

Unlike a message, it is not merely communicative.  
Unlike a trace, it is not merely retrospective.  
Unlike a task, it is not merely imperative.  
Unlike a prompt, it is not merely instructive.

It carries enough state to allow another actor to:

- resume;
- critique;
- route;
- validate;
- reject;
- archive;
- branch;
- or convert the work into another operational form.

Minimal definition (v0.3):

> A cognitive packet is a transport-neutral pair of an envelope (kind-agnostic metadata) and a payload (kind-specific cognitive content), together carrying the state required to resume, critique, or route cognitive work.

Extended definition:

> A **self-describing** cognitive packet is one whose envelope also carries the minimal convention required to interpret the packet and produce another one after resumption.

The two layers serve different cooperative roles. A routing agent — a workflow engine, a human dispatcher, a bot — needs only the envelope to validate, queue, dispatch, archive, or acknowledge the packet. Only an agent capable of handling the declared kind needs to interpret the payload. New kinds may be added without changing the envelope.

---

# 6. Transmission Modes

## 6.1 Transmission by copy

Transmission by copy embeds the necessary context.

It is used when the receiver may not share the original context.

Examples:

- moving from one AI conversation to another;
- creating a standalone todo item;
- opening a GitHub issue for another contributor;
- emailing a task to a person;
- handing work to an agent without access to the original conversation;
- archiving a decision point for future recovery.

A packet transmitted by copy is heavier but portable.

```text
Use by-copy transmission when portability matters more than brevity.
```

## 6.2 Transmission by reference

Transmission by reference assumes a shared, stable, accessible context.

It is used when the receiver can dereference the context.

Examples:

- same conversation;
- same repository;
- same issue thread;
- same document;
- same task system;
- same workflow run;
- same corpus.

A packet transmitted by reference is lighter but depends on context validity.

```text
Use by-reference transmission when the context is actually shared and stable.
```

## 6.3 Programming analogy

The distinction mirrors parameter passing in programming:

```text
By copy:
  like pass by value;
  the packet embeds the data required for resumption.

By reference:
  like pass by reference;
  the packet carries a pointer to shared context.
```

## 6.4 Safety rule

If there is doubt about whether the receiver can dereference the context, transmit by copy.

```text
When in doubt, copy the context.
```

A by-reference cognitive packet with an invalid context is the cognitive equivalent of a dangling pointer.

---

# 7. Self-Describing Packets

A cognitive packet may be **self-describing**.

A self-describing packet carries not only the state required to resume work, but also the minimal convention required to understand the packet and produce a new packet after resumption.

This property is especially important for copy/paste transmission. If a packet is pasted into a new conversation, sent to another human, inserted into a todo item, or forwarded to an unknown agent, the receiver may not know the continuation protocol in advance.

A self-describing packet solves this by embedding a short protocol header.

## 7.1 Definition

> A cognitive packet is self-describing when its **envelope** carries the minimal convention required to interpret the packet and produce another one. The **payload** still carries the resumable work state (or the equivalent kind-specific content).

This makes the packet **copy/paste propagable**. The receiver can:

1. read the envelope and understand the convention (without prior tooling);
2. dispatch to the right handler based on `envelope.packet_kind`;
3. resume, critique, route, or archive the payload accordingly;
4. produce a new packet — envelope conventions copied, payload composed.

Because self-description lives in the envelope, it travels with every packet kind, not only continuations. The protocol convention therefore travels with any cognitive work, not only with work-state to resume.

## 7.2 Protocol header

A minimal protocol header may read:

```markdown
## Protocol Header

This block is a cognitive packet: a structured unit of cognitive work intended to let a human, AI agent, tool, or repository resume work.

It is not an ordinary summary. It distinguishes established state, decisions, assumptions, constraints, next action, traces, and resumption risks.

Two transmission modes exist:
- by copy: the necessary context is embedded in the packet;
- by reference: the packet points to a shared, stable, accessible context.

After using this packet, the receiver may produce a new cognitive packet according to the same convention.

Self-describing does not mean self-validating: the receiver must still verify the packet's claims, references, assumptions, and decisions.
```

## 7.3 Propagation by copy/paste

A self-describing packet can propagate through ordinary human operations:

```text
conversation → packet → copy/paste → new conversation → new packet → issue → agent → packet
```

No central server is required.  
No agent runtime is required.  
No protocol registry is required.

The minimal carrier is still copy/paste.

This is not meant as hidden automation. It is a disciplined form of protocol diffusion through explicit, inspectable, human-readable payloads.

## 7.4 Non-validation rule

Self-description must not create false authority.

```text
Self-describing does not mean self-validating.
```

A packet can correctly describe how it should be read while still containing:

- mistaken assumptions;
- stale references;
- incorrect decisions;
- hallucinated context;
- incomplete constraints;
- unsafe next actions.

The receiver remains responsible for validation.

## 7.5 When to include the protocol header

The protocol header is an envelope field. Recommended rule:

```text
A by-copy packet SHOULD include the protocol header field in its envelope
when the receiver may not already know the convention.
```

A by-reference packet MAY omit the header if the protocol is already part of the shared context.

However, if a by-reference packet may leave its original context, the envelope should either include the header or the packet should be converted into a by-copy form.

---

# 8. Packet Structure: Envelope and Payload

A cognitive packet has two layers:

```text
┌──────────────────────────────────────────────────────────────┐
│ ENVELOPE  — kind-agnostic; readable by any receiver          │
│  protocol_header · transmission_mode · packet_kind · status  │
│  self_describing · provenance · context_ref · routing        │
│  traces                                                      │
├──────────────────────────────────────────────────────────────┤
│ PAYLOAD   — kind-specific; readable by an agent of that kind │
│  (shape depends on packet_kind; see §10)                     │
└──────────────────────────────────────────────────────────────┘
```

A routing agent — human dispatcher, workflow engine, queue manager — validates and dispatches by reading the envelope alone. Only an agent capable of handling the declared kind interprets the payload.

## 8.1 Envelope schema

The envelope is the same across all packet kinds. Minimal Markdown form:

```markdown
# COGNITIVE PACKET

## Envelope

packet_kind: continuation | objection | hypothesis | decision | failure | routing
transmission_mode: copy | reference
status: draft | active | completed | failed | superseded
self_describing: true | false

### Protocol Header
Required for by-copy packets when the receiver may not know the protocol.

### Provenance
Who emitted this packet, when, and (optionally) under what authority.

### Context Reference
Project, conversation, repository, parent packet, predecessor chain.

### Routing
(Optional) Intended receiver(s) and response channel.

### Traces
Sources, files, links, commits, conversations, identifiers, prior packets.
```

## 8.2 Payload schema

The payload shape depends on `envelope.packet_kind`. See §10 for the six kinds defined in this paper.

Generic Markdown form (the actual fields vary by kind):

```markdown
## Payload

### Object
What is being worked on.

### State
What is already established.

### Decisions
What has already been decided and should not be reopened without cause.

### Constraints
Rules, limits, preferences, deadlines, budgets, risk boundaries.

### Assumptions
What is plausible but not yet verified.

### Next Action
The next small useful action (continuation kind).

### Resumption Risks
What a receiver is likely to misunderstand.
```

## 8.3 Validation in two layers

A receiver validates the envelope independently of the payload:

```text
1. Parse envelope (always present, kind-agnostic).
2. Read envelope.packet_kind.
3. Dispatch to the payload validator for that kind.
4. The payload validator runs only on the inner content.
```

This separation means new payload kinds may be added — and new validators written — without touching the envelope or any existing payload validator. It also means a router that does not understand a given kind can still queue, archive, or forward the packet without misinterpreting it.

This is intentionally small. Additional fields may be added to either layer for specific environments.

---

# 9. JSON Representation

A minimal machine-readable representation makes the envelope/payload structure explicit:

```json
{
  "type": "cognitive_packet",
  "version": "0.3",
  "envelope": {
    "packet_kind": "continuation",
    "transmission_mode": "copy",
    "status": "active",
    "self_describing": true,
    "protocol_header": "This is a cognitive packet: a structured unit of cognitive work intended to let a receiver resume work and produce a new packet after resumption. Self-describing does not mean self-validating.",
    "provenance": {
      "actor": "jhrobert",
      "ts": "2026-05-21T10:14:00Z"
    },
    "context_ref": {
      "repo": "cogentia",
      "document": "research/cognitive_packets.md",
      "predecessor": null
    },
    "routing": {
      "agent": "*",
      "response_channel": "cogentia packet ingest <id>"
    },
    "traces": [
      { "type": "path", "value": "cogentia/research/cognitive_packets.md" }
    ]
  },
  "payload": {
    "object": "Define cognitive packets as an envelope/payload pair.",
    "state": [
      "Agent protocols standardize communication and tool access.",
      "They do not fully specify the cognitive unit required for reliable resumption."
    ],
    "decisions": [
      "This is not positioned as a replacement for A2A or MCP.",
      "The paper remains technical and narrowly scoped.",
      "v0.3 adopts an envelope/payload split."
    ],
    "constraints": [
      "Avoid broad AI safety claims.",
      "Keep the schema transport-neutral.",
      "Support both humans and artificial agents."
    ],
    "assumptions": [
      "A two-layer schema improves handoffs across agents and tools."
    ],
    "next_action": "Refine the kind-specific payload schemas and test them on copy/paste, GitHub issue, and CLI continuation use cases.",
    "resumption_risks": [
      "Confusing the envelope with the payload.",
      "Treating the protocol header as validation of payload content."
    ]
  }
}
```

The same packet validates in two phases: envelope first, then payload according to `envelope.packet_kind`.

---

# 10. Payload Kinds

The envelope is the same for every packet. The **payload** schema depends on `envelope.packet_kind`. Six kinds are defined in this paper. Others may be added without modifying the envelope.

## 10.1 Continuation payload — `packet_kind: continuation`

Purpose:

> Continue this work from the current state.

Required payload emphasis:

- current state;
- decisions;
- constraints;
- next action.

This is the canonical payload of `cogentia.continuation.v1` — see §12.

## 10.2 Objection payload — `packet_kind: objection`

Purpose:

> Convert an objection into a first-class contribution.

Required payload emphasis:

- target claim;
- objection;
- falsifiable form;
- evidence required;
- expected effect if validated.

## 10.3 Hypothesis payload — `packet_kind: hypothesis`

Purpose:

> Preserve a possibility to be tested.

Required payload emphasis:

- hypothesis;
- test method;
- expected observations;
- falsification criteria.

## 10.4 Decision payload — `packet_kind: decision`

Purpose:

> Record a decision and the basis for it.

Required payload emphasis:

- decision;
- alternatives considered;
- rationale;
- authority or accountable party;
- reversibility.

## 10.5 Failure payload — `packet_kind: failure`

Purpose:

> Preserve a failed branch as useful knowledge.

Required payload emphasis:

- branch attempted;
- failure condition;
- evidence;
- recoverability;
- suggested next branch.

## 10.6 Routing payload — `packet_kind: routing`

Purpose:

> Send work to an appropriate actor.

Required payload emphasis:

- destination role;
- required capability;
- context;
- expected output schema.

---

# 11. Continuation Packets — A Worked Example

The continuation kind is the most important for human–AI cooperation. This section gives the by-copy and by-reference templates with the envelope and the payload made explicit.

## 11.1 By-copy continuation packet

```markdown
# COGNITIVE PACKET — CONTINUATION — BY COPY

## Envelope

packet_kind: continuation
transmission_mode: copy
status: active
self_describing: true

### Protocol Header

This block is a cognitive packet of kind continuation: a structured unit of cognitive work intended to let a human, AI agent, tool, or repository resume work.

It is not an ordinary summary. The envelope carries metadata any receiver can read; the payload carries the work state.

Two transmission modes exist:
- by copy: the necessary context is embedded;
- by reference: the packet points to a shared, stable, accessible context.

After using this packet, the receiver may produce a new cognitive packet according to the same convention.

Self-describing does not mean self-validating.

### Provenance
...

### Context Reference
...

### Routing
...

### Traces
...

## Payload

### Object
...

### State
...

### Decisions
...

### Constraints
...

### Assumptions
...

### Next Action
...

### Resumption Risks
...
```

## 11.2 By-reference continuation packet

```markdown
# COGNITIVE PACKET — CONTINUATION — BY REFERENCE

## Envelope

packet_kind: continuation
transmission_mode: reference
status: active

### Context Reference
...

### Routing
...

### Fallback
If the referenced context is unavailable, request or produce a continuation packet by copy.

## Payload

### Resumption Point
...

### Decisions to Preserve
...

### Immediate Constraints
...

### Next Action
...

### Vigilance
...
```

A by-reference continuation packet is valid only if the context reference is dereferenceable by the receiver. The envelope's `Fallback` field makes the recovery path explicit when it is not.

---

# 12. Relation to Agent-Resumable CLI

Agent-Resumable CLI is a concrete technical pattern for command-line tools that need external judgment. A CLI tool reaches a point where deterministic execution is insufficient. Instead of embedding an AI provider, it emits a typed continuation object. A surrounding actor supplies a structured result. The tool validates the result against an expected schema and resumes.

The protocol that formalises this is `cogentia.continuation.v1`, specified in [Agent-Resumable CLI](agent_resumable_cli.md) and implemented in `scripts/cogentia.js continuation`.

## 12.1 Mapping

In v0.3 terms, the `cogentia.continuation.v1` object **is the canonical payload** of a cognitive packet whose `envelope.packet_kind = continuation`. The two are aligned by construction:

```text
.cogentia/continuations/<id>.json    ← strict CLI continuation (payload only)

When transported (copy/paste, GitHub issue, prompt, file):
                ↓
{
  "type": "cognitive_packet",
  "version": "0.3",
  "envelope": {
    "packet_kind": "continuation",
    "transmission_mode": "copy",
    "provenance":   { ... },
    "context_ref":  { ... },
    "routing":      { "response_channel": "cogentia continuation resume <id>" },
    "traces":       [ ... predecessor chain, audit refs ... ]
  },
  "payload": {                       ← the existing continuation object
    "task":                    "...",
    "context":                 { ... },
    "expected_result_schema":  { ... },
    "constraints":             { ... }
  }
}
```

No semantic change to `cogentia.continuation.v1`. The wrapper provides a transport envelope when the continuation leaves the CLI runtime.

## 12.2 Two surfaces, one protocol

```text
Agent-Resumable CLI (cogentia.continuation.v1):
  tool emits continuation → judge supplies step_result → tool resumes

Cognitive Packets (this paper, v0.3):
  actor emits packet → receiver routes, validates, queues, resumes, critiques, archives, or branches
```

The CLI runtime stays strict (typed `expected_result_schema`, validated `step_result`). The packet wrapper is what lets a human paste the continuation into another medium without losing the metadata required to resume it elsewhere.

## 12.3 Stricter validation for CLI payloads

A continuation payload originating from a CLI runtime carries stricter requirements than a continuation payload composed by hand:

```json
{
  "expected_result_schema": {},
  "resume_command":         "cogentia continuation resume <id> <step_result.json>",
  "validation_rules":       [],
  "constraints":            {}
}
```

These fields are payload-level, kind-specific. They do not change the envelope.

---

# 13. Relation to Cogentia and the Second Method

Cogentia treats repositories, documents, objections, indexes, and traces as infrastructure for distributed knowledge production.

The second method requires that the process be made inspectable, not only the final result. Objections must become first-class contributions. Documents must be structured for human and machine readability. The corpus must become its own evidence.

Cognitive packets provide a minimal unit for that process.

They make intermediate states explicit:

- a claim waiting for verification;
- an objection waiting for conversion;
- a decision waiting for review;
- a continuation waiting for another actor;
- a failed branch waiting to be archived;
- a possibility waiting to be tested.

In this sense, a cognitive packet is not a publication unit. It is a **work-continuation unit**.

Cogentia can store, index, route, and audit such units.

Self-describing packets add one additional property to Cogentia: the convention can circulate with the work state. A packet copied from a Cogentia repository into an ordinary conversation can teach the receiver enough of the protocol to produce a new compatible packet.

---

# 14. Use Cases

## 14.1 Conversation-to-conversation handoff

A user asks an AI agent:

```text
Produce a continuation packet by copy.
```

The user copies the result into another AI conversation.

The receiving agent can resume work without reconstructing the entire prior conversation. If the packet is self-describing, the receiving agent can also produce a new continuation packet afterward.

## 14.2 Conversation-to-todo handoff

A user asks for a packet by copy and pastes it into a todo system.

The todo item contains enough context to be actionable later.

## 14.3 Conversation-to-GitHub issue

A packet becomes an issue body.

The issue is no longer a vague task. It carries state, decisions, assumptions, constraints, and next action.

## 14.4 Agent-to-agent handoff

Agent A produces a packet for Agent B.

The packet specifies the required capability and expected output schema.

## 14.5 CLI-to-human judgment

A CLI emits a continuation packet.

The human supplies a structured decision.

The CLI validates and resumes.

## 14.6 Objection workflow

An informal objection is converted into an objection packet.

The packet becomes reviewable, answerable, and archivable.

## 14.7 Failure preservation

An attempted branch fails.

The failure is preserved as a failure packet, preventing hidden retry loops and repeated dead ends.

## 14.8 Protocol propagation

A self-describing packet is pasted into a new AI conversation.

The receiving agent reads the protocol header, resumes the task, and later emits a new compatible packet.

---

# 15. Minimal Prompt Contract

A human can initialize a conversation with the following contract:

```markdown
Apply the cognitive packet continuation protocol in this conversation.

A cognitive packet is a structured unit of cognitive work intended to let a human, AI agent, tool, or repository resume work.

It is not an ordinary summary. It distinguishes established state, decisions, assumptions, constraints, next action, traces, and resumption risks.

Two transmission modes exist:
- by copy: the necessary context is embedded;
- by reference: the packet points to a shared, stable, accessible context.

When I ask for a "continuation by copy", produce a standalone self-describing packet that can be pasted into another conversation, todo list, issue, document, tool, or repository.

When I ask for a "continuation by reference", produce a shorter situated packet that assumes the receiver shares the current context.

Do not produce an ordinary summary. Produce a resumable object.

Self-describing does not mean self-validating. The receiver must still verify the packet's claims, references, assumptions, and decisions.

If the referenced context is not stable or not available to the receiver, say so and produce a continuation by copy instead.
```

This prompt contract is intentionally compatible with ordinary copy/paste.

---

# 16. Invariants

A cognitive packet should satisfy the following invariants.

## 16.1 Resumability

A receiver must be able to identify the next useful action.

## 16.2 Boundary clarity

Facts, decisions, assumptions, and constraints must not be merged.

## 16.3 Provenance

The packet must expose where its state comes from or what it depends on.

## 16.4 Mode clarity

The packet must indicate whether it is transmitted by copy or by reference.

## 16.5 Reference validity

A by-reference packet must point to a context the receiver can access.

## 16.6 Minimality

The packet must carry enough state, but not attempt to reproduce the entire corpus.

## 16.7 Reversibility awareness

The packet should indicate whether the next action is reversible when relevant.

## 16.8 Human accountability for binding actions

If the packet leads to a binding or destructive action, the causal chain to a responsible human must be explicit.

## 16.9 Self-description without self-validation

When a packet includes a protocol header, the receiver must still verify the packet's content. The header explains how to continue; it does not certify truth.

---

# 17. Anti-Patterns

## 17.1 Summary masquerading as continuation

A summary describes. A continuation enables work.

Bad:

```text
We discussed cognitive packets and compared them to A2A.
```

Better:

```text
Next action: refine the packet schema to keep it transport-neutral and avoid positioning it as a competitor to A2A.
```

## 17.2 Context-free task

Bad:

```text
Write the article.
```

Better:

```text
Write section 8 comparing cognitive packets to Agent-Resumable CLI, preserving the distinction between payload and runtime.
```

## 17.3 Invalid reference

Bad:

```text
Continue from what we said earlier.
```

Better:

```text
Context reference: current conversation, section where pass-by-copy/pass-by-reference distinction was introduced. If unavailable, use by-copy packet instead.
```

## 17.4 Decision hidden as assumption

Bad:

```text
Assume A2A is insufficient.
```

Better:

```text
Decision: do not present cognitive packets as competing with A2A. Assumption: A2A does not prescribe a minimal cognitive continuation payload.
```

## 17.5 Overloaded packet

A packet that attempts to carry an entire essay defeats its own purpose.

A packet should be sufficient for resumption, not exhaustive.

## 17.6 Protocol header as authority marker

Bad:

```text
This packet says it is valid because it follows the protocol.
```

Better:

```text
This packet follows the protocol format, but its claims, references, and decisions remain subject to verification.
```

---

# 18. Compatibility Matrix

| Layer | Examples | Relation to cognitive packets |
|---|---|---|
| Transport | HTTP, JSON-RPC, REST, gRPC, copy/paste | Can carry packets |
| Agent-to-agent | A2A, ACP-like protocols | Can use packets as message/task/artifact payloads |
| Tool access | MCP | Can provide resources referenced by packets |
| Runtime orchestration | LangGraph, AutoGen, CrewAI, OpenAI Agents SDK | Can produce, route, consume, and trace packets |
| Workflow engines | Temporal, Step Functions, Airflow, Prefect | Can store packets as durable state or approval payloads |
| Developer platforms | GitHub issues, pull requests, commits | Can archive and review packets |
| Knowledge commons | Cogentia repositories | Can index, link, audit, and evolve packets |
| Human operations | email, todo list, chat | Can use packets directly by copy/paste |

---

# 19. Security and Reliability Considerations

## 19.1 Prompt injection

If a packet contains untrusted content, the receiver must distinguish packet metadata from embedded source material.

Recommended field:

```json
{
  "trusted_fields": ["object", "constraints", "next_action"],
  "untrusted_payload_fields": ["quoted_source", "external_message"]
}
```

## 19.2 Provenance ambiguity

A packet should avoid vague references such as "as discussed".

Use stable references when possible:

- file path;
- commit hash;
- issue URL;
- conversation title or export identifier;
- document section;
- timestamp;
- packet ID.

## 19.3 Stale references

By-reference packets should expire or declare context assumptions.

```json
{
  "reference_validity": {
    "context": "same conversation",
    "expires": "end_of_session",
    "fallback": "request by-copy continuation"
  }
}
```

## 19.4 Over-trust in generated packets

A generated packet is not automatically true. It is a structured claim about state.

Receivers may validate:

- whether decisions were actually taken;
- whether assumptions are still open;
- whether references exist;
- whether constraints are complete;
- whether the next action follows.

## 19.5 Binding action boundary

A packet may recommend action, but it should not hide authorization.

For destructive, financial, legal, political, or irreversible operations, require explicit human acceptance.

## 19.6 Self-propagation risk

Self-describing packets can propagate the protocol convention, but also malformed or misleading state.

Receivers should treat incoming packets as structured but untrusted until checked.

---

# 20. Evaluation Criteria

The usefulness of cognitive packets can be tested without claiming broad theoretical success.

Possible evaluation questions:

1. Does a receiver resume faster with a packet than with a raw transcript?
2. Does the receiver make fewer false assumptions?
3. Are decisions less often reopened unnecessarily?
4. Are hypotheses less often confused with established facts?
5. Are todo items more executable after delay?
6. Are GitHub issues more actionable?
7. Are agent handoffs less verbose?
8. Are failures better preserved?
9. Are references more often valid?
10. Can packets be converted between Markdown and JSON reliably?
11. Can self-describing packets propagate the protocol convention across unrelated agents?

Minimal experiment:

```text
Input:
  A long conversation about a technical design.

Conditions:
  A. Receiver gets raw transcript.
  B. Receiver gets ordinary summary.
  C. Receiver gets cognitive packet by copy.
  D. Receiver gets self-describing cognitive packet by copy.
  E. Receiver gets cognitive packet by reference plus access to shared context.

Measure:
  time to resume;
  number of clarification questions;
  number of wrong assumptions;
  fidelity to decisions;
  quality of next action;
  ability to produce a valid new packet.
```

---

# 21. Limitations

Cognitive packets do not solve all multi-agent problems.

They do not provide:

- authentication;
- transport security;
- scheduling;
- resource allocation;
- ontology alignment;
- trust negotiation;
- model evaluation;
- general governance;
- AI safety guarantees.

They are a small mechanism for preserving cognitive continuity.

Their practical value depends on discipline:

- fields must be filled accurately;
- references must be valid;
- packets must not become bloated;
- receivers must validate what they receive;
- systems must not confuse packet structure with truth.

Self-description adds portability, not truth.

---

# 22. Future Work

## 22.1 Schema formalization

Define a JSON Schema for cognitive packets.

## 22.2 Markdown-to-JSON conversion

Provide a parser that converts minimal Markdown packets into JSON.

## 22.3 Cogentia integration

Add Cogentia commands:

```bash
cogentia packet new
cogentia packet validate
cogentia packet index
cogentia packet convert
cogentia packet route
```

## 22.4 GitHub issue templates

Create issue templates for:

- continuation packet;
- objection packet;
- hypothesis packet;
- failure packet.

## 22.5 CLI continuation bridge

Map Agent-Resumable CLI continuation objects to cognitive packets.

## 22.6 Packet IDs and provenance

Define stable packet IDs, possibly based on content hash plus context reference.

## 22.7 Evaluation corpus

Create benchmark conversations and compare raw transcript, summary, and cognitive packet handoffs.

## 22.8 Propagation experiments

Test whether self-describing packets can be copied into unrelated AI systems and still cause receivers to produce valid continuation packets.

---

# 23. Conclusion

Existing agent protocols and frameworks increasingly solve transport, tool access, orchestration, and tracing.

They do not fully solve the smaller but pervasive problem of cognitive resumability.

A cognitive packet addresses that gap.

It is a minimal unit of structured cognitive work, transport-neutral, readable by humans and machines, designed to be copied, referenced, routed, resumed, critiqued, validated, archived, or branched.

Version 0.2 added that a packet transmitted by copy can be self-describing — carrying not only the work state but also the minimal convention needed to produce another packet.

Version 0.3 makes the structure explicit. A cognitive packet has two layers:

```text
Envelope:
  kind-agnostic metadata — readable by any receiver,
  routing-sufficient by itself.

Payload:
  kind-specific cognitive content — readable by an agent
  capable of handling the declared kind.
```

The two-layer structure is what makes inter-agent cooperation tractable: a dispatcher can route, queue, archive, or acknowledge a packet by reading the envelope alone, leaving the cognitive interpretation of the payload to whoever can handle the declared kind. New kinds may be added without changing the envelope.

The essential distinction remains simple:

```text
By copy:
  transmit the context.

By reference:
  transmit a pointer to shared context.
```

The essential rule remains equally simple:

```text
When in doubt, copy the context.
```

The v0.2 rule still holds:

```text
Self-describing does not mean self-validating.
```

And the v0.3 rule is:

```text
The envelope is for routers; the payload is for handlers.
A receiver can ignore the payload, but never the envelope.
```

A message communicates.  
A task requests.  
A trace records.  
A cognitive packet enables continuation.  
A self-describing cognitive packet also propagates the convention of continuation.  
And in v0.3, a cognitive packet *cleanly separates routing from interpretation* — so cooperation can scale across agents that do not all share the same competencies.

---

# References and Pointers

This working paper is designed to be compatible with, not competitive with, existing agent infrastructure.

- Agent2Agent Protocol specification: https://agent2agent.info/specification/core/
- Model Context Protocol specification: https://modelcontextprotocol.io/
- OpenAI Agents SDK tracing documentation: https://openai.github.io/openai-agents-python/tracing/
- LangGraph persistence documentation: https://docs.langchain.com/oss/javascript/langgraph/persistence
- Agent-Resumable CLI, working paper by the same author.
- Discours de la seconde méthode, working paper by the same author.

---

# Appendix A — Ultra-Minimal Packet

```markdown
# COGNITIVE PACKET

mode: copy | reference
self_describing: true | false

Protocol header:
Object:
State:
Decisions:
Constraints:
Assumptions:
Next action:
Traces:
Risks:
```

---

# Appendix B — Conversation Commands

Suggested commands for human users:

```text
Continuation by copy.
Continuation by reference.
Cognitive packet by copy.
Cognitive packet by reference.
Self-describing continuation by copy.
Objection packet.
Failure packet.
Decision packet.
Hypothesis packet.
```

French equivalents:

```text
Continuation par copie.
Continuation par référence.
Paquet cognitif par copie.
Paquet cognitif par référence.
Continuation auto-descriptive par copie.
Paquet d’objection.
Paquet d’échec.
Paquet de décision.
Paquet d’hypothèse.
```

# Appendix C — Known Uses

Cognitive packets are not novel as a family. Several mature patterns in adjacent domains carry continuation payloads with structured fields, optimized for handoff under time pressure or across role boundaries. Listing them is part of the pattern: a pattern is validated, in the Alexandrian sense, by recurrence.

## SBAR — healthcare handoffs

**Situation / Background / Assessment / Recommendation.** Developed for handoffs on US Navy nuclear submarines, adapted for clinical use by Michael Leonard, Doug Bonacum and Suzanne Graham at Kaiser Permanente Colorado in 2002. Now endorsed by the Joint Commission, AHRQ, IHI, and the WHO; used in the majority of US hospitals and widely abroad. Mapping: Situation → Object + State; Background → Context + Traces; Assessment → Decisions + Assumptions; Recommendation → Next Action. SBAR has no explicit "Resumption Risks" field — this is one place where cognitive packets extend the pattern.

## ADR — Architecture Decision Records

**Context / Decision / Status / Consequences.** Introduced by Michael Nygard in a November 2011 blog post ("Documenting Architecture Decisions") and now widely adopted across software teams (Thoughtworks Technology Radar Adopt category, AWS Prescriptive Guidance, UK Government Digital Service). Stored as Markdown files in the project repository, versioned with the code. Nygard explicitly describes an ADR as "a short text file in a format similar to an Alexandrian pattern". Mapping: Context → State + Constraints; Decision → Decisions; Status → packet status field; Consequences → Resumption Risks + Reversibility. ADRs are the closest existing precedent for a Decision Packet (§10.4).

## AAR — After Action Review

**What was supposed to happen / What actually happened / Why / What to do next.** Originating in US Army training doctrine in the 1970s–80s, now standard in emergency management, corporate retrospectives, and incident response. Mapping: the four AAR questions correspond directly to State, Traces, Decisions, and Next Action. AARs are the closest existing precedent for a Failure Packet (§10.5).

## OPORD — Military Operations Order

**Situation / Mission / Execution / Sustainment / Command & Signal.** Standard five-paragraph format in US and NATO military doctrine for issuing operational orders. Designed so that a unit receiving an OPORD has enough state to execute without further clarification — a full continuation-by-copy packet for a hierarchical, time-pressured context. The execution paragraph is structured around commander's intent and concept of operations, close to packet-level Decisions and Next Action.

## Aviation cockpit handover briefing

**Who has control / aircraft state / weather and traffic / fuel and time / open items.** Standardized as part of Crew Resource Management (CRM) from the 1980s onward, following NTSB analyses of communication-failure accidents (notably post-Tenerife 1977). Each handover transfers a continuation payload covering current state, decisions taken, constraints active, and items requiring resumption. Notable for explicit attention to what the receiver is likely to misjudge — a direct analogue to the Resumption Risks field.

## Incident postmortems

**Timeline / Impact / Root cause / What went well / What went poorly / Action items.** Codified in the Google SRE book and now standard practice across operations and platform teams. Postmortems carry state forward from a failed branch, preserving it as actionable knowledge for the next attempt. Mapping: combined Failure Packet (§10.5) and Continuation Packet (§10.1) — exactly the combination cognitive packets are designed to express.

## Conventional Commits and well-formed Git commit bodies

**Type / Scope / Subject / Body / Footers.** Specified at conventionalcommits.org and widely adopted in software repositories. A well-formed commit body answers what changed, why, and what the reviewer should attend to — a miniature continuation packet attached to each unit of code change, versioned with the work itself.

## Common pattern

All seven cases share:

- a small fixed set of named fields;
- enough state for the receiver to act without re-fetching context;
- an institutional cost paid for skipping the format (medical errors, lost architectural rationale, repeated incidents, ambiguous orders, broken bisects);
- a culture that treats writing the packet as a professional responsibility, not as overhead.

Cognitive packets generalize this family to the case where the receiver may be an AI agent and the producer may be an AI agent, while keeping the same minimal commitment: structured fields, sufficient state, named cost for skipping.

The novelty of cognitive packets is therefore not the existence of the pattern, but two specific extensions: the **Resumption Risks** field (absent from SBAR, AAR, ADR, OPORD) and the **self-describing protocol header** that makes the convention propagable by copy/paste to receivers who do not yet know it.


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Agent Navigation Guide (Context Server)](../docs/agent_context_server.md)
- [Agent-Resumable CLI](agent_resumable_cli.md)
- [Cogentia Commons](cogentia_commons_method_packets.md)
- [cogentia.js — Tutorial and Near-Specification](cogentia_js_tutorial.md)
- [The Sovereign Digital Twin: Cogentia, Cogentigram, Cogentiscope](cogentia-digital-twin.md)
- [Cogentigraphic Distillation](cogentigraphic_distillation.md)
- [Concept Index — cogentia](concepts.md)
- [Corpus Status — cogentia](corpus-status.md)
- [Research Index — Cogentia](index.md)
- [Pipeline](pipeline.md)
- [Trail: From Method to Machine](trails/from_method_to_machine.md)

<!-- END_AUTO: backlinks -->
