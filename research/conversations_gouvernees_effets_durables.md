---
title: "Governed Conversations and Durable Effects"
subtitle: "A modelling contract for Cogentia, COP, Inseme, and mandated agents"
author: "Jean Hugues Noël Robert"
date: "2026-07-31"
version: "0.3-source"
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
  - "research/conversation_to_corpus_pipeline.md"
  - "research/pipeline.md"
  - "prompts/conversation_closure.md"
external_related_documents:
  - "barons-Mariani/research/traceabilite_des_actes.md"
  - "barons-Mariani/research/test_critere_rossignol.md"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Governed Conversations and Durable Effects

## Status and authority

This document is a source-level modelling contract. An implementation claiming compatibility with it **MUST** obey its normative requirements. A system **MUST NOT** silently downgrade a missing mandate, accountable party, validation, or correction path into a valid engaging act.

The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative.

### Version 0.3 clarification

Version 0.3 makes the conversation model explicit across Cogentia, COP, Conversia and provider-facing conversational interfaces.

The central clarification is:

> A **Cognitive Packet** is a mobile unit of cognitive work. A **Conversation** is a durable logical context of interaction and continuity.

A Conversation is therefore not a Cognitive Packet, not a provider thread, not a model context window, and not a temporary execution session. Cognitive Packets may be emitted, received, referenced, routed and resumed within or across Conversations.

This version also clarifies that **Governed Conversation** is a governance profile of the more general Conversation object, and that **Cellula** is the Conversia profile in which a governed Conversation becomes an operational unit of capacity and action.

## Scope

A conversation is not merely a message stream. It is a durable, situated continuity of interactions among principals, delegates, agents, institutions, tools, channels, and referents of reality.

Its logical identity can survive a provider change, model replacement, process restart, device change, channel change, or temporary loss of a provider-side thread. A provider conversation identifier, messaging thread identifier, call identifier, or similar external handle is a binding to the Conversation, not the Conversation itself.

Its governance value begins when it reveals an intention, prepares a decision, produces an engagement, records an outcome, or creates a durable trace in an applicable internal regime.

This model has two primary objects:

1. **Conversation** — a durable logical context containing or referencing an ordered causal history of interactions;
2. **Effect** — a durable, or purportedly durable, change that is produced, prepared, recognised, or contested.

Documents, mandates, decisions, publications, contracts, votes, deployments, and corrections are effect types. They **MUST NOT** be confused with the utterances that prepare or describe them.

## Non-negotiable invariants

- An utterance is not an act.
- An inferred intention is not an authorisation.
- A Conversation is not a Cognitive Packet.
- A Conversation **MUST NOT** be identified solely by a provider thread, model session, context window, or channel-specific identifier.
- Provider-side conversational state **MAY** be used as an optimisation or cache, but a portable implementation **MUST NOT** depend on it as its sole durable source of conversation truth.
- A Working Context is a derived, temporary projection of a Conversation and related governed memory; it is not the Conversation itself.
- An AI agent MAY assist; it **MUST NOT** acquire a sovereign vote.
- An engaging effect **MUST** have an identifiable human or human institution accountable for it.
- Political votes belong only to living human beings.
- Traceability **MUST** be proportional: strong traces for engaging acts, not bureaucracy for every micro-event.
- A durable effect **MUST** expose an applicable correction, challenge, revocation, or supersession path.
- Reality is not a legal person: it is the external referent that resists, measures, contradicts, and reveals effects.
- When mandatory provenance or accountability data is absent, the implementation **MUST** emit a validation failure; it **MUST NOT** present the result as authorised, verified, or binding.

## 1. Conversation as a durable transformation context

A conversation can include observations, hypotheses, requests, intentions, objections, proposals, validations, instructions, commitments, reports, corrections, tool invocations, packet transfers, and references to effects.

It is a context for production and interpretation. It does not itself grant a right to act on behalf of another party.

One conversation can involve several relationships: person and assistant; principal and delegate; ordering party and provider; collective and representative; main agent and sub-agent; personal or collective digital twins.

### 1.1 Canonical conversation identity

A compatible implementation **SHOULD** assign each durable Conversation a canonical identifier independent of the provider and channel through which a participant currently accesses it.

The canonical identity can be associated with one or more external bindings, for example:

```text
canonical Conversation
  ├─ ChatGPT / provider thread binding
  ├─ WhatsApp direct or group binding
  ├─ voice-call binding
  ├─ email-thread binding
  ├─ local REPL binding
  └─ future peer-agent binding
```

External bindings are adapters. Losing or replacing one binding **MUST NOT**, by itself, destroy the logical Conversation.

A Conversation can therefore outlive individual model runs and provider sessions.

### 1.2 Interaction, Turn, Session and Working Context

The following concepts are distinct:

