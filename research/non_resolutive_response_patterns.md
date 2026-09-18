---
title: "Non-Resolutive Response Patterns"
subtitle: "Detect when an answer moves attention without materially reducing the uncertainty that motivated the question"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-09-17"
version: "0.5"
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
  - fractacognition
  - metacognition
  - response-resolution
  - epistemic-residue
  - reality-probe
  - information-value
  - institutional-interaction
  - traceability
  - occam
  - fragmentation
  - canonicalization
  - question-preservation
  - answer-drift
  - frame-recovery
related_documents:
  - "research/reality_probe_selection.md"
  - "research/epistemic_assimilation_and_salience.md"
  - "research/simplicite_action.md"
  - "research/ideas_to_explore_as_issues.md"
  - "skills/response-resolution-check/SKILL.md"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Non-Resolutive Response Patterns

## 1. Problem

A response can be long, procedurally correct, apparently cooperative, or rich in new information while still failing to resolve the question that caused the interaction.

The central FractaCognition question is therefore not:

> **Did we receive a response?**

but:

> **Did the response materially reduce the uncertainty attached to the question actually asked?**

This distinction matters whenever an agent interacts with administrations, institutions, support systems, experts, tools, search engines, other agents, or any source capable of returning information that is relevant-looking without being resolving.

A response may contain useful information and still be non-resolutive with respect to the target uncertainty.

---

## 2. Canonical pattern

The minimal pattern is:

```text
Question Q
    ↓
Response R
    ↓
optional referral / source / action S
    ↓
verify S
    ↓
measure residual uncertainty about Q
```

Let `U(Q)` denote the unresolved information required to answer or decide the question.

A response is **resolutive** when it sufficiently reduces `U(Q)` for the purpose that motivated the question.

A response is **partially resolutive** when it reduces some relevant uncertainty but leaves material components unresolved.

A response is **non-resolutive** when it does not materially reduce the target uncertainty, even if it produces text, process, links, referrals, acknowledgements, or adjacent information.

The classification concerns effect, not intention.

---

## 3. Response Displacement

A particularly important subtype is **Response Displacement**.

```text
Q asked to actor A
    ↓
A returns R
    ↓
R directs the requester toward source B
    ↓
B is consulted
    ↓
B does not contain the requested information
    ↓
Q remains materially unresolved
```

French working term:

> **déplacement non résolutif de la réponse**

A common institutional form is a **non-resolutive documentary referral**:

```text
precise documentary question
→ referral to database / portal / procedure
→ portal consulted
→ requested field absent
→ initial question remains open
```

The human mnemonic **« 1, 2, 3, Soleil ! »** may be useful for recognition: apparent movement occurs, then progress stops immediately before the decisive information. It is not the canonical analytical term.

---

## 4. Strict epistemic discipline

Never infer strategic intent merely from a non-resolutive sequence.

Keep the levels separate:

```text
FACT
A precise question Q was asked.

FACT
Response R contains / does not contain specific requested elements.

FACT
R refers to source or procedure S.

FACT
S was actually consulted.

FACT
S contains / does not contain the requested elements.

INFERENCE
The referral is non-resolutive with respect to Q.

HYPOTHESIS
The pattern is accidental, procedural, defensive, dilatory, strategic, evasive, or intentional.
```

Intent requires independent evidence.

### 4.1 Hanlon, SNAFU, and certainty closure

When several causal explanations remain compatible with the observations,
FractaCognition should test **ordinary failure** before imputing hostile intent.
This is the Hanlon heuristic: error, haste, misunderstanding, overload,
coordination failure, local incentives, or routine process effects are often
sufficient explanations and are usually cheaper to test.

Hanlon is a **search-order heuristic, not an innocence axiom**. Ordinary failure
may itself be serious, repeated, or structural. This is where the American
**SNAFU** intuition is useful: dysfunction can become the normal operating
condition of a system without requiring a coordinated hostile design.

The two checks are complementary:

```text
Hanlon check
    could ordinary failure explain the observation?

SNAFU check
    could this ordinary failure be recurrent, structural, or normalized?
```

Neither check establishes motive. A systemic failure can emerge without hostile
intent; conversely, conscious avoidance or hostile action remains a live
hypothesis when independent evidence supports it.

A third check concerns the reasoner's own cognition. A prior conclusion must
not make later observations invisible merely because they appear unable to
change an already-certain result. Feelings of certainty are observations about
the reasoner, not substitutes for evidence.

