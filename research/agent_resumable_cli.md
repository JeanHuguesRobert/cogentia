---

title: "Agent-Resumable CLI"
subtitle: "Externalized Judgment, Continuations, and Provider-Neutral Resumption for AI-Compatible Command-Line Tools"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-05-14"
status: "Working paper"
license: "CC BY-SA 4.0 for text; MIT for associated code"
spdx: "CC-BY-SA-4.0"
canonical_project: "[https://github.com/JeanHuguesRobert/cogentia](https://github.com/JeanHuguesRobert/cogentia)"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/agent_resumable_cli.md
last_stamped_at: 2026-05-16
---
--------------------------------------------------------------------------------------------------------------

# Agent-Resumable CLI

## Externalized Judgment, Continuations, and Provider-Neutral Resumption for AI-Compatible Command-Line Tools

**Jean Hugues Noël Robert, baron Mariani**
Institut Mariani / C.O.R.S.I.C.A.
1 cours Paoli, F-20250 Corte, Corsica

*Working paper — May 2026*

---

## Abstract

Command-line tools increasingly operate in environments where artificial agents can assist with classification, repair, summarization, prioritization, and other forms of semantic judgment. The most common integration path is to embed an AI API client inside the tool. This creates provider coupling, API-key dependency, hidden reasoning, fragile reproducibility, and unclear accountability.

This paper proposes **Agent-Resumable CLI**, a continuation-inspired design pattern and protocol for AI-compatible command-line tools. Instead of calling an AI model directly, a CLI tool emits a structured **continuation object** whenever it reaches a point where external judgment is required. The surrounding caller — human, AI agent, shell script, workflow engine, or future digital twin — supplies a structured `step_result`. The tool validates the result and resumes execution. Alternatives embedded in the continuation define an explicit search space and allow auditable backtracking. Constraints such as urgency, importance, risk, budget, reversibility, and skin in the game make prioritization and accountability explicit.

The paper separates two layers. First, it defines the general principle and protocol: a cross-process, serialized, agent-addressable continuation for CLI tools, inspired by `call/cc` but adapted to Unix-like process boundaries and semantic judgment. Second, it presents a concrete use case: the integration of continuations into the **Cogentia Commons CLI** (`cogentia.js`) for distributed knowledge production across GitHub repositories.

The proposal is not an invention ex nihilo. It synthesizes continuations and continuation-passing style, pattern-language design, workflow callback mechanisms, human-in-the-loop systems, agent tool protocols, and Unix-style composability. Its contribution is to make judgment explicit, typed, resumable, auditable, provider-neutral, and accountable in ordinary CLI tools.

---

## Keywords

AI agents; command-line interfaces; continuations; `call/cc`; continuation-passing style; human-in-the-loop; workflow resumption; tool protocols; Model Context Protocol; Agent2Agent; auditability; provider neutrality; Cogentia Commons; second method; distributed knowledge production.

---

# Part I — The General Principle

<!-- BEGIN_AUTO: trails -->
> 🧭 **Trail: From Method to Machine**
> ⬅️ Previous: [The Sovereign Digital Twin](cogentia-digital-twin.md) | ➡️ Next: [Agent Navigation Guide](../docs/agent_context_server.md)

<!-- END_AUTO: trails -->

## 1. Introduction

The command line remains one of the most durable interfaces in computing. It is composable, scriptable, automatable, inspectable, and compatible with many forms of orchestration. It is also increasingly becoming the natural execution surface for AI agents: agents read files, run tests, inspect repositories, call tools, propose changes, and invoke command-line programs.

Yet ordinary CLI tools were not designed for semantic collaboration. They can accept arguments, read input, transform files, and emit results. They can fail with exit codes. They can ask interactive questions. But they rarely expose a structured way to say:

> I have reached a point where deterministic computation is insufficient.
> I need judgment.
> Here is the context.
> Here are the alternatives.
> Here are the constraints.
> Here is the schema of the answer I need.
> Resume me when that judgment has been supplied.

The common solution is to embed an AI API call inside the CLI tool. This is expedient but architecturally weak. The tool becomes dependent on a provider, a model, a network call, a credential, and an implicit prompt. Reasoning becomes hidden inside the implementation. Testing becomes harder. Offline use degrades. Human substitution becomes inconvenient. Auditability becomes partial. The tool ceases to be a simple tool and becomes an opaque AI application.

Agent-Resumable CLI proposes a different approach.

The tool does not call the model. It emits a continuation.

The missing judgment is externalized as a typed protocol object. The surrounding system performs the judgment and resumes the tool with a structured `step_result`.

This produces an inversion of control:

```text
Embedded-AI CLI:
CLI tool → AI API → internal decision → continues

Agent-Resumable CLI:
CLI tool → continuation → external judgment → step_result → resumes
```

The pattern makes AI support optional, provider-neutral, human-compatible, and auditable.

## 2. Core Thesis

