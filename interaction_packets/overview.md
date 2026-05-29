# Interaction Packets — readable overview

## What this is

Interaction Packets is a minimal Cogentia-compatible system for tracing interactions in a structured, versioned and publicly auditable way.

The current MVP focuses on email correspondence, because email already contains useful metadata:

- date;
- sender;
- recipients;
- subject;
- thread continuity;
- replies;
- absence of replies;
- follow-ups.

The goal is not to create a surveillance tool.

The goal is to make public-interest interactions traceable, correctable and sustainable.

## Core idea

An interaction can be treated as a packet.

A packet records:

- what was sent;
- when it was sent;
- to whom it was sent;
- what continuation was expected;
- what continuation actually happened;
- whether a correction was needed;
- what level of disclosure is appropriate.

This makes interactions easier to archive, review, correct and publish.

## Minimal stack

Version 0 uses only:

- Gmail;
- GitHub;
- an AI agent;
- Markdown;
- YAML.

There is no backend, no database and no dedicated application yet.

The workflow is deliberately simple:

```text
Gmail thread
  ↓
AI-assisted extraction
  ↓
YAML interaction packet
  ↓
Markdown register
  ↓
Git commit
  ↓
optional public use
```

## Why Git matters

Git provides:

- version history;
- visible corrections;
- durable public memory;
- reviewable changes;
- traceability over time.

This is important because transparency must not become a one-way accusation mechanism.

A good traceability system must also document:

- replies;
- refusals;
- corrections;
- errors;
- changes of interpretation.

## Disclosure levels

The system uses explicit disclosure levels:

- D0: strictly private;
- D1: internal traceability;
- D2: public minimal trace;
- D3: public documented trace;
- D4: full publication.

The default doctrine is transparency by default, with explicit exceptions.

Legitimate exceptions include, for example:

- medical information;
- vulnerable persons;
- legal confidentiality;
- physical security;
- explicit confidentiality obligations.

## First real test: MareNostrum

The first tested case concerns the MareNostrum proposal sent to Université de Corse.

Initial interpretation:

> no response detected.

Thread inspection corrected this interpretation.

Actual result:

- message sent on 2026-05-04;
- reply received on 2026-05-05;
- response was negative;
- the registry was corrected accordingly;
- a YAML packet was created.

This is an important result.

The system did not merely document a complaint. It corrected an erroneous assumption.

That correction is central to the method.

## Current files

- `README.md` introduces the Interaction Packets directory.
- `mail_trace_pipeline.md` describes the email traceability pipeline.
- `mail_trace.md` is the current Markdown register.
- `prompts/` contains reusable prompts for extraction, follow-up generation and registry updates.
- `packets/2026/` contains real YAML interaction packets.

## What this proves

This MVP proves that a person, association or public-interest project can already build a traceability system using ordinary tools:

```text
Gmail + GitHub + AI agent = versioned interaction memory
```

This can be used to trace:

- requests;
- replies;
- refusals;
- delays;
- follow-ups;
- corrections;
- institutional continuations.

## Methodological rule

The system should never automatically infer contempt, hostility or bad faith.

It should record observable states:

- sent;
- reply received;
- no reply detected;
- refusal received;
- redirected;
- follow-up sent;
- corrected.

Interpretations, when needed, must remain separate from facts.

## Next step

The next step is to use the same process on several recent sent emails, then compare:

- actual replies;
- apparent silences;
- delays;
- follow-up needs;
- disclosure levels.

The system should remain simple until repeated use proves what deserves automation.


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Jean Hugues Robert — Tableau de bord Interaction Packets](dashboard.md)

<!-- END_AUTO: backlinks -->
