---
name: response-resolution-check
description: Detect whether a response actually resolves the question asked, preserve unresolved epistemic residue, detect question substitution and unexplained external fragmentation, distinguish effect from intent, recover the original frame, and select the next Reality Probe when needed.
version: 0.3.0
status: experimental
document_role: "operational"
document_kind: "documentation"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "skill-procedure"
classification_confidence: "strong"
---

# Response Resolution Check

## Purpose

Prevent agents from confusing conversational movement with epistemic progress, prevent a responder's reframing from silently replacing the question asked, and prevent external fragmentation from silently fragmenting the internal cognitive model.

Use this Skill when a response, document, portal, referral, institutional reply, support answer, expert answer, or agent output must be assessed against a prior question whose unresolved residue matters.

Canonical questions:

> **Did this response materially reduce the uncertainty attached to the question actually asked?**

> **Did the response answer the same question, or merely a nearby one?**

and, when the interaction creates additional dossiers, threads, identifiers, portals or procedural containers:

> **What real distinction makes each additional entity necessary?**

## Invariants

1. Reconstruct and preserve the original question before evaluating the answer.
2. Split the requested information into concrete atoms when practical.
3. Acknowledge useful adjacent information without treating it as an answer to a different atom.
4. A responder's reframing does not replace the canonical question unless new facts make the original question irrelevant.
5. A referral is not a resolution until the referred source has been checked.
6. Preserve unresolved residue explicitly.
7. Distinguish observable effect from hypothesized intent.
8. Never infer evasion, obstruction, bad faith, delay strategy, manipulation or strategic fragmentation solely from non-resolution, question drift or multiplication of entities.
9. Do not close a consequential question merely because a response was received.
10. Prefer the next bounded Reality Probe that directly targets the residue.
11. Stop repeating the same conversational probe when a different probe has higher expected information value.
12. When external entities multiply, test whether the multiplication corresponds to a real substantive distinction.
13. Do not import external fragmentation into the internal world model without first canonicalizing the underlying practical matter.
14. When a response answers a substitute question, do not get recruited into debating that substitute merely because it is salient.

## Workflow

### 1. Recover and lock the target question

State the exact question that motivated the interaction.

If the original request contained several points, atomize them:

```text
Q1
Q2
Q3
Q4
```

Treat these as the active canonical question set until each atom is:

```text
answered
abandoned deliberately
made irrelevant by new facts
```

Do not replace the original question with the responder's reframing.

### 2. Map the response

For each requested atom, classify:

```text
answered directly
answered partially
not answered
made irrelevant by new facts
unclear
```

Record separately any useful new information that was not requested.

### 2A. Run a Question Alignment Check

Ask:

> **If every statement in the response were true, would the original question still remain unanswered?**

If yes, inspect whether the response answers a neighboring question `Q'` rather than the canonical `Q`.

Typical signals:

- answer about another actor's decision instead of the queried actor's action;
- interpretation instead of requested factual verification;
- background or procedural explanation instead of the requested datum;
- response to a broader controversy instead of the bounded atom;
- accurate adjacent information that leaves the target uncertainty unchanged.

Classify when useful as:

```text
aligned
partially aligned
question substitution
answer drift
```

These classes describe semantic effect, not motive.

### 2B. Apply Frame Recovery when drift is detected

Canonical instruction:

> **Do not answer the answer. Restore the question.**

Recovery sequence:

```text
acknowledge adjacent information only if useful
→ state the category distinction briefly
→ restate only unresolved atoms
→ constrain the answer format when useful
```

Preferred constrained formats include:

```text
yes / no / unavailable
known / unknown / not recorded
present / absent / cannot determine
```

Do not broaden the follow-up merely because the previous answer broadened the frame.

### 3. Detect referrals

If the response points to another source, actor, portal, procedure, attachment, database or document, record the referral as a new candidate Reality Probe.

Do not mark the original atom resolved yet.

### 4. Follow the referral when justified

If cost, mandate and risk permit, inspect the referred source.

Then remap the result against the **original requested atoms**.

### 5. Preserve residue

Produce an explicit residual set:

```text
resolved:
- ...

partially resolved:
- ...

still unresolved:
- ...
```

A partial response, adjacent answer or substitute frame must not erase the unresolved set.

### 6. Classify the response effect

Use one or more when appropriate:

- **resolutive** — enough of the target uncertainty has been reduced for the decision purpose;
- **partially resolutive** — useful target uncertainty was reduced, but material residue remains;
- **non-resolutive** — target uncertainty was not materially reduced;
- **response displacement** — the response redirects the inquiry elsewhere and the referred source fails to resolve the target question;
- **question substitution** — the response answers a different question from the one asked;
- **answer drift** — the response progressively moves away from the requested atoms while remaining contextually plausible.

These labels describe effect, not motive.

### 7. Keep intent separate

Maintain:

```text
observed pattern: ...
intent: unknown
```

Only raise hypotheses such as accidental, procedural, technical, defensive, dilatory, strategic or evasive when useful, and label them as hypotheses unless independently evidenced.

Repeated drift changes the optimal probing strategy; it does not by itself establish intent.

### 8. Run the External Occam Check when entities multiply

Trigger this check when one practical matter appears as several:

- case numbers;
- email or messaging threads;
- identifiers;
- portals;
- procedural containers;
- duplicate-looking document sets;
- intermediaries or routing stages.

Do not treat plurality itself as an error. Apply four tests:

