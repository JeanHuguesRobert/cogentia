---
title: "cogentia.js - Tutorial and Near-Specification"
subtitle: "Generated automatically from the current v2 CLI source and corpus doctrine"
version: "2.3.0"
status: "generated automatically - current v2 tutorial"
date: "2026-06-19"
author: "Jean Hugues Noel Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
language: "en"
target_implementation: "cogentia.js v2.3.0"
generated_automatically: true
derived_by: agent
derived_from: "scripts/cogentia.js; COGENTIA.md; docs/knowledge_mesh.md; research/agent_resumable_cli.md; research/cognitive_packets.md; research/pipeline.md; research/derived_products.md"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_js_tutorial.md
last_stamped_at: 2026-06-19
corpus_role: "derived"
derived_product_type: "tutorial"
ai_assisted_by: "Codex"
document_role: "derived"
document_kind: "derived-product"
visibility: "public"
lifecycle_state: "generated"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "derived-product"
classification_confidence: "strong"
---

# cogentia.js - Tutorial and Near-Specification
<!-- BEGIN_AUTO: trails -->

<!-- END_AUTO: trails -->
> **Generated automatically.** This document is a derived operational artifact generated from the current `scripts/cogentia.js` v2 source and the corpus's doctrinal notes. It is not a sovereign source document. When the CLI changes, regenerate or revise this tutorial from the source rather than treating it as authoritative by itself.

> **Historical note.** The earlier implementation surface is preserved in [`scripts/cogentia.v1-history.js`](../scripts/cogentia.v1-history.js). This tutorial describes the current v2 CLI, not the archived v0.10/v1 command surface.

---

## Object and associated documents

### Object of this document

This tutorial has three jobs:

1. explain what `cogentia.js` v2 is for;
2. show the normal workflows a human or AI agent should follow;
3. record enough of the current command surface and invariants to support a faithful re-implementation.

It is a guide to the **mechanical layer** of Cogentia Commons. The doctrine lives elsewhere. This document explains how the current CLI navigates, refreshes, and audits the corpus without embedding hidden judgment inside the tool.

### Associated documents

This tutorial should be read together with:

- [Cogentia - the framework, in five distinctive moves](../COGENTIA.md) - identity document and entry point;
- [Agent-Resumable CLI](agent_resumable_cli.md) - protocol paper behind externalized judgment and resumable work;
- [Cognitive Packets](cognitive_packets.md) - envelope/payload model above continuations;
- [Pipeline](pipeline.md) - operational method note for source and derived production;
- [Derived Products](derived_products.md) - source/derived split, including tutorials and trails;
- [The Knowledge Mesh](../docs/knowledge_mesh.md) - backlinks, trails, and corpus navigation;
- [Research Index - Cogentia](index.md) - current published documents and possibilities;
- [README.md](../README.md) - current repo-level quick orientation.

---

## 0. What `cogentia.js` v2 is

`cogentia.js` v2 is a **zero-dependency local CLI** for navigating and refreshing a multi-repository Markdown corpus.

Its core responsibilities are:

- load a registry of repositories from `.cogentia.json`;
- inventory Markdown documents and classify their role;
- compute cross-repo links and corpus coupling;
- refresh generated navigation surfaces;
- separate deterministic refresh work from judgment-bearing decisions;
- expose judgment requests as continuations rather than embedding AI inside the CLI.

The v2 design rule is explicit:

- `plan` = read-only and complete;
- `apply` = write exactly the generated views from a fresh plan;
- `verify` = post-action health check.

This is the center of gravity of the current CLI.

---

## 1. Mental model

### 1.1 Registry-first

The CLI works against a **registry**, not a single repository. Resolution order is:

1. `--registry <path>`
2. `COGENTIA_REGISTRY`
3. nearest `.cogentia.json`

The registry points at the repositories that form the active corpus.

### 1.2 Public/private views

The CLI distinguishes **public** and **private** views.

- Public view hides non-public documents and prevents generated public navigation from pointing into private material.
- Private view can see both public and non-public documents except `secret` ones.

This matters for:

- `docs query`
- generated backlinks
- generated trails
- `corpus privacy`

### 1.3 Generated vs curated text

The CLI only rewrites explicit auto-managed sections named `trails`, `backlinks`, `registered_repos`, `graph`, `concepts`, `concept_graph`, `published`, or `possibilities`.

Anything outside those named auto sections is treated as curated prose and preserved.

### 1.4 Judgment stays external

Whenever classification or interpretation requires real judgment, v2 should emit or rely on a **continuation**, not silently decide. The CLI can list candidates mechanically; the decision itself remains resumable and replaceable.

