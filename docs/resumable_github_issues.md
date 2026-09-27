---
title: "Resumable GitHub Issues — Cognitive Packets by Reference"
subtitle: "Cold-handler resumability, Janus Past→Future refactoring, and minimum sufficient handoff"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-27"
last_modified_at: "2026-09-27"
version: "0.1"
status: "working-note — operational pattern"
license: "CC BY-SA 4.0"
language: "en"
document_role: "operational"
document_kind: "agent-pattern"
document_function: "resumable-handoff"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/resumable_github_issues.md"
provenance:
  origin_type: "conversation"
  origin_date: "2026-09-27"
  derived_from:
    - "../research/cognitive_packets.md"
    - "continuations_and_cognitive_packets_for_agents.md"
    - "../research/ideas_to_explore_as_issues.md"
    - "../research/janus_cognitive_gatekeeper.md"
tags:
  - cognitive-packets
  - continuations
  - github-issues
  - resumability
  - handoff
  - janus
---

# Resumable GitHub Issues — Cognitive Packets by Reference

## 1. Purpose

A **Resumable GitHub Issue** is a GitHub Issue deliberately structured as a
**Cognitive Packet transmitted by reference**.

Its purpose is not merely to remember work. It is to make work **resumable by
another compatible handler** without dependence on the conversation, model,
provider, IDE, or agent session that created it.

Canonical invocation:

```text
Resume issue <N> of repository <OWNER/REPOSITORY>.
```

The Issue identifier locates the packet. The repository and durable references
carried by the Issue provide the context needed to resume it.

## 2. Resume-command sufficiency test

A Resumable GitHub Issue is sufficient when:

> A different compatible handler can reconstruct and continue the work from the
> Issue identifier, current repository state, and durable references contained
> in the Issue, without access to vendor conversation history.

Operationally:

```text
cold handler
+ "Resume issue N of repository R"
+ repository access
--------------------------------
→ understands the objective
→ knows the current state
→ retrieves required context
→ knows constraints and authority
→ identifies the next useful action
→ can execute or correctly stop/escalate
```

Failure of an essential step means the packet is not sufficiently closed.

### 2.1 Accessible Inputs / feasibility gate

Logical completeness is not enough. Before a Resumable Issue is handed off, the
producer MUST test the material feasibility of the first actionable step from
the **target handler's** point of view.

For every dependency required by that first step, ask:

```text
Does it exist?
Is its exact location known?
Can the intended handler retrieve it through an available channel?
Has that retrieval path been verified?
If mutable, is the required version identifiable?
```

Any **NO** on an essential dependency means:

```text
do not hand off as resumable
→ repair accessibility
   OR copy the minimum sufficient context
   OR provide a verified alternate path
   OR return BLOCKED with the exact dependency
```

This is the **Accessible Inputs Gate**.

> **Ad impossibilia nemo tenetur** — no handler is accountable for work whose
> required inputs were not made accessible to it. The producer of the handoff
> owns the burden of making the first actionable step feasible.

A by-reference Issue that points to an artifact visible only in a prior chat,
local machine, private memory store, inaccessible connector, or unpublished
working directory fails this gate even if the artifact genuinely exists.

#### Canonical failure example

```text
BAD
Issue: "Continue from the CSV already produced."
Reality: CSV exists only in the producer's ChatGPT Library.
Target: coding agent has repository access, not ChatGPT Library access.
Result: false resumability.

GOOD
CSV committed at a stable repository path.
Issue names that path and, when useful, an immutable commit checkpoint.
Target handler verifies retrieval.
Result: executable handoff.
```

## 3. Relationship to other Issue types

A Resumable Issue is not synonymous with every GitHub Issue.

```text
Idea to Explore
  = preserve a fertile possible

Opening Register
  = preserve several related openings

Ordinary Issue
  = track a problem or requested change

Resumable GitHub Issue
  = durable handoff to another handler
```

An Idea to Explore may later become resumable when its next work becomes
concrete. A Resumable Issue may still contain hypotheses and open questions,
but it MUST make clear what the next handler can actually do.

This complements
[`research/ideas_to_explore_as_issues.md`](../research/ideas_to_explore_as_issues.md):
that pattern asks whether an opening deserves durable memory; this pattern asks
whether another handler can actually continue the work.

## 4. Corpus status

When the repository belongs to the Corpus and the Issue carries materially
relevant work, the Issue itself belongs to the Corpus.

