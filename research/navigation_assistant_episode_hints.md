---
title: "Navigation assistant: brackets as episode hints"
date: 2026-09-10
status: intended
---

# Navigation assistant: brackets as episode hints

Today `[` / `]` in the resident TUI are **hard cuts**. They start and stop a
manual demonstration; `e` then exports exactly that sequence interval (or the
whole journal if no interval exists). That is too brittle for macro
construction: the operator is not a video editor, and a useful episode is a
behavioural unit, not a keypress sandwich.

## Direction

`[` and `]` become **hints**, not the episode.

- The journal stays the source of truth (tab, window-focus, page-focus,
  selection, field signatures — no heartbeats). It is a JSONL file on the
  workstation (`.local/navigation-assistant-journal.jsonl`), appended as
  events arrive and fsync'd on TUI restart or quit, so `[r]` no longer wipes
  the matter used to detect episodes.
- Episode detection reads that sequence and proposes one or more episodes
  (idle gaps, page/field transitions, semantic-anchor changes, burst vs
  pause).
- A bracket pair is a weak prior: “something worth a macro is around here.”
  It may overlap several episodes, sit inside one episode, or miss the true
  start/end by a few events.
- Episodes must still be proposable **with no brackets** (continuous hold of
  the extension already records while the TUI is down).
- The hint events (`recording-started` / `recording-stopped`) stay in the
  journal as operator annotations. They are not deleted; they just stop being
  the only cut.

Macro discovery continues to prefer accessibility signatures (role, name,
ARIA, `data-testid`, native field metadata) over coordinates or volatile CSS.

Segmenting episodes is not the same as deciding a **macro is worth
proposing**. That second step is operator-activated **judgment** over the
journal (typically an AI handler, with an explicit continuation contract):
[`navigation_assistant_macro_opportunity.md`](navigation_assistant_macro_opportunity.md).

This is not implemented yet. Until it is, `[` / `]` remain hard cuts in the
TUI so current exports stay reproducible.
