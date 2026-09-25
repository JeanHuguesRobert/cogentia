---
title: "Reality Probe Selection"
subtitle: "Choose what is worth learning next"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-09-03"
last_modified_at: "2026-09-25"
version: "0.4"
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
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
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

### Human-source probe before durable UNKNOWN

The anti-pattern `ask-human-first` does **not** mean `never ask the human`.

Before stabilizing a materially relevant `UNKNOWN`, test whether an
identifiable human is plausibly the direct, low-cost, high-discrimination
source.

Use this routing:

```text
material UNKNOWN
    ↓
already answered by admissible cheap evidence?
    ├── yes → retrieve / inspect it
    └── no
         ↓
identifiable human likely to be:
actor / author / witness / decision-maker / trace custodian?
    ├── no → choose another probe or preserve UNKNOWN
    └── yes
         ↓
can one short question materially:
resolve the UNKNOWN,
narrow live possibles,
reclassify epistemic status,
point to a decisive trace,
or change the next action?
    ├── no → do not spend Human Attention
    └── yes → ask the smallest sufficient question
```

A human answer must then be qualified rather than automatically promoted to
`FACT`.

Typical mappings:

```text
human editorial choice   → DECISION
own intention / own act  → VOICE or ASSERTION
direct recollection      → TESTIMONY
pointer to a document    → retrieve and inspect TRACE
indirect belief          → ASSERTION or INFERENCE
another person's hidden inner state
                         → UNKNOWN may remain
```

Invariant:

> **Do not spend Human Attention merely because the agent is uncertain; but do
> not stabilize a material UNKNOWN when an identifiable human is plausibly the
> direct, low-cost, high-discrimination source. Ask the smallest sufficient
> question, qualify the answer, then continue or stop.**

This is especially important when the UNKNOWN concerns the available human's
own act, decision, declared intention, direct observation, or custody of the
relevant trace. In such cases, a short human probe should normally precede a
materially more expensive documentary search.

The rule does not authorize one person to supply another person's unobserved
psychology or subjective meaning. A witness may provide their observation,
memory, or report; epistemic status remains attached to that source.

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


## 9. Probe blinding, aperture and dual yield

A high-value Reality Probe should not only discriminate among known Possibles. It should also avoid needlessly shaping the observation and, when appropriate, leave room for high-value unanticipated evidence.

### 9.1 Probe blinding

For human-source probes, the investigator may know more internally than should be exposed externally.

Potential leakage includes:

```text
answer leakage
event leakage
category leakage
causal leakage
salience leakage
```

The governing rule is:

> **Hide the discriminant when revealing it could alter the response; do not falsify Reality.**

Useful techniques include free recall before targeted questioning, balanced truthful context, symmetric question framing and controlled question order. Fabricated facts or false memories are not admissible blinding devices.

The purpose is epistemic independence, not persuasion.

### 9.2 Serendipity aperture

A probe can be too optimized.

If every admissible answer is constrained to the investigator's current ontology, the probe may reduce uncertainty while still preventing discovery that the ontology itself is incomplete.

Call **serendipity aperture** the degree of freedom left for Reality to return useful evidence that was neither explicitly queried nor anticipated.

```text
low aperture
    closed yes/no verification

medium aperture
    bounded topic, open response

high aperture
    free recall / free description
```

No aperture level is universally best. Selection depends on decision value, cost, contamination risk, Human Attention, reliability and the value of possible unknown unknowns.

### 9.3 Wide-to-narrow probing

When source contamination matters, prefer a staged sequence when proportionate:

```text
P0 free recall
→ P1 broad balanced themes
→ P2 targeted discriminants
→ P3 explicit recognition
```

Preserve elicitation provenance. A spontaneous P0 observation is not equivalent to a P3 recognition after suggestion.

### 9.4 Dual yield

A Reality Probe may produce two distinct epistemic outputs:

```text
targeted_yield
    evidence bearing on the uncertainty that motivated the probe

serendipity_yield
    useful evidence that was not being sought
```

The second class should not be discarded as conversational noise. It may reveal a new discriminant, a new source, a wrong framing, a previously invisible branch or an entirely new Continuation.

A serendipitous observation is still only an observation. It must be qualified before it changes canonical knowledge.

Compact rule:

> **Choose probes for discrimination, design them against epistemic leakage, and preserve enough aperture for Reality to surprise the model.**

---

## 10. Mapping before selection

Selection presupposes a sufficiently complete frontier.

When the inquiry does not yet know which sources, holders, systems, deadlines or empowered observers exist, first build or refresh a **Probe Map**.

See [Cartographier les Reality Probes](reality_probe_mapping.md).

The map adds several values that ordinary information-gain selection can miss:

```text
preservation value
    prevent an learnable fact from expiring

generative yield
    reveal new sources, holders, systems or probes

option value
    preserve future epistemic actions

phase-change value
    recognize that an event or deadline creates a new observation surface
```

Compact routing:

```text
frontier well known
→ select among probes

frontier materially incomplete
→ map probes / sources / outputs first
→ then select
```

This is not an excuse for exhaustive planning. The Probe Map is itself incremental and should be revised after every material Reality response.

---

## 11. Anti-patterns


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

probe overfitting
    constrain the probe so tightly to the current ontology that unanticipated evidence cannot surface

epistemic leakage
    reveal internal events, categories, causal hypotheses or salience cues that can shape the source before observation
```

---

## 12. Compact doctrine

> **Maintain the live Possible Space. Preserve the exploration Continuation. When further evidence is useful, choose a bounded Reality Probe whose expected decision-relevant discrimination justifies its costs, risk and attention demand. Shield the probe from unnecessary epistemic leakage, preserve appropriate aperture for unanticipated evidence, let Reality answer, update the Possible Space, and continue or stop accordingly.**

In its smallest form, this is binary search.

In its general form, it is a missing bridge between Rational Exploration of the Possible, Reality Tests, Continuations, Measured Risk, Human Attention Budget and Level-2 scheduling.
