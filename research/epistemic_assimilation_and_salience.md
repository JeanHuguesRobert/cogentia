---
title: "Epistemic Assimilation and Salience"
subtitle: "Why extensive knowledge can still hide novelty, and why unexplained residue must survive"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A. / Cogentia"
date: "2026-08-10"
version: "0.1"
status: "working-note — source"
language: "en"
license: "CC BY-SA 4.0"
document_role: "source"
document_kind: "research-note"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
repository: "JeanHuguesRobert/cogentia"
canonical_path: "research/epistemic_assimilation_and_salience.md"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/epistemic_assimilation_and_salience.md"
provenance:
  origin_type: "conversation"
  origin_repository: "JeanHuguesRobert/cogentia"
  origin_ref: "conversation checkpoint R65"
  origin_date: "2026-08-10"
  derived_from:
    - "instructions/AGENTS.shared.md"
    - "skills/open-possible/SKILL.md"
    - "research/informational_gravity.md"
review:
  status: "unreviewed"
  reviewed_by: []
related_documents:
  - "instructions/AGENTS.shared.md"
  - "skills/open-possible/SKILL.md"
  - "research/informational_gravity.md"
  - "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/booster_principle.md"
tags:
  - epistemology
  - salience
  - assimilation
  - novelty
  - open-possible
  - presentism
  - cognitive-agents
  - residue
---

# Epistemic Assimilation and Salience

## Purpose

This note stabilizes a failure mode observed during an exploratory human–AI conversation: an agent may possess extensive relevant knowledge and still fail to mobilize the right concept because the wrong parts of that knowledge become salient.

The practical importance is larger than the anecdote. A system can be knowledgeable and coherent while remaining systematically attracted toward familiar categories. When the target concept is later revealed, the same system may immediately produce a convincing reconstruction. That asymmetry exposes a distinction that matters for Cogentia:

> **Knowledge represented is not knowledge currently salient.**

and:

> **Coherence after revelation is not discovery before revelation.**

## 1. Failure case

During an exploratory exchange about Possibilism, play, desire, curiosity and the lived relation to The Possible, the target concept was **joy**. The agent repeatedly proposed nearby concepts that were well represented in its existing conceptual repertoire and then, when joy was finally supplied, immediately reconstructed why it fit.

The significant pattern was not simple ignorance. It was:

```text
large relevant knowledge
+ wrong salience
+ attraction toward familiar ontologies
-> repeated plausible but wrong answers

revelation of target
-> immediate high-coherence reconstruction
```

The failure therefore cannot be reduced to missing information. The information required for the post-hoc reconstruction was largely already available.

## 2. Epistemic assimilation

A frequent cognitive shortcut is to understand a new phenomenon by mapping it onto an existing category. This is often productive. The failure occurs when the mapping becomes a silent replacement of the phenomenon.

```text
new phenomenon
-> nearest familiar category
-> fluent explanation
-> mismatch treated as noise
-> premature closure
```

The core error is:

> **The object has been replaced by its translation into the observer's current language.**

The corrective attitude is not to reject analogy. It is to preserve what the analogy fails to capture.

## 3. Projection and residue

Let a current conceptual basis be represented by `B`, and let a new observation or idea be `x`. The current frame captures a projection `P_B(x)` and leaves a residual component `r`:

\[
x = P_B(x) + r
\]

The epistemic assimilation error is to behave as if:

\[
x \approx P_B(x)
\]

and discard `r` merely because it is awkward, small, unfamiliar, or not yet named.

The Open-Possible discipline instead treats persistent residue as potentially informative:

```text
projection fits well enough for current action
+ residual mismatch remains
-> preserve the residue
-> test whether it recurs
-> if it persists, consider expanding or changing the basis
```

The point is not that every residue contains a breakthrough. Most will not. The constitutional requirement is weaker and more defensible:

> **A significant mismatch should not disappear merely because the current ontology has no convenient place for it.**

## 4. Salience as part of operational cognition

A Cogentia cannot be characterized only by what propositions, memories, concepts, traces, or models are stored somewhere in its accessible state.

Operational cognition also depends on what becomes active at the right moment.

```text
represented knowledge != currently salient knowledge
accessible memory      != mobilized memory
semantic proximity     != task relevance
retrieval success      != epistemic adequacy
```

This suggests that a Cogentigram or other cognitive representation may eventually need to model not only content but **activation and salience dynamics**: what tends to come forward, what remains dormant, what dominates by familiarity, and what cues alter those patterns.

This is a research direction, not yet a schema requirement.

## 5. The gravity of the known

The observed tendency may be described informally as **epistemic gravity of the known**:

```text
novel observation
-> semantic neighbours
-> well-represented concepts
-> attraction toward existing categories
-> reformulation in their vocabulary
```

This term MUST NOT be confused with Cogentia's existing **Informational Gravity** source, which defines a routing relation between a cognitive packet and mobilizable capacities able to advance it. The two ideas may later be compared, but they currently name different mechanisms.

For this note, **epistemic assimilation** is the primary term; **gravity of the known** is explanatory language.

## 6. Anti-presentism

The same mechanism produces a form of cognitive presentism. An agent may not explicitly believe that the future will resemble the present, yet still use present categories as the coordinate system in which every future must be represented.

The failure is deeper than extrapolating current values:

```text
current variables
current actors
current categories
current dimensions
-> silently treated as the ontology of future states
```

The Open-Possible constitutional counter-rule is therefore:

> **The present has no privilege over The Possible.**

This is already projected operationally in `instructions/AGENTS.shared.md` and `skills/open-possible/SKILL.md`.

## 7. Booster interpretation

Anti-presentism is a useful example of the Booster Principle because it may require almost no additional compute, information, tooling, or infrastructure.

A very small change of attitude can alter how existing capacities are mobilized:

```text
same model
same corpus
same compute
same tools
+ small epistemic attitude shift
-> materially different exploratory trajectories
```

The mechanism should therefore be tested as a candidate cognitive Booster rather than merely praised as a virtue.

## 8. Operational rules for agents

The immediate rules are already encoded in the Open-Possible Skill, but this source gives their epistemic rationale:

1. do not confuse `unknown`, `unsupported`, `unrepresented`, `unfamiliar`, or `unavailable_now` with `impossible`;
2. expose at least one material present-state invariant in genuine exploratory work;
3. preserve significant mismatches before assimilation;
4. distinguish post-hoc explanatory coherence from prior discovery performance;
5. prefer a small traced experiment when a cheap reversible Booster may reveal whether the frame is wrong.

## 9. Open research questions

- How should salience be represented without pretending to read hidden cognition directly?
- Can repeated `unassimilated_residue` traces reveal missing conceptual dimensions?
- How often does the Open-Possible discipline increase useful novelty versus noise?
- Can agents be evaluated on their ability to distinguish `unrepresented` from `impossible`?
- Can a provider-neutral benchmark compare ordinary exploration with exploration under explicit anti-presentist instructions?
- When should persistent residue trigger ontology expansion rather than continued anomaly status?

## 10. Canonical formulas

> **Knowledge represented is not knowledge currently salient.**

> **Coherence after revelation is not discovery before revelation.**

> **The difference that resists assimilation may be valuable information.**

> **Understanding does not always begin by reducing the new to the known; sometimes it begins by preserving what refuses that reduction.**

> **The present has no privilege over The Possible.**
