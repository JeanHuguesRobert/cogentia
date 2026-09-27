# Choose the audit boundary

## Goal candidates

- Keep the audit strictly read-only.
- Make the audit rewrite Issues immediately.

No later trace records which candidate is current.

## Current state

Both candidates are still present in the issue. Neither has been marked accepted or rejected.

## Context References

- `docs/resumable_github_issues.md`

## Constraints

- Do not invent the original decision.

## Agent-resumable Next Action

1. Inspect the two goal candidates.
2. Report that a judgment is required.

## Acceptance / Return

Success means:

- [ ] The audit exposes the ambiguity without choosing a candidate.

## Stop conditions

Stop instead of choosing a goal.
