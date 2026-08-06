---
title: Monotonic Mandate Attenuation
subtitle: Hierarchical agent configuration may restrict authority, never enlarge it
version: '0.1'
status: working-paper — normative candidate
date: '2026-08-06'
author: Jean Hugues Noël Robert
license: CC BY-SA 4.0
language: en
repository: cogentia
canonical_path: cogentia/research/monotonic_mandate_attenuation.md
tags:
  - cogentia
  - mandate
  - agents-md
  - authorization
  - attenuation
  - capability-security
  - agent-configuration
  - cop
related_research:
  - cogentia/research/agent_configuration_layer.md
  - cogentia/instructions/AGENTS.shared.md
  - cogentia/research/optimistic_mainline_governance.md
  - inseme/packages/cop-core/Terminology.md
  - inseme/packages/cop-core/COP_IDENTITY.md
  - inseme/packages/cop-core/COP_ACCOUNTING.md
document_role: source
document_kind: specification
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
---

# Monotonic Mandate Attenuation

## 1. Purpose

Cogentia uses layered operational instructions and mandates. A typical resolution chain may be:

```text
corpus-wide instructions
→ repository AGENTS.md
→ package/subsystem AGENTS.md
→ specialization profile
→ mission / issue instructions
→ current COP mandate
→ concrete act
```

The governing safety property is **monotonic attenuation**:

> A derived or more local configuration may narrow authority, add obligations, or increase evidence requirements. It MUST NOT silently enlarge the authority inherited from a broader context.

This applies independently of file format. `AGENTS.md`, profiles, prompts, task files, generated operational projections and COP sub-mandates are all subject to the same principle when they derive authority from a broader parent context.

## 2. Core invariant

For one authority chain, if `C_child` derives from `C_parent`, then:

```text
Authority(C_child) ⊆ Authority(C_parent)
```

Equivalently, for every concrete act `a`:

```text
allowed(a, C_child) ⇒ allowed(a, C_parent)
```

A child may therefore say:

```text
yes, but only if ...
```

It may not say:

```text
the parent forbids this, but I allow it here.
```

A local instruction that appears to widen inherited authority is non-conformant and MUST NOT be used as authorization.

## 3. AGENTS.md is an attenuator, not an authority mint

`AGENTS.md` is a governed operational projection. It is not, by itself, a source of new delegated power.

Therefore:

```text
broader mandate / authority source
        ↓
AGENTS.md constraints
        ↓
effective operational envelope
```

A local `AGENTS.md` MAY:

- reduce the set of permitted acts;
- restrict repositories, paths, resources, audiences or data classes;
- impose stricter validation or confirmation rules;
- reduce budgets, time windows, risk ceilings or delegation depth;
- add trace, reporting, review or evidence obligations;
- prohibit otherwise permitted mechanisms;
- select safer defaults among already-authorized alternatives.

A local `AGENTS.md` MUST NOT:

- grant a permission absent from the applicable parent mandate;
- cancel an inherited prohibition;
- increase a resource budget or risk ceiling;
- extend validity beyond the parent expiry;
- increase delegation depth;
- downgrade an inherited trace, evidence, privacy or confirmation requirement;
- transform read access into disclosure authority;
- merge independent mandates to manufacture authority that none grants individually.

Positive wording in an `AGENTS.md` such as “agents may edit these files” MUST be interpreted as an upper bound or local workflow permission, not as a grant that overrides the actual authority source.

## 4. Composition is not override

Layered Cogentia instructions use **cumulative composition**, not CSS-like replacement.

If the applicable chain is:

```text
C0 → C1 → C2 → ... → Cn
```

then every ancestor remains in force. The effective configuration is obtained by applying each descendant as an attenuation of what remains from its parent.

A nearer file is more specific, but specificity does not grant precedence to weaken an ancestor.

The preferred terminology is therefore:

```text
specialize
restrict
attenuate
refine
```

not:

```text
override
replace
supersede
```

unless an explicit higher authority has versioned or revoked the parent rule itself.

## 5. Dimension-specific attenuation algebra

“More restrictive” is not one universal set operation. Each governed dimension has its own monotone composition rule.

| Dimension | Parent → child rule | Effective composition |
|---|---|---|
| allowed permissions / capabilities | child subset | intersection |
| allowed object / repository / path scope | child subset | intersection |
| readable data classes | child subset | intersection |
| disclosable data classes | child subset | intersection |
| allowed audiences / recipients | child subset | intersection |
| allowed handlers / execution surfaces | child subset | intersection |
| prohibitions | child may add | union |
| obligations / required checks | child may add | union |
| trace / evidence level | child same or stronger | maximum strictness |
| confirmation requirement | child same or stronger | maximum strictness |
| privacy / sensitivity protection | child same or stronger | maximum strictness |
| monetary / compute / token / call budget | child no larger | minimum/capped allocation |
| delegated budget | must come from available parent budget | reservation/sub-allocation |
| risk / exposure ceiling | child no higher | minimum ceiling |
| validity interval | child contained in parent | interval intersection |
| deadline | child same or earlier | earliest deadline |
| delegation depth | child no greater | minimum / decrement |
| reversibility requirement | child same or stronger | maximum strictness |

The implementation SHOULD use typed dimensions rather than a generic “priority” number wherever possible.

## 6. Read does not imply disclose

Information authority has at least two distinct dimensions:

```text
may_read(X)
may_disclose(X, audience)
```

and the invariant is:

```text
may_disclose(X, audience) does not follow from may_read(X)
```

