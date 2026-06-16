---
title: "Cogentia as a Cognitive Continuation Packet Router"
subtitle: "Method-Governed Routing of Cognitive Packets in the Fractanet Architecture"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-06-01"
status: "working-paper — v0.3"
version: "0.3"
document_role: "source"
license: "CC BY-SA 4.0 for text; MIT for associated schemas or code"
spdx: "CC-BY-SA-4.0"
language: "en"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_continuation_packet_routing.md
related_projects:
  - "Cogentia"
  - "Fractanet"
  - "FractaVolta"
  - "COP"
  - "Inseme"
  - "Inox"
  - "Cogentigraphic Distillation"
related_documents:
  - "cogentia/research/cognitive_packets.md"
  - "cogentia/research/agent_resumable_cli.md"
  - "cogentia/research/pipeline.md"
  - "cogentia/research/cogentigraphic_distillation.md"
  - "FractaVolta/research/fractanet.md"
  - "FractaVolta/research/generalized_packet_networks.md"
  - "inseme/research/reactive_cognitive_cop_extension.md"
  - "inseme/packages/cop-kernel/docs/task-step-continuation-lineage.md"
tags:
  - cogentia
  - cognitive-packets
  - continuation
  - routing
  - fractanet
  - cogentigraphic-distillation
  - method-routing
  - packet-switching
  - multi-agent-systems
  - inversion-of-control
  - autonomie-de-capacite
  - traceability
ai_assisted_by:
  - "ChatGPT"
  - "Grok critique of v0.1 and v0.2"
last_stamped_at: 2026-06-01
corpus_role: "source"
---

# Cogentia as a Cognitive Continuation Packet Router

## Method-Governed Routing of Cognitive Packets in the Fractanet Architecture

**Jean Hugues Noël Robert, baron Mariani**  
Institut Mariani / C.O.R.S.I.C.A.  
1 cours Paoli, F-20250 Corte, Corsica

*Working paper v0.3 — 2026-06-01*  
*License: CC BY-SA 4.0 for text; MIT for associated schemas or code*

---

## Executive Summary

Fractanet applies packet thinking across heterogeneous substrates: data, energy, inference, cognition, governance, and execution. In its cognitive layer, the relevant packets are not ordinary messages or prompts, but **cognitive continuation packets**: structured units of resumable cognitive work carrying context, provenance, constraints, assumptions, decisions, traces, routing metadata, and next action.

The existing corpus already defines:

```text
Fractanet             -> packetized, decentralized cognitive mesh
COP                   -> Events, Topics, Tasks, Steps, Artifacts, Continuations, Bus, Scheduler
Cognitive Packets     -> envelope/payload units of resumable work
Agent-Resumable CLI   -> inversion of control through explicit continuations
Pipeline              -> packet-switched cognitive production
Cogentigraphic Distillation -> operating rules separated from memory
```

This paper adds one missing operational link:

> **Cogentia can be understood as the method-governed routing layer for cognitive continuation packets inside Fractanet.**

In this role, Cogentia does not centralize intelligence. It receives packets, qualifies their state, preserves methodological constraints, selects the next cognitive capability, and decides whether a packet should be routed, split, merged, suspended, escalated to human judgment, revised, rejected, or closed.

The key formula is:

```text
Fractanet commutes.
Cogentia routes.
Agents resume.
Humans judge.
```

This makes Cogentia directly relevant to **Autonomie de Capacité**: capacity does not arise only from possessing tools or data, but from making cognitive work traceable, resumable, attributable, and governable. Conversely, opaque systems produce an **impunity by obscurity**: if the acts, transitions, constraints, and responsibility-bearing steps are not routed and logged, accountability becomes structurally difficult. Cognitive continuation packet routing is therefore not only a technical architecture. It is a method for making distributed cognition capable and accountable.

---

## Version Note

### v0.3

This version is the publication candidate. It responds to critique of v0.2 by:

- reducing residual repetition;
- merging the delegation/capability discussion;
- shortening the municipal audit example;
- clarifying that schemas are routing projections, not replacements for `cognitive_packets.md`;
- keeping the core architecture unchanged.

### v0.2

v0.2 added the executive summary, corpus-positioning table, Autonomie de Capacité link, transformation map, self-evaluation, changelog, and reduced repetition.

### v0.1

v0.1 introduced Cogentia as a method-governed router for cognitive continuation packets.

---

## Abstract

Current multi-agent AI architectures increasingly support messages, tools, handoffs, traces, and workflow state. Yet they often leave underspecified the unit of resumable cognitive work and the method by which that work should be routed across humans, AI agents, scripts, repositories, and governance layers.

