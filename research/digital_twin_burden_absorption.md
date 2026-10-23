---
title: "Digital Twin Burden Absorption"
subtitle: "Absorbing low-value procedural work and reinternalizing unjustified administrative burden"
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
  - "research/administrative_burden_and_exemplar_tests.md"
  - "research/portable_continuations_and_judgment_boundaries.md"
  - "research/intent.md"
  - "research/cognitive_packets.md"
tags:
  - digital-twin
  - administrative-burden
  - burden-absorber
  - burden-reinternalization
  - autonomy-of-capacity
  - continuation
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Digital Twin Burden Absorption

## Definition

A Digital Twin may serve its principal as a **Burden Absorber**:

> **It performs low-value procedural, documentary, and administrative work on behalf of its principal and externalizes only those points that genuinely require human or external judgment.**

This gives the Twin a concrete protective function in environments where organizations externalize learning, compliance, correction, or documentation costs onto users.

## Operating loop

```text
incoming requirement
       ↓
retrieve existing facts and documents
       ↓
identify legal / procedural basis where available
       ↓
perform deterministic transformations
       ↓
prepare the smallest sufficient response
       ↓
trace the act and its evidence
       ↓
judgment boundary?
   ┌───────┴────────┐
   no               yes
   ↓                 ↓
continue          Continuation
                     ↓
           principal / user's agent
                     ↓
                 StepResult
                     ↓
                  resume
```

The principal should ideally spend attention only where attention adds value.

## Burden Reinternalization

A Twin may also seek to **reinternalize** burden toward the entity that created it.

When a requirement is unsupported, duplicative, ambiguous, or apparently disproportionate, the Twin may request from its author the information needed to justify or satisfy that requirement, including where relevant:

- legal basis;
- purpose;
- proportionality;
- documents or data already held by the requesting entity;
- explanation of why those data cannot be reused;
- correction or appeal route;
- machine-readable data or interface.

The principle is:

> **The entity that creates a requirement should bear as much as reasonably possible of the informational and justificatory cost produced by that requirement.**

This is not retaliation. The Twin must not generate work merely to punish an institution or counterpart. It should instead avoid leaving avoidable externalities on its principal.

## Stabilizer pattern

For low-value or apparently absurd requests, a useful stabilizer is:

> **Produce the smallest response that satisfies the requirement as automatically as possible.**

If the requirement itself needs justification, request that justification explicitly and preserve the answer as evidence.

The result is a shift from human cognitive load toward machine processing and attributable institutional responsibility.

## Autonomie de Capacité

Burden absorption is a practical form of Autonomie de Capacité.

The immediate objective is not necessarily to abolish bureaucracy. It is to reduce its ability to consume scarce human time and attention.

```text
bureaucratic input
→ machine absorption
→ explicit judgment boundaries
→ human attention only where necessary
```

A faithful Digital Twin therefore protects not only identity, memory, and mandates, but also the principal's **attention budget**.


## Native COP accounting for attention (2026-10-23 cross-reference)

The burden-absorbing Twin's objective must be evaluated with the **already established strict COP accounting**, not with a new incompatible attention score. See [inseme COP_ACCOUNTING §4.2–4.3](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/COP_ACCOUNTING.md): `human.attention` is a separate native resource (e.g. `minute`), with `measured`, `estimated` (interval, confidence, method, evidence), and `not_estimated` statuses. Never silently translate attention to dollars, tokens or quota; a valuation between dimensions is a separately evidenced and time-bounded event. Unknown is not zero.

For a cognitive prosthesis, evaluate **net attention released** only where a defensible baseline exists:

`net_attention_released = baseline_human_attention - (residual_human_work + supervision + verification + interruptions + recovery)`

This is a measurement proposal, **not** a new normative COP schema, and only valid for comparable tasks with source-backed assessments. If components are not measurable, return an estimate with uncertainty or `not_estimated` rather than fabricate a gain. Measure attention consumed as well as any claimed saving; separately record dollar/compute costs in their native resource dimensions.

A task's benefit is not only minutes saved: creative judgment quality, continuity, mistakes prevented, and autonomy remain distinct outcome evidence; do not convert them into fictitious attention savings. Use a before/after Reality test for a bounded class of repetitive administrative tasks; check whether the Twin merely shifted its own monitoring/approval burden onto the principal. Preserve the principal's right to override and the absence of hidden agent decisions.

**Design invariant:** optimizing the amount of agent activity is not equivalent to preserving human attention. A worthwhile burden absorber should reduce the principal's total avoidable attention consumption without eroding control, traceability, or the quality of the work.
