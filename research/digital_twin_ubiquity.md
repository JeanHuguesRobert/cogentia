---
title: "Digital Twin Ubiquity"
subtitle: "Instances, appearances, mandates, and COP coordination"
version: "0.1"
status: "source document — architectural implication study"
date: "2026-06-30"
author: "Jean Hugues Noël Robert"
license: "CC BY-SA 4.0"
language: "en"
repository: "cogentia"
canonical_path: "cogentia/research/digital_twin_ubiquity.md"
tags:
  - cogentia
  - digital-twin
  - ubiquity
  - ubikia
  - cop
  - society-of-mind
  - mandate
related_research:
  - "cogentia/research/digital_twin_trust_model.md"
  - "cogentia/research/cognitive_packet_switching.md"
  - "cogentia/docs/digital-twin-agile-roadmap.md"
  - "ubikia/README.md"
  - "ubikia/docs/concepts.md"
  - "inseme/packages/cop-cli/README.md"
document_role: "source"
document_kind: "architecture-note"
visibility: "public"
lifecycle_state: "working"
---

# Digital Twin Ubiquity

## 1. Correction

The FractaVolta public Guide is not merely a website chatbot.

It is better understood as a **public, low-maturity, read-only instance** of the
owner-rooted digital twin.

This does not mean that the public Guide is the private owner core. It means:

```text
same owner-rooted twin project
different situated instance
different corpus view
different maturity profile
different mandate
different authority
```

The earlier wording "not the digital twin" was too coarse. The safer wording is:

```text
The Guide is a public instance of the twin.
It is not the private owner-facing core instance.
It has a narrow mandate: orient, retrieve, cite, and explain public material.
```

## 2. Why ubiquity matters

The owner is embodied and cannot be present in many places at the same time.

The digital twin is immaterial. It can appear through many concurrent instances:

- a local owner-facing CLI;
- a ChatGPT-connected MCP client;
- a Codex-connected local tool user;
- a public FractaVolta Guide;
- a future publication assistant;
- a background corpus-maintenance worker;
- a domain-specific operational agent.

This is useful, but it creates a governance problem:

```text
If many instances can speak or act as parts of the twin,
they must coordinate without each pretending to be the whole person.
```

## 3. Instance, not clone

An instance is not an unconstrained clone.

An instance is a situated manifestation with an explicit envelope:

```yaml
twin_instance:
  owner: "person or organization"
  instance_id: "stable identifier"
  surface: "web-guide | mcp | cli | worker | publication-agent"
  location: "local | fracta | third-party-client"
  corpus_view: "public | owner-private | domain-private"
  maturity_profile: "infant | child | teenager | young-adult | adult-domain"
  mandate:
    allowed:
      - retrieve
      - cite
      - explain
    forbidden:
      - mutate
      - publish
      - spend quota without policy
      - expose private material
  current_context:
    branch: "main"
    index_hash: "..."
    pack_hash: "..."
  coordination:
    protocol: "COP"
    root_correlation_id: "..."
```

The owner-rooted twin may have many instances, but each instance must declare
what it is allowed to do.

## 4. Relation to Ubikia

Ubikia's formula is:

```text
Cogentia structures thought.
Ubikia structures appearance.
```

The ubiquity problem extends that formula.

A twin instance is an **appearance of the twin** in a specific scene:

- public web visitor scene;
- owner terminal scene;
- ChatGPT connector scene;
- GitHub issue scene;
- publication scene;
- local maintenance scene.

Ubikia is therefore relevant because it already governs faithful appearance:

```text
source corpus
  -> persona / mandate
  -> situated product or surface
  -> platform
  -> record
  -> return to corpus
```

For digital twins, the derived product may be interactive. The public Guide is
not only a page or article. It is a situated conversational appearance.

This implies that Ubikia should eventually handle not only static derived
products, but also **interactive derived appearances**:

```yaml
appearance:
  kind: "interactive_twin_instance"
  platform: "fractavolta.com"
  persona: "public guide"
  source_corpus: "public Cogentia/FractaVolta corpus"
  mandate: "orient and cite only"
  publication_status: "public"
  feedback_return: "corpus issue or correction event"
```

