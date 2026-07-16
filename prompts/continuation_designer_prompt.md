---
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/prompts/continuation_designer_prompt.md
last_stamped_at: 2026-05-15T00:00:00.000Z
title: Cogentia Continuation Designer Prompt
date: '2026-05-14'
status: draft — auto-filled (frontmatter cleanup)
author: unknown
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
# Cogentia Continuation Designer Prompt

## Role

You are designing a CLI command compatible with the Cogentia / Agent-Resumable CLI continuation protocol.

Your goal is to build a command-line tool that remains deterministic, auditable, provider-neutral, and resumable, while still being able to request external judgment from humans or AI agents.

## Core Principle

Do not embed the AI inside the tool.

Expose the point where judgment is missing.

A continuation is not a prompt. It is a typed protocol object that allows a suspended computation to be resumed after external judgment has been supplied.

## Design Objective

Design the CLI as a deterministic state machine with explicit continuation points.

The tool should:

- perform deterministic work directly;
- stop at semantic or heuristic decision points;
- emit a structured continuation object;
- allow an external actor to provide a `step_result`;
- validate the result;
- resume execution;
- log the decision;
- support backtracking where appropriate.

## Required CLI Commands

At minimum, design commands equivalent to:

```bash
tool run <input>
tool continuation emit <task-file>
tool continuation inspect <id>
tool continuation resume <id> --step-result <result.json>
tool continuation fail <id> --branch <branch-id> --reason "<reason>"
tool continuation queue
tool continuation abort <id>
```

For Cogentia, the command surface may look like:

```bash
node scripts/cogentia.js continuation emit <task-file>
node scripts/cogentia.js continuation inspect <id>
node scripts/cogentia.js continuation resume <id> --step-result <result.json>
node scripts/cogentia.js continuation fail <id> --branch <branch-id> --reason "<reason>"
node scripts/cogentia.js continuation queue
node scripts/cogentia.js continuation abort <id>
```

## Continuation Object

A continuation should include at least:

```json
{
  "type": "continuation",
  "id": "c-001",
  "protocol": "cogentia.continuation.v1",
  "task": "choose_strategy",
  "reason": "semantic_decision_required",
  "context": {},
  "alternatives": [],
  "constraints": {},
  "expected_result_schema": {},
  "resume": {
    "command": "tool continuation resume c-001 --step-result result.json"
  },
  "audit": {
    "created_at": "2026-05-14T00:00:00Z",
    "created_by": "tool",
    "workspace": ".",
    "source_command": "tool run input.json"
  }
}
```

## Alternatives

When several possible paths exist, expose them explicitly.

Example:

```json
"alternatives": [
  {
    "id": "retry",
    "description": "Retry the operation once.",
    "risk": "low",
    "reversibility": "high"
  },
  {
    "id": "patch",
    "description": "Patch the detected inconsistency.",
    "risk": "medium",
    "reversibility": "medium"
  },
  {
    "id": "abort",
    "description": "Stop and report the unresolved issue.",
    "risk": "low",
    "reversibility": "high"
  }
]
```

Do not hide alternatives inside prose.

Alternatives are part of the protocol.

## Constraints

Every non-trivial continuation should include constraints.

Example:

```json
"constraints": {
  "urgency": "normal",
  "importance": "high",
  "risk": "medium",
  "reversibility": "medium",
  "deadline": null,
  "budget": {
    "max_wall_time_seconds": 120,
    "max_tool_calls": 5,
    "max_tokens": 4000,
    "max_cost_eur": 0.50,
    "human_review_required": false
  },
  "skin_in_the_game": {
    "accountable_party": "maintainer",
    "beneficiary": "project_users",
    "cost_bearer": "project_owner",
    "liability_bearer": "human_operator",
    "reputation_bearer": "maintainer",
    "requires_explicit_acceptance": false
  },
  "criticality": "medium_high"
}
```

## Skin in the Game

A constraint without skin in the game is incomplete.

Always ask:

- Who benefits?
- Who pays?
- Who is liable?
- Who bears reputational consequences?
- Who accepts the risk?
- Is explicit human acceptance required?

If the continuation may lead to legal, financial, destructive, public, irreversible, or reputational consequences, require explicit accountability.

## Criticality

Criticality should combine:

```text
urgency x importance x risk x irreversibility x accountability_gap
```

This does not need to be a rigid numerical formula.

