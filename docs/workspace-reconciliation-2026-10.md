---
title: Workspace reconciliation — October 2026
author: unknown
affiliation: unknown
date: "2026-10-24"
language: en
license: CC BY-SA 4.0
status: working-paper
document_role: operational
document_kind: reconciliation-checkpoint
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/workspace-reconciliation-2026-10.md
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: https://github.com/JeanHuguesRobert/cogentia/issues/273
  origin_date: "2026-10-24"
  derived_from:
    - ../scripts/ops/inventory-workspace-reconciliation.mjs
    - ../instructions/AGENTS.shared.md
    - resumable_github_issues.md
review:
  status: unreviewed
  reviewed_by: []
---

# Workspace reconciliation — October 2026

This is the local-worktree reconciliation slice of
[#273](https://github.com/JeanHuguesRobert/cogentia/issues/273), which already
owns inherited-branch reconciliation. Do not create a competing umbrella or
silently reopen completed product packets. The Principal instructed execution
of the identified reconciliation work, with questions reserved for material
ambiguity. This does not authorize production operations or editorial adoption
of historical drafts.

## Preservation and inventory receipt

The first fresh recovery inventory observed **66 worktrees**, **27 dirty
worktrees**, and **11 stashes** counted once per common Git directory. This is
a dated observation, not a stable fleet size. The prior 65/27/10 inventory was
superseded as concurrent work added a worktree and preserved the old
Barons-Mariani checkout in a stash.

The inventory covers immediate child Git checkouts and their registered
worktrees inside the workspace. It is not an exhaustive recursive search for
unregistered nested clones, ignored files or external worktrees. It records
local remote-tracking refs; perform fetch separately before an integration or
absence conclusion.

The recovery script records exact HEADs, statuses, common Git directories,
local/remote refs, stash OIDs and untracked files. For dirty worktrees it saves
separate binary staged/unstaged patches and regular untracked files, checks
read-back SHA-256, and rechecks HEAD/status/patches for concurrent drift.
Symlinks, files larger than 64 MiB and command failures are explicit exceptions,
never successful backups. The recovery destination must be outside all
discovered source checkouts. It does not fetch, reset, stash, apply, clean,
commit or delete source state.

The full inventory and payloads are **local recovery evidence**, not public
artifacts. They may contain private work. No raw inventory, stash, source
snapshot or bundle is committed with this report.

Verified first inventory SHA-256:
`17716ca01f951eab370481c49f9f9008f400b6e26d4686b7a7fd5b990ab11be0`.
All 66 records reported a consistent snapshot and no discovery/copy errors.
The Principal has the workstation recovery location; a remote-only handler
cannot assume access to it and must request the relevant authorized snapshot.

## Dispositions by lot

| Lot | Observed state | Next action / boundary |
| --- | --- | --- |
| Old Barons-Mariani checkout | Another handler synchronized the checkout and preserved its old WIP in a stash. Its base includes the two older CAPABLE commits. A standalone Git bundle was created and verified to contain complete history, including the untracked-file parent. | Preserve the stash and bundle. Compare the captured source with fetched `main`; do not reapply the old tree over current source. |
| Historical authored drafts | Seventeen formerly untracked files were recovered from the stash. Eleven are absent at their original paths on fetched `main`; none of the seventeen has an identical blob elsewhere in that tree. Six federated JSON files have newer counterparts. | Absence is not editorial acceptance. Review source sufficiency, current book architecture and attribution before integrating any draft. |
| CAPABLE tracked edits | Fifteen authored paths in the stash include thirteen modifications and two deletions, separate from generated backlinks. The old changes include substantive legal/public formulations and removal of unsupported precision. Current CAPABLE has evolved since that base. | Reconcile individual corrections against current source and existing #98; retain superseded wording only as historical evidence. No automatic legal/political publication. |
| Senatorial rendering work | Existing detached worktrees contain presentation/preprocessing changes; canonical clones and render commits continued evolving during the audit. | Compare exact files with current #133 source/receipts before preserving a new candidate or removing a worktree. |
| Weekly consolidation | The previously dirty correction became commit `e86547c881919210f809baa143d7f8e1515a1d21`; other handlers also recorded operational work in Operium. | Verify current publication/test receipts. This reconciliation does not repeat deployment or service actions. |
| Generated navigation | Many apparent source edits change only `BEGIN_AUTO` blocks; observed examples include forty Barons-Mariani research documents and six Inox documents. | Regenerate only after source reconciliation and freshness checks. Do not promote stale projections or discard mixed authored deltas. |
| Operium legacy copies | Old worktrees retain health evidence, backlog changes, simulator revision notes, browser documentation and recovery-observer commits. Newer main revisions contain related work, but some local files differ. | Compare semantics and existing receipts; do not interpret old grants as current operational authority. |
| Other stashes / PDF packet | Remaining stashes and the local Watch-the-Watchers packet require source/owner comparison. | Keep opaque local recovery references, inspect each stash once, and route the PDF packet to Operium after checking current issue state. |

## Executed bounded cleanup and further comparisons

- Three generated `.pyc` files in the old #133 worktree were removed only after
  their live SHA-256 and recovery-copy SHA-256 matched the saved inventory.
  The target was checked to be an ordinary `__pycache__` directory inside that
  worktree, containing only those cache files. The worktree then reported clean.
- Five Survey stashes had identical base commit, worktree tree and index tree,
  with no untracked parent. Each changed only `research/corpus-status.md`.
  A standalone object pack preserving all six original Survey stashes was
  indexed and verified, including presence of each original stash object.
  Four duplicate stash refs were dropped with exact OID preconditions. The
  newer distinct projection and one representative duplicate remain: six
  Survey stashes became two. The pack and original metadata remain local.
- Survey recovery pack SHA-256:
  `4b948a8ad8a6d2bd9eb34feeeb13d0b9fcc80310080b4914c11c07fc914d6ce9`.
  Backup removal requires a later retention decision after reconciliation;
  this task does not create an indefinite personal-memory store.
- The Inseme stash has four files identical to fetched main and four that
  differ. It is not an exact duplicate and remains preserved for semantic
  comparison of preemption/writeback behavior. Different file bytes alone do
  not establish a missing capability in main.
- The Watch-the-Watchers packet already has an owner:
  [Operium #57](https://github.com/JeanHuguesRobert/operium/issues/57), still
  open when checked. Its canonical version differs from the loose local copy.
  The local copy is preserved; no duplicate issue or live service operation was
  created.

Concurrent handlers are publishing source and deployment work while this audit
runs. Their index entries, source edits and operational grants are outside this
cleanup lot. The publication of this report must contain only the report and
its inventory script; it must not sweep unrelated staged files or unpublished
commits into a push.

The fetched Barons-Mariani comparison used
`d71f64024ef64eb8db6dd91f7208c44f31fffb5f` on `origin/main`.
The standalone Barons recovery bundle passed `git bundle verify` and records
complete history. Its SHA-256 is
`897ad6cd06131597fd8a73fb969f13ccd146a4e42a048cba70a24a50d4c9865a`.
Its contents remain workstation-local; that hash does not assert public access.

## Cold continuation

Resume [#273](https://github.com/JeanHuguesRobert/cogentia/issues/273), refresh
its latest checkpoint and current repository state, then choose one scoped lot.
On the original workstation, create a fresh recovery directory before mutating
a previously unsnapshotted contribution:

```text
node scripts/ops/inventory-workspace-reconciliation.mjs --root C:/tweesic --output <new-directory-outside-source-checkouts>
```

Treat an inconsistent snapshot or inaccessible historical payload as a precise
preservation blocker. Do not remove old refs/stashes/worktrees until their
unique contributions and dependencies are resolved and recoverable. Keep live
concurrent work outside the lot. Questions belong at actual semantic conflicts
or consequential uncertainty, not routine inspect/copy/verify steps.
