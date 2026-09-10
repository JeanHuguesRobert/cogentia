---
title: "Navigation assistant: evaluate macro opportunity (judgment contract)"
date: 2026-09-10
status: intended
related:
  - "navigation_assistant_episode_hints.md"
  - "navigation_assistant_always_on_hold.md"
  - "../docs/navigation-assistant.md"
  - "../docs/continuations_and_cognitive_packets_for_agents.md"
  - "../skills/continuation-handling/SKILL.md"
---

# Evaluate the opportunity to create a macro

Bracket hints (`[` / `]`) mark that something nearby *might* be an episode.
They do not decide whether a **macro is worth proposing**. That second
question is **judgment**, not a threshold on event counts.

The journal is a structured but **obscure** behavioural trace (roles, ARIA,
field signatures, sequence numbers). A human can scan a short hint interval;
judging *reuse* across a long local JSONL is the kind of work that typically
needs an **AI agent as handler** — provided the contract is explicit.

## What this is not

- Not an always-on watcher that spends tokens on every page-focus.
- Not a hidden model call inside the TUI, the JSONL writer, or the gateway.
- Not authority to install, run, click, send, or publish a macro.
- Not a replacement for accessibility anchors (role, name, `data-testid`).

The TUI remains a **structural tool**. When the operator asks for this
evaluation, the tool **stops at the judgment boundary** and emits a
continuation (Cognitive Packet payload). A replaceable handler — human,
twin, or mandated agent — supplies a `step_result`. See
[`docs/continuations_and_cognitive_packets_for_agents.md`](../docs/continuations_and_cognitive_packets_for_agents.md)
and skill `continuation-handling` (`prepare_only`).

## Activation

**Off unless the operator turns it on.** Suggested TUI surface: an explicit
action (for example `[m]` “opportunité de macro”) or a session flag. No
background evaluation. Cost (tokens, attention, disclosure of the journal
slice) is in the budget envelope of that activation, not of ordinary
navigation.

## Contract (intended)

```text
id:              cogentia.navigation.macro-opportunity/v0
activation:      explicit operator
effect:          prepare_only
authority:       evaluate and propose; never execute
disclosure:      journal slice under the same URL-redaction policy as the TUI
transmission:    by reference (local jsonl path + sequence range) on this PC;
                 by copy (redacted event list) if the handler has no file access
```

### Inputs the packet must name

- Journal window: path of `.local/navigation-assistant-journal.jsonl` and
  `from_sequence` / `to_sequence` (or an embedded redacted copy).
- Optional hint events (`recording-started` / `recording-stopped`).
- Redaction: exact URLs only if `NAV_ASSIST_SHOW_LOCATION` is on; otherwise
  site labels and semantic field signatures.
- Mandate ceiling: **propose**, do not act in the page.

### Question

Given this behavioural journal (and optional hints), is there a **reusable
navigation macro** worth proposing to the operator? If yes, which episode(s),
anchored how? If no, why not?

### Expected `step_result` (shape, not a compiler)

```text
opportunity:     none | weak | worth_proposing
episodes:        [{ from_sequence, to_sequence, summary, anchors, caveats }]
anchors:         semantic (role, name, ARIA, testid, native field) — not x,y
why:             short reason (repetition, stable target, or absence thereof)
confidence:      0..1
mandate_basis:   prepare_only
must_not_include: executable click path, Send/Publish, cookies, secrets
```

`worth_proposing` is still **not** a mandate to write the macro into the
extension or to run it. Installing or replaying is a later Act with its own
gate (same safety boundary as insertion: no Send/Publish).

## Why an agent, and why a contract

Heuristic episode cuts (idle gaps, page changes) can *segment*. They cannot
honestly answer “is this a macro the operator would want?”. That is
interpretation of obscure traces plus the operator’s intent.

So:

1. The **tool** packages the journal window and emits a continuation.
2. The **handler** (typically a mandated AI agent) reads the packet and
   returns a structured opportunity judgment.
3. The **operator** accepts, discards, or asks for a tighter window.

The handler is replaceable. The packet must remain answerable by a human
who is willing to read the JSONL. Do not bake a provider into the TUI.

## Status

Not implemented. Brackets remain hard cuts until episode hints land. This
document is the missing **judgment** piece next to
[`navigation_assistant_episode_hints.md`](navigation_assistant_episode_hints.md).