Canonical rule:

> **Certainty must not close the evidence channel.**

### 4.2 Decision closure is not evidence closure

Keep two different forms of closure separate:

```text
decision closure
    an authorized process has reached a decision
    at a given procedural or operational stage

evidence closure
    no further observation remains materially relevant
    to understanding the decision, its inputs, its process,
    or a still-live downstream consequence
```

Canonical invariant:

> **Decision closure does not imply evidence closure.**

A decision may close the question that an authorized decision-maker was required
to decide without closing legitimate inquiry into what information was
available, transmitted, recorded, considered, omitted, or discovered later. Do
not infer from the existence or finality of a decision that its evidentiary
history is complete or known.

The converse discipline matters as well:

> **Evidence inquiry is not decision relitigation.**

Reconstructing the informational state that preceded a decision does not, by
itself, assert that the decision was wrong or reopen the authority to decide it.

Compact distinction:

```text
certainty closure     → danger inside the reasoner
decision closure      → state of a decision process
evidence closure      → state of what is known

decision closed
≠ evidence known
≠ evidence exhausted
≠ decision wrong
```

A useful Reality Probe is therefore:

> **What was the observable information state at the moment of decision?**

This yields a compact FractaCognition loop:

```text
observation
→ separate fact / inference / hypotheses
→ Hanlon: test ordinary failure first
→ SNAFU: test whether ordinary failure is systemic
→ certainty check: keep later evidence observable
→ resolution check: measure residual uncertainty
→ smallest discriminating Reality Probe
→ preserve trace, residue, and surviving hypotheses
→ propagate validated learning proportionately
```

Compact invariant:

> **Assume neither malice nor accident. Test ordinary failure first; test
> whether ordinary failure is systemic; never let certainty close the evidence
> channel. Preserve competing hypotheses until Reality discriminates.**

This prevents two symmetric errors:

- **naive assimilation** — treating any answer as resolution;
- **premature adversarial attribution** — treating every unresolved answer as deliberate obstruction.

---

## 5. Resolution matrix

For any consequential exchange, preserve a compact matrix:

| Field | Question |
|---|---|
| Target question | What exactly was asked? |
| Decision purpose | Why was the answer needed? |
| Requested atoms | Which concrete facts, documents, times, identifiers or decisions were requested? |
| Direct answer | Which requested atoms were answered directly? |
| New useful information | What relevant information was gained anyway? |
| Referral | Was another source, actor, procedure or portal indicated? |
| Referral followed | Was it actually consulted? |
| Referral yield | Which requested atoms were found there? |
| Residual uncertainty | What remains unanswered? |
| Resolution class | resolutive / partial / non-resolutive |
| Intent status | unknown unless independently evidenced |
| Next Reality Probe | What bounded action would most reduce the residue? |

The **requested atoms** field is important. It prevents a broad response from hiding the fact that the precise requested data remain absent.

---

## 6. Epistemic residue

After processing a response, explicitly preserve the **residue**:

```text
asked:
- A
- B
- C
- D

answered:
- B

still unresolved:
- A
- C
- D
```

Do not allow new information to erase unresolved old questions merely because the interaction has moved on.

This connects directly to epistemic assimilation and salience: explanation volume must not make unexplained residue disappear from working memory.

A useful invariant is:

> **Every consequential response should leave an explicit residue set until each requested atom is answered, abandoned for a stated reason, or rendered irrelevant by a changed decision.**

---

## 7. Relationship to Reality Probe Selection

A question sent to another actor is a Reality Probe.

A referral supplied by the response may create a second Reality Probe.

Therefore the correct loop is:

```text
probe P1: ask Q
→ observation R
→ update what is known
→ preserve residue
→ if R refers to S, probe P2: inspect S
→ observation S-result
→ update again
→ measure residual uncertainty
→ choose next probe only if useful
```

Do not count execution of a probe as epistemic progress by itself.

The relevant quantity is the decision-relevant discrimination actually produced.

---

## 8. Anti-patterns

Avoid:

```text
response-equals-answer
    treat receipt of any response as closure

referral-equals-resolution
    assume that being pointed elsewhere means the information exists there

adjacent-information substitution
    accept useful but different information as if it answered the requested point

process-as-progress
    confuse procedural movement with epistemic movement

residue amnesia
    forget unanswered atoms after receiving partial information

intent inflation
    infer obstruction, bad faith or strategy without independent evidence

infinite referral loop
    follow successive referrals without periodically checking whether target uncertainty is decreasing
```

