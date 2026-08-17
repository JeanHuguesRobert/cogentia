---
title: "Portable Continuations and Judgment Boundaries"
subtitle: "Provider-neutral cooperation from copy/paste to MCP and A2A"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-08-14"
version: "0.2"
status: "working-note"
language: "en"
document_role: "source"
document_kind: "doctrinal-note"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
changelog:
  - "v0.1 (2026-08-14) — initial doctrine: determinism until judgment, continuation at the boundary, transport independence, JHN service pattern."
  - "v0.2 (2026-08-17) — add capability availability as a second, orthogonal judgment-boundary trigger (uncertain reachability of an external tool, not content); first concrete case: gh in cogentia.js issues *."
related_documents:
  - "research/agent_resumable_cli.md"
  - "research/cogentia_continuation_packet_routing.md"
  - "research/cognitive_packets.md"
  - "research/administrative_burden_and_exemplar_tests.md"
  - "research/intent.md"
  - "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/docs/website/guide-chatbot-agile-plan.md"
tags:
  - continuation
  - inversion-of-control
  - judgment-boundary
  - capability-availability
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

## Capability availability as a judgment boundary

The core rule above frames the judgment boundary in terms of the *content* of the work: semantic, normative, contextual. There is a second, distinct trigger for the same boundary, orthogonal to content: uncertainty about whether an external capability is reachable at all, right now, from the process attempting the work.

> **Direct invocation of an external capability (subprocess, API client, or any other synchronous mechanism) is rational only when both hold: the capability is actually present, and it can be expected to answer promptly. Otherwise — barring the ordinary accidents any direct call must already tolerate — the decision of how to obtain the result should be handed back to the caller, as a continuation.**

This matters because deterministic capabilities are not only uncertain in what they should conclude; they are sometimes uncertain in whether they can even run. A subprocess tool may be absent, unauthenticated, network-isolated, or simply not installed in the environment a given invocation happens to execute in — independently of whether the eventual output would have required judgment at all.

```text
external capability needed (e.g. a CLI tool)
    ↓
available AND respond quickly, right now?
  ├─ yes → direct call (subprocess / sync)
  │         ↓
  │      mechanical result
  │         ↓
  │      continue to the content judgment boundary, if any
  └─ no / uncertain → emit Continuation
              ↓
          the caller decides how to satisfy it
          (has the capability locally, has another path,
           or declines)
              ↓
           StepResult
              ↓
          resume with the supplied result
```

This is a capability-delegation continuation, not a content-judgment continuation — the two can chain: a capability continuation may supply data that itself still needs a content-judgment continuation before it can be acted on. Neither should silently collapse into the other.

### First concrete case: `gh` in `cogentia.js`

`cogentia.js`'s `issues *` command family (`list`, `packet`, `graph`, `sync`, `export`) already shells out to the `gh` CLI directly (`ghJson()`), with no availability probe: a missing or unauthenticated `gh` simply throws. This is a pre-existing gap relative to the rule above, not a new one — worth noting rather than silently carrying forward as new capability-delegating commands are built on top of the same issue-fetching machinery (see `research/intent.md` §13.1 and issue #100 for the companion case this principle was articulated alongside).
