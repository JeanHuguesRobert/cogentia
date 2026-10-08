---
title: "FractaXXXX — Family of Composable Fractal Capabilities"
subtitle: "One navigation map for existing names, candidate names, interoperable friends and discriminating Reality Tests"
date: "2026-10-08"
version: "0.1"
status: "working-note — non-normative"
language: "en"
license: "CC BY-SA 4.0"
document_role: source
document_kind: "research-note"
visibility: public
lifecycle_state: working
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/fractaxxxx.md"
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "conversation 2026-10-08, FractaRouting / FractaJudgement / Occam"
  origin_date: "2026-10-08"
  derived_from:
    - "research/fractacognition_principles.md"
    - "research/intent.md"
    - "research/cognitive_packet_switching.md"
    - "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/fractanet.md"
    - "https://github.com/JeanHuguesRobert/inseme/blob/main/research/cop_zero_draft.md"
review:
  status: unreviewed
  reviewed_by: []
---

# FractaXXXX

## Why one document

**Occam:** do not create one paper, registry, product, or protocol for every Fracta-prefix. This document is a *navigational and comparative View*, not a new super-protocol or centralized authority. Each concept retains its own source of truth. A new `FractaX` name is useful only when it names a sufficiently distinct responsibility, preserves existing semantics, and suggests a discriminating Reality Test.

**Friends before competitors:** survey and acknowledge the best existing ideas, APIs, historical predecessors and active research. Compose with them. Do not treat citations as novelty contests.

## Current family and status

