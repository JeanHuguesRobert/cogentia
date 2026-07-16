---
title: Coding Agent Prompt — Implement Alan Turing MCP v0.1
author: unknown
date: '2026-06-26'
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 78b4408
  origin_date: '2026-06-26'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# Coding Agent Prompt — Implement Alan Turing MCP v0.1

Repository:

```text
JeanHuguesRobert/cogentia
```

Work on:

```text
main
```

Do not create or use a branch unless explicitly instructed later.

## Mission

Implement the first practical slice of Alan v0.1 as a Turing-complete direct-style MCP scripting language.

Read first:

```text
research/alan_turing_mcp_v0_1.md
research/alan_turing_mcp_implementation_plan.md
```

Tracking issue:

```text
#36 — Design Turing MCP continuation language
```

## Core concept

Alan source is direct-style:

```alan
fn main query
  results = mcp github.search q=$query
  summary = call summarize results=$results
  return summary=$summary
end
```

But `mcp` operations are resumable effects. They may produce serialized suspensions instead of values.

The caller supplies a step result. Alan resumes from the saved resume point.

## Non-negotiable invariants

```text
Tool availability is not authorization.
Authorization is not execution.
Caller mediation remains the execution boundary.
No compute without budget.
No budget without bearer.
No bearer without mandate.
No mandate without trace.
```

Do not implement direct external MCP invocation by Alan.

Do not implement credentials.

Do not implement real side effects.

Do not let authorization imply execution.

Do not let a large budget imply legitimacy. A branch, claim, proposal or conclusion does not become important merely because an agent burned many CXU on it.

## Required first implementation slice

Build a minimal runtime able to prove this flow:

```text
Alan AST
→ run main
→ hit mcp op
→ return alan.suspension
→ accept alan.step_result from caller
→ resume at saved point
→ return alan.terminal
```

## Suggested files

Create:

```text
tools/alan-lang/
  alan_ast.js
  validate_ast.js
  run_alan.js
  resume_alan.js
  stdlib.js
  examples/
    read_only_search.ast.json
    read_only_search.step_result.json
    staged_patch.ast.json
    private_read.ast.json
  tests/
    test_run_alan.js
    test_resume_alan.js
```

Optional later:

```text
tools/alan-lang/parse_alan.js
```

Do not start with a complex parser. JSON AST execution comes first.

## Minimal AST

Support this shape:

```json
{
  "type": "alan.program",
  "version": "0.1",
  "uses": ["std.core", "std.mcp"],
  "externs": [
    {
      "name": "github.search",
      "kind": "tool",
      "effect": "read_only",
      "data": "public",
      "policy": "P1"
    }
  ],
  "functions": [
    {
      "kind": "fn",
      "name": "main",
      "params": ["query"],
      "body": [
        {
          "op": "mcp",
          "bind": "results",
          "capability": "github.search",
          "input": { "q": "$query" }
        },
        {
          "op": "return",
          "value": { "results": "$results" }
        }
      ]
    }
  ]
}
```

## Required operations

Implement:

```text
assign
call
mcp
if
return
fail
emit
```

`while` and parser support may come after the minimal resumable MCP runtime works.

## Standard library minimum

Implement only enough for first tests:

```text
core.empty
core.eq
core.lt
num.add
num.sub
text.join
text.trim
list.len
list.map_field
map.get
```

Keep the full intended standard library in the spec, but do not overbuild it yet.

## Semantics of `mcp`

For v0.1, every `mcp` op returns either:

```text
alan.suspension
alan.failure
```

It must not call real external tools.

Policy behavior:

```text
read_only + public → P1 → suspension caller_tool_call_required
private_data_access or private data → P3 → suspension authorization_required
repository_write → P4 → suspension human_review_required / staged_only
destructive_action → P5 → alan.failure forbidden_in_mvp
unknown → conservative failure or P4/P5 suspension
```

## CXU budget and anti-gaming constraints

Every future effect slot must be able to carry a compute budget and cost trace. For the MVP, it is acceptable to store these fields as metadata only, but the shape must not make them impossible later.

Use this doctrine:

```text
Compute cost creates seriousness.
It does not create truth, legitimacy or authority.
```