## 5. Society of mind analogy

The "society of mind" analogy is useful if it is treated operationally.

The twin should not be a single monolithic agent. It may become a society of
specialized instances and sub-agents:

- a public explainer;
- a retrieval specialist;
- a source verifier;
- a publication packager;
- a cost monitor;
- a local operator;
- a memory curator;
- a safety reviewer;
- a domain expert.

But a society needs institutions. The relevant institution here is COP:

```text
instance emits packet
  -> envelope declares capability, mandate, risk, provenance
  -> COP routes or refuses
  -> handler acts within scope
  -> result returns with trace
```

The router should inspect the envelope first. The payload carries the substance,
but the mandate and routing decision must be explicit before an instance is
allowed to act.

## 6. Coordination problem

Multiple instances create several risks:

- contradictory answers from stale indexes;
- public instance claiming private knowledge;
- local instance acting on an outdated branch;
- publication instance optimizing for platform engagement instead of fidelity;
- provider-cost actions duplicated by concurrent agents;
- one instance receiving a correction that the others do not learn;
- user confusion about which instance has which authority.

These are not reasons to forbid multiplicity. They are reasons to make
multiplicity explicit.

Minimum coordination state:

```yaml
instance_state:
  owner_id: "..."
  instance_id: "..."
  role: "public-guide"
  maturity: "infant"
  corpus_view: "public"
  repo_heads:
    cogentia: "..."
    FractaVolta: "..."
  index_hash: "..."
  embedding_policy: "..."
  last_seen_at: "..."
  online: true
  current_mandate_hash: "..."
```

## 7. Mandates

Every instance needs a mandate. A mandate is not just a prompt.

A mandate is an operational contract:

```yaml
mandate:
  subject: "fractavolta-public-guide"
  owner: "Jean Hugues Robert"
  issued_at: "2026-06-30"
  maturity: "infant"
  corpus_view: "public"
  allowed_capabilities:
    - context.search
    - context.pack
    - context.lines
    - grounded.answer
  denied_capabilities:
    - filesystem.write
    - git.push
    - provider.spend.unbounded
    - private.view
    - publish
  expiry: "revocable"
```

COP can carry mandate references in packet envelopes. Cogentia can verify them
against local policy. Ubikia can record which appearance used which mandate.

## 8. Public Guide implication

The FractaVolta Guide should be documented as:

```text
public instance of the twin
infant maturity
public corpus view
read-only
retrieval-first
source-citing
no private owner core access
no autonomous action
```

This changes the meaning of the Guide:

- it is allowed to speak as a public-facing part of the twin project;
- it must not pretend to be the owner;
- it must not pretend to be the whole twin;
- it must expose limits when it lacks evidence;
- it must route feedback back into the corpus.

## 9. First implementation implications

Short-term:

- revise public Guide docs and prompt to say "public instance", not "not a twin";
- add `instance_id`, `surface`, `maturity`, `mandate`, and `corpus_view` metadata
  to `/guide/health` and `/guide/chat` responses;
- keep `/guide/chat` read-only and public;
- log feedback later as teachable events, not silent prompt tweaks.

Medium-term:

- define a shared twin-instance envelope schema;
- expose instance state through MCP health;
- let local and remote instances advertise capabilities and freshness;
- use COP packets for delegated actions between instances;
- add an Ubikia concept for interactive derived appearances.

Long-term:

- coordinate a society of specialized twin instances under COP;
- make mandates inspectable, revocable, and citable;
- track when one instance teaches another;
- make the owner's trust relationship apply to the society, not only to one
  process.

## 10. Design rule

The twin may be ubiquitous.

Authority must not be ubiquitous by default.

Therefore:

```text
One owner-rooted twin may have many instances.
Every instance must have a declared mandate.
Every mandate must be narrower than the owner.
COP coordinates the society.
Ubikia records faithful appearances.
Cogentia preserves corpus-grounded cognition.
```
