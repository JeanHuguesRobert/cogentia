---
title: Alan — implementation and experimental validation plan (v0.2)
author: Jean Hugues Noël Robert
date: '2026-06-26'
last_modified_at: '2026-11-22'
version: '0.2'
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 463b7c8
  origin_date: '2026-06-26'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
classification_source: cogentia.js
classification_version: '1'
classification_rule: explicit-metadata
classification_confidence: medium
---

# Alan — implementation and validation plan (design v0.2)

This replaces the unimplemented v0.1 implementation proposal. **No Alan runtime/compiler is known to exist** at this revision. The governing source is [Alan specification](alan_turing_mcp.md), the agent-oriented [minimal syntax card](alan_syntax_card.md) is its deliberately small prompt projection, and the existing packet/issue is [Cogentia #36](https://github.com/JeanHuguesRobert/cogentia/issues/36).

## Objective and testable hypothesis

**Hypothesis:** a strict pseudocode language assembled from familiar algorithmic concepts can reduce the total LLM context + generation + repair cost relative to generating Inox directly, while retaining deterministic validation, resumable effects, and eventual efficient Inox execution.

A successful compiler alone does not prove this hypothesis. Measure cold-prompt generations, token use (including documentation/examples), compile/run success, repairs, and semantic correctness. The benchmarks must include a familiar JavaScript subset as a baseline; Alan is not presumed to win.

## Semantic invariants

- Alan Text → discriminated Alan JSON AST → execution; no NLP repair of source errors.
- `call` is internal computation; `mcp` is an external request, possibly suspended. Nested calls can transitively suspend.
- Requests, effect authorization, execution receipts and packet closure are distinct.
- Work orders/messages/deliveries are distinct from synchronous calls; speculative syntax is **not** part of v0.2.
- A continuation can restore a program at a stable logical point, including nested call frames, with correlation and validated step results.
- Accounting binds compute to budget, bearer, mandate and trace; do not infer authority from the availability of a tool.
- Inox target is planned; do not claim binary portability or process/host resumption until tests prove them.

## Suggested structure (not yet created)

```text
tools/alan-lang/
  grammar.js                    # strict line/block parser
  ast.js                        # discriminated AST nodes and locations
  validate.js                   # names, signatures, effects, types
  run-reference.js              # pure JS reference interpreter
  suspend-resume.js             # effects, frames and packet correlation
  stdlib.js                     # explicit versioned signatures
  cli.js
  examples/
  tests/
  benchmarks/
  inox-backend/                 # only after semantic baseline passes
trace/schemas/
  alan.program.v0_2.schema.json
  alan.suspension.v0_2.schema.json
  alan.step_result.v0_2.schema.json
```

Do not generate all of these merely to satisfy a directory checklist. Add the smallest complete slices and use existing schema conventions when compatible.

## Phase A — tiny syntax, AST, validation

1. Freeze the brief [syntax card](alan_syntax_card.md) and core constructs in spec §4; prohibit implicit Python/JS semantics.
2. Define a **discriminated** JSON AST so a literal record containing `ref` is not confused with an AST reference.
3. Implement strict parser and validator: source location, version, symbol lookup, signature arity, duplicate/missing named arguments, Boolean conditions, nested lists/records, typed failures.
4. Conformance tests cover positive examples from spec §15 plus malformed programs, unknown words, nested blocks, and literal/reference ambiguity.
5. AST must round-trip to a canonical representation; the compiler never guesses missing declarations.

Acceptance: parser produces a stable AST or a machine-readable diagnostic without LLM interpretation.

## Phase B — pure reference executor

Implement assignment, `call`, functions, frames, recursion, `if`, `while`, `return`, `fail` and `emit` in JavaScript. Limit steps, depth, memory and output in the execution profile; the limits do not change the language's general expressive intent. Version standard-library functions and classify any nondeterministic input as an effect or injected value.

Acceptance: run deterministic programs with known reference outputs, including scope, recursion, finite loops and error paths. No external tools or credentials.

## Phase C — simulated MCP suspension and resume

Introduce `extern`, `mcp`, `alan.suspension`, `alan.step_result`, `alan.failure`, `alan.terminal`. **All external requests suspend** in this phase. The caller, not Alan, supplies a correlated result, refusal or explicit next state. Preserve code identity, frames, locals, pending binding, mandate/budget references, packet ID and COP trace correlation. Reject stale/mismatched results and prevent replay from duplicating a receipted effect.

Test at least: P1 public search; private-read scope reduction; P4 staged patch proposal; refusal; nested internal call suspended across MCP; repeated suspension; invalid continuation version; resume into a different JS process from serialized state. Never claim that a staged patch performs a repository write.

Acceptance: a caller-independent, resumable computation yields a deterministic terminal outcome or a typed next suspension, with trace and accounting metadata intact.

## Phase D — minimal-prompt generation benchmark

Create 10–20 small, diverse task specifications without Alan syntax examples embedded. Compare:

1. Alan with **only the minimal syntax card and relevant capability signatures**;
2. Alan with a longer tutorial (diagnostic/control group);
3. direct Inox with a matched, accurately counted context budget;
4. an established JavaScript subset with its ordinary test harness.

Measure prompt tokens including documentation, output tokens, validation attempts, successful runs, repair turns, total inference cost and semantic correctness. Avoid grading by stylistic resemblance. Record each model/version and evaluation inputs so outcomes can be repeated. Compare across multiple tasks; do not optimize the grammar solely for one LLM's quirks.

Acceptance: evidence that justifies (or rejects) Alan's existence as a lower-Judgement authoring surface.

## Phase E — Alan → Inox compiler

Only after A–C establish the semantics, compile the **same canonical AST** to a small stable subset of Inox. Initially use textual `.nox` and execute through the working minimal CLI; do not require `l9.nox` classes/threads. Stack/slot translation, lexical frame conventions and deterministic control flow belong to the compiler. Treat `mcp` as a continuation boundary with an explicit host interface, not an Inox primitive silently authorized to perform an effect.

Differential tests must match reference JS and Inox results for data, failures, suspensions, resume points and output; not just success-path arithmetic. Avoid depending on undocumented Inox memory addresses or JavaScript engine references.

Acceptance: an Alan program compiles to Inox and reproduces the reference semantics for a bounded test suite.

## Phase F — portable execution and Fractanet

Specify a relocatable artifact contract: code hash, runtime profile, symbols/constants, logical continuation, capability imports and references. Test serialization/resumption first across separate Node/Inox processes on one machine, then across nodes. Code may be transported once and cached by content address; state and mandate references travel separately. Runtime profile, import availability and independently applicable authority must be resolved at destination.

Acceptance: same semantic result and intact packet/COP causal history after a genuine change of runtime process, then host. Timing/performance improvements and network savings must be measured, not assumed.

## Out of scope for this plan

Full JS/Python semantics; complete OO runtime; moving an arbitrary live Unix process; arbitrary remote RPC disguised as `call`; real side-effect execution by Alan; acquiring or distributing credentials; new per-operation mandate ceremonies; full `l9.nox` repair.

## Documentation and workflow

Maintain the canonical spec, tiny syntax card, benchmark corpus and implementation tests together. Record deviations and outcomes in cognitive packet linked to #36. Do not copy historical v0.1 examples into prompts as if they were valid v0.2 syntax. Changes to the user-facing grammar must be reflected in the syntax card and machine conformance tests. Publish precise status: **specified / parsed / interpreted / compiled / portable / deployed** are distinct states.
