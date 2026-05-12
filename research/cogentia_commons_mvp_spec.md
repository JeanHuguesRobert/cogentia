---
title: "Cogentia Commons — MVP Specification"
description: "Exchanges, formats, and results for the first operational instance of the Cogentia Commons platform"
layout: default
nav_order: 5
version: "draft-0.4"
last_modified_at: 2026-05-11
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0 (text), MIT (reference code contracts)"
status: "Working specification — applies the method to itself"
---

# Cogentia Commons — MVP Specification

*v0.4 — draft. Premier commit établit la priorité.*
*Companion to [`Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md) (the **what / why**), [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) (the **rules**), and the [COP — Cognitive Orchestration Protocol](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) (the **orchestration substrate**).*
*This document is itself a Thesis Kernel. It will be the second exhibit in the Commons graph; the first remains `second_method.md`.*

---

## 0. Preamble

The Working Paper says *what* Cogentia Commons is and *why* it must exist. The five rules of the second method say *how* knowledge is produced under AI conditions. Neither answers the operational question: *what does the platform actually do, in what sequence, with which artifacts, when a first user arrives?* This document does.

The MVP exists to demonstrate that the method can run on a finite, runnable surface — not to host an academic-publishing system. Everything beyond what is required to perform one full critique-and-revision round on a real document is out of scope for v1, regardless of how attractive it would be.

The document the MVP will run on first is `second_method.md`. The recursive commitment from Working Paper §6 is not rhetorical — it is the acceptance test.

Orchestration is inherited, not re-invented. Cogentia Commons is a [**COP/HITL profile consumer**](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md): every durable cognitive state in the platform — pending plugin runs, suspended Burton conversions, queued Editor syntheses, awaited Author acceptances — is a COP `cop/continuation` Artifact attached to the relevant target, with named resumers and explicit resumption conditions. This is what makes "what should happen next on this Premise / Objection / Revision?" a queryable, multi-directional property of every node in the formal graph, rather than a separate todo system bolted on.

---

## 1. Scope

### 1.1 In scope (v1)

1. Dual representation of every document: a **literate** markdown form anchored in a GitHub repository, and a **formal** graph representation in a per-community Supabase instance.
2. A **plugin architecture for audit prompts**: versioned prompt templates with declared output schemas and contract classes, run through a human-mediated copy/paste bridge to any conversational agent.
3. A **revision graph** built incrementally from accepted contributions, with typed edges and commit-anchored versioning.
4. **Continuations on every node** (COP `cop/continuation` artifacts): the multi-directional, queryable "what should happen next" attached to any Thesis, Premise, Claim, Objection, Revision, AgentReview, or Support.
5. A **Support primitive**: non-fungible recognition signal, architecturally decoupled from epistemic status.
6. **GitHub-anchored identity** for authors, objectors, reviewers, editors.
7. **Per-community federation contract** (URI scheme, no live protocol in v1).
8. **Publication** as a discrete act that mints a stable URI = community + commit + node.

### 1.2 Explicitly out of scope (v1, with rationale)

| Deferred | Why |
|---|---|
| Monetary Kudos | Requires non-accumulation mechanics + governance. Support is the seed event. |
| Anonymous personhood attestation | Depends on DHITL Rule 0 research problem; unsolved upstream. |
| Live cross-community sync protocol | URI scheme + manual subscription suffices for v1. |
| Voting / binding decisions | Cogentia Commons is DHITL Layer 4. By construction, never binds. |
| AI-author flow | An agent never opens a Thesis Kernel. Authorship is a Rule 0 act. |
| Citation marketplace, plugin marketplace | Premature without a working baseline plugin set. |

### 1.3 Out of scope, permanently

Anything where an agent acts without a human commit in the causal chain. This is Rule 0 and is not a roadmap item.

---

## 2. The Document

A Cogentia Commons document has **two synchronized representations**.

### 2.1 Literate form

A markdown file in a GitHub repository, owned by the document's author. This is the canonical artifact. It is what gets cited, forked, archived. It contains:

- YAML front-matter (title, author, version, license, status).
- Section headings with stable, kebab-case anchor IDs.
- Inline anchors of the form `{#claim-3}`, `{#premise-A}` for individually-addressable assertions — the same convention `second_method.md` already uses for Rules and Claims.
- Standard markdown otherwise. No platform-specific syntax.

The author commits to GitHub. The Commons reads from GitHub. There is no second source of truth for the document text.

### 2.2 Formal form

A structured graph stored in the document's home-community Supabase database. Each row references the literate form by `(repo, commit_sha, anchor_id)`. The formal graph is **derivative** of the literate form — it can be rebuilt from a clean commit history, modulo signatures and Support events that have no literate counterpart.

The formal entities are listed in §5.

### 2.3 Sync semantics

- **Author → graph**: when the author commits to GitHub, the Commons ingests the diff and proposes graph deltas (new claims detected, edited claims to re-anchor, deleted claims to mark deprecated). The author confirms or edits the proposal. No silent re-anchoring.
- **Graph → author**: when contributions accumulate (objections, revisions, support, agent reviews), the Commons exposes a *pending integration view* — a curated summary the author can copy into their next commit. The Commons never writes to the author's repo.
- **Conflict resolution**: the literate form always wins on document text. The formal graph always wins on edge structure (typed relationships, version pointers).

---

## 3. Actors

Roles are **tags on actions**, not seat assignments. A single GitHub identity can act in any role at any time, subject to community-defined eligibility (e.g. an Editor synthesis on a document might require N prior accepted contributions on that document).

| Role | Action verbs | Rule 0 posture |
|---|---|---|
| **Author** | Opens document, commits literate form, accepts/rejects contributions, declares Publication events. | Always a verified GitHub identity. |
| **Objector** | Submits structured objections against a target node. | Verified GitHub identity. Anonymous objections rejected in v1. |
| **Reviewer** | Assesses objections for falsifiability, citation validity, structural integrity. Marks objections as *substantive* or *needs-conversion*. | Verified GitHub identity. |
| **Editor** | Proposes revisions that synthesize multiple objections. Drafts patches against the literate form, opens PRs. | Verified GitHub identity. Synthesis is editorial labour, not authority. |
| **AI Agent** | Runs an audit plugin and emits a structured JSON output, *only* when invoked by a human paste bridge. | **Never** an autonomous writer. The agent's output is a contribution proposal, not a contribution. |
| **Supporter** | Attaches a Support signal to a contribution. | Verified GitHub identity. |

There is no Moderator role in v1. Moderation requires governance (Working Paper §4.6), which is post-MVP.

---

## 4. Communities and Federation

### 4.1 What a community is

A **community** is one Supabase database plus a governance manifest declaring:

- Membership policy (open, invite, federated-trust, etc.).
- Accepted audit-plugin allow-list (which plugins, which versions).
- Support threshold (if any) for advancing a contribution from *proposed* to *accepted*.
- Federation links: other community URIs whose documents may be cited.

The manifest itself is a markdown file in the community's home GitHub repository (`<community>/COMMUNITY.md`). Changes to it follow the same commit-anchored versioning as documents.

### 4.2 The home-community rule

Every document has **exactly one home community** at any commit. The home community holds the document's formal graph. References from other communities resolve through the URI scheme. This mirrors the cross-repo network symmetry rule already governing the four-repo corpus: one canonical home, references elsewhere.

### 4.3 Federation in v1

The federation contract is the URI scheme (§8) and a `federation.json` file listing trusted community URIs. There is no live push/pull protocol. Cross-community discovery happens by manual subscription or by graph-traversal links inserted by humans.

A live federation protocol is an open question (§14).

### 4.4 Editor eligibility

"Synthesis is editorial labour, not authority" (§3) needs an operational definition before the role is meaningful in v1. Without one, either anyone can claim it (collapsing the role into Objector) or the home community implicitly hands it to its founders (collapsing toward §4.6 of the Working Paper — disproportionate moderation authority, the anti-capture violation).

**Default eligibility policy (community-overridable).** A user is eligible to claim a `revision_draft` or `editor_synthesis` Continuation on a Document if both:

1. **Contribution floor** — at least three of their Objections, Revisions, or Claims have been *accepted* (not merely submitted) on the same Document, in the rolling 12 months preceding the claim.
2. **Independence constraint** — they are not the author of any Objection that the synthesis would consolidate. A user who raised the objections cannot be the one who synthesises the response; that would collapse the loop.

A user who is eligible can claim the Continuation; the claim itself is an action recorded as a COP Event and is visible to the community. There is no Editor seat assignment.

**Community-manifest overrides.** A community's `COMMUNITY.md` may:

- raise the contribution floor (e.g. require five accepted contributions, or contributions across two Documents);
- adjust the rolling window;
- strengthen the independence constraint (e.g. add "not a current co-author of any other open Revision on the same Document");
- delegate eligibility decisions to a named Reviewer panel for a specific Document class.

A community manifest MAY NOT lower the independence constraint below the v1 default — independence between objector and synthesiser is a Rule 0 + anti-capture invariant, not a parameter.

**Why these specific numbers.** Three and twelve are calibrated for the bootstrap case (Working Paper §10.2: 30–50 active Thesis Kernels at the Université de Corse). Above the threshold, the role is not an unbounded prerogative — it is access to a specific Continuation that any other eligible user could also claim. Below the threshold, the role is unreachable. Both bounds are needed; either alone would drift toward seat-assignment.

**Authoring exception.** A Document's Author is always eligible to synthesise on their own Document, regardless of contribution count, but is still bound by the independence constraint with respect to Objections they themselves raised under a separate role.

---

## 5. The Formal Graph

### 5.1 Entities

```
Community
  - id, name, home_repo, manifest_commit
  - federation_links: [community_uri]

User
  - github_handle (primary key, per community)
  - joined_at, profile_md_url (optional)
  - contribution_count_cache

Document
  - id, community_id, repo, path
  - author_github_handle
  - current_commit_sha
  - literate_anchor: { repo, commit_sha, path }
  - status: { draft | active | deprecated | published }

Thesis
  - id, document_id, anchor_id
  - core_assertion, epistemic_status_tag
  - committed_at, commit_sha

Premise
  - id, thesis_id, anchor_id
  - statement, epistemic_status_tag
  - committed_at, commit_sha

Claim
  - id, document_id, anchor_id
  - statement
  - derived_from: [thesis_id | premise_id | claim_id]

Constraint
  - id, target_id (thesis | claim)
  - statement, evaluation_method

Objection
  - id, target_id, target_type
  - author_github_handle
  - statement, falsifiability_form
  - status: { proposed | needs_conversion | substantive | resolved | rejected }
  - committed_at

Revision
  - id, target_id, target_type
  - replaces_version_commit_sha
  - patch_commit_sha
  - responds_to: [objection_id]

AgentReview
  - id, plugin_id, plugin_version, target_id
  - invoked_by_github_handle
  - input_snapshot, raw_agent_output, extracted_json
  - contract_class: { structural | substantive }
  - status: { proposed | accepted | rejected }

Support
  - id, giver_github_handle, target_id, target_type
  - justification (required, free text)
  - timestamp
  - lineage: [previous_support_id?]   -- placeholder for future Kudos circulation

Publication
  - id, document_id, commit_sha
  - artifact_type: { initial | improved | premise_note | conclusion_note | refutation | synthesis }
  - canonical_uri

Continuation                         -- COP cop/continuation Artifact
  - id, attached_to_id, attached_to_type
  - intent: { kernel_extraction | burton_conversion | citation_validation |
              consistency_scan | objection_response | revision_draft |
              editor_synthesis | author_acceptance | publication_review | custom }
  - resumers: [ { kind: human|agent|plugin, eligibility: github_handle | role | plugin_id } ]
  - state: jsonb                     -- resume-state payload (COP §2.7)
  - resumption_conditions: jsonb     -- events_awaited, time_window, prerequisite_continuations
  - status: { open | claimed | resolved | abandoned | superseded }
  - parent_continuation_id           -- forks form a tree
  - opened_by_github_handle, opened_at, commit_sha
  - resolved_by_github_handle, resolved_at, resolution_kind
```

### 5.2 Edge types

Directed, typed. Each edge stores its `committed_at` + `commit_sha`.

```
supports          (Premise|Claim → Claim|Thesis)
contradicts       (Claim|Objection → Claim|Thesis|Premise)
qualifies         (Claim → Claim|Thesis)
extends           (Claim → Claim|Thesis)
refutes           (Objection → Premise|Claim|Thesis)
derived_from      (Claim → Thesis|Premise|Claim)
responds_to       (Revision → Objection)
review_of         (AgentReview → Thesis|Premise|Claim|Objection)
recognises        (Support → any contribution)
```

### 5.3 Versioning

No node is ever overwritten. Every state change appends a new row referencing the previous one. The `commit_sha` field is mandatory on creation. This makes commit chronology auditable, which is the veneer-adoption mitigation named in the second method ("the commit history must precede, not follow, the published claim").

### 5.4 Status propagation

A refuted Premise propagates a *visible flag* to all Claims with a `derived_from` path to it. The flag is informational — it signals review is warranted. It does not auto-invalidate. This is Rule 0 applied to status: agents do not get to invalidate human-authored Claims; they get to surface dependencies.

### 5.5 Continuations

A **Continuation** is the COP primitive (`cop/continuation` Artifact, defined in [`inseme/packages/cop-core/Architecture.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) §1.8 / §2.7 / §5.5) that Cogentia Commons uses to make *"what should happen next on this node?"* a first-class, queryable property of every artefact. Commons does not define a parallel todo, queue, or workflow mechanism; it consumes the COP/HITL profile.

**Attached to any node.** A Continuation always names its `attached_to_id` + `attached_to_type`. Any entity in §5.1 — Thesis, Premise, Claim, Constraint, Objection, Revision, AgentReview, Support, Publication, Document — can carry zero, one, or many open Continuations at the same time. This is what makes the structure **multi-directional**: a single Premise can simultaneously have a *citation_validation* Continuation awaiting a structural plugin, an *objection_response* Continuation awaiting the Author, and an *editor_synthesis* Continuation that any community Editor is eligible to claim.

**Named resumers, explicit conditions.** Every Continuation declares (a) who is eligible to resume it — a specific GitHub handle, a role tag (`reviewer`, `editor`, `author`), or a plugin ID — and (b) under what conditions it becomes resumable: events to wait for, time windows, prerequisite Continuations that must resolve first. The state required to resume is carried in the `state` payload, not in any hidden in-memory cache (COP invariant 5).

**Forking and joining.** A Continuation can fork via `parent_continuation_id`. A typical fork pattern: a single `burton_conversion` Continuation on an Objection forks into one `objection_response` Continuation on the Author and one `revision_draft` Continuation on the Editor pool, both blocked on the parent's resolution. Join points are implicit — a downstream Continuation lists its prerequisites under `resumption_conditions.prerequisite_continuations`.

**Resolution kinds.** A Continuation closes with one of: `resolved` (the intended work happened — typically tied to a commit_sha), `abandoned` (deliberately dropped, with justification), `superseded` (replaced by a newer Continuation, which references it). Closed Continuations are immutable and remain visible — the closed-Continuation history of a node *is* part of its narrative trace.

**Why not just a `tasks` table.** A Continuation is not a task assignment. It is a *capsule of suspended reasoning* with everything needed to resume it on any node, by any eligible resumer, after any interruption. Reusing the COP primitive across the corpus (Personal Cogentia, Commons, plugin runtimes, future Cogentia components) keeps a single orchestration substrate and a single event log — agents are replaceable, models evolve, the reasoning trace persists.

**Rule 0 anchoring.** Even when a Continuation is resumable by an agent (e.g. a `citation_validation` whose only eligible resumer is the `citation_validator` plugin), the Continuation that *accepts* its output is human-resumable. Agents close their own structural Continuations; substantive resolutions always have a human resumer in the close path. This is the data-layer enforcement of §10.

### 5.6 Anchor lifecycle and re-anchor semantics

The dual-representation contract (§2) binds every formal node to `(repo, commit_sha, anchor_id)`. The literate form lives in git; the literate form changes; therefore anchors move. v1 specifies precisely what happens when the literate form is edited under a formal graph with open Objections, Continuations, and Supports — silent re-anchoring is a doctrinal failure (§2.3 forbids it).

**The five anchor-change cases.** When the Author commits a new revision of the literate form, Commons diffs anchor-by-anchor. Each anchor present in the previous commit ends in exactly one of five states:

| Case | Detection | Default proposal |
|---|---|---|
| **Unchanged** | Same `anchor_id`, surrounding text byte-equivalent. | Carry the formal node forward; append the new `commit_sha` to its version chain. |
| **Edited** | Same `anchor_id`, surrounding text differs. | Propose a Revision row; Author confirms whether the edit is *cosmetic* (no semantic change, version chain extended) or *substantive* (new Premise version, old one preserved). |
| **Removed** | `anchor_id` no longer present anywhere in the literate form. | Propose `status=deprecated`. Author confirms or restores. |
| **Split** | One previous anchor has two heuristic successors (similar text fragments at two distinct new anchor IDs). | Propose two new Premises with `derived_from` edges back to the old one. Author confirms the split, edits the proposed text per child, or rejects (treats as a Removed + two Created). |
| **Merged** | Two previous anchors collapse into one new anchor. | Propose one new Premise with `derived_from` edges from both. Author confirms or rejects. |

**Provisional commits.** Until the Author resolves the migration Continuation (see below), the new commit is **provisional**: the formal graph continues to read from the previous *confirmed* commit, contributions can still be submitted against the previous state, and the platform displays a "migration pending" badge on the Document. There is never a window during which the formal graph is silently misaligned with the literate form it claims to annotate.

**The migration Continuation.** Each non-trivial commit opens a single Continuation on the Document:

```
intent: "anchor_migration"
resumers: [<author>]
state: { proposals: [ {anchor_id, case, ...} ], previous_commit_sha, new_commit_sha }
resumption_conditions: { events_awaited: [] }    # blocks on the Author alone
```

Resolving this Continuation atomically applies all confirmed migrations and promotes the new commit to *confirmed*. Rejecting it leaves the previous commit confirmed and marks the new commit as `migration_rejected` — the literate form is still in git, but the formal graph treats it as a draft. The Author can re-open the migration later by re-committing or by manually re-running the migration on the existing commit.

**Per-entity migration rules** when an anchor moves under a contribution:

- **Objection.** If the target anchor is *Unchanged* → carry forward unmodified. If *Edited* → Objection enters `status=needs_revisit`; a Continuation `intent=objection_revisit` is opened with the *Objector* as resumer ("the premise text has changed; does your objection still apply? re-affirm | withdraw | re-state"). If *Removed* → Objection enters `status=stranded`; a Continuation `intent=stranded_objection_disposition` opens for the Author, who declares whether the removal was *responsive* (the Objection is marked `resolved-by-removal`) or *orphaned* (the Objection is preserved as historical record with no live target). If *Split* / *Merged* → Objection clones across the resulting anchors with `parent_objection_id`; the Objector confirms which clones apply.

- **Continuation.** If `resumption_conditions` are anchor-independent (e.g. waiting for an external Event) → carried forward with the new `commit_sha`. If the `state` payload quotes the literate text or the formal node's previous statement → the Continuation is marked `superseded`; a new Continuation with patched state is opened and the old one's `superseded_by` links forward. If the target is *Removed* → all open Continuations on it are marked `abandoned` with auto-generated justification `"target deprecated at commit <sha>"`. This is the one closure path that does not have a named human resumer; it is logged separately and surfaces in the Document's audit view.

- **Support.** Supports never migrate. A Support is a historical recognition event attached to a specific version of a contribution and is preserved forever in that form. A Support given to Objection_v1 remains a Support of Objection_v1 even after the Objection becomes Objection_v2; the v2 row has its own (empty until earned) Support set.

- **Edge.** When both endpoints survive (Unchanged or Edited carried forward) → edge survives, with new `commit_sha`. When one endpoint is *Removed* → edge is marked `inactive` and preserved as historical record. When endpoints *Split* or *Merge* → edge migration is part of the same Author-confirmation step that resolves the node migration: the Author chooses which resulting node(s) inherit the edge.

**What the Author actually does.** In the steady state, a typical commit produces a migration Continuation containing 0–3 proposals — mostly *Unchanged* (auto-carried, not shown), occasionally one *Edited* requiring a cosmetic-vs-substantive choice. A heavy refactor (many *Split* / *Merge* operations) produces a larger migration Continuation; the Author may resolve it in stages by partially confirming and re-opening, since the Continuation supports incremental progress through its `state` payload.

**Why this is not silent re-anchoring.** Every migration produces (a) a confirmation Continuation owned by the Author, (b) an immutable audit trail of which anchors moved and how, (c) a visible "migration pending" state on the Document while unresolved, and (d) explicit, named handling for every contribution that the migration touches. The literate form is the source of truth for text; the formal graph is the source of truth for structure; the migration protocol is what keeps them honest under change.

---

## 6. The Audit Plugin Architecture

### 6.1 Plugin = prompt + schema + contract

A plugin is a record with:

```yaml
id: cogentia.plugins.falsifiability_conversion
version: 0.1.0
author: jeanhuguesrobert
contract_class: substantive       # or: structural
target_kinds: [objection, premise]
prompt_template: |
  You are reviewing the following objection against the document's premise.
  
  Premise: {{premise.statement}}
  Objection (raw, possibly a feeling-of-certainty): {{objection.statement}}
  
  Your task: produce a falsifiable form of this objection. If the objection
  is already falsifiable, return it unchanged with falsifiable=true.
  If it reads as a Burton-style feeling-of-certainty (asserting plausibility
  without producing a calculation, citation, or measurable prediction),
  ask exactly what calculation, citation, or prediction would falsify the
  underlying premise.
  
  Output ONLY a JSON block of the form:
  ```json
  { "cogentia_plugin": "cogentia.plugins.falsifiability_conversion",
    "version": "0.1.0",
    "falsifiable": <boolean>,
    "converted_statement": "...",
    "asked_for": ["calculation" | "citation" | "prediction"],
    "notes": "..." }
  ```
output_schema:
  type: object
  required: [cogentia_plugin, version, falsifiability, converted_statement]
  properties:
    cogentia_plugin: { const: "cogentia.plugins.falsifiability_conversion" }
    version: { type: string }
    falsifiable: { type: boolean }
    converted_statement: { type: string }
    asked_for: { type: array, items: { enum: [calculation, citation, prediction] } }
    notes: { type: string }
acceptance_policy: human-gated     # never auto-apply if contract_class=substantive
```

### 6.2 Contract classes

- **structural** — plugin output is mechanical: citation existence, link liveness, schema validity, internal consistency check. May be auto-applied to the AgentReview record without human acceptance, but never to the underlying Thesis/Premise/Claim.
- **substantive** — plugin output bears on meaning. Must be human-gated before becoming a contribution. UI surfaces a "convert your feeling into a falsifiable claim" prompt when the plugin returns `falsifiable=false`.

The distinction is enforced at the data layer: an AgentReview with `contract_class=substantive` cannot be the only thing linking an Objection or Revision to a target node. There must be a `committed_at` from a human GitHub identity in the chain.

### 6.3 Plugin set for v1 (proposed baseline)

| Plugin | Class | Purpose |
|---|---|---|
| `kernel_extractor` | substantive | Reads a literate document, proposes Thesis + Premises + Claims with anchor IDs. Output is a draft skeleton for author confirmation. |
| `falsifiability_conversion` | substantive | Implements the Burton conversion (Rule 2). Re-shapes feelings of certainty into falsifiable claims. |
| `citation_validator` | structural | Resolves every URL/DOI/repo path in a target node, marks dead/missing/unstable. |
| `consistency_scanner` | structural | Detects circular dependencies, undefined terms, contradictory Claims. |
| `objection_summariser` | structural | Bundles outstanding objections on a node into a single Editor-facing brief. |
| `revision_proposer` | substantive | Given an Objection and a Premise, drafts a candidate Revision patch against the literate form. |

Plugins beyond this baseline are post-MVP.

### 6.4 Signing and integrity

Each plugin manifest is signed (commit-anchored in the plugin's repo). The community manifest pins exact versions. A plugin upgrade is a community manifest commit, not an auto-update.

---

## 7. The Exchange Cycle (one round)

A **round** is the atomic unit of method application: one author, one target node, one or more audit plugins, one author acceptance pass, one possible Revision commit. Mechanically, a round is a small tree of Continuations rooted on the target node.

```
1. Author opens a round
   - selects target node (Thesis | Premise | Claim | Objection)
   - selects audit plugin(s) from community allow-list
   - Commons OPENS one root Continuation on the target with
       intent = "round.open", resumers = [author]
     and, as children, one Continuation per selected plugin with
       intent = matching plugin intent, resumers = [<author>, plugin:<plugin_id>]
   - Commons renders each plugin's prompt with placeholders bound to the live
     formal-graph state at HEAD; the rendered prompt is the Continuation's state

2. Human paste bridge  (per plugin Continuation)
       a. Commons displays the rendered prompt + a "Copy" button
       b. Author pastes the prompt into a conversational agent (their choice)
       c. Author copies the agent's response back into the Commons paste field
       d. Commons extracts the JSON block matching the plugin's output_schema
          (same extractor logic as apps/personal/src/pages/Submit.jsx)
       e. Extraction failure → Continuation remains open; author retries or
          marks it abandoned with justification

3. Per-plugin disposition  (Continuation resolution)
   - structural plugins: AgentReview row written; plugin Continuation closed
     with resolution_kind = "resolved" (agent self-closes its own structural
     Continuation — §5.5 Rule 0 anchoring permits this for structural only)
   - substantive plugins: AgentReview row written with status=proposed; the
     plugin Continuation closes, but FORKS a child Continuation
       intent = "author_acceptance", resumers = [author]
     which must close with a human action — accept, reject, or escalate

4. Burton gate (substantive plugins only)
   - if plugin output declares falsifiable=false OR reviewer flags it:
       the author_acceptance Continuation forks a sibling
         intent = "burton_conversion", resumers = [author, reviewer-role]
       that blocks the parent (resumption_conditions.prerequisite_continuations).
       The converted_statement either becomes an accepted contribution or is
       escalated as an Objection in its own right — a converted feeling-of-
       certainty IS a contribution.

5. Round closure
   - the round.open root Continuation can only close when all of its
     descendants have closed (resolved | abandoned | superseded)
   - if any plugin output triggered an editorial action, Commons opens a
     child Continuation
       intent = "revision_draft", resumers = [author, editor-role]
     which produces a candidate patch the resumer can paste into a GitHub
     PR or commit; resolution requires a commit_sha
   - round metadata (target, plugins, dispositions, full Continuation tree,
     commit_sha at HEAD) is persisted as an immutable record
```

The round never auto-closes. There is no agent who decides the round is done — the root Continuation has only human resumers.

**Multi-directional in practice.** A node can simultaneously sit inside multiple round trees. Continuations on the same node from different rounds are listed together in the node's *pending work* view, with their resumer eligibility surfaced for triage. Two Editors can race on the same `revision_draft` Continuation; the first to commit closes it as `resolved`, the second's Continuation closes as `superseded` with a reference to the winning commit.

---

## 8. Publication

Publishing is an explicit, discrete act by the Author. It mints a stable URI and freezes the formal-graph state at the underlying commit.

### 8.1 What can be published

| Artifact | When |
|---|---|
| `initial` | First publication of a document. |
| `improved` | A new commit that integrates ≥ 1 accepted Revision since the previous Publication. |
| `premise_note` | A standalone publication about a specific Premise's status — typically when its status_tag changes (e.g. `working hypothesis → contested`). |
| `conclusion_note` | A standalone publication about an aggregated Claim or Thesis-level conclusion. |
| `refutation` | A publication asserting a Claim or Premise is now refuted, carrying the Objection and Revision chain that supports the assertion. |
| `synthesis` | Editor-authored, draws together a cluster of Revisions into a coherent next state. |

### 8.2 Canonical URI

```
cogentia://<community-id>/<commit-sha>/<node-id>
```

- `<community-id>` is the community's home-repo slug (`barons-Mariani`, `cogentia`, etc.).
- `<commit-sha>` is the GitHub commit at which the Publication was minted.
- `<node-id>` is the formal-graph node ID being published.

Resolution: a tiny resolver service (or just the Commons app itself) maps the URI to the literate file + anchor in GitHub, alongside the formal-graph view in Supabase.

Cross-community references use the full URI. Same-community references can use the short form `#<node-id>` once a base community is fixed.

---

## 9. The Support Primitive

### 9.1 What Support is

Support is a recognition signal attached to a contribution (Objection, Revision, AgentReview, Premise, Claim, Thesis). It is **not** a vote. It is **not** a weight in status computation. It is **not** convertible into any other quantity in v1.

A Support row records:

- `giver_github_handle` — verified.
- `target_id`, `target_type` — what is being recognised.
- `justification` — free-text, **mandatory**. A Support with no justification is rejected at insert.
- `timestamp`.
- `lineage` — null in v1, reserved as the integration point for future Kudos circulation.

### 9.2 The architectural separation rule

The Working Paper §4.5 commitment is encoded at the data layer: **no status-computation query joins on the Support table.** The Commons exposes Support counts in a Recognition view, visibly labelled *"recognition, not validity"*. Any future feature that proposes to weight Support in status assessment is a governance crisis per §7.1, not a feature request.

### 9.3 Why Support, not yet Kudos

A monetary Kudos primitive needs:

- Non-fungibility carrying gift-justification through transfers.
- Non-accumulation mechanics (demurrage, caps, or pure-flow constraints).
- A circulation governance manifest.
- A community policy on whether Kudos can be exchanged for anything off-platform.

None of these are required to demonstrate the method. Support is the seed event; Kudos is what grows from it later. The `lineage` column is the explicit anticipation point.

### 9.4 Mauss-anchored contract (deferred)

When Kudos is added post-MVP, it must preserve five properties already named in the Kudos book:

1. **Non-fungibility** — each Kudo carries the memory of its origin and the justification that minted it.
2. **Mémoire sociale** — the lineage is queryable end-to-end.
3. **Création décentralisée** — communities mint within their own manifests, no central issuer.
4. **Principe d'abondance** — supply is not engineered for scarcity.
5. **Non-accumulation** — the system encourages circulation over hoarding.

The v1 Support primitive does not implement any of these *mechanisms*, but it does not contradict any of them either. The schema is forward-compatible.

---

## 10. Rule 0 Audit

The boundary the second method draws between epistemic participation (agents permitted) and political deliberation (humans only) becomes, in Commons v1, the boundary between *contributions* (writable by anyone, including via agents) and *state changes* (writable only by a human committing through their GitHub identity).

| Action | Who writes | Audit trail |
|---|---|---|
| Open Document | Author (human, GitHub commit) | Commit hash. |
| Create Thesis Kernel | Author (via `kernel_extractor` proposal + acceptance) | AgentReview row + author acceptance commit. |
| Submit Objection | Human Objector | GitHub identity + Supabase row. |
| Run audit plugin | Human invocation; agent produces output | AgentReview row stores invoker handle + raw output. |
| Mark Objection substantive | Human Reviewer | Supabase row + handle. |
| Propose Revision | Human Editor or Author (commit patch) | Commit hash + responds_to edges. |
| Publish | Author | Publication row + commit hash + canonical URI. |
| Support | Human Supporter | Supabase row + handle + justification. |
| Open Continuation | Any role; carries `opened_by_github_handle` | Continuation row + commit_sha. |
| Resolve substantive Continuation | Human resumer only | Continuation row + `resolved_by_github_handle` + commit_sha. |
| Resolve structural Continuation | Plugin may self-close | AgentReview row + plugin signature; downstream substantive Continuation gates any onward propagation. |

Every row in the platform has a human GitHub handle in its causal chain. No agent has a write capability that bypasses this. This is verified at the data-access layer, not by convention.

---

## 11. MVP Demonstration Target

### 11.1 Acceptance test

The MVP is acceptable if, by the end of v1, the following sequence is reproducible by any visitor with only a browser:

1. Navigate to the Commons app.
2. Find `second_method.md` as a registered Document in the `barons-Mariani` community.
3. View its formal graph: at least one Thesis, several Premises, several Claims, all with anchor IDs matching the literate form.
4. View at least one **accepted Objection** that has gone through the Burton conversion gate, with its falsifiable form visible.
5. View at least one **Revision** proposed in response, with its commit hash resolving to a real GitHub commit on the `barons-Mariani` repo.
6. View at least one **Support** event attached to the Objection or the Revision.
7. View the **Publication** record that minted a stable `cogentia://barons-Mariani/<sha>/<node>` URI for the improved version.

All seven steps must be verifiable *from the URLs alone* — no platform login required to audit.

### 11.2 What this demonstrates

- That the method runs (Working Paper §6 recursive commitment).
- That the audit-plugin contract holds (substantive plugin gated by a human).
- That Support is recorded and visible without entering status computation.
- That commit chronology, not platform claims, anchors the work.

If any of these fails on the acceptance test, the design is defective. Per the Working Paper conclusion: that is a legitimate outcome — document the failure, revise the spec.

### 11.3 Rollout posture under mimetic constraints

A Cogentia Commons instance does not enter a host community on a neutral substrate. It enters under the structural conditions identified by Working Paper §10.4 (prestige coupling, monopoly of legitimation, island insularity premium), which are themselves expressions of the DRSJ cycle named in [`Indirect Action Under Mimetic Constraints`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/mimetic_desynchronization.md): *Denial of competence → causal Reattribution → moral Suspicion → Justification of sanction*. The MVP rollout assumes resistance is structural and intrinsic, not anomalous, and is designed to delay or diffuse the cycle long enough for the platform to cross its irreversibility threshold inside the host community.

The six mechanisms of mimetic desynchronization map onto concrete v1 design choices:

| Mechanism | MVP embodiment |
|---|---|
| **Delayed visibility** | No public landing page, no announcement, no metrics dashboard on day 1. The platform's first activity is internal to the home community; external visibility is a deliberate later step, gated by the author. |
| **Interpretive buffering** | Cogentia Commons is framed as *complement* to journal submission, not alternative. A Thesis Kernel produces a better first draft for an existing publication pipeline; it does not replace one. This is the §10.4 prestige-coupling mitigation, restated in mimetic terms. |
| **Semantic minimization** | The minimal contribution path is one Objection on one anchor (§13 over-modeling). Every other surface is optional and hidden until invoked. The recursive first use case (doctrine-on-doctrine) keeps cognitive load low: one document, one community, one round. |
| **Non-ostentation** | No leaderboard, no public Support count surfaced above the per-node Recognition view, no Kudos primitive in v1 (§9.3). The deferred monetary layer is not a temporary omission — it is the desynchronization principle applied. Visible competitive signaling is the DRSJ trigger; v1 deprives the cycle of that input. |
| **Reversibility** | A Thesis Kernel can be withdrawn by its author at any time (the literate form remains in git; the formal-graph node moves to `status=deprecated`). Communities can be left without forfeiture. No lock-in primitive exists in v1. Low entry cost + possible exit is itself the mitigation. |
| **Institutional pre-legitimation** | ICOME'26 at the Université de Corse (Working Paper §10.5) is the v1 institutional anchor. A platform that arrives *with* a recognized academic venue is processed through a different interpretive frame than one that arrives *against* the canonical publication system. The recursive instance is not rhetorical — it is the pre-legitimation move. |

The framework is general; the specifics above are calibrated for the Corsican bootstrap case. A Cogentia Commons instance entering a different host community would re-derive the table from the six mechanisms before rollout.

This is also the principled answer to a question that would otherwise be tactical: *why is the v1 surface so deliberately small?* Not because more was impossible to build, but because **structural change succeeds when transformation precedes stabilization of meaning** (mimetic_desynchronization §9). Every primitive deferred from v1 was deferred because surfacing it before the platform crosses its irreversibility threshold would feed the DRSJ cycle that the same primitive, surfaced later, would be safe inside.

---

## 12. Reference Implementation Sketch (non-normative)

For the engineering work that follows the acceptance of this spec:

- **Frontend**: `apps/commons/` Vite + React (matches `apps/personal/`). Reuse the paste-URL + paste-JSON UX from `apps/personal/src/pages/Submit.jsx` for the audit-plugin runner.
- **Backend**: per-community Supabase project; one schema per community manifest version, migrations are commit-anchored.
- **GitHub integration**: read via the GitHub raw URL contract (already used by `cogentia.js`). Writes happen through PR creation — Commons never holds a write token to the document repo.
- **Plugin registry**: a directory under `cogentia/plugins/` in the meta-node repo. Each plugin is its own subdirectory with manifest + prompt + schema. Versioned via git tags.
- **Resolver**: a single Netlify Function maps `cogentia://` URIs to GitHub + Supabase views.

This sketch is not part of the specification. It is one viable implementation among others.

---

## 13. Risks Inherited from the Working Paper

The Working Paper §7 enumerates seven failure modes. The MVP responses are:

| Failure mode | MVP response |
|---|---|
| Epistemic populism (§7.1) | Support architecturally excluded from status queries. Codified at the data layer. |
| Gaming (§7.2) | Plugin contract_class distinction. Substantive plugins always human-gated. |
| Plutocratic capture (§7.3) | No money flows in v1. Deferred along with Kudos. |
| Hallucination contamination (§7.4) | `citation_validator` plugin runs on every Thesis/Premise/Claim that contains references. AgentReview rows always carry the raw output for audit. |
| Privacy confusion (§7.5) | Per-community profile model; profile fields are opt-in; no Cogentigram surface in Commons v1. |
| Cultic closure (§7.6) | Federation URI scheme + `federation.json` exists in v1 so external-community objections are first-class once the second community arrives. |
| Over-modeling (§7.7) | Minimal contribution path = submit one Objection on one anchor. Everything else optional. |
| **DRSJ expulsion from host community** *(added v0.3)* | Distinct from §7.6 cultic closure: the *internal* mode is convergence on shared axioms; the DRSJ mode is *external* — the host community expels the platform before it crosses irreversibility. Mitigation: rollout posture under mimetic desynchronization (§11.3). The MVP surface itself is the mitigation; this is not a feature added against the failure mode but the design principle that shaped the in-scope/out-of-scope list of §1. |

---

## 14. Open Questions

1. **Live federation protocol.** Push vs pull, subscription semantics, conflict policy when a referenced community alters a node. Specified only as URI + manual link in v1.
2. **Plugin marketplace and signing chain.** Trivial for the v1 baseline (six plugins, one author). Non-trivial as soon as third-party plugins arrive.
3. **Personhood attestation for high-stakes editorial actions.** Refers to the DHITL Rule 0 research problem; cannot be solved at the Commons layer alone.
4. **Snapshot-vs-streaming sync** between Supabase and GitHub. v1 does snapshot at commit boundaries (resolved at the per-commit level by §5.6, but the question of finer-grained streaming for in-flight edits remains).
5. **`kernel_extractor` sub-specification.** The most ambitious of the §6.3 baseline plugins, and the one that bootstraps a Document into a formal graph in the first place. Needs its own contract: how it proposes anchor IDs against existing markdown heading structure, how it handles documents that already have hand-written anchors, and how the proposal interacts with the §5.6 migration protocol on subsequent edits.
6. **Internationalisation.** The doctrine is bilingual. v1 is EN-only on the platform surface. FR support is a v1.1 item.
7. **Measuring proximity to the irreversibility threshold.** §11.3 names the threshold; it does not specify how to detect that the platform is near it inside a given host community. Candidate indicators (number of unprompted Thesis Kernels per active researcher, ratio of accepted Objections from external GitHub identities, retention across two academic terms) need empirical calibration before any of them can drive a decision to lift a desynchronization measure (e.g. enable a public landing page). Until then, the conservative default is to leave each measure in place.

*Resolved since v0.3:* Editor eligibility (now §4.4); re-anchor / formal-vs-literate conflict semantics (now §5.6).

---

## 15. Relationship to Existing Artifacts

This spec is a refinement of, and is bound by:

- [`Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md) §4–§5 (entity model), §6 (recursive first use case), §7 (failure modes).
- [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) — the five rules. Rule 0 and Rule 2 are load-bearing on every section here.
- [`DHITL.md`](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md) — Cogentia Commons is Layer 4. By design, no Layer 3 capability lives here.
- [`Cogentia-and-Cogentigram.md`](Cogentia-and-Cogentigram.md) — Personal Cogentia is the individual analogue; the paste-bridge UX is shared.
- [`inseme/packages/cop-core/Architecture.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) — COP (Cognitive Orchestration Protocol). Commons is a COP/HITL profile consumer. The Continuation primitive (§1.8, §2.7, §5.5) is inherited verbatim.
- [`mimetic_desynchronization.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/mimetic_desynchronization.md) — the DRSJ cycle and the six mechanisms of indirect action. Shapes the v1 in-scope/out-of-scope list (§1) and the rollout posture (§11.3).
- The Kudos book (`C:\tweesic\Kudos`) — anchors the deferred reward primitive.

It supersedes nothing. If a contradiction is identified between this spec and any of the above, the above wins until this spec is revised through the method it describes.

---

## 16. License

This specification: **CC BY-SA 4.0**.
Reference implementation contracts (schemas, plugin manifests, resolver code): **MIT**.

---

*This document is itself a Thesis Kernel. Fork. Object in falsifiable form. Propose Revisions. The first round of critique on this document is the second exhibit in the Commons graph — the first remains `second_method.md`.*

*Premier commit : 2026-05-11 — Corte. Draft v0.1.*
*Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica*
