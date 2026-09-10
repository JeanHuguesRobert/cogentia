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
  - "ioc_continuation_openai_path_audit_2026-08-12.md"
  - "agent_resumable_cli.md"
  - "../schemas/navigation.macro-opportunity.v0.schema.json"
---

# Evaluate the opportunity to create a macro

Hint keys `d` / `f` (aliases `[` / `]`, poor on AZERTY) mark that something nearby *might* be an episode.
They do not decide whether a **macro is worth proposing**. That second
question is **judgment**, not a threshold on event counts.

The journal is a structured but **obscure** behavioural trace (roles, ARIA,
field signatures, sequence numbers). A human can scan a short hint interval;
judging *reuse* across a long local JSONL is the kind of work that typically
needs an **AI agent as handler** — provided the contract is explicit.

Schema of the handler answer:
[`schemas/navigation.macro-opportunity.v0.schema.json`](../schemas/navigation.macro-opportunity.v0.schema.json).

## What this is not

- Not an always-on watcher that spends tokens on every page-focus.
- Not a hidden model call inside the TUI, the JSONL writer, or the gateway.
- Not authority to install, run, click, send, or publish a macro.
- Not a replacement for accessibility anchors (role, name, `data-testid`).
- Not the same job as *segmenting* the journal (idle gaps, page changes).

The TUI remains a **structural tool**. When the operator asks for this
evaluation, the tool **stops at the judgment boundary** and emits a
continuation (Cognitive Packet payload). A replaceable handler — human,
twin, or mandated agent — supplies a `step_result`. See
[`docs/continuations_and_cognitive_packets_for_agents.md`](../docs/continuations_and_cognitive_packets_for_agents.md)
and skill `continuation-handling` (`prepare_only`).

IoC (required):

```text
Embedded-AI (forbidden here):
  TUI / journal.js → provider API → “yes, make a macro” → continues

Agent-resumable (required):
  TUI packages a view → continuation → handler judgment → step_result
  → operator sees the proposal; nothing runs in the page
```

## Four layers (do not collapse them)

```text
observe     journal JSONL (already local, no pings)
package     cheap, deterministic projection + optional heuristic segments
judge       “is a reusable macro worth proposing?”  ← this document
act         write / install / replay a macro         ← later Act, other mandate
```

| Layer | Who | Judgment? | Model? |
|-------|-----|-----------|--------|
| Observe | extension + TUI journal | no | no |
| Package | TUI / a small JS projection | no | no |
| Judge opportunity | handler (often an AI agent) | **yes** | only in the handler, never in the TUI |
| Accept / discard | operator | yes | no |
| Act (replay) | future mandated path | yes + mandate_gate | no hidden call |

Heuristics belong in **package**. If the tool starts answering “worth it?”,
it has crossed into judgment and must emit a continuation instead.

## Why the log is abscons (today’s codes)

The ring is not a story. It is a dump of bridge traffic, keyed by
`recordDiagnostic` `code`, which is often the raw JSON-RPC method:

| `code` | What it actually is | Useful for macros? |
|--------|---------------------|--------------------|
| `page.activeChanged` | tab became active (title, url, tabId) | site / tab change |
| `page.event` | stdlib `observe()`: `focusChanged`, `selectionChanged`, `pageShown`, `observing` plus `elementSignature` | **yes** — the behavioural meat |
| `rpc-request` / `rpc-result` | TUI asked `page.evaluate`; result may be a **full context probe** | mixed: the probe duplicates context, often huge |
| `gateway.hello`, `bridge-hello`, `gateway.extensionConnected` | plumbing | no |
| `recording-started` / `recording-stopped` | operator hint | weak prior |
| `assistant-restart` / `assistant-quit` | TUI lifecycle | no |
| `bridge.ping` | liveness | **must not be stored** (already skipped) |