The core thesis is simple:

> AI-native CLI tools should expose continuation points, not AI dependencies.

A continuation is not a prompt. It is a typed protocol object representing a suspended computation whose missing input is judgment.

The corresponding design rule is:

> Do not hide judgment inside the tool. Expose the place where judgment is missing.

This rule has three consequences.

First, the CLI remains deterministic except at explicit continuation points.

Second, the external judge is replaceable. It may be Claude, ChatGPT, Gemini, a local model, a script, a human operator, a CI system, or a future digital twin.

Third, the reasoning boundary becomes inspectable. The tool asked for a structured decision. The caller supplied one. The tool resumed after validation. The event can be logged, replayed, challenged, and improved.

## 3. Intellectual Lineage and Prior Art

Agent-Resumable CLI belongs to several traditions. The proposal should be understood as a synthesis rather than a claim of isolated novelty.

### 3.1 Pattern Languages

The form of the proposal follows the pattern-language tradition. Christopher Alexander and collaborators introduced architectural patterns as reusable descriptions of recurring design problems and their living resolutions. The Gang of Four adapted this tradition to object-oriented software design, popularizing named patterns such as Strategy, Command, State, and Memento.

Agent-Resumable CLI is best classified as a behavioral and architectural pattern. It combines elements of Command, Strategy, State, Memento, Chain of Responsibility, and Template Method, but operates across process boundaries rather than inside an object-oriented runtime.

### 3.2 Continuations, Continuation-Passing Style, and Promises

The deeper technical ancestry is continuation-oriented programming. A continuation represents “the rest of the computation.” In Scheme, `call/cc` captures the current continuation as a first-class value. Work by Gerald Jay Sussman and Guy L. Steele Jr. on Scheme, and by John C. Reynolds on definitional interpreters and continuations, provides the conceptual foundation for treating control flow as an explicit object.

Agent-Resumable CLI does not capture an actual in-memory runtime continuation. It serializes a cross-process continuation point. The runtime stack is not preserved. Instead, the tool records enough state, context, alternatives, and expected result schema to resume safely after external judgment.

Thus:

> `call/cc` captures the rest of a computation inside a runtime.
> Agent-Resumable CLI exports the next unresolved judgment across a process boundary.

There is also a useful similarity with the concept of a **Promise** in asynchronous programming.

A Promise represents a value that is not available yet, but may be fulfilled or rejected later. An Agent-Resumable CLI continuation similarly represents an unfinished computation that cannot proceed until something external is supplied.

However, the missing element is different:

```text
Promise:
  computation waits for a future value or failure

Agent-Resumable CLI continuation:
  computation waits for external judgment, branch selection, validation, or failure report
```

The analogy is useful because both constructs decouple the producer of a request from the future availability of the required answer. But an Agent-Resumable CLI continuation is richer than a Promise in three ways.

First, it is **explicitly resumable across process boundaries**. A Promise usually lives inside one runtime or event loop. A CLI continuation can be serialized, transmitted, inspected, signed, committed, discarded, or answered by another process.

Second, it is **schema-bearing**. It does not merely await any value. It declares the expected result schema, alternatives, constraints, and accountability fields.

Third, it is **judgment-bearing**. The missing value may require semantic reasoning, prioritization, accountability, or backtracking, not merely completion of an asynchronous operation.

A concise distinction is:

> A Promise waits for a value.
> A continuation waits for judgment.
> A resumable CLI continuation waits for typed, accountable judgment across a process boundary.

### 3.3 Workflow Engines and Callback Patterns

Workflow systems already implement pause-and-resume semantics. AWS Step Functions callback tasks pause a workflow until a task token is returned. Temporal supports durable workflows, signals, queries, and human-in-the-loop AI workflows. CI/CD systems often include manual approval gates.

These systems prove that resumption, external events, and long-running state are operationally mature ideas. However, they usually require an orchestration platform. Agent-Resumable CLI reduces the principle to a lightweight convention usable by ordinary command-line tools:

```text
a JSON continuation + a resume command
```

The aim is not to replace workflow engines. It is to provide a minimal protocol surface for tools that should be resumable without becoming workflow platforms.

### 3.4 Human-in-the-Loop Systems

Human-in-the-loop systems pause when human approval, correction, or judgment is required. This is essential for high-stakes AI systems. Agent-Resumable CLI generalizes this idea: the external judge may be human, artificial, scripted, or collective. The important point is not that a human always intervenes. The important point is that the decision point is explicit and accountable.

### 3.5 Agent Tool Protocols

Recent AI tool protocols normalize explicit agent-tool interfaces. The Model Context Protocol defines a standard way for LLM applications to connect to external tools and data sources. Google’s Agent2Agent protocol addresses task-oriented collaboration between agents, including messages and artifacts. OpenAI’s Agents SDK describes tools, handoffs, and orchestration between agents.

Agent-Resumable CLI is adjacent but inverted.

