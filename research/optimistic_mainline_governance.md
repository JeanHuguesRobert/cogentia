---
title: Optimistic Mainline Governance
subtitle: Direct agent work on main under trace, Measured Risk and scoped authorization
version: '0.3'
status: source document — operational doctrine
date: '2026-07-07'
author: Jean Hugues Noël Robert, baron Mariani
license: CC BY-SA 4.0
language: en
repository: cogentia
canonical_path: cogentia/research/optimistic_mainline_governance.md
tags:
  - cogentia
  - agents
  - github
  - mainline-governance
  - optimistic-locking
  - traceability
  - authorization
  - corpus-governance
  - blocked-tools
  - measured-risk
related_research:
  - cogentia/AGENTS.md
  - cogentia/research/measured_risk.md
  - cogentia/research/agent_configuration_layer.md
  - cogentia/research/conversation_to_corpus_pipeline.md
  - cogentia/research/alan_turing_mcp_v0_1.md
  - cogentia/research/alan_turing_mcp_coding_agent_prompt.md
  - cogentia/research/blocked_tool_rule.md
  - inseme/AGENTS.md
document_role: source
document_kind: method-note
visibility: public
lifecycle_state: working
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Optimistic Mainline Governance

## Direct agent work on main under trace, Measured Risk and scoped authorization

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

> **Agents may work directly on the default branch when the mandate is explicit, the act is bounded, the diff is inspectable, the Exposure is proportionate to the expected value, a credible correction/recovery path exists, and the result is reported.**

French formulation:

> **Faire comme si cela allait bien se passer, mais rendre visible, mesuré, corrigeable et imputable ce qui se passe réellement.**

This is an application of [`Measured Risk`](measured_risk.md): the aim is not to minimize operational risk at any cost, but to take enough bounded risk for useful work and learning while preserving mandate, trace and recovery.

---

## 2. Position

The default branch is not a sacred museum object.

For a living corpus operated primarily by its human author, `main` is the living line of stabilization. Direct commits can be legitimate when they remain bounded, traceable and correctable.

Branches and Pull Requests are useful tools, but they are not the default proof of seriousness. They are isolation and review mechanisms to be used when the measured consequence profile justifies the extra layer.

Working rule:

```text
main = living corpus line
commit = traceable act
diff = evidence of change
issue = bounded mandate or memory in tension
branch = exceptional isolation tool
PR = exceptional formal review surface
revert / successor commit = right to correction without rewriting history
```

---

## 3. Relation to optimistic locking

This method is a form of operational optimistic locking.

It assumes that most small, well-scoped agent contributions will succeed if the system makes conflicts, errors and overreach visible early enough.

The system does not try to prevent every possible mistake before action. It instead requires:

```text
bounded action
+ explicit mandate
+ measured Exposure
+ visible diff
+ sober commit
+ validation report
+ credible correction / recovery path
```

This is not laxity. It is an action discipline adapted to a corpus that must learn by being worked on.

A zero-risk target would be self-defeating here: if every uncertain change required maximal isolation and ceremony, the governance mechanism itself would consume the Human Attention Budget and slow the Reality Tests by which the corpus improves.

### 3.0 Measured Risk posture

For direct-main work, do not reduce risk to a Boolean `reversible / irreversible` label.

Assess proportionately:

```text
objective / expected value
scope and Exposure
possible propagation
OptionLoss
who bears a possible loss
how cheaply state can be superseded or restored
what can be compensated or repaired
what residue could remain
what evidence/history must be preserved
```

A Git commit is historically irreversible in the trivial sense that the commit happened. Yet most documentation commits are cheaply **correctable** by a successor commit while preserving causality. That is usually the governance property that matters.

Conversely, a technically revertible commit can deserve stronger control when it publishes protected information, triggers downstream automation, changes a public commitment, affects third parties, or destroys important options before the revert can repair the consequences.

Therefore:

> **Prefer the smallest sufficient operational Exposure, not the smallest conceivable risk.**

---

## 3.1 Visibility domains and restricted supplements

The same posture applies to information visibility.

The normal mode is maximum lawful and responsible transparency: the public record is the living, inspectable corpus. A private register is not its concealed replacement; it is an exceptional supplement for material that cannot yet, or cannot safely, be public.