---

## 2. Document model

Every Markdown document in the registered repositories is inventoried with:

- repository name
- local path
- title
- role
- visibility
- size and reading metrics
- created date
- last significant update
- link counts
- index membership

The important current roles are:

- `source`
- `trail`
- `derived`
- `index`
- `operational`
- `template`
- `example`
- `alias`
- `archive`
- `unknown`

Role inference is intentionally conservative:

- `research/trails/*.md` => `trail`
- explicit `document_role`, `corpus_role` or `role` frontmatter wins
- root or nested `AGENTS.md` => `operational`
- `/templates/` paths => `template`
- `/examples/`, `example_` or `fictitious_` paths => `example`
- explicit `derived_from` / `derived_by` => `derived`
- public `cogentia_personal/data_portability/` architecture notes => `source`
- `research/index.md` publication membership often => `source`
- generated navigation docs => `index`

`docs judgments` deliberately stays conservative. It no longer asks for obvious operational,
template, example, or explicitly asymmetric generated-derived cases, but it still asks for human
judgment when a derived product could have become a symmetric source, or when private-register
documents need an ownership/privacy decision.

---

## 3. Generated navigation surfaces

The v2 CLI refreshes four main generated surfaces.

### 3.1 `research/documents.md`

One consolidated catalog for the whole registry, currently hosted in the registry repo.

It includes:

- summary metrics;
- per-repository counts;
- recent activity;
- source documents;
- trail documents;
- index gaps.

### 3.2 `research/corpus-status.md`

Per-repository structural dashboard with generated sections for:

- registered repositories;
- cross-reference graph;
- concept summary;
- concept graph;
- published table;
- possibilities block.

The surrounding prose remains curated.

### 3.3 Backlinks

If document A links to document B, document B can expose that relation in its backlinks section.

Backlinks are visibility-aware:

- public views do not expose private targets;
- cross-repo links are preserved when visible.

### 3.4 Trails

Trail source documents live in `research/trails/`.

Each trail is an ordered playlist of Markdown links. During `corpus plan/apply`, v2 refreshes the corresponding trail section in each target document:

- previous visible document in the trail;
- next visible document in the trail;
- multiple trails may stack in the same document;
- public/private visibility is respected.

---

## 4. Current command surface

### 4.1 Core commands

```text
corpus plan
corpus apply
corpus verify
corpus privacy
corpus commit-generated
classify plan
classify apply
classify verify
classify explain <repo/path.md>
agent start
consolidate
status
grep <text>
```

Use these when the goal is corpus orientation or mechanical refresh.

`agent start` is the preferred first command for human and AI agents. It produces a read-only session summary: registry, repositories, document count, generated drift, gaps, privacy leaks, active continuations, trail issues, git drift, dirty worktree summary, and recommended next actions.

`corpus commit-generated` plans generated-only commits for already-dirty generated files such as `research/corpus-status.md` and the registry `research/documents.md`. It is dry-run by default. Add `--apply` to stage and commit only generated files, and use `--message <text>` to override the commit message.

`classify` manages normalized frontmatter classification across the corpus. It writes deterministic fields such as `document_role`, `document_kind`, `visibility`, `lifecycle_state`, `classification_rule`, and `classification_confidence`. Legacy free-text role labels are preserved as `legacy_document_role`, `legacy_corpus_role`, or `legacy_role` instead of being discarded.

Use `classify plan` first. It is read-only and reports changes, conflicts, ambiguous cases, and kind counts. Use `classify explain <repo/path.md>` when one document looks surprising. Use `classify apply` only when the plan is conflict-free, then use `classify verify`.

Useful flags:

- `--repo <name>` limits the scan to one registered repository;
- `--view public|private` selects the visibility view;
- `--include-generated`, `--include-aliases`, and `--include-ignored` widen the scan;
- `--include-ambiguous` permits weak classifications to be written;
- `--fix-conflicts` deliberately overwrites conflicting explicit fields.

### 4.2 Document commands

```text
docs summary
docs query [repo|all]
docs search <text>
docs gaps
docs inspect <repo/path.md>
docs trails
docs judgments [repo|all]
```

Typical use:

- `docs query all --role trail`
- `docs trails`
- `docs query all --q autonomy`
- `docs gaps`
- `docs inspect cogentia/research/cognitive_packets.md`

### 4.3 Concept commands

```text
concepts list [repo|all]
concepts check [repo|all]
```

Use `concepts check` when you want consistency warnings across the typed concept registries.

### 4.4 Continuation commands

