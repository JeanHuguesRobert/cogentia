---
schema: cogentia.pattern/v1
id: capability-symmetry
kind: pattern
status: experimental
title: Capability Symmetry
language: en
document_role: operational
document_kind: pattern
visibility: public
origin: Digipolis design exploration, 2026-08-17
related_issues:
  - cogentia#110
  - cogentia#108
---

# Capability Symmetry

## Context

Humans and machines increasingly participate in the same systems as distinct kinds of agents. They often have very different native affordances: humans benefit from visual, conversational and embodied interaction; machines benefit from structured objects, stable identifiers, programmatic invocation and high-throughput processing.

A system may accidentally expose the same underlying capability much more easily to one category of agent than to the other merely because one interface was designed first.

## Problem

A capability that is naturally mobilizable by a human can become difficult or impossible for a machine to invoke, or vice versa, even when the asymmetry is not intrinsic to the capability itself.

This creates accidental barriers, duplicate semantic worlds and unequal access to action.

## Forces

- Humans and machines have materially different interaction capabilities.
- Identical interfaces are therefore neither necessary nor always desirable.
- Separate human-only and machine-only semantic models drift over time.
- Machine-readable does not imply machine-only.
- Human-readable does not imply human-only.
- Comparable access should not erase differences in mandate, identity, privacy, safety or responsibility.
- A capability's transport or projection must not become its semantic identity.

## Resolution

For every material capability, provide a comparably direct way for both human and machine agents to mobilize the same underlying semantic capability, unless a real difference in agent capability justifies the asymmetry.

Preserve:

```text
same underlying capability
same identity/provenance semantics
same mandate/authority semantics
same responsibility and trace model
```

Allow:

```text
different projections
appropriate to agent capabilities and channel
```

Use this test:

```text
H-test: How does a human mobilize this capability?
M-test: How does a machine mobilize this capability?
Δ-test: Is the difference intrinsic and justified, or merely accidental?
```

Treat unjustified asymmetry as a design smell.

## Consequences

- Human and machine interfaces remain projections of one semantic system rather than separate products with divergent meaning.
- Capabilities developed first for machines should gain usable human projections, not merely APIs.
- Capabilities developed first for humans should gain agent-compatible projections, not brittle UI automation.
- Accessibility, auditability and provider/channel substitution improve.
- Implementations may require more discipline around shared identifiers, structured representations and projection boundaries.

## Non-goals

- Do not require identical interfaces for humans and machines.
- Do not pretend humans and machines have identical cognitive, perceptual or execution abilities.
- Do not infer equal authority from equal capability access.
- Do not bypass safety, privacy, mandate or legal constraints in the name of symmetry.

## Example — Digipolis

A public social capability such as `publish`, `reply`, `mention` or `observe` should remain one semantic capability whether invoked by a Digipee through a machine-facing surface or inspected/mobilized by a human through a conversational or web projection.

The projection may differ; the underlying act, provenance, mandate and trace semantics should not.

## Example — Corpus navigation

If an agent can invoke `corpus.status(subject)` through MCP, a human should be able to ask the equivalent question conversationally or through a UI without receiving a semantically weaker product. Conversely, a human-only navigation feature should not require a machine to simulate clicks when the same capability can be exposed structurally.

## Related anti-pattern candidate

**Accidental Agent Asymmetry** — one category of agent can mobilize a capability easily while another must use brittle workarounds, without an intrinsic reason for the difference.

## Experimental status

This Pattern is dogfood for Cogentia Pattern Language. Its usefulness must be evaluated in real design work. Repetition or inclusion in agent instructions does not by itself establish it as a validated architectural principle.