This paper proposes **Cogentia as a cognitive continuation packet router**. A cognitive continuation packet is a cognitive packet whose payload preserves enough work state to be resumed by another actor. The routing layer reads the packet envelope, inspects relevant payload metadata, applies method-governed constraints, and determines the next valid transition.

The paper argues that the first useful target of cogentigraphic distillation may not be a small model that answers questions directly, but a smaller model that learns a **routing policy**: recognizing packet state, selecting method-augmented next hops, preserving proof discipline, and preventing premature closure.

The result is an architecture in which intelligence remains distributed, while continuity is governed.

**Keywords:** Cogentia, Fractanet, cognitive packets, continuations, packet routing, method routing, cogentigraphic distillation, inversion of control, multi-agent systems, COP, Inox, human judgment.

---

## 1. Object

The object of this document is to define the role of a **Cogentia routing agent** inside the broader Fractanet architecture.

Proposed definition:

> **A Cogentia routing agent receives, qualifies, enriches, routes, suspends, splits, merges, critiques, escalates, rejects, or closes cognitive continuation packets while preserving their methodological, evidential, provenance, and human-judgment constraints.**

It is not primarily:

- a chatbot;
- a universal assistant;
- a centralized orchestrator;
- a workflow engine;
- a factual memory store;
- a digital twin that speaks in place of a person;
- an autonomous political decision-maker.

It is primarily:

```text
an inspectable cognitive packet router
with method-governed routing policy.
```

---

## 2. Position in the Existing Corpus

This paper is a bridge, not a replacement.

| Existing document | Existing contribution | This paper's addition |
|---|---|---|
| `FractaVolta/research/fractanet.md` | Fractanet as decentralized cognitive mesh | identifies the Cogentia routing function at the cognitive layer |
| `FractaVolta/research/generalized_packet_networks.md` | generalized packets as bounded operational units | specifies cognitive continuation packets as routable work units |
| `cogentia/research/cognitive_packets.md` | envelope/payload format | develops routing as a first-class architectural role |
| `cogentia/research/agent_resumable_cli.md` | tools emit continuations instead of calling AI internally | generalizes this inversion beyond CLI tools |
| `cogentia/research/pipeline.md` | pipeline as packet-switched cognitive network | identifies the router inside that network |
| `cogentia/research/cogentigraphic_distillation.md` | cognitive operating rules distinct from memory | proposes routing policy as a first distillation target |
| `inseme` / COP documents | Events, Topics, Tasks, Steps, Artifacts, Continuations, Bus, Scheduler | maps routing decisions to COP-compatible transitions |

The narrowed question is:

> At the cognitive layer of Fractanet, what exactly is routed, and according to what policy?

Proposed answer:

```text
What is routed:
  cognitive continuation packets.

What routes them:
  Cogentia, as method-governed routing layer.

What constrains routing:
  proof, source, method, uncertainty, mandate, and human judgment.
```

---

## 3. From Packet Switching to Cognitive Continuation Routing

Internet packet switching routes bounded units of data across a network without requiring a dedicated end-to-end circuit. Fractanet extends packet thinking to heterogeneous substrates.

At the cognitive level:

| Data network | Cognitive Fractanet |
|---|---|
| data packet | cognitive continuation packet |
| IP header | cognitive packet envelope |
| payload | cognitive payload |
| router | Cogentia routing agent / COP scheduler |
| next hop | next cognitive capability |
| TTL | freshness / validity / obsolescence |
| checksum | schema validation / hash / provenance check |
| retransmission | retry / resume / alternative agent |
| fragmentation | packet split |
| reassembly | consolidation / merge |
| dead letter queue | suspended or unresolved packet |
| routing table | capability registry + method policy |

The analogy has limits. A data packet usually does not carry an explicit theory of its own interpretation. A cognitive packet may carry assumptions, decisions, evidence levels, resumption risks, protocol headers, and method constraints.

Therefore:

```text
Internet routes data packets.
Fractanet routes continuation packets.
Cogentia routes them methodologically.
```

---

## 4. Cognitive Continuation Packets

A **cognitive continuation packet** is a cognitive packet whose payload preserves a resumable state of work.

It must carry enough structure for another human or machine actor to continue without restarting from zero.

Minimal continuation payload:

```yaml
payload:
  object: "What is being worked on"
  state:
    established: []
    partial_results: []
    current_status: "open | blocked | partial | ready_for_review"
  decisions: []
  constraints: []
  assumptions: []
  open_questions: []
  next_action: "The next small useful action"
  resumption_risks: []
```

