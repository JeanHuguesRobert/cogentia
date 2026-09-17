---
name: response-resolution-check
description: Detect whether a response actually resolves the question asked, preserve unresolved epistemic residue, distinguish effect from intent, and select the next Reality Probe when needed.
version: 0.1.0
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

Prevent agents from confusing conversational movement with epistemic progress.

Use this Skill when a response, document, portal, referral, institutional reply, support answer, expert answer, or agent output must be assessed against a prior question whose unresolved residue matters.

Canonical question:

> **Did this response materially reduce the uncertainty attached to the question actually asked?**

## Invariants

1. Reconstruct the original question before evaluating the answer.
2. Split the requested information into concrete atoms when practical.
3. Acknowledge useful adjacent information without treating it as an answer to a different atom.
4. A referral is not a resolution until the referred source has been checked.
5. Preserve unresolved residue explicitly.
6. Distinguish observable effect from hypothesized intent.
7. Never infer evasion, obstruction, bad faith, delay strategy, or manipulation solely from non-resolution.
8. Do not close a consequential question merely because a response was received.
9. Prefer the next bounded Reality Probe that directly targets the residue.
10. Stop probing when the residue is resolved, deliberately abandoned, or no longer decision-relevant.

## Workflow

### 1. Recover the target question

State the exact question that motivated the interaction.

If the original request contained several points, atomize them:

```text
Q1
Q2
Q3
Q4
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

A partial response must not erase the unresolved set.

### 6. Classify the response effect

Use one of:

- **resolutive** — enough of the target uncertainty has been reduced for the decision purpose;
- **partially resolutive** — useful target uncertainty was reduced, but material residue remains;
- **non-resolutive** — target uncertainty was not materially reduced;
- **response displacement** — the response redirects the inquiry elsewhere and the referred source fails to resolve the target question.

These labels describe effect, not motive.

### 7. Keep intent separate

Maintain:

```text
observed pattern: ...
intent: unknown
```

Only raise hypotheses such as accidental, procedural, defensive, dilatory, strategic or evasive when useful, and label them as hypotheses unless independently evidenced.

### 8. Choose the next Reality Probe

Ask:

- What unresolved atom matters most?
- What source is most likely to contain it?
- What is the smallest precise request that would expose whether it exists?
- Can the next request be phrased so that another displacement becomes visible rather than merely generating more text?

Prefer a probe that directly references the surviving residue.

## Output contract

When applying the Skill, return when useful:

```yaml
response_resolution_check:
  target_question: ...
  requested_atoms:
    - ...
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
  classification: resolutive|partially_resolutive|non_resolutive|response_displacement
  intent_status: unknown|independently_evidenced
  next_reality_probe: ...
```

This schema is illustrative, not mandatory storage format.

## Human mnemonic

The informal French motif **« 1, 2, 3, Soleil ! »** may be used as a recognition aid for sequences where apparent progress repeatedly stops before the decisive information.

Do not use the mnemonic as an accusation. The canonical analytical terms are **non-resolutive response** and **response displacement**.

## Anti-patterns

Avoid:

- `response-equals-answer`;
- `referral-equals-resolution`;
- `adjacent-information substitution`;
- `process-as-progress`;
- `residue amnesia`;
- `intent inflation`;
- `infinite referral loop`;
- asking a broader follow-up when a narrower residual atom can be requested directly.

## Relationship to Corpus doctrine

This Skill operationalizes:

- `research/non_resolutive_response_patterns.md`;
- `research/reality_probe_selection.md`;
- `research/epistemic_assimilation_and_salience.md`.

The general loop is:

```text
question
→ response
→ map answer to requested atoms
→ preserve residue
→ follow justified referral
→ measure actual uncertainty reduction
→ next Reality Probe
```

## Success criterion

The Skill succeeds when a later agent can distinguish, without reconstructing the whole interaction, **what was asked, what was actually learned, what remains unknown, and why the next probe targets that residue**.
