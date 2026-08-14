---
title: "Portable Continuations and Judgment Boundaries"
subtitle: "Provider-neutral cooperation from copy/paste to MCP and A2A"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-14"
version: "0.1"
status: "working-note"
language: "en"
document_role: "source"
document_kind: "doctrinal-note"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
related_documents:
  - "research/agent_resumable_cli.md"
  - "research/cogentia_continuation_packet_routing.md"
  - "research/cognitive_packets.md"
  - "research/administrative_burden_and_exemplar_tests.md"
  - "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/docs/website/guide-chatbot-agile-plan.md"
tags:
  - continuation
  - inversion-of-control
  - judgment-boundary
  - multi-agent
  - mcp
  - a2a
  - clipboard
  - provider-neutral
---

# Portable Continuations and Judgment Boundaries

## Core rule

> **Determinism until judgment; Continuation at the boundary.**

A deterministic or specialized capability should perform all work it can reliably determine. When it reaches a point where semantic, normative, contextual, or otherwise external judgment is required, it should not silently embed a particular intelligence provider. It should expose the unresolved judgment as a continuation.

```text
tool / service
    ↓ deterministic work
judgment boundary
    ↓
Continuation
    ↓
external judge
    ↓
StepResult
    ↓
resume
```

This is the general form of the Inversion of Control developed in `agent_resumable_cli.md`.

## Logical protocol vs transport

The logical protocol is:

```text
Continuation → Judgment → StepResult → Resume
```

The transport is an independent concern:

```text
clipboard
file
QR / portable text
email
HTTP
MCP
A2A
message queue
Cognitive Packet network
```

Therefore:

> **Copy/paste is already a valid continuation transport.**

This matters because a useful multi-agent protocol can be deployed before any machine-to-machine integration exists.

## UX form

A minimal service can expose:

```text
[Copy continuation for your agent]
```

The user pastes the packet into ChatGPT, Claude, Gemini, a local model, another Digital Twin, or a human workflow. The external judge returns a typed or constrained result, which can be pasted back:

```text
[Paste StepResult]
```

The service validates the result and resumes.

The FractaVolta public Guide already implements a lightweight version of this pattern through "Approfondir avec votre propre agent": portable context is transferred to the visitor's agent, which can return a useful next question to the Guide.

## Frugality and federation

The architecture avoids embedding a large model in every specialized service.

```text
many lightweight specialized capabilities
        ↓
explicit judgment boundaries
        ↓
shared / replaceable general intelligence
```

A service can therefore contribute domain-specific retrieval, deterministic processing, provenance, scoring, schemas, and validation while the user supplies general reasoning capacity through an agent they already use.

The external judge is replaceable. The specialized service does not need to know which provider performs the judgment.

This supports:

- provider neutrality;
- low marginal service cost;
- user choice;
- human substitution;
- offline or local-agent operation;
- gradual migration from manual transport to MCP or A2A;
- auditable judgment boundaries.

## JHN service pattern

For Agent JHN services:

```text
JHN capability
  ↓
retrieve / normalize / calculate / trace
  ↓
can continue deterministically?
  ├─ yes → continue
  └─ no  → emit Continuation
              ↓
          user's agent
              ↓
           StepResult
              ↓
             JHN resumes
```

John provides the specialized capability; the user's environment provides replaceable judgment when needed.

This is not merely outsourced compute. It is a generic cooperation protocol among heterogeneous agents and deterministic services.