Routable envelope metadata:

```yaml
envelope:
  packet_kind: continuation
  transmission_mode: copy | reference
  status: active | suspended | completed | failed | superseded
  provenance:
    actor: string
    timestamp: string
  context_ref:
    repositories: []
    documents: []
    parent_packet: string | null
  routing:
    intended_receiver: string | null
    required_capability: string | null
    response_channel: string | null
  traces:
    sources: []
    commits: []
    files: []
    prior_packets: []
```

A packet may travel by copy/paste, Markdown, JSON, GitHub issue, email, CLI continuation, COP artifact, A2A message, MCP resource, workflow state, Git commit, or future Inox-native representation.

---

## 5. Routing Is Capability-Based, Not Vendor-Based

A naive multi-agent system delegates tasks:

```text
Agent A asks Agent B to do X.
```

A cognitive packet routing system routes resumable work:

```text
Packet P is in state S.
It requires capability C.
It carries constraints K.
It can be resumed by any actor satisfying C and K.
```

Delegation is actor-centered. Routing is packet-centered.

Delegation asks:

```text
Who should do this?
```

Routing asks:

```text
What capability is required for this packet's next valid transition?
```

This preserves inversion of control.

The routing agent should avoid hard-coding named agents where possible. It should route toward capabilities such as:

- `source_inventory`;
- `ocr_quality_review`;
- `legal_caution`;
- `civic_audit`;
- `public_formulation`;
- `academic_derivation`;
- `method_critique`;
- `human_arbitration`;
- `schema_validation`;
- `publication_review`.

Only after capability routing should a concrete runner be selected:

```text
capability -> available agent / human / script / model / service
```

Bad routing:

```yaml
target_agent: "ChatGPT"
```

Better routing:

```yaml
target_capability: "ocr_quality_review"
candidate_runners:
  - local_ocr_script
  - human_reviewer
  - gpt_model
  - claude_model
  - future_inox_agent
selection_policy: "prefer deterministic or human verification for legal-risk claims"
```

The soundness test:

> Can the target runner be replaced by a human, another AI, a local model, or a script without changing the packet protocol?

If yes, the routing design is sound. If no, the design is contaminated by provider coupling.

---

## 6. Cogentia's Specific Role

A generic router asks:

```text
Where should this packet go next?
```

A Cogentia router asks:

```text
Where may this packet go next,
given its method,
source status,
uncertainty,
proof level,
mandate,
risks,
and human-judgment boundary?
```

Cogentia adds method-governance to routing.

| Function | Meaning |
|---|---|
| Qualify | identify packet kind, domain, source quality, status, risk, missing evidence |
| Enrich | add methods, constraints, evidence policy, output schema, review conditions |
| Route | choose next capability or runner |
| Split | decompose a complex packet into child packets |
| Merge | consolidate partial packets without erasing uncertainty |
| Suspend | stop progression until a condition is met |
| Escalate | send to human judgment when required |
| Revise | send back with critique |
| Reject | refuse malformed, unsafe, unauthorized, or unresumable packets |
| Close | mark complete with output and trace |

The architectural principle:

> Cogentia does not centralize intelligence. It centralizes the conditions of cognitive continuity.

---

## 7. Method-Augmented Routing

Routing should not depend only on topic or agent availability. It should depend on **method-augmented routing**.

A packet carries or receives a method layer:

```yaml
method_layer:
  established_methods:
    - civic_audit
    - legal_caution
    - ocr_document_audit
  cogentia_augmentation:
    - traceability
    - proof_levels
    - uncertainty_explicit
    - source_product_separation
    - continuation_required
    - human_judgment_preserved
```

Rule:

```text
Established method
+ Cogentia constraints
= method-augmented routing policy
```

Examples:

| Established method | Cogentia augmentation |
|---|---|
| OSINT | preserve open leads, do not infer intent from absence, cite source paths |
| legal caution | separate documentary trace from legal conclusion, require human review for public accusation |
| civic audit | compare announced vs decided, attach confidence level, preserve OCR limits |
| journalism | state what is known, what is inferred, what remains to verify |
| scientific method | express hypotheses, tests, falsification criteria, evidence levels |
| engineering | record constraints, alternatives, failure modes, rollback options |

Cogentia does not replace established methods. It augments them, selects them, and preserves their constraints across packet transitions.

---

## 8. Routing Decisions and State Transitions

A minimal routing decision vocabulary:

