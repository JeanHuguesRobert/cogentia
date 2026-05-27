# Mail Trace Pipeline

## Object

This document describes a minimal correspondence traceability pipeline integrated into Cogentia.

The objective is to transform raw email correspondence into structured, versioned and optionally public interaction packets.

## Principle

An email is treated as a cognitive packet.

It contains:
- sender;
- recipients;
- date;
- subject;
- content;
- status;
- disclosure level;
- continuation state.

The pipeline extracts these elements and produces:
1. a YAML packet;
2. a Markdown registry line;
3. optionally a follow-up draft.

## Disclosure levels

- D0: strictly private
- D1: internal traceability
- D2: public minimal trace
- D3: public documented trace
- D4: full publication

## Pipeline

```text
Raw email
  ↓
Extraction prompt
  ↓
YAML packet
  ↓
Markdown registry line
  ↓
Follow-up / archive / publication
```

## Operational principle

Version 0 requires:
- no backend;
- no database;
- no mandatory automation.

The workflow is:
1. send email;
2. AI agent reads or receives copied email;
3. agent extracts structured metadata;
4. agent proposes YAML + Markdown;
5. human validates;
6. Git commit;
7. optional publication.

## Important constraints

The system should:
- avoid psychologizing;
- distinguish facts from interpretations;
- avoid automatic accusations;
- preserve explicit confidentiality exceptions.

## Long-term direction

The objective is not merely email tracking.

The objective is a general protocol for:
- traceable continuations;
- institutional memory;
- democratic auditability;
- transparent public interaction.

Email is only the first interaction packet type.
