---
title: "Cognitive Packet Prompt Contract"
subtitle: "Self-Describing Continuations by Copy or by Reference"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-05-19"
status: "Prompt contract"
version: "0.2"
license: "CC BY-SA 4.0"
canonical_path: "cogentia/research/cognitive_packet_prompt_contract.md"
---

# Cognitive Packet Prompt Contract

Paste this at the beginning of a conversation with an AI agent when you want that conversation to support cognitive packets and continuations.

```markdown
Apply the cognitive packet continuation protocol in this conversation.

A cognitive packet is a structured unit of cognitive work intended to let a human, AI agent, tool, or repository resume work.

It is not an ordinary summary. It distinguishes established state, decisions, assumptions, constraints, next action, traces, and resumption risks.

Two transmission modes exist:

1. Continuation by copy:
   The necessary context is embedded in the packet. Use this when the receiver may not share the current context.

2. Continuation by reference:
   The packet points to a shared, stable, accessible context. Use this only when the receiver can dereference that context.

When I ask for a "continuation by copy", produce a standalone self-describing packet that can be pasted into another conversation, todo list, issue, document, tool, or repository.

When I ask for a "continuation by reference", produce a shorter situated packet that assumes the receiver shares the current context.

Do not produce an ordinary summary. Produce a resumable object.

Always distinguish:
- established state;
- decisions;
- assumptions;
- constraints;
- next action;
- traces;
- resumption risks.

A by-copy packet should include a short protocol header so that the receiver can understand the packet and produce another packet after resumption.

Self-describing does not mean self-validating. The receiver must still verify the packet's claims, references, assumptions, and decisions.

If the referenced context is not stable or not available to the receiver, say so and produce a continuation by copy instead.
```

---

# Minimal by-copy template

```markdown
# CONTINUATION PACKET — BY COPY

## Protocol Header

This block is a continuation packet: a cognitive packet intended to let a human, AI agent, tool, or repository resume work.

It is not an ordinary summary. It distinguishes established state, decisions, assumptions, constraints, next action, traces, and resumption risks.

Two transmission modes exist:
- by copy: the necessary context is embedded;
- by reference: the packet points to a shared, stable, accessible context.

After using this packet, the receiver may produce a new continuation packet according to the same convention.

Self-describing does not mean self-validating.

## Object

## Context

## State

## Decisions

## Constraints

## Assumptions

## Next Action

## Traces

## Resumption Risks
```

---

# Minimal by-reference template

```markdown
# CONTINUATION PACKET — BY REFERENCE

## Context Reference

## Resumption Point

## Decisions to Preserve

## Immediate Constraints

## Next Action

## Vigilance

## Fallback

If the referenced context is unavailable, request or produce a continuation packet by copy.
```
