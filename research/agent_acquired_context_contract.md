---
title: Agent-acquired context contract v0
subtitle: What an imported agent snapshot means, and the three layers it must not collapse
description: Minimal schema boundary for a snapshot of what an external conversational agent claims to have learned, retained, or inferred about a person.
author: Jean Hugues Robert
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
date: "2026-10-03"
last_modified_at: "2026-10-03"
license: CC BY-SA 4.0
language: en
status: draft
document_role: source
document_kind: research-paper
visibility: public
lifecycle_state: active
classification_source: cogentia.js
classification_version: "1"
classification_rule: research-paper
classification_confidence: medium
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/agent_acquired_context_contract.md
ai_assisted_by:
  - Grok 4.7 (xAI), under JeanHuguesRobert/cogentia#216
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "https://github.com/JeanHuguesRobert/cogentia/issues/216"
  origin_date: "2026-10-03"
  derived_from:
    - research/mneme_memory_architecture.md
    - research/kys_reality_capture_baseline_audit.md
    - research/cogentia_personal_data_portability.md
review:
  status: unreviewed
  reviewed_by: []
---

# Agent-acquired context contract v0

This note is the meaning of `cogentia.agent-acquired-context.v0`. The machine
boundary is [`schemas/agent-acquired-context.v0.schema.json`](../schemas/agent-acquired-context.v0.schema.json).
Fictitious fixtures live under
[`schemas/fixtures/agent-acquired-context/`](../schemas/fixtures/agent-acquired-context/).

Packet: [cogentia#216](https://github.com/JeanHuguesRobert/cogentia/issues/216)
(KYS-AMI-01). Parent program: [#215](https://github.com/JeanHuguesRobert/cogentia/issues/215).
The general capture parser remains [#206](https://github.com/JeanHuguesRobert/cogentia/issues/206).
This contract does not implement that parser, the introspection prompt (#217),
or paste-bridge ingestion (#218).

## What an imported snapshot is

An agent-acquired context snapshot is a normalized record of what one external
conversational agent claimed, at one capture, about one person. The person may
be fictitious in a fixture. The agent may be any provider.

The snapshot preserves:

- source provider, agent, model, platform, and declared memory scope;
- capture time;
- prompt id and prompt version;
- the schema version;
- a reference to the raw response;
- each normalized item's content, category, record kind, claimed origin,
  claimed time, stated uncertainty, and sensitivity.

Unknown stays unknown. A missing date, origin, model, or platform is `null` or
the explicit token `unknown`. It is not filled with a plausible value.

## What it is not

`claim_status` is fixed to `agent_claim_not_fact`. Nothing in the document
becomes true because it was imported. Agreement between agents, a confident
tone, or a provider "memory" entry does not change that.

The snapshot is not a mneme and not a Cogentigram. Those are separate governed
objects. This schema has no promotion field. A `mneme_id`, Cogentigram axis, or
`accepted_as_fact` flag is invalid.

`category` is an open view label. Identity, career, projects, preferences, and
instructions are useful examples. They are not a required ontology. A new label
does not need a schema version. `record_kind` is the small closed list of what
kind of statement the item is (`claim`, `preference`, `instruction`,
`relationship`, `other`, `unknown`). A new record kind needs a schema version.

`sensitivity` (`ordinary`, `sensitive`, `restricted`, `unknown`) is a handling
label carried with the claim. It does not state a retention period, a consent
choice, or a lawful basis. A `retention` field is invalid. This packet does not
adopt a personal-data retention policy.

Contradictions stay visible. Two items may name each other in `contradicts`.
The schema does not choose which one is right.

## Three layers

These layers stay in different objects. No lower layer rewrites a higher one.

```text
raw_response.role = immutable_raw_measurement
        exact provider response, or an explicit absence
        ↓
layer = normalized_snapshot
        items[] are claims extracted from that response
        ↓
layer = human_annotation
        a later confirm / nuance / contest / contextualize / restrict note
```

The raw response is the measurement. When `raw_response.body` is present, its
`body_sha256` is `sha256:` plus the hex SHA-256 of that string as UTF-8. When
the body is `null`, the normalized document is not the measurement. The digest
may still name bytes stored elsewhere, or it may be `unknown`. Items must not
be used to reconstruct a missing raw response.

A normalized item is one claim inside the snapshot. Its `content` is what was
imported. It is not a correction and not a biography.

A human annotation is a separate document of kind
`agent_acquired_context_annotation`. It points at `target.capture_id` and
`target.item_id`. Its `claim_status` is `human_annotation_not_a_rewrite`. It
has a stance and a note. It has no item body and no raw response, so it cannot
replace either one. Whether the target exists is checked when the annotation is
joined to a snapshot, which this contract does not do.

Capture time and claimed time are different. A snapshot can record that the
paste was captured at a known moment while the claim itself is undated.

## Check

```bash
node scripts/check-agent-acquired-context.js
```

The checker accepts the valid fixtures and rejects missing source, a truth
flag, a guessed date on an unknown time, mneme promotion, an origin outside the
enum, a contradiction that does not resolve, a self-contradiction, an
annotation that carries replacement content, a raw-body hash mismatch, a known
time with a null value, and a retention field.

## Left for later packets

#217 writes the prompt that asks an agent for this snapshot. #218 parses a
paste into an immutable raw measurement plus a normalized snapshot. #220 is the
review surface that creates annotations. None of those steps is authorized to
promote an item into a mneme or a Cogentigram, or to treat the import as fact.
