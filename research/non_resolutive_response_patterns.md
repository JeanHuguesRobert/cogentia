---
title: "Non-Resolutive Response Patterns"
subtitle: "Detect when an answer moves attention without materially reducing the uncertainty that motivated the question"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-09-17"
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
  - fractacognition
  - metacognition
  - response-resolution
  - epistemic-residue
  - reality-probe
  - information-value
  - institutional-interaction
  - traceability
related_documents:
  - "research/reality_probe_selection.md"
  - "research/epistemic_assimilation_and_salience.md"
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
