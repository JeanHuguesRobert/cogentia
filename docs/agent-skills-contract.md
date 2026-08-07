---
title: Agent Skills contract
date: '2026-08-07'
document_role: operational
document_kind: contract
visibility: public
lifecycle_state: experimental
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: issue
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: '82'
  origin_date: '2026-08-06'
  derived_from:
    - research/agent_configuration_layer.md
    - research/monotonic_mandate_attenuation.md
    - research/mcp_2026_cognitive_packet_sandbox_plan.md
---

# Agent Skills contract

## Purpose

Define **Agent Skills** as portable, discoverable, governed **method packages** for Cogentia agents.

A skill tells an agent *how* to perform a bounded class of work. It does not grant authority, replace the corpus, replace COP, or become a second orchestration runtime.

Issue: [cogentia#82](https://github.com/JeanHuguesRobert/cogentia/issues/82).

## Vocabulary (binding distinctions)

| Term | Meaning |
|------|---------|
| **AGENTS.md** | Durable local operational constraints for a repository/workspace. |
| **Prompt contract** | Conversational role or request template (`prompts/`). |
| **Skill** | Versioned, bounded method package: when to use it, inputs, procedure, evidence, outputs, capability requirements, stop conditions. |
| **Capability** | Semantic ability required by cognitive work (#80). |
| **Tool** | Invocable operation that may read, prepare, or produce an external effect. |
| **Module / provider** | Implementation able to provide capabilities. |
| **Mandate** | Authority granted by a principal or lawful collective process. |
| **Cognitive Packet** | Envelope + payload unit of resumable cognitive work (`research/cognitive_packets.md`). |
| **Continuation** | Suspended computation awaiting judgment; operational CLI object `cogentia.continuation.v2`, or the *payload* of a packet with `packet_kind = continuation`. |

## Binding invariants

```text
A skill may recommend or request a capability.
A skill does not grant authority to invoke it.
Capability availability is not authorization.
Authorization is not execution.
A skill must not silently disclose private corpus material.
A skill must not widen inherited mandate, budget, disclosure, or effect ceiling (#79).
Skills do not replace Cognitive Packets when a meaningful handoff, continuation, Act, or trace is required.
```

## Repository layout

```text
skills/
  <skill-id>/
    SKILL.md                 # method package (human + agent readable)
    references/              # optional short supporting notes
    examples/                # optional fixtures
docs/
  agent-skills-contract.md   # this file
  agent-skills-compatibility.md  # client evidence (when recorded)
scripts/
  validate-agent-skills.js   # inventory + structural checks
```

`SKILL.md` must remain readable without a particular vendor runtime. Vendor glue (Grok, Claude Code, Codex, Cursor) belongs in adapter notes, not in skill semantic identity.

## Minimal skill descriptor (`cogentia.agent_skill/v1`)

Frontmatter on `SKILL.md` SHOULD include:

```yaml
schema: cogentia.agent_skill/v1
id: cogentia.<skill-slug>
version: 1
status: experimental | draft | stable | deprecated
name: <skill-slug>                 # host-compatible short name
description: <auto-discovery blurb including triggers>
triggers: []
inputs: []
outputs: []
effects: read_only | prepare_only | governed_write | external_effect
requires:
  capabilities: []
governance:
  minimum_mandate: read_public | prepare | resolve_under_mandate | ...
  may_disclose: false
  may_resolve_without_mandate: false
  trace_minimum: material | full
sources: []                        # relative repo paths
```

Semantic identity is `id` + `version`. Fixed model names, machine URLs, or provider lock-in MUST NOT appear as identity.

## Discovery

1. **Local** — agents read `skills/*/SKILL.md` and this contract; hosts that load `SKILL.md` natively may auto-invoke from `description` / `triggers`.
2. **CLI** — `node scripts/validate-agent-skills.js` inventories packages.
3. **MCP** — production public MCP remains tools-only until experimental Skills-over-MCP evidence is recorded. MCP `2025-11-25` is the stable baseline; `2026-07-28` discovery is experimental (#82, sandbox plan).

## Relationship to Cognitive Packets

Skills operate at the **method-selection** layer. When work must leave the current process, session, or handler:

```text
Skill may prepare or inspect a Cognitive Packet / continuation object.
Packet envelope supports routing without interpreting payload.
Payload kind (e.g. continuation) is handled only by a capable receiver.
Resumption uses durable provenance — never an assumed in-memory MCP session.
```

See skill `continuation-handling` for the first package that makes this operational.

## Non-goals

- No generic autonomous skill executor.
- No new external side-effect tools created by this contract alone.
- No public MCP deployment change before client evidence and human validation.
- No replacement of AGENTS.md, the corpus, mandate resolution, COP, or the #80 capability registry.
- No broad skill catalogue before vertical slices work end-to-end.

## Validation

```bash
node scripts/validate-agent-skills.js
```

Checks unique `id`/`version`, required fields, declared sources exist, effects present, and that governance forbids silent resolve/disclosure widening markers where declared.
