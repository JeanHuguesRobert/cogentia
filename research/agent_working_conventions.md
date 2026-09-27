---
title: Agent Working Conventions
subtitle: Validated, corpus-wide operating habits distilled from working sessions — not a substitute for AGENTS.shared.md, a companion to it
author: Jean Hugues Noël Robert, with Claude (Anthropic)
date: '2026-08-09'
document_role: source
document_kind: working-note
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
related_research:
  - instructions/AGENTS.shared.md
  - AGENTS.md
  - research/agent_configuration_layer.md
  - research/agent_local_memory_anti_capture.md
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: main
  origin_date: '2026-08-09'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Agent Working Conventions

## Purpose

`instructions/AGENTS.shared.md` states the corpus's binding invariants. This note collects the
more concrete, repeatedly-confirmed working habits that sit underneath those invariants —
distilled from agent working sessions and previously scattered across per-tool private memory
in violation of the Anti-Capture Doctrine (see `research/agent_local_memory_anti_capture.md`).
Nothing here overrides `AGENTS.shared.md`; where the two disagree, the shared layer wins.

## Documentation and stabilisation habits

- **Refresh active work when the Corpus materially changes.** A running handler is not
  entitled to treat its start-time snapshot as permanently authoritative. When a relevant doctrine,
  artifact, constraint, or fix lands while work is in progress, use optimistic locking: fetch current
  state, compare with the handler baseline and local work, reconcile non-conflicting changes, and
  surface genuine conflicts. If the active handler will not see the update automatically, ask the
  Principal for the smallest useful relay. Do not spend Human Attention on trivial churn.

- **Pay-as-you-go verbosity.** Protocol and schema defaults should be minimal and ergonomic;
  full ceremonial forms (compliance metadata, full accountability structs, legal-archive audit
  trails) are opt-in and scale with actual stakes, gated behind explicit flags rather than on by
  default. Applies especially to research/operational tooling; legal-archive or regulated
  contexts must declare themselves to get the heavy tier.
- **Verify understanding before building.** When a concept is introduced that the human author
  considers load-bearing — especially one documented in a research paper — read the source
  material in full, summarize the load-bearing parts back, and flag genuine ambiguities before
  writing any implementation. Don't paraphrase a title as if it were the paper.
- **Let commits speak.** Don't rewrite a published roadmap, spec, or README ahead of proof to
  reflect a re-ordering or pivot that hasn't happened yet. Do the work; let the commit be the
  visible signal. Roadmap text updates after a green result, not before it, unless explicitly
  requested.
- **TODO discipline.** Treat TODO-list bloat as a real cost. Periodically propose a trim pass:
  mark closed items `- [x] *(Done YYYY-MM-DD.)* <one-line trace>` rather than deleting (git log
  alone is too coarse to recall what shape a fix took), and distinguish **actionable now**,
  **blocked on external** (annotate the unblock condition), and **moot** explicitly rather than
  letting blocked items accumulate looking actionable.
- **WIP commits are a backup convention, not a quality signal.** A commit message containing
  `WIP` is a deliberate, visible save point — pushed intermediate state for safekeeping. It is
  not a flag requesting cleanup or review.
- **Decision brief before validation.** Before something goes up for human validation (closing
  an issue, applying a commit proposal, resuming a judgment-requiring continuation), produce a
  table mapping each closure criterion from the spec to concrete evidence (file/line/function)
  and a ✅/❌, plus a one-sentence verdict. This is what makes fast, non-rubber-stamp human
  validation possible — the cross-referencing work is already done.
- **Don't re-ask the same kind of confirmation mid-batch.** Once a human has approved the shape
  of a multi-step or multi-question task (e.g. "run this comparison across all N questions",
  "fix these fabrication-gap items one by one"), proceed through the mechanical repetitions
  without a fresh confirmation prompt per item. Confirmed directly during the 2026-09-27
  legacy-vs-V2 Guide comparison session: "and try to do a full batch without asking me the same
  question again and again", then "and stop asking me so many questions". Reserve interactive
  questions for genuinely new decisions (which track to pursue, how to resolve an unexpected
  repo/branch state) — not for re-confirming a already-approved batch's next unit of work.

## Git and branch hygiene

- **A sub-project's working copy can be parked on an unrelated feature/WIP branch with its own
  in-progress uncommitted changes.** Don't assume `main` is checked out just because a task is
  documentation-only. Run `git branch --show-current` and `git status -sb` before editing or
  committing. If unrelated modified files are already present, diff them before touching
  anything — they may be genuine in-progress work (leave alone) or a harmless residue (e.g. a
  file-mode-only diff, safe to discard).
- **When you need `main` but the primary checkout is elsewhere, look for (or use) a worktree
  already on `main`** rather than fighting the primary checkout's branch state. `git worktree
  list` surfaces every checkout of a repo; several long-running repos in this corpus keep a
  standing worktree per in-flight branch under `handoffs/worktrees/<repo>-<topic>` (see
  `operium`, which as of 2026-09-27 has one at `handoffs/worktrees/operium-pause-fix` sitting on
  `main`). Save the change as a patch (`git diff > /tmp/x.patch`), discard it from the
  branch-mismatched checkout, `git apply` it in the `main` worktree, review the diff, then
  commit and push there.

## Placement and locality

- **Locality principle.** When placing exploratory research notes, default to the repository
  where the thinking is actually happening, not the "thematically correct" central repo for that
  topic. Cross-references (backlinks, `research/index.md` entries) keep discovery working without
  forcing every topic-X document into repo-X. This mirrors the corpus's own Fractanet
  decentralization doctrine applied reflexively to the corpus's own authorship: no repo should
  become a gravity well for a topic.
- **Network symmetry.** Every entry in one repository's `research/index.md` *Referenced* section
  (pointing at another repo) must correspond to a *Published* row in that other repo's index. A
  document has exactly one canonical home; run the corpus's link-check tooling after any batch
  that touches cross-repo references.

## Multi-agent practice

- The human author runs the multi-agent critique loop manually (parallel chats, deliberate
  copy/paste between them) and does not want that dispatcher role automated away — the friction
  of manual transfer is a working instance of the "human decides what crosses between contexts"
  rule, not incidental overhead. Tooling proposals for this loop should augment the human
  dispatcher, not replace it, and should capture **outcomes** (corpus commits, accepted/rejected
  claims) rather than **process** (transcripts, clipboard events).
- Multi-AI provenance is traced in frontmatter (`ai_assisted_by: [...]`) and in commit messages
  that name which agent contributed what (drafting, critique, synthesis) rather than flattening
  to a generic "AI-assisted" label.
- **Uncoordinated concurrent agents on the same repo is an observed failure mode, not a
  hypothetical one.** During the 2026-09-18 Suicide Corse anniversary edition work, two agent
  sessions edited `barons-Mariani` in parallel without visibility into each other: both created
  a "Chronologie" and "Annuaire" chapter around the same minute (one as filled content, one as an
  editorial-contract skeleton under different filenames), and a "freeze-candidate receipt" was
  produced and immediately went stale seconds later when the other session pushed unrelated
  commits. Optimistic Locking (fetch → rebase → reconcile content → push) absorbed this without
  losing work, but only because every session fetched before pushing and read the diff rather than
  force-pushing. The lesson to carry forward: when a human dispatches parallel agent sessions
  against the same repo, expect this pattern (duplicate skeletons, stale provenance receipts,
  rebase-not-merge on every push) rather than treating a `fetch first` rejection as an anomaly to
  work around quickly — reconcile content deliberately, don't just resolve the git conflict.

## Known cogentia.js mechanical limits

See `docs/cogentia-js-known-limitations.md`.
