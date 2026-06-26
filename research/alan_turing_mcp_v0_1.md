# Alan v0.1 — Turing-complete direct-style MCP scripting language

## 1. Core definition

Alan is a Turing-complete direct-style MCP scripting language whose effectful MCP operations are implemented as serializable, policy-aware continuations.

Short form:

```text
Direct-style scripts.
Resumable MCP effects.
Policy-aware responsibility.
```

Alan source code should be easy for modern LLMs to write and understand. Its runtime semantics should remain strict enough to support policy resolution, caller mediation, continuations, traceability and accountability.

## 2. Central invariant

```text
Tool availability is not authorization.
Authorization is not execution.
Caller mediation remains the execution boundary.
```

An MCP capability being available does not mean it may be invoked. An authorization record does not mean execution occurred. Any actual interaction with the external world is mediated by the caller or by a later explicitly-defined execution profile.

## 2.1 Compute budget and anti-gaming invariant

Alan computations must not appear free. Every effectful or potentially expensive operation should be able to carry compute-budget metadata, even when the MVP only preserves it as protocol data.

Additional invariant:

```text
No compute without budget.
No budget without bearer.
No bearer without mandate.
No mandate without trace.

```

## 3. Direct-style source, continuation-based execution

Alan must not force authors or LLMs to write every computation in explicit continuation-passing style.

Preferred source style:

```alan
fn main query
  results = mcp github.search q=$query
  summary = call summarize results=$results
  return summary=$summary
end
```

The line:

```alan
results = mcp github.search q=$query
```

is a resumable effect. At runtime it may suspend the program and return a serialized suspension object. The caller may then invoke the external MCP tool, supply a step result, and resume Alan at the saved resume point.

The continuation exists in the operational semantics and protocol, not as a burden imposed on the source-language author.

## 4. Why Alan is Turing-complete

Alan v0.1 is Turing-complete through:

```text
variables
state
functions
conditionals
recursion
loops
compound data
```

The runtime may still impose limits:

```text
max_steps
max_call_depth
max_loop_iterations
max_mcp_calls
max_state_size
max_trace_events
max_output_size
timeout_ms
```

Turing-complete does not mean unrestricted. It means Alan can express general computation while preserving a suspendable, traceable and policy-aware runtime.

## 5. Source syntax overview

A program begins with a version declaration and optional imports:

```alan
alan 0.1

use std.core
use std.text
use std.list
use std.map
use std.time
use std.trace
use std.policy
use std.mcp
use pkg.github
```

### 5.1 Internal functions

```alan
fn summarize results
  titles = call list.map items=$results fn="title"
  text = call text.join items=$titles sep="\n"
  return text=$text
end
```

Internal functions are called with `call`:

```alan
summary = call summarize results=$results
```

### 5.2 Internal verbs

A `verb` is an internal function whose name is action-oriented. In v0.1, `fn` and `verb` may have the same runtime semantics; `verb` is a readability and intent marker.

```alan
verb normalize_document doc
  title = call text.trim value=$doc.title
  body = call text.trim value=$doc.body
  return doc={ title: $title, body: $body }
end
```

### 5.3 External MCP capabilities

External capabilities are declared with `extern`:

```alan
extern github.search
  kind tool
  effect read_only
  data public
  policy P1
  input { q: string }
  output { results: list }
end
```

Sensitive or side-effecting capabilities must carry stronger policy metadata:

```alan
extern github.stage_patch
  kind tool
  effect repository_write
  data public
  policy P4
  mode staged_only
  input { repo: string, path: string, patch: Patch }
  output { proposal: PatchProposal }
end
```

The source-level invocation is:

```alan
proposal = mcp github.stage_patch repo=$repo path=$path patch=$patch
```

This does not imply execution. It means the runtime must resolve policy, potentially suspend, and preserve mediation and trace requirements.

## 6. Minimal instructions

Alan v0.1 should support:

```text
assign
call
mcp
if
while
return
fail
emit
use
extern
fn
verb
package
export
```

Examples:

```alan
x = 1
name = "Alan"

if empty($results)
  return status="no_result"
else
  summary = call summarize results=$results
  return status="ok" summary=$summary
end

while lt($i, 10)
  emit tick i=$i
  i = call num.add a=$i b=1
end
```

## 7. Minimal datatypes

### 7.1 Scalars

```text
null
bool
int
float
decimal
string
symbol
```

### 7.2 Collections

```text
list
map
record
set
```

### 7.3 Time values