However:

```text
belongs to Corpus
≠
canonical source authority
```

A Resumable Issue normally functions as memory in tension, work locus, or
Cognitive Packet. Results that become durable doctrine should eventually be
consolidated into appropriate source documents.

## 5. Canonical envelope

A resumable Issue SHOULD make its packet nature explicit, for example:

```markdown
# COGNITIVE PACKET — CONTINUATION — BY REFERENCE

## Envelope

packet_kind: continuation
transmission_mode: reference
status: active
self_describing: true

### Protocol Header

This GitHub Issue is a resumable Cognitive Packet.

Resumption prompt:

> Resume issue <this issue number> of repository <OWNER/REPOSITORY>.

A cold compatible handler MUST be able to continue the work from this Issue,
the current repository state, and its durable references without access to the
conversation that created it.
```

Exact formatting is conventional rather than ontologically significant. The
semantics are what matter.

## 6. Minimum required contents

A Resumable GitHub Issue MUST make the following recoverable.

### Goal

What is the work?

### Current state

What is already known, implemented, tested, rejected, or decided? Do not force
the next handler to repeat investigation whose result is already durable.

### Context References

What must the handler read? Prefer stable paths, related Issues, Artifacts, and
immutable commit references when exact historical content matters.

### Constraints / Non-goals

What must not be violated? Preserve privacy, disclosure, architectural,
semantic, safety, and scope boundaries.

### Routing

What kind of compatible handler or capability is appropriate? Do not encode a
preferred vendor unless the task genuinely depends on one.

### Agent-resumable Next Action

What should a competent cold handler do first? The next handler should not have
to redesign the task before beginning it.

### Acceptance / Return

What constitutes useful completion, and what should the handler leave behind
for the Principal or the next handler?

## 7. Minimal template

For ordinary bounded work, prefer the smallest sufficient form:

```markdown
# COGNITIVE PACKET — CONTINUATION — BY REFERENCE

## Resume

> Resume issue <N> of repository <OWNER/REPO>.

Cold-handler rule: current repository state + this Issue + referenced durable
material must be sufficient; do not depend on prior chat history.

## Goal

<what must be achieved>

## Current state

<what already exists / has been decided / has been tested>

## Context References

- `<important file>`
- #<related issue>

## Constraints

- <important invariant>
- <non-goal>
- <effect ceiling if relevant>

## Agent-resumable Next Action

1. Inspect ...
2. Test ...
3. Implement ...
4. Verify ...
5. Report ...

## Acceptance / Return

Success means:

- [ ] ...
- [ ] ...

Return:
- result: completed | partial | blocked
- commits / artifacts:
- tests:
- objections / surprises:
- remaining continuation:
```

## 8. Extended form

Use additional sections only when the work requires them:

```text
Provenance
Assumptions
Decisions already taken
Architecture hypothesis
Authority / mandate
Exposure and effect ceiling
Test matrix
Stop conditions
Cross-repository dependencies
Immutable handoff references
Recovery path
Resumption risks
```

Complexity should follow the work, not precede it.

## 9. Closure rule

The packet must have enough closure for its intended handler class.

```text
Issue closure
=
objective understandable
+ required references retrievable
+ previous decisions explicit
+ constraints reconstructible
+ authority/effect ceiling known when material
+ next action actionable
+ completion observable
```

It need not contain every fact. For by-reference packets, closure means every
required omitted fact has a stable retrievable reference. A dangling reference
is a packaging failure.

## 10. Current-state rule

Repository state may move after the handoff.

Handlers therefore MUST:

```text
read Issue
→ inspect current repository state
→ compare with stated baseline when material
→ reconcile drift
→ continue from current valid state
```

An old commit SHA records provenance. It does not authorize resetting current
work to that SHA.

## 11. Next-action rule

Good:

```text
1. Inspect implementation X and tests Y.
2. Add failing tests for cases A-C.
3. Implement the smallest sufficient change.
4. Run commands Z.
5. Report residue in this Issue.
```

Weak:

```text
Continue investigating this.
Implement the architecture.
Finish the work.
```

A next action may contain judgment boundaries, but they must be explicit.

## 12. Authority and side effects

A Resumable Issue carries work state; it does not automatically create unlimited
execution authority.

When effectful actions are permitted, state the ceiling explicitly.

