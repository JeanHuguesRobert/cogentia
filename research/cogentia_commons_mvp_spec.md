---
title: "Cogentia Commons — MVP Specification"
description: "Exchanges, formats, and results for the first operational instance of the Cogentia Commons platform"
layout: default
nav_order: 5
version: "draft-0.2"
last_modified_at: 2026-05-11
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0 (text), MIT (reference code contracts)"
status: "Working specification — applies the method to itself"
---

# Cogentia Commons — MVP Specification

*v0.2 — draft. Premier commit établit la priorité.*
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
4. A **Support primitive**: non-fungible recognition signal, architecturally decoupled from epistemic status.
5. **GitHub-anchored identity** for authors, objectors, reviewers, editors.
6. **Per-community federation contract** (URI scheme, no live protocol in v1).
7. **Publication** as a discrete act that mints a stable URI = community + commit + node.

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

A **round** is the atomic unit of method application: one author, one target node, one or more audit plugins, one author acceptance pass, one possible Revision commit.

```
1. Author opens a round
   - selects target node (Thesis | Premise | Claim | Objection)
   - selects audit plugin(s) from community allow-list
   - Commons renders each plugin's prompt with placeholders bound to the live
     formal-graph state at HEAD

2. Human paste bridge
   - for each plugin:
       a. Commons displays the rendered prompt + a "Copy" button
       b. Author pastes the prompt into a conversational agent (their choice)
       c. Author copies the agent's response back into the Commons paste field
       d. Commons extracts the JSON block matching the plugin's output_schema
          (same extractor logic as apps/personal/src/pages/Submit.jsx)
       e. Extraction failure → author retries or aborts plugin

3. Per-plugin disposition
   - structural plugins: AgentReview row written automatically with status=accepted;
     no further author action required
   - substantive plugins: AgentReview row written with status=proposed;
     author must accept, reject, or invoke the falsifiability conversion sub-round

4. Burton gate (substantive plugins only)
   - if plugin output declares falsifiable=false OR reviewer flags it:
       round cannot close on this output until the converted_statement is
       either accepted by the author or escalated as an Objection in its
       own right (a converted feeling-of-certainty IS a contribution)

5. Round closure
   - author manually marks the round closed
   - if any plugin output triggered an editorial action, Commons surfaces
     a "draft Revision" view that produces a candidate patch the author can
     paste into a GitHub PR or commit
   - round metadata (target, plugins, dispositions, commit_sha at HEAD) is
     persisted as an immutable record
```

The round never auto-closes. There is no agent who decides the round is done.

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

---

## 14. Open Questions

1. **Live federation protocol.** Push vs pull, subscription semantics, conflict policy when a referenced community alters a node. Specified only as URI + manual link in v1.
2. **Plugin marketplace and signing chain.** Trivial for the v1 baseline (six plugins, one author). Non-trivial as soon as third-party plugins arrive.
3. **Personhood attestation for high-stakes editorial actions.** Refers to the DHITL Rule 0 research problem; cannot be solved at the Commons layer alone.
4. **Snapshot-vs-streaming sync** between Supabase and GitHub. v1 does snapshot at commit boundaries; a streaming model may be required later.
5. **Editor eligibility rules.** The "synthesis is editorial labour, not authority" formulation needs operational thresholds (how many accepted prior contributions on a document, etc.). v1 leaves this to the community manifest.
6. **Conflict between literate form and formal graph during fast revision.** What happens when a commit re-anchors a Premise that has 30 open Objections? v1 says the Objections re-anchor to the closest surviving Premise and surface a *re-anchor pending* flag for author triage. This needs stress-testing.
7. **Internationalisation.** The doctrine is bilingual. v1 is EN-only on the platform surface. FR support is a v1.1 item.

---

## 15. Relationship to Existing Artifacts

This spec is a refinement of, and is bound by:

- [`Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md) §4–§5 (entity model), §6 (recursive first use case), §7 (failure modes).
- [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) — the five rules. Rule 0 and Rule 2 are load-bearing on every section here.
- [`DHITL.md`](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md) — Cogentia Commons is Layer 4. By design, no Layer 3 capability lives here.
- [`Cogentia-and-Cogentigram.md`](Cogentia-and-Cogentigram.md) — Personal Cogentia is the individual analogue; the paste-bridge UX is shared.
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