---

## 9. Operational rule for agents

When a consequential response arrives:

1. reconstruct the exact target question;
2. atomize the requested information;
3. map the response to those atoms;
4. record useful adjacent information separately;
5. follow an explicit referral when its expected value justifies the cost;
6. compare the referral result with the original requested atoms;
7. preserve the unresolved residue explicitly;
8. avoid attributing intent without evidence;
9. select the smallest high-value Reality Probe aimed at the residue;
10. close only when the residue is resolved, deliberately abandoned, or no longer decision-relevant.

Compact form:

> **Track uncertainty, not conversational motion. A response is progress only to the extent that it changes what is known or decidable about the question that motivated the interaction.**

---

## 10. FractaCognition interpretation

This pattern is metacognitive because the failure can occur inside the reasoner itself.

The system must notice that it is being cognitively moved by:

- a new document;
- a new portal;
- a new interlocutor;
- a new procedure;
- a long explanation;
- an acknowledgement;
- a partial answer;

without necessarily becoming less uncertain about the target question.

FractaCognition should therefore monitor both:

```text
interaction state
    what happened next?

epistemic state
    what uncertainty actually changed?
```

Their divergence is itself a signal worth preserving.

---

## 11. External Occam Check — unexplained entity proliferation

Cogentia already applies Occam internally: do not multiply concepts, documents, issues, containers or implementation layers beyond necessity. The same discipline must be applied to **external systems**.

An interaction may represent one practical matter through several external entities:

- several case numbers;
- several conversation threads;
- several identifiers;
- several portals;
- several procedural containers;
- several intermediaries;
- several apparently duplicate document sets.

The signal is not plurality by itself. Plurality may be legally, technically or operationally necessary.

The signal is:

> **one practical object appears to be represented by several entities while the necessity of the multiplication remains unexplained.**

Working term:

> **Unexplained Entity Proliferation** — *prolifération non expliquée d'entités*.

This is an **effect-level observation**, not an accusation.

### 11.1 Four tests

When external entities multiply, apply four checks:

```text
1. Necessity test
   What real distinction requires the additional entity?

2. Continuity test
   Which facts, parties, recipients, documents, references and timestamps survived the split?

3. Recomposition test
   Can the original practical matter be reconstructed unambiguously from the fragments?

4. Intent separation
   Fragmentation effect is observable.
   Cause remains to be established.
```

Possible causes include:

- legal or procedural requirements;
- database or software architecture;
- organizational routing;
- accidental duplication;
- defensive workflow;
- strategic fragmentation.

Do not rank these causes without evidence.

### 11.2 Fragmentation cost

Even when benign, unnecessary or unexplained fragmentation can increase:

```text
number of entities
    ↓
reconciliation cost
    ↓
context-loss risk
    ↓
contradiction risk
    ↓
responsibility-dilution risk
    ↓
human and agent cognitive load
```

A fragmented system can therefore produce effects superficially resembling "divide and rule" without proving any intention to divide or confuse.

The metacognitive task is to detect and neutralize the effect before speculating about motive.

### 11.3 Canonicalization rule

FractaCognition must not automatically import external fragmentation into its own world model.

Canonical rule:

> **Do not import external fragmentation into the cognitive model. Canonicalize first.**

Represent the practical matter once, then map external projections onto it:

```text
canonical matter X
├── external projection A
├── external projection B
├── conversation thread C
├── portal record D
└── document set E
```

External systems are free to multiply identifiers. The internal cognitive model should preserve a single canonical object unless a real substantive distinction is established.

### 11.4 Occam symmetry

Internal Occam:

> Do not create a new entity if an existing entity is sufficient.

External Occam check:

> When another system creates an additional entity, ask what distinction makes it necessary before allowing that entity to split the internal model.

This connects response-resolution analysis to `research/simplicite_action.md` and the "smallest sufficient container" rule in `research/ideas_to_explore_as_issues.md`.

---

## 12. FractaCognition invariant

For consequential interactions, track three states separately:

```text
interaction state
    what happened next?

epistemic state
    what uncertainty changed?

entity topology
    did the same matter become split across additional containers?
```

A useful warning condition is:

