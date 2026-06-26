---
title: "Optimistic Mainline Governance"
subtitle: "Direct agent work on main under trace, reversibility and scoped authorization"
version: "0.1"
status: "source document — operational doctrine"
date: "2026-06-26"
author: "Jean Hugues Noël Robert"
license: "CC BY-SA 4.0"
language: "en"
repository: "cogentia"
canonical_path: "cogentia/research/optimistic_mainline_governance.md"
tags:
  - cogentia
  - agents
  - github
  - mainline-governance
  - optimistic-locking
  - traceability
  - authorization
  - corpus-governance
related_research:
  - "cogentia/AGENTS.md"
  - "cogentia/research/agent_configuration_layer.md"
  - "cogentia/research/conversation_to_corpus_pipeline.md"
  - "cogentia/research/alan_turing_mcp_v0_1.md"
  - "cogentia/research/alan_turing_mcp_coding_agent_prompt.md"
  - "inseme/AGENTS.md"
document_role: "source"
document_kind: "method-note"
visibility: "public"
lifecycle_state: "working"
---

# Optimistic Mainline Governance

## Direct agent work on main under trace, reversibility and scoped authorization

**Version 0.1 — 2026-06-26**  
**Repository:** `JeanHuguesRobert/cogentia`  
**Path:** `research/optimistic_mainline_governance.md`

---

## 1. Purpose

This document stabilizes a practical rule for AI agents working in Jean Hugues Robert's GitHub corpus.

The question is not:

```text
Should AI agents be forbidden from touching main?
```

It is:

```text
How can AI agents work directly on the living mainline without confusing courage with temerity, or agility with precipitation?
```

Core thesis:

> **Agents may work directly on the default branch when the mandate is explicit, the act is small, the diff is inspectable, the change is reversible, and the result is reported.**

French formulation:

> **Faire comme si cela allait bien se passer, mais rendre visible, réversible et imputable ce qui se passe réellement.**

---

## 2. Position

The default branch is not a sacred museum object.

For a living corpus operated primarily by its human author, `main` is the living line of stabilization. Direct commits can be legitimate when they remain bounded, traceable and correctable.

Branches and Pull Requests are useful tools, but they are not the default proof of seriousness. They are isolation and review mechanisms to be used when the risk justifies the extra layer.

Working rule:

```text
main = living corpus line
commit = traceable act
diff = evidence of change
issue = bounded mandate or memory in tension
branch = exceptional isolation tool
PR = exceptional formal review surface
revert = right to error
```

---

## 3. Relation to optimistic locking

This method is a form of operational optimistic locking.

It assumes that most small, well-scoped agent contributions will succeed if the system makes conflicts, errors and overreach visible early enough.

The system does not try to prevent every possible mistake before action. It instead requires:

```text
small action
+ explicit mandate
+ visible diff
+ sober commit
+ validation report
+ reversible correction path
```

This is not laxity. It is an action discipline adapted to a corpus that must learn by being worked on.

---

## 4. Authorization is not a branch requirement

Scoped authorization allows stabilization. It does not automatically require a branch or Pull Request.

The distinction is important:

```text
explicit authorization to stabilize
≠ obligation to create a branch
≠ obligation to open a PR
```

An authorized agent may commit directly to `main` when the authorized operation fits the low-risk direct-main profile.

---

## 5. Direct-main profile

An agent may work directly on `main` when all of the following are true:

```text
1. The user has given explicit scoped authorization, or the repository-local AGENTS.md already grants the relevant action profile.
2. The agent has read the relevant AGENTS.md file.
3. The repository role is understood.
4. The change is small enough to review from its diff.
5. The affected files are appropriate for the repository.
6. The act is reversible by a later commit or revert.
7. No raw source trace is destroyed.
8. No private material is leaked into a public repository.
9. No legal, financial, institutional, commercial, testamentary or accusatory position is intensified without explicit instruction.
10. Tests, checks or at least manual validation are performed when available.
11. The agent reports scope, files changed, validation, risks and next step.
```

