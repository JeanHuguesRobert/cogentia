# Alan Turing MCP — Implementation Plan

This plan turns the Alan v0.1 concept into a coding-agent implementation sequence.

Reference specification:

```text
research/alan_turing_mcp_v0_1.md
```

Tracking issue:

```text
GitHub issue #36 — Design Turing MCP continuation language
```

## 1. Implementation goal

Implement the first practical slice of Alan as a Turing-complete direct-style MCP scripting language.

The implementation must support:

```text
source syntax
JSON AST
basic parser or parser stub
validator
minimal interpreter
internal functions
external MCP capability declarations
suspendable mcp operation
serialized suspension
caller-supplied step_result
resume
minimal standard library
examples
tests
```

The goal is not to implement a production MCP runtime yet. The goal is to make the language executable enough to prove:

```text
direct-style Alan source
→ JSON AST
→ runtime execution
→ mcp suspension
→ caller-supplied result
→ resume
→ terminal value
```

## 2. Non-negotiable invariants

```text
Tool availability is not authorization.
Authorization is not execution.
Caller mediation remains the execution boundary.
```

The implementation must not add real side-effect execution.

The implementation must not add credentials.

The implementation must not allow Alan to directly invoke external MCP tools.

The MVP may simulate MCP by returning suspensions and accepting step results.

## 3. Suggested file layout

Use a compact layout under `tools/alan-lang/`:

```text
tools/alan-lang/
  parse_alan.js
  alan_ast.js
  validate_ast.js
  run_alan.js
  resume_alan.js
  stdlib.js
  examples/
    read_only_search.alan
    read_only_search.step_result.json
    staged_patch.alan
    private_read.alan
  tests/
    test_parse_alan.js
    test_run_alan.js
    test_resume_alan.js
```

Add schemas under:

```text
trace/schemas/
  alan.program.schema.json
  alan.suspension.schema.json
  alan.step_result.schema.json
```

If `alan.step_result.schema.json` already exists, extend it instead of duplicating it.

Add examples under:

```text
trace/examples/alan_lang/
  alan_program_read_only_search.json
  alan_suspension_read_only_search.json
  alan_step_result_read_only_search.json
  alan_terminal_read_only_search.json
```

## 4. Phase 1 — JSON AST first

Start with the JSON AST. Do not begin with a complex parser.

Define the minimal AST shape:

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

Implement validation for:

```text
program.type = alan.program
version = 0.1
functions[].name
functions[].params
body[].op
valid op names
mcp op requires bind, capability, input
call op requires bind, function, input
return op requires value
fail op requires code/message
```

## 5. Phase 2 — Minimal interpreter

Implement `tools/alan-lang/run_alan.js`.

Input:

```text
program AST
entry function
input values
```

Output is one of:

```text
alan.terminal
alan.suspension
alan.failure
```

Required operations:

```text
assign
call
mcp
if
return
fail
emit
```

Loops may be postponed if recursion works. For Turing-completeness, support recursion or add `while`. The first executable slice may support recursion through internal calls.

## 6. Phase 3 — Internal calls

Implement `call` for internal functions and standard library functions.

Internal call example:

```json
{
  "op": "call",
  "bind": "summary",
  "function": "summarize",
  "input": { "results": "$results" }
}
```

Standard library call example:

```json
{
  "op": "call",
  "bind": "text",
  "function": "text.join",
  "input": { "items": "$titles", "sep": "\n" }
}
```

## 7. Phase 4 — Minimal standard library

Implement only what the examples need first:

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

Do not implement the entire future standard library yet. Keep the full list in the spec as the target.

## 8. Phase 5 — MCP op as suspension

For v0.1, every `mcp` op should produce a suspension instead of invoking a real MCP tool.

Example suspension:

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
  "trace": {
    "caller_mediated": true,
    "direct_invocation_by_alan": false,
    "execution_performed": false
  }
}
```

The suspension must contain enough information to resume after the MCP operation.

## 9. Phase 6 — Resume from step result

Implement `tools/alan-lang/resume_alan.js`.

Input:

```text
program AST
suspension
step_result
```

Step result example:

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

Resume semantics:

```text
load saved_state
bind suspension.resume_point.bind to step_result.value
continue function body at resume_point.step_index
return terminal / suspension / failure
```

## 10. Phase 7 — Policy-aware MCP classification

Implement a minimal policy resolver:

```text
read_only + public → P1
private_data_access or data private → P3
repository_write → P4 staged_only
destructive_action → P5 forbidden
unknown → P4 or P5 conservative default
```

For v0.1:

```text
P1 → suspension caller_tool_call_required
P3 → suspension authorization_required
P4 → suspension human_review_required / staged_only
P5 → alan.failure forbidden_in_mvp
```

## 11. Phase 8 — Alan Text parser

Only after AST execution works, add a minimal parser for Alan Text.

Required initial syntax:

```alan
alan 0.1
use std.core

extern github.search
  kind tool
  effect read_only
  data public
  policy P1
end

fn main query
  results = mcp github.search q=$query
  return results=$results
end
```

Parser may be deliberately simple:

```text
line-based
no complex expressions
key=value inputs
explicit end blocks
```

The parser should compile Alan Text to JSON AST.

## 12. Phase 9 — Tests

Add tests for:

```text
parse simple Alan source
validate AST
run pure internal function
run mcp read-only program until suspension
resume from step_result to terminal
reject direct execution flag
reject missing caller mediation
reject destructive MCP op
```

Suggested npm script:

```json
{
  "alan:lang:test": "node tools/alan-lang/tests/test_parse_alan.js && node tools/alan-lang/tests/test_run_alan.js && node tools/alan-lang/tests/test_resume_alan.js"
}
```

If no test framework exists, use plain Node scripts with `assert`.

## 13. Phase 10 — Documentation updates

Update or add:

```text
README_ALAN.md
research/alan_file_map.md
research/alan_schemas_index.md
```

Add links to:

```text
research/alan_turing_mcp_v0_1.md
research/alan_turing_mcp_implementation_plan.md
research/alan_turing_mcp_coding_agent_prompt.md
```

## 14. Acceptance criteria

The implementation is acceptable when a coding agent can run:

```bash
node tools/alan-lang/run_alan.js tools/alan-lang/examples/read_only_search.ast.json main '{"query":"Alan MCP"}'
```

and receive a suspension, then run:

```bash
node tools/alan-lang/resume_alan.js tools/alan-lang/examples/read_only_search.ast.json suspension.json step_result.json
```

and receive a terminal result.

Minimum accepted flow:

```text
Alan source or AST
→ runtime starts
→ mcp operation suspends
→ caller step_result supplied
→ runtime resumes
→ terminal value produced
```

## 15. Hard exclusions

Do not implement:

```text
real MCP credentials
real GitHub writes
email sending
calendar mutation
file deletion
financial/legal/institutional actions
unmediated private access
silent execution after authorization
```

Alan v0.1 should prove the language and resumable runtime, not external power.