```yaml
routing_decision:
  decision: route | split | merge | suspend | escalate | revise | close | reject
```

Typical meanings:

| Decision | Meaning |
|---|---|
| `route` | send the packet to a required capability |
| `split` | create child packets |
| `merge` | combine child packet results into a new continuation |
| `suspend` | stop progression until a condition is met |
| `escalate` | require human judgment |
| `revise` | return to previous agent or capability with critique |
| `close` | mark resolved with output and trace |
| `reject` | refuse malformed, unsafe, unauthorized, or unresumable packet |

Possible packet states:

```text
created
qualified
method_selected
sources_needed
sources_verified
extraction_done
audit_done
drafted
criticized
human_review_needed
published
archived
suspended
failed
superseded
closed
```

Transitions should be guarded.

Example:

```yaml
transition_rule:
  from: audit_done
  to: drafted
  requires:
    - source_confidence: ">= medium"
    - uncertainty_marked: true
    - legal_caution_done: true
  forbidden_if:
    - unresolved_public_accusation: true
```

This makes prudence executable.

Instead of saying:

```text
Be careful.
```

Cogentia can say:

```text
This packet cannot move from audit_done to public_draft until legal_caution_done is true.
```

---

## 9. Distillation Target: Routing Policy

`cogentigraphic_distillation.md` defines the distillation target as cognitive operating rules.

This paper proposes a specific first implementation target:

```text
cogentigraphic distillation for routing policy
```

The small model does not need to answer final questions. It needs to classify and route packets.

Input:

```json
{
  "packet_kind": "continuation",
  "status": "active",
  "domain": "municipal_document_audit",
  "source_quality": "imperfect_ocr",
  "public_risk": "medium",
  "missing": ["canonical_pdf_check"],
  "current_findings": [
    "ODJ and deliberation appear to match",
    "vote count OCR seems inconsistent"
  ]
}
```

Expected output:

```json
{
  "decision": "route",
  "target_capability": "pdf_verification",
  "reason": "Vote count cannot be trusted from OCR.",
  "preserve_constraints": [
    "mark_ocr_uncertainty",
    "avoid_false_precision",
    "do_not_publish_exact_vote_count_until_verified"
  ],
  "next_state": "waiting_for_pdf_verification"
}
```

Evaluation criteria:

- correct next capability;
- required constraints preserved;
- suspension when evidence is insufficient;
- escalation when human judgment is required;
- no provider-specific assumption;
- no final-answer hallucination.

This is a smaller, cleaner, and more testable target than full language generation.

---

## 10. Minimal Schemas

These schemas are **routing projections**. They do not replace `cognitive_packets.md`.

### 10.1 Routing-oriented packet fields

```yaml
type: cognitive_packet
version: "routing-projection-v0.1"

envelope:
  packet_kind: continuation | routing | objection | hypothesis | decision | failure
  transmission_mode: copy | reference
  status: draft | active | suspended | completed | failed | superseded
  provenance:
    actor: string
    timestamp: string
    authority: string | null
  context_ref:
    repositories: []
    documents: []
    parent_packet: string | null
    topic_id: string | null
  routing:
    current_capability: string | null
    required_capability: string | null
    candidate_runners: []
    response_channel: string | null
  traces:
    sources: []
    artifacts: []
    commits: []
    prior_packets: []

payload:
  object: string
  state:
    established: []
    partial_results: []
    missing: []
    open_questions: []
  method_layer:
    established_methods: []
    cogentia_augmentation: []
    excluded_methods: []
  constraints:
    epistemic: []
    source: []
    legal: []
    privacy: []
    governance: []
    output: []
  assumptions: []
  next_action: string | null
  expected_result_schema: object | null
  resumption_risks: []
```

### 10.2 Routing decision

```yaml
type: cogentia.routing_decision
version: "0.1"

packet_id: string
input_packet_hash: string | null

decision: route | split | merge | suspend | escalate | revise | close | reject

reason:
  summary: string
  evidence: []
  uncertainty: string | null

target:
  capability: string | null
  preferred_runner: string | null
  forbidden_runners: []

constraints:
  preserve: []
  add: []
  remove: []

expected_output:
  schema: object | string | null
  confidence_required: low | medium | high | null

next_state:
  if_success: string | null
  if_failure: string | null
  if_insufficient_evidence: string | null

human_review:
  required: true | false
  reason: string | null
```

---

## 11. Worked Example: Municipal Document Audit

User request:

```text
Analyze the Corte municipal council documents and prepare a public note.
```