Most agent-tool protocols ask:

```text
How can an agent call a tool?
```

Agent-Resumable CLI asks:

```text
How can a tool call back to the surrounding intelligence without depending on a provider?
```

This inversion is the pattern’s distinctive contribution.

### 3.6 Unix and CLI Composability

The Unix tradition favors small tools, explicit streams, composability, and predictable interfaces. Agent-Resumable CLI preserves this tradition. It does not require every tool to become a service. It does not require every tool to embed an agent. It lets ordinary CLI tools expose structured continuation points while remaining scriptable and inspectable.

Classic Unix tools exchange data. Agent-Resumable CLI tools exchange unresolved judgment points.

## 4. Problem Statement

A CLI tool may encounter a decision that is not reducible to deterministic computation. Examples include:

* classifying whether a file is generated or source material;
* deciding whether an error should trigger retry, rollback, patch, or abort;
* converting an informal objection into a falsifiable claim;
* selecting among repair strategies;
* prioritizing a queue of tasks under budget constraints;
* detecting whether a document contradicts a corpus;
* deciding whether a destructive action requires human acceptance;
* interpreting a failed branch and selecting another.

Without a structured continuation protocol, the tool has four weak options.

First, it can fail and ask the user to rerun with flags. This loses state and context.

Second, it can prompt interactively. This is not suitable for agentic automation, CI, or non-interactive environments.

Third, it can embed an AI API call. This creates provider dependency and hidden reasoning.

Fourth, it can make a default decision. This may be unsafe, wasteful, or epistemically dishonest.

The missing option is explicit suspension and resumption.

## 5. Design Forces

The pattern balances the following forces.

| Force               | Requirement                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| Determinism         | The CLI should remain reproducible except at explicit judgment points. |
| Intelligence        | Some decisions require semantic or heuristic reasoning.                |
| Provider neutrality | The tool should not depend on one AI provider.                         |
| Auditability        | Every decision should be inspectable and replayable.                   |
| Composability       | The interface should work with scripts, agents, humans, and CI.        |
| Backtracking        | Failed branches should be recorded and alternatives preserved.         |
| Budgeting           | Not all decisions justify the same cost or delay.                      |
| Accountability      | Constraints without skin in the game are incomplete.                   |
| Safety              | Destructive or irreversible actions require stronger validation.       |

## 6. Stateless and Stateful Forms of the Protocol

The Agent-Resumable CLI protocol has two valid forms.

The first is **stateful**: the tool stores continuation state locally, for example under `.tool/continuations/` or `.cogentia/continuations/`, and later resumes from an identifier.

The second is **stateless**: the tool writes nothing to disk. It behaves like a function. It receives an input object and returns an output object. That output may be a final result, a continuation, or a partial result with a continuation. The caller is then responsible for deciding whether to persist the trace, replay it, discard it, sign it, commit it to Git, or feed it to another agent.

The stateless form is conceptually cleaner. It separates the protocol from storage and audit policy.

```text
stateful form:
tool(input) → continuation_id stored by tool
caller(step_result) → tool resumes from local state

stateless form:
tool(input, optional_state) → result | continuation | partial_result + continuation
caller owns trace, state, audit, replay, persistence
```

In the stateless form, a continuation should be self-contained enough to be resumed without trusting hidden local state. If sensitive or large state must be omitted, the continuation may include hashes, references, or opaque state tokens, but the tool should still avoid hidden side effects.

This distinction is important. Agent-Resumable CLI is not primarily a storage protocol. It is a control-flow and judgment protocol. Persistence is an implementation choice.

## 6.1 Pure Functional Shape

The pure form is:

```text
run(input) → output
```

Where `output` belongs to one of three classes:

```text
final_result
continuation
partial_result + continuation
```

A final result:

```json
{
  "type": "result",
  "status": "success",
  "data": {}
}
```

A continuation:

```json
{
  "type": "continuation",
  "protocol": "agent_resumable_cli.v1",
  "id": "c-001",
  "task": "choose_strategy",
  "context": {},
  "alternatives": [],
  "constraints": {},
  "expected_result_schema": {}
}
```

A partial result with continuation:

```json
{
  "type": "partial_result",
  "status": "incomplete",
  "data": {
    "completed_steps": ["scan", "classify_deterministic_files"],
    "findings": []
  },
  "continuation": {
    "type": "continuation",
    "protocol": "agent_resumable_cli.v1",
    "id": "c-002",
    "task": "classify_ambiguous_files",
    "context": {},
    "alternatives": [],
    "constraints": {},
    "expected_result_schema": {}
  }
}
```

The resumed call is also functional:

```text
run({ previous_output, step_result }) → output
```

or, more explicitly:

```json
{
  "type": "resume_request",
  "previous_output": {},
  "step_result": {}
}
```

The tool does not need to remember anything. The caller provides the previous continuation and the step result.

## 6.2 Caller-Owned Trace

