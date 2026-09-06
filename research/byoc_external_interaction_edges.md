---
title: "BYOC — Bring Your Own Channel and External Interaction Edges"
subtitle: "A generic Cogentia doctrine for presence, interaction and governed action across external and Twin-governed communication spaces"
author: "Jean Hugues Noël Robert"
affiliation: "Institut Mariani / C.O.R.S.I.C.A."
date: "2026-09-06"
license: "CC BY-SA 4.0"
language: "en"
status: "working-paper — architecture note"
document_role: "source"
document_kind: "architecture-decision"
visibility: "public"
lifecycle_state: "working"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/byoc_external_interaction_edges.md"
related:
  - "JeanHuguesRobert/barons-Mariani/research/presencology.md"
  - "JeanHuguesRobert/inseme/research/interactions_registry_and_multichannel_messaging.md"
  - "JeanHuguesRobert/inseme/research/activitypub_edge.md"
  - "JeanHuguesRobert/cogentia/issues/84"
  - "JeanHuguesRobert/inseme/issues/36"
  - "JeanHuguesRobert/inseme/issues/66"
---

# BYOC — Bring Your Own Channel and External Interaction Edges

## 1. Decision

Cogentia treats communication platforms such as email, GitHub, Discord, ActivityPub, web chat, WhatsApp, X and future systems as **interaction spaces and transport surfaces**, not as canonical residences of a Twin's identity, memory, continuations, mandates or authority.

A Personal or Collective Digital Twin may therefore acquire **Presence** in communication spaces it does not control and may also expose optional communication spaces it substantially governs. These cases should reuse one generic mechanism rather than separate platform-specific theories.

The working name for the user-facing principle is:

> **BYOC — Bring Your Own Channel.**

The working architectural abstraction is:

> **External Interaction Edge.**

BYOC is a specialization of the broader BYOx principle: discovery or technical reachability of an external resource does not grant admissibility or authority to use it.

## 2. Presencology grounding

Presencology already admits software agents, organizations and other addressable entities as Presence subjects, and technical, institutional, political, computational and conceptual spaces as Presence spaces.

Accordingly, a human, agent, Personal Twin or Collective Twin may have a Presence in:

- a Discord guild, channel or thread;
- a GitHub repository, issue or discussion;
- an ActivityPub server or social graph;
- an email domain or mailbox relationship;
- a web-chat surface;
- another digital, social or institutional interaction space.

No new ontology of "channel presence" is required. BYOC is an application of the existing Presence abstraction to socio-digital interaction spaces.

## 3. Core distinctions

The following objects MUST remain distinct:

```text
Presence
!= Capability
!= External permission
!= Admissibility
!= Mandate
!= Authority
!= Act
```

A Twin may be present in an external space without having any mandate to speak there.

A platform may technically permit an action that Cogentia does not authorize.

A Discord role, GitHub permission, ActivityPub actor address, mailbox credential or API token is therefore not by itself a Cogentia mandate.

The generic invariant is:

```text
known/discovered
!= reachable
!= admissible
!= authorized
!= selected/funded
!= invoked
!= committed
```

This reuses the same security distinction already tracked for BYOx and COP routing.

## 4. Two governance regimes, one mechanism

Two important cases share the same edge machinery.

### 4.1 External-space Presence

```text
Twin -> Presence -> externally governed space
```

Examples:

- John participates in a Discord server operated by another community;
- a Collective Twin observes or contributes to an external GitHub project;
- a Personal Twin participates through ActivityPub on a remote server.

The external operator controls important parts of the space's rules, moderation and availability. Inbound information is external evidence, not automatically trusted fact. Outbound action remains constrained by Cogentia mandate, disclosure, budget, rate and consequence policies.

### 4.2 Twin-governed-space Presence

```text
Twin -> Presence -> Twin-governed interaction space
```

Examples:

- an optional Discord server for a Personal Twin;
- a Discord server for a Collective Twin, association, project or civic body;
- a web-chat or ActivityPub surface operated for the Twin.

The Twin may exercise substantial governance over the space, but the platform still does not become canonical identity, memory or authority storage.

This distinction is best represented as a property of the relation between subject and space, for example:

```text
control_regime: external | delegated | twin_governed
```

It is not a separate Presence ontology.

## 5. External Interaction Edge

An External Interaction Edge translates between platform-specific interaction semantics and Cogentia/COP semantics.

```text
External platform
  -> platform event / message / presence signal
  -> External Interaction Edge
  -> identity binding + deduplication + provenance
  -> policy / disclosure / admissibility checks
  -> Interaction Packet and/or COP Event
  -> Twin context / continuation / memory / follow-up

Twin intent / continuation / task
  -> mandate + budget + disclosure + consequence checks
  -> COP Act
  -> External Interaction Edge
  -> platform-specific projection
```