```text
necessity:
  What real distinction requires the additional entity?

continuity:
  Which parties, recipients, documents, timestamps and references survived the split?

recomposition:
  Can the original practical matter be reconstructed unambiguously from the fragments?

intent separation:
  What is observed, and what remains only a hypothesis about cause?
```

Classify the fragmentation as:

```text
justified
possibly justified / not yet explained
unexplained entity proliferation
```

The last class means only that necessity has not yet been established.

### 9. Canonicalize before reasoning further

When external systems fragment one matter, represent one canonical internal object and attach external projections to it:

```text
canonical matter X
├── projection A
├── projection B
├── thread C
├── portal D
└── document set E
```

Do not create separate internal matters merely because external systems use separate containers.

Split the canonical object only when a substantive distinction is evidenced.

Canonical instruction:

> **Do not import external fragmentation into the cognitive model. Canonicalize first.**

### 10. Bound the recovery loop

Question Preservation does not imply infinite repetition.

Use this default escalation:

```text
first drift
→ precise reformulation

second drift
→ constrained answer format + explicit residue

repeated drift
→ stop conversational loop
→ preserve unanswered atoms
→ select a different Reality Probe
```

A different Reality Probe may be:

- another source;
- a document or access request;
- a technical trace;
- a hierarchical route;
- a formal procedural channel;
- independent corroborating evidence.

The trigger is diminishing expected information value from another repetition, not irritation with the responder.

### 11. Choose the next Reality Probe

Ask:

- What unresolved atom matters most?
- What source is most likely to contain it?
- What is the smallest precise request that would expose whether it exists?
- Can the next request be phrased so that another displacement or question substitution becomes visible rather than merely generating more text?
- Has the current conversational route drifted often enough that another probe now has higher expected value?
- If entities have multiplied, what minimal question would establish whether their distinction is real and necessary?

Prefer a probe that directly references the surviving residue and avoids creating unnecessary new containers.

## Output contract

When applying the Skill, return when useful:

```yaml
response_resolution_check:
  target_question: ...
  requested_atoms:
    - ...
  question_alignment:
    status: aligned|partially_aligned|question_substitution|answer_drift
    substitute_question: ...
    frame_recovery_needed: true|false
  directly_resolved:
    - ...
  partially_resolved:
    - ...
  useful_adjacent_information:
    - ...
  referrals:
    - source: ...
      followed: true|false
      yield: ...
  residual_uncertainty:
    - ...
  classification:
    - resolutive|partially_resolutive|non_resolutive|response_displacement|question_substitution|answer_drift
  external_occam:
    triggered: true|false
    canonical_matter: ...
    external_entities:
      - ...
    necessity_status: justified|possibly_justified|unexplained
    continuity_losses:
      - ...
    recomposition_possible: true|false|unclear
  intent_status: unknown|independently_evidenced
  recovery_iteration: 0|1|2|repeated
  next_reality_probe: ...
```

This schema is illustrative, not mandatory storage format.

## Human mnemonics

The informal French motif **« 1, 2, 3, Soleil ! »** may be used as a recognition aid for sequences where apparent progress repeatedly stops before the decisive information.

The informal analogy **« diviser pour régner »** may be used only as a warning about a possible *effect of fragmentation* on cognition: increased reconciliation cost, loss of context or diluted responsibility. It must not be used to attribute strategy or intent without independent evidence.

For answers that remain contextually relevant while answering another question, use the internal reminder:

> **Do not answer the answer. Restore the question.**

Canonical analytical terms are:

- **non-resolutive response**;
- **response displacement**;
- **question substitution**;
- **answer drift**;
- **frame recovery**;
- **question preservation**;
- **unexplained entity proliferation**;
- **canonicalization**.

## Anti-patterns

Avoid:

- `response-equals-answer`;
- `referral-equals-resolution`;
- `adjacent-information substitution`;
- `process-as-progress`;
- `residue amnesia`;
- `intent inflation`;
- `infinite referral loop`;
- `responder-frame-capture` — allow a substitute question to become the new problem merely because the response made it salient;
- `answer-the-answer` — spend the next turn debating adjacent material while the original requested atoms remain untouched;
- `reformulation-inflation` — answer drift by making the next request longer and broader instead of smaller and more constrained;
- `fragmentation-import` — reproduce external dossier/thread proliferation inside the internal model without necessity;
- `entity-count-as-evidence` — treat the number of external containers as proof of strategy;
- asking a broader follow-up when a narrower residual atom can be requested directly.

## Relationship to Corpus doctrine

This Skill operationalizes:

- `research/non_resolutive_response_patterns.md`;
- `research/reality_probe_selection.md`;
- `research/epistemic_assimilation_and_salience.md`;
- `research/simplicite_action.md`;
- `research/ideas_to_explore_as_issues.md`.

The general loop is:

```text
preserve question
→ response
→ check question alignment
→ map answer to requested atoms
→ separate adjacent information
→ recover frame when needed
→ preserve residue
→ follow justified referral
→ measure actual uncertainty reduction
→ detect external fragmentation
→ canonicalize the practical matter
→ bound repeated recovery
→ next Reality Probe
```

## Success criterion

The Skill succeeds when a later agent can distinguish, without reconstructing the whole interaction:

- what was asked;
- whether the response answered that same question;
- what was actually learned;
- what useful information was merely adjacent;
- what remains unknown;
- whether the original frame needs to be restored;
- when repeated reformulation should stop in favor of another Reality Probe;
- which external entities represent the same underlying practical matter;
- whether their multiplication has an established necessity;
- what context was lost across the splits;
- and why the next probe targets the remaining residue without multiplying entities unnecessarily.
