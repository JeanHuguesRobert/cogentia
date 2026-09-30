---
title: "Cognitive Packet — Incarnations, Forks, Mission Packets and Human-Capability Routing"
subtitle: "Architectural study and formalization for physical/digital incarnations, independent mission lineage, and anti-capture routing"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-30"
version: "0.1"
status: "working-paper — architecture study"
document_role: "source"
document_kind: "research-paper"
visibility: "public"
lifecycle_state: "working"
language: "en"
license: "CC BY-SA 4.0"
update_policy: "UP-DEFAULT-REVIEWED"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "issue-213"
  origin_date: "2026-09-30"
  derived_from:
    - "cogentia/research/cognitive_packets.md"
    - "cogentia/research/cognitive_packet_switching.md"
    - "cogentia/research/locality_principle.md"
    - "FractaVolta/research/fractanet.md"
    - "FractaVolta/research/generalized_packet_networks.md"
    - "barons-Mariani/projects/suicide-corse/editorial-architecture.md"
    - "barons-Mariani/research/noyau_doctrinal_rendre_capable.md"
review:
  status: "unreviewed"
  reviewed_by: []
---

# Cognitive Packet — Incarnations, Forks, Mission Packets and Human-Capability Routing

## 1. Object and Context

This study addresses GitHub issue **cogentia#213**: *“Cognitive Packet — incarnations, forks, mission packets and human-capability routing”*.

It formalizes the convergence between two exploratory lines in the Living Corpus:

1. **Generalized Packet Networks & Fractanet** (`FractaVolta/research/fractanet.md`, `cogentia/research/cognitive_packet_switching.md`, `barons-Mariani/research/noyau_doctrinal_rendre_capable.md`): routing capability verbs across heterogeneous substrates, where a node may be an algorithm, a hardware enclave, or a human actor whose latent capability is made discoverable and mandated without capture.
2. **Suicide Corse Editorial Architecture** (`barons-Mariani/projects/suicide-corse/editorial-architecture.md`, commit `cbb45f1c`): distinguishing a frozen editorial edition (`edition_id`) from individually addressable physical copies (`copy_id`), allowing identity assignment post-manufacture (e.g. via QR sticker), and supporting copy reproduction (an incarnation fork) and independent mission assignment (e.g. *“Deliver to a member of the diaspora in NYC”*).

---

## 2. Novelty Assessment

### 2.1. Established Doctrine (Preserved without Modification)

- **Envelope / Payload Separation**: Routers inspect only envelopes (metadata, routing constraints, required capabilities, return contracts); payload interpretation happens solely within the designated handler.
- **Continuations as Suspended Judgment**: Continuations represent asynchronous inversions of control without shared memory or silent provider calls.
- **Minimum Sufficient Locality** (`research/locality_principle.md`): State, governance, and heavyweight data remain local; explicit references and small projections travel.
- **Anti-Capture Doctrine**: No hidden vendor state, no central monopoly registry, and strict monotonic attenuation of authority.

### 2.2. Genuine Architectural Novelty

1. **Decoupling Carrier/Incarnation from Packet Identity**: A Cognitive Packet is not inherently an ephemeral sequence of bits over a socket. It may possess heterogeneous physical or digital incarnations ($I$) that receive persistent identities before or after manufacture.
2. **Two-Level Decoupling: Incarnation Lineage vs. Mission Lineage**:
   - An incarnation can be copied/printed (**incarnation fork** $I_1 \to I_2$) while continuing the same mission ($M_1$).
   - An incarnation can receive a derived or replacement mission (**mission fork** $M_1 \to M_2$).
3. **Decoupling Custodian (*Holder*) from Traitant (*Handler*)**:
   - A physical courier or transport intermediary operates in the **data plane** (physical carriage/transit).
   - A cognitive handler operates in the **control plane** (evaluating instructions, making judgments, closing steps).
4. **Stigmergic Human Routing without Surveillance**:
   - Trajectory is recorded via local witness events (step hashes, visas, scan markers), adhering to `Observability ≠ surveillance` and `Packet identity ≠ holder identity`.

---

## 3. Minimal Ontology

The architecture is formalized into 9 orthogonal primitives:

