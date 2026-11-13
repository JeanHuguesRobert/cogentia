# GitHub-first WIP handoff — ThinkPad / Fracta2

**Status:** operational convention, 2026-11-13. This extends [Optimistic Mainline Governance](../research/optimistic_mainline_governance.md); it does not grant publication, disclosure or deployment authority.

## Problem and default

Two independent Git working directories have no shared uncommitted state. A clean git pull cannot retrieve unstaged files, ignored data or unpushed commits from the other machine. GitHub is the common durable transfer point for **publishable** work. Main is the default; avoid routine stashes, worktrees, branches and copies.

A deliberate **WIP checkpoint is a recoverable state, not a completion claim**. Use a narrowly staged commit carrying a task/issue reference, for example: wip(document-package): checkpoint local-only compiler (#43). Do not assert green CI, human review, deployment, acceptance or source correctness merely because the commit was pushed. Preserve source and contract provenance and a concise unfinished-work note in the existing issue, not in a new tracking register.

## Leaving a machine

1. Run the portable, read-only diagnostic from Cogentia: node scripts/ops/git-handoff-preflight.js --repo PATH --fetch (optionally --json). Optional fetch updates remote-tracking metadata, not worktree files. Distinguish local WIP, unpushed commits, behind and divergence.
2. Inspect **only task-owned paths**, staging and the relevant diff. Separate source files from generated projections, caches, temporary secrets, signed receipts and personal data. The diagnostic's filename heuristic is not a privacy/security audit.
3. If the material is **authorized for public visibility** and main does not trigger an unsafe deployment effect, validate what can actually be tested, stage explicit paths, verify the staged diff and commit a scoped WIP checkpoint linked to the existing issue. Disclose failed or missing tests. Fetch, reconcile optimistic-lock divergence and push to GitHub, verifying the resulting remote SHA. Never force-push.
4. If the repository is private, use a GitHub destination with actually verified access scope. If publication, legal commitment, auto-deployment on main or incompatible concurrent work make this unsafe, **do not push to public main**. Reuse an authorized private repository; only where demonstrably necessary use one bounded issue-owned exceptional branch with owner and closure condition. Escalate substantive destination or visibility choices rather than publish first and ask later.
5. Attach each checkpoint to its pre-existing issue or cognitive packet. Do not blindly stage all files, copy secret environment files or export entire working directories. No ritual backup is necessary after GitHub accepts the exact commit.

## Resuming on the other machine

1. Run the same preflight with --fetch. If clean and behind, git pull --ff-only. If dirty, inspect before any write. If ahead or diverged, reconcile the histories; never reset, overwrite or automatically stash unrelated work.
2. Read the linked issue and recent WIP commits; verify the exact SHA exists. Build, tests and deployment state are separate from successful Git transfer.
3. Continue on main with optimistic conflict handling. At stabilization, commit a tested increment normally; do not rewrite shared WIP history to hide that it was provisional.
4. On a live service, check deployed revision and CI/CD triggers before any push. A GitHub push is not authorization to modify production.

## Observed baseline

On 2026-11-13 the unique, non-sending Ubikia document-package WIP was checkpointed on public main as [3484aad](https://github.com/JeanHuguesRobert/ubikia/commit/3484aad2497ddd5c5d2b38cac4bdeeadac3a9029), under [Ubikia #43](https://github.com/JeanHuguesRobert/ubikia/issues/43), with two local-only tests. It was then fast-forwarded to the ThinkPad together with other clean repositories. This checkpoint is not an operational release.