- **Interaction** — the generic situated occurrence within a Conversation: utterance, observation, validation, tool invocation, packet transfer, or other relevant event;
- **Turn** — an ergonomic grouping of one or more interactions for a user interface or conversational protocol; it is not required to be an atomic event;
- **Session** — a temporary execution or access incarnation through a provider, model, process, device, runtime, or channel;
- **Working Context** — the bounded, temporary projection selected for a particular reasoning or execution step.

A single user-visible Turn may include multiple tool calls, model invocations, sub-agent interactions, Cognitive Packets, observations, and one final response.

A Working Context may be computed from:

```text
Conversation history
+ current mission state
+ relevant corpus
+ applicable mandates
+ active Cognitive Packets
+ recent events
+ governed memory
+ privacy and disclosure constraints
→ Working Context
→ model / human / handler
```

The system **SHOULD** preserve the ability to reconstruct useful Working Context from durable governed state without requiring hidden provider state.

### 1.3 Branches and Conversation lineage

A Conversation may branch.

A branch **SHOULD** be representable as a child Conversation with explicit lineage when this reduces duplicated ontology and preserves causal traceability.

Typical branch meanings include:

- hypothesis;
- objection;
- variant;
- research path;
- alternative strategy;
- sub-problem;
- lateral exploration.

A child Conversation can later be merged, suspended, abandoned, stabilised into a document, transformed into a Cognitive Packet, or continue independently. A merge does not imply consensus; it records an explicit relationship between lineages and any resulting stabilisation.

### 1.4 Cognitive Packets

A Cognitive Packet is a transport-neutral unit of cognitive work with its own envelope and payload contract. It is not the persistent conversational container.

The relationship is:

```text
Conversation A
  ↓ emits
Cognitive Packet
  ↓ routed / copied / referenced / resumed
Conversation B or another handler
```

or:

```text
Conversation
  ↓ continuation packet
new Session / model / handler
  ↓
same Conversation continues
```

A Conversation **MAY** reference active, emitted, received, resolved, superseded, or archived Cognitive Packets. A Cognitive Packet **MAY** carry a `conversation_ref`, `branch_ref`, causal event reference, or equivalent context locator.

The packet is mobile; the Conversation persists.

### 1.5 COP projection

In COP, the natural projection of a Conversation is a durable **Topic / causal event stream**, not a Cognitive Packet.

A compatible mapping **SHOULD** preserve:

```text
Conversation canonical identity
→ COP Topic or equivalent durable causal scope
→ immutable interaction/events
→ packet references
→ effects / artifacts / traces
```

This is a projection boundary, not an assertion that the abstract Conversation ontology and the COP Topic implementation type are identical.

### 1.6 Conversia and Cellula

`research/conversation_to_corpus_pipeline.md` defines **Conversia** as the fractal conversational layer that transforms conversations into knowledge, decisions, mandates, actions and traces.

This document sharpens the corresponding object boundary:

- **Conversation** — general durable logical continuity of interaction;
- **Governed Conversation** — a Conversation to which explicit governance, authority, accountability, visibility, retention, correction and effect rules apply;
- **Cellula** — a governed Conversation organised by Conversia as an operational unit capable of producing coordinated decisions, mandates, actions, traces and learning.

Therefore:

```text
every Cellula is a governed Conversation
but not every Conversation is a Cellula
```

A casual or exploratory Conversation need not become a Cellula. A Conversation becomes Cellula-like when it acquires an explicit operational purpose, participants and roles, governance, applicable mandates or decision rules, trace requirements, and capacity to produce or supervise Effects.

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

The canonical object is `conversation`. Governance is a profile of that object, not a competing ontological class.