A final-answer model may try to produce the note immediately. A Cogentia routing agent should first route the work.

Initial packet:

```yaml
packet_kind: continuation
object: "Audit Corte municipal council documents and prepare public note"
source_quality: "imperfect_ocr"
public_risk: "medium"
```

Split decision:

```yaml
routing_decision:
  decision: split
  reason:
    summary: "The task combines source verification, OCR evaluation, civic audit, legal caution, and public formulation."
  children:
    - target_capability: source_inventory
    - target_capability: ocr_quality_review
    - target_capability: civic_audit
    - target_capability: legal_caution
```

If OCR reports an inconsistent vote count:

```yaml
routing_decision:
  decision: suspend
  reason:
    summary: "Numerical vote count is inconsistent with attendance data."
  target:
    capability: pdf_verification
  constraints:
    preserve:
      - avoid_false_precision
      - mark_ocr_uncertainty
```

After reports return:

```yaml
routing_decision:
  decision: merge
  inputs:
    - source_report.v1
    - ocr_quality_report.v1
    - odj_act_match.v1
    - public_risk_note.v1
  target:
    capability: public_formulation
  constraints:
    preserve:
      - explicit_uncertainty
      - source_paths
      - no_unsupported_legal_claim
```

This example shows why routing matters politically. Without explicit packet routing, missing sources, OCR uncertainty, legal risk, and public formulation collapse into one opaque operation. That collapse creates the conditions for confusion, overclaiming, or impunity by obscurity. With routing, each transition becomes visible and contestable.

A fuller municipal-audit example should be moved to a companion file if needed, for example `routing_examples.md`.

---

## 12. Link to Autonomie de Capacité

Autonomie de Capacité is not merely institutional autonomy. It is the real ability to act, verify, continue, and transform conditions.

A territory, association, citizen group, or research corpus is not capable merely because it has documents, agents, or software. It becomes capable when cognitive work can be:

- decomposed;
- routed;
- resumed;
- audited;
- attributed;
- corrected;
- continued;
- transformed into public or operational outputs.

Cognitive continuation packet routing contributes to Autonomie de Capacité at the cognitive-infrastructure layer.

It answers:

```text
Who can resume the work?
On what basis?
With what sources?
Under what method?
With what constraints?
With what missing evidence?
With what accountability?
```

This is the opposite of impunity by obscurity.

In opaque systems:

```text
decision chains disappear;
responsibility dissolves;
sources are inaccessible;
method is implicit;
failure is unattributed;
the public sees only the final surface.
```

In a routed packet system:

```text
transitions are visible;
missing evidence is explicit;
responsibility-bearing steps are logged;
human review thresholds are declared;
false closure is harder to hide.
```

Thus the routing layer is not only technical. It is an anti-capture mechanism.

---

## 13. Failure Modes

| Failure mode | Description | Correction |
|---|---|---|
| Final-answer collapse | router produces final answer instead of routing decision | route first; answer only when closure conditions hold |
| Method omission | capability selected without method constraints | require method layer preservation |
| Provider capture | specific vendor addressed instead of capability | route by capability first |
| False closure | packet closed despite material open questions | unresolved material questions become packets or continuation items |
| Citation theater | citations do not support claims | route to source-support check |
| Governance bypass | public/legal/political risk without human review | make review thresholds transition guards |
| Procedural overfitting | router creates packets unnecessarily | add closure and simplicity conditions |
| Packet inflation | every minor uncertainty becomes a packet | branch only material uncertainty |
| Malicious packet | forged provenance or injected instruction | validate envelope, provenance, and authority |
| Obsolete packet | work continues after context changed | support explicit obsolescence |

---

## 14. Implementation Path

### 14.1 Prompt-level MVP

First implementation can be prompt-only.

Inputs:

- cognitive packet;
- method library;
- Cogentia constraints;
- capability registry;
- routing decision schema.

Output:

- routing decision JSON/YAML.

No fine-tuning is required.

### 14.2 Symbolic validator

Add deterministic checks:

- schema validity;
- required fields;
- forbidden transitions;
- human review guards;
- missing provenance;
- missing source policy;
- invalid confidence claims.

### 14.3 Small routing model

Train or fine-tune a small model to produce routing decisions.

Training example shape:

```json
{
  "input_packet": {},
  "expected_routing_decision": {},
  "evaluation": {
    "must_have": [],
    "must_not_have": []
  }
}
```

The model should be evaluated against routing correctness, not prose quality.

### 14.4 COP integration

In COP terms:

