---
title: "Reality Probe Selection"
subtitle: "Choose what is worth learning next"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-09-03"
version: "0.1"
status: "working-paper"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "research-note"
document_function: "operational-doctrine"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
review:
  status: "unreviewed"
  reviewed_by: []
tags:
  - reality-probe
  - discriminant
  - exploration
  - continuation
  - human-attention
  - information-value
  - reality-test
  - level-2
---

# Reality Probe Selection

## 1. Principle

Rational exploration is not only inference from what is already known. It also requires choosing **what is worth learning next**.

A **Reality Probe** is any bounded action whose result may change the current representation of The Possible.

Examples include:

```text
ask a human
search the Corpus
read a message or document
query the Web
execute a program
inspect a sensor
run an experiment
ask an independent agent
wait for an event
```

The governing principle is:

> **Choose the most valuable affordable Reality Probe, under the applicable Mandate, budgets, risk envelope and attention constraints.**

A probe is valuable when its possible outcomes can produce useful **discriminants** between currently live possibles, change a decision, open or close valuable possibilities, detect an error, or justify terminating an exploration.

This generalizes the narrower heuristic:

> Ask the most discriminating affordable question.

Questions to humans are only one class of Reality Probe.

---

## 2. Minimal example: Find a Number

Suppose Reality secretly selects one integer from `0..100` and the agent may ask only:

```text
Is the number lower than x?
```

There are initially 101 live possibles. If all numbers are equiprobable, answers are reliable and every question has the same cost, the best admissible probe divides the remaining possible-space as evenly as possible.

This is ordinary binary search. The worst-case lower bound is:

```text
ceil(log2(101)) = 7
```

The interesting architectural property is not binary search itself. It is the loop:

```text
live Possible Space
        ↓
candidate discriminants
        ↓
select probe
        ↓
Reality responds
        ↓
update Possible Space
        ↓
resume the same exploration Continuation
        ↺
```

The state after each response is part of the Continuation. Losing it, widening the possible-space again, abandoning while admissible discriminants remain, or continuing after one possible remains are all exploration failures.

---

## 3. A discriminant is not necessarily a question

A **Discriminant** is evidence or an observation that separates relevant competing possibles.

A **Reality Probe** is an action intended to obtain such evidence.

Keep the distinction:

```text
probe
    action toward Reality

observation
    Reality's response

discriminant
    decision-relevant distinction enabled by that response
```

A probe may fail to discriminate. A useful discriminant may also arrive unsolicited through an event or interruption.

Therefore Cogentia should not reduce exploration to dialogue or question asking.

---

## 4. Human Attention is a special cost

Agent uncertainty does not by itself justify interrupting a human.

Before consuming Human Attention, an agent should ask internally:

```text
Can this already be inferred?
Can the Corpus answer it?
Can another cheap probe answer it?
Is the answer actually needed now?
Would waiting preserve the option at lower cost?
What single human question would discriminate most usefully?
```

Invariant:

> **Do not spend Human Attention merely because the agent is uncertain; spend it when the expected decision-relevant value of the human probe justifies the interruption.**

This makes Human Attention Budget part of epistemic scheduling, not merely interface design.

---

## 5. Information gain is a baseline, not the objective

In the number game, maximizing expected information gain is optimal because the domain is unusually clean:

```text
uniform prior
binary noiseless answers
equal probe cost
immediate response
no externalities
perfectly specified objective
```

Real exploration is different.

A probe with large entropy reduction may still be poor if it:

```text
consumes scarce Human Attention
is expensive or slow
creates material risk
has unreliable evidence
closes valuable options
violates Mandate or rights
answers an irrelevant question
```

Conversely, a small piece of information can be extremely valuable if it changes an imminent decision.

Therefore the target is not generic information maximization but **decision-relevant epistemic value under constraints**.

Do not prematurely collapse this into a universal scalar score.

---

## 6. Relationship to Measured Risk

[`Measured Risk`](measured_risk.md) states that a useful Reality Test should be bounded yet sufficiently discriminating, and that Human Attention belongs inside the risk architecture.

Reality Probe Selection supplies the complementary question:

```text
Measured Risk
    What Exposure, recovery structure, Mandate and budgets govern a possible Act?

Reality Probe Selection
    Given those constraints, what interaction with Reality is worth performing next?
```

A probe is itself an Act and therefore remains subject to Measured Risk.

The smallest probe is not automatically the best probe. The preferred probe is the least costly/bounded probe that has sufficient expected discriminating or decision value.

---

## 7. Relationship to Continuations and Level-2 exploration

A live exploration Continuation can expose a frontier of candidate Reality Probes:

```text
Continuation
    ├── inspect existing evidence
    ├── ask Principal
    ├── query external source
    ├── execute experiment
    ├── delegate independent exploration
    └── wait for wake condition
```

This suggests two related scheduling questions:

```text
Which Continuation deserves resources next?

Within that Continuation, which Reality Probe is worth executing next?
```

The first is a Level-2 frontier-allocation problem. The second is an epistemic action-selection problem. They may share budgets and discriminants but should not be confused.

A Continuation must preserve enough state that, after Reality answers, exploration can resume without reconstructing or forgetting the trajectory.

---

## 8. Probe record

A lightweight record may eventually include:

```yaml
reality_probe:
  objective: ...
  live_possibles: ...
  action: ...
  expected_discriminants: ...
  expected_decision_value: ...
  source_or_target: ...
  cost:
    compute: ...
    money: ...
    time: ...
    human_attention: ...
  risk_exposure: ...
  reliability: ...
  latency: ...
  reversibility_or_recovery: ...
  mandate: ...
  result: ...
  possibles_opened: ...
  possibles_closed: ...
  continuation_wake: ...
```

This is illustrative, not a stabilized schema.

---

## 9. Anti-patterns

Avoid:

```text
ask-human-first
    externalize agent uncertainty onto scarce human attention

information-for-information's-sake
    maximize entropy reduction without decision relevance

state amnesia
    obtain Reality responses but fail to preserve their consequences

premature surrender
    claim insufficient information while useful admissible probes remain

probe inertia
    continue collecting evidence after the decision is already determined

single-score illusion
    hide rights, risk, reliability and heterogeneous costs inside one invented utility number

question tunnel vision
    assume every uncertainty should be resolved through dialogue rather than another Reality interaction
```

---

## 10. Compact doctrine

> **Maintain the live Possible Space. Preserve the exploration Continuation. When further evidence is useful, choose a bounded Reality Probe whose expected decision-relevant discrimination justifies its costs, risk and attention demand. Let Reality answer, update the Possible Space, and continue or stop accordingly.**

In its smallest form, this is binary search.

In its general form, it is a missing bridge between Rational Exploration of the Possible, Reality Tests, Continuations, Measured Risk, Human Attention Budget and Level-2 scheduling.