```text
interaction movement increases
AND
entity count increases
AND
residual uncertainty does not materially decrease
```

This condition does not prove obstruction. It does justify a deliberate **canonicalization and resolution check** before further action.

Compact formula:

> **Track uncertainty, track fragmentation, and preserve one canonical object until Reality requires more.**

---

## 13. Question Preservation, Answer Drift and Frame Recovery

A second family of non-resolution occurs when the response remains relevant to the broad context but answers a **different question** from the one that was asked.

Canonical form:

```text
Question Q is asked
    ↓
Response R is relevant to the surrounding matter
    ↓
R actually answers Q'
    ↓
Q remains unresolved
```

Working terms:

- **Question Substitution** — the original question is implicitly replaced by another one;
- **Answer Drift** — the response drifts away from the requested decision-relevant atoms while remaining contextually plausible;
- **Frame Recovery** — the reasoner deliberately restores the original question as the active frame.

The key discipline is **Question Preservation**:

> **A consequential question remains canonically active until it is answered, deliberately abandoned, or made irrelevant by new facts. A responder's reframing does not silently replace it.**

### 13.1 Canonical question lock

Before evaluating a consequential answer, freeze the target question in a compact canonical form, preferably atomized:

```text
Q1: ... ?
Q2: ... ?
Q3: ... ?
```

Then evaluate the response only against these atoms.

Relevant information that does not answer them belongs in a separate bucket:

```text
useful_adjacent_information:
- ...
```

Do not promote adjacent information into an answer merely because it is true, authoritative, lengthy or procedurally important.

### 13.2 Detecting substitution

A response should trigger a question-alignment check when:

- it answers a neighboring legal, technical or procedural question;
- it explains what another actor decided instead of what the queried actor did;
- it restates background instead of supplying the requested fact;
- it changes from factual verification to interpretation;
- it changes from actor A's actions to actor B's decision;
- it introduces a broader controversy while the requested atom remains unanswered.

The test is simple:

> **If R were perfectly true, would Q still remain unanswered?**

If yes, the response may be useful but is not resolving Q.

### 13.3 Frame Recovery

When Question Substitution or Answer Drift is detected, do not get cognitively recruited into the substitute frame.

Canonical instruction:

> **Do not answer the answer. Restore the question.**

French form:

> **Ne pas répondre à la réponse à côté ; rétablir la question.**

The recovery move should be smaller than the previous request, not larger:

```text
R answers Q'
    ↓
acknowledge useful Q' information if necessary
    ↓
state that Q concerns a different category
    ↓
restate only unresolved Q atoms
    ↓
constrain answer format when useful
```

For example:

```text
Q1 ? → yes / no / unavailable
Q2 ? → yes / no / unavailable
Q3 ? → yes / no / unavailable
```

This reduces the semantic surface available for another drift while preserving a courteous path to a direct answer.

### 13.4 Do not enter an infinite recovery loop

Question Preservation does not require endless repetition.

Use a bounded escalation pattern:

```text
first drift
→ precise reformulation

second drift
→ constrained answer format / explicit residue

repeated drift
→ stop conversational loop
→ preserve unanswered atoms
→ select a different Reality Probe
```

A different Reality Probe may be another source, document request, technical trace, hierarchical route, formal access mechanism, or independent evidence channel.

Repeated non-alignment still does **not** prove intent. It changes the optimal probe, not the epistemic status of motive.

### 13.5 FractaCognition risk: responder-frame capture

The metacognitive danger is not merely receiving an irrelevant answer. It is allowing that answer to redefine the problem being reasoned about.

Failure pattern:

```text
Q asked
→ R answers Q'
→ reasoner reacts to R
→ discussion moves deeper into Q'
→ Q disappears from working memory
```

This is **responder-frame capture**.

Countermeasure:

```text
preserve Q
→ classify R
→ store adjacent information separately
→ restore Q
→ preserve residue
```

The reasoner should therefore track a fourth state in consequential exchanges:

```text
question frame
    what exact uncertainty is currently entitled to closure?
```

### 13.6 Compact doctrine

```text
Preserve the question.
Map the answer.
Separate adjacent information.
Restore the frame when it drifts.
Do not debate the substitute question unless it independently matters.
Stop repeating when a different Reality Probe has higher expected value.
```

Compact formula:

> **Do not answer the answer. Restore the question, preserve the residue, then choose the next probe.**