- packets may be Artifacts;
- routing decisions may be Events;
- Continuations may be reserved Artifact subtypes;
- Scheduler / JobScheduler may act on routing decisions;
- sub-buses may scope routing by Topic;
- federation primitives may propagate interest in packet kinds or capabilities.

### 14.5 `cogentia.js` integration

Possible future commands:

```bash
cogentia packet route <packet.yml>
cogentia packet validate <packet.yml>
cogentia packet split <packet.yml>
cogentia packet merge <packet-a.yml> <packet-b.yml>
cogentia packet suspend <packet.yml>
cogentia packet resume <packet.yml> --step-result result.yml
cogentia packet critique <packet.yml>
```

Consolidation note, 2026-06-09: these `packet` commands are still a design target. The current `scripts/cogentia.js` v2 surface implements the corpus/document layer (`docs`, `corpus`, `state`, `git`) and the external-judgment layer (`continuation`). Packet routing should therefore be introduced as a new prototype, not treated as already available CLI behavior.

### 14.6 Inox integration

Inox may eventually provide the runtime substrate for:

- lightweight packet routers;
- reactive sets;
- actor mailboxes;
- control-plane / data-plane separation;
- edge Fractanet nodes;
- local routing policies;
- offline degraded-mode continuation.

---

## 15. Research Questions

1. **Routing correctness**  
   How do we evaluate whether a cognitive packet was routed to the correct next capability?

2. **Method preservation**  
   How do we verify that a router preserved method constraints across packet transitions?

3. **Capability ontology**  
   What is the minimal useful set of cognitive capabilities?

4. **Human review thresholds**  
   Which transitions require human review by default?

5. **Packet granularity**  
   When should a packet be split, and when should uncertainty remain inside one packet?

6. **Routing distillation**  
   Can a small model learn routing decisions from synthetic and human-reviewed examples?

7. **Federated routing**  
   How should packets circulate across independent COP/Fractanet nodes without central authority?

8. **Obsolescence**  
   When should a packet be marked obsolete rather than retried?

9. **Security**  
   How can malicious packets, prompt injection, forged provenance, or poisoned continuations be detected?

10. **Governance**  
    Who is accountable for a wrong routing decision when human, model, script, and corpus all contributed?

---

## 16. Claim Manifest

### Claim 1 — Fractanet cognitive routing

At the cognitive layer, Fractanet can be understood as a network that routes cognitive continuation packets rather than merely messages or prompts.

Status: **architectural hypothesis**.

### Claim 2 — Cogentia routing role

Cogentia can serve as the method-governed routing layer for such packets.

Status: **corpus-consistent architectural extension**.

### Claim 3 — Capability routing

Routing should target capabilities before named agents or vendors.

Status: **design principle**.

### Claim 4 — Method-augmented routing

Routing decisions should preserve established methods plus Cogentia constraints: source discipline, proof levels, uncertainty, continuity, and human judgment.

Status: **methodological rule**.

### Claim 5 — Distillation target

The first useful cogentigraphically distilled model may be a routing model rather than a final-answer model.

Status: **technical hypothesis**.

### Claim 6 — Non-centralization

A Cogentia routing agent should not centralize intelligence. It should centralize the conditions of continuity.

Status: **architectural principle**.

### Claim 7 — Capacity through traceable continuation

A cognitive infrastructure increases capacity when it makes distributed work resumable, attributable, auditable, and correctable.

Status: **Autonomie de Capacité extension**.

---

## 17. What This Paper Does Not Claim

This paper does not claim that:

- all cognition should be packetized;
- routing packets is sufficient for intelligence;
- a small routing model can replace frontier models;
- Cogentia should become a central controller;
- every continuation needs a complex routing process;
- human judgment can be automated away;
- Fractanet is already implemented as described here;
- packet routing solves truth, legality, ethics, or governance by itself;
- traceability automatically produces justice or accountability.

It claims only that:

> The existing Cogentia / Fractanet corpus already contains the elements for an explicit cognitive continuation packet routing layer, and that layer is worth naming, specifying, testing, and eventually distilling.

---

## 18. Transformation Map

This document emerged through the following transformation:

```text
existing Fractanet / GPN / COP / Cogentia corpus
-> discussion of cogentigraphic distillation
-> recognition that methods should be augmented, not replaced
-> distinction between final-answer generation and method routing
-> preservation of inversion of control through continuations
-> formulation: agent Cogentia routes cognitive continuation packets
-> analogy: Fractanet as packet switching at the cognitive substrate
-> v0.1 source draft
-> Grok critique
-> v0.2 with executive summary, self-evaluation, Autonomie de Capacité link, and reduced repetition
-> Grok critique
-> v0.3 publication candidate with lighter structure and shorter example
```

