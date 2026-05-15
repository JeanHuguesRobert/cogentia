---
title: "Cogentia Commons — Workflows"
description: "End-to-end user journeys assembling the component specs into runnable scenarios. Prioritised for v1 implementation velocity planning."
layout: default
nav_order: 10
version: "draft-0.1"
last_modified_at: 2026-05-12
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
status: "Working sub-specification — companion to cogentia_commons_mvp_spec.md"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_commons_workflows.md
last_stamped_at: 2026-05-15
---

# Cogentia Commons — Workflows

*Sub-specification of [`cogentia_commons_mvp_spec.md`](cogentia_commons_mvp_spec.md). The parent spec and its companion sub-specs describe what each component does in isolation; this document walks the user journeys that assemble them. Workflows are how integration bugs surface — a component that works on its own can still fail at the seams.*

---

## 0. Preamble

Each workflow below is a numbered scenario with a fixed shape: **actors**, **preconditions**, **steps** (numbered, each naming the COP Events emitted, the affected formal-graph rows, and the UI surface where applicable), **postconditions**, **cross-references**, and **soft spots**. Steps cite the component specs by section; the workflow does not redescribe what those sections already specify.

Workflows are prioritised for v1 implementation velocity:

| Priority | Meaning |
|---|---|
| **v1-critical** | Must work for the §11.1 acceptance test in the parent spec. Cannot ship v1 without this. |
| **v1-if-velocity** | Operational v1 if implementation time permits. The platform demo (§11) does not strictly require it; the platform is meaningfully less complete without it. |
| **v1.1+** | Deferred. The schema and component contracts already accommodate it; the workflow itself is not v1. |
| **deferred-by-design** | Out of v1 scope per parent §1.4. Sketched here so the v1 schema does not foreclose it. |

The v1-critical set is the path implementation velocity should optimise for: workflows #1, #2, #3, #5, #6, #9. Workflow #4 is v1-critical *if* the v1 demo wants to exhibit multi-user editor synthesis; if the demo's Author can self-synthesise, #4 can fall to v1-if-velocity.

---

## Priority index

| # | Workflow | Priority |
|---|---|---|
| 1 | Document registration → first kernel | **v1-critical** |
| 2 | Objector files an Objection (Burton path included) | **v1-critical** |
| 3 | Author opens a round on a node | **v1-critical** |
| 4 | Editor synthesises a Revision | **v1-if-velocity** *(critical if multi-user demo required)* |
| 5 | Author edits literate form → anchor migration | **v1-critical** |
| 6 | Author mints a Publication | **v1-critical** |
| 7 | Sanction issuance and appeal | **v1-if-velocity** |
| 8 | Cross-community citation | **v1-if-velocity** |
| 9 | Community founding (first `COMMUNITY.md` commit) | **v1-critical** *(lightweight)* |
| 10 | Manifest amendment | **v1.1+** |
| 11 | Retrofit and revendication | **deferred-by-design** |

---

## 1. Document registration → first kernel  *(v1-critical)*

**Actors.** Author (verified GitHub identity, member of a community).

