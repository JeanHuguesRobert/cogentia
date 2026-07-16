---
title: Cognitive Packet Prompt Contract
subtitle: Envelope and Payload — Continuations by Copy or by Reference
author: Jean Hugues Noël Robert, baron Mariani
date: '2026-05-21'
status: prompt-contract — working
version: '0.3'
license: CC BY-SA 4.0
canonical_path: cogentia/prompts/cognitive_packet.md
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/prompts/cognitive_packet.md
related_prompts:
  - cogentia/prompts/document_conversation_frame.md
  - cogentia/prompts/redactor.md
  - cogentia/prompts/reviewer.md
  - cogentia/prompts/conversation_closure.md
related_research:
  - cogentia/research/cognitive_packets.md
  - cogentia/research/pipeline.md
  - cogentia/research/derived_products.md
  - barons-Mariani/research/second_method.md
agent_neutral: true
human_validation_required: true
last_stamped_at: 2026-06-17T00:00:00.000Z
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
update_policy: UP-DEFAULT-REVIEWED
---

# Cognitive Packet Prompt Contract

## Object

This prompt contract defines cognitive packets and continuation packets. It is used when a conversation, document, issue, or repository task must become resumable by another human, AI agent, tool, or future session.

## Associated documents

- [Document Conversation Frame](document_conversation_frame.md) — establishes the structured atelier.
- [Redactor](redactor.md) — may use packets to preserve deferred material or resumable revision state.
- [Reviewer](reviewer.md) — may request packets for unresolved objections or continuation risks.
- [Conversation Closure](conversation_closure.md) — may include a compact continuation packet at closure.

## Update method

Update this contract through the structured document-production frame. Preserve the envelope/payload distinction and by-copy/by-reference distinction.

Paste this at the beginning of a conversation with an AI agent when you want that conversation to support cognitive packets and continuations.

```markdown
Apply the cognitive packet protocol in this conversation.

A cognitive packet is a structured unit of cognitive work intended to let a human, AI agent, tool, or repository resume work. It is composed of two layers:

- an envelope — kind-agnostic metadata any receiver can read: protocol header, transmission mode, packet kind, status, provenance, context reference, routing, traces;
- a payload — kind-specific cognitive content (the work itself).

It is not an ordinary summary. The envelope tells a router what to do with the packet without reading the payload. The payload is for an agent capable of handling the declared kind.

Two transmission modes exist:

1. By copy:
   The necessary context is embedded in the packet. Use this when the receiver may not share the current context.

2. By reference:
   The packet points to a shared, stable, accessible context. Use this only when the receiver can dereference that context.

When I ask for a "continuation by copy", produce a standalone self-describing packet with envelope and a continuation-kind payload, ready to be pasted into another conversation, todo list, issue, document, tool, or repository.

When I ask for a "continuation by reference", produce a shorter situated packet whose envelope points at the shared context and whose payload assumes the receiver shares it.

Do not produce an ordinary summary. Produce a packet whose payload is a resumable object.

For a continuation-kind payload, always distinguish:
- established state;
- decisions;
- assumptions;
- constraints;
- next action;
- traces (in the envelope);
- resumption risks.

A by-copy packet should include the protocol header field in its envelope so that the receiver can understand the packet and produce another packet after resumption.

Self-describing does not mean self-validating. The receiver must still verify the packet's claims, references, assumptions, and decisions.

If the referenced context is not stable or not available to the receiver, say so and produce a continuation by copy instead.
```

---

# Minimal by-copy template

```markdown
# COGNITIVE PACKET — CONTINUATION — BY COPY

## Envelope

packet_kind: continuation
transmission_mode: copy
status: active
self_describing: true

### Protocol Header

This block is a cognitive packet of kind continuation: a structured unit of cognitive work intended to let a human, AI agent, tool, or repository resume work.

The envelope is kind-agnostic; the payload carries the work state. After using this packet, the receiver may produce a new cognitive packet according to the same convention.

Two transmission modes exist:
- by copy: the necessary context is embedded;
- by reference: the packet points to a shared, stable, accessible context.

Self-describing does not mean self-validating.

### Provenance

### Context Reference

### Routing

### Traces

## Payload

### Object

### State

### Decisions

### Constraints

### Assumptions

### Next Action

### Resumption Risks
```

---

# Minimal by-reference template

```markdown
# COGNITIVE PACKET — CONTINUATION — BY REFERENCE

## Envelope

packet_kind: continuation
transmission_mode: reference
status: active

### Context Reference

### Routing

### Fallback

If the referenced context is unavailable, request or produce a continuation packet by copy.

## Payload

### Resumption Point

### Decisions to Preserve

### Immediate Constraints

### Next Action

### Vigilance
```
