---
schema: cogentia.agent_skill/v1
id: cogentia.open-possible
version: 1
status: experimental
name: open-possible
description: >
  Detect possibility-space closure and present-state assumptions, preserve
  significant mismatches, search for small reversible Boosters, and propose
  a minimal Reality test. Use for exploratory, prospective, strategic,
  research, design, or architectural work, and when a conclusion risks
  confusing unfamiliarity or absence from the current map with impossibility.
triggers:
  - explore possible futures or alternatives
  - strategic or architectural design under uncertainty
  - evaluate an apparently impossible option
  - detect presentism or possibility-space closure
  - search for a smaller high-leverage intervention
  - preserve an observation that fits current categories poorly
inputs:
  - object_of_exploration
  - current_context
  - optional_candidate_conclusions
outputs:
  - open_possible_record
  - optional_impossibility_findings
  - optional_booster_candidates
  - reality_test
effects: read_only
requires:
  capabilities: []
governance:
  minimum_mandate: read_public
  may_disclose: false
  may_resolve_without_mandate: false
  may_widen_authority: false
  trace_minimum: material
sources:
  - docs/agent-skills-contract.md
  - instructions/AGENTS.shared.md
  - research/optimistic_mainline_governance.md
  - research/agent_configuration_layer.md
---

# Skill: open-possible

## Purpose

Apply a small operational discipline against **possibility-space closure**: the tendency to treat the current map, current categories, or current institutions as if they defined the boundary of what can be possible.

This skill does not require novelty and does not reward speculation. Its function is narrower:

> **Do not let absence from the current map silently become impossibility.**

The associated source doctrine is [The Booster Principle](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/booster_principle.md).

Canonical compression:

```text
Open.
Try small.
Let Reality answer.
Keep the trace.
Correct.
```

## When to use

Use the full procedure for work that is materially:

```text
exploratory
prospective
strategic
architectural
research-oriented
design-oriented
high-uncertainty
```

Also use it when a line of reasoning reaches a strong closure such as:

```text
impossible
cannot
must
only viable option
no alternative
```

and the closure depends materially on assumptions about the present configuration.

Do not invoke the full procedure mechanically for routine deterministic work where the possibility space is irrelevant, such as formatting a known file or fixing a narrowly reproduced syntax error.

The baseline distinction remains applicable everywhere:

```text
unknown             != impossible
unsupported         != impossible
unrepresented       != impossible
unfamiliar          != impossible
unavailable_now     != impossible
```

## Procedure

Perform six operations. Keep them short unless the task justifies depth.

### 1. FRAME

State the current representation of the problem.

Question:

> What map or frame is currently organizing the work?

Do not restate the whole task. Name the representation that constrains which alternatives are visible.

### 2. CHALLENGE

Identify at least one **material present-state assumption** when the work is genuinely exploratory.

Question:

> What am I treating as invariant mainly because it is true now?

Possible targets include:

```text
actors
institutions
interfaces
technologies
cost structures
legal regimes
organizational boundaries
user habits
network topology
categories of analysis
```

The obligation is to expose the assumption, not to reject it.

### 3. PRESERVE

Record any significant observation, clue, or candidate idea that fits the current frame poorly.

Question:

> What am I tempted to normalize, rename, dismiss, or force into a familiar category?

If there is no meaningful residue, record `none`.

A residue is not automatically valuable. Preserving it only prevents premature deletion of information.

### 4. OPEN

Relax or vary one material assumption and state what becomes newly thinkable.

Question:

> If this assumption were contingent rather than necessary, what option or dimension appears?

Return `none_identified` when no useful opening follows. Do not invent novelty to satisfy the form.

### 5. BOOST

Before recommending substantial additional force, search for a smaller reversible intervention that might unlock disproportionately large latent capacity.

Question:

> Is substantial potential already present but poorly mobilized?

A Booster candidate may be a small change in:

```text
framing
protocol
connection
ordering
interface
incentive
configuration
salience
permission
resource placement
```

Prefer an experiment when the candidate Booster is cheap, bounded, and reversible.

Return `none_identified` when appropriate.

### 6. TEST

Propose the smallest meaningful action by which Reality can answer.

The test should, when possible, be:

```text
small
bounded
observable
traceable
reversible or cheaply recoverable
capable of discriminating between hypotheses
```

A Reality test is often the next small move, not a final validation ceremony.

## Standard record

Use this shape when a durable trace is useful:

```yaml
open_possible:
  frame: "..."
  challenged_invariant: "..."
  residue: "none | ..."
  opened_possible: "none_identified | ..."
  booster: "none_identified | ..."
  reality_test: "..."
```

For machine validation, JSON with the same keys is preferred by the initial checker.

Optional claim records may distinguish closure states:

```json
{
  "status": "impossible",
  "basis": "logical contradiction: ..."
}
```

A claim marked `impossible` without a stated basis is non-conformant when passed to the checker.

## Impossibility discipline

Do not use `impossible` as a rhetorical synonym for difficult, expensive, unsupported, unavailable, unlikely, unfamiliar, or not yet implemented.

Valid bases may include, depending on the task and evidence:

```text
logical contradiction
physical constraint
explicit protocol invariant
mathematical impossibility
current legal prohibition under a named regime
hard mandate or safety constraint
```

Even then, scope the conclusion correctly. For example:

```text
impossible_under_current_regime
```

may be accurate where an unqualified `impossible` is not.

## Relationship to Boosters and Optimistic Locking

The skill implements two compatible rules:

> **Before adding force, look for a Booster.**

and:

> **When a candidate Booster is cheap, bounded, and reversible, prefer a traced experiment over prolonged speculation.**

This is the epistemic analogue of Optimistic Mainline Governance: do not attempt to prevent every possible mistake before action; make small actions visible, inspectable, and correctable.

## Stop conditions

- No meaningful possibility-space question exists -> stop; do not manufacture one.
- Required evidence is unavailable -> preserve the uncertainty; do not convert it to impossibility.
- A proposed Reality test would require authority not present in the mandate -> prepare the test only; do not execute it.
- A Booster candidate is high-risk, irreversible, private, destructive, or institutionally committing -> route through the applicable governance rather than treating small conceptual size as low operational risk.

## Non-goals

- Not a creativity score.
- Not a requirement to produce a radical alternative.
- Not a claim that every problem has a Booster.
- Not a licence to ignore known constraints.
- Not a substitute for evidence, domain expertise, mandate, or safety rules.
- Not a new orchestration runtime or Cognitive Packet type.