The key transformation:

```text
Cogentia as operating-rule layer
-> Cogentia as routing policy for continuation packets
```

This does not replace cogentigraphic distillation. It gives it a first concrete target.

---

## 19. Self-Evaluation

### Strengths

- Strong integration with existing corpus documents.
- Clear architectural role for Cogentia inside Fractanet.
- Preserves inversion of control.
- Avoids provider capture by using capability-based routing.
- Provides schemas and a concrete municipal-audit example.
- Links technical routing to Autonomie de Capacité and anti-obscurity.

### Weaknesses

- The routing ontology remains provisional.
- COP integration was described conceptually in earlier versions; key elements of the routing substrate (generalized SubBus with per-topic scoping, idempotent federation for mesh propagation of interest in packet kinds / capabilities, topic-aware scheduling, and standard cop.task.* / cop.job.* events) are now implemented in `inseme/packages/cop-kernel` (see bus.js, scheduler.js, jobScheduler.js, Cop-kerneltasks.js, capabilityRegistry.js and the bac-à-sable cognitive-packet-router-demo + federation-demo + raix-obsolescence-resilience scenarios). The "COP pass" (mapping routing decisions to Events / sub-buses / federation) is actively being realized. Additional 2026-06 restart work included SubBus listener hygiene (once-per-type parent registration + proper unsub on last handler + clear) and async handler delivery for reliable routed publish chains, plus `resetForTest()` + pipeline auto-reset for schedulers/jobSchedulers/registry to prevent timer/pending accumulation across repeated heavy router+mesh scenarios.
- Security and malicious packet handling remain underdeveloped.
- A lightweight in-memory `CapabilityRegistry` stub (register/has/canSatisfy/list/resetForTest) is now implemented and wired into the reactive router agent demo in the bac-à-sable (the agent consults it for `requiredCapability` while still reading *only the envelope*). This provides a first concrete "method-governed routing policy" layer / capability registry. A production backing could delegate to `agentRegistry` + capabilities from cop_agents. See `inseme/packages/cop-kernel/src/capabilityRegistry.js` and the updated `cognitive-packet-router-demo.js`.
- The paper assumes familiarity with the corpus despite efforts at self-containment.
- The political consequences are only sketched.

### Levels of Evidence

```text
Level A — Established in corpus:
  cognitive packets, continuations, Cogentia pipeline, Fractanet, COP direction, the COP Bus + federation + per-topic sub-bus implementation as the decentralized switching fabric for continuation packets (see cop-kernel bus.js, scheduler.js, capabilityRegistry.js and bac-à-sable scenarios including the cognitive-packet-router-demo which now exercises a reactive subscribing router agent + capability stub on top of the envelope), plus hygiene work (SubBus unsub hygiene + async delivery, resetForTest + auto-reset for schedulers/registry to keep long-running router+mesh experiments stable).

Level B — Defensible architectural synthesis:
  Cogentia as method-governed router.

Level C — Technical hypothesis:
  small routing model as first distillation target.

Level D — Political extension:
  routing as support for Autonomie de Capacité and anti-obscurity.
```

### Provisional Bullshit Meter

```text
0 = purely rigorous
10 = empty rhetoric

Provisional score: 1.0 / 10
```

Rationale:

- The core concept is strongly grounded in existing corpus material.
- Schemas and examples make it operational.
- Some analogies remain ambitious and require implementation evidence.
- The Autonomie de Capacité link is plausible but needs future case studies.

---

## 20. Conclusion

This paper adds the missing operational link:

```text
Cogentia as cognitive continuation packet router.
```

In that role, Cogentia does not replace agents. It routes work among them.

It does not replace the corpus. It preserves access to it.

It does not replace established methods. It augments and selects them.

It does not replace human judgment. It knows when to require it.

The decisive formula:

```text
Fractanet commutes.
Cogentia routes.
Agents resume.
Humans judge.
```

Or, more analytically:

> **Cogentia centralizes neither intelligence nor authority. It centralizes the conditions of cognitive continuity: method, provenance, proof, constraint, routing, suspension, and accountable resumption.**

---

## Changelog

### v0.3 — 2026-06-01

- Reduced residual repetition.
- Merged routing-vs-delegation and capability-vs-agent discussion.
- Shortened municipal audit example.
- Harmonized self-evaluation and bullshit meter format.
- Clarified schemas as routing projections rather than replacements for `cognitive_packets.md`.
- Preserved v0.2 doctrine and publication structure.

