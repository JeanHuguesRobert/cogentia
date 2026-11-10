---
title: Capability and Authority as Orthogonal Data and Control Planes
subtitle: COP admission governs execution without shrinking the technical capability surface
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A.
date: '2026-11-10'
last_modified_at: '2026-11-10'
version: '0.1'
status: working-paper
document_role: operational
document_kind: architecture
visibility: public
lifecycle_state: working
language: en
license: CC BY-SA 4.0
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/capability_authority_control_data_planes_2026-11-10.md
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: principal_instruction
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 2026-11-10 clarification on control/data-plane separation
  origin_date: '2026-11-10'
  derived_from:
    - research/locality_principle.md
    - research/cognitive_packet_switching.md
    - research/mandate_reasonable_agency.md
review:
  status: unreviewed
  reviewed_by: []
---

# Capability and authority: functional separation of data plane and control plane

## Canonical invariant

**Being able to do X and having the right to do X are two distinct, orthogonal capacities.**

- **Data plane:** what is technically possible and executable: tool implementations, handlers, transport, services, data access paths and the execution/observation of effects. A capability catalogue describes *possibilities*, not permissions.
- **Control plane:** who (Principal / actor) is allowed to invoke which *semantic act*, for what purpose, on which scope, under which **mandate and budget**, at which time, with which conditions, delegation, revocation and accountability.
- **Admission bridge:** a governed dispatcher binds a specific intended effect to the applicable authentic mandate and budget, reserves resources before an effect where required, and provides verifiable post-effect receipts. **The bridge mediates execution; it is not the source of authority.**

The analogy is **functional, not physical**. Both planes may coexist in a single process, file or machine. An authorization service itself has technical capabilities; a packet of policy is also data to its carrier. Neither fact transfers normative authority. The same semantic act through HTTP, shell, Gmail, MCP, browser or another adapter must face the same control decision, without demanding one particular transport implementation.

## Two independent questions, two independent failure modes

1. **Possible?** Is the relevant capability described, actually reachable, functional and compatible with the requested effect? A missing or broken tool is a **data-plane capacity gap**, even when a valid mandate exists.
2. **Permitted and funded?** Is an independently authenticated Principal/actor mandate applicable to the *specific effect*, with available COP budget and no controlling revocation or conflict? An absent grant or exhausted budget is a **control-plane admission gap**, even when all technical APIs work.

Never remedy a control-plane gap by erasing, disguising or breaking a technical capability; never remedy a capacity gap by inventing a mandate. A provider's external access restrictions are a separate technical/legal boundary and cannot be magicked away by either plane. An owner directly administering their own machine is not the same actor as a delegated agent; do not create an artificial additional COP licence for the owner.

A tool can be **announced, discovered, reachable, authenticated, authorized, admitted, executed and verified** at different times. Use precise receipts rather than reporting any of those states as another. Likewise, a successful *read-only preview*, a draft, a preflight, a permission to execute, and an actual effect are different events.

## Invariants for implementation

**I1 — Preserve maximum legitimate capabilities.** Keep technical adapters able to execute their intended operations, including sending messages, as appropriate to their purpose. Publish a truthful capability inventory independent of the Principal's current rights. UI filtering may improve ergonomics but must not be the only authorization mechanism. Distinguish *unavailable* from *available but not authorized* without repeated admonitions to the Principal.

**I2 — COP is the authority source.** Scope is resolved from the independently valid chain of Principal → mandate → actor/delegation → exact semantic action → target and privacy boundary → budget and conditions. Secrets, service authentication, installed apps, access to a Trust Perimeter or possession of an email address are **not** a mandate. A policy statement in the Corpus is a normative requirement; deployed enforcement must be separately evidenced.

**I3 — Gate at the effect boundary, not only at discovery.** The final governed dispatch path must check authorization and budgets **before** the effect, including retries and alternate technical routes. No generic shell, direct provider API or another transport may silently substitute for a denied semantic operation. Technical transport and governance remain separate, but the coupling is real and enforced.