A `page.event` payload is nested (`details.event.context.activeElement` with
ARIA, ancestors, testid). A human does not “read the log”; they would have to
*decode* it. That is why a handler is typical — and why the tool must not
hand the raw JSONL to a model as a prompt dump.

`rpc-result` is a disclosure trap: it can contain `result` of a context
probe (page title, URL, selection, visible field text). The **packaged view**
must apply the same redaction as the TUI (`tabSiteLabel`) and drop or
summarise probe blobs. Sending the file as-is to a cloud model would be a
silent disclosure widening.

Local + hosted share one journal (`origin` on some events only via the
diagnostic `details`). Packaging must tag origin when known, and must not
merge two browsers into one fake episode.

## Is today’s log sufficient for a judgment to *identify* macros?

**For the POC’s own job (focus an editable field, insert a draft): borderline,
if `observe()` is actually running. For general UI macros: no.**

Two streams are easy to confuse:

1. **Answers to Assistant requests** (`rpc-request` / `rpc-result`,
   `page.evaluate` probes, `page.insertText`). These are snapshots the TUI
   *asked for*. They duplicate context, they are sparse (a probe when `[c]`,
   on connect, on `[i]`), and they do not reconstruct what the operator did
   between probes.
2. **Passive page events** from the unpacked content script
   (`page-observe.js`, no debugger, no TUI probe required): `focusChanged`,
   throttled `selectionChanged`, `pageShown`, `click` (target signature, no
   coordinates), coalesced `fieldInput` (that typing happened, never the
   text). Tab events remain (`page.activeChanged`,
   `page.navigationStarted/Completed`, window focus). `accessibleName` does
   not fall back to `innerText` (that would leak post bodies and drafts).

`observe()` in the injected stdlib is a fallback when the content script is
absent; it skips if `data-cogentia-observed=content` is already set. SPA
route changes still often skip `pageshow` (tab URL updates still help).
Scroll, hover, submit, file picker, drag, and keyboard shortcuts remain
absent.

So a handler can honestly say:

- “the operator repeatedly focused a `contentEditable` whose accessible name
  looks like compose, on this site” → candidate for the **insert-draft**
  family;
- “there was a lot of selection churn on facebook.com” → not a macro, or
  `weak`.

It **cannot** honestly recover “click the overflow menu, then Privacy, then
Save”. If we asked it to, it would **invent** a click path. That is why the
contract forbids executable click scripts and x,y: the evidence is not in
the log.

Smallest observation upgrades *before* judgment gets more ambitious (still
not an Act, still no Send):

- install `observe()` on attach / navigation, without waiting for a TUI probe;
- `click` (signature of the target, not coordinates);
- `input`/`beforeinput` as *that typing happened*, not the keystrokes;
- keep SPA URL changes (`page.navigationCompleted` already helps when the
  tab URL updates).

With content-script `click` + `fieldInput`, judgment may also cite **button /
control signatures** and **that a field was typed in**, still without
reconstructing a CDP click script. `[m]` remains prepare_only. Scroll,
hover, and shortcuts are still insufficient trace, not a cleverer model.

## Activation

**Off unless the operator turns it on.** Suggested TUI surface: an explicit
action (for example `[m]` “opportunité de macro”) or a session flag. No
background evaluation. Cost (tokens, attention, disclosure of the journal
slice) is in the budget envelope of that activation, not of ordinary
navigation.

Default window when `[m]` is pressed:

1. If a hint pair exists (`recording-started`…`recording-stopped`, or an
   open recording): that interval **plus** a small margin (hint = prior, not
   cut).
2. Else the last N behavioural events (N from env, default a few hundred of
   `page.*` only), not the whole 50k file.
3. Operator can pass an explicit `from_sequence`–`to_sequence`.

The tool may refuse to emit if the window is empty, only plumbing, or larger
than a declared copy-budget (then: by-reference + `needs_tighter_window`,
or a packaging_failure).

## What the tool may compute without an agent

These are **packaging**, fail-closed, no model:

- Drop plumbing and pings.
- Redact URLs to site labels unless `NAV_ASSIST_SHOW_LOCATION=1`.
- Flatten `page.event` to `{ sequence, at, origin, type, site, signature }`.
- List hint markers in range.
- Cheap segments: idle gaps, `pageShown`, `page.activeChanged`, origin switch.
- Counts: distinct sites, distinct accessible names, focus-churn.

It must **not** decide `opportunity`. A high focus-churn on facebook.com is
compatible with both “compose-box ritual worth a macro” and “idle scrolling”.

## Packaged view (by copy / by reference)

By **reference** (this PC): path of
`.local/navigation-assistant-journal.jsonl` plus
`from_sequence` / `to_sequence` plus the projection file the TUI just wrote
(gitignored, next to the journal).

By **copy** (handler without the disk, or a remote agent): embed the
**projection**, not the raw JSONL.

Projection record (intended):

```text
sequence
at
origin            local | hosted | unknown
kind              page.event | page.activeChanged | hint | other
type              focusChanged | selectionChanged | pageShown | observing | …
site              tabSiteLabel(url)
signature         { tag, role, testid, accessibleName, inputType, contentEditable, ancestors? }
hint              recording-started | recording-stopped | null
```

Omit `rpc-result` bodies. Omit selection *text* by default (it may be the
draft). Omit exact URL unless the operator opted into location.

## Contract

```text
id:              cogentia.navigation.macro-opportunity/v0
activation:      explicit operator
effect:          prepare_only
authority:       evaluate and propose; never execute
disclosure:      packaged view under TUI redaction; not the raw JSONL
transmission:    by reference on this PC; by copy of the projection otherwise
skill:           continuation-handling (prepare_only); no new authority
```

### Question (typed)

Not “write me a macro”. Not “what did I do?”.

```text
Given this packaged behavioural window (and optional hints), is there a
reusable navigation macro worth proposing to the operator?

If yes: which episode(s), with semantic anchors, and why they look stable.
If no: why not (one-shot, unstable DOM, no editable target, mixed sites,
        scrolling without a task, insufficient window).
Do not invent clicks. Do not propose Send/Publish. Do not use x,y.
```

### Alternatives the continuation should list

```text
none                 no reusable episode in this window
weak                 possible, but anchors look brittle or the task is unclear
worth_proposing      at least one episode with stable semantic anchors
needs_tighter_window window too wide / too thin; ask the operator to hint or crop
```

`needs_tighter_window` maps to `step_result.status = needs_acceptance` with
`required_information: ["tighter_sequence_range"]` when the handler cannot
judge honestly.

### Expected `step_result`

See the JSON Schema. Narrative remainder:

```text
opportunity:     none | weak | worth_proposing
episodes:        [{ from_sequence, to_sequence, origin, summary, anchors, caveats }]
anchors:         role / accessible_name / testid / aria / native_field / site / hint
why:             repetition, stable target — or absence thereof
confidence:      0..1
mandate_basis:   prepare_only
must_not_include: executable click path, Send/Publish, cookies, secrets, raw URLs
                  unless location was in the packet
```

`worth_proposing` is still **not** a mandate to write the macro into the
extension or to run it. Installing or replaying is a later Act with its own
gate (same safety boundary as insertion: no Send/Publish).

## What “macro” means here (so judgment has an object)

Until a macro language exists, a proposal is **not** code. It is:

- a bounded episode in the journal;
- a **task hypothesis** in one sentence (“focus the Facebook compose box and
  insert the local draft”);
- a list of **semantic anchors** the future replay would seek;
- caveats (login wall, A/B DOM, hosted vs local).

If the handler returns a CSS selector farm or a CDP click script, that is
**out of schema** — treat as failed packaging / refuse, not as a macro.

Replay, when it exists, will be a child capability under the insertion
mandate (editable field only, no Send/Publish, optimistic lock on the
signature). That child **attenuates**; it cannot widen to “drive the site”.

## Worked contrasts (why judgment is required)

