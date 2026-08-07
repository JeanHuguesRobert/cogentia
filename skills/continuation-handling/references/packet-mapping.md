# Packet ↔ continuation field mapping

Companion to skill `continuation-handling`. Non-normative convenience map; source doctrine remains `research/cognitive_packets.md` and the CLI surface.

## Three surfaces agents actually meet

| Surface | Where | Role |
|---------|--------|------|
| **Cognitive Packet (research v0.3)** | `prompts/cognitive_packet.md`, research notes, CPKT files | Envelope + payload; transport-neutral handoff |
| **`cogentia.continuation.v1`** | `research/agent_resumable_cli.md` (research shape) | Richer continuation object |
| **`cogentia.continuation.v2`** | `scripts/cogentia.js` CLI store | Compact operational object |

A `cogentia.continuation.*` object is the **canonical payload** (or operational twin) of `packet_kind = continuation`. Field sets differ; **identity of the suspended work** must survive mapping.

## Envelope fields → inspection checklist

| Packet envelope idea | v2 CLI | CPKT-style handoff |
|----------------------|--------|--------------------|
| Packet identity | `id` / `continuation_id` | `packet_id` |
| Kind | `kind` (often `judgment`) | `packet_kind` |
| Status | `status` (`active`, …) | `status` |
| Provenance | `requester`, `history`, `created_at` | frontmatter + hop log |
| Context reference | `subject`, `context` | workstreams, artifact list, homes |
| Routing | `resume.command` | routing policy, carrier, return path |
| Transmission mode | implicit (file/store = copy-ish) | by copy vs by reference (declare) |
| Traces | `history`, resolution metadata | Hop Log, R0–R5 |

## Continuation payload → judgment fields

| Payload idea | v2 CLI | Notes |
|--------------|--------|--------|
| Suspended question | `question` | Required for resolve path |
| Title / task | `title` | |
| Expected answer shape | `expected_response` | Prefer over free prose |
| Alternatives | (optional / context) | v1 often has `alternatives[]` |
| Constraints | `context.constraints` or parent mandate | Fail closed if missing when risky |
| Next action | `resume` | Command or return path |
| Resumption risks | context / packet section | Consent gates, GO-required streams |

## Resolution objects

| Outcome | Typical form |
|---------|----------------|
| Structured judgment | `step_result` JSON → `continuation resolve` |
| Packet processor hop | Append-only hop log + optional new packet version |
| Refusal / gate | `needs_acceptance` or new continuation; no silent success |
| Technical failure | Error report; do not store as successful decision |

## Resumption without MCP session

```text
Stable ids: continuation_id | packet_id | correlation / traceparent
Durable store: CLI continuations dir | repo file | issue | COP event
Handler may change: different MCP client, model, or human
Reconstruct: constraints from object + cited sources, not chat memory
```

This is the skill-level expression of #82 test obligation *resumption* and of MCP 2026-07-28 stateless multi-round work aligned with Cognitive Packet Switching.
