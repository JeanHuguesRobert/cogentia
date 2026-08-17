---
schema: cogentia.pattern/v1
id: pattern-mining
kind: pattern
status: experimental
document_role: operational
document_kind: pattern
visibility: public
language: en
origin: "Pattern Language dogfooding, 2026-08-17"
related_issue: "JeanHuguesRobert/cogentia#110"
---

# Pattern Mining

## Intent

Recognize when repeated experience should be compressed into a reusable Pattern or Anti-pattern instead of remaining scattered across conversations, documents, code reviews, incidents, or local practice.

Use **Pattern** in the Christopher Alexander / *A Pattern Language* sense: a generative response to a recurring configuration of context, problem and forces, not a fixed recipe.

## Context

A system repeatedly encounters similar problems, tensions, solutions, or failure modes across tasks, domains, agents, or time.

The knowledge may already be present implicitly, but it is expensive to rediscover and easy to lose.

## Forces

- Repeated rediscovery wastes scarce human attention and agent compute.
- Naming a recurring structure can make it easy to recognize and reuse.
- Premature abstraction can freeze an accidental local solution into doctrine.
- Similar Patterns can proliferate under different names and create semantic duplication.
- Prior-art search performed too early can assimilate a genuinely useful delta into the nearest known category before it is understood.
- Frequency is evidence of recurrence, not evidence that the recurring solution is correct.

## Trigger

Treat an observation as a `PatternCandidate` when one or more of these signals are material:

```text
Repetition
OR CrossDomainTransfer
OR HighCompressionGain
OR RecurringFailure
```

Recurring failures preferentially suggest an Anti-pattern candidate.

## Resolution

When a Pattern candidate appears:

1. **Name it provisionally.** A useful name should act as a compact cognitive address.
2. **State the recurring context/problem/forces.** Avoid defining it only by its preferred solution.
3. **State the generative resolution or failure structure.** A Pattern guides contextual generation; an Anti-pattern helps recognize a recurring trap.
4. **Dogfood it on another real case.** Prefer cross-domain transfer when inexpensive.
5. **Only then perform an overlap / prior-art check.** Ask whether the same structure already exists under another name and preserve any material delta before assimilation.
6. **Keep status experimental until evidence justifies promotion.** Repetition or centrality in the Corpus does not establish truth.
7. **Delete, merge, rename, narrow, or refine freely.** A Pattern that does not repay its maintenance and cognitive cost should not survive merely because it has been named.

Compact form:

```text
experience
→ recurring structure?
→ PatternCandidate
→ name
→ context + forces + resolution
→ dogfood elsewhere
→ overlap/prior-art check
→ refine | merge | reject | stabilize
```

## Cheap test

Ask:

```text
1. Can this structure be named compactly?
2. Are its context and forces recognizable independently of one instance?
3. Is the resolution generative rather than a rigid recipe?
4. Does the name materially help solve or diagnose another real case?
5. Is it already represented adequately by an existing Pattern, principle, Skill, proverb, or known prior art?
```

A negative answer is a valid result. Do not manufacture a Pattern.

## Consequences

Positive:

- converts repeated tacit knowledge into compact reusable cognitive resources;
- reduces rediscovery cost;
- supports human/machine shared reasoning vocabulary;
- creates candidates for later discovery by Skills, agents, Corpus Sleep, and navigation tooling;
- turns recurring failures into reusable diagnostic Anti-patterns.

Costs/risks:

- pattern proliferation;
- premature abstraction;
- symbolic stabilization before evidence;
- semantic duplication;
- cargo-cult application when context and forces are ignored.

## Relationship to Skills and Tools

Pattern Mining may produce a Pattern that later guides one or more Skills or Tools, but it does not itself create a Skill, Tool, Capability, or authority.

```text
Pattern availability ≠ authority
Pattern recognition ≠ mandate
Pattern frequency ≠ truth
```

## Human / machine symmetry

The mining process should be usable by humans and machines over the same underlying evidence and Pattern resources. Different projections or assistance are legitimate; a machine-only hidden Pattern store or a human-only informal vocabulary is an accidental asymmetry unless justified.

## Dogfood provenance

This Pattern is itself the result of Pattern Mining:

```text
metacognitive observation
→ repeated desire to preserve reusable lessons
→ recognition of a recurring structure
→ provisional Pattern Mining formulation
→ immediate dogfood as a first-class Pattern
```

Its creation is therefore an experiment, not evidence that the Pattern is effective.