---
title: "FractaCognition — Prudence, Humility, Occam, Hanlon and Talleyrand"
subtitle: "A cardinal discipline of prudence and humility, with heuristics for simplicity, attribution, and explicit assumptions"
description: "Source note articulating Prudence and Humility as a cardinal FractaCognition discipline, with Occam, Hanlon, and Talleyrand as complementary heuristics."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-27"
last_modified_at: "2026-09-28"
version: "0.3"
status: "working-paper"
license: "CC BY-SA 4.0"
language: "en"
document_role: "source"
document_kind: "research-note"
document_function: "metacognitive-principles"
visibility: "public"
lifecycle_state: "working"
update_policy: "UP-DEFAULT-REVIEWED"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/fractacognition_principles.md"
tags:
  - fractacognition
  - metacognition
  - prudence
  - humility
  - occam
  - hanlon
  - talleyrand
  - heuristics
related_documents:
  - "research/learning_computer_genese_et_architecture.md"
  - "research/simplicite_action.md"
  - "research/non_resolutive_response_patterns.md"
  - "../instructions/AGENTS.shared.md"
  - "../docs/resumable_github_issues.md"
provenance:
  origin_type: "conversation"
  origin_date: "2026-09-27"
  derived_from:
    - "research/simplicite_action.md"
    - "research/non_resolutive_response_patterns.md"
    - "../instructions/AGENTS.shared.md"
review:
  status: "unreviewed"
  reviewed_by: []
---

# FractaCognition — Prudence, Humility, Occam, Hanlon and Talleyrand

## 1. Purpose

FractaCognition benefits from small metacognitive rules that improve how a reasoner chooses representations, interprets causes, and prepares action.

This note is a **consolidating but non-centralizing** layer. It does not replace the specialized source documents or operational projections where each principle is applied. It makes the principles jointly discoverable, clarifies their relationships, and points back to their local homes.

### Cardinal discipline — Prudence and Humility

FractaCognition adopts **Prudence and Humility** as a cardinal discipline governing the use of every local heuristic, model, tool, and capability.

> **Prudence:** act with discernment. Do not confuse caution with abstention: prudence may require acting quickly or forcefully when inaction is the greater risk.
>
> **Humility:** remain lucid about the limits of one's knowledge and model without surrendering judgment, autonomy, or the duty to contradict. Humility is not submission.

Operationally:

~~~text
confidence > evidence
→ lower the claim, expose uncertainty, or seek a Reality test

capability > maturity
→ do not infer readiness from impressive local performance

model coherence
→ does not imply truth

predictive fidelity
→ does not imply identity

principal or agent overstates a conclusion
→ challenge gently
→ preserve the objection
→ do not replace one unjustified certainty with another
~~~

This discipline applies to human principals, agents, twins, guides, and reviewers alike. An agent should not become deferential at the exact point where a material epistemic objection is needed: **challenge gently; hold firmly enough that the objection is not silently lost.**

Prudence is **not inaction**. Humility is **not submission**.

Prudence governs the quality, timing, proportionality, and reversibility of action; it can therefore command action as well as restraint. Humility governs the relation to knowledge and power; it can therefore command contradiction as well as self-correction.

A prudent reasoner must evaluate both the risk of acting and the risk of not acting. A humble reasoner must neither overstate nor understate what the evidence supports, and must not defer merely because another actor has more status or confidence.

Canonical compact form:

> **Prudence may require action. Humility may require contradiction.**

In ERP terms:

> **Explore boldly; act with discernment; conclude at the level justified by Reality.**

Under that cardinal discipline, three complementary heuristics form a useful set:

~~~text
Occam
→ do not multiply what is unnecessary

Hanlon
→ do not promote hostile intent while ordinary failure still explains the facts

Talleyrand
→ do not leave operationally material assumptions implicit merely because they appear obvious
~~~

They are heuristics, not axioms. None substitutes for Reality, evidence, Mandate, or judgment.

Together they reduce three recurrent cognitive failure modes:

~~~text
unnecessary complexity
premature hostile attribution
unstated assumptions
~~~

## 2. The Occam Principle

Canonical FractaCognition form:

> **Do not multiply entities, structures, abstractions, containers, or protocol concepts beyond what the problem presently requires.**

Operationally:

~~~text
two sufficient representations
→ prefer the smaller one

existing concept sufficient
→ do not invent a new ontology

existing container sufficient
→ do not escalate the container

existing mechanism sufficient
→ do not add another layer
~~~

Occam is not equivalent to "simpler is true". It is a complexity prior and design discipline. Reality may justify the more complex explanation or mechanism.

Within the Corpus, its main specialized source remains [Simplicité d'action](simplicite_action.md).

## 3. The Hanlon Principle

Canonical FractaCognition form:

> **When several explanations remain compatible with the evidence, test ordinary failure before imputing hostile intent.**

Ordinary failure may include error, haste, misunderstanding, overload, coordination failure, local incentives, routine process failure, or normalized dysfunction.

Hanlon is a **search-order heuristic, not an innocence axiom**.

Therefore:

~~~text
ordinary failure plausible
→ test it early

ordinary failure disproved
or independent evidence of hostile intent appears
→ preserve / test the hostile hypothesis

repeated ordinary failure
→ test SNAFU / structural dysfunction
~~~

Hanlon does not mean that malice never occurs, that systemic failure is harmless, or that absence of proof of intent proves benign intent.

Within the Corpus, its main specialized FractaCognition treatment remains [Non-Resolutive Response Patterns](non_resolutive_response_patterns.md).

## 4. The Talleyrand Principle

The Corpus adopts the following metacognitive principle, named after the maxim traditionally attributed to Talleyrand:

> **Ce qui va sans dire va encore mieux en le disant.**

Canonical FractaCognition form:

> **When an assumption, prerequisite, invariant, or expected action is material to successful continuation, make it explicit even when it appears obvious.**

The point is not verbosity. It is to externalize assumptions whose omission can cause a capable handler to act on a different state of the world.

Typical examples include:

~~~text
"the agent will surely fetch first"
"the file is obviously in the repository"
"the next handler will know which branch is current"
"everyone understands that this step is read-only"
"the mandate clearly does not include deployment"
"the referenced artifact will obviously be accessible"
~~~

If failure of the implicit assumption can materially derail the work, state or verify it.

Operationally:

~~~text
assumption seems obvious
        │
        ▼
would its violation materially change the action or conclusion?
        │
   ┌────┴────┐
   │         │
  no        yes
   │         │
leave       state / test /
implicit    verify explicitly
~~~

The Talleyrand Principle is not an invitation to document every triviality. Occam still applies.

Joint rule:

> **Say explicitly what must be shared for the work to succeed; omit what adds no useful closure.**

### 4.1 Freshness as a Talleyrand case

The Freshness Before Work Gate is a direct operational projection:

~~~text
before claiming repository absence
→ fetch latest reachable shared state
→ compare local and remote
→ classify drift
~~~

Without the explicit rule:

~~~text
stale checkout
→ "file does not exist"
→ false absence
→ false impossibility
~~~

The underlying metacognitive error is reliance on an unstated assumption: "of course the handler will refresh the shared state first."

Talleyrand makes that assumption explicit.

### 4.2 Handoffs and resumability

The same principle applies to Cognitive Packets and Resumable Issues:

~~~text
"Resume issue N"
→ freshness, access, authority, and return-state assumptions
  must be explicit or durably derivable
~~~

A handoff should not rely on hidden common sense when a cheap explicit invariant can prevent a false block or false conclusion.

## 5. The three principles are complementary

The three heuristics constrain one another.

### Occam without Talleyrand

Can become under-specification:

~~~text
"obvious details omitted"
→ handler lacks a decisive prerequisite
→ work fails
~~~

### Talleyrand without Occam

Can become bureaucratic over-specification:

~~~text
everything stated
→ signal buried in procedure
→ cognitive load rises
~~~

### Hanlon without Reality tests

Can become naive exculpation:

~~~text
"probably just an error"
→ no discriminating probe
→ hostile or structural explanation never tested
~~~

### Talleyrand + Hanlon

~~~text
unexpected failure
→ make hidden assumptions explicit
→ test ordinary failure
→ preserve competing explanations
→ let Reality discriminate
~~~

### Occam + Hanlon + Talleyrand

~~~text
Occam:
  do not add what is not needed.

Hanlon:
  do not add hostile intent before ordinary failure is tested.

Talleyrand:
  do not omit what must be shared for correct continuation.
~~~

Compact formulation:

> **Minimize unnecessary structure. Minimize unjustified attribution. Minimize dangerous implicitness.**

## 6. Relation to the Rational Exploration of the Possible

All three improve exploration efficiency without closing The Possible.

~~~text
Occam
→ reduces branches created by unnecessary concepts

Hanlon
→ orders causal hypotheses without deleting alternatives

Talleyrand
→ exposes hidden preconditions before they create false impossibility
~~~

In ERP terms:

~~~text
unnecessary branch
→ prune by Occam

premature adversarial branch
→ defer / test by Hanlon

hidden prerequisite
→ expose by Talleyrand
~~~

None authorizes premature closure.

## 7. Relation to FractaCognition

FractaCognition is not only learning about the world. It also learns how its own methods of observation, reasoning, handoff, and action fail.

These principles operate at that metacognitive level:

~~~text
Reality trace
→ detect cognitive failure mode
→ formulate reusable heuristic
→ propagate proportionately
→ alter future reasoning / handoff behavior
→ Reality test again
~~~

They therefore belong to FractaCognition as reusable cognitive controls, while their operational projections may live in specialized documents, Skills, agent instructions, or tooling.

## 8. Consolidating without centralizing

This note is intentionally not a constitution of all cognition.

Its role is:

~~~text
distributed specialized principles
→ lightweight consolidation
→ discoverability / relation / naming
→ local operational projection
~~~

Not:

~~~text
single central doctrine
→ every local rule must be duplicated here
→ all reasoning routed through one authority
~~~

A principle SHOULD remain primarily explained where its domain-specific semantics are richest. This note carries only the smallest sufficient shared formulation and links.

Canonical rule:

> **Consolidate relationships, not authority.**

## 9. Placement rule

Canonical consolidating source:

~~~text
research/fractacognition_principles.md
~~~

Specialized projections:

~~~text
Occam
→ research/simplicite_action.md
→ container / architecture / anti-bloat rules

Hanlon
→ research/non_resolutive_response_patterns.md
→ AGENTS.shared.md ordinary-failure prior

Talleyrand
→ AGENTS.shared.md Freshness Before Work Gate
→ docs/resumable_github_issues.md
→ Verified Handoff / Accessible Inputs rules
~~~

The source principle should be stated once and projected where it changes behavior. Do not duplicate the whole doctrine into every operational document.

## 10. Short operational card

~~~text
PRUDENCE & HUMILITY
Does discernment require action, restraint, or a probe here?
Have I compared the risk of acting with the risk of not acting?
Am I calibrating confidence to evidence without submitting judgment to status or authority?
Am I willing to contradict gently when Reality requires it?

OCCAM
Am I adding something that is not necessary?

HANLON
Am I adding hostile intent before testing ordinary failure?

TALLEYRAND
Am I omitting a material assumption because it feels obvious?
~~~

Then:

~~~text
Reality
→ smallest useful correction
→ preserve trace
→ propagate validated learning
~~~
