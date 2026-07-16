---
title: TODO — cogentia
author: unknown
date: '2026-05-26'
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 1b7603e
  origin_date: '2026-05-26'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# TODO — cogentia

Repo-local engineering follow-ups. Network-level / cross-repo work lives in `JeanHuguesRobert/TODO.md`.

## Strategic distance — where we are vs the stated goal

**Goal:** provide both (a) a new method for rational exploration of the possible, and (b) a first GitHub-based tool that complies with that method.

**Distance estimate (2026-05-18):**

- **Method as *statement* — ~80%.** `second_method.md` exists, applies its own rules to its own production, and names what it has not yet solved. The remaining 20% is the hard 20%, and it is named explicitly in the doctrine itself: Rule 0's architectural enforcement is unsolved; the bootstrap problem ("30 years" is not a path); the circular guarantee can only be closed by external challengers, which currently don't exist.
- **`cogentia.js` (the static corpus tool) — ~85%.** Works, MIT, zero deps, named in the doctrine. Publishable without doctrinal reservation: `scan` correctness is now anchored on real link parsing (`buildReferencedFileSet`), cross-repo refs are path-segment-matched (no false positive on `cogentia-old` vs `cogentia`), Mermaid diagrams are navigable (orphan-filtered + clickable), and `cogentia documents` / `cogentia forks` extend the corpus-hygiene surface. Remaining 15% is polish + the `cogentia inflection` / continuation-tracking work that's still design-stage.
- **Cogentia Commons (`apps/commons`, the operational platform) — ~15-20%.** Currently UI scaffolding over `mockData`. The multi-agent critique loop — the piece that would *demonstrate* the method, not just state it — does not yet exist. See "Cogentia Commons — design contracts from `second_method.md`" below.

**Honest reading:** the *method* is articulated, the *static tool* works, the *operational platform* is a stub. Mutual cross-linking among six repos by one author is structurally close to one repo with extra `git remote`s — the method requires external challengers to close its circular guarantee, and we have none yet.

## Strategic priorities (ranked)

Three highest-leverage next moves, in order of impact-per-effort. Detailed sub-items live in the dedicated sections below.

1. **Build the smallest real multi-agent critique loop in `apps/commons`** — agent reads `research/second_method.md` (or `marenostrum/DHITL.md`), surfaces an unanchored claim, produces a falsifiable counter-claim, human gates whether it enters the corpus. Even crude. That is the smallest unit of the method *working*, not just *stated*. Doing this on the doctrine itself, publicly, with the resulting commits visible, is the demonstration the method requires of itself.
2. **Fix `scan` correctness in `cogentia.js`.** *(Done 2026-05-18 — `buildReferencedFileSet` now resolves real markdown links instead of basename-substring matching.)* Replaces basename-substring matching with actual link parsing. Shores up the only public-facing claim ("the tool flags every unanchored assertion") that doesn't fully hold today.
3. **Invite specific named external participants to fork** — *(driver: jhrobert; this one cannot be done from inside)*. The circular guarantee cannot close from inside the six-repo corpus. Until at least one external fork exists with a `research/index.md` that links into the network, the corpus is structurally a single-author project regardless of repo count. Pick names. Reach out concretely.

## Verify the monorepo migration

- [x] *(Done 2026-05-18.)* `pnpm install` from repo root — both workspaces resolve, 143 packages added, 25.4s.
- [x] *(Done 2026-05-18.)* `pnpm build` (Turbo) — both apps build cleanly. Revealed and fixed one stale path: `apps/commons/src/pages/PaperPage.jsx` imported `../../research/…` (left over from pre-refactor); corrected to `../../../../research/…`.
- [ ] `pnpm personal:dev` / `pnpm commons:dev` — boot + manual route walk. Requires dev server + browser (and Supabase creds for `personal`). Run when next touching either app.

## Migration decisions

- [x] *(Done 2026-05-18.)* **PlatformIndex.jsx** — deleted. Unrouted, assumed a single-deployment archi that doesn't match current Netlify split. A future `cogentia.com` front-door would deserve its own `apps/landing/`.
- [ ] **`apps/commons/netlify.toml`** — *Blocked: unblock when the Commons Netlify site is provisioned.* Not actionable until then.
- [ ] **`apps/commons/.env.example`** — *Blocked: unblock when Commons starts using a real backend.* Not actionable today (no Supabase import in Commons).
- ~~Commit strategy~~ — *moot, the changesets are committed.*

## Audit follow-ups (lighter)

- [ ] **`apps/personal/samples/cogentigram_author.json`** (19KB) — orphan. Document its purpose in `apps/personal/README.md`, or remove.
- [x] *(Done 2026-05-18.)* Root pnpm script `cogentia` → `node scripts/cogentia.js`. Usage: `pnpm cogentia list`, `pnpm cogentia documents`, etc.

## `cogentia.js` improvements

Priority is doctrinally-anchored: `second_method.md` names `cogentia.js scan` / `check` as canonical tooling. The script's behaviour is part of a published method.