Same site, similar density, opposite opportunity:

1. **Compose ritual** — `pageShown` facebook.com, `focusChanged` into a
   `contentEditable` with accessible name about composing, then idle.
   Hints optional. → often `worth_proposing` (insert draft into that field).
2. **Idle feed** — many `selectionChanged` / `focusChanged` on articles,
   no editable target, no repetition of the same signature. → `none` or
   `weak`.
3. **Mixed local+hosted** — tab changes bounce between origins. A single
   episode spanning both is almost always wrong. → split by `origin` or
   `none`.
4. **One-shot settings click** — a unique `testid` never repeated. Might be
   automatable, usually not *worth* a macro until seen twice. Repetition is
   part of the judgment, not a hard `count >= 2` in the TUI (the operator
   may know they will do it daily).

Heuristics can flag (1) vs (2) poorly; an agent with the projection and the
operator’s known draft/insert workflow can tell them apart. A counter of
focus events cannot.

## Failure table (do not misclassify)

| Observation | Class | Action |
|-------------|-------|--------|
| Operator pressed `[m]`, window has `page.event`s | **judgment_boundary** | Emit continuation |
| Journal file missing / unreadable | **technical_failure** | Report; do not invent episodes |
| Projection would include exact URLs and location is off | **mandate_gate** (disclosure) | Redact; do not paste raw JSONL |
| Handler wants to “just click Save” | **mandate_gate** | Refuse; stay prepare_only |
| Window is 40k events of mixed sites | **packaging_failure** / tighter window | Do not dump into a model |
| Handler returns x,y click path | **technical_failure** vs schema | Reject step_result |
| Irreversible replay proposed as if accepted | **accountability_gap** | `needs_acceptance` |

## Continuation object (CLI twin)

When implemented, emit `cogentia.continuation.v2` (or `--as-packet`) roughly:

```text
kind:        judgment
title:       Navigation macro opportunity
question:    (typed question above)
subject:     { path: .local/navigation-assistant-journal.jsonl }
context:     { protocol: cogentia.navigation.macro-opportunity/v0,
               from_sequence, to_sequence, hints[],
               projection_path or projection[],
               location_redacted, origins[] }
expected_response: schema id of the step_result
constraints: { effect: prepare_only,
               disclosure: tui-redaction,
               budget: copy-size and token envelope of this activation,
               reversibility: n/a (no page Act) }
```

Resume path: operator (or a mandated agent) writes `step_result.json`;
nothing in the page changes. The TUI may show the `opportunity` line and
store the result next to the journal (gitignored). That stored proposal is
**not** an installed macro.

## Handler: why an agent, still replaceable

A willing human can answer from the **projection** (that is the test that
packaging worked). In practice the projection of a long afternoon is still
tedious; a mandated agent is the expected fulfiller.

The agent:

- reads the packet, not the live DOM (unless a *separate* read-only
  `page.context` is already in mandate — it is not implied here);
- does not call `page.evaluate` to “check”;
- does not widen URL disclosure;
- returns schema-valid JSON, not a blog post.

Skill `continuation-handling` already forbids resolving Sends. No new skill
is required to *grant* power; a later skill may describe *how* to read the
projection. A skill still does not grant authority.

## Implementation order (not started)

1. Projection function (JS, testable) over the JSONL: redact, flatten,
   drop plumbing and `rpc-result` bodies.
2. TUI `[m]` writes the projection and emits a continuation (no model).
3. Operator or agent fills `step_result` against the schema; TUI displays it.
4. Episode hints: brackets become priors into the default window.
5. Only then: a macro *authoring* Act, attenuated under insertion rules.

Until (2), `[` / `]` remain hard cuts for `e` export so current snapshots
stay reproducible.

## Status

Packaging, TUI action, and handler wiring are **not implemented**. This
document is the judgment contract next to
[`navigation_assistant_episode_hints.md`](navigation_assistant_episode_hints.md).
