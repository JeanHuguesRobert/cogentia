# Repair the missing handoff note

## Goal

Point the handoff at the note that the next handler must read.

## Current state

The note was named in the issue, and no replacement path has been recorded.

## Context References

- `docs/does-not-exist-resumable-audit.md`

## Constraints

- Do not invent a replacement document.

## Agent-resumable Next Action

1. Inspect the named note.
2. Report whether it can be read.

## Acceptance / Return

Success means:

- [ ] The named note was read, or the missing path was reported.

## Stop conditions

Stop if the named note cannot be retrieved.