A private overlay may therefore inform an internal assessment while remaining unavailable as public evidence or output. Descendant configuration can further restrict disclosure, but cannot derive disclosure authority merely from read access.

## 7. Budget attenuation

A child budget is not a fresh budget. It is a bounded allocation from authority already available to the parent.

For a resource `r`:

```text
child_limit(r) ≤ parent_available(r)
```

For concurrent delegation:

```text
Σ reserved_or_delegated_children(r)
+ parent_committed(r)
≤ parent_limit(r)
```

A child may return or release unused allocation. It may not create additional resource authority.

This rule applies to money, compute, tokens, API calls, energy, storage, time, exposure and other typed resources.

## 8. Temporal and delegation attenuation

A derived mandate cannot outlive its authority source:

```text
child.valid_from ≥ parent.valid_from
child.valid_until ≤ parent.valid_until
```

A child cannot delegate more deeply than its parent permits:

```text
child.remaining_delegation_depth < parent.remaining_delegation_depth
```

unless the child does not delegate at all, in which case zero is valid.

Revocation or expiration of a parent invalidates authority derived exclusively from that parent.

## 9. Multiple independent authority sources

Two independent mandates MUST NOT be silently unioned.

Suppose:

```text
Mandate A permits read(X)
Mandate B permits publish(Y)
```

An agent MUST NOT infer:

```text
publish(X)
```

by combining unrelated grants.

Each consequential act must have a reconstructible authority chain to a valid principal/root mandate. If an act genuinely requires authority from multiple sources, the composition MUST be explicit and itself governed, rather than inferred by convenience.

This prevents privilege synthesis by accidental cross-context union.

## 10. Conflict and ambiguity: fail closed

When two applicable constraints cannot be ordered safely, an agent or resolver MUST NOT guess which one is “more specific” and continue.

Resolution rule:

```text
clearly compatible constraints
→ compose monotonically

clear stricter descendant
→ apply descendant restriction

clear attempted widening
→ reject widening, retain parent restriction

semantic ambiguity / incomparable constraints
→ fail closed for the affected act
→ preserve the conflict
→ request or locate explicit authority if needed
```

Failing closed applies to the affected authority decision, not necessarily to unrelated read-only analysis.

## 11. Effective operational context

For a concrete act, the effective context can be viewed as:

```text
Generic Cogentia invariants
∩ authority-bearing parent mandate
∩ repository constraints
∩ local/subsystem constraints
∩ instance constraints
∩ specialization constraints
∩ mission constraints
∩ dynamic policy / risk constraints
```

with dimension-specific operators as defined above.

A useful conceptual decomposition is:

```text
EffectivePermissions   = intersection(all permission bounds)
EffectiveProhibitions  = union(all prohibitions)
EffectiveObligations   = union(all obligations)
EffectiveBudget        = tightest valid typed bound after reservations
EffectiveTraceLevel    = strongest applicable evidence requirement
EffectiveValidity      = intersection(all validity windows)
EffectiveDataAccess    = intersection(all read scopes)
EffectiveDisclosure    = intersection(all disclosure scopes)
```

An act is authorized only if it satisfies all resulting constraints.

## 12. Generic system vs Digital Twin instance

Monotonic attenuation operates across, but does not erase, the distinction between generic machinery and instance configuration.

```text
Cogentia / Inseme
= generic schemas, resolver semantics, COP authorization/accounting/trace machinery

Personal or Collective Digital Twin instance
= public/private instance definitions, profiles and instance constraints

mission mandate
= situated authority for a concrete purpose
```

Generic code MUST NOT embed JHN-specific permissions merely because Agent JHN is the first vertical slice.

Conversely, instance configuration MUST NOT redefine generic authorization semantics. It only supplies values and stricter constraints within the generic model.

## 13. Profiles and sub-LogicalAgents

A specialization profile is normally an attenuating configuration layer:

```text
John
+ coding profile
+ mission mandate
= situated coding context
```

A profile does not grant authority.

Create a distinct child `LogicalAgent` only when separate durable mandate continuity, budget, revocation, suspension or accountability is required. Its sub-mandate remains attenuated from the authority delegated by its parent.

## 14. Traceability requirement

Every consequential authorization decision SHOULD preserve enough information to reconstruct:

```text
which constraints were applicable
which parent authority chain was used
which restrictions were added locally
which budget was available/reserved/consumed
which trace/evidence level was required
why the concrete act was authorized or denied
```

An attempted widening is itself a useful governance signal and SHOULD be traceable when material.

## 15. Machine-checkable conformance target

Cogentia tooling should progressively verify the invariant rather than relying only on prose.

A future resolver/auditor should be able to report, for each child configuration:

```text
PASS  child only attenuates parent
WARN  dimension cannot yet be mechanically compared
FAIL  child attempts to widen inherited authority
```

Minimum machine-checkable dimensions should eventually include:

- permission/capability scopes;
- repository/path/data scopes;
- prohibitions;
- budgets and reservations;
- validity intervals;
- delegation depth;
- trace/evidence requirements;
- disclosure constraints.

Unknown or untyped authority fields should not be assumed safe to widen.

## 16. Canonical rule

The compact rule for humans and agents is:

> **Local configuration may narrow power and strengthen duties; it never creates power that the parent authority did not grant.**

Or formally:

```text
Authority(child) ⊆ Authority(parent)
Obligations(child) ⊇ Obligations(parent)
```

with budgets, time, risk, evidence and disclosure resolved by their typed monotone operators.