```text
MAY:
- edit files;
- run tests;
- create commits on a dedicated branch;
- push that branch.

MUST NOT:
- merge main;
- deploy;
- modify secrets;
- send communications;
- spend money.
```

If the Issue does not establish authority for an external side effect, the
normal External Side-Effect Gate remains applicable.

## 13. Stop conditions

For substantial work, state when the handler should stop and report rather than
guess. Typical cases include inaccessible references, material contradiction
with current main, scope/mandate widening, ambiguous unrelated failures, or a
required effect above the declared ceiling.

Stopping correctly is a valid continuation outcome.

## 14. Return packet

A handler SHOULD leave the Issue itself resumable after work.

Recommended return comment:

```text
handler:
state inspected:
changes:
commits / artifacts:
tests:
result: completed | partial | blocked
objections / surprises:
remaining continuation:
next resumable action:
```

The return comment becomes part of the packet's evolving durable state.

## 15. Cold-handler test

Before considering an Issue resumable, mentally give it to an agent that:

- has repository access;
- has read `AGENTS.shared.md`;
- knows nothing about the originating chat.

Ask:

1. Does it know what success means?
2. Does it know what has already been done?
3. Can it retrieve every indispensable input?
4. Does it know what not to do?
5. Does it know what it is authorized to do?
6. Does it know its first concrete action?
7. Can it determine whether its work succeeded?
8. Can it leave another resumable state?

If not, strengthen only the missing part.

## 16. Anti-bloat rule

Resumability does not require exhaustive documentation.

Do not copy into an Issue:

- whole source documents that can be referenced;
- generic repository instructions already present in `AGENTS.shared.md`;
- implementation details the next handler can cheaply inspect;
- speculative architecture irrelevant to the first executable slice;
- repeated context already durably linked.

Canonical rule:

> **Carry decisions, constraints, and routing; reference retrievable bulk
> context.**

## 17. Creation heuristic

Create a Resumable Issue when one or more apply:

```text
work will cross conversations
another handler may continue it
the current agent may lose context
implementation should happen later
several providers may work successively
the work already has enough state to execute
the continuation should survive process/session loss
```

Occam still applies:

```text
conversation sufficient
→ keep conversation

existing Issue sufficient
→ comment there

new autonomous resumable work
→ create Resumable Issue
```

## 18. Janus relation — from historical traces to prospective resumability

Refactoring an existing GitHub Issue into a Resumable GitHub Issue is naturally
a **Janus Past→Future operation**.

The operation starts from artifacts that already exist in Reality:

```text
old Issue
+ comments
+ commits
+ linked files
+ repository state
+ other surviving traces
```

and attempts to reconstruct the smallest sufficient cognitive state from which
work can now continue.

The objective is not to rewrite history so that the Issue appears
retrospectively perfect.

> **Recover what surviving traces justify, preserve what remains unknown, then
> construct an explicit prospective continuation from that qualified present
> state.**

### 18.1 Janus.Past — reconstruct without inventing

The retrospective phase asks:

```text
What was the apparent objective?
What work had already been performed?
What decisions were explicitly recorded?
What constraints were actually stated or durably implied?
Which traces support those conclusions?
Which original intentions or rationales can no longer be established?
```

Governing rule:

> **Retrospective reconstruction MUST NOT manufacture certainty merely to make
> the resulting packet easier to resume.**

In particular:

```text
historical trace
≠
historical truth

observed action
≠
known rationale

current understanding
≠
original intention
```

Unknown historical intent remains unknown. A later handler may formulate a new
present-day judgment, but that judgment MUST NOT be silently attributed to the
original author or decision point.

Where material, the retrospective side should follow ordinary COP epistemic
machinery:

```text
Trace
→ Assertion
→ EvidenceRelation
→ qualified reconstruction
```

rather than:

```text
Trace
→ unqualified reconstructed truth
```

### 18.2 The present as Janus hinge

```text
                 JANUS

        retrospective side
                │
                ▼
       surviving historical traces
                │
                ▼
       qualified reconstruction
                │
                ▼
──────────────── NOW ────────────────
                │
                ▼
       resumable cognitive state
                │
                ▼
       explicit next continuation
                │
                ▼
        future work / Reality
```

Everything above `NOW` is constrained by evidence about what already
happened. Everything below `NOW` is a new prospective commitment.

The refactor may legitimately establish a new current next action even when
there is no evidence that it was the original author's intended next action. It
must then be represented as a new present-day judgment, not reconstructed
historical fact.

