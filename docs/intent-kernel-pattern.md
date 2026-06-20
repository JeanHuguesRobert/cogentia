---
document_role: "operational"
document_kind: "documentation"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "documentation"
classification_confidence: "medium"
---

# Intent Kernel Pattern

**Status:** draft v0.1  
**Repository:** `cogentia`  
**Scope:** generic method  
**Date:** 2026-06-20  

---

## 1. Purpose

An **Intent Kernel** is a short, stable, versioned document that defines the operational intention of a corpus, project, institution, person, or collective.

It is not the corpus itself.

It is not a biography, manifesto, brand platform, or complete strategy.

It is the minimal access protocol that lets humans and AI agents continue work from a corpus without distorting its purpose.

The pattern is designed for agentic workflows where a brief intention must be transformed into research, objections, source documents, derived products, publications, prototypes, or actions.

---

## 2. Design problem

As AI agents become more capable, large corpora become relatively smaller compared with the agents' capacity to search, transform and extend them.

The bottleneck therefore shifts from volume to orientation.

A corpus needs a stable answer to the following questions:

- What is the central intention?
- What must not be betrayed?
- What counts as source material?
- What counts as a derived product?
- Which principles override others in case of conflict?
- Which decisions remain human?
- How should a brief intention be transformed into an artifact?
- How does the result return to the corpus?

An Intent Kernel answers these questions.

---

## 3. Distinction from related documents

| Document | Function | Difference from Intent Kernel |
|---|---|---|
| README | Human entry point | May orient broadly; often project-facing |
| CONTRIBUTING | Contributor rules | Focuses on contribution mechanics |
| AGENTS.md | Instructions for AI agents | Tool/workflow-specific; may be narrower |
| Manifesto | Public declaration | Persuasive and rhetorical; may not be operational |
| Strategy document | Goals and plans | Often time-bound and tactical |
| Corpus map | Navigation | Shows where things are; does not define invariant intention |
| Intent Kernel | Operational invariant | Defines what must remain true across transformations |

---

## 4. Recommended location

For a personal or institutional corpus:

```text
<repository>/identity/INTENT_KERNEL.md
```

For a generic method repository:

```text
<repository>/docs/intent-kernel-pattern.md
```

For a software project with agentic workflows:

```text
<repository>/AGENTS.md
<repository>/docs/intent-kernel.md
```

The kernel should be linked from the main README, but it should not necessarily live in the same repository as the generic method.

A method repository may define the pattern; a personal or institutional repository should host the concrete kernel.

---

## 5. Minimal structure

A useful Intent Kernel should contain at least:

1. **Purpose of the document**
2. **Central intention**
3. **Non-negotiable principles**
4. **Artifact hierarchy**
5. **Core projects or domains**
6. **Key concepts and vocabulary**
7. **Transformation pipeline**
8. **Rules for brief intentions**
9. **Reliability levels**
10. **Fidelity rules**
11. **Arbitration rules**
12. **Human/AI boundary**
13. **Success criteria**
14. **Failure criteria**
15. **Short formula**

---

## 6. Template

```markdown
# INTENT_KERNEL.md

**Title:** Operational Intent Kernel  
**Source owner:** <person / project / institution>  
**Status:** draft v0.1  
**Repository:** <repository>  
**Function:** minimal entry document for humans and AI agents working from the corpus.

---

## 1. Purpose

This document defines the stable operational intention that must guide any transformation of this corpus.

It does not replace the corpus.

It defines the access protocol to the corpus.

---

## 2. Central intention

> <one paragraph stating the central intention>

This intention includes:

- <axis 1>
- <axis 2>
- <axis 3>
- <axis 4>

---

## 3. Non-negotiable principles

- <principle 1>
- <principle 2>
- <principle 3>
- <principle 4>

---

## 4. Artifact hierarchy

| Level | Function |
|---|---|
| Source corpus | stable, versioned, correctable memory |
| Derived product | situated form adapted to audience/channel |
| Publication | public exposure of a derived product |
| Action | concrete execution based on a decision |
| Feedback | reintegration into the corpus |

---

## 5. Core projects or domains

| Domain | Function |
|---|---|
| <domain 1> | <function> |
| <domain 2> | <function> |
| <domain 3> | <function> |

---

## 6. Key concepts

### <Concept>

<definition>

### <Concept>

<definition>

---

## 7. Transformation pipeline

```text
intention
→ corpus lookup
→ external verification if needed
→ facts / hypotheses / interpretations separation
→ possible paths
→ objections
→ human decision
→ source update
→ derived product
→ publication or action
→ feedback to corpus
```

---

## 8. Rules for brief intentions

When a brief intention is provided, the agent must identify:

- the relevant source domain;
- the expected artifact;
- the target audience;
- the required reliability level;
- the required human decision;
- the return path into the corpus.

---

## 9. Reliability levels

| Level | Status | Use |
|---:|---|---|
| A | established fact | direct assertion possible |
| B | strong probability | cautious assertion possible |
| C | plausible hypothesis | label as hypothesis |
| D | speculation | do not use as foundation |
| E | weak signal / risk | monitor only |

---

## 10. Fidelity rules

- Do not simplify by betraying.
- Do not invent missing facts.
- Distinguish symbol from evidence.
- Distinguish anger, hypothesis, doctrine and proof.
- Preserve source/product/publication distinctions.
- Signal contradictions.
- Keep sensitive decisions human.

---

## 11. Arbitration rules

When principles conflict, apply the following order:

1. fidelity before short-term effectiveness;
2. traceability before elegance;
3. source before publication;
4. objection before proclamation;
5. proof before accusation;
6. human decision before automation.

---

## 12. Success criteria

The kernel works if a human or AI agent can:

- understand the corpus purpose;
- avoid central betrayals;
- transform brief intentions into usable artifacts;
- identify what must be verified;
- preserve human responsibility;
- return outputs to the corpus.

---

## 13. Failure criteria

The kernel fails if an agent:

- invents facts;
- replaces human decision;
- confuses source and publication;
- multiplies concepts unnecessarily;
- ignores traceability;
- loses the central intention.

---

## 14. Short formula

> <one paragraph summary of the kernel>
```

---

## 7. Operational rules for Cogentia

Cogentia should treat an Intent Kernel as a high-priority orientation layer, but not as an unquestionable truth source.

The kernel tells an agent **how to read and transform the corpus**.

The corpus remains the source of detailed claims.

When a kernel and a source document conflict, the agent should:

1. identify the contradiction;
2. preserve both traces;
3. infer which document is newer or more authoritative;
4. propose a correction;
5. avoid silently resolving the conflict.

---

## 8. Generic vs personal kernels

A generic repository such as `cogentia` should host the **pattern**.

A personal, institutional or project repository should host the **actual kernel**.

Example:

| Repository | Role |
|---|---|
| `cogentia` | generic pattern and agentic method |
| `barons-Mariani` | concrete personal / patrimonial / doctrinal kernel |
| profile repository | public pointer and human-facing orientation |

This prevents a method repository from becoming dependent on one personal corpus, while still allowing personal corpora to use the method.

---

## 9. Core invariant

An Intent Kernel should reduce the protocol of access to a thought or corpus.

It should not reduce the thought itself.
