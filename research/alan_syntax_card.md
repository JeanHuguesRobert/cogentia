---
title: Alan v0.2 — minimal LLM syntax card
author: Jean Hugues Noël Robert
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
---

# Alan 0.2 — tiny authoring card (design, not implemented)

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

**Compiler/runtime responsibility:** validate source against known signatures, parse to Alan AST, preserve effect mediation and serializable continuations; compilation to Inox is a planned backend, not a feature of this syntax card. Full contract: [Alan specification](alan_turing_mcp.md).