```text
date
time
datetime
duration
```

### 7.4 Result values

```text
option
result
error
```

Recommended representation:

```alan
return ok={ value: $x }
```

or:

```alan
return err={ code: "not_found", message: "Missing file" }
```

### 7.5 References

```text
ref
doc_ref
step_result_ref
trace_ref
capability_ref
mandate_ref
responsibility_ref
```

Alan should prefer references over large embedded payloads when possible.

### 7.6 Operational records

Alan v0.1 should define records or schemas for:

```text
Document
Patch
Diff
Issue
PullRequest
Repository
Capability
PolicyResolution
AuthorizationRequest
AuthorizationResponse
StepResult
TraceEvent
Suspension
Mandate
ResponsibilityChain
```

Accounting-oriented records should be added or left explicitly possible:

```text
ComputeBudget
ComputeCost
CostBearer
BudgetRef
AntiGamingPolicy

```

## 8. Standard library v0.1

The standard library should remain small and predictable.

### 8.1 std.core

```text
eq ne lt le gt ge
not and or
type_of is_null is_empty coalesce
```

### 8.2 std.num

```text
add sub mul div mod min max abs round
```

### 8.3 std.text

```text
trim lower upper contains starts_with ends_with
replace split join substring match format slug
```

### 8.4 std.list

```text
len first last get append map filter reduce sort unique take drop contains
```

### 8.5 std.map

```text
keys values get set has merge remove pick omit
```

### 8.6 std.json

```text
parse stringify get_path set_path validate schema_check
```

### 8.7 std.time

```text
now date datetime duration add_duration before after format_time
```

### 8.8 std.doc

```text
title body frontmatter extract_headings extract_links
summarize normalize chunk diff patch apply_patch_preview
```

`apply_patch_preview` must not modify anything. It returns a proposal.

### 8.9 std.trace

```text
emit link parent hash event branch audit_ref
```

### 8.10 std.policy

```text
classify_effect classify_data resolve
requires_authorization requires_human_review requires_mandate is_forbidden
```

### 8.11 std.mcp

```text
describe capability request result resume suspend
```

These helpers inspect or build protocol objects. They do not bypass the `mcp` runtime semantics.

### 8.12 std.pkg

```text
import version capabilities exports
```

## 9. Packages

Alan supports package imports:

```alan
use pkg.github@0.1
use pkg.corpus@0.1
use pkg.cop@0.1
```

A package may export verbs, functions and extern capabilities:

```alan
package pkg.corpus 0.1

export verb normalize_document
export extern corpus.search
export extern corpus.read_private

verb normalize_document doc
  title = call text.trim value=$doc.title
  body = call text.trim value=$doc.body
  return doc={ title: $title, body: $body }
end

extern corpus.read_private
  kind tool
  effect private_data_access
  data private
  policy P3
end
```

Initial priority packages:

```text
pkg.github
pkg.corpus
pkg.cop
```

Later specialized packages may include:

```text
pkg.inox
pkg.gmail
pkg.calendar
pkg.legal
pkg.finance
pkg.geo
pkg.energy
pkg.museum
```

## 10. Semantics of `mcp`

The form:

```alan
x = mcp capability key=value
```

is compiled as a suspendable effect.

Runtime steps:

```text
1. Resolve capability.
2. Classify effect_class.
3. Classify data_sensitivity.
4. Resolve policy P0-P5.
5. If the operation cannot safely complete, produce a suspension.
6. Save local state.
7. Save resume_point.
8. Emit trace.
9. Resume later from caller-supplied step_result.
```

### 10.1 P1 public read

```alan
results = mcp github.search q=$query
```

Possible suspension:

```json
{
  "type": "alan.suspension",
  "reason": "caller_tool_call_required",
  "policy": { "level": "P1" },
  "pending_call": {
    "capability": "github.search",
    "input": { "q": "Alan MCP" }
  },
  "resume_point": "main:after_mcp_001",
  "trace": {
    "caller_mediated": true,
    "direct_invocation_by_alan": false,
    "execution_performed": false
  }
}
```

### 10.2 P3 private read

```alan
doc = mcp corpus.read_private doc_ref=$doc_ref scope={ summary: true }
```

Must require authorization and usually human review, mandate and responsibility metadata.

### 10.3 P4 staged side effect

```alan
proposal = mcp github.stage_patch path=$path patch=$patch
```

Must be staged-only in the MVP. It may create a proposal, not execute a write.

### 10.4 P5 forbidden

```alan
result = mcp github.delete_file path=$path
```

Must fail or suspend into refusal. It must not execute.

## 11. Runtime values

Alan runtime should produce and consume these protocol-level values:

```text
alan.value
alan.suspension
alan.step_result
alan.failure
alan.terminal
```

### 11.1 Suspension

```json
{
  "type": "alan.suspension",
  "suspension_id": "susp-001",
  "reason": "caller_tool_call_required",
  "resume_point": "main:after_mcp_001",
  "saved_state_ref": "state-001",
  "pending_call": {
    "capability": "github.search",
    "input": { "q": "Alan MCP" }
  }
}
```

### 11.2 Step result

```json
{
  "type": "alan.step_result",
  "step_result_id": "step-result-001",
  "for_suspension": "susp-001",
  "supplied_by": "caller",
  "value": { "results": [] },
  "trace": {
    "caller_mediated": true,
    "direct_invocation_by_alan": false,
    "execution_performed": false
  }
}
```

### 11.3 Resume

Resume means:

```text
load resume_point
restore saved state
bind suspended variable to supplied step_result value
continue execution
```

## 12. Canonical JSON AST

Alan Text is the authoring form. Alan JSON AST is the validation form.

Source:

```alan
fn main query
  results = mcp github.search q=$query
  return results=$results
end
```

AST:

```json
{
  "type": "alan.program",
  "version": "0.1",
  "uses": ["std.core", "std.mcp"],
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

## 13. Example: read-only MCP search

```alan
alan 0.1

use std.core
use std.text
use std.list
use std.doc
use std.mcp
use pkg.github

extern github.search
  kind tool
  effect read_only
  data public
  policy P1
end

fn main query
  results = mcp github.search q=$query

  if empty($results)
    return status="no_result"
  end

  summary = call summarize_results results=$results
  return status="ok" summary=$summary
end

fn summarize_results results
  titles = call list.map items=$results fn="title"
  text = call text.join items=$titles sep="\n"
  return text=$text
end
```

## 14. Example: staged repository write

```alan
alan 0.1

use std.doc
use std.policy
use std.mcp
use pkg.github

extern github.stage_patch
  kind tool
  effect repository_write
  data public
  policy P4
  mode staged_only
end

fn improve_readme path old_body new_body
  patch = call doc.diff old=$old_body new=$new_body
  proposal = mcp github.stage_patch path=$path patch=$patch
  return proposal=$proposal
end
```

This program looks direct, but `github.stage_patch` is P4. Alan must not write. The caller mediates and the trace must prove `execution_performed=false`.

## 15. Example: private read with reduced scope

```alan
alan 0.1

use std.doc
use std.mcp
use pkg.corpus

extern corpus.read_private
  kind tool
  effect private_data_access
  data private
  policy P3
end

fn summarize_private_doc doc_ref
  doc = mcp corpus.read_private doc_ref=$doc_ref scope={ summary: true, body: false }
  summary = call doc.summarize doc=$doc
  return summary=$summary
end
```

If the caller authorizes only metadata and summary, the step result must not contain `full_body`, secrets, credentials or forbidden fields.

## 16. Relationship to MCP, COP and Inox

```text
MCP exposes capabilities.
Alan orchestrates in direct style.
Alan runtime suspends and resumes.
The caller mediates invocation.
Inox may execute small bounded machines.
COP preserves trace and accountability.
```

Alan decides the continuation path. MCP exposes external verbs. The caller holds the hand. COP records responsibility. Inox may execute bounded machines only when explicitly authorized.

## 17. Non-goals for v0.1

Alan v0.1 is not:

```text
a general shell
a replacement for Python
a direct execution engine for side effects
a way for an LLM to own credentials
a bypass of MCP policy or caller mediation
```

Alan v0.1 is a script language for MCP workflows with direct-style syntax, resumable runtime effects and accountable traces.

## 18. Stabilized concept

```text
Alan is a Turing-complete direct-style MCP scripting language.

It lets LLMs write simple programs with internal functions, verbs, packages and external MCP capabilities.

Internally, every MCP operation is treated as a policy-aware resumable effect.

When the operation cannot safely complete immediately, the runtime returns a serializable suspension.

The caller mediates the external world.

Alan resumes from supplied results.

COP preserves the trace.

Authorization is not execution.
Tool availability is not authorization.
```

Final short formula:

```text
Alan: direct-style scripts, resumable MCP effects, accountable continuations.
```