### v0.2 — 2026-06-01

- Added executive summary.
- Added explicit corpus-positioning table.
- Reduced repeated explanations of packets, routing, and capabilities.
- Added explicit section on Autonomie de Capacité and impunity by obscurity.
- Added transformation map.
- Added self-evaluation and evidence levels.
- Added claim about capacity through traceable continuation.
- Clarified schemas as routing projections rather than replacements for `cognitive_packets.md`.

### v0.1 — 2026-06-01

- Initial source draft.
- Defined Cogentia as a cognitive continuation packet router.
- Added routing decision vocabulary.
- Added minimal routing packet and routing decision schemas.
- Added municipal document audit example.
- Added failure modes.
- Added implementation path.

---

## Continuation

This v0.3 publication candidate opens the following continuations:

1. **Corpus integration pass**  
   Partially open. This document already declares those documents as sources. Reverse references from `cognitive_packets.md`, `pipeline.md`, `agent_resumable_cli.md`, and `cogentigraphic_distillation.md` remain sparse and should be added only when those documents are otherwise substantively revised.

2. **Index pass**  
   Complete. The document is listed in `cogentia/research/index.md` as a working paper. A future index edit is needed only if the document is promoted from working paper to published source.

3. **Schema pass**  
   Extract `cogentia.routing_decision.v0.1.schema.json` and `cogentia.routing_packet_projection.v0.1.schema.json`.

4. **Capability registry pass**  
   (Partially complete) A lightweight in-memory stub + resetForTest + integration into a reactive router agent demo now exists in `inseme/packages/cop-kernel/src/capabilityRegistry.js` and the bac-à-sable `cognitive-packet-router-demo.js`. Next: richer `canSatisfy` logic (providers, risk, method constraints), minimal ontology examples, and possible backing via agentRegistry.

5. **Dataset pass**  
   Generate synthetic training examples for a routing model: input packet -> routing decision -> evaluation criteria.

6. **COP pass**  
   (Actively advancing) Core substrate (SubBus, federation, per-topic, topic-aware schedulers, Cop-kerneltasks helpers, asCognitivePacket + cop.packet.* emission) implemented and exercised. Hygiene (listener cleanup, async delivery, resets) added in 2026-06 restart. The cognitive-packet-router-demo now demonstrates a full envelope-only reactive agent + capability stub loop on federated topic sub-buses. See `inseme/packages/cop-kernel/docs/SESSION_RESUME_cognitive-packet-router-2026-06.md` and `cognitive-packet-switching-compatibility.md` for status. Next: tighter mapping of routing decisions into cop.task.* / cop.job.* / cop.packet.* events and JobScheduler policies.

   **Real adoption:** The Ophelia agent (inseme `brique-ophelia` / the civic assembly mediator) now uses COP from now on for its core orchestration (per user: "I believe we should have the Ophelia agent use COP from now on"). runOperator creates COP Tasks/Steps for sessions+turns, populates CapabilityRegistry from its ROLES, consults cogentiaRoutePacket per iteration (envelope-only hybrid policy), emits cop.packet.created via asCognitivePacket, and completes lifecycle. Cleans (aliases, shape fixes, scope bugs) done first. This makes the "higher true router" agent a first-class live user of the packet routing substrate. See resume "Picked: Ophelia..." section.

7. **Security pass**  
   Define validation against malicious packets, forged provenance, prompt injection, and poisoned continuations.

8. **MVP pass**  
   Still open. Current `cogentia.js` v2 does not expose `packet` commands; it exposes corpus navigation, generated-view verification, and `cogentia.continuation.v2` external judgment. The first MVP should therefore be a deliberately small `packet route` prototype layered on top of existing continuation and document-query primitives.

9. **RFC-style derived product pass**  
   Produce an ASCII RFC-style draft after the routing schema and capability registry stabilize. This should be presented as an experimental derived product, not as an IETF standard claim.

10. **Public derived product pass**  
    Produce a short public-facing explanation: “Fractanet commutes, Cogentia routes.”


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Research Index — Cogentia](index.md)
- [Fractanet — Generalized Control Planes for Heterogeneous Packet Networks](https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/fractanet.md)
- [COOP — Tutorial and Near-Specification](https://github.com/JeanHuguesRobert/inseme/blob/main/research/coop_tutorial.md)
- [Documents - All Tracked Repos](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/documents.md)
<!-- END_AUTO: backlinks -->