Working rule:

```text
public record = normal, autonomous and inspectable line
restricted supplement = explicit, bounded and dependent exception
publication review = a traceable decision, not an automatic release
```

A restriction must be explicit, motivated, proportionate to the risk, limited in scope, and open to re-examination. Where doing so does not itself expose protected information, the public record may state that a restricted supplement exists and why it is withheld.

This does not create a duty to disclose later. Re-examination tests whether the restriction remains justified, including for the privacy, safety or legitimate interests of third parties.

A visibility conflict must not silently erase the public record or turn secrecy into the default. It is recorded as a bounded exception, with a correction or review path.

---

## 4. Authorization is not a branch requirement

Scoped authorization allows stabilization. It does not automatically require a branch or Pull Request.

The distinction is important:

```text
explicit authorization to stabilize
≠ obligation to create a branch
≠ obligation to open a PR
```

An authorized agent may commit directly to `main` when the authorized operation fits the direct-main **Measured Risk** profile.

Positive expected value does not create authority. The applicable mandate remains an independent boundary.

---

## 5. Direct-main profile

An agent may work directly on `main` when all of the following are true:

```text
1. The user has given explicit scoped authorization, or the repository-local AGENTS.md already grants the relevant action profile.
2. The agent has read the relevant AGENTS.md file.
3. The repository role is understood.
4. The change is small enough to review from its diff.
5. The affected files are appropriate for the repository.
6. The Exposure and possible propagation are bounded enough for the current mandate.
7. A credible recovery path exists: revert, successor commit, restored source, compensation or other proportionate correction as applicable.
8. No raw source trace is destroyed without distinct authority.
9. No private material is leaked into a public repository.
10. No legal, financial, institutional, commercial, testamentary or accusatory position is intensified without explicit instruction.
11. Tests, checks or at least manual validation are performed when available.
12. The agent reports objective, scope, validation, known risks, recovery path and next step.
```

If one of these conditions is not met, the agent should reduce Exposure or use a proposal, issue, checkpoint, staged patch, branch or PR.

The point is not to mechanically choose the most conservative container. Choose the **least ceremonial container that keeps the measured consequence profile inside mandate**.

---

## 6. When to use a branch or PR

Branches and PRs should remain available for cases where isolation or formal review has real value.

Use a branch or PR when:

```text
- Jean Hugues Robert explicitly requests one;
- external collaboration requires review before integration;
- repository protection rules prevent direct commits;
- the change has materially higher Exposure or uncertain propagation;
- the change touches several subsystems at once;
- the agent cannot confidently keep the diff inspectable;
- the change affects public doctrine, legal position, security model, hard-to-recover data migration or major naming;
- the work is experimental and isolation materially improves the Reality Test or recovery path.
```

Otherwise, prefer small direct commits to `main`.

A branch is not inherently safer: a large opaque branch can have higher eventual integration risk than a sequence of small visible mainline commits.

---

## 7. Risk classes for GitHub actions

A practical classification for agent-mediated GitHub work remains useful as a routing projection:

| Class | Action type | Default handling |
|---|---|---|
| G1 | Read, search, inspect | Allowed when relevant |
| G2 | Prepare draft, summarize, propose diff | Allowed; no stabilization |
| G3 | Small documentation commit on `main` | Allowed with scoped authorization and report |
| G4 | Code or configuration commit on `main` | Allowed with tests/checks and a proportionate Measured Risk report |
| G5 | Multi-file structural change | Use explicit issue/plan; branch or PR when isolation materially improves the recovery/exposure profile |
| G6 | Deletion, private/public transfer, legal/institutional commitment, destructive migration | Human validation required; often forbidden as an agent action |

These classes do not replace the underlying dimensions. In particular, a G3 publication of protected data can be more consequential than a G5 refactor that never leaves a sandbox.

This complements the Alan principle:

```text
Tool availability is not authorization.
Authorization is not execution.
Caller mediation remains the execution boundary.
```

For GitHub, caller mediation may take the form of explicit user instruction, repository-local AGENTS.md, commit report, CI result, issue mandate, review comment, staged patch, branch or PR depending on the measured consequence profile.

---