- [x] **Tighten `scan` reference detection.** (Done 2026-05-18.) Replaced `indexContent.includes(basename(X))` at 5 sites (`cmdStatus`, `cmdScan` ×3, `cmdState`) with `buildReferencedFileSet(indexPath, indexContent)` — parses real `[text](url)` links, skips URLs with a scheme / pure fragments, decodes percent-encoding, resolves relative to the index's directory. Caught one masked false-clean in `barons-Mariani` (`research/democratic_ai_safety.md` is a local duplicate of cogentia's; the index links to the cogentia URL, not the local copy).
- [x] *(Done 2026-05-18.)* **Fix help-text invocation string** — every `node cogentia.js` in JSDoc + help + error string is now `node scripts/cogentia.js`, aligned with the doctrinal Coda.
- [x] *(Done 2026-05-18.)* **`extractCrossRefs` path-segment match.** New helper `urlMatchesRepoName(url, name)` uses `(?:^|/)<name>(?:/|$|#|?)` regex so `cogentia-old` URLs no longer false-positively count as refs to `cogentia`. Verified with 9 unit tests.
- [ ] No tests for the CLI itself.
- [ ] **`cogentia forks <repo>` — make divergence visible from the origin.** The doctrine treats forking *as* the objection (no merge required). Smallest tool: query GitHub `/repos/{owner}/{name}/forks`, fetch each fork's `research/index.md` (and files whose `canonical_url` points back to this repo) via `raw.githubusercontent.com`, diff against local. Output: a table of "this line / this file has diverged at fork X". Merging stays manual (cherry-pick / PR). Pre-requisite: a GitHub API access path (env `GITHUB_TOKEN` first, `gh auth token` fallback, anonymous mode for public repos at the 60 req/h ceiling). Multi-user forks and PR-helper sugar are post-MVP.
- [x] *(Done 2026-05-18.)* **`buildConceptGraphBlock` — dedupe concept nodes by id.** Canonical-repo policy: prefer `scope` containing "global" (case-insensitive), else first-iterated (load order from `.cogentia.json`). Edges keep all fan-in/out from every declaration. Verified: `Cogentia` and `Cogentigram` (each declared in 5 repos) now emit one node + one click each, URL pointing at the cogentia repo.
- [ ] **Multi-agent loop — trace inflections, not commits, not conversations.** Current practice: manual copy/paste between agent conversations; commits are already filtered ("raisonnablement stabilisé"), typically in small clusters (1 stabilization + 1-2 fixups), with rare exceptional doctrinal-innovation commits. The friction is doctrinally valuable (Rule 0), so don't automate the dispatcher. Annotating *every* commit would be noise — clusters would repeat or contradict themselves. Right grain: annotate **at cluster close, only when doctrinally significant** (~1 in 10). Recommended mechanism: `git tag -a doctrinal/YYYY-MM-DD-<slug> -m "Challenge: … / Decision: … / Reason: …"` (signable, dated, listable via `git tag -l "doctrinal/*"`, no log pollution). Alternative: `git notes add` on the last commit of a cluster. Tool-side: optional `cogentia inflection <slug>` that wraps the tag command, validates the trailer format, appends to `.cogentia/audit.jsonl`, and (eventually) emits a `cogentia.continuation.v1` artifact recording the inflection. Discipline + git tag covers the 95% case; tool is sugar.

## Cogentia Commons — design contracts from `second_method.md` and DHITL

The Five Rules are load-bearing on the `apps/commons` product. DHITL is the architectural axiom every feature must respect.

> *All five items below are gated by strategic priority **#1** (the multi-agent critique loop). Kept here as a design checklist for when that work ripens; not currently actionable in isolation.*

- [ ] **Rule 0 audit** — any "validation" / "vote" / "binding decision" feature must structurally exclude agent participation. Cogentia Commons sits at the cognitive infrastructure layer: open to agents, *not* deliberative. Document where the human is in the causal chain of every binding decision.
- [ ] **Rule 2 — Burton conversion affordance** — the multi-agent critique loop must distinguish *feelings of certainty* from falsifiable objections. UI implication: every objection input should have an explicit "convert your feeling into a falsifiable claim" prompt before it enters the record.
- [ ] **Veneer-adoption mitigation** — Cogentia Commons must verify *commit chronology*, not just current state. Accepting a thesis whose history was retro-fitted is a doctrinal failure.
- [ ] **Self-test the multi-agent critique loop on `second_method.md` (or DHITL)** — the doctrinal "fractal" claim implies the method must apply to its own foundational documents.
- [ ] **Surface "what does the corpus currently demonstrate"** as a first-class view (Rule 4 — corpus-as-evidence). Reuse / extend `barons-Mariani/research/corpus-status.md` as the data source.

## Cross-doc consistency follow-ups (residual from the corpus restructuring)

The internal-consistency audit is largely resolved by the restructuring just performed (DHITL is canonical for the Layer scheme; version markers dropped; Cogentiscope added to formal definitions; outdated docs removed). Residual items:

- [ ] **Read `marenostrum/DHITL.md` directly** to confirm it actually states the layer scheme the corpus now defers to. If DHITL.md itself uses an outdated/different scheme, fix at source — the canonical document must match what its citers say it says.
- [ ] **Review `Cogentia_Commons_Working_Paper.md` cross-section references** — beyond §10.2 (already fixed), spot-check that no other section references are dangling.
- [ ] **Consider unifying the EN/FR `kys-prompt.md` / `cogentia_prompt_v1.md`** into a single source-of-truth + translation, rather than two parallel documents that can drift.

## Recent doctrinal work

Historical session notes (2026-05-09 monorepo refactor, 2026-05-10 DHITL canonicalization) live in git log. Recent additions:

- **2026-05-18** — `cogentia documents`, `cogentia forks`, Mermaid orphan-filter + clickable nodes, `scan` correctness fix (`buildReferencedFileSet`), `extractCrossRefs` path-segment match, concept-graph dedupe, root `pnpm cogentia` script, GitHub-token cascade (env → `gh auth token`), English-language discipline for generated artifacts. Monorepo verification (`pnpm install` + `pnpm build`) + fixed a stale import in `PaperPage.jsx` + deleted unrouted `PlatformIndex.jsx`.