```text
       ┌─────────────── Content (C) ───────────────┐
       │ (e.g., investigative prose)                │
       ▼                                            │
  Edition (E) [frozen, immutable release]           ▼
       │                              Mission (M) [contract / objective]
       ▼                                    │
  Incarnation (I) [copy_id, carrier] ◄──────┘ (cardinality N:M)
   ├── Custodian / Holder (H_custody)  [data plane: carriage / physical transit]
   └── Handler (H_handler)            [control plane: cognitive processing / judgment]
       │
       ▼
  Trajectory Event (T_event) [immutable witness record, locality, timestamp]
       │
       ▼
  Effect / Outcome (O) [state transition or physical closure]
```

1. **Content ($C$)**: Substantive textual, empirical, or operational body.
2. **Edition ($E$)**: A dated, frozen, immutable projection of Content (e.g. *Suicide Corse n°3*, hash `H(E)`).
3. **Logical Packet ($P_{\text{logical}}$)**: The invariant unit binding envelope metadata, intention, and lineage.
4. **Incarnation ($I$)**: A concrete physical (paper, NFC, bottle) or digital (capsule, JSON on disk) instantiation bearing a unique `copy_id`.
5. **Mission ($M$)**: An actionable task, contract, or destination assigned to or carried by one or more incarnations.
6. **Custodian / Holder ($H_{\text{custody}}$)**: Entity currently possessing the incarnation (transit participant).
7. **Handler ($H_{\text{handler}}$)**: Cognitive agent (human, twin, model) mandated to interpret the payload and execute judgment.
8. **Trajectory Event ($T_{\text{event}}$)**: Immutable provenance step (identify, handoff, witness, checkpoint, resolve, fork).
9. **Effect / Outcome ($O$)**: Material or systemic change fulfilling the mission acceptance criteria.

---

## 4. Reality Cases

### Case A — Casa Mariani / "Bouteille à la mer"
- **Content**: Botanical formulation, essential-oil batch provenance, distillation notes.
- **Incarnation**: A specific glass bottle with etched serial/NFC/QR.
- **Mission**: Open peer circulation, olfactory evaluation, successive visitor signatures, optional return to Corte.
- **Validation**: If the bottle breaks, the physical incarnation perishes, but the mission history and accumulated witness traces survive digitally.

### Case B — Suicide Corse Addressable Copies
- **Edition**: *Suicide Corse n°3* (immutable text, frozen 2026-09-30).
- **Incarnation**: Printed copy #381 with QR sticker `sc3-0381`.
- **Mission $M_1$**: *“Deliver to a member of the Corsican diaspora in New York.”*
- **Forks**:
  - *Incarnation fork*: Copy #381 is photocopied to #382 for local archive; #381 continues travel ($I_1, I_2 \to M_1$).
  - *Mission fork*: Recipient in NYC retains #381 and assigns sub-mission $M_2$ (*“Relay review to Montreal”*).

---

## 5. Counter-Cases

### Counter-Case 1 — Energy / Compute Exergy Dispatch (FractaVolta / Mare Nostrum CXU)
- **Object**: Dispatch of an inference task constrained by solar exergy.
- **Mapping**: Hardware node (inverter/edge server) holds physical custody ($H_{\text{custody}}$); Inox orchestrator acts as handler ($H_{\text{handler}}$).
- **Result**: Validates non-anthropomorphic generality. A solar drop terminates the local run ($I_1$) without aborting the logical compute mission ($M_1$), which rematerializes on another node ($I_2$).

### Counter-Case 2 — Pure Digital Continuation Graph (Inseme / Cogentia)
- **Object**: Pure software continuation (`cogentia.continuation.v2`).
- **Mapping**: Incarnation is 1:1 with `.cogentia/continuations/<id>.json`.
- **Result**: Degenerate 1:1 case where carrier is standard filesystem storage and custodian = host OS. Proves the physical model is an upward generalization, not a separate conceptual world.

---

## 6. Control Plane vs. Data Plane Mapping

| Layer | Control Plane | Data Plane |
|---|---|---|
| **Objects** | Envelope, `mission_ref`, `edition_ref`, policy, mandate, constraints, closure state. | Bulk content, ink, paper, physical weight, raw bytes, glass, transit vehicle. |
| **Actors** | Cognitive Handler ($H_{\text{handler}}$: qualified human, twin judge, LLM). | Custodian ($H_{\text{custody}}$: courier, transporter, storage node). |
| **Verbs** | `ASSIGN`, `ROUTE`, `HANDLE`, `MERGE`, `COMPLETE`, `REVOKE`. | `MATERIALIZE`, `DEMATERIALIZE`, `CLONE`, `TRANSIT`, `DELIVER`. |