| Name | Responsibility / interpretation | Status | Primary anchor |
|---|---|---|---|
| Fractanet / FractaNet | The infrastructural instance of Generalized Packet Networks | documented | [Fractanet](https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/fractanet.md) |
| FractaVolta | Energy-packet and mobile-buffer applications | established project | [FractaVolta](https://github.com/JeanHuguesRobert/FractaVolta) |
| FractaCognition | Metacognitive discipline and composable heuristics | documented | [Principles](research/fractacognition_principles.md) |
| FractaCarta | Fractal maps, local autonomy and exploration grammar | documented | [FractaCarta](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/fractacarta.md) |
| FractaScheduler | Scheduling and progress of distributed cognitive work | implemented/documented profile | [Scheduler](../docs/fracta-scheduler.md) |
| FractaCalendar | Federated temporal obligations | documented | [Calendar](https://github.com/JeanHuguesRobert/operium/blob/main/docs/fracta-calendar.md) |
| FractaLog | Trace and act observability | documented | [Act catalog](https://github.com/JeanHuguesRobert/inseme/blob/main/docs/fractalog-act-catalog.md) |
| **FractaRouting** | Recursive, capability-aware routing; optionally nested envelopes; routing itself can be packetized | **name adopted by Principal, 2026-10-08; normative specification pending** | [COP envelope](https://github.com/JeanHuguesRobert/inseme/blob/main/research/cop_zero_draft.md), [packet attractors](https://github.com/JeanHuguesRobert/inseme/blob/main/research/packet_attractor_fractanet.md) |
| **FractaJudgement** | Composable, attributable human/AI judgement at semantic, normative and contextual boundaries | **candidate concept, not yet adopted as normative** | [Judgment boundaries](research/portable_continuations_and_judgment_boundaries.md), [Intent](research/intent.md) |

### Proposed names — not projects or established concepts

FractaCompute (compute-placement), FractaStore (durable storage), FractaTrust (trust and delegation), FractaMemory (memory projections), FractaFlow (composition). These are hypotheses; first determine whether COP/Operium/Cogentia already name and implement the exact responsibility. Avoid duplicating FractaCalendar with a proposed FractaTime.

## Composition grammar — reuse before extending

Documented operations include `route`, `fork`, `split`, `join`, `merge`, `transform`, `handoff`, `suspend`, `resume`, `return`, `revoke`, `retarget`, and `authorize-fork`. They belong to different semantic layers; **fork ≠ clone, join ≠ merge, judgment ≠ mandate, delivery ≠ execution**.

Sources: [Generalized Packet Networks](https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/generalized_packet_networks.md); [Cognitive Packet Switching](research/cognitive_packet_switching.md); [COP Zero](https://github.com/JeanHuguesRobert/inseme/blob/main/research/cop_zero_draft.md).

A router may choose a *domain that can route further*, not only a final handler. An envelope can contain or reference a more restricted envelope. Each hop sees the minimum required projection; the hidden payload and other envelope layers remain protected. This is an architectural candidate, not an existing interoperable wire standard.

## Store-and-forward and the delayed-effect boundary

Each routing hop may persist and later forward without coincident availability of sender and receiver. **Forward ≠ execute**: before consequential effects, check current intent, mandate, packet generation, supersession, target revision, resource budget and idempotency. If already achieved elsewhere, return `satisfied_elsewhere`; if superseded, no-op; if uncertain, reconcile or suspend.

Sources: [Deferred effects](https://github.com/JeanHuguesRobert/inseme/blob/main/docs/deferred-effect-relevance-and-supersession.md), [#120](https://github.com/JeanHuguesRobert/inseme/issues/120), [#121](https://github.com/JeanHuguesRobert/inseme/issues/121). E5 showed atomic single-ref contention across independent GitHub runs; E6 showed synthetic policy checks. **Neither proves universal provider-side exactly-once or fencing.**

## Judgment as a routable capability

When a handler can no longer advance deterministically, it may emit a Continuation to a human, model, or qualified group, without inventing authority. A judgment may interpret an intent, assess evidence, generate objections, or propose whether an effect remains relevant. Its uncertainty and provenance survive; COP/Mandate determines whether an actual effect is authorized. FractaJudgement should build on, not replace, [Intent](research/intent.md) and [Judgment Boundaries](research/portable_continuations_and_judgment_boundaries.md).

## Living friends and state of the art

| Friend / tradition | What to reuse or compare | Initial differentiating test |
|---|---|---|
| Gelenbe's Cognitive Packet Networks (1999/2001) | Adaptive exploratory routing, network feedback | Compare learned and deterministic path choices |
| Delay-Tolerant Networking / Bundle Protocol v7 | Custody-like durability, intermittent transport, security blocks | Offline hop, retransmit, confidentiality test |
| Telescript / mobile agents | Mobile state, program execution and delegated permissions | Move work without coupling it to a single runtime |
| Linda / tuple spaces / blackboards | Decoupled coordination | Packet Attractor vs tuple-based match |
| NATS JetStream, Temporal, LangGraph | Durable asynchronous processing and workflow recovery | Duplicates, crashes and superseded effects |
| MCP and Agent2Agent (A2A) | Interoperability with tool and agent ecosystems | Cold handler cross-protocol continuation |
| Heterogeneous inference routing / MoE | Placement near CPU/GPU/NPU and data | Latency, budget, power and disclosure comparison |

Not every item constitutes a direct predecessor of the same protocol. For each: record exact citations, tested implementations, limits and possible respectful cooperation. Check current releases before recommending deployment; this table is a research agenda rather than an assertion of latest version.

### Bibliographic seed

- E. Gelenbe, Z. Xu & E. Seref, *Cognitive Packet Networks*, ICTAI (1999).
- E. Gelenbe, R. Lent & Z. Xu, *Design and Performance of Cognitive Packet Networks*, Performance Evaluation 46 (2001).
- IETF [RFC 9171 — Bundle Protocol Version 7](https://www.rfc-editor.org/rfc/rfc9171.html).
- [Telescript as a Friend](research/telescript_as_a_friend.md).
- [When Cognition Became Traffic](https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/when_cognition_became_traffic.md); see its deliberately *relative* CPN→CPS inversion and prior-art objections.

## Minimum discriminating experiment

One COP packet, two independently administered routing domains, nested envelopes with partial disclosure, durable store-and-forward, one human/AI judgment boundary, and a superseded deferred effect. Compare to a centralized route on correctness, leakage, latency, resources, and recovery. No production external effects in the first run. Prove the *actual* final effect boundary separately from preflight policy.

## Occam review gate

Before coining or promoting another `FractaXXXX`, ask:
1. What existing concept, interface or prior art already solves this?
2. What distinct, testable invariant does the new term add?
3. Does it reduce total conceptual/operational complexity?
4. Can an existing document simply gain a link or a paragraph instead?
5. What Reality Test could falsify the asserted distinction?

**Status:** Living working View; not a decision to rename COP, rewrite accepted source doctrine, or multiply projects.
