---
title: "Governed Conversations and Durable Effects"
subtitle: "A modelling contract for Cogentia, COP, Inseme, and mandated agents"
author: "Jean Hugues Noël Robert"
date: "2026-07-31"
version: "0.2-source"
status: "working-paper"
document_role: "source"
document_kind: "protocol-and-governance-model"
language: "en"
license: "CC BY-SA 4.0"
visibility: "public"
lifecycle_state: "working"
canonical_path: "cogentia/research/conversations_gouvernees_effets_durables.md"
related_documents:
  - "research/ia_pour_tous_ia_pour_chacun.md"
  - "research/cognitive_packets.md"
  - "research/pipeline.md"
  - "prompts/conversation_closure.md"
external_related_documents:
  - "barons-Mariani/research/traceabilite_des_actes.md"
  - "barons-Mariani/research/test_critere_rossignol.md"
---

# Governed Conversations and Durable Effects

## Status and authority

This document is a source-level modelling contract. An implementation claiming compatibility with it **MUST** obey its normative requirements. A system **MUST NOT** silently downgrade a missing mandate, accountable party, validation, or correction path into a valid engaging act.

The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative.

## Scope

A conversation is not merely a message stream. It is a situated sequence of interactions among principals, delegates, agents, institutions, and referents of reality.

Its governance value begins when it reveals an intention, prepares a decision, produces an engagement, records an outcome, or creates a durable trace in an applicable internal regime.

This model has two primary objects:

1. **Conversation** — an ordered set of interactions and utterances;
2. **Effect** — a durable, or purportedly durable, change that is produced, prepared, recognised, or contested.

Documents, mandates, decisions, publications, contracts, votes, deployments, and corrections are effect types. They **MUST NOT** be confused with the utterances that prepare or describe them.

## Non-negotiable invariants

- An utterance is not an act.
- An inferred intention is not an authorisation.
- An AI agent MAY assist; it **MUST NOT** acquire a sovereign vote.
- An engaging effect **MUST** have an identifiable human or human institution accountable for it.
- Political votes belong only to living human beings.
- Traceability **MUST** be proportional: strong traces for engaging acts, not bureaucracy for every micro-event.
- A durable effect **MUST** expose an applicable correction, challenge, revocation, or supersession path.
- Reality is not a legal person: it is the external referent that resists, measures, contradicts, and reveals effects.
- When mandatory provenance or accountability data is absent, the implementation **MUST** emit a validation failure; it **MUST NOT** present the result as authorised, verified, or binding.

## 1. Conversation as a transformation context

A conversation can include observations, hypotheses, requests, intentions, objections, proposals, validations, instructions, commitments, reports, and corrections.

It is a context for production and interpretation. It does not itself grant a right to act on behalf of another party.

One conversation can involve several relationships: person and assistant; principal and delegate; ordering party and provider; collective and representative; main agent and sub-agent; personal or collective digital twins.

## 2. Durable effect

An effect is a change in the social, documentary, technical, or material world. Its lifecycle can be:

- **claimed** — an actor says it occurred;
- **recognised** — the relevant regime accepts it;
- **contested** — its reality, meaning, or validity is disputed;
- **revoked** — its authority or mandate is withdrawn;
- **superseded** — a later version or decision prevails;
- **observed** — reality attests to or contradicts a consequence;
- **verified** — an adequate procedure or measurement confirms it.

These lifecycle states **MUST** remain separate from the epistemic state of an assertion:

- asserted;
- inferred;
- observed;
- verified.

## 3. Engaging act

An engaging act is an effect that binds responsibility: political, institutional, legal, technical, financial, moral, or documentary.

An implementation **MUST NOT** stabilise an engaging act without all of the following:

- an author or operating system;
- a mandate or other source of authority;
- an explicit scope;
- validation proportionate to risk;
- an accountable party;
- a challenge, correction, or revocation path;
- a trace of expected effects and, where available, observed effects.

This qualification does not replace legal qualification. It defines an internal governance and traceability regime.

## 4. Reality: non-negotiable feedback

Reality is a party only in a methodological sense. It is neither a contractual party nor a political voter.

It enters through measurement, physical constraint, consumed resource, affected living being, achieved result, failure, contradiction, or external attestation.

The **Rossignol criterion** is the practical test: a device or procedural chain **SHOULD** be able to close on a modest, measurable, verifiable point of incarnation. For local infrastructure, this can be water actually available in a trough, energy actually produced and used, or a service actually delivered.