### 18.3 Janus.Future — construct the resumable packet

Once retrospective reconstruction reaches the present, the operation changes
character.

The prospective side constructs what a future cold handler needs:

```text
current objective
current state
durable references
known constraints
authority / effect ceiling
open uncertainties
agent-resumable next action
acceptance criteria
return contract
stop conditions when material
```

This is Janus.Future: make explicit now what future handlers and future Reality
will later have to answer.

### 18.4 Refactoring is not historical normalization

Operationally, we may wish to make an Issue usable *as if* it had been
resumable from the beginning. Historically:

```text
current issue usability
≈ issue originally written as resumable

historical claim
≠ issue actually was resumable at creation time
```

The transformation SHOULD preserve refactoring provenance, for example through
metadata or a durable Issue comment containing the refactor timestamp, original
body hash, and method/version.

Invariant:

> **Improve present resumability without laundering the historical record.**

### 18.5 Determinism until judgment

A resumability refactor SHOULD recover everything mechanically establishable
before requesting semantic judgment.

```text
historical Issue
→ deterministic extraction
→ epistemic audit
→ sufficient material retained
→ conflicts exposed
→ nonessential unknowns preserved
→ judgment boundary
→ Continuation
→ attributable StepResult
→ prospective resumable packet
```

This follows the broader Cogentia rule:

> **Determinism until judgment; Continuation at the judgment boundary.**

A refactoring tool SHOULD NOT hide a model call merely to fill missing
sections.

### 18.6 Candidate `cogentia.js` surface

A future implementation may expose:

```text
cogentia issues resumable-audit OWNER/REPO#N
cogentia issues resumable-plan OWNER/REPO#N
cogentia issues resumable-apply OWNER/REPO#N --from plan.json
cogentia issues resumable-verify OWNER/REPO#N
```

Conceptual phases:

```text
AUDIT
  What can be reconstructed?
  What remains missing, contradictory, or ambiguous?

PLAN
  What exact present-day Resumable Issue would result?
  Which elements required judgment?

APPLY
  Perform only the exposed and authorized Issue mutation.

VERIFY
  Fetch the delivered Issue and test cold-handler sufficiency.
```

A compact `issues refactor-resumable` wrapper may orchestrate these phases
while preserving the underlying separation.

When information cannot be recovered deterministically, the tool SHOULD emit an
ordinary Continuation. The resulting StepResult is a **new attributable judgment
at refactoring time**, never a retroactive historical decision.

### 18.7 Minimal audit shape

```yaml
schema: cogentia.resumable-issue-audit/v1

issue: JeanHuguesRobert/example#42

goal:
  status: supported

current_state:
  status: reconstructible

constraints:
  status: partial

original_rationale:
  status: unknown

next_action:
  status: judgment-required
  continuation_ref: ctn_...

return_contract:
  status: missing

cold_handler_closure:
  status: fail
```

After required judgment and repair, `cold_handler_closure` may become
`pass`.

### 18.8 Janus invariant for refactoring

```text
Janus.Past
  recover what Reality left behind
  without pretending to know more than the traces support

        ↓

Present qualification
  expose uncertainty and obtain judgment where necessary

        ↓

Janus.Future
  construct the smallest sufficient continuation
  that future handlers and future Reality can answer
```

Concise formulation:

> **Janus.Past reconstructs the justified state. Resumability refactoring turns
> that qualified state into an explicit Janus.Future.**

This lets the Corpus improve its own past work without falsifying its history.

## 19. Interaction with `AGENTS.shared.md`

An agent that has read `AGENTS.shared.md` should interpret:

```text
Packetize this as a resumable GitHub Issue.
```

or:

```text
Make this a resumable Issue.
```

as a request to:

1. apply Cognitive Packet / Continuation doctrine;
2. use by-reference transmission when repository context is stable;
3. satisfy the Resume-command sufficiency test;
4. preserve mandate and external-effect boundaries;
5. verify referenced handoff material;
6. provide an actionable next step and return contract;
7. avoid unnecessary duplication and ontology.

## 20. Short operational definition

> **A Resumable GitHub Issue is a Cognitive Packet by reference whose
> identifier, repository state, and durable references are sufficient for a
> compatible cold handler to continue the work without vendor conversation
> history.**

Shortest Reality test:

```text
Resume issue N of repository R.
```

If that command alone is enough to start the right work, the Issue is doing its
job.