```text
continuation emit
continuation list
continuation inspect <id>
continuation resolve <id> [result.json]
continuation resume <id> [result.json]
continuation cancel <id>
continuation schema
```

These commands manage judgment handoff and resumption.

### 4.5 Issue commands

```text
issues list <repo>
issues packet <repo> <number>
```

`issues list` reads live GitHub issues for a registered repository alias or an explicit `owner/name` repository.

`issues packet` exports one GitHub issue as a `cogentia.issue_continuation.v1` packet, with YAML frontmatter and a Markdown body. It is read-only: it does not close, label, comment on, or otherwise mutate the issue.

Typical use:

- `issues list cogentia --state open --json`
- `issues packet cogentia 9`

This command family restores the operational part of the doctrine described in [`pipeline.md`](pipeline.md): an issue can be memory in tension, but it is not a stabilized source document.

### 4.6 Git commands

```text
git verify
git classify
git noise plan
repos status [repo|all]
repos fetch [repo|all]
repos push [repo|all]
repos import-owner <github-owner>
```

`git verify` reports ahead/behind and dirty state for each registered repo.

`git classify` splits dirty files into practical classes such as:

- `modified`
- `line_endings_only`
- `untracked`
- `added`
- `deleted`
- `renamed`
- `missing`

This is particularly useful during consolidation, because it separates real content drift from mechanical noise.

`git noise plan` adds conservative action suggestions on top of classification:

- `ignore_candidate` for obvious untracked local scratch files;
- `skip_worktree_candidate` for tracked generated logs or runtime artifacts that should usually not become corpus changes;
- `commit_generated` for generated navigation files;
- `review_manually` when the tool should not guess.

`repos` is the constrained batch helper for Git operations across the configured corpus
repositories. It is intentionally not an arbitrary shell runner.

- `repos status` reports remote URL, ahead/behind, dirty count and ignored-policy-aware dirty
  files for every configured repo.
- `repos fetch` runs `git fetch --dry-run` by default. Add `--apply` to update remote-tracking
  refs.
- `repos push` runs `git push --dry-run` by default. Add `--apply` to push. Dirty repositories
  are skipped unless `--allow-dirty` is passed, and repositories behind upstream are skipped.
- `repos import-owner` plans registration of all GitHub repositories visible under a user or
  organization account. It compares GitHub `owner/name`, local clones, and registry entries,
  then classifies each repository as already registered, registerable from an existing clone,
  missing locally, clone-and-register, private-skipped, or path-conflicted.
- Add `--only name[,owner/name]` or `--exclude name[,owner/name]` when only part of a GitHub
  owner's repository set belongs in the corpus. This is especially useful for contributor
  scenarios where the user neither owns nor controls the whole account.

Repository import is designed for ownership and mandate clarity. New entries can record:

- `github`, the canonical `owner/name` used for generated links and issue commands;
- `owner` and `owner_kind`, such as `person`, `organization`, `non_profit_organization`,
  `for_profit_organization`, or `unknown`;
- `ownership`, usually `own`, `mandate`, `contributor`, or `unknown`;
- `mandate`, a short human-readable reason for delegated work;
- `visibility`, `public_presence`, and `trace_level` for privacy-aware public/private views.

Private repositories are not imported by default. Add `--include-private` when the registry
should know about them; they are registered with private/stub visibility defaults.

Typical use:

```bash
node scripts/cogentia.js repos status --json
node scripts/cogentia.js repos push --json
node scripts/cogentia.js repos push --apply --json
node scripts/cogentia.js repos fetch cogentia --json
node scripts/cogentia.js repos import-owner acorsica --owner-kind non_profit_organization --relation mandate --json
node scripts/cogentia.js repos import-owner acorsica --owner-kind non_profit_organization --relation mandate --clone-missing --apply --json
node scripts/cogentia.js repos import-owner some-owner --only some-repo --relation contributor --json
```

### 4.7 Daemon command

```text
daemon
```

The daemon layer exposes local HTTP/API features and plugin routes for a richer local UX, but it stays subordinate to the same local registry and inventory model.

---

## 5. Plan/apply flags

The main planning flags are:

```text
--scope configured|all|research|repo:<name>
--repo <name>
--no-trails
--no-backlinks
--no-documents
--no-corpus-status
--create-backlinks
--include-content
--view public|private
--strict
```

Practical meaning:

- `--scope research` limits writes to `research/`
- `--repo marenostrum` scopes to one repo
- `--no-trails` disables trail refresh
- `--view public` forces the public visibility filter
- `--include-content` makes JSON plans carry full before/after bodies

---

## 6. Typical workflows

### 6.1 Orient yourself in a corpus

