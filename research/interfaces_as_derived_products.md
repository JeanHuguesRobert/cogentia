---
title: Interfaces as Derived Products
subtitle: Operational projections, observable constraints, and reverse inference
version: '0.1'
status: working-paper — proposal
date: '2026-10-21'
author: Jean Hugues Noël Robert
license: CC BY 4.0
language: en
document_role: source
document_kind: research-paper
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
review:
  status: unreviewed
  reviewed_by: []
provenance:
  origin_type: github-issue
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: https://github.com/JeanHuguesRobert/cogentia/issues/16
  origin_date: '2026-10-21'
  derived_from:
    - https://github.com/JeanHuguesRobert/cogentia/blob/main/research/derived_products.md
    - https://github.com/JeanHuguesRobert/cogentia/blob/main/research/pipeline.md
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/interfaces_as_derived_products.md
---

# Interfaces as Derived Products

## Scope and authority

This working paper extends, rather than replaces, [Derived Products](derived_products.md) and [Pipeline](pipeline.md). It articulates a proposed *source-level* methodological rule. Its review and adoption remain pending; neither the present document nor an Issue alone makes a new doctrine sovereign.

**Thesis:** An interface is a situated operational projection: it makes certain actions possible, easy, difficult, or impossible under specific technical, institutional, and social conditions. An interface can embody doctrine in action without faithfully representing the doctrine its operator declares.

Here, *interface* includes command lines, forms, issue trackers, APIs, conversational affordances, workflows and institutional submission channels. Not every UI element is a separate derived product; the classification is useful when the projection has an identifiable contract, purpose and observable consequences.

## 1. Forward derivation: from source to affordance

A source document, protocol, rule, state or institutional policy may be projected into an interface:

```text
qualified sources / rules / state
  -> implementation decisions and platform constraints
  -> visible affordances and blocked actions
  -> user action
  -> result, refusal or failure
  -> durable trace and source-level feedback
```

The arrows are *not* proofs of faithfulness. Implementation may omit, transform or contradict a premise. A user-facing screen can hide conditions enforced by servers or procedures. Platform and access constraints may also change independently of doctrine.

Interfaces are particularly consequential derived products because they do not merely *describe* a possible action: they mediate whether that action can actually be completed.

This account is consistent with [Derived Products](derived_products.md), where operational products are one function of projection, and [Pipeline](pipeline.md), where observed effects and critique return through continuations into the Corpus.

## 2. Symmetry, asymmetry, and authority

A **relatively symmetric** interface exposes much of the source protocol's distinctions and outcomes, allowing a competent observer to reconstruct its relevant state transitions. A documented CLI with explicit input schemas and typed results may approach this condition.

An **asymmetric** interface selects or compresses that protocol: a single submit button may conceal many validation branches, access policies and failure states. Asymmetry is often necessary; it is not automatically deception.

Symmetry is a *degree of reconstructibility*, not visual resemblance, moral virtue, functional completeness or proof of source fidelity. An interface may be asymmetric yet faithful, or highly inspectable yet misleading. A translation maintained as a **co-sovereign language peer** is a different source-authority relation, not an interface symmetry class.

An interface does **not** acquire doctrinal source authority merely because it is deployed, popular, frozen or institutionally official. It may, however, become a primary historical trace of what users were able to see and do at an observed time.

## 3. Reverse inquiry: from interface to possible doctrine

An analyst may work in reverse:

```text
observable interface / reproducible interaction
  -> trace of behavior and constraints
  -> competing hypotheses about implementation and institutional policy
  -> corroboration with documents, actors, logs and comparison cases
  -> qualified criticism or redesign proposal
```

This is **abduction**, not deduction. The observed fact that a portal requires an account does not prove why that requirement was chosen. It could arise from law, internal policy, procurement, legacy code, mistaken configuration or a temporary fault. Intentional capture is a hypothesis requiring additional evidence.

For each inference, record: observation date and version; user role and accessibility context; action attempted; expected and actual result; reproducibility; declared rule; plausible alternatives; contrary evidence; confidence; and unresolved questions. Distinguish *what the interface affords* from *what the organization intended* and *what the law authorizes*.

Reverse inquiry is a useful Cogentia Lens: one can examine an institution by comparing its declared rights with the paths by which a citizen can actually exercise them. The result must remain corrigible.

## 4. COP and packet-oriented implementation