This feedback prevents an auto-referential system from mistaking simulations, narratives, or its own indicators for effects.

### 4.1 Living non-human beings and responsible representation

A living non-human being can be an affected living being and an essential real-world referent. It is not a political voter and cannot be presumed to issue a mandate.

A human carer, guardian, owner, officer, or institution may make the being's interests visible and answer for that human's own moral, practical, or legal obligations. The record **MUST NOT** describe this as a mandate from the non-human being.

The model therefore distinguishes:

- **political sovereignty** — living human beings only;
- **affected interest** — human or non-human living being;
- **responsible representation** — an explicitly identified human or institution, with a stated basis and scope, never a fictitious mandate.

## 5. Operational time and causality

In this model, time is the process by which effects propagate at a non-infinite speed.

Where they differ, the system **SHOULD** distinguish:

- when an act was emitted;
- when it was received;
- when it became effective;
- when its effect was observed;
- when it was recorded;
- when it expires.

This enables accountability, correction, and continuation without claiming to exhaust a physical theory of time.

## 6. Portable minimum schema

```yaml
governed_conversation:
  id: "gc-YYYYMMDD-001"
  relation:
    kind: "personal_assistance | mandate | service | collective_governance"
    parties:
      - id: "person:principal"
        role: "principal"
      - id: "ai_agent:assistant"
        role: "assistant"
    real_referents:
      - "measured_outcome:identifier"
  interactions:
    - id: "utterance-001"
      author: "person:principal"
      type: "request | observation | proposal | validation"
      epistemic_status: "asserted | inferred | observed | verified"
  effects:
    - id: "effect-001"
      kind: "decision | publication | deployment | mandate | correction"
      status: "claimed | recognised | contested | revoked | superseded"
      authority: "mandate-or-rule-reference"
      accountable: "person-or-human-institution"
      expected_effects:
        - "short description"
      observed_effects:
        - "measurement-or-attestation"
      review:
        challenge: "process"
        correction: "process"
        revocation: "process-or-not-applicable"
```

The `real_referents` field does not personify reality and gives it no vote. It connects the symbolic record with what can be externally observed.

### 6.1 vCon interoperability boundary

[vCon](https://github.com/py-vcon/py-vcon) is relevant as an interoperability container for externally sourced communications: calls, messages, recordings, participants, and channel-level metadata.

A compatible implementation **MAY** import from or export to vCon. It **MUST NOT** use vCon as the canonical internal governance model, because vCon alone does not express the required distinction between utterance, inferred intention, validated engaging act, mandate, accountable party, revocation, contestation, and real-world feedback.

The canonical internal model remains `governed_conversation` plus `effect`; vCon is an adapter boundary, not the constitutional core of COP or Cogentia.

## 7. Mandatory implementation requirements

A compatible COP, Cogentia, or Inseme implementation:

1. **MUST** separate messages, inferences, validations, and effects;
2. **MUST** attach every engaging effect to authority, scope, and an accountable party;
3. **MUST** preserve versions, contests, revocations, and supersessions;
4. **MUST** trace the human-agent-tool chain without turning an agent into a sovereign;
5. **MUST** expose a proof status for assertions and outcomes;
6. **MUST** support export and continuation in open formats;
7. **SHOULD** link relevant effects to observations or measurements of reality;
8. **MUST** apply a visibility and retention policy that protects affected persons;
9. **MUST** reserve political decisions to living human beings;
10. **MUST NOT** convert an AI recommendation, inferred intent, or unvalidated draft into a binding act.

## 8. Required test cases

- Jean Hugues / Agent JHN: does a request become a draft, a validated decision, or a publication?
- Agent JHN / sub-agent: does the sub-agent remain within mandate and budget?
- A commune and its assistance: which outputs are consultative, and which decisions are accountable to the elected official or body?
- Rossignol Node: does the energy-water-action trace close on a real measurement?
- Public consultation: are contribution, synthesis, decision, and follow-up separated; is any deviation motivated?

## Continuation

- derive a formal JSON or YAML schema and stable identifiers;
- map the profile to COP events and Cognitive Packets, with vCon as an import/export adapter only;
- add tests for mandate, revocation, supersession, and real-world feedback;
- define privacy policies for personal conversations and representation policies for affected non-human living beings;
- derive civic, implementation, and territorial-pilot products.
