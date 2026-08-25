---
title: "Human Copy/Paste Transport"
status: experimental
kind: pattern
schema: cogentia.pattern/v1
id: human-copy-paste-transport
aliases:
  - "Transport Universel par Copier/Coller"
  - "Human Copy/Paste Transport"
  - "Lowest-Common-Denominator Cognitive Bridge"
  - "Version-0 Transport"
document_role: operational
visibility: public
lifecycle_state: experimental
tags:
  - pattern
  - orchestration
  - human-in-the-loop
  - cognitive-packets
  - interoperability
  - version-0
---

# Human Copy/Paste Transport

> **Human copy/paste is universal low-tech transport; structured protocols are automated scale.**

## Context

In multi-agent and heterogeneous software environments, autonomous agents, proprietary web interfaces, local IDEs, and external services often lack direct network connectivity, mutual API authentication, or unified protocol adapters. 

## Forces

- **Protocol development is expensive before semantics stabilize**: Hardwiring API integrations, OAuth handshakes, and custom MCP/A2A bridges for unstable workflows creates premature coupling and fragile infrastructure.
- **Heterogeneous boundaries isolate cognition**: Frontier models (e.g. web chats) frequently operate in walled gardens with no direct socket to local development environments.
- **Human judgment is inherently situated**: The human operator sits naturally at the intersection of all user interfaces and clipboard buffers.
- **Friction has epistemic value**: Manual routing forces the human operator to observe the payload, check sanity, and filter drift before execution.

## Resolution

Treat manual human copy/paste as the first-class, lowest-common-denominator transport layer for self-describing cognitive artifacts:

```text
[ Agent / Service A ]
         |
         | (Emits self-describing Markdown/JSON packet)
         v
  [ Clipboard / Human Operator ]  <--- Universal Low-Tech Bridge
         |
         | (Pasted into context)
         v
[ Agent / Service B ]
```

Follow the **Version-0 Progression**:
1. **Version-0 (Copy/Paste first)**: Hand-transport bounded artifacts via clipboard. Validate semantics, inspect friction, and stabilize the payload format.
2. **Version-1 (Agent-assisted extraction second)**: Agents format, validate, and emit citable packets to reduce copy/paste formatting errors.
3. **Version-2 (Automation later)**: Wire direct APIs, MCP servers, ACP conduits, or background daemons only after the interaction semantics and payload schemas have proven stable and necessary.

## Invariants

- **Self-Description**: The transported payload must contain sufficient context, schema hints, and resumption instructions so the receiving environment can interpret it without pre-installed out-of-band state.
- **Boundedness**: The payload must fit comfortably within standard LLM context windows and human clipboard mechanics.
- **Complementarity**: This pattern is not an argument against automation or formal protocols (MCP, ACP, REST). It is the baseline fallback that guarantees universal interoperability and enables exploratory prototyping.

## Failure Modes

- **Premature Automation**: Building complex RPC/API scaffolding for workflows whose cognitive requirements are still changing weekly.
- **Unbounded Payloads**: Generating multi-megabyte payloads that choke clipboard buffers or overflow recipient prompt limits.
- **Unchecked Relay**: Treating the human operator as a blind mechanical pipe rather than a valuable cognitive filter and sanity gate.
