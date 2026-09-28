# Record the audit command

## Goal

Add a read-only resumability audit command to cogentia.js and prove it with fixtures.

## Current state

The command is not implemented yet. The pattern document already exists and no audit code has been added.

## Context References

- `docs/resumable_github_issues.md`
- `instructions/AGENTS.shared.md`

## Constraints

- Do not rewrite GitHub Issues in this phase.
- MUST NOT embed a model call in the audit.

## Authority

- MAY edit Cogentia source files and run tests.
- MUST NOT deploy.
- MUST NOT merge to main.

## Agent-resumable Next Action

1. Inspect the issues command in cogentia.js.
2. Add tests for a passing audit.
3. Implement the smallest read-only audit.
4. Run the focused test command.
5. Report the residue.

## Acceptance / Return

Success means:

- [ ] The audit command is read-only.
- [ ] A structurally complete issue can pass.

Return:

- result: completed | partial | blocked

## Stop conditions

Stop and report if the audit would need to mutate the Issue or call a model provider.

```text
Goal A: rewrite history
Goal B: keep the historical record
```