## 8. Blocked operations

A blocked operation is not a failed mandate. It is an operational signal.

When a direct-main operation is blocked by tooling, connector failure, permission denial, policy check, API limit, repository rule, file conflict, safety control, or unknown GitHub failure, the agent must not imply that the operation succeeded.

The correct behavior is:

```text
authorized operation
  -> attempt operation
  -> if blocked, stop the external effect
  -> report the blockage
  -> preserve partial work as draft, patch, note, or issue
  -> classify the failure when possible
  -> ask whether manual intervention is desired when it could unblock the work
  -> continue only within a reduced non-stabilizing scope unless re-authorized
```

This section is governed by [`blocked_tool_rule.md`](blocked_tool_rule.md).

---

## 9. Minimal pre-commit check

Before committing directly to `main`, an agent should answer:

```text
Repository:
Repository role:
Instruction source / Mandate:
Objective / expected value:
Scope:
Files to change:
Why this belongs on main directly:
Expected diff size:
Validation available:
Risk class (projection):
Exposure / propagation:
Recovery path / Reversibility Envelope:
Possible third-party or protected-interest impact:
Expected residue if recovery is needed:
Human validation needed before commit: yes/no
Blocked operation, if any:
Partial work preserved, if any:
Manual intervention useful, if any: yes/no
```

Do not fabricate precise probabilities merely to fill the report. Qualitative bounds and explicit unknowns are valid.

---

## 10. Minimal completion report

Every substantial direct-main contribution should end with:

```text
Scope:
Files changed:
Reason / expected value:
Validation:
Known risks / observed Exposure:
Recovery / correction path:
Residue or unresolved risk:
Next step:
Human validation needed: yes/no
Blocked operation, if any:
Partial work preserved, if any:
Manual intervention useful, if any: yes/no
```

This report is not ceremony. It is the operational trace that makes optimistic mainline work measured rather than reckless.

---

## 11. Prompt fragment for agents

Reusable instruction:

```text
Work directly on the default branch unless I explicitly ask for a branch or PR, or unless isolation materially improves the measured consequence/recovery profile. Apply Optimistic Mainline Governance and Measured Risk: use small inspectable acts, bound Exposure, preserve mandate and source history, validate when available, keep a credible correction/recovery path, and report files changed, expected value, validation, known risks/Exposure, recovery path, residue and next step. Do not minimize risk as an objective in itself: take the smallest sufficient risk needed for useful progress, while respecting hard authority, rights, privacy and third-party boundaries. If an act has high or poorly bounded Exposure, uncertain propagation, hard-to-repair consequences, legal/institutional commitment, protected information, or important OptionLoss, reduce scope or route through stronger review/human validation.
If a tool, connector, permission, policy check, API limit, repository rule, file conflict, safety control, or GitHub operation blocks the work, report it explicitly, preserve partial work, and ask whether manual intervention is desired when it could unblock the operation.
```

---

## 12. Anti-patterns

Do not allow direct-main work to become:

```text
- bulk rewriting without a checkpoint;
- hidden doctrine change;
- summary replacing a source;
- private material leaking into public corpus;
- publication automation becoming authorship;
- branch avoidance used to hide material Exposure;
- branch proliferation used to perform safety theatre;
- commit messages that conceal what changed;
- generated files mixed with semantic edits without explanation;
- agent confidence replacing validation;
- speed becoming a substitute for judgment;
- low average risk used to ignore catastrophic tails;
- "Measured Risk" used to infer authority from expected value;
- blocked-tool failure hidden as if the work had succeeded;
- bypass escalation disguised as persistence.
```

The method is optimistic, not blind.

---

## 13. Stabilized formula

```text
Agents may work on main.
They must not work carelessly on main.

Branches and PRs are exception tools.
Small direct commits are the normal learning path.

The guardrails are:
mandate,
objective,
scope,
Exposure,
diff,
validation,
trace,
recovery,
residue,
report.

Do not minimize risk.
Take the smallest sufficient risk for useful progress.

When a tool is blocked:
report, preserve, degrade, ask.
```

Final formula:

> **Optimistic mainline governance is the right to let agents forge, under trace and Measured Risk, so that they become better forgers without becoming invisible powers.**
