---
schema: cogentia.agent_skill/v1
id: cogentia.mandate-attenuation-check
version: 1
status: experimental
name: mandate-attenuation-check
description: >
  Check that a child mandate, AGENTS.md profile, skill activation, or subagent
  envelope only attenuates a parent (never widens authority). Use before
  resolve/emit, subagent spawn, or applying local instructions. Slash:
  /mandate-attenuation-check. Fail closed on FAIL; treat WARN as non-authorizing
  for consequential acts.
triggers:
  - before child mandate or subagent activation
  - before continuation resolve under nested mandate
  - AGENTS.md or skill appears to grant more than parent
  - Agent JHN elf / subagent scope check
  - may_disclose or budget seems wider locally
inputs:
  - parent_constraints
  - child_constraints
outputs:
  - verdict
  - dimension_checks
  - fail_closed_recommendation
effects: read_only
requires:
  capabilities:
    - mandate.compare
governance:
  minimum_mandate: read_public
  may_disclose: false
  may_resolve_without_mandate: false
  may_widen_authority: false
  trace_minimum: material
sources:
  - docs/agent-skills-contract.md
  - research/monotonic_mandate_attenuation.md
  - research/agent_configuration_layer.md
  - instructions/AGENTS.shared.md
document_role: "operational"
document_kind: "documentation"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "skill-procedure"
classification_confidence: "strong"
---

# Skill: mandate-attenuation-check

## Purpose

Enforce **monotonic attenuation** (#79):

```text
Authority(child) ⊆ Authority(parent)
Obligations(child) ⊇ Obligations(parent)
```

A local skill, AGENTS.md, mission mandate, or `agent:jhn.subagent:*` profile may **narrow** scope. It must not mint power.

## When to run

- Before activating a child mandate or elf/subagent.
- Before `continuation resolve` if constraints nested under a parent mandate.
- When local wording says “may …” and parent said “must not …”.
- When budget, disclosure, or risk ceiling might have increased.

## Procedure

1. **Identify chain** (nearest parent that actually grants authority — not the nearest AGENTS.md alone):
   ```text
   shared instructions → repo AGENTS.md → subsystem → mission mandate → act
   ```
2. **Extract comparable envelopes** as structured objects (see examples/).
3. **Compare** with tooling:
   ```bash
   node scripts/mandate-attenuation-check.js --parent parent.json --child child.json
   # MCP:
   cogentia_mandate_attenuation_check { parent, child }
   ```
4. **Interpret verdict**
   | Verdict | Stance |
   |---------|--------|
   | **PASS** | Child only attenuates; proceed under child envelope |
   | **WARN** | Some dimensions not comparable — do **not** authorize consequential Acts on those dimensions |
   | **FAIL** | Child widens authority — **refuse**; report dimensions |
5. **Trace** — record parent_ref, child_ref, verdict, failing dimensions.

## Envelope fields (first slice)

| Field | Monotone rule |
|-------|----------------|
| `effects` / permissions | child ⊆ parent |
| `repos`, `paths`, `scopes`, `data_classes`, `audiences` | child ⊆ parent |
| `disclosure` | child ⊆ parent (≠ read) |
| `prohibitions` | child ⊇ parent |
| `obligations` | child ⊇ parent |
| `budget.*` | child ≤ parent |
| `delegation_depth` | child ≤ parent |
| `risk_ceiling` | child ≤ parent |
| `trace_minimum` | child ≥ parent (stronger ok) |
| `valid_from` / `valid_until` | child interval ⊆ parent |
| `may_disclose`, `may_resolve_without_mandate`, `may_widen_authority` | child must not enable if parent forbids |

## Relationship to Agent JHN

```text
Principal mandate
  → agent:jhn
    → agent:jhn.subagent:elf-*   must attenuate
```

MCP JHN token proves *who calls* the tool surface; this skill checks *what scope* the call claims. Both are required for safe write.

## Non-goals

- Not a full COP mandate engine.
- Does not mint mandates.
- Does not CSS-override parents with “nearest file wins power”.

## Stop conditions

- FAIL → stop Act path; return structured refusal.
- WARN on a dimension needed for the Act → fail closed or escalate to Principal.