The edge SHOULD be replaceable and reversible. Removing Discord, ActivityPub or another provider must not destroy the Twin's durable state.

## 6. Projection, never substitution

The ActivityPub Edge doctrine already establishes a strong invariant that generalizes directly:

> **Projection, never substitution.**

For every BYOC adapter:

- an external account or actor ID is a binding, not the canonical Subject identity;
- an external thread/channel/message ID is a binding, not the canonical Conversation or Continuation identity;
- a platform role or permission is evidence of external capability, not a Cogentia mandate;
- an external message is evidence/input, not automatically a corpus fact;
- an outbound message is a projection of an authorized act, not the canonical act record;
- provider history is useful evidence but must not be the sole durable memory when the interaction is consequential.

## 7. Interaction Packets and consequentiality

BYOC does not imply packetizing every message.

The default remains:

> **Consequential interactions become Interaction Packets; ephemeral interaction may remain ephemeral unless explicitly retained.**

A platform adapter should preserve enough external identifiers and provenance to reconstruct the relevant interaction without forcing all provider traffic into permanent memory.

A generic packet/channel binding may include:

```yaml
channel_kind: discord | github | email | activitypub | web_chat | whatsapp | x | other
space_ref: external-space-identifier
channel_ref: external-channel-identifier
thread_ref: external-thread-identifier
message_refs: []
participants: []
subject_bindings: []
control_regime: external | delegated | twin_governed
presence_refs: []
access_context: ...
mandate_ref: ...
cop_event_ref: ...
```

These are semantic fields, not a frozen storage schema.

## 8. Personal and Collective Twins

BYOC applies to both Personal and Collective Digital Twins.

For a Personal Twin, a channel may be an optional conversational or working surface. A Personal Twin need not operate a Discord space merely because the capability exists.

For a Collective Twin, the value is potentially greater because external platforms already provide useful social primitives such as:

- membership and invitations;
- channels and threads;
- roles and moderation;
- events;
- voice/video rooms;
- reactions and lightweight voting-like affordances;
- bots and integrations.

Cogentia SHOULD reuse these affordances where helpful while refusing to equate them with canonical institutional semantics.

In particular:

```text
platform member != institutional member
platform role != institutional role
platform admin != institutional authority
platform poll != institutional decision
platform moderation != governance mandate
```

A Collective Twin may project its own groups, projects, conversations, events and authorized acts into the external platform while retaining canonical semantics in Cogentia/Inseme/COP.

## 9. Discord as first Reality Test

Discord is a useful first concrete test because it exercises both governance regimes with one provider:

1. **external participation** — a Twin joins and participates in existing third-party Discord servers;
2. **Twin-governed space** — a Personal or, more likely, Collective Twin exposes an optional Discord space for users who want it.

The same Discord Edge should support both cases. The difference is policy and control regime, not a separate implementation family.

A first Discord Reality Test should demonstrate:

- identity binding without identity substitution;
- presence in a guild/channel/thread;
- ingest of an external message as untrusted evidence;
- creation/update of an Interaction Packet only when consequential;
- resumption of a Cogentia Continuation independently of Discord thread identity;
- an outbound reply that succeeds only under an applicable mandate;
- explicit distinction between Discord permissions and Cogentia authority;
- operation in both `external` and `twin_governed` regimes;
- edge disablement without loss of canonical Twin state.

## 10. Relationship to existing work

- **Presencology** supplies the cross-domain Presence abstraction.
- **Interaction Packets** supply durable consequential interaction traces.
- **COP** supplies causal execution, mandates, budgets, acts, continuations and authority boundaries.
- **ActivityPub Edge** supplies the existing `projection, never substitution` pattern.
- **BYOx** supplies the broader principle that reachability/discovery does not imply admissibility or authority.
- **Inseme multichannel messaging** supplies the Personal Twin interaction-desk/product direction.

BYOC therefore should remain a thin unifying doctrine, not a new subsystem that duplicates these layers.

## 11. Non-goals

- no attempt to replace Discord, email, GitHub, ActivityPub or other platforms;
- no universal social graph owned by Cogentia;
- no automatic archival of every external message;
- no conversion of external platform permissions into internal mandates;
- no provider-specific identity as canonical Twin identity;
- no requirement that every Personal Twin operate every supported channel;
- no claim that a Twin-governed Discord server is itself a Collective Twin.

## 12. Implementation direction

Do not build a generic framework before one provider proves the boundary useful.

Recommended sequence:

1. keep this generic doctrine small and stable;
2. evolve Interaction Packet channel bindings in `cogentia#84`;
3. expose the multichannel product surface through `inseme#36`;
4. use Discord as the first two-regime Reality Test;
5. factor only the repeated adapter contract shared with ActivityPub/email/GitHub after implementation evidence exists.

This follows the corpus preference for reality-tested abstractions rather than speculative framework construction.