In the stateless model, the caller owns the trace.

The caller may choose to store:

* every input;
* every output;
* every continuation;
* every step result;
* every failed branch;
* every resumed call;
* every final result.

But this is not required by the tool. The tool is composable because it does not impose a storage policy.

This allows multiple caller strategies:

```text
human operator        → copy/paste continuation and step_result
AI agent wrapper      → keep trace in memory
CI pipeline           → store trace as artifact
Git-based corpus      → commit selected trace records
workflow engine       → store trace in its own durable state
privacy-sensitive run → discard trace after completion
```

The protocol therefore becomes compatible with both maximal auditability and deliberate ephemerality.

## 6.3 Relation Between Stateless and Stateful Implementations

A stateful CLI can be built on top of a stateless core.

Recommended architecture:

```text
pure core:
  evaluate(input) → output

stateful adapter:
  load state
  call evaluate(input)
  save continuation/audit if desired
  print output
```

This keeps the protocol clean and makes the tool easier to test.

The reference package should therefore expose pure functions first, and storage adapters second.

```text
Level 1 — Pure protocol functions
Level 2 — Optional storage adapters
Level 3 — Optional CLI command helpers
```

This prevents `cogentia.js` or any other compliant tool from confusing resumption with filesystem persistence.

## 7. The Agent-Resumable CLI Protocol

The minimal protocol has four main object types:

1. `result`
2. `continuation`
3. `step_result`
4. `failure` or `backtrack` report

### 6.1 Result

A normal result indicates that the tool has completed without needing external judgment.

```json
{
  "type": "result",
  "status": "success",
  "data": {}
}
```

### 6.2 Continuation

A continuation indicates that the tool has suspended execution and requires external judgment.

```json
{
  "type": "continuation",
  "protocol": "agent_resumable_cli.v1",
  "id": "c-001",
  "task": "choose_strategy",
  "reason": "semantic_decision_required",
  "context": {
    "goal": "Resolve dependency conflict",
    "error": "Package version mismatch"
  },
  "alternatives": [
    {
      "id": "upgrade",
      "description": "Upgrade the dependency."
    },
    {
      "id": "downgrade",
      "description": "Downgrade the dependent package."
    },
    {
      "id": "patch",
      "description": "Patch the import manually."
    }
  ],
  "constraints": {
    "urgency": "normal",
    "importance": "high",
    "risk": "medium",
    "reversibility": "medium",
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
  },
  "expected_result_schema": {
    "chosen_alternative": "string",
    "reason": "string",
    "confidence": "number"
  },
  "resume": {
    "command": "tool continuation resume c-001 --step-result result.json"
  },
  "audit": {
    "created_at": "2026-05-14T00:00:00Z",
    "source_command": "tool run input.json",
    "workspace": "."
  }
}
```

### 6.3 Step Result

A step result supplies the missing judgment.

```json
{
  "type": "step_result",
  "continuation_id": "c-001",
  "status": "success",
  "chosen_alternative": "patch",
  "result": {},
  "reason": "The package is abandoned and upgrading would create wider breakage.",
  "confidence": 0.78,
  "constraints_checked": true,
  "skin_in_the_game_checked": true
}
```

### 6.4 Failure and Backtracking

If a branch fails, the failure must be reported explicitly.

```json
{
  "type": "step_result",
  "continuation_id": "c-001",
  "status": "failed",
  "failed_alternative": "upgrade",
  "reason": "No compatible version exists for the current runtime.",
  "recoverable": true,
  "suggested_next_action": "backtrack"
}
```

The CLI records the failed branch and emits or preserves a continuation with remaining alternatives.

```json
{
  "failed_alternatives": [
    {
      "id": "upgrade",
      "reason": "No compatible version exists for the current runtime.",
      "failed_at": "2026-05-14T00:00:00Z"
    }
  ]
}
```

Backtracking is not hidden retry. It is structured memory of failed possibility.

## 7. Constraints, Budgets, and Criticality

A continuation should carry constraints. These constraints define not only what must be decided, but how the decision should be prioritized.

The central fields are:

* `deadline`: when the answer is needed;
* `urgency`: how quickly it must be handled;
* `importance`: how much the outcome matters;
* `risk`: what damage may occur if the decision is wrong;
* `reversibility`: whether the resulting action can be undone;
* `budget`: how much time, money, compute, token use, or human attention may be spent;
* `skin_in_the_game`: who bears the cost, liability, or reputational consequence;
* `criticality`: the combined operational priority.

A useful approximation is:

```text
criticality = urgency × importance × risk × irreversibility × accountability_gap
```

This need not be a numerical formula. Its purpose is to prevent false priority. An urgent but low-importance task should not consume deep reasoning. A high-importance but non-urgent task may deserve careful review. A high-urgency, high-risk, irreversible task with no accountable cost-bearer should trigger suspicion or explicit acceptance.

The crucial addition is skin in the game:

> A constraint without skin in the game is incomplete.

A constraint that says “urgent” but does not say who pays for being wrong is not a complete operational constraint. It is pressure without accountability.

## 8. Validation and Safety

A tool must not blindly resume from arbitrary input. Before resumption, it should validate:

* the continuation ID;
* that the continuation exists and is not expired, aborted, or already completed;
* that the selected alternative exists and remains available;
* that the `step_result` matches the expected schema;
* that constraints have not been violated;
* that required human acceptance exists when needed;
* that failed alternatives are recorded;
* that the workspace and source command match expected context;
* that destructive operations are explicitly authorized.

Continuations should avoid secrets. Where necessary, state should be hashed, signed, or stored separately. Old continuations should expire. Audit logs should record every lifecycle event.

## 9. Lifecycle

The minimal lifecycle is:

```text
created → inspected → resumed | failed | aborted → completed
```

A more complete lifecycle may include:

```text
created → queued → prioritized → inspected → branch_selected → resumed → completed
created → queued → inspected → branch_failed → backtracked → resumed → completed
created → inspected → needs_acceptance → accepted → resumed → completed
created → inspected → aborted
```

The important point is that the lifecycle is explicit. Nothing important happens in an invisible prompt or hidden API call.

## 10. Significant Improvement Over Prior Art

Agent-Resumable CLI does not claim that continuations, workflows, callback tasks, or human-in-the-loop systems are new. They are not.

The improvement is the synthesis.

### 10.1 From Embedded AI to Externalized Judgment

The tool no longer depends on an embedded AI client. It exposes the missing judgment and waits for a structured answer.

### 10.2 From Prompt to Protocol Object

The continuation is not a natural-language prompt. It is a typed object with context, alternatives, schema, constraints, accountability, and resume metadata.

### 10.3 From Tool Calling to Tool-Initiated Resumption

Existing agent frameworks emphasize agent-to-tool calls. Agent-Resumable CLI emphasizes tool-to-agent continuation requests. This is the inversion of control.

### 10.4 From Linear Automation to Backtracking

Alternatives turn a continuation into a search node. Failures are recorded, not erased. The tool can continue from another branch without losing the epistemic record.

### 10.5 From Heavy Orchestration to CLI Minimalism

Workflow engines provide durable execution at platform scale. Agent-Resumable CLI provides a small convention usable by ordinary tools and Git repositories.

### 10.6 From Vague Priority to Accountable Criticality

Urgency, importance, risk, reversibility, budget, and skin in the game make prioritization inspectable. The protocol resists false urgency and irresponsible delegation.

---

# Part II — Cogentia Commons as a Concrete Use Case

## 11. Cogentia Commons: Context

Cogentia is a framework for distributed knowledge production under AI conditions. It is described as a protocol, an operational CLI, a component inside the wider `inseme` platform, and a set of open specifications. It is not a product, not a SaaS, not a vendor, and not provider-locked.

Cogentia’s operating environment is Git-based knowledge production. Repositories contain research documents, indexes, objections, revisions, canonical URLs, and cross-references. The corpus is not merely a publication output; it is the evidentiary substrate. The git history is part of the proof.

The current `cogentia.js` CLI is described as infrastructure for traceable, auditable, AI-connectable distributed knowledge production across git repositories. It maintains repository registries, supports `research/index.md`, scans markdown files, flags unreferenced work, generates cross-reference graphs, validates links, and stamps canonical URLs. It is implemented as a zero-dependency Node.js CLI under the MIT license.

This makes Cogentia a natural testbed for Agent-Resumable CLI.

## 12. Why Cogentia Needs Continuations

Cogentia already performs deterministic work well. It can scan, check, list, stamp, and graph. But distributed knowledge production also requires semantic judgments:

* Is an objection falsifiable or merely a feeling of certainty?
* Which document should anchor an unreferenced claim?
* Does a new text contradict the existing corpus?
* Which revision should respond to which objection?
* Is a claim sufficiently sourced?
* Should a contribution be marked as informational, substantive, objection, revision, or continuation?
* Which unresolved possibility deserves priority?
* Does a proposed action require human acceptance?

These are not ordinary CLI decisions. They require judgment. But embedding a vendor-specific AI API inside `cogentia.js` would contradict the Cogentia principle of provider neutrality.

The correct architecture is therefore continuation-based.

## 13. Cogentia Continuation as a Typed Object

In Cogentia, a continuation should include:

```json
{
  "type": "continuation",
  "protocol": "cogentia.continuation.v1",
  "id": "cogentia-c-001",
  "task": "convert_objection",
  "reason": "falsifiability_conversion_required",
  "context": {
    "repository": "barons-Mariani",
    "document": "research/example.md",
    "claim_or_objection": "This seems unrealistic.",
    "method_rule": "second_method.rule_2"
  },
  "alternatives": [
    {
      "id": "convert_to_falsifiable_claim",
      "description": "Transform the objection into a testable claim."
    },
    {
      "id": "mark_as_unfalsifiable",
      "description": "Preserve the objection as a feeling of certainty, marked accordingly."
    },
    {
      "id": "request_more_context",
      "description": "Ask for sources, calculation, or evidence needed to convert the objection."
    }
  ],
  "constraints": {
    "urgency": "normal",
    "importance": "high",
    "risk": "medium",
    "reversibility": "high",
    "budget": {
      "max_tokens": 3000,
      "max_wall_time_seconds": 120,
      "human_review_required": false
    },
    "skin_in_the_game": {
      "accountable_party": "contributor",
      "beneficiary": "corpus_readers",
      "cost_bearer": "maintainer_attention",
      "reputation_bearer": "contributor",
      "requires_explicit_acceptance": false
    },
    "criticality": "medium_high"
  },
  "expected_result_schema": {
    "chosen_alternative": "string",
    "converted_claim": "string|null",
    "mark": "string|null",
    "reason": "string",
    "confidence": "number"
  },
  "resume": {
    "command": "node scripts/cogentia.js continuation resume cogentia-c-001 --step-result result.json"
  }
}
```

This object is answerable by Claude, ChatGPT, a human reviewer, a script, or a future Cogentia agent. That is the soundness test:

> Can the current AI provider be replaced without modifying `cogentia.js`?

If yes, the protocol is sound. If no, the protocol is contaminated.

## 14. Suggested Cogentia CLI Surface

The continuation support should be additive. Existing commands such as `scan`, `status`, `graph`, `check`, `stamp`, and `corpus-status` should not be broken.

A minimal command surface may be:

```bash
node scripts/cogentia.js continuation emit <task-file>
node scripts/cogentia.js continuation inspect <id>
node scripts/cogentia.js continuation resume <id> --step-result <result.json>
node scripts/cogentia.js continuation fail <id> --branch <branch-id> --reason "<reason>"
node scripts/cogentia.js continuation queue
node scripts/cogentia.js continuation abort <id>
```

Additional commands may include:

```bash
node scripts/cogentia.js continuation prioritize
node scripts/cogentia.js continuation validate <id>
node scripts/cogentia.js continuation export <id>
node scripts/cogentia.js continuation log <id>
```

## 15. Storage Model

For Git-based auditability, continuations may be stored under:

```text
.cogentia/continuations/
```

or, for research-grade public continuation records:

```text
research/continuations/
```

A practical split is:

```text
.cogentia/continuations/      local operational state
research/continuations/       public, selected, research-grade continuation records
```

This prevents every transient operational event from polluting the public corpus, while allowing significant continuations to become part of the research record.

## 16. Cogentia and the Second Method

The second method defines several rules relevant to this protocol.

### Rule 1 — Publish the process, not only the result

Continuations publish the process of judgment. They show where a tool stopped, what it asked, what alternatives existed, who answered, and how the tool resumed.

### Rule 2 — Make every objection a first-class contribution

A continuation can operationalize objection handling. An objection that is not yet falsifiable can be marked, converted, preserved, or escalated. It is not erased.

### Rule 3 — Structure for machine readability from the start

The continuation is machine-readable by design. It contains stable identifiers, schemas, constraints, and explicit resume metadata.

### Rule 4 — Let the corpus be its own evidence

A continuation-aware `cogentia.js` can demonstrate the method on its own corpus. Its own decisions, failures, backtracks, and revisions become visible.

### Rule 0 — Encode the boundary in the architecture

Cogentia distinguishes epistemic participation from political governance. AI agents may participate in knowledge production. Living persons alone govern. Continuations support this distinction: an AI agent may supply judgment, but binding governance decisions require signed human accountability where relevant.

## 17. Cogentia Commons Governance Alignment

The Cogentia Commons community manifest already emphasizes accountability, validation contracts, event logs, non-retroactivity, revision semantics, and editor independence. Agent-Resumable CLI fits this model.

The continuation becomes one event type among others:

```text
ContinuationCreated
ContinuationInspected
ContinuationResumed
ContinuationFailed
ContinuationBacktracked
ContinuationAborted
ContinuationCompleted
```

Each event can be signed, attributed, and appended. Reversal happens by new event, not deletion. Failure is part of the record.

This aligns with the Cogentia principle:

> Knowledge by contestation, not by consensus.
> Accountability by attribution, not by gatekeeping.
> Continuation by replaceable agents, signed by living humans.

## 18. Example Use Case: Unanchored Claim

Suppose `cogentia.js scan` detects a markdown document not referenced in `research/index.md`.

The deterministic tool can report the file. But a semantic question remains:

```text
Is this document research-grade, draft material, operational note, obsolete fragment, or private working debris?
```

Instead of guessing, `cogentia.js` emits a continuation:

```json
{
  "type": "continuation",
  "protocol": "cogentia.continuation.v1",
  "id": "cogentia-unanchored-001",
  "task": "classify_unanchored_markdown",
  "context": {
    "file": "research/agent_resumable_cli.md",
    "detected_by": "scan",
    "current_index": "research/index.md"
  },
  "alternatives": [
    {
      "id": "add_to_index",
      "description": "The file is research-grade and should be referenced in research/index.md."
    },
    {
      "id": "mark_as_draft",
      "description": "The file is useful but not ready for research/index.md."
    },
    {
      "id": "ignore_with_reason",
      "description": "The file is intentionally outside the research corpus."
    }
  ],
  "expected_result_schema": {
    "chosen_alternative": "string",
    "index_entry": "string|null",
    "reason": "string",
    "confidence": "number"
  }
}
```

The external agent returns:

```json
{
  "type": "step_result",
  "continuation_id": "cogentia-unanchored-001",
  "status": "success",
  "chosen_alternative": "add_to_index",
  "result": {
    "index_entry": "- [Agent-Resumable CLI](agent_resumable_cli.md) — Continuation protocol for provider-neutral AI-compatible command-line tools."
  },
  "reason": "The document defines a reusable protocol and should be part of the research corpus.",
  "confidence": 0.91,
  "constraints_checked": true,
  "skin_in_the_game_checked": true
}
```

`cogentia.js` validates the result and either proposes or applies the index update.

## 19. Example Use Case: Falsifiability Conversion

A contributor submits:

```text
This proposal seems unrealistic.
```

The second method requires conversion. The CLI emits:

```json
{
  "type": "continuation",
  "protocol": "cogentia.continuation.v1",
  "id": "cogentia-falsifiability-001",
  "task": "falsifiability_conversion",
  "context": {
    "raw_objection": "This proposal seems unrealistic.",
    "target_document": "research/agent_resumable_cli.md",
    "method_rule": "second_method.rule_2"
  },
  "alternatives": [
    {
      "id": "convert",
      "description": "Convert the feeling into a falsifiable objection."
    },
    {
      "id": "mark_unfalsifiable",
      "description": "Preserve the objection as a feeling of certainty."
    },
    {
      "id": "request_specifics",
      "description": "Ask the contributor what evidence would settle the objection."
    }
  ]
}
```

A compliant agent should not simply agree or disagree. It must return a structured judgment, such as:

```json
{
  "type": "step_result",
  "continuation_id": "cogentia-falsifiability-001",
  "status": "success",
  "chosen_alternative": "request_specifics",
  "result": {
    "question": "Which specific claim is unrealistic, and what measurement, implementation test, or prior art comparison would falsify it?"
  },
  "reason": "The objection lacks a testable predicate and cannot yet be converted without more context.",
  "confidence": 0.86,
  "constraints_checked": true,
  "skin_in_the_game_checked": true
}
```

## 20. Why `cogentia.js` Is a Better Fourth Artefact than a Pure Schema

A standalone JSON schema would be useful. However, for this project, the stronger fourth artefact is an actual CLI implementation.

The publication package should therefore consist of:

1. an academic article defining the principle and protocol;
2. a user prompt for agents or humans operating compliant tools;
3. a designer prompt for authors of compliant CLI commands;
4. `cogentia.js` as the living reference implementation inside Cogentia Commons.

A schema can later be extracted from practice. This preserves the second-method requirement that the corpus and tooling demonstrate the method rather than merely declaring it.

## 21. Limitations

Agent-Resumable CLI introduces its own risks.

First, continuation schemas may be poorly designed. A vague continuation is just a prompt in disguise.

Second, serialized state may leak context or secrets. Continuations must distinguish public context from private state.

Third, malicious or careless callers may return invalid `step_result` objects. Validation is mandatory.

Fourth, backtracking can become combinatorially expensive if alternatives are unconstrained.

Fifth, constraints can be gamed. This is why skin in the game is required.

Sixth, provider neutrality may be contaminated by subtle vendor-specific fields. The replacement test must remain binding.

Seventh, Git-based auditability does not automatically solve governance. It makes governance inspectable; it does not make it just.

## 22. Evaluation Criteria

A tool claiming compatibility with Agent-Resumable CLI should satisfy the following tests.

### 22.1 Replacement Test

Can the external judge be replaced without modifying the CLI?

### 22.2 Schema Test

Does the continuation define a clear expected result schema?

### 22.3 Backtracking Test

Can failed alternatives be recorded and avoided in later attempts?

### 22.4 Accountability Test

Does the continuation identify who benefits and who bears costs, liability, and reputational consequences?

### 22.5 Budget Test

Does the continuation constrain time, compute, money, or attention where relevant?

### 22.6 Resumption Test

Can the CLI validate a `step_result` and resume without hidden state corruption?

### 22.7 Audit Test

Can an observer reconstruct what happened, why, and under whose responsibility?

### 22.8 Second-Method Test

Does the tool publish the process, make objections first-class, structure for machine readability, and let the corpus demonstrate the claim?

