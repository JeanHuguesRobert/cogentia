# Judgment boundary vs failure

Used by skill `continuation-handling`.

## Rule

A **continuation** exposes a point where **judgment** is missing.  
A **failure** is a stop where **deterministic or technical work** did not complete.

Misclassifying one as the other either:

- pretends a crash is a decision, or  
- pretends a required human/principal gate is a bug to “fix”.

## Decision table

| Observation | Class | Agent action |
|-------------|-------|--------------|
| Tool emitted `type: continuation` / `continuation_required` with a question and resume path | **judgment_boundary** | Inspect → prepare/resolve under mandate |
| CLI `continuation list` shows `active` / alive | **judgment_boundary** (queue) | Inspect each; do not bulk-auto-resolve |
| Schema validation failed on input file | **technical_failure** | Fix input; do not invent decision |
| Daemon/API 5xx, network, auth token missing | **technical_failure** | Report blocked-tool style; propose smallest safe continuation |
| Packet references files the carrier did not provide | **packaging_failure** | R2 report; request by-copy; do not guess |
| By-reference context deleted or private to another machine | **packaging_failure** | Fall back to copy or refuse |
| Resolve would send email / merge / publish | **mandate_gate** | Out of this skill’s resolve path |
| High irreversibility, no accountable party on object | **accountability_gap** | `needs_acceptance` |
| Parent mandate forbids disclosure of payload fields | **mandate_gate** | Redact; refuse public paste |
| Previous alternative failed; others remain | **judgment_boundary** (backtrack) | Explicit branch choice; record failure history |
| Ambiguous whether scope widens vs parent constraints | **mandate_gate** (fail closed) | Report ambiguity; no resolve |

## Blocked tool invariant

A blocked tool is an operational signal, not a successful judgment:

```text
report attempt → report failure → classify → preserve partial work
  → propose smallest safe continuation → ask for human unblock if useful
```

Source: `research/blocked_tool_rule.md` / agent configuration layer §6.1.

## Skin in the game (before consequential resolve)

Ask:

- Who benefits?
- Who pays if wrong?
- Who bears delay, liability, reputation?
- Is explicit human acceptance required?

If answers are missing and impact is material → **accountability_gap**, not creative improvisation.
