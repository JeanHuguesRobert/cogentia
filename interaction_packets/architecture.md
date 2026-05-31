---
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
title: "Interaction Packets — architecture"
date: "2026-05-27"
status: "draft — auto-filled (frontmatter cleanup)"
---
# Interaction Packets — architecture

## Important distinction

Interaction Packets separates:

- the generic method;
- the living traces.

These two layers should not necessarily live in the same repository.

## Recommended architecture

### Method repository

The generic method repository contains:

- protocol documentation;
- prompts;
- extraction logic;
- status vocabulary;
- disclosure policy;
- examples;
- reusable workflows.

Example:

```text
cogentia/
  interaction_packets/
```

## Trace repository

The living traces should generally live in the repository attached to:

- a person;
- an association;
- a collective;
- an institution;
- an operational identity.

Examples:

```text
alice/alice
associationX/associationX
citylab/citylab
JeanHuguesRobert/JeanHuguesRobert
```

## Why this matters

This separation avoids mixing:

- protocol evolution;
- personal traces;
- operational history;
- public dashboards.

It also makes the system naturally forkable.

Each actor can:

- reuse the protocol;
- keep its own traces;
- publish selectively;
- evolve independently.

## GitHub profile repositories

GitHub profile repositories are especially interesting because:

- they are identity-linked;
- their README is shown publicly by GitHub;
- they naturally function as public dashboards;
- they provide durable versioned archives.

## Recommended structure for a trace repository

```text
interaction_packets/
  dashboard.md
  mail_trace.md
  archive_policy.md

  packets/
    YYYY/
      *.yaml

  readable/
    YYYY/
      *.md

  raw/
    YYYY/
      *.eml.md
```

## Layers

### dashboard.md

Human-readable public overview.

### mail_trace.md

Compact registry.

### packets/

Structured machine-readable metadata.

### readable/

Readable public copies.

### raw/

Quasi-raw auditable copies.

## Disclosure principle

Transparency by default.

But:

- masking must remain possible;
- masking should be explicit;
- cuts should remain traceable.

## Important methodological rule

The system should not merely accumulate accusations.

It should also document:

- replies;
- corrections;
- misunderstandings;
- positive interactions;
- successful cooperation.

Otherwise the archive risks becoming epistemically biased.