If one of these conditions is not met, the agent should downgrade the action to a proposal, issue, checkpoint, staged patch, branch or PR.

---

## 6. When to use a branch or PR

Branches and PRs should remain available for cases where isolation or formal review has real value.

Use a branch or PR when:

```text
- Jean Hugues Robert explicitly requests one;
- external collaboration requires review before integration;
- repository protection rules prevent direct commits;
- the change is a high-risk refactor;
- the change touches several subsystems at once;
- the agent cannot confidently keep the diff small;
- the change affects public doctrine, legal position, security model, irreversible data migration or major naming;
- the work is experimental and may be abandoned entirely.
```

Otherwise, prefer small direct commits to `main`.

---

## 7. Risk classes for GitHub actions

A practical classification for agent-mediated GitHub work:

| Class | Action type | Default handling |
|---|---|---|
| G1 | Read, search, inspect | Allowed when relevant |
| G2 | Prepare draft, summarize, propose diff | Allowed; no stabilization |
| G3 | Small documentation commit on `main` | Allowed with scoped authorization and report |
| G4 | Code or configuration commit on `main` | Allowed only with tests/checks or explicit risk report |
| G5 | Multi-file structural change | Prefer issue, plan, branch or PR |
| G6 | Deletion, private/public transfer, legal/institutional commitment, destructive migration | Human validation required; often forbidden as an agent action |

This complements the Alan principle:

```text
Tool availability is not authorization.
Authorization is not execution.
Caller mediation remains the execution boundary.
```

For GitHub, caller mediation may take the form of explicit user instruction, repository-local AGENTS.md, commit report, CI result, issue mandate, review comment, staged patch, branch or PR depending on risk.

---

## 8. Minimal pre-commit check

Before committing directly to `main`, an agent should answer:

```text
Repository:
Repository role:
Instruction source:
Scope:
Files to change:
Why this belongs on main directly:
Expected diff size:
Validation available:
Risk class:
Reversibility:
Human validation needed before commit: yes/no
```

If the answer to the last line is `yes`, the agent should not commit yet.

---

## 9. Minimal completion report

Every substantial direct-main contribution should end with:

```text
Scope:
Files changed:
Reason:
Validation:
Known risks:
Reversibility:
Next step:
Human validation needed: yes/no
```

This report is not ceremony. It is the operational trace that makes optimistic mainline work non-reckless.

---

## 10. Prompt fragment for agents

Reusable instruction:

```text
Work directly on the default branch unless I explicitly ask for a branch or PR, or unless the risk profile requires isolation. Apply Optimistic Mainline Governance: small scoped acts, readable diffs, sober commits, no destructive changes, no private leakage, no invented facts or mandates, validation when available, and a completion report with files changed, reason, validation, known risks, reversibility and next step. If the change is high-risk, multi-repository, doctrinal, legal, private, destructive or institutionally committing, suspend and ask.
```

---

## 11. Anti-patterns

Do not allow direct-main work to become:

```text
- bulk rewriting without a checkpoint;
- hidden doctrine change;
- summary replacing a source;
- private material leaking into public corpus;
- publication automation becoming authorship;
- branch avoidance used to hide risk;
- commit messages that conceal what changed;
- generated files mixed with semantic edits without explanation;
- agent confidence replacing validation;
- speed becoming a substitute for judgment.
```

The method is optimistic, not blind.

---

## 12. Stabilized formula

```text
Agents may work on main.
They must not work carelessly on main.

Branches and PRs are exception tools.
Small direct commits are the normal learning path.

The guardrails are:
mandate, scope, diff, validation, trace, report, reversibility.
```

Final formula:

> **Optimistic mainline governance is the right to let agents forge, under trace, so that they become better forgers without becoming invisible powers.**
