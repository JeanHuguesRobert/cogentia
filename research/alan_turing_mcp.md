---
title: Alan — familiar algorithmic notation, accountable continuations, portable execution (design v0.2)
author: Jean Hugues Noël Robert
status: working-paper
date: '2026-06-26'
last_modified_at: '2026-11-22'
version: '0.2'
document_role: source
document_kind: research-paper
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 5275ff2
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

# Alan — executable pseudocode for agents (design v0.2)

> **Founding question:** What is the smallest algorithmic notation that a contemporary LLM can understand and write almost spontaneously, without receiving a large language manual in every context, and that a deterministic compiler can validate and execute?
>
> **Question fondatrice :** Quelle est la notation algorithmique minimale que les LLM comprennent presque spontanément et que nous pouvons rendre rigoureusement exécutable ?

**Status (2026-11-22):** normative *design proposal*, not an implemented language or deployed runtime. This revision deliberately supersedes the unimplemented v0.1 design at this path. There is **no installed Alan codebase or compatibility obligation**. Existing research, especially [Packet/Continuation Machine](packet_continuation_machine.md), remains the architectural source for cooperative work. Work is tracked in [Cogentia #36](https://github.com/JeanHuguesRobert/cogentia/issues/36) and its cognitive packet.

## 1. Purpose and criterion of success

Alan is **strict, executable pseudocode** for agents and humans: a small direct-style language expressing computations and requests for capabilities, with explicit resumable operational semantics. Its first design priority is **LLM familiarity per token of context**, not syntactic originality or resemblance to any one existing programming language.

Alan deliberately recombines well-known constructs: named variables, functions, `if`, `while`, records, lists, `return`, named arguments, tool requests, and result values. In contrast, the runtime may implement the unfamiliar: serialized continuations, responsibility-bearing work packets, mandate/budget mediation and execution on an Inox VM.

Alan shall minimize the *total cognitive cost* of producing a correct program: prompt/context tokens + generation + repairs + tests. Fewer source characters alone do not establish efficiency. A generated program must be mechanically checked; a believable-looking pseudocode fragment is not sufficient.

**Boundary:** Alan is not free-form natural-language pseudocode; no inference of missing steps, invented primitives or ambiguous control flow at runtime. It is not a Python/JavaScript compatibility layer, a shell, or a direct privilege-bearing tool executor.

## 2. Remix as a design method

The design uses **common references as an interface**, not as a restriction on the underlying computation. Prefer the smallest familiar notation sufficient to express a concept over a new syntactic invention. Do not imitate all of Python, C or JavaScript: their historical semantics and libraries are not the objective.

A compiler must own translation; the LLM must not have to memorize Inox stack effects, cell tags, actor layouts or control-stack conventions. Source familiarity is a means to reduce Judgement required for automatic program synthesis. The ultimate test is whether an agent can generate a working Alan program from a short task and a short tool/capability signature, **without a large in-context example corpus**.

A semantic concept may be new although its lexical components are familiar. In particular, an apparent source-level `mcp` request is *not* equivalent to an ordinary synchronous local call.

## 3. Four distinct representations

1. **Alan Text:** compact, readable, direct-style authoring language; preferential input to LLMs.
2. **Alan AST:** canonical structured representation (JSON in the initial profile), parsed and validated without Judgement. AST is a contract, not the original source text.
3. **Alan execution model:** resumable state machine; request effects, suspension, policy and trace remain explicit regardless of backend.
4. **Execution targets:** a simple JavaScript reference interpreter for experiments, and **Inox as an intended portable compilation target**, not a presently operational compiler. A stable Inox transport format and resumable VM support still require design and implementation.

A backend must preserve observable semantics; it may optimize implementation choices. A local call, a message, a work order, and a remote delivery are **not interchangeable** merely because they share a return-like syntax.

## 4. Text grammar: small, strict, familiar

The following is the **minimal proposed v0.2 core**. It is intentionally narrower than general-purpose pseudocode. Keywords are ASCII and case-sensitive. Newlines terminate statements except inside balanced literal lists/records. `#` starts a line comment. Indentation improves readability but does not determine scope; `end` closes blocks. No implicit variable declarations, coercions, global mutable environment or operator precedence are assumed.

```alan
alan 0.2
use std.core
use std.num
use std.mcp

extern github.search
  kind tool
  effect read_only
  data public
  policy P1
  input { q: string }
  output { results: list }
end

fn main query
  results = mcp github.search q=$query
  missing = call core.empty value=$results
  if $missing
    return status="empty" results=[]
  else
    return status="ok" results=$results
  end
end
```

### 4.1 Statement forms

```text
alan VERSION                        # file header
use QUALIFIED_NAME                  # declared library/package reference
extern QUALIFIED_NAME ... end       # external capability metadata
fn NAME [NAME ...] ... end          # function, lexical parameter names
verb NAME [NAME ...] ... end        # action-oriented alias of fn
NAME = VALUE                       # assign/update a local binding
NAME = call QUALIFIED_NAME [ARG=VALUE ...]
NAME = mcp QUALIFIED_NAME [ARG=VALUE ...]
if VALUE ... [else ...] end
while VALUE ... end
emit NAME [ARG=VALUE ...]           # attributable trace event
return [ARG=VALUE ...]              # one record value; ends this call
fail code=VALUE [message=VALUE]     # controlled failure; ends this call
```

A standalone `call` or `mcp` is possible when its result is deliberately discarded, but the compiler still records its effects. `fn` and `verb` have identical execution semantics in the core; `verb` is an intent/readability marker. `extern` declares a requirement and a claimed effect classification, **not** an authority grant. Function and external capability names reside in distinct namespaces; ambiguity is an error.

### 4.2 Values and expressions

To keep parsing and validation predictable, the v0.2 core has **no general infix expression grammar**. A `VALUE` is exactly one of: `null`, `true`, `false`, JSON-style number, quoted UTF-8 string, literal list, literal record with named fields, or a local reference `$name` with optional static field path (`$message.priority`). Nested literal values and references are allowed. References are resolved at runtime, not interpolated into source code. Escaping follows JSON strings.

Conditions in `if` and `while` must evaluate to a Boolean; there is no truthiness. Arithmetic, comparison, membership and collection operations use **named pure functions** such as `num.add`, `num.lt`, `text.contains`, `list.length`, and `map.get`. The precise library signatures are versioned contracts, not names the compiler may guess. Subscripts, closures, dynamic `eval`, exception syntax, inheritance and implicit calls are outside this initial core.

```alan
n = 0
keep_going = true
while $keep_going
  emit tick count=$n
  n = call num.add a=$n b=1
  keep_going = call num.lt a=$n b=3
end
return count=$n
```

The Boolean is explicitly recomputed in the loop; no hidden expression re-evaluation occurs. Loops and recursion may be bounded at runtime without changing the expressive intent of the language.

### 4.3 Operational spelling rules

- A statement has one unambiguous operation; named arguments are unique and retain their declared names.
- Local bindings belong to the current call frame; reassignment is explicit (`x = ...`). No implicit mutation of another actor's state.
- `call` refers to a known internal function or library operation. Nested internal calls may themselves suspend when their body reaches an effect.
- `mcp` refers to a declared external capability, never a guessed or automatically executed tool.
- `return` builds a single record from named values; `fail` produces a typed failure.
- Unsupported syntax is rejected with a source location and a machine-readable error, not silently repaired by an LLM.

## 5. Value model

The minimal interoperable core includes `null`, Boolean, integer, finite float (when supported by the selected runtime profile), string, list and record/map. Large opaque values should normally be addressed by references rather than duplicated in a packet.

Runtime references can be qualified as `doc_ref`, `step_result_ref`, `trace_ref`, `capability_ref`, `mandate_ref`, `responsibility_ref`, `artifact_ref`, or `code_ref`. Their textual representation is data, not a raw pointer, credential or permission.

Option/result/error are explicit **tagged records** in the initial profile; they do not require a separate surface syntax. Dates, durations, decimals and binary data require declared, versioned libraries or target profiles. No transport format may silently depend on native JavaScript object identity or on internal Inox addresses.

## 6. Internal calls and ordinary computation

`call` executes an internal function or standard-library function. Source remains direct style: the author does not pass continuations manually. A compiler/interpreter maintains frames, bindings, the next statement and any pending call return binding. An internal function that transitively performs `mcp` can suspend the **whole computation**, including its logical call chain.

Pure library functions are deterministic for specified inputs and profiles. Nondeterminism (wall time, randomness, network, model inference, user input) must appear as a declared capability/effect or an explicitly versioned injected input, so replay and testing do not silently disagree.

## 7. External effects and MCP

```alan
results = mcp github.search q=$query
```

This is a **request for a capability**, not evidence of execution. Operationally, the runtime resolves the declared capability, classifies the intended act, consults applicable mandate/policy/budget, then either resolves the effect through a genuinely admitted path or produces a serializable suspension. For the first implementation, **all MCP operations suspend and the caller supplies their results**; there is no direct external invocation by Alan.

The caller may resume with a result, refusal, narrowed scope, need for human review, or controlled failure. Authorization, completion, timeout and delivery are different states. Tool existence is not authorization; an authorization is not an execution receipt.

## 8. Continuations and cognitive packets

A resumable computation must be representable independently of its current host process. The logical continuation carries or refers to:

- code identity (hash, Alan/AST/runtime profile and target version);
- execution point (function/step index), resumable call frames and local bindings;
- pending operation, its correlation identifier and expected result binding;
- references to artifacts, messages and dependencies rather than arbitrary host objects;
- packet/work identity, causal parentage, mandate and budget references, and COP trace correlation;
- a continuation version and integrity/provenance information.

A continuation is an **execution descriptor**, not a transfer of arbitrary authority. The receiving runtime resolves the applicable effective mandate and capabilities. Pausing/resuming must preserve the observable result; effects and charges already committed must not be repeated on replay without an explicit justified re-execution.

Typed protocol outputs include `alan.terminal`, `alan.suspension`, `alan.step_result`, `alan.failure`. A suspension can request `caller_tool_call_required`, `authorization_required`, `human_review_required`, `scope_reduction_required`, or another explicitly defined continuation outcome. The result may lead to another suspension rather than termination.

## 9. Responsibility, policy and accounting

Preserve the established Cogentia distinction between **capability, mandate, admission, effect and receipt**. An `extern` declaration describes the capability's expected effect class and data class; the runtime independently classifies the actual act and does not infer authority from the declaration. Existing policy classes P0–P5 may be used as classification metadata; they are not self-enforcing source annotations.

Budget belongs to a responsible bearer under a mandate and is attributable through COP. The principle remains:

```text
No compute without budget.
No budget without bearer.
No bearer without mandate.
No mandate without trace.
```

This does not require a separate external authorization ceremony for each local addition. Computation can be accounted for collectively under a valid bounded mandate. The minimal runtime records metering metadata; enforceable charging and CXU settlement are separate implementation milestones. A large compute spend does not establish truth or legitimacy. Replay, cache hits and validation costs must be attributed consistently rather than double-charged or presumed free.

## 10. Cooperation is not a remote function call

`call` is for internal computation. `mcp` is for an external capability request in v0.2. Distributed **messages**, **work orders**, **questions**, **revisions**, **partial/provisional/final deliveries** and **closures** have richer semantics than an RPC response. The [Packet/Continuation Machine](packet_continuation_machine.md) and [Locality Principle](locality_principle.md) govern this distinction.

A source-level convenience must not promise synchronous completion, exactly one response or shared memory across nodes. Syntax such as `send`, `receive`, `commission`, `on delivery` and `on question` remains **candidate future syntax**, not v0.2 grammar. First settle observable semantics and packet contracts; only then add surface keywords.

## 11. Canonical Alan JSON AST

Alan Text is for authors; the AST is for mechanical checking and backend compilation. It is **not** itself an authority or a runtime event. This example is the canonical AST shape for the first source example's effect and return path, illustrating a minimal program:

```json
{
  "type": "alan.program",
  "version": "0.2",
  "uses": ["std.mcp"],
  "externs": [
    {"name":"github.search","kind":"tool","effect":"read_only","data":"public","policy":"P1","input":{"q":"string"},"output":{"results":"list"}}
  ],
  "functions": [
    {"kind":"fn","name":"main","params":["query"],"body":[
      {"op":"mcp","bind":"results","capability":"github.search","args":{"q":{"kind":"reference","path":["query"]}}},
      {"op":"return","value":{"kind":"record","fields":{"results":{"kind":"reference","path":["results"]}}}}
    ]}
  ]
}
```

**AST value rule:** every value node is discriminated: `{"kind":"reference","path":["name"]}`, `{"kind":"literal","value":42}`, `{"kind":"list","items":[...]}` or `{"kind":"record","fields":{"key":...}}`. This keeps a literal user record with a field named `ref` distinct from a reference. AST definitions and runtime protocol objects must eventually be formalized as versioned JSON Schemas; the shape shown here is a proposed normative contract, not an implemented parser.

Core nodes have explicit operations and required fields. For `if`, use `condition`, `then_body`, and optional `else_body`; for `while`, `condition` and `body`; for internal calls, `callee`, `args` and optional `bind`. AST references are structural; no textual substitution of `$name` into tool input is allowed. Source locations and IDs may be attached for diagnostics and continuation stability.

## 12. Inox as a compilation target, not an authoring burden

The **Alan → Inox** compiler is a design objective, not an existing transpiler. Alan expressions map naturally to stack-machine operations; bindings to local slots; branches/loops to explicit control flow; resumable effects to suspension points with stable logical state. The compiler, not the LLM, owns Inox's postfix syntax, cell representations and calling conventions.

A portable Inox artifact should be versioned, self-describing and relogeable, separate from the source and from a host process memory dump. It may contain canonical instructions, constants, symbols, capability imports, metadata, a code hash and a compatible runtime profile. An actor's continuation travels **with or by reference to** the code plus its minimal logical state; it does not carry process-local JavaScript references, raw pointers or a full Unix address space.

The first backend may target either a restricted Inox assembly dialect or a direct structured Cell-definition builder, without traversing the rich Inox source parser; a binary/serialized cell image requires its own format contract. A VM executing a compiled program does not by itself imply resumable migration between processes: that must be tested independently. Do not assert performance or bytecode mobility before measurement. A JavaScript reference executor can serve as a differential semantic oracle during development.

### 12.1. A very small execution kernel: Cell + IP/TOS/CSP

The suitability of Inox as a portable target comes from the **small semantics of its interpreter loop**, not primarily from an optimizer. The current `lib/inox.ts` implementation's `run()` dispatches on the cell addressed by `IP`. Its three central execution registers are:

- `IP` — instruction pointer within the executable cell sequence;
- `TOS` — address of the current top of the data stack;
- `CSP` — address of the current top of the control/return stack.

With a conventional cell representation (type/name metadata plus value), the semantics of the fast interpreter can be sketched as follows. This is explanatory pseudocode, **not** a byte-for-byte implementation or an assertion that all runtime services are complete:

```text
while IP != 0:
    cell = memory[IP]
    if cell is the empty/end-of-word sentinel:
        IP = pop_return(CSP)
    else if cell.type == primitive:
        IP += 1
        invoke_primitive(cell.name)   # may change IP, TOS, CSP and memory
    else if cell.type == verb:
        push_return(CSP, IP + 1)
        IP = cell.value              # destination definition
    else:
        push_data(TOS, copy(cell))    # preserve Cell metadata/ref semantics
        IP += 1
```

There are **four branches**, not merely the literal/primitive dichotomy: the current implementation also handles verb calls and return sentinels. Its debug path and optimizations may handle tail calls, scope cleanup, instruction-credit scheduling and late-bound verbs specially. Such behavior must be preserved in the agreed VM profile or expressed through equivalent primitives; it is not additional Alan source syntax.

A small implementation in another host language can reproduce this loop once it implements the `Cell` data model, the two stacks, the three pointers and the referenced primitive semantics. This makes cross-platform portability plausible, but **the size of the dispatch loop is not the size of the whole VM**: references/ownership, memory management, primitive ABI, symbol resolution and any host capability mediation still have defined behavior. An actor's memory base, when present, is an address-space/context concern rather than a fourth fundamental execution register in this sketch.

For an Alan→Inox compiler, the resulting contract is a simple **target machine with explicit semantic operations**, not a demand that the LLM learn the target syntax. The portable execution profile should define how `Cell` types and names, instruction addresses, imports, references, primitive identifiers and return points are encoded and relocated; a raw in-process memory image does not automatically satisfy that contract.

A first conformance probe should run the *same* literal, primitive, nested-verb and return programs against the existing JavaScript Inox interpreter and a deliberately minimal second interpreter, then compare stack and register traces. After this, test a serialized continuation and later a cross-process/cross-host transfer. The objective is semantic portability and low implementation cost; performance claims require measurements.

### 12.2. Alan code generation need not invoke the full Inox source compiler

A central simplification is to separate **Inox source syntax** from **executable Inox definitions**. The existing JavaScript/TypeScript implementation already has the relevant mechanisms: `eval_definition_begin()`, `add_machine_code()`, `define_verb()`, and `eval_definition_end()` build named definitions as executable blocks of `Cell`. `eval_definition_end()` appends a return sentinel. The flexible Inox/Forth/Smalltalk-inspired parser, immediate words, special forms and syntax sugar are an *authoring layer*, not a prerequisite for executing these definitions.

Therefore the Alan compiler **does not have to generate general Inox source**, nor ask the full Inox parser to understand Alan. A preferred experimental path is:

```text
Alan Text --strict parse--> canonical Alan AST
  --deterministic lowering--> definition-oriented Inox IR
  --tiny Cell assembler--> named executable Cell blocks
  --image builder (when available)--> relocatable semantic image
  --minimal Inox VM--> execution
```

The **definition-oriented IR** needs only a bounded set of records such as `define(name)`, `literal(cell)`, `primitive(symbol)`, `verb(symbol)`, `label`, `branch`, and `end`. Labels, branches, local variables, effect suspension points and references are resolved by the Alan compiler or a deterministic linker; the tiny assembler only encodes cells, resolves declared symbols/imports and adds the appropriate return/termination form. It should not have to parse expressions, perform implicit type inference, invent control-flow semantics, or re-interpret the Alan language.

Illustrative assembly **design notation**, not current executable Inox syntax:

```text
define add_two
  literal integer 2
  primitive add
end                         # emit end-of-definition/return cell
```

This makes a definition with stack effect `(n -- n+2)` provided the `add` primitive accepts two integers. Its actual cell encoding, symbol identifier and relocation rules belong to the target execution profile.

There are at least two compatible build paths:

1. **Simple textual path:** emit a deliberately tiny, regular Inox assembly dialect for a thin loader/assembler. It is inspectable and easy to debug; it should not require Inox's rich source parser.
2. **Direct structured path:** emit canonical definition records or cell-assembly objects directly from the Alan AST, then link and serialize them into an image. In this path a textual Inox parser is unnecessary. The structured path may become canonical, with a textual dump for inspection.

Neither path implies a second general-purpose language. The assembler is a small deterministic **definition/image builder**. It can initially run on the JavaScript host; subsequently the same assembly operations can be implemented as Inox primitives/verbs and packaged in a precompiled image. This is the natural connection to **self-hosting/bootstrap** and the already documented [Inox Images, Lineages, Hibernation, and Wake](https://github.com/JeanHuguesRobert/Inox/blob/master/research/inox-images-lineages-and-hibernation.md) and [Inox micro-runtime and image format](https://github.com/JeanHuguesRobert/Inox/blob/master/research/inox-cpp-micro-runtime-and-images.md). A small VM may consume images without needing *any* source-language compiler.

**Concrete ABI discrepancy to resolve before an interoperable image is claimed:** the present `lib/inox.ts` interpreter treats the zero cell as **return from a verb** and dispatches primitives using a **name** field; the draft `inox-micro-v0` image specification describes `VOID` zero as a **no-op** and primitive ID in the **value** field. This is an actual semantic/encoding mismatch, not a difference in syntax sugar. The image profile, assembler, JS execution reference and portable VM must agree on return-cell behavior and primitive lookup, or explicitly version and translate between ABIs. The initial conformance suite must include nested verb return, primitive dispatch, literal tags, and symbolic relocation.

## 13. Standard library and capability signatures

The initial library should be small and regular, with **explicit signatures** available to both compiler and LLM. Candidate namespaces:

```text
std.core    equal, empty, not, and, or, length
std.num     add, sub, mul, div, lt, lte, gt, gte
std.text    concat, contains, trim, split, join
std.list    length, get, map_field, filter, append
std.map     get, put, has, keys
std.json    parse, stringify, validate
std.time    injected_time, parse, format
std.trace   emit
std.policy  describe, classify
std.mcp     metadata-only capability descriptors
```

These are **design candidates**, not claims that a runtime implements them. A compiler must reject an unrecognized name; it must not dynamically invent implementations. The minimal LLM context should contain only the task, the short core syntax card and the relevant signature list, not the whole specification. Library effects (including time and randomness) must be declared accurately.

## 14. Packages and reuse

`use std.num` or `use pkg.github` imports a **declared vocabulary and signature metadata**. Packages may include internal functions, types, schemas and capability descriptors. A package cannot silently acquire external authority; it must retain the same semantic effect classification and caller mediation as explicit code.

Canonical reusable programs should be identified by version/hash and accompanied by executable examples and conformance tests. Reuse should reduce context length and correction cycles rather than require inlining an ever-growing glossary into prompts.

## 15. Worked source examples

### 15.1 Deterministic choice

```alan
alan 0.2
use std.num

fn classify priority
  urgent = call num.gt a=$priority b=5
  if $urgent
    return route="urgent"
  else
    return route="normal"
  end
end
```

### 15.2 Suspend on an external capability

```alan
alan 0.2
use std.mcp

extern github.search
  kind tool
  effect read_only
  data public
  policy P1
  input { q: string }
  output { results: list }
end

fn main query
  results = mcp github.search q=$query
  return results=$results
end
```

The output is an `alan.suspension` before any tool execution. After the caller supplies a correlated `alan.step_result`, execution resumes and produces `alan.terminal`.

### 15.3 Controlled loop

```alan
alan 0.2
use std.num

fn count_to limit
  n = 0
  again = call num.lt a=$n b=$limit
  while $again
    n = call num.add a=$n b=1
    again = call num.lt a=$n b=$limit
  end
  return count=$n
end
```

### 15.4 Staged effect

```alan
alan 0.2
use std.mcp

extern github.stage_patch
  kind tool
  effect repository_write
  data public
  policy P4
  mode staged_only
  input { repo: string, path: string, patch: Patch }
  output { proposal: PatchProposal }
end

fn request_patch repo path patch
  proposal = mcp github.stage_patch repo=$repo path=$path patch=$patch
  return proposal=$proposal
end
```

The request does not constitute a repository write. A staged proposal and its eventual execution are distinct accountable acts.

## 16. Validation and failure semantics

The first implementation must fail explicitly on unknown keyword, name, signature, missing/duplicate argument, invalid Boolean condition, invalid field reference, unsupported literal, invalid external effect or incompatible runtime profile. Return typed diagnostics with line/column and relevant source/AST node. Reject accidental nondeterminism, dynamic code evaluation and implicit host interop in the core.

Compile-time checking must not be confused with actual effect authorization. Runtime failures include budget exhaustion, incompatible continuation version, missing referenced artifact, declined capability, malformed supplied result and mismatched correlation ID. Result schemas and continuation IDs must be validated before resumption; replay must be idempotent for already-receipted effects.

## 17. Empirical evaluation: context is part of the cost

A language designed for LLMs must be evaluated **with LLMs**, not just judged readable by its authors. A small benchmark shall compare direct Inox, a familiar JavaScript subset and Alan on identical tasks with identical allowed capabilities, including routing/classification, bounded loops, JSON processing and one suspend/resume workflow.

Record at least: input context tokens (including tutorials/examples), generated tokens, executable-program success rate, tool/compile attempts, repair cycles, runtime correctness, and cost per verified successful program. Test a **cold** model prompt with a tiny Alan syntax card and compare it with longer reference prompts. Include tasks requiring adaptation rather than verbatim imitation. The language should win by reducing total Judgement and maintenance cost, not by a predeclared outcome.

The compiler must pass conformance tests independent of the LLM. A reference executor and an Inox backend, when implemented, must agree on terminal values, failures, suspensions, effect requests and resumption order for the same canonical AST.

## 18. Scope, compatibility and roadmap

There is no deployed Alan runtime or installed base as of this revision. Therefore the grammar and AST can change deliberately without a backward-compatibility simulation. This document replaces the v0.1 proposal's loose examples and speculative surface features with an implementable **v0.2 design baseline**.

Implementation order is: (1) minimal source syntax card, grammar and discriminated JSON AST; (2) validator and pure JavaScript reference evaluator; (3) mocked MCP suspension/resume with COP correlations; (4) differential tests and LLM cost benchmark; (5) Alan→Inox subset compiler; (6) portable code-state/continuation tests, first across isolated processes, then across nodes. The first profile must not silently execute real external writes or request credentials.

Non-goals now: full Python/JS compatibility, complete OO system, universal distributed RPC, arbitrary running-process migration, executable host pointers, and a public promise of deployed capabilities.

## 19. Future actor/cooperative-work semantics (clarification, 2026-11-10)

Alan v0.2 retains the earlier **message-first, cooperative** distinction. One actor may serve multiple local lightweight work units; actors can share a host process without sharing logical authority. A durable agent is not necessarily a permanent Unix process, JS isolate or VM. Where a local direct dispatch faithfully preserves the observable message/work semantics, it may replace expensive physical transport. It must not collapse a negotiated work order into an ordinary blocking return.

A worker may ask questions, supply provisional or partial deliveries, revise, decline and eventually close a work relationship. The requester may continue other work rather than block. The network transports cognitive packets with explicit causal links and reconstructible continuations when required; local operations should use the cheapest admissible materialization, not serialize everything by default.

This section defines semantic constraints, **not** `spawn`, `send`, `receive`, `commission` or other new v0.2 parser keywords. See [Packet/Continuation Machine](packet_continuation_machine.md), [Locality Principle](locality_principle.md), [Cognitive Packet Closure](cognitive_packet_closure_and_packet_native_semantics.md), and [Inox / actor abstractions](https://github.com/JeanHuguesRobert/Inox/blob/master/research/fractanet_language_abstractions.md).