**I4 — Budget is not a capability throttle.** Budgets limit permitted consumption/exposure, not the existence of a tool. Reservations and reconciliations use the actual semantic effect, with no fabricated reservation or retrospective grant. A resource limit, exhausted budget and unauthenticated provider session have different meanings.

**I5 — End-to-end receipts and accountability.** Capture identity, intended effect, mandate decision, budget reservation where applicable, execution attempt, external provider outcome, actual observed effect and any settlement/refund. Distinguish `PREPARED`, `ADMITTED`, `DISPATCHED`, `OBSERVED` and `SETTLED`. A technical success is not proof of valid authority; valid authorization is not proof that anything happened.

**I6 — Local control, inherited constraints.** Load the applicable control plane where the cognitive packet/actor is situated (Applicable Local Control First); a child rule can restrict but cannot spontaneously widen a Principal's valid authority. The packet/handler does not need to copy the full policy if a stable reference can be resolved and activated. If the correct policy exists but was not activated, repair the *coupling* rather than merely editing the generated data artifact.

**I7 — Trust Perimeter and recipient boundaries.** Internal mail between actors of one Twin is data-plane transport governed by that Twin. An email from the Principal's usual account to another Principal crosses a different authority boundary and is potentially engaging. Private Stalwart mail must not directly cross Twins. Neither network isolation nor a non-engagement preamble substitutes for a mandate.

**I8 — Separate policy design, actual authority and operational limits.** A policy may say that most third-party messages remain drafts by default. That is a **control-plane outcome**, not a command to remove or break `gmail.send` from the data plane. Legitimate narrowly scoped later mandates may authorize sending; the tool need not be reimplemented or artificially re-enabled. Conversely a data-plane capacity upgrade never enlarges existing rights.

## Worked example: Gmail

`gmail.create_draft` and `gmail.send` may both be available and healthy. The current JHN mandate permits draft preparation but not ordinary third-party emission. A `gmail.send` attempt therefore receives an **authorization decision**, not a fabricated `tool_unavailable` error or forced deletion of the sending tool. A future valid act-specific mandate and funded budget may admit the send, followed by an actual provider send receipt. Nothing about this requires disabling `gmail.send`, and nothing about its availability grants permission to send. The content's possible legal effect (e.g. accepting an offer) is an additional **semantic classification** used by COP, distinct from both tool existence and provider transport.

## Implementation review and acceptance

1. With a full capability inventory and a read-only/prepare mandate, `gmail.send` remains *discoverable* while a third-party send is **denied at dispatch**, without contacting Gmail.
2. With a verified, effect-bound mandate, applicable budget and matching hash/recipient/purpose, the adapter can reach the execution path. Prove actual sends only in a separately authorized environment; never treat a dry-run as production delivery.
3. A revoked, expired, over-budget, widened or spoofed grant is denied, regardless of alternate technical transport.
4. A capability outage with a valid mandate is reported as an availability fault, **not** a revoked right; a missing mandate with a healthy tool is an authority fault, **not** an outage.
5. Both decisions and effects have independently verifiable receipts; status reporting does not conflate advertised/reachable/authorized/executed/verified.
6. A child handler or different host can resolve and activate its applicable control plane without copying policy into every cognitive packet.

These are **acceptance criteria** for implementation review, not claims that all connected provider, MCP, COP or transport routes currently satisfy them.

## Corpus integration

- [Locality Principle](locality_principle.md) — functional control/data-plane distinction and Applicable Local Control First.
- [Cognitive Packet Switching](cognitive_packet_switching.md) — capability-aware routing plus control-plane activation.
- [Mandate — Reasonable Agency](mandate_reasonable_agency.md) — right to act, delegation and proportionality.
- [External Email and COP](external-email-non-engagement-and-cop-2026-11-10.md) — no direct email emission under the current JHN mandate.
- [Shared Agent Instructions](../instructions/AGENTS.shared.md) — operational normative rules.
