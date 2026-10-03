---
title: Agent-acquired context prompt v0
subtitle: One-shot paste prompt for what a conversational agent claims to know
description: Provider-neutral copy-paste prompt whose reply is a KYS-AMI-01 snapshot, plus known limits and frozen examples.
author: Jean Hugues Robert
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
date: "2026-10-03"
last_modified_at: "2026-10-03"
license: CC BY-SA 4.0
language: en
status: draft
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: active
classification_source: cogentia.js
classification_version: "1"
classification_rule: documentation
classification_confidence: medium
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/prompts/agent-acquired-context.md
ai_assisted_by:
  - Grok 4.7 (xAI), under JeanHuguesRobert/cogentia#217
  - Grok 4.7 (xAI), under JeanHuguesRobert/cogentia#219
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "https://github.com/JeanHuguesRobert/cogentia/issues/217"
  origin_date: "2026-10-03"
  derived_from:
    - research/kys-prompt.md
    - research/cogentia_prompt_v1.md
    - research/agent_acquired_context_contract.md
    - prompts/cognitive_packet.md
review:
  status: unreviewed
  reviewed_by: []
---

# Agent-acquired context prompt v0

This is the KYS-AMI-02 paste prompt. It is not the 73-axis psychocognitive
protocol in [`research/kys-prompt.md`](../research/kys-prompt.md) and
[`research/cogentia_prompt_v1.md`](../research/cogentia_prompt_v1.md). Those ask
for a structural portrait. This prompt asks an agent to expose personalization
it can actually inspect.

The reply must be one snapshot of
[`cogentia.agent-acquired-context.v0`](../schemas/agent-acquired-context.v0.schema.json).
Meaning of that snapshot: [`research/agent_acquired_context_contract.md`](../research/agent_acquired_context_contract.md).

The paste block is English because the schema keys are English. Item `content`
may stay in the language the agent actually has.

Copy only the block between the paste markers. The sections after it are for
Cogentia handlers, not for the external agent.

## Paste prompt

<!-- BEGIN_PASTE -->
You are this person's conversational agent. They will paste your reply into Cogentia. Reply with one YAML document and nothing else.

Report only personalization you can actually inspect. That includes a saved-memory entry, a statement of theirs you still have, an inference you can label as an inference, and material that exists only in the current conversation. If you cannot tell which of those it is, mark the origin unknown.

This is not a personality test. Do not produce a Cogentigram, a mneme, or a personality score. Do not describe chain-of-thought, weights, or any other internal state you cannot inspect. Do not claim that your report is complete.

Use null or the token unknown when you do not know. Do not guess a date, a quotation, or an origin. Do not present a summary as a quotation. Quote the person's words only when you still have those words.

Leave raw_response.body null and body_sha256 unknown. This YAML is the reply. Do not nest a copy of it inside body.

If you have no distinguishable persistent memory and this conversation has not established any personalization, return one item and nothing biographical. Use category capture-limit, record_kind unknown, claimed_origin unknown, and say that you have no distinguishable persistent memory.

Fill this document. Keep every key. Replace each bracketed note.

schema_version: cogentia.agent-acquired-context.v0
kind: agent_acquired_context
layer: normalized_snapshot
capture_id: capture:agent-reply
claim_status: agent_claim_not_fact
source:
  provider: [your provider name, or unknown]
  agent: [your product name, or unknown]
  model: [model name, or null]
  platform: [app or site, or null]
  memory_scope: [what you can actually see, such as saved memories plus this conversation, or current conversation only, or no distinguishable persistent memory, or null]
captured_at:
  status: unknown
  value: null
protocol:
  prompt_id: kys-ami-02
  prompt_version: v0
  response_schema_version: cogentia.agent-acquired-context.v0
raw_response:
  role: immutable_raw_measurement
  media_type: unknown
  body: null
  body_sha256: unknown
items:
  - id: item:short-name
    content: [the claim, or a summary explicitly labeled as a summary]
    category: [a short view label you choose]
    record_kind: [claim | preference | instruction | relationship | other | unknown]
    claimed_origin: [explicit_user_statement | inference | provider_memory | unknown]
    claimed_time:
      status: [known | unknown]
      value: [non-empty string if known, otherwise null]
    uncertainty:
      status: [known | unknown]
      note: [what you yourself are unsure of, or null]
    sensitivity: [ordinary | sensitive | restricted | unknown]
    contradicts: []

Origins:

- explicit_user_statement: you still have the person's statement. Current-conversation statements use this origin too. Set memory_scope so a reader can see it is the current conversation when you have no durable memory.
- inference: you inferred it. Say so in uncertainty.note. Do not present it as their words.
- provider_memory: your product stored it as memory or personalization. Stored memory is still a claim, not a transcript, and not proof.
- unknown: you cannot tell which of the above it is.

