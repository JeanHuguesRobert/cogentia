---
title: Agentic Commit Transparency
subtitle: Mandate, Provenance, Human Review, and Reversibility for AI-Assisted Corpus Work
status: draft
version: 0.1
last_stamped_at: 2026-07-15T00:00:00.000Z
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/agentic_commit_transparency.md
author: unknown
date: unknown
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
---

# Agentic Commit Transparency

## 1. Rule

No agentic commit without a mandate trace.

When an AI agent contributes to a commit, the commit or an attached trace must disclose the agentic contribution and point to the mandate that authorized it. The relevant question is not whether a change is merely "AI-generated". The relevant question is whether the delegated action is traceable, scoped, reviewable, and reversible.

A commit produced wholly or partly by an AI agent without such disclosure is incomplete as a corpus trace, even when the code, text, or data change is technically correct.

## 2. Rationale

Cogentia treats GitHub as versioned memory, not only as a software forge. A commit is therefore not just a technical delta. It is a stabilized act in the corpus.

When an agent modifies the corpus, the act must remain intelligible after the conversation has ended, after the model has changed, and after another human or agent must inspect, revert, extend, or criticize the work.

The disclosure is useful because it preserves:

- the identity of the acting agent or tool;
- the identity of the human principal;
- the explicit mandate under which the agent acted;
- the scope and files affected;
- the checks performed before stabilization;
- the presence or absence of human review;
- the trace needed to reconstruct the action later.

This rule extends the general Cogentia principle: delegated capacity is legitimate only when it is bounded by mandate, trace, reviewability, and reversibility.

## 3. Minimal commit trailer

When the commit message is the primary place where the trace is carried, use this minimal trailer:

```text
Agent-Assisted: yes
Agent: <agent/tool name>
Principal: Jean Hugues Robert
Mandate: <short mandate or issue/continuation reference>
Human-Reviewed: yes|no
Trace: <issue|continuation|packet|file|hash|conversation checkpoint>
```

Additional fields may be added when useful:

```text
Scope: <files, directories, or repository area>
Checks: <tests, lint, manual inspection, or "not run">
Risk: low|medium|high
Reversible: yes|no
```

## 4. Manifest-based trace

For larger, multi-file, multi-repository, or sensitive work, the commit trailer may point to a structured manifest instead of carrying the full trace in the commit message.

The manifest should record at least:

```yaml
schema: cogentia.agentic_commit_manifest.v1
agent:
  name:
  provider:
  version:
principal:
  name: Jean Hugues Robert
mandate:
  source:
  scope:
  issued_at:
  limits:
work:
  repository:
  branch:
  files_changed:
  summary:
checks:
  tests_run:
  lint_run:
  manual_checks:
review:
  human_reviewed:
  reviewer:
  review_notes:
trace:
  issue:
  continuation:
  packet:
  content_hash:
  parent_trace:
  commit:
```

A template lives at [`prompts/agentic-commit-manifest.template.yaml`](../prompts/agentic-commit-manifest.template.yaml).

## 5. Human review is a fact, not a courtesy label

`Human-Reviewed: yes` means that a human actually inspected the resulting change before or after stabilization and accepted responsibility for allowing it to remain in the corpus.

If an agent commits directly under explicit authorization and no human review has yet occurred, the correct value is:

```text
Human-Reviewed: no
```

This is not a defect by itself. It is a truth-preserving disclosure. A later review may be recorded by a follow-up commit, issue comment, pull request review, or manifest update.

## 6. Relation to direct-main governance

Cogentia allows direct commits to `main` for solo-corpus work when the mandate is explicit, the change is small, scoped, reversible, and inspectable by diff.

Agentic commit transparency does not abolish direct-main work. It makes direct-main work safer by making the delegation visible.

The rule is therefore:

```text
Direct main is acceptable only when the act remains small, reversible, and traceable.
Agentic direct main additionally requires agentic disclosure.
```

## 7. Failure modes

The rule is designed to prevent several forms of trace corruption:

- **Invisible delegation** — the repository history hides that an agent acted.
- **Mandate laundering** — a broad or vague instruction is retroactively treated as authorization for a stabilized act.
- **Review laundering** — the presence of a human in the conversation is confused with actual review of the final diff.
- **Responsibility diffusion** — an agent produces a change and no principal remains identifiable.
- **Audit debt transfer** — a fast agentic contribution imposes a slow verification cost on a maintainer without declaring assumptions, checks, or limits.
- **Post-hoc reconstruction** — a trace is invented after the fact instead of being attached at stabilization time.

## 8. Minimal operational formula

```text
No agentic commit without mandate trace.
No mandate trace without principal, scope, review status, and recovery path.
```

## 9. Corpus status

This document is a source doctrine for the operational rule in [`AGENTS.md`](../AGENTS.md). Local repository `AGENTS.md` files may specialize the rule, but they must not silently weaken it.