---

## 7. Anti-Capture, Locality and Privacy Invariants

1. **`Observability ≠ Surveillance`**:
   Trajectory records log what happens to the packet and its mission, never the personal civilian identities or private telemetry of holders.
   - *Admissible*: `event: "checkpoint_witnessed" | zone: "Gare-de-Bastia" | ts: "2026-10-01"`.
   - *Inadmissible (Capture)*: `holder_name, national_id, gps_realtime_track, mandatory_account`.
2. **`Packet Identity ≠ Holder Identity`**:
   Scanning an incarnation's QR code reveals the mission state without requiring personal authentication.
3. **`Handoff ≠ Subordination`** & **`Mission ≠ Order`**:
   Carrying or handling an incarnation is a stigmergic voluntary engagement under Bounded Initiative, never hierarchical subjugation.
4. **Decentralized Verification without Global Monopoly**:
   Trajectory integrity relies on localized cryptographic hash-chaining:
   $$H_k = \text{SHA256}(H_{k-1} \,\|\, \text{event}_k)$$
   Verifiable by any successor without query access to a centralized authority server.

---

## 8. Falsification and Architectural Decision

### 8.1. Falsification Finding
Existing primitives (`cogentia.continuation.v2`, `cop.event/v1`) represent asynchronous judgment and events cleanly, but enforce an implicit 1:1 coupling between local file ID, question, and lifecycle. They cannot represent:
- Multiple physical copies serving one mission (1:N);
- One physical copy carrying successive or split missions;
- Passive custody vs. cognitive handling.

### 8.2. Decision: `new_packet_profile_needed`
Rather than inventing a new runtime engine, Cogentia should define a lightweight profile under the Cognitive Packet standard:

```text
cogentia.packet.incarnation_mission/v1
```

Extending the Cognitive Packet envelope with 4 explicit fields:
- `edition_ref`: Content/freeze identifier (`sha256` or canonical release ref).
- `copy_id`: Unique identifier of the physical or digital incarnation.
- `mission_ref`: Identifier of the associated mission packet or continuation contract.
- `carrier`: Substrate descriptor (`paper`, `nfc`, `capsule`, `memory`).

---

## 9. Acceptance Return Packet

```text
handler: antigravity-pair
baseline: 6a0206b59ac9c659c5e76c58c4065d55c1d076cf
result: completed
sources inspected:
  - cogentia/research/cognitive_packet_switching.md
  - cogentia/research/locality_principle.md
  - cogentia/docs/continuations_and_cognitive_packets_for_agents.md
  - FractaVolta/research/fractanet.md
  - FractaVolta/research/generalized_packet_networks.md
  - barons-Mariani/projects/suicide-corse/editorial-architecture.md
  - barons-Mariani/research/noyau_doctrinal_rendre_capable.md
novelty assessment:
  - Verified decoupling of Incarnation Lineage from Mission Lineage.
  - Verified Custodian (carriage) vs Handler (cognition) separation.
  - Preserved existing envelope/payload, locality, and anti-capture doctrine.
minimal ontology:
  - 9 primitives: Content, Edition, Logical Packet, Incarnation, Mission, Custodian, Handler, Trajectory Event, Effect.
Reality Cases:
  - Case A (Casa Mariani bottle): validated.
  - Case B (Suicide Corse addressable copy): validated.
counter-cases:
  - Counter-case 1 (FractaVolta / Mare Nostrum Exergy): validated.
  - Counter-case 2 (Inseme multi-agent continuation): validated as degenerate 1:1 case.
control/data-plane mapping:
  - Control plane: policy, mission, mandate, handler, closure.
  - Data plane: physical carriage, printing, custodian, bytes/paper transit.
privacy / anti-capture findings:
  - Observability without surveillance: log packet events, never personal identities.
  - Decentralized local hash-chaining of trajectory steps without global monopoly registry.
existing primitives sufficient?: no (cardinality 1:N copy-to-mission is missing in pure continuation.v2).
minimal extension if needed:
  - Profile definition `cogentia.packet.incarnation_mission/v1` extending Cognitive Packet envelope.
falsification attempts:
  - Attempted to reduce copy_id to continuation ID: failed under 1:N copy-to-mission cardinality.
prototype recommendations:
  - Add schema and fixture test for the incarnation_mission profile before writing runtime code.
decision: new_packet_profile_needed
remaining continuation: none for study phase.
next resumable action: none required until human validation of this study.
```
