---
title: "Blocked Tool Rule"
subtitle: "How agents should report, degrade, and escalate failed tool operations"
version: "0.1"
status: "source document — operational doctrine"
date: "2026-07-06"
author: "Jean Hugues Noël Robert"
license: "CC BY-SA 4.0"
language: "en"
repository: "cogentia"
canonical_path: "cogentia/research/blocked_tool_rule.md"
tags:
  - cogentia
  - agents
  - github
  - blocked-tools
  - tool-failure
  - manual-intervention
  - traceability
  - authorization
  - corpus-governance
related_research:
  - "cogentia/AGENTS.md"
  - "cogentia/research/agent_configuration_layer.md"
  - "cogentia/research/optimistic_mainline_governance.md"
  - "FractaVolta/AGENTS.md"
document_role: "source"
document_kind: "method-note"
visibility: "public"
lifecycle_state: "working"
---

# Blocked Tool Rule

## How agents should report, degrade, and escalate failed tool operations

**Version 0.1 — 2026-07-06**  
**Repository:** `JeanHuguesRobert/cogentia`  
**Path:** `research/blocked_tool_rule.md`

---

## 1. Purpose

This document stabilizes a practical rule for AI agents working with Jean Hugues Robert's corpus when a tool operation fails or is blocked.

The question is not:

```text
How can an agent bypass a blocked operation?
```

It is:

```text
How can an agent preserve traceability, avoid false completion, and route the work back to human control when a tool operation fails?
```

Core thesis:

> **A blocked tool is not an embarrassment to hide. It is an operational signal to report, classify, preserve, and route.**

French formulation:

> **Un outil bloqué n'est pas un échec à dissimuler. C'est un signal opérationnel à tracer, qualifier, préserver et router.**

---

## 2. Scope

This rule applies when an agent is blocked by:

```text
tool failure
connector failure
permission denial
policy check
safety control
API limit
repository access problem
GitHub operation failure
rate limit
file conflict
missing credential
schema mismatch
unknown execution failure
```

The rule applies to GitHub, email, calendar, file systems, document tools, publication tools, coding tools, and any other external-effect tool.

---

## 3. Core rule

When blocked, the agent must not imply that the operation succeeded.

The agent should report:

```text
1. What it attempted.
2. What failed.
3. Whether the failure appears technical, permission-related, policy-related, access-related, rate-limit-related, conflict-related, or uncertain.
4. What partial work was preserved.
5. What remains possible without the blocked operation.
6. Whether manual intervention by Jean Hugues Robert could unblock the work.
7. The smallest safe continuation.
```

If manual intervention could unblock the work, the agent should explicitly ask whether Jean Hugues Robert wants to intervene manually or whether the agent should continue with a reduced, non-stabilizing alternative.

---

## 4. What not to do

A blocked operation must not lead to:

```text
- pretending completion;
- silently dropping the requested effect;
- hiding the failure in a vague final report;
- escalating to a riskier operation without authorization;
- creating a branch, PR, issue, publication or side-effect merely to conceal the blockage;
- rewriting the user's request as if the blocked action had never been requested;
- treating tool availability as authorization;
- treating tool failure as authorization to bypass policy.
```

---

## 5. Degradation ladder

When an intended operation is blocked, the agent should downgrade to the smallest useful safe artifact.

Recommended ladder:

```text
intended external effect
  -> retry only if safe and clearly justified
  -> exact blockage report
  -> preserved draft or patch
  -> issue or checkpoint if memory must be retained
  -> manual-intervention request if human action can unblock
  -> reduced non-stabilizing alternative
```

Examples:

```text
Cannot commit file
  -> provide patch or preserve draft, then ask about manual intervention.

Cannot read private repository
  -> report access failure and ask whether the repository should be connected or content supplied.

Cannot publish
  -> preserve publication package and ask whether manual publication is desired.

Cannot send email
  -> preserve draft and report that it was not sent.
```

---

## 6. Relationship to authorization

Tool availability is not authorization.

Authorization is not execution.

Tool failure is not authorization to bypass the agreed boundary.

The correct sequence is:

```text
mandate
  -> tool attempt
  -> success report
or
  -> blocked-tool report
  -> degraded artifact
  -> human choice
```

---

## 7. Relationship to AGENTS.md

`AGENTS.md` files are operational projections of the corpus. They should include or reference this rule where tool-mediated work is expected.

Minimum local wording:

```text
If a tool, connector, permission, policy check, API limit, repository access problem, or GitHub operation blocks an intended operation, apply the Cogentia blocked-tool rule. Do not imply success. Preserve partial work. Ask whether manual intervention is desired when it could unblock the work.
```

---

## 8. Relationship to optimistic mainline governance

Optimistic mainline governance allows small direct commits to `main` when they are explicitly authorized, scoped, reversible, inspectable, and reported.

A blocked direct-main operation should not be treated as a reason to hide the failure or intensify the action.

The appropriate behavior is:

```text
direct-main operation authorized
  -> attempt operation
  -> if blocked, stop the external effect
  -> report blockage
  -> preserve patch or draft
  -> ask whether manual intervention is desired
  -> continue only within a reduced non-stabilizing scope unless re-authorized
```

---

## 9. COP interpretation

In COP terms, a blocked tool is a first-class operational event.

Possible event names:

```text
cop.tool.blocked
cop.operation.degraded
cop.operation.requires_human_intervention
cop.operation.resumed
```

Minimal event fields:

```text
eventType
operation
tool
attemptedEffect
failureClass
partialWorkPreserved
manualInterventionPossible
nextSafeStep
recordedAt
```

This makes blockage visible, imputable, and resumable.

---

## 10. Completion report fragment

When a task encountered a blocked tool, the final report should include:

```text
Blocked operation:
Attempted effect:
Failure observed:
Failure class:
Partial work preserved:
Safe continuation:
Manual intervention useful: yes/no
```

---

## 11. Stabilized formula

```text
A blocked tool is not silent failure.
A blocked tool is not authorization to bypass.
A blocked tool is a traceable event requiring report, preservation, degradation, and possibly human intervention.
```

Final formula:

> **When the tool cannot act, the agent must become more explicit, not more evasive.**
