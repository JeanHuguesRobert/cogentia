---
title: Coding-agent brief — implement and evaluate Alan v0.2 incrementally
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
  origin_ref: 78b4408
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

# Coding-agent brief — Alan v0.2

**Repository:** `JeanHuguesRobert/cogentia` · **Work item:** [#36](https://github.com/JeanHuguesRobert/cogentia/issues/36).

**Status:** implementation brief for a future coding task, not a claim the runtime exists. Follow the current mandate and [AGENTS.shared.md](../instructions/AGENTS.shared.md); first inspect the canonical [Alan specification](alan_turing_mcp.md), [implementation plan](alan_turing_mcp_implementation_plan.md) and [tiny LLM-facing syntax card](alan_syntax_card.md).

## Mission

Prove whether Alan can become an **executable pseudocode surface** that LLMs generate with very little instructional context. Begin with a strict parser, discriminated JSON AST, validator and deterministic reference executor. Later implement suspend/resume; only after agreement with the reference semantics explore Alan→Inox compilation. Use **JavaScript/TypeScript**, not Python by habit.

## Minimum first slice

1. Parse one `alan 0.2` source defining `fn main`, bindings, pure `call`, `if`, `return` and source locations.
2. Validate undeclared or malformed operations, types/Boolean conditions and named argument signatures.
3. Execute pure examples (`classify`, `count_to`) deterministically under a bounded budget.
4. Implement a test harness with expected ASTs and terminal results, plus negative tests.
5. Report exact passing tests, supported grammar and unsupported features; no claim of MCP execution or portability.

## Subsequent semantic slice

Support `extern`, an `mcp` instruction that **suspends** without invoking anything, serialized frames and resume points, caller-provided `alan.step_result`, trace/mandate/budget references, typed result/failure, and replay handling. A nested internal function must be able to suspend transitively. Preserve the distinction between message/work-order semantics and local calls. The language must not silently turn a declared capability into an authorized real effect.

## Inox backend (later, not MVP)

Lower canonical Alan AST to a tiny definition-oriented Inox IR, then construct named blocks of executable Cells. Prefer a minimal assembler/direct Cell builder rather than compiling general Inox syntax; test both the compiled definitions and image ABI consistency against the reference JS run loop. Compare reference-JS and Inox results, including suspension/resumption, through differential tests. Any claim that code or live state travels to another process/host requires a measured test with a relocatable state representation, not merely successful execution on one VM.

## Quality gate

The primary evaluation is **LLM cost per verified working program**, including all syntax/documentation prompt tokens, compiler diagnostics, retries and repairs. Compare a cold Alan prompt using only the tiny syntax card and relevant signatures with direct Inox and a familiar JS subset. Avoid a growing collection of in-prompt examples as a substitute for learning. Keep the output of the coding task, validated test evidence and packet continuation linked to #36.

## Explicit exclusions

Do not implement full Python or JavaScript; do not invent unversioned library functions; do not use `l9.nox` as a prerequisite for the first interpreter; do not implement speculative `send`/`commission` syntax; do not run external MCP effects or acquire secrets; do not declare an untested Inox transport format portable.