```yaml
conversation:
  id: "conv:YYYYMMDD:001"
  status: "active | suspended | closed | archived"
  subject_refs: []
  participants:
    - id: "person:principal"
      role: "principal"
    - id: "ai_agent:assistant"
      role: "assistant"
  lineage:
    parent_conversation_ref: null
    branch_of: null
  cop:
    topic_ref: "topic:conversation:..."
  channel_bindings:
    - kind: "provider_thread | whatsapp | voice | email | local_repl | peer_agent"
      external_ref: "adapter-owned-reference"
      status: "active | stale | closed"
  governance:
    profile: "none | governed | cellula"
    relation:
      kind: "personal_assistance | mandate | service | collective_governance"
    visibility: "policy-reference"
    retention: "policy-reference"
  real_referents:
    - "measured_outcome:identifier"
  interactions:
    - id: "interaction-001"
      author: "person:principal"
      type: "request | observation | proposal | validation | tool_invocation | packet_transfer"
      epistemic_status: "asserted | inferred | observed | verified"
  cognitive_packet_refs:
    - "cpkt:..."
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

An implementation **MAY** serialize a governance-specific view under a name such as `governed_conversation`, but that view **MUST** retain the canonical Conversation identity and **MUST NOT** become a second independent conversation object.

### 6.1 Provider and channel bindings

A binding **MUST** be distinguishable from canonical Conversation identity.

A binding can expire, become unavailable, be revoked, or be replaced. Implementations **SHOULD** preserve enough adapter metadata to correlate imported/exported interactions without making proprietary identifiers constitutional protocol primitives.

### 6.2 Working Context projection

Working Context is intentionally absent from the durable canonical schema as authoritative conversation state. It is a derived execution projection.

An implementation **MAY** cache a Working Context, provider response reference, or short-lived provider state when useful, but it **SHOULD** treat that material as disposable and recoverable from durable governed state wherever practical.

### 6.3 vCon interoperability boundary

[vCon](https://github.com/py-vcon/py-vcon) is relevant as an interoperability container for externally sourced communications: calls, messages, recordings, participants, and channel-level metadata.

A compatible implementation **MAY** import from or export to vCon. It **MUST NOT** use vCon as the canonical internal governance model, because vCon alone does not express the required distinction between utterance, inferred intention, validated engaging act, mandate, accountable party, revocation, contestation, and real-world feedback.

The canonical internal model remains Conversation plus governance profile plus Effect; vCon is an adapter boundary, not the constitutional core of COP or Cogentia.

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
10. **MUST NOT** convert an AI recommendation, inferred intent, or unvalidated draft into a binding act;
11. **MUST** preserve canonical Conversation identity independently of provider/session identifiers;
12. **MUST** distinguish Conversation from Session, Turn, Working Context, channel binding, Cognitive Packet and Effect;
13. **SHOULD** be able to continue a Conversation after provider/model replacement or restart using durable governed state;
14. **SHOULD** map Conversation continuity to a COP Topic or equivalent durable causal scope while keeping Cognitive Packets as mobile work units;
15. **MUST NOT** make provider-side hidden conversation state the only source required for durable continuation;
16. **SHOULD** represent branches through explicit lineage and preserve their merge, suspension, abandonment or independent continuation states;
17. **MUST** treat a Cellula as a governed operational Conversation profile, not as an authority source by itself.

## 8. Required test cases

- Jean Hugues / Agent JHN: does a request become a draft, a validated decision, or a publication?
- Agent JHN / sub-agent: does the sub-agent remain within mandate and budget?
- Provider swap: can the same canonical Conversation continue after replacing one model/provider with another, without treating provider state as the source of truth?
- Channel binding: can a Conversation preserve its identity while gaining, losing, or replacing a WhatsApp, voice, email, or provider-thread binding?
- Branching: can an objection or alternative exploration become a child Conversation and later merge, suspend, terminate, or continue independently with explicit lineage?
- Cognitive Packet transfer: can a packet leave one Conversation and be routed to another without confusing packet identity with Conversation identity?
- Working Context: can a bounded model context be regenerated from governed durable state after cache/provider-state loss?
- A commune and its assistance: which outputs are consultative, and which decisions are accountable to the elected official or body?
- Rossignol Node: does the energy-water-action trace close on a real measurement?
- Public consultation: are contribution, synthesis, decision, and follow-up separated; is any deviation motivated?

## 9. Architectural synthesis

The intended separation is:

```text
Conversation
  = durable logical continuity

Interaction / Event
  = what occurs within that continuity

Turn
  = ergonomic grouping

Session
  = temporary execution/access incarnation

Working Context
  = bounded temporary projection for reasoning or execution

Cognitive Packet
  = mobile routable unit of cognitive work

COP Topic / causal stream
  = durable event projection of Conversation continuity

Conversia
  = conversational transformation layer

Cellula
  = governed Conversation organised as operational capacity

Effect
  = durable or purportedly durable change in the world
```

Compact formula:

> The Cognitive Packet is the mobile unit of cognition; the Conversation is the durable space of continuity; COP preserves its causality; Conversia transforms that continuity into knowledge and capacity; Effects connect conversation to reality.

## Continuation

- derive a formal JSON or YAML schema for canonical `conversation`, governance profiles and `effect`, with stable identifiers;
- map Conversation continuity to COP Topics/events and map Cognitive Packets as mobile payloads/references rather than conversational containers;
- define provider/channel binding adapters and a provider-swap conformance test;
- define Working Context as a bounded derived projection under privacy, mandate and disclosure constraints;
- align Conversia/Cellula implementation documents with the profile relationship established here;
- keep vCon as an import/export adapter only;
- add tests for mandate, revocation, supersession, branching, packet transfer and real-world feedback;
- define privacy policies for personal conversations and representation policies for affected non-human living beings;
- derive civic, implementation, and territorial-pilot products.
