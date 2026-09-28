# Resolve the deploy ceiling

## Goal

Determine which deploy statement the next handler must follow.

## Current state

The issue contains two deploy statements and no later resolution.

## Context References

- `docs/resumable_github_issues.md`

## Authority

- MAY deploy.
- MUST NOT deploy.

## Agent-resumable Next Action

1. Inspect both deploy statements.
2. Report the conflict.

## Acceptance / Return

Success means:

- [ ] The conflict is exposed without choosing a side.

## Stop conditions

Stop instead of deploying.
