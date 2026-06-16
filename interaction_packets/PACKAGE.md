---
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
title: "Interaction Packets — public-use package"
date: "2026-05-27"
status: "draft — auto-filled (frontmatter cleanup)"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/interaction_packets/PACKAGE.md
last_stamped_at: 2026-06-01
---
# Interaction Packets — public-use package

## Purpose

Interaction Packets is a lightweight method for anyone who wants to make public-interest démarches traceable.

It can be used by:

- citizens;
- associations;
- informal collectives;
- researchers;
- journalists;
- local initiatives;
- open-source projects;
- public-interest campaigns.

The method requires only ordinary tools:

- an email account;
- a GitHub repository or equivalent public archive;
- an AI assistant;
- Markdown;
- optional YAML.

No dedicated software is required for version 0.

## What it does

The method turns interactions into structured packets.

An interaction may be:

- an email sent to an institution;
- a reply received;
- an absence of reply;
- a follow-up;
- a refusal;
- a meeting note;
- a public commitment;
- a correction.

Each packet records observable facts:

- date;
- channel;
- sender;
- recipient or counterparty;
- subject;
- expected continuation;
- observed continuation;
- status;
- disclosure level;
- public summary.

## What it is not

It is not:

- a denunciation wall;
- a reputation score;
- a surveillance system;
- a moral tribunal;
- an automatic accusation tool.

It should not infer contempt, bad faith or hidden intentions.

It should record facts, continuations and corrections.

## Core doctrine

Transparency by default.
Exceptions must be explicit.

Legitimate exceptions include:

- medical information;
- vulnerable persons;
- physical security;
- legal confidentiality;
- explicit confidentiality obligations;
- disproportionate risk to third parties.

## Disclosure levels

- D0: strictly private;
- D1: internal traceability;
- D2: public minimal trace;
- D3: public documented trace;
- D4: full publication.

The user decides the disclosure level.

The AI assistant may suggest a level, but must not decide alone.

## Minimal repository structure

```text
interaction_packets/
  README.md
  overview.md
  PACKAGE.md
  mail_trace.md
  mail_trace_pipeline.md
  prompts/
    extract_interaction_packet.md
    followup_generation.md
    update_registry.md
  packets/
    YYYY/
      YYYY-MM-DD-short_subject.yaml
```

## Minimal workflow

```text
1. Send or receive an interaction.
2. Ask the AI assistant to extract an interaction packet.
3. Review the proposed YAML and Markdown line.
4. Choose or validate the disclosure level.
5. Commit the packet to Git.
6. Optionally publish or share a readable summary.
```

## Prompt to use

```text
Analyse this interaction as an Interaction Packet.

Extract observable facts only.

Produce:
1. a YAML packet;
2. a Markdown registry line;
3. if useful, a sober follow-up draft.

Do not psychologize.
Do not accuse.
Distinguish facts, interpretations and unknowns.
Suggest a disclosure level, but do not decide it alone.
```

## Standard statuses

Recommended statuses:

- `sent`
- `reply_received`
- `reply_received_negative`
- `reply_received_positive`
- `no_response_detected`
- `followup_sent`
- `redirected`
- `closed`
- `corrected`
- `superseded`

Important distinction:

`no_response_detected` is not the same as `no_response`.

The first means only that no reply has been found at the time of inspection.

`superseded` means that a packet is intentionally kept as a historical state, but another consolidated packet is now the reference for the current state of the same case.

## Follow-up events and secondary continuations

An Interaction Packet may contain a `follow_up` section when the original interaction produces secondary but connected events.

Use `follow_up` when:

- the same case continues after a reply;
- a document is forwarded to related stakeholders;
- an internal archive correction is made;
- a public notification documents a previous institutional step;
- a new event updates the status but does not create a new autonomous case.

Create a new packet only when:

- a new counterparty becomes the main actor of a distinct interaction;
- the expected continuation is different;
- the case now has its own timeline, status and outcome.

Example:

```yaml
follow_up:
  - date: "YYYY-MM-DD"
    time: "HH:MM"
    direction: "outbound"
    channel: "email"
    event: "Stakeholders informed"
    summary: >
      Related actors were informed of the already documented primary interaction.
    status: "sent"
```

## Consolidated packets and superseded packets

A case may evolve after its first documentation. For example:

```text
initial request → procedural refusal or redirection → written contribution accepted → related stakeholders informed
```

When this happens, avoid two opposite errors:

- deleting the initial packet too quickly, which erases the history of the case;
- leaving several packets active for the same case, which creates ambiguity.

Recommended rule:

- keep the initial packet if it has historical value;
- mark it as `superseded`;
- point it to the consolidated packet;
- make the register and dashboard point to the consolidated packet.

Example:

```yaml
status: "superseded"
superseded_by: "interaction_packets/packets/YYYY/YYYY-MM-DD-consolidated-case.yaml"
superseded_reason: >
  This packet documented the initial state of the case. The case later evolved
  after a new documented event. The consolidated packet now tracks the current
  state of the case.
```

The distinction to preserve is:

```text
new fact in the same case → follow_up
new counterparty with autonomous stakes → new packet
older state replaced by consolidated state → superseded_by
traceability omission corrected later → archive correction / follow_up
```

## Public register example

```md
| ID | Date | Subject | Counterparty | Follow-up | Days elapsed | Status | Disclosure |
|---|---:|---|---|---:|---:|---|---|
| 2026-05-04-001 | 2026-05-04 | Session MareNostrum | Université de Corse | 0 | 1 | Reply received: negative | D2 |
```

## YAML packet example

```yaml
id: 2026-05-04-001
channel: email
date: 2026-05-04
subject: "Session MareNostrum"
from: "Sender name"
to:
  - "institution@example.org"
thread_detected: true
reply_detected: true
reply_date: 2026-05-05
status: "reply_received_negative"
disclosure: "D2"
public_summary: "Request sent. Negative reply received the next day."
notes:
  - "Initial assumption corrected after thread inspection."
```

## Extended YAML packet example

```yaml
id: 2026-05-25-001
type: "interaction_packet"
status: "active"
created: "YYYY-MM-DD"
last_updated: "YYYY-MM-DD"
disclosure: "D2"
subject: "Public-interest contribution"

current_status:
  label: "Contribution transmitted; stakeholders informed; awaiting report"
  details:
    - "Contribution transmitted through the relevant institutional channel."
    - "Related stakeholders informed."
    - "Specific acknowledgment not yet detected."

follow_up:
  - date: "YYYY-MM-DD"
    time: "HH:MM"
    direction: "outbound"
    channel: "email"
    event: "Stakeholders informed"
    summary: >
      Related actors were informed of the documented primary interaction.
    status: "sent"
```

## Minimal public page

A public readable page should explain:

- what was requested;
- when it was requested;
- what answer was received, if any;
- what correction was made, if any;
- what remains open.

It should avoid:

- emotional escalation;
- personal attacks;
- speculative motives;
- unnecessary private details.

## Why this matters

Many public-interest démarches disappear into private inboxes.

Interaction Packets make them:

- dateable;
- reviewable;
- correctable;
- shareable;
- reusable;
- auditable.

The method helps transform isolated correspondence into civic memory.

## Version 0 rule

Do not automate too early.

First stabilize the protocol manually with:

- copy/paste;
- AI extraction;
- human validation;
- Git commits.

Automation should come only after repeated use shows what is stable.


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Jean Hugues Robert — Tableau de bord Interaction Packets](dashboard.md)
- [Interaction Packets — Tableau de bord (JHR)](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/interaction_packets/dashboard.md)
<!-- END_AUTO: backlinks -->