**Preconditions.**
- The community exists (Workflow #9 has run).
- The Author has a markdown Document committed to a GitHub repo they control.
- The community manifest's plugin allow-list includes `cogentia.plugins.kernel_extractor`.

**Steps.**

1. Author navigates to *Register Document* in the Commons UI. Enters the GitHub URL of the markdown file. UI fetches the raw content and computes the commit SHA at `HEAD`.
2. Author confirms the community to register under. Commons emits `cogentia.document.opened` with `documentId`, `repo`, `path`, `authorGithubHandle`, `commitSha`. A new Document row is created in the community's Supabase projection with `status: draft`.
3. UI prompts the Author: *"Run kernel_extractor to bootstrap the formal graph?"* Author accepts. Commons opens a `cop/continuation` on the Document with `intent: kernel_extraction`, `agent: <Author's github handle>`.
4. Commons renders the `kernel_extractor` prompt (cf. [`cogentia_commons_kernel_extractor.md`](cogentia_commons_kernel_extractor.md) §9) with the Document's literate content. UI shows a *Copy prompt* button.
5. Author copies the prompt into the conversational agent of their choice; pastes the agent's response back into the Commons paste field. Commons extracts the JSON block. `cogentia.plugin.invoked` and then `cogentia.plugin.returned` Events are emitted.
6. UI shows the proposed kernel: 1 Thesis (or null), N Premises, M Claims, K Constraints, P ambiguous passages. For each proposal: **Accept / Edit / Reject** buttons; bulk *Accept all* available. `cogentia.kernel.proposed` is in the Event log; nothing is yet committed to the formal graph.
7. Author resolves each proposal. Editing is permitted at this step (anchor IDs are still mutable). On final acceptance, `cogentia.kernel.accepted` is emitted, with `kernelArtifactIds` listing each new `cogentia/thesis | premise | claim | constraint` Artifact. The Document's `status` transitions to `active`.
8. The kernel_extractor Continuation closes with `resolution_kind: resolved`. The AgentReview row transitions to `accepted`.

**Postconditions.**
- Document is registered with `status: active` and a populated kernel.
- The formal graph has anchor IDs that are now permanent (the Document's URI namespace is fixed).
- Every kernel node is addressable as `cogentia://<community>/<commit_sha>/<anchor_id>`.

**Cross-references.**
- Parent spec §5.1 (entity model), §5.7.4 (Event types), §7 (round mechanics — this is a degenerate round with one plugin).
- [`cogentia_commons_kernel_extractor.md`](cogentia_commons_kernel_extractor.md) — full plugin contract.

**Soft spots.**
- If the Author rejects ALL proposals, the Document remains `status: draft` with no kernel. Re-running `kernel_extractor` (possibly with a different conversational agent) is the recovery path. No data loss — the rejected proposals stay in the Event log.
- If the Document is bilingual (FR preamble + EN body, like `second_method.md`), the v0.1 `kernel_extractor` stop-word list is EN-only; the FR sections may be under-extracted. Acceptable in v1; flagged for v0.2.
- Author confirmation locks anchor IDs forever (§5.6). A typo at acceptance time is hard to fix later. UI should display the proposed `cogentia://` URI for each kernel node *before* the Author clicks Accept.

---

## 2. Objector files an Objection (Burton path included)  *(v1-critical)*

**Actors.** Objector (verified GitHub identity, any community member).

**Preconditions.**
- A target Document exists with `status: active`.
- The target has at least one anchored Thesis / Premise / Claim.

**Steps.**

1. Objector navigates to the target node in the Commons UI (via `cogentia://` URI or the Document's graph view). Selects *Object to this*. UI presents a free-text field plus a checkbox: *"My objection names a calculation, citation, or measurable prediction that would settle this — and I commit to it."*
2. Objector writes the Objection. Submits. Commons emits `cogentia.objection.submitted` with `targetId`, `objectionArtifactId`, `objectorGithubHandle`. The Objection enters the record immediately, `status: proposed` (§1.1 permissive default — no precondition gate).
3. UI prompts: *"Run `falsifiability_conversion` to check this is in falsifiable form?"* (Defaulted ON; Objector can opt out — but then the Objection enters the record with a self-attested-falsifiable note.)
4. Objector runs the plugin via the paste-bridge (cf. [`cogentia_commons_substantive_plugins.md`](cogentia_commons_substantive_plugins.md) §1). Three possible verdicts:

   - **`already_falsifiable`** → AgentReview attached to the Objection. No further action. Objection's `status` advances to `substantive` if the community's `support_threshold` is 0 (or stays `proposed` pending Supports).
   - **`conversion_proposed`** → Objection is automatically Marked `un-falsifiable` (§4.5 rung 2). A Continuation `intent: burton_conversion` opens with the Objector as eligible resumer. The converted_statement is presented for review. Per parent §7 step 4, *the Objection is in the record either way* — the conversion is an invitation. Objector accepts / amends / rejects the conversion:
     - **Accept** → the converted form enters the record as a NEW `cogentia/objection` Artifact with `responds_to: [<original_id>]`. The original keeps its `un-falsifiable` Mark; the converted one does not.
     - **Reject** → AgentReview moves to `rejected`. The original Objection remains with its Mark.
     - **Amend** → Objector edits, then accepts the amended form.
   - **`unable_to_convert`** → similar to `conversion_proposed` but with a more explicit "this Objection is too vague" surface. Objector either re-writes and resubmits or accepts the `un-falsifiable` Mark.

5. The Burton Continuation closes. Author of the target Document is notified that a new Objection exists.

**Postconditions.**
- An Objection (and possibly a converted form) is in the record.
- If `un-falsifiable`, the Mark is permanent on the original; the converted form (if accepted) is unmarked.
- The Author has a new pending-work item visible on the target node.

**Cross-references.**
- Parent §1.1 (permissive default), §4.5 (Mark mechanism), §5.7.4 (Event types), §7 step 4 (Burton handling).
- [`cogentia_commons_substantive_plugins.md`](cogentia_commons_substantive_plugins.md) §1 — `falsifiability_conversion` contract.

**Soft spots.**
- An Objector who repeatedly submits un-falsifiable Objections accumulates `un-falsifiable` Marks across multiple contributions. Under §4.5 rung 1 (informational tag), their record reflects this. Persistent abuse escalates to rung 3 (cooldown) per Workflow #7.
- The "self-attested falsifiable" checkbox in step 1 is a thin guard — Objectors can opt out of the Burton check and still claim falsifiability. The Mark mechanism catches this post-hoc; v0.2.0 may add a Reviewer challenge surface.
- Objections on `cogentia/manifest` Artifacts (challenging the community's governance) follow the same flow but currently use the same prompt. v0.2.0 may add a manifest-specific Burton variant.

---

## 3. Author opens a round on a node  *(v1-critical)*

**Actors.** Author of a Document.

**Preconditions.**
- A target node exists in the Document (Thesis, Premise, Claim, or Objection).
- The Author has at least one audit plugin in the community's allow-list to run.

**Steps.**

1. Author navigates to the target node, selects *Open round*. UI presents the community-allowed plugins as a multi-select. Author picks one or more.
2. Commons emits `cogentia.round.opened` with `documentId`, `taskId` (new COP Task per round), `targetId`, `targetType`, `pluginIds`. A root Continuation is created with `intent: round.open`, `agent: <Author's handle>`.
3. For each selected plugin, a child Continuation is created:
   - **Structural plugins** (`citation_validator`, `consistency_scanner`, `objection_summariser`): `agent: <plugin_id>`. Plugin runs (deterministic, hybrid, or LLM-driven per its contract). AgentReview is auto-applied (`status: accepted`). Child Continuation closes `resolved`.
   - **Substantive plugins** (`falsifiability_conversion`, `revision_proposer`): `agent: <Author's handle>` (the LLM is a tool, not a COP Agent). UI renders the prompt via paste-bridge. Author copies, pastes, reviews output. AgentReview persisted as `proposed`. A grandchild Continuation `intent: author_acceptance` opens with the Author as resumer.
4. Author dispositions each substantive AgentReview: accept, edit-and-accept, or reject. Author-acceptance Continuations close in order. Per parent §7 step 4, the round does NOT block on un-falsifiable outputs — they enter the record marked and the round can close.
5. Author marks the round closed. Commons emits `cogentia.round.closed` with `taskId`, `closedByGithubHandle`, optional `outcomeCommitSha` if a Revision resulted.
6. Root Continuation closes `resolved`.

**Postconditions.**
- All plugin AgentReviews persisted. Structural ones are `accepted` (informational); substantive ones reflect Author dispositions.
- New contributions (converted Objections, Revisions) are in the formal graph if accepted.
- The round task is in COP `done` state.

**Cross-references.**
- Parent §7 (round mechanics — this is the prose form of that section).
- Parent §5.7.3 (Commons Topics — each Document has its own Topic).

**Soft spots.**
- An Author who opens a round, runs several plugins, and never closes the round leaves the root Continuation `active` indefinitely. Acceptable in v1 (no auto-close per §1.1); but the UI should surface long-running open rounds in the Author's home view so they're not forgotten.
- Concurrent rounds on the same Document are permitted (different target nodes). Two rounds touching the same node are also permitted but the UI should warn — the second round's plugins may see state mid-flight.

---

## 4. Editor synthesises a Revision  *(v1-if-velocity)*

**Actors.** Editor (community member meeting §4.4 independence constraint; not the author of the Objections being synthesised).

**Preconditions.**
- A target node has multiple open Objections (typically ≥ 2; otherwise an Author edit suffices).
- The Editor is independent per §4.4.

**Steps.**

1. Editor reviews the target node's pending-work view. They see Objections, prior AgentReviews from `objection_summariser` (if any), and any current `editor_synthesis` Continuation.
2. If no `objection_summariser` AgentReview exists, the Editor or the Author can open a round to run it first (Workflow #3, structural-only). The plugin returns clusters, themes, synthesis hints (cf. [`cogentia_commons_structural_plugins.md`](cogentia_commons_structural_plugins.md) §3).
3. Editor claims the `editor_synthesis` Continuation. Commons checks: GitHub identity verified ✓, independence constraint ✓ (the Editor's handle does not appear as `author_handle` on any of the Objections being synthesised). If `eligibleResumers` lists the Editor by role or handle, the claim is in-list; otherwise the claim succeeds with `out-of-eligibility` Mark on the eventual Revision (§5.7.6 advisory rule). Commons emits `cogentia.continuation.claim.out_of_eligibility` if applicable; otherwise `human.input.provided` (COP/HITL) referencing the Continuation.
4. Editor runs `revision_proposer` via paste-bridge (cf. [`cogentia_commons_substantive_plugins.md`](cogentia_commons_substantive_plugins.md) §2). Inputs include the target node, the Objections being addressed, the synthesis hint (if from §2). Plugin returns a `proposed_patch` and lists which Objections are addressed vs not.
5. Editor reviews the patch. If acceptable as-is, Editor copies the patch into their local working tree of the Author's repo (or proposes via a GitHub PR), commits, and pushes. Commons detects the commit (or the Author confirms it) and emits `cogentia.revision.committed`.
6. The new commit triggers the §5.6 anchor migration flow (Workflow #5) to propagate the change into the formal graph. The Editor's Revision Artifact carries `responds_to: [<objection_ids>]` edges.
7. Objections addressed by the Revision transition from `substantive` to `resolved` once the Author confirms the migration. Unaddressed Objections remain open.
8. Editor synthesis Continuation closes with `resolution_kind: resolved`.

**Postconditions.**
- One or more Revisions are in the formal graph.
- The Author's Document has a new commit (made by the Editor, signed by the Editor's GitHub identity).
- Addressed Objections are `resolved`; unaddressed Objections remain visible with the Editor's recorded reason for not addressing them.

**Cross-references.**
- Parent §4.4 (Editor eligibility), §5.7.6 (out-of-eligibility), §5.6 (anchor migration follows).
- [`cogentia_commons_substantive_plugins.md`](cogentia_commons_substantive_plugins.md) §2 — `revision_proposer`.

**Soft spots.**
- Step 5 assumes the Editor has git push access to the Author's repo *or* uses a PR. The Author may not have given push access. v1: Editor opens a PR; Author merges; the merge commit is what Commons records. UX: Commons should make "open PR" the default surface for the Editor.
- Editor synthesises in a different head-commit than the one shown in the UI. By the time the Editor commits, the Author may have committed something else. The §5.6 migration handles this — the Editor's commit is one of several, the Author's migration Continuation resolves both. Two Editors racing on the same `editor_synthesis` Continuation: first to commit wins; the second's Continuation closes `superseded` per §5.5.
- The Editor role has no platform-issued credentials. Their authority is entirely from their GitHub identity + their independence per §4.4. There is no Editor-specific UI gate beyond the eligibility check.

---

## 5. Author edits literate form → anchor migration  *(v1-critical)*

**Actors.** Document Author. Anyone with open Objections / Continuations / Supports on the affected nodes is affected.

**Preconditions.**
- The Document has a current confirmed commit + a populated formal graph.
- The Author has committed a new revision of the literate form to the GitHub repo.

**Steps.**

1. The platform detects the new commit (via GitHub webhook in v1.1, or via the Author manually triggering *Sync from GitHub* in v1). Commons computes the diff between the previous confirmed commit and the new one. For each kernel node, the diff classifies the anchor's state as **Unchanged / Edited / Removed / Split / Merged** (parent §5.6 five cases).
2. Commons emits `cogentia.anchor.migration.proposed` and opens a Continuation with `intent: anchor_migration`, `agent: <Author's handle>`. The new commit is marked **provisional** — until the migration resolves, the formal graph still reads from the previous confirmed commit. The UI shows a *Migration pending* badge on the Document.
3. The Author opens the migration view. UI shows per-anchor proposals:
   - *Unchanged* — auto-carried, not displayed unless requested.
   - *Edited* — shown with before/after text; Author chooses *cosmetic* (no semantic change) or *substantive* (a Revision row is created).
   - *Removed* — Author confirms deprecation or restores.
   - *Split* — two proposed new Premises with `derived_from` edges to the old; Author confirms or edits.
   - *Merged* — one proposed new Premise; Author confirms or edits.
4. For each open contribution on affected anchors:
   - **Objections on Edited anchors**: Marked `needs_revisit`. A Continuation `intent: objection_revisit` opens with the Objector as resumer.
   - **Objections on Removed anchors**: Marked `stranded`. A Continuation opens with the Author as resumer; Author classifies as `resolved-by-removal` or `orphaned`.
   - **Objections on Split/Merged anchors**: Cloned per resulting anchor; Objector confirms which clones apply.
   - **Continuations on Edited anchors with text-quoting state**: Marked `superseded`; new Continuations opened with patched state.
   - **Continuations on Removed anchors**: Marked `abandoned` with auto-justification `"target deprecated at commit <sha>"`.
   - **Supports**: Never migrate. Pinned to the contribution version they were given to.
5. Author resolves the migration Continuation atomically. Commons emits `cogentia.anchor.migration.resolved` with `confirmedMigrations`. The new commit is promoted to *confirmed*. The Document's `current_commit_sha` updates.
6. The migration view closes. Downstream Continuations (objection revisits, stranded dispositions) become active in the affected actors' pending-work views.

**Postconditions.**
- The formal graph aligns with the new confirmed commit.
- Every affected contribution is in a defined state (carried, revisited, stranded, cloned, superseded, abandoned).
- No silent re-anchoring has occurred.

**Cross-references.**
- Parent §5.6 (anchor lifecycle and re-anchor semantics), §5.7.4 (Event types).

**Soft spots.**
- Step 1 assumes diff detection. In v1, the Author manually triggers sync; v1.1 should add a GitHub webhook for automatic detection.
- A heavy refactor (many Splits and Merges) produces a large migration Continuation. The Author may resolve it in stages (partially confirm, re-open later) — the Continuation's `state` payload supports incremental progress. UI must handle "partially confirmed" state cleanly.
- If the Author commits during an unresolved migration (a second new commit before the first migrates), v1 says: the second commit is queued; the first's migration must resolve before the second's diff is computed. Two stacked provisional commits is a v1.1 concern.

---

## 6. Author mints a Publication  *(v1-critical)*

**Actors.** Document Author.

**Preconditions.**
- The Document has a populated kernel.
- The Author wants to commit to a snapshot — either the initial version, an improved version, a refutation, a synthesis, or a note about a specific Premise or Conclusion.
- The current commit's anchor migration (if any) is resolved.

**Steps.**

1. Author navigates to the Document, selects *Publish*. UI presents:
   - The Publication artifact type (initial / improved / premise_note / conclusion_note / refutation / synthesis — cf. parent §8.1).
   - The current commit SHA.
   - A pre-publication summary: open Objections count, citation_validator latest status (live / dead counts), consistency_scanner latest findings, sanctions in flight on the Document or any contribution, any unresolved Continuations.
   - For `improved` / `synthesis` Publications: the list of Revisions integrated since the previous Publication.
2. The community manifest may impose a precondition (e.g. `dead == 0` on citation_validator for `improved` or higher per `citation_validator` §1.6). UI surfaces unmet preconditions; Author cannot proceed until resolved.
3. **Initial-publication gate (community-elected per parent §8.3).** If `artifact_type: initial` AND the community manifest names moderators (per [`COMMUNITY.md`](cogentia_commons_community_manifest.md) §6.1):
   - Author submits a *request* (not yet a Publication). Commons emits `cogentia.publication.initial.requested` and opens a `cop/continuation` with `intent: publication_initial_review`, `agent: role:initial_publication_approver`, `eligibleResumers: <named moderators>`.
   - The request surfaces in each eligible moderator's pending-work view.
   - A moderator claims the Continuation, reviews the Document at the requested commit SHA, and resolves with **Approve** or **Reject**:
     - **Approve** → Commons emits `cogentia.publication.initial.approved` with a signed `cogentia/publication-review` Artifact. Flow continues to step 4 below — Publication minting proceeds automatically.
     - **Reject** → Commons emits `cogentia.publication.initial.rejected` with a mandatory `reason`. The signed `cogentia/publication-review` Artifact records the rejection. Author may revise the Document (new commit, anchor migration per §5.6) and re-request. The rejected request remains immutable in the record.
   - The Author may submit an appeal on a rejection via the community's appeals protocol (manifest §6.3); same surface as §4.5 appeals on sanctions.
   - This step is **skipped** if `artifact_type ≠ initial`, or if the community manifest names no moderators.
4. Commons emits `cogentia.publication.minted` with `publicationArtifactId`, `documentId`, `commitSha`, `artifactType`, `canonicalUri`.
5. The Publication Artifact (`cogentia/publication`) is created. The canonical URI `cogentia://<community>/<commit_sha>/<node_id>` (cf. parent §8.2) becomes resolvable by the Commons resolver.
6. UI displays the canonical URI and a *Copy citation* button. The Author shares the URI externally as the citable reference.

**Postconditions.**
- A stable, immutable Publication record exists for the current commit + Document state.
- The canonical URI resolves to the literate form (via GitHub) + the formal graph snapshot (via Supabase) + the AgentReview history at the publication commit.
- Future Publications create new records; previous Publications remain valid permanently (the URIs do not rot — the GitHub commit pin guarantees this).

**Cross-references.**
- Parent §8 (Publication), §5.7.4 (`cogentia.publication.minted`).

**Soft spots.**
- The community manifest's precondition policy (step 2) is community-specific. v1 ships a default of "warn but don't block"; communities may tighten. Should the default be stricter? Defer to the founder's manifest.
- Republishing the same commit (e.g. Author wants to upgrade `artifact_type` from `initial` to `improved`) is not yet specified. v0.1.0 says: each commit can be Published at most once per artifact_type. Author re-publishing at a higher tier is a new Publication record (the prior one remains).
- The Publication act in v1 is a UI button. v1.1 could expose a `cogentia.js publish <doc-uri> --type improved` CLI for automation, useful for batch / CI workflows.

---

## 7. Sanction issuance and appeal  *(v1-if-velocity)*

**Actors.** Issuer (Author for cooldown on their Document; named moderator for community-wide cooldown or ban). Target (the sanctioned user). Appellant (anyone, including the target).

**Preconditions.**
- The community manifest declares an accountability policy (cooldown_issuers, ban_issuers, durations, appeals protocol — cf. [`cogentia_commons_community_manifest.md`](cogentia_commons_community_manifest.md) §6).
- A user has accumulated a record warranting sanction per the community's Acceptable Use Statement.

**Steps.**

1. Issuer navigates to the target user's record (visible to community members) and selects *Issue sanction*. UI requires: rung selection (3 = cooldown, 4 = ban), duration (within manifest ceiling), free-text reason (mandatory).
2. Issuer submits. Commons emits `cogentia.user.cooldown.imposed` or `cogentia.user.banned` with target/issuer handles, duration, reason, sanctionArtifactId. A `cogentia/sanction` Artifact is created; a `cop/continuation` is created with `resumeAfter: <expiry timestamp>` and `agent: "scheduler"`.
3. Target is notified (Commons UI banner; community manifest may also push to email). The target's permissions are restricted per the rung — cooldown blocks new Continuation opening; ban blocks all new Event submission. Reading + Support are never restricted.
4. *Appeals path (optional):* Appellant (target or anyone) navigates to the sanction record, selects *Appeal*. Submits a `cogentia/appeal` Artifact with their reasoning. Commons emits `cogentia.user.sanction.appealed`. The community manifest's `appeals_reviewer` (a role or handle) is notified. The appeal is a public record.
5. Appeals reviewer dispositions within `time_to_respond_days` (manifest): **uphold** (sanction stands), **lift** (appeal succeeds, sanction lifted early), or **escalate** (federated community per manifest, if specified).
   - **Uphold** — Commons emits `cogentia.appeal.upheld` referencing the appeal and the sanction. The sanction continues to its scheduled expiry.
   - **Lift** — Commons emits `cogentia.user.cooldown.lifted` or `cogentia.user.unbanned` with `liftReason: "appeal_succeeded"`. The Continuation tied to the sanction is closed early (`resolved` with the early-lift reason in `meta`).
6. *Otherwise (no appeal or appeal upheld):* The Scheduler resumes the sanction's Continuation when `resumeAfter` arrives. Commons emits `cogentia.user.cooldown.lifted` or `cogentia.user.unbanned` with `liftReason: "expiry"`. The target's permissions are restored. The sanction Artifact remains immutable in the record.

**Postconditions.**
- A signed sanction Artifact exists in the Event log forever (immutable per COP §2.6).
- The target's restriction is in place until expiry or appeal-lift.
- The issuer's signed record is part of their reputation (recursive accountability — frivolous bans cost the issuer too).

**Cross-references.**
- Parent §4.5 (the four-rung ladder), §5.7.4 (Event types), §5.7.5 (`cogentia/sanction`, `cogentia/appeal` Artifact types).
- [`cogentia_commons_community_manifest.md`](cogentia_commons_community_manifest.md) §6 (manifest declarations).

**Soft spots.**
- The "named moderator" model concentrates rung-4 authority. v1 single-moderator communities are fragile (moderator capture is a real risk). v1.1 should sketch an n-of-m moderator approval for rung-4 bans.
- Appeals reviewer = same moderator who issued the sanction (default if manifest doesn't specify otherwise) is bad design. Manifest authors should pick a different reviewer; v0.2.0 may make this a validator warning.
- A target who is also an active Document Author retains write access to their own Document during a community-wide cooldown (they can still commit to GitHub; the platform's record-keeping is what's restricted). This is acceptable — cooldowns affect platform participation, not personal git activity.

---

## 8. Cross-community citation  *(v1-if-velocity)*

**Actors.** Author of Document A in Community X, citing a node in Document B in Community Y.

**Preconditions.**
- Both communities exist.
- Community X's manifest lists Community Y in `federation` (parent §4 + COMMUNITY.md §4).
- The cited node has a stable `cogentia://Y/<sha>/<anchor>` URI.

**Steps.**

1. Author of Document A includes the cited node's `cogentia://` URI in the markdown text of Document A, ideally as a markdown link with descriptive text.
2. When `kernel_extractor` runs on Document A (Workflow #1) or when `citation_validator` runs (Workflow #3 step 3), the URI is detected. `citation_validator` resolves the URI by calling Community Y's resolver service (or, in v1, by fetching the corresponding `cogentia/<node-type>` Artifact via the URI scheme).
3. The cited node's content is fetched and validated: does the Artifact exist at the cited commit_sha? Is it still the current version? `citation_validator` returns `live` / `stable` / `dead` accordingly.
4. The cross-community link is recorded as a `parentEventIds` edge in Document A's Topic's relevant Event (e.g. the `cogentia.kernel.accepted` Event lists `parentEventIds: [<event in Community Y's Topic that created the cited node>]`). This forms the global causal DAG per COP §3.3.
5. *Reverse direction*: Community Y's resolver may optionally surface "incoming citations" — a list of communities that have cited nodes in Y. v1.1 feature; v1 supports the citing direction only.

**Postconditions.**
- The citation is part of Document A's formal record.
- The `cogentia://` URI in Document A's literate form resolves to Community Y's content for any reader.
- The global causal DAG includes the cross-community edge.

**Cross-references.**
- Parent §4 (federation), §5.7.2 (concept mapping — cross-Topic causality), §8 (URI scheme).

**Soft spots.**
- If Community Y removes the cited node (deprecates it per Workflow #5), Community X's `citation_validator` will mark the citation `dead` on next run. The citing Document is not auto-edited; Author chooses to update.
- v1 federation has no live protocol — communities discover each other via manual `federation.json` listings in their manifests. Cross-community citation works because URIs are stable; "Community Y closed its resolver" is a v1 risk that v1.1 should address via federated mirror agreements.
- A community manifest that lists Y as `bidirectional` but Y's manifest does not reciprocate produces a non-symmetric federation. v1 accepts this (Y's citations of X work; X's citations of Y work; only `bidirectional`-only features differ). v1.1 may add a `cogentia.js manifest --verify-federation` check.

---

## 9. Community founding (first `COMMUNITY.md` commit)  *(v1-critical, lightweight)*

**Actors.** Founder (verified GitHub identity, the eventual community's first member).

**Preconditions.**
- A GitHub repository that will host the community's manifest (typically the same repository where `cogentia.js` registration metadata lives).
- The Founder has Author rights on that repository.

**Steps.**

1. Founder writes a `COMMUNITY.md` per the template in [`cogentia_commons_community_manifest.md`](cogentia_commons_community_manifest.md) §9. Runs `node scripts/cogentia.js manifest --validate <path>` locally. Validator returns `0` (valid) or surfaces error codes.
2. Founder commits the validated `COMMUNITY.md`. The platform detects the commit (or the Founder triggers *Register Community* in Commons UI). Commons reads the file, validates against the same schema, and creates a community manifest Topic in the COP Event log.
3. Commons emits `cogentia.manifest.updated` with `communityId`, `commitSha`, `changedFields: [<all fields, since this is the first commit>]`. The `cogentia/manifest` Artifact is created. The community is now operational.
4. Founder is enrolled as the community's first User row (kind: github). Founder's GitHub handle is the initial owner per the manifest's `created_at` field.
5. Optionally, Founder invites others. Membership policy (`open` / `invite` / `federated-trust`) governs how new members join.

**Postconditions.**
- A new community exists in Commons, with the Founder as its only initial member.
- The community is discoverable via its `community_id` slug.
- The community's plugin allow-list, accountability policy, and federation links are in effect.

**Cross-references.**
- [`cogentia_commons_community_manifest.md`](cogentia_commons_community_manifest.md) — full manifest contract.

**Soft spots.**
- The Founder is the sole owner in v1. If the Founder becomes inactive, the community cannot amend its manifest. Multi-owner stewardship is a v1.1 open question (manifest sub-spec §10.1).
- The community's first Document can be registered immediately after founding (Workflow #1). The recursive first use case — `second_method.md` in the `barons-Mariani` community — has the Founder be both the manifest author and the Document author.

---

## 10. Manifest amendment  *(v1.1+)*

**Actors.** Manifest owner (Founder in v1; multi-owner pool in v1.1).

**Preconditions.**
- The community has an existing `COMMUNITY.md` at commit `previous_sha`.
- The owner wishes to change one or more fields.

**Steps.**

1. Owner edits `COMMUNITY.md` locally. Runs `cogentia.js manifest --check-amend <previous_sha> <proposed_path>` to verify the amendment is legal.
2. Validator classifies each changed field:
   - **Immutable** (`community_id`, `home_repo`, `created_at`) — change rejected, exit code 2.
   - **Forward-only amendable** (`acceptable_use`, sanction durations, sanction issuers) — change accepted, with a note that the new value binds on actions *after* the amendment commit only.
   - **Freely amendable** (`name`, `plugins`, `federation`, `support_threshold`) — change accepted with no temporal note.
3. Owner commits the amendment. Commons detects, validates again, emits `cogentia.manifest.updated` with `changedFields: [<list>]`. New `cogentia/manifest` Artifact persisted.
4. In-flight sanctions and Continuations are not retroactively recalibrated to the new ceilings or rules (per *lex prospicit, non respicit*, manifest §8.2). Each sanction records its `manifest_commit_at_issuance` and is governed by that commit's values.
5. *Retroactive exception (rare):* If the amendment includes `retroactive: true` in the commit message + a `retroactive_amendment` block in the manifest + a separate justification Artifact, Commons emits `cogentia.manifest.retroactive.amended` (distinct from the normal Event) and applies the change to prior actions matching the declared scope. This Event is surfaced separately in the community feed. Per manifest §8.3, use more than once or twice a year signals dysfunction.

**Postconditions.**
- A new manifest is in effect.
- Prior actions are governed by prior manifests; new actions are governed by the new one.
- The amendment is auditable: the diff is queryable via `cogentia.js manifest --diff <previous_sha> <new_sha>`.

**Cross-references.**
- [`cogentia_commons_community_manifest.md`](cogentia_commons_community_manifest.md) §8 (amendment semantics), §7 (`cogentia.js manifest` subcommands).

**Soft spots.**
- The owner can amend unilaterally. Until multi-owner stewardship exists (v1.1), there is no procedural check against capricious amendments. Mitigation: the manifest itself is a Document and is open to Objection (per the recursive principle); a community whose owner amends abusively will accumulate Objections on the manifest that the public record carries forward.
- The retroactive exception is structurally tempting precisely because it solves real problems (a typo, a security incident requiring a backdated rule). The combination of explicit commit-message marker + manifest block + separate justification Artifact is the rate-limiting friction.

---

## 11. Retrofit and revendication  *(deferred-by-design)*

*Sketched only. Full workflow is v1.2+ per parent §1.4. The schema fields needed in v1 are already reserved.*

**Actors.** Retrofitter (verified GitHub identity, importing the contribution); subject of attribution (dead actor: no participatory role; living external contributor: potential claimant); eventual claimant (the living external contributor, after they verify their GitHub identity).

**Sketch of the future workflow.**

1. Retrofitter submits a contribution attributed to a historical or proxy actor. The contribution is signed by the retrofitter's GitHub identity. The Artifact carries `attributed_to_actor: "historical:mauss"` or `"proxy:n-taleb"`, plus a mandatory `historical_source` field citing the work the attribution is drawn from.
2. The User row for `historical:mauss` is created on first attribution if it does not exist (`kind: historical`, no claim path). For `proxy:n-taleb`, the User row is created with `kind: proxy`, `claim_status: unclaimed`.
3. The contribution enters the formal graph with the retrofitter's signed attribution. The retrofitter is recorded as the human in the Rule 0 causal chain (generalised §10 audit applies).
4. *Claim path (proxy actors only):* The living external contributor signs up to Commons with their GitHub identity, verifies they are the entity behind `proxy:n-taleb` (verification mechanism out of scope for this sketch — likely a published statement they sign), and submits a `cogentia.actor.claim.submitted` Event. Community moderators or a federated trusted-third-party (also out of scope for this sketch) verifies.
5. Once verified, Commons emits `cogentia.actor.claim.verified`. The proxy handle is bound to the claimant's GitHub handle in the User table. The claimant chooses per prior contribution: **endorse** (signed acceptance), **repudiate** (marked as retrofitter's interpretation, repudiated by named subject), or **amend** (claimant offers a corrected version; both stay visible).
6. Future contributions by the claimant use their GitHub handle directly; the proxy handle remains as an alias.

**Cross-references (v1 schema fields already in place):**
- Parent §1.4 (the future-direction section), §5.1 User entity (`kind`, `canonical_handle`, `claimed_by_github_handle`), §10 (generalised Rule 0 framing).

**Soft spots noted for v1.2:**
- Dispute resolution when two GitHub identities claim the same proxy handle.
- Mechanical detection of fabricated historical attributions (a retrofitter inventing a Mauss quote and citing a real Mauss work). Defence depends on scholarly community vigilance, which is the kind of post-hoc accountability §1.1 names but the load is real.

---

## A. Acceptance test mapping (cross-reference to parent §11)

The parent spec's §11.1 v1 acceptance test requires seven verifiable artifacts from URLs alone. Each maps to one or more workflows:

| Acceptance item | Workflow producing it |
|---|---|
| Document registered as `second_method.md` in `barons-Mariani` community | **#9** (community founding) + **#1** (document registration) |
| Formal graph with anchors matching literate form | **#1** |
| Accepted Objection that has gone through Burton conversion | **#2** |
| Revision proposed in response, with a real GitHub commit | **#4** (or self-synthesis via **#3** + Author-claimed Revision Continuation) |
| Support event attached to an Objection or Revision | *(lightweight; subsumed in **#2** / **#4** UI surfaces)* |
| Publication record minting a stable `cogentia://` URI | **#6** |
| All steps verifiable from URLs alone | property guaranteed by §5.7.7 separation of concerns + §5.7.9 conformance |

The v1-critical workflow set (#1, #2, #3, #5, #6, #9, plus #4 if multi-user demo) is exactly what the acceptance test requires. Implementation velocity that finishes this set with rough edges is preferable to a polished partial set.

---

## B. Open Questions

1. **Webhook vs polling for GitHub sync (#5).** v1 manually triggers; v1.1 should add a webhook. The webhook design needs to handle race conditions when an Author commits twice quickly.
2. **PR flow for Editor-initiated Revisions (#4 step 5).** Editors typically don't have push access. The default UX should be "open PR + Author merges"; this needs UI surface design in v1 if multi-user demo is required.
3. **Long-running open rounds (#3 soft spot).** When should the UI nudge an Author about a round they opened weeks ago? v0.2.0 could send a digest; v1 leaves it to the Author.
4. **Pre-publication checks (#6 step 2).** What's the default policy when the community manifest does not specify? v0.1 of the manifest sub-spec says "warn but don't block." Consider tightening for `improved` and higher artifact types.
5. **Multi-Document workflows.** Several workflows implicitly involve other Documents (e.g. cross-community citation #8 spans two). v0.2.0 should describe a workflow where a single Round acts on nodes in multiple Documents — currently each Round is single-Document.
6. **CLI surface for workflows.** Several workflows could have `cogentia.js` automation paths (`publish`, `migrate`, `validate-document`). Out of scope for v0.1 of this workflows sub-spec; would benefit a v0.2.0 if implementation velocity allows.
7. **Notification UX.** Several workflows produce notifications (sanction issued, migration pending, Objection on your Document, appeal awaits your decision). v1 surface: in-app banner. v1.1: email digest, webhook. The notification semantics are not yet specified.

---

## C. Relationship to Existing Artifacts

- [`cogentia_commons_mvp_spec.md`](cogentia_commons_mvp_spec.md) — parent spec. Every workflow assembles components specified there.
- [`cogentia_commons_community_manifest.md`](cogentia_commons_community_manifest.md) — manifest contract referenced by workflows #7, #9, #10.
- [`cogentia_commons_kernel_extractor.md`](cogentia_commons_kernel_extractor.md) — plugin running in workflow #1.
- [`cogentia_commons_structural_plugins.md`](cogentia_commons_structural_plugins.md) — plugins running in workflows #2, #3, #4, #6, #8.
- [`cogentia_commons_substantive_plugins.md`](cogentia_commons_substantive_plugins.md) — plugins running in workflows #2, #4.
- [`Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md) §6 — the recursive first use case is realised by workflows #9 + #1 on `second_method.md`.
- [`inseme/packages/cop-core/Architecture.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) — every workflow's Events, Tasks, Steps, Continuations conform to the COP/HITL profile.

---

## D. License

This sub-specification: **CC BY-SA 4.0**.

---

*Premier commit : 2026-05-12 — Corte. Sub-spec draft v0.1.*
*Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica*