Minimal fields to preserve or leave room for:

```json
{
  "compute_budget": {
    "unit": "CXU",
    "estimated": null,
    "actual": null,
    "payer_ref": null,
    "mandate_ref": null,
    "trace_ref": null,
    "over_budget": "suspend|degrade|ask|abort"
  },
  "anti_gaming": {
    "large_spend_is_not_legitimacy": true,
    "detect_circular_spend": false,
    "requires_mandate": true
  }
}
```

Do not implement real billing in v0.1. Do implement the vocabulary and tests so future runtime code cannot treat compute as free or unmandated.

## Required suspension shape

```json
{
  "type": "alan.suspension",
  "suspension_id": "susp-001",
  "reason": "caller_tool_call_required",
  "policy": { "level": "P1" },
  "pending_call": {
    "capability": "github.search",
    "input": { "q": "Alan MCP" }
  },
  "resume_point": {
    "function": "main",
    "step_index": 1,
    "bind": "results"
  },
  "saved_state": {
    "query": "Alan MCP"
  },
  "compute_budget": {
    "unit": "CXU",
    "estimated": null,
    "actual": null,
    "payer_ref": null,
    "mandate_ref": null,
    "trace_ref": null,
    "over_budget": "suspend"
  },
  "anti_gaming": {
    "large_spend_is_not_legitimacy": true,
    "requires_mandate": true
  },
  "trace": {
    "caller_mediated": true,
    "direct_invocation_by_alan": false,
    "execution_performed": false
  }
}
```

## Required step result shape

```json
{
  "type": "alan.step_result",
  "for_suspension": "susp-001",
  "supplied_by": "caller",
  "value": {
    "results": [
      { "title": "Alan v0.1", "url": "https://example.test/alan" }
    ]
  },
  "trace": {
    "caller_mediated": true,
    "direct_invocation_by_alan": false,
    "execution_performed": false
  }
}
```

## Resume semantics

When resuming:

```text
1. Check step_result.for_suspension matches suspension.suspension_id.
2. Check supplied_by = caller.
3. Check caller_mediated = true.
4. Check direct_invocation_by_alan = false.
5. Check execution_performed = false.
6. Preserve compute_budget and anti_gaming metadata.
7. Restore saved_state.
8. Bind resume_point.bind to step_result.value.
9. Continue the function body at resume_point.step_index.
```

## Tests to implement

Use plain Node `assert` if no test framework is already configured.

Required tests:

```text
validate minimal AST
run read_only_search until suspension
resume read_only_search from step_result to terminal
reject step_result supplied_by alan
reject direct_invocation_by_alan = true
reject execution_performed = true
reject destructive MCP op as forbidden_in_mvp
preserve compute_budget metadata across suspension/resume
reject or flag missing mandate_ref when policy later requires it
do not treat high CXU spend as proof of truth, priority or legitimacy
```

## Expected command

Add or document a command equivalent to:

```bash
node tools/alan-lang/tests/test_run_alan.js
node tools/alan-lang/tests/test_resume_alan.js
```

Optional package script:

```json
{
  "alan:lang:test": "node tools/alan-lang/tests/test_run_alan.js && node tools/alan-lang/tests/test_resume_alan.js"
}
```

## Coding style

Keep the implementation boring and explicit.

Prefer:

```text
small functions
clear error messages
plain JSON objects
no dependencies unless necessary
no hidden magic
```

Do not implement a full VM yet.

Do not implement a full parser yet unless the AST runtime is complete.

Do not mix this with the broader MCP private-read / side-effect roadmap.

Do not implement accounting as a cosmetic field that can be ignored by the trace. If a cost or budget is represented, it must be represented as part of the runtime/protocol object.

## Completion criteria

The task is complete when:

```text
Alan AST validates.
A read-only public MCP op suspends.
The suspension records caller mediation and no execution.
A caller-supplied step result resumes execution.
Compute budget metadata survives suspension and resume.
A terminal value is produced.
Negative tests reject unsafe traces.
The implementation remains on main.
```

Final rule:

```text
Make Alan able to suspend and resume correctly before making it able to do anything externally powerful.
Make Alan able to account for compute before making compute appear free.
```