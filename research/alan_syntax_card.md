---
title: Alan v0.2 — minimal LLM syntax card
author: Jean Hugues Noël Robert
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: unknown
language: en
status: working-paper
last_modified_at: '2026-11-23'
date: '2026-11-22'
document_role: derived
document_kind: reference
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: research/alan_turing_mcp.md
  origin_date: '2026-11-22'
  derived_from: [research/alan_turing_mcp.md]
review:
  status: unreviewed
  reviewed_by: []
---

# Alan 0.2 — tiny authoring card (experimental JS interpreter subset)

**Use only declared functions/capabilities.** Alan is executable pseudocode, not Python/JavaScript. One statement per line. Close `fn`, `if`, `while`, `extern` with `end`. Use `#` comments. Conditions must be Boolean. Do not invent verbs or assume MCP executes directly.

```text
alan 0.2
use std.num                         # libraries explicitly declared
fn main input                       # named parameters
  x = 1                             # assign/update local
  y = call num.add a=$x b=2         # internal/library call
  high = call num.gt a=$y b=2       # explicit comparison
  if $high                          # Boolean variable, not truthiness
    return status="ok" value=$y    # terminal record
  else
    return status="low"
  end
end
```

Core forms: `x = VALUE`; `x = call known.function arg=VALUE`; `x = mcp known.capability arg=VALUE`; `if BOOL ... else ... end`; `while BOOL ... end`; `return key=VALUE`; `fail code="..."`; `emit event key=VALUE`; `fn name args ... end`; `extern capability ... end`.

Values: `null`, `true`, `false`, numbers, JSON-quoted strings, `[]`, `{ key: VALUE }`, `$variable`, `$record.field`. No infix expressions or implicit conversions. For loops, update the Boolean variable in the body. External `mcp` requests suspend until a caller supplies an authorized result; they are not direct host calls.

For a program requiring an external tool, declare its signature and effect:

```text
extern github.search
  kind tool
  effect read_only
  data public
  policy P1
  input { q: string }
  output { results: list }
end
```

**Experimental Side slots and reusable results:** the interpreter assigns each
slot an ordinal in the program's deterministic execution order (`0,1,2,...`).
The optional `cache max_age_ms=60000` declaration configures a **separate
result cache**, keyed by capability and arguments: it may fill a newly
allocated slot without an MCP request. Cache expiry **never** invalidates
slots already filled. Explicit `restart` at slot `i` discards all later
slots and re-executes from the beginning using the preceding slots in order.
Normal `resume` continues from the saved instruction.

The caller supplies an evaluation UTC time at cache lookup/resume, plus
an acquisition time for a supplied cacheable result. This expiry clock is
separate from frozen `logical_time`, exposed through `use std.time` and
`call time.injected_time`. Frozen time does **not** by itself establish an
external historical snapshot. See
[cache-ttl.alan](../tools/alan-lang/examples/cache-ttl.alan).

**Compiler/runtime responsibility:** validate source against known signatures, parse to Alan AST, preserve effect mediation and serializable continuations; compilation to Inox is a planned backend, not a feature of this syntax card. Full contract: [Alan specification](alan_turing_mcp.md).