```bash
node scripts/cogentia.js status
node scripts/cogentia.js agent start
node scripts/cogentia.js docs summary
node scripts/cogentia.js docs query all --role trail
node scripts/cogentia.js docs search "continuation"
```

### 6.2 Inspect pending generated drift

```bash
node scripts/cogentia.js corpus plan --json
node scripts/cogentia.js corpus verify --strict
```

### 6.3 Refresh mechanical views

```bash
node scripts/cogentia.js corpus apply --json
```

This rewrites only the planned generated surfaces.

If generated files are already dirty and ready to commit, inspect the generated-only commit plan:

```bash
node scripts/cogentia.js corpus commit-generated --dry-run
```

Apply it only when blocked files are zero:

```bash
node scripts/cogentia.js corpus commit-generated --apply --message "Refresh generated corpus views"
```

### 6.3.1 Classify local scratch/noise

```bash
node scripts/cogentia.js git noise plan
```

Use this before deciding whether a dirty file should be ignored locally, skipped as generated runtime churn, committed as generated corpus maintenance, or reviewed as substantive work.

### 6.3.2 Normalize document classification

```bash
node scripts/cogentia.js classify plan --json
node scripts/cogentia.js classify explain cogentia/research/pipeline.md
node scripts/cogentia.js classify apply --json
node scripts/cogentia.js classify verify --json
```

Use this when the corpus has grown and navigation depends on consistent metadata. The classifier is deterministic and idempotent: after a clean apply, a fresh plan should report no changes, no conflicts, and no ambiguous cases.

### 6.4 Find documents that still need judgment

```bash
node scripts/cogentia.js docs judgments all
node scripts/cogentia.js docs judgments all --emit-continuations
```

### 6.5 Audit privacy in public view

```bash
node scripts/cogentia.js corpus privacy --view public --json
```

Use this after changing visibility policies, adding a private repo, or refreshing generated links.

### 6.6 Hand off a decision explicitly

```bash
node scripts/cogentia.js continuation emit --kind judgment --title "Classify X" --question "..."
node scripts/cogentia.js continuation list --status active
node scripts/cogentia.js continuation resolve <id> result.json --decision "..." --reason "..."
```

---

## 7. Invariants for a faithful re-implementation

A faithful re-implementation of v2 should preserve these invariants:

1. **Local-first registry model** - the CLI operates on local repositories, not a hidden service database.
2. **Markdown as the corpus substrate** - the source of truth is the working tree.
3. **Deterministic plan/apply split** - writes follow a read-only plan.
4. **Generated blocks only** - curated prose outside managed markers is preserved.
5. **Visibility-aware generation** - public views must not leak private structure.
6. **Judgment externalization** - the tool may surface decisions to make, but it should not smuggle judgment into mechanical refresh.
7. **Provider neutrality** - continuations remain resumable by another human or agent without changing the CLI.
8. **Archived history remains inspectable** - the v1 implementation is preserved for historical comparison, not silently overwritten.

---

## 8. Current differences from the archived v1 surface

The older implementation exposed many specialized commands directly, including separate trail refresh, README refresh, derived-product scheduling, and broader command families.

The current v2 CLI is intentionally narrower:

- smaller command surface;
- stronger `plan/apply/verify` discipline;
- continuations centered on externalized judgment;
- corpus navigation first;
- no assumption that a larger legacy surface should be ported unchanged.

When studying older corpus documents, treat `scripts/cogentia.v1-history.js` as the historical reference for that earlier command surface.

---

## 9. Minimal near-spec

If you need the shortest accurate statement of v2:

> `cogentia.js` is a zero-dependency local CLI that loads a registry of repositories, inventories Markdown documents with role and visibility metadata, computes cross-repo links, refreshes generated navigation blocks (`documents`, `corpus-status`, `trails`, `backlinks`), and externalizes non-mechanical judgment through continuations.

That is the stable core.

---

*Generated automatically on 2026-06-19 from the current v2 CLI and associated corpus documents.*
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Reality Safety](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/reality_safety_procedural_stabilizers.md)
- [Cogentia](../README.md)
- [Documents - All Tracked Repos](documents.md)
- [Pipeline](pipeline.md)
- [Research Index — Cogentia](index.md)
- For researchers
- [Reactive Cognitive COP Extension](https://github.com/JeanHuguesRobert/inseme/blob/main/research/reactive_cognitive_cop_extension.md)
- [Corpus Start Here — Carte globale du Corpus](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/corpus-map.md)
- [Documents - All Tracked Repos](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/documents.md)
- [Public Corpus Navigation](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/public-navigation.md)
<!-- END_AUTO: backlinks -->