For a Cognitive Packet / COP handler, an interface is an **adapter or implementation profile**, not the packet's source of truth. CLI, chat, GitHub Issue, kernel or a future n8n adapter can expose different affordances while preserving a shared portable contract.

The portable contract should declare at least:
- accepted packet kinds and schema/version;
- readable inputs, authority and visibility boundaries;
- permitted operations and authorization checks;
- typed outcomes (success, refusal, blocked dependency, expected task failure);
- durable receipts, links, provenance and resumability;
- accessible error paths and meaningful human override or appeal where relevant.

The adapter must not silently enlarge the mandate. Transport success is not task success. In particular, a green GitHub Actions check can coexist with a typed unsuccessful task result, as required by [shared agent instructions](../instructions/AGENTS.shared.md). This distinction belongs in the interface contract rather than being hidden in implementation detail.

A downstream UI can adapt, compress or rearrange the contract, but it must not invent success, silently drop material failures, or expose protected source locators.

## 5. Concrete contrasts (illustrative, not empirical findings)

| Surface | Observable projection | Question for review |
|---|---|---|
| COP CLI | Commands, typed outputs, continuation handles | Does the same packet retain its meaning across handlers? |
| GitHub Issue | Addressable task, comments, labels, closure | Does closing an Issue mean the source change actually landed? |
| n8n workflow adapter (possible) | Nodes and triggers | Are authorization and error semantics preserved rather than hidden by automation? |
| Administrative web form | Fields, identity checks, attachment limits, receipts | Can the citizen exercise the declared right under real accessibility and time constraints? |
| Public dashboard | Selected measurements and controls | Which definitions, exclusions and source states are invisible? |

These are **test cases**; they are not evidence that any named product or administration currently fails. A particular case study needs its own time-stamped observations and authorized source references.

## 6. Opacity and capture risks

Operational projections can fail through: inaccessible paths; hidden eligibility rules; forced account creation; non-reproducible errors; inaccessible appeal routes; missing receipts; misleading success signals; omitted alternatives; vendor-specific lock-in; selective metrics; and friction distributed unequally across users.

Not every friction is an abuse. Security, fraud prevention, privacy and legal compliance can legitimately constrain an interface. Criticism should compare the necessity and proportionality of those constraints with accessible alternative implementations, not simply equate inconvenience with malice.

A particularly relevant diagnostic is the **promise/effect gap**: the interface promises an operation but does not provide a practicable route to perform it. That gap is observable; its cause and responsibility require separate investigation.

## 7. Minimal review checklist

Before endorsing or publishing an interface as a derived product, ask:

1. Which versioned source rules, actual system states, and implementation constraints does it project?
2. Which users, contexts and purposes does it assume? Which are excluded?
3. What operations are offered, refused or left undiscoverable?
4. Are success, expected task failure, infrastructure failure and non-execution distinguishable?
5. Can users recover a durable trace, correct an error, or resume an interrupted action?
6. Which transformations are asymmetric, and what important premise is omitted?
7. Does the public projection respect disclosure and private-source boundaries?
8. What counter-evidence would disprove the proposed interpretation?
9. Where do observations, contradictions and critiques re-enter the responsible source/packet?
10. Who may review, deploy, publish or change the interface, and are those mandates kept separate?

## 8. Evidential status and continuation

**Established in accessible Cogentia sources:** derived products are situated projections; symmetric/asymmetric classes concern reconstructibility; source authority is not conferred by publication; the Pipeline routes feedback and continuations; COP has multiple possible implementation surfaces.

**Proposed generalization:** operational interfaces should be explicitly governed as a class of derived projection, and inspected in both the forward (source-to-action) and reverse (observation-to-hypothesis) directions.

**Not established by this paper:** a universal equivalence between all interfaces and doctrines; the motives behind any particular institutional design; a complete executable schema or deployed n8n adapter.

**Next experiments:** take one CLI packet, one GitHub Issue and one public administrative form; enumerate states, accessible actions and receipts; compare them with their stated contracts; record discrepancies without presuming intent. Route confirmed contradictions to their source-owning locus.

**Origin and related source documents:** [Issue #16](https://github.com/JeanHuguesRobert/cogentia/issues/16), [Derived Products](derived_products.md), [Pipeline](pipeline.md), [Shared Agent Instructions](../instructions/AGENTS.shared.md).