Its purpose is to expose operational stakes and prevent false urgency, cost shifting, or irresponsible delegation.

## Step Result

The tool must accept a structured `step_result`.

Generic example:

```json
{
  "type": "step_result",
  "continuation_id": "c-001",
  "status": "success",
  "chosen_alternative": "patch",
  "result": {},
  "reason": "The patch branch preserves existing behavior while resolving the inconsistency.",
  "confidence": 0.82,
  "constraints_checked": true,
  "skin_in_the_game_checked": true
}
```

Failure example:

```json
{
  "type": "step_result",
  "continuation_id": "c-001",
  "status": "failed",
  "failed_alternative": "retry",
  "reason": "Retry produced the same validation error.",
  "recoverable": true,
  "suggested_next_action": "backtrack"
}
```

The CLI must validate the `step_result` before resuming.

## Validation Rules

Before resuming, verify:

- `continuation_id` matches an existing continuation;
- the continuation is not expired, aborted, or already completed;
- the selected alternative exists and is still available;
- required fields are present;
- the result matches `expected_result_schema`;
- constraints were not violated;
- explicit acceptance exists when required;
- failed branches are recorded;
- the operation is allowed in the current workspace.

Never resume from arbitrary or malformed input.

## Audit Log

Every continuation lifecycle should be auditable.

Minimum lifecycle:

```text
created -> inspected -> resumed | failed | aborted -> completed
```

Record:

- continuation ID;
- timestamp;
- source command;
- context hash;
- alternatives;
- selected branch;
- step result;
- failure history;
- actor if known;
- accountability fields;
- final outcome.

For Git-based projects, prefer storing continuation records in a traceable directory such as:

```text
.cogentia/continuations/
```

or another explicit audit path.

## Backtracking

Backtracking must be explicit.

When a branch fails, record it:

```json
"failed_alternatives": [
  {
    "id": "retry",
    "reason": "Same validation error after retry.",
    "failed_at": "2026-05-14T00:00:00Z"
  }
]
```

Then emit or preserve a continuation with remaining alternatives.

Do not erase failure history.

Failed branches are part of the epistemic record.

## Provider Neutrality

The CLI must not require a specific AI provider.

A continuation should be answerable by:

- a human;
- Claude;
- ChatGPT;
- Gemini;
- a local model;
- a script;
- a CI job;
- a future Cogentia agent.

The protocol is healthy if the AI provider can be replaced without modifying the CLI.

## Avoid Hidden Prompts

Do not design the CLI so that it secretly constructs prompts and sends them to a model.

That may be useful as an optional adapter, but it is not the core protocol.

The core protocol is:

```text
tool emits continuation
external actor supplies step_result
tool validates
tool resumes
```

## Security Requirements

Treat continuations as sensitive resumption state.

Recommended protections:

- avoid storing secrets in continuation objects;
- hash or sign continuation state where appropriate;
- bind continuation IDs to workspace and source command;
- expire old continuations;
- validate all resumed input;
- require explicit confirmation for destructive operations;
- separate public context from private internal state;
- log all resumptions;
- prevent replay attacks where relevant.

## Output Modes

Support machine-readable output.

Recommended:

```bash
tool run --format json
tool continuation inspect <id> --format json
tool continuation queue --format json
```

Human-readable output may exist, but JSON should be the protocol surface.

## Compatibility with Cogentia

For Cogentia, continuation support should remain additive.

Do not break existing commands such as:

```bash
scan
status
graph
check
stamp
corpus-status
```

Continuation support should strengthen the existing Cogentia Commons logic:

- corpus as evidence;
- git history as proof;
- explicit attribution;
- no silent erasure;
- accountability by signature;
- contestation rather than consensus;
- provider-neutral AI cooperation.

## Minimal Compliance Checklist

A CLI command is continuation-compatible if it:

- emits typed continuation objects;
- includes explicit task and context;
- includes alternatives when branches exist;
- includes constraints for non-trivial decisions;
- includes skin in the game for consequential decisions;
- defines an expected result schema;
- provides a resume command;
- validates resumed input;
- records audit history;
- supports failure reporting;
- supports backtracking where relevant;
- remains usable without a specific AI provider.

## Compact Rule

A compliant CLI does not hide judgment.

It exposes judgment as a continuation, constrains it, assigns accountability, validates the response, records the decision, and resumes.
