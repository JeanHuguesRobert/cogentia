---
title: FBP, Forth and Cognitive Packet Switching — Intellectual Lineage and Missing Mechanisms
date: 2026-11-13
status: working-paper
author: Jean Hugues Noël Robert, baron Mariani
license: CC BY-SA 4.0
language: en
document_role: research
document_kind: historical-comparison
visibility: public
---

# From Forth and Flow-Based Programming to Inox and CPS

## Credit and historical restraint

This note honours two original thinkers whose work remains technically useful, beyond the recognition their ideas received in mainstream programming.

**Charles H. “Chuck” Moore** created Forth: concatenative composition, small vocabularies, interactive extension, and directness between programmer and machine. Inox already acknowledges Moore explicitly in [`Inox/lib/forth.nox`](https://github.com/JeanHuguesRobert/Inox/blob/master/lib/forth.nox). This is an acknowledgment of a living intellectual tradition, not a claim that Inox is merely Forth.

**J. Paul Rodker Morrison (died 2022)** developed AMPS and the **Flow-Based Programming** (FBP) model from the late 1960s: independent asynchronous processes, explicit networks, named ports, **Information Packets (IPs)** with defined lifetime and ownership, and **bounded connections that propagate backpressure**. His JavaScript implementation [JSFBP](https://github.com/jpaulm/jsfbp) experimented with Node fibers to recover suspensible sequential process logic in pre-async/await JavaScript; this is relevant to the historical `l8` reactive/continuation experiments. A direct influence or personal conversation should not be asserted without recovered evidence.

Primary texts: [Morrison FBP](https://www.jpaulmorrison.com/fbp/); [FBP concepts](https://www.jpaulmorrison.com/fbp/concepts.html); [comparison with NoFlo](https://www.jpaulmorrison.com/fbp/noflo.html); [JSFBP source](https://github.com/jpaulm/jsfbp).

## Complementarity, not a claim of invention

- **Forth/Inox**: minimal and extensible execution substrate, vocabulary and composability.
- **FBP/AMPS**: processing topology and propagation of information between asynchronous components.
- **l8 → Inox reactive tasks**: historical exploration of cooperative tasks, readable continuations and callback-hell avoidance; verify direct lineage from commits/discussions.
- **CPS/COP**: transfers of cognitive work, durable continuation context, mandate/authority, judgment, provenance and corrections, extending beyond ordinary data flow. These are target contracts, not claims that all runtime behaviors are already implemented.

A packet's content or purpose being cognitive **does not excuse** recreating well-understood transport problems. FBP may provide reusable semantics without requiring adopting any existing FBP runtime.

## Gap audit — hypotheses, not established absences

| Mechanism | FBP lesson | CPS / Fractanet question | Validation |
|---|---|---|---|
| Bounded channels | Connection capacity is finite | Is every queue bounded in bytes, count, time and/or cost? | Inventory real queues and persistence |
| Backpressure | Suspend upstream when downstream is full | How does admission propagate across hops and agents without deadlock? | Saturation test |
| Alternative overflow policies | `dropOldest` is explicit, not implicit | Which packets may be dropped, coalesced, spilled, expired or refused? | Per-class policy tests |
| Named ports / activation | Multiple typed ports; only activate on satisfiable inputs | Distinguish evidence, instruction, mandate, judgment, effect receipts | Multi-input join test |
| Ownership / lifetime | One owner or in transit; explicit disposal | Separate payload custody, execution responsibility, authority and replication | Fork/retry/revoke tests |
| Nested substreams / brackets | Structured substreams and IP trees | Compare with Cognitive Sets, graph projections and continuation lineage | Stream assembly test |
| Explicit topology | Composition separate from process implementation | Make handler routing and escalation independently evolvable | Replace handler without rewrite |
| Deadlock | Bounded buffers can create cycles | Detect cyclic waiting and pressure amplification | Cyclic stress test |
| Checkpoints and end-of-stream | Defined completion and synchronization | Distinguish done/returned/assimilated; crash recovery | Kill/restart/replay |
| Observability | Trace IPs across graph | Trace causality, queue age, budget, rejection and effect receipt | Replay trace |

## Backpressure is a cross-domain principle, not a universal mechanism

In **information/cognition**, scarce resources include RAM, persistent storage, context windows, API throughput, money, handler capacity and human attention. The network should expose occupancy, admission, explicit refusal/deferral, retry and age. In **energy Store & Forward**, constraints are physical: usable energy (kWh), charge/discharge power (kW), state-of-charge reserve, conversion efficiency, temperature, degradation and safety. Electricity cannot simply be queued in a software FIFO. Transmission deferral, curtailment, local consumption and contracts for accepted energy must be modeled separately.

Suggested protocol surface (to test rather than decree): `capacity`, `occupancy`, `reserved`, `available`, `admission_result`, `retry_after`, `expiry`, `priority_class`, `drop_policy`, `upstream_pressure`, `receipt`. No unbounded defaults. Preserve existing optimistic execution style; do not add redundant governance ceremonies.

## Experiments

1. Trace one existing CPS continuation through queue/admission/handler/retry; identify implicit infinite buffers and true resource bounds.
2. Simulate two producers → one finite consumer, with stop/start and restart; compare blocking, spill-to-disk, reject and drop/coalesce where lawful.
3. Simulate finite-capacity energy buffers with time-varying solar input and demands; enforce both kWh and kW constraints, reserve state and efficiency; distinguish loss of service from congestion.
4. Measure throughput, waiting-time distribution, saturation, dropped work, recovered continuations, attention load and failure amplification.
5. Compare implementation of this minimal network with classical FBP/NoFlo before inventing new CPS primitives.

**Falsifiability:** determine which concepts are genuinely novel, already supplied by FBP, absent from source only, or present but untested in deployed behavior.

Related: [Cognitive Programming #26](https://github.com/JeanHuguesRobert/cogentia/issues/26), [real-world CPS tests #113](https://github.com/JeanHuguesRobert/cogentia/issues/113), [FractaVolta Store & Forward](https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/UNCONSCIOUS_GRID.md).