## 23. Conclusion

Agent-Resumable CLI proposes a small architectural shift with large consequences.

Instead of embedding AI calls inside command-line tools, tools emit typed continuations. The continuation exposes the missing judgment, alternatives, constraints, accountability, and resumption metadata. An external agent or human supplies a structured `step_result`. The tool validates and resumes.

The pattern is inspired by continuations and `call/cc`, but it is not merely a programming-language construct. It is a cross-process protocol for provider-neutral, auditable, resumable judgment in CLI tools.

Cogentia Commons provides a natural implementation context because it already treats the corpus, git history, objections, revisions, and machine readability as central to knowledge production under AI conditions. Adding continuations to `cogentia.js` turns the pattern into executable doctrine.

The final principle is compact:

> A continuation is a suspended computation whose missing input is not merely data, but judgment.

And the operational rule follows:

> A compliant CLI does not hide judgment. It exposes judgment as a continuation, constrains it, assigns accountability, validates the response, records the decision, and resumes.

---

## References

Alexander, C., Ishikawa, S., Silverstein, M., et al. (1977). *A Pattern Language: Towns, Buildings, Construction*. Oxford University Press.

Amazon Web Services. *Discover service integration patterns in Step Functions*. AWS Step Functions documentation. [https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html](https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html)

Anthropic. (2024). *Introducing the Model Context Protocol*. [https://www.anthropic.com/news/model-context-protocol](https://www.anthropic.com/news/model-context-protocol)

Anthropic / Model Context Protocol. (2025). *Specification*. [https://modelcontextprotocol.io/specification/2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)

Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley.

Google Developers Blog. (2025). *Announcing the Agent2Agent Protocol*. [https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)

OpenAI. *Agents SDK: Agents, tools, handoffs, and orchestration*. [https://developers.openai.com/api/docs/guides/agents](https://developers.openai.com/api/docs/guides/agents)

Reynolds, J. C. (1972/1998). *Definitional Interpreters for Higher-Order Programming Languages*. Higher-Order and Symbolic Computation, 11, 363–397.

Reynolds, J. C. (1993). *The Discoveries of Continuations*. Lisp and Symbolic Computation, 6, 233–248.

Robert, J. H. N. (2026). *Discours de la seconde méthode*. Institut Mariani / C.O.R.S.I.C.A. [https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md)

Robert, J. H. N. (2026). *Cogentia*. [https://github.com/JeanHuguesRobert/cogentia/blob/main/COGENTIA.md](https://github.com/JeanHuguesRobert/cogentia/blob/main/COGENTIA.md)

Robert, J. H. N. (2026). *cogentia.js — Cogentia Commons CLI*. [https://github.com/JeanHuguesRobert/cogentia/blob/main/scripts/cogentia.js](https://github.com/JeanHuguesRobert/cogentia/blob/main/scripts/cogentia.js)

Robert, J. H. N. (2026). *Cogentia Commons Community Manifest*. [https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_commons_community_manifest.md](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_commons_community_manifest.md)

Sussman, G. J., & Steele, G. L. Jr. (1975). *Scheme: An Interpreter for Extended Lambda Calculus*. MIT AI Memo 349. [https://dspace.mit.edu/handle/1721.1/5794](https://dspace.mit.edu/handle/1721.1/5794)

Temporal. (2026). *Human-in-the-Loop AI Agent*. Temporal documentation. [https://docs.temporal.io/ai-cookbook/human-in-the-loop-python](https://docs.temporal.io/ai-cookbook/human-in-the-loop-python)

Temporal. (2025). *Building Durable AI Applications: Human in the Loop*. [https://learn.temporal.io/tutorials/ai/building-durable-ai-applications/human-in-the-loop/](https://learn.temporal.io/tutorials/ai/building-durable-ai-applications/human-in-the-loop/)

---

## Appendix A — Minimal Continuation Compliance Checklist

A CLI command is continuation-compatible if it:

* emits typed continuation objects;
* includes explicit task and context;
* includes alternatives when branches exist;
* includes constraints for non-trivial decisions;
* includes skin in the game for consequential decisions;
* defines an expected result schema;
* provides a resume command;
* validates resumed input;
* records audit history;
* supports failure reporting;
* supports backtracking where relevant;
* remains usable without a specific AI provider.

## Appendix B — Minimal User Rule

Read the continuation.
Respect the schema.
Respect the constraints.
Identify accountability.
Return structured judgment.
Preserve the possibility of resumption.

## Appendix C — Minimal Designer Rule

A compliant CLI does not hide judgment. It exposes judgment as a continuation, constrains it, assigns accountability, validates the response, records the decision, and resumes.


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Corpus Status — cogentia](corpus-status.md)
- [Research Index — Cogentia](index.md)
- [Agent-Resumable CLI](agent_resumable_cli.md)

<!-- END_AUTO: backlinks -->