Keep contradictions as separate items that name each other in contradicts. Do not smooth them into one claim.

category is a label you choose. Identity, career, projects, preferences, and instructions are examples, not a required list.

sensitivity is only a handling label. Do not state a retention or consent policy.

claimed_time.status unknown means you do not know when the claim was made. Then value must be null. Do not invent a date. captured_at stays unknown unless you know the clock time of this reply.

Ids use item:short-name with lowercase letters, digits, and . _ : - only.
<!-- END_PASTE -->

## Known limits

These limits stay outside the paste prompt. The protocol does not depend on a named product.

- Some products show a saved-memory list. Some show only the current thread. Some apply personalization the model cannot list. The prompt asks the agent to describe the scope it can see, not to pretend every product has the same switch.
- A product label such as memory, custom instructions, or profile is not a transcript. The reply must use `provider_memory` or `unknown` rather than treating that label as the person's words.
- A context window is not durable memory. Material that exists only in the current thread is allowed, and `memory_scope` must say so.
- The agent cannot see weights, hidden reasoning, or another person's data. The prompt does not ask for them.
- If none of the durable state is visible, a bounded `capture-limit` item is the valid reply. Silence or an invented biography is not.
- Item text may be sensitive because the person wants to review what was retained. The prompt does not ask the agent to hunt for special-category data, and it does not create a retention rule.

## Frozen examples

Three authored replies show capability profiles, not live provider captures:

- [`rich-memory.yaml`](fixtures/agent-acquired-context/rich-memory.yaml) — statements, an inference, stored personalization, an unknown origin, and an unresolved contradiction.
- [`limited-memory.yaml`](fixtures/agent-acquired-context/limited-memory.yaml) — current conversation only, plus one item of unknown origin.
- [`no-persistent-memory.yaml`](fixtures/agent-acquired-context/no-persistent-memory.yaml) — one `capture-limit` item and no biography.

They are not captures from named providers. These examples leave `raw_response.body` null on purpose. The paste itself is the measurement.

Check:

```bash
node scripts/check-agent-acquired-context-prompt.js
```

A reply is accepted when it is one YAML object that satisfies the v0 contract. Any other reply is rejected with the schema errors, or with a parse diagnostic that tells the sender to return one YAML document and nothing else.

## Ingestion

`ingestAgentAcquiredContext` in [`scripts/lib/agent-acquired-context-ingest.js`](../scripts/lib/agent-acquired-context-ingest.js) is the paste path for this protocol. It does not create an account and it does not write the paste to a database, file, or browser store.

The result keeps three separate values:

- `raw.text` is the pasted string, unchanged, with its SHA-256. It is never replaced by the normalized object.
- `normalized` is a v0 snapshot or annotation, or `null` when the paste is malformed or does not meet the contract.
- `extensions` lists parseable fields the v0 schema does not define. They stay as evidence beside the projection. A strict prompt check still rejects them. Ingestion does not drop them and does not copy them into `normalized`.

Malformed JSON does not produce a snapshot. A missing required field does not produce a partial snapshot with guessed values. The historical 73-axis parser and the `kys-snapshot-0.1` page are different protocols and are not this route.

```bash
node scripts/check-agent-acquired-context-ingest.js
```

## Immediate mirror

After one ingestion, the personal app route `/mirror` shows that snapshot before any account request. `buildAgentAcquiredContextMirror` in [`scripts/lib/agent-acquired-context-mirror.js`](../scripts/lib/agent-acquired-context-mirror.js) is the view model. The page reuses the same projection and validator as ingestion. It does not write the paste to a database, file, or browser store.

The view says the items are the agent's claims, not objective truth. Categories are the snapshot's own labels. Claimed origin and a stated uncertainty stay visible, and they are distinguishable when the snapshot says which is which. Counts for explicit statements, inferences, provider memory, unknown origin, stated uncertainty, and kept contradictions appear only when that count is greater than zero. The view does not invent a "new" count. A missing category is not shown as proof that the agent has no memory of that topic.

The raw paste, its SHA-256, schema extensions, and per-item handling fields stay behind closed details.

Authored UI fixtures, not captures from named providers:

- [`rich-memory.yaml`](fixtures/agent-acquired-context/rich-memory.yaml) — a normal mix of origins.
- [`no-persistent-memory.yaml`](fixtures/agent-acquired-context/no-persistent-memory.yaml) — a sparse capture-limit reply.
- [`uncertainty-heavy.yaml`](fixtures/agent-acquired-context/uncertainty-heavy.yaml) — one explicit statement among several uncertain inferences and unknown origins.

```bash
node scripts/check-agent-acquired-context-mirror.js
```
