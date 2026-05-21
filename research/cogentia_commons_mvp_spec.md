---
title: "Cogentia Commons — MVP Specification"
description: "Exchanges, formats, and results for the first operational instance of the Cogentia Commons platform"
layout: default
nav_order: 5
version: "draft-0.10.2"
last_modified_at: 2026-05-13
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0 (text), MIT (reference code contracts)"
status: "working-paper"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_commons_mvp_spec.md
last_stamped_at: 2026-05-16
---

# Cogentia Commons — MVP Specification

*v0.10.2 — draft. Premier commit établit la priorité.*
*Companion to [`Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md) (the **what / why**), [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) (the **rules**), and the [COP — Cognitive Orchestration Protocol](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) (the **orchestration substrate**).*
*This document is itself a Thesis Kernel. It will be the second exhibit in the Commons graph; the first remains `second_method.md`.*

---

## 0. Preamble

The Working Paper says *what* Cogentia Commons is and *why* it must exist. The five rules of the second method say *how* knowledge is produced under AI conditions. Neither answers the operational question: *what does the platform actually do, in what sequence, with which artifacts, when a first user arrives?* This document does.

The MVP exists to demonstrate that the method can run on a finite, runnable surface — not to host an academic-publishing system. Everything beyond what is required to perform one full critique-and-revision round on a real document is out of scope for v1, regardless of how attractive it would be.

The document the MVP will run on first is `second_method.md`. The recursive commitment from Working Paper §6 is not rhetorical — it is the acceptance test.

Orchestration is inherited, not re-invented. Cogentia Commons is a [**COP/HITL profile consumer**](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md): every durable cognitive state in the platform — pending plugin runs, suspended Burton conversions, queued Editor syntheses, awaited Author acceptances — is a COP `cop/continuation` Artifact attached to the relevant target, with named resumers and explicit resumption conditions. This is what makes "what should happen next on this Premise / Objection / Revision?" a queryable, multi-directional property of every node in the formal graph, rather than a separate todo system bolted on.

---

## 1. Scope and design principle

### 1.1 Design principle: permissive action, accountable record

The platform encodes a single architectural disposition that overrides any default toward precondition-based gatekeeping:

> *Any modification is almost always authorized, because it is (a) reversible, (b) traced in the Event log, and (c) attributable to a specific human actor who bears the consequences of its abuse.*

This is the **skin-in-the-game** principle applied at the individual-action layer — and it is consistent with the second method's rejection of skin-in-the-game as a *governance* boundary. [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) names *mortality under governance* as the criterion for political participation precisely because skin-in-the-game would exclude the stateless, the destitute, and the dying from political equality. That refusal applies at DHITL Layer 3, not Layer 4. Within Layer 4 (cognitive infrastructure, where Commons lives), action accountability via signed, reversible, attributed records is appropriate and is the v1 default.

**What this means in practice.**

- Barriers to entering the conversation are kept low. New users can submit Objections, claim most Continuations, and offer Support without prior contribution thresholds.
- Every action is recorded as a COP Event with a `human.actor` field that resolves to a signed GitHub identity. The record is permanent; the action is reversible.
- Accountability is post-hoc: a graduated set of reversal mechanisms (§4.5) — informational tag, contribution Mark, cooldown, temporary ban — is applied to *signed actions*, not to *seat eligibility*. The threat of these mechanisms is the deterrent; the deterrent is what makes the permissive default safe.
- A precondition gate survives the audit only when it encodes one of: (i) a doctrinal invariant (Rule 0 — no agent binding decisions); (ii) a structural anti-loop (the synthesiser cannot be the same human as the objector); or (iii) a **community-elected gate** declared explicitly in the community manifest. The third category is what lets a community add specific, named gates — e.g. initial-publication moderator approval (§8.3) — without weakening the permissive default elsewhere. Convenience filters not anchored in one of these three categories do not survive.

**"At your own risk."** A community manifest MUST declare its accountability policy (§4.5), including the maximum cooldown duration, who may issue cooldowns, and the appeal protocol. A user joining the community accepts those terms; that acceptance is the consideration that makes the permissive default fair.

### 1.2 In scope (v1)

1. Dual representation of every document: a **literate** markdown form anchored in a GitHub repository, and a **formal** graph representation in a per-community Supabase instance.
2. A **plugin architecture for audit prompts**: versioned prompt templates with declared output schemas and contract classes, run through a human-mediated copy/paste bridge to any conversational agent.
3. A **revision graph** built incrementally from accepted contributions, with typed edges and commit-anchored versioning.
4. **Continuations on every node** (COP `cop/continuation` artifacts): the multi-directional, queryable "what should happen next" attached to any Thesis, Premise, Claim, Objection, Revision, AgentReview, or Support.
5. A **Support primitive**: non-fungible recognition signal, architecturally decoupled from epistemic status.
6. **GitHub-anchored identity** for authors, objectors, reviewers, editors.
7. **Per-community federation contract** (URI scheme, no live protocol in v1).
8. **Publication** as a discrete act that mints a stable URI = community + commit + node.

### 1.3 Explicitly out of scope (v1, with rationale)

| Deferred | Why |
|---|---|
| Monetary Kudos | Requires non-accumulation mechanics + governance. Support is the seed event. |
| Anonymous personhood attestation | Depends on DHITL Rule 0 research problem; unsolved upstream. |
| Live cross-community sync protocol | URI scheme + manual subscription suffices for v1. |
| Voting / binding decisions | Cogentia Commons is DHITL Layer 4. By construction, never binds. |
| AI-author flow | An agent never opens a Thesis Kernel. Authorship is a Rule 0 act. |
| Citation marketplace, plugin marketplace | Premature without a working baseline plugin set. |

### 1.4 Deferred but v1-schema-affecting

Some features are explicitly post-v1 but constrain v1 schema choices because retrofitting them later would force a breaking migration. v1 reserves the necessary discriminators and field shapes; v1 does not implement the features themselves.

#### Retrofit and proxied actors (post-v1)

Future-direction commitment: Cogentia Commons will eventually support retrofitting *existing state of the art* into the Cogentia Graph — historical contributions by deceased thinkers and contributions by living external contributors not yet on the platform — so the corpus can host not only contemporary discourse but the reasoning trace of how knowledge was actually elaborated. This direction is named in [`Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md) §1 (Wegener / Semmelweis as ideas that languished due to bad infrastructure) and follows from the recursive self-application principle (the platform should be able to host the history of its own ideas).

Two future actor kinds are anticipated beyond the v1 native-GitHub actor:

- **Historical actor.** `kind: historical`, handle prefix `historical:` (e.g. `historical:aristotle`, `historical:mauss`). A deceased contributor whose work is *attributed* by a living retrofitter. No claim path — the actor cannot revendicate identity. Contributions remain attributed via the retrofitter, who carries skin-in-the-game for attribution accuracy (§1.1 applied to historical citation).
- **Proxied actor.** `kind: proxy`, handle prefix `proxy:` (e.g. `proxy:n-taleb`). A living external contributor whose work is provisionally entered on the platform by a retrofitter. The proxy handle is *claimable* by the actual person via a revendication protocol: the claimant verifies their GitHub identity, the platform binds the proxy handle to the GitHub handle without transferring ownership of prior contributions, and the claimant chooses per contribution — **endorse** (stands as-written), **repudiate** (marked as the retrofitter's interpretation, repudiated by the named subject), or **amend** (claimant offers a corrected version; both versions remain visible). Repudiations are themselves first-class signed records.

**Rule 0 generalises rather than weakens.** A retrofit does NOT introduce an actor without a human in the causal chain. The *retrofitter* is the human in the chain — they sign the attribution under their own GitHub identity, and they bear the consequences of misattribution under §4.5. The historical actor has no participatory rights (cannot claim Continuations, cannot issue sanctions, cannot Support, cannot vote in any sense). The proxied actor likewise has no rights until claimed; even after claiming, the participatory rights belong to the GitHub identity that did the claiming, not to the proxy handle.

**v1 schema constraints — to be honoured by v1 even though v1 does not implement retrofit.**

- The `User` entity (§5.1) carries a `kind` discriminator field. In v1, `kind` is always `github`. The column exists in the v1 schema.
- Every Event/Artifact "actor" field accepts polymorphic handles in form, even though v1 only emits the `<github_handle>` form. Field naming MUST NOT encode "GitHub" into its constraints — the handle column is `actor_handle`, not `github_handle`, on Events that may eventually accept other actor kinds. The User entity's primary key retains `github_handle` for v1 since `kind=github` is the only value; renaming there is a v1.1 migration.
- The Rule 0 audit table (§10) is formulated to anticipate the future case ("verified human GitHub identity, either as the direct author or as the retrofitter attesting to a historical/proxied source") even though v1 only exercises the first half.

These constraints are the entire v1 cost of keeping the door open. The retrofit Events, the claim Events, and the revendication protocol are deferred entirely to a later release.

### 1.5 Out of scope, permanently

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
| **Reviewer** | May invoke `falsifiability_conversion` on any Objection to challenge its falsifiability; may claim Burton-conversion Continuations; participates as a community-named appeals reviewer for §4.5 sanctions when the manifest delegates. | Verified GitHub identity. Has no manual marking authority — Marks are auto-applied per §4.5 rung 2. |
| **Editor** | Proposes revisions that synthesize multiple objections. Drafts patches against the literate form, opens PRs. | Verified GitHub identity. Synthesis is editorial labour, not authority. |
| **Moderator** | Issues rung-3 cooldowns (community-wide) and rung-4 temporary bans (§4.5). Approves or rejects `initial` Publications when the manifest delegates (§8.3). | Verified GitHub identity, named in `COMMUNITY.md` §6. Every sanction or approval is a signed Event; recursive accountability applies (a Moderator who issues frivolous sanctions accumulates their own record). |
| **AI Agent** | Runs an audit plugin and emits a structured JSON output, *only* when invoked by a human paste bridge. | **Never** an autonomous writer. The agent's output is a contribution proposal, not a contribution. |
| **Supporter** | Attaches a Support signal to a contribution. | Verified GitHub identity. |

---

## 4. Communities and Federation

### 4.1 What a community is

A **community** is one Supabase database plus a governance manifest declaring:

- Membership policy (open, invite, federated-trust, etc.).
- Accepted audit-plugin allow-list (which plugins, which versions).
- Support threshold (if any) for advancing a contribution from *proposed* to *accepted*.
- Federation links: other community URIs whose documents may be cited.

The manifest itself is a markdown file in the community's home GitHub repository (`<community>/COMMUNITY.md`). Changes to it follow the same commit-anchored versioning as documents. The concrete file format, the amendment semantics (including non-retroactivity by default), and the `cogentia.js manifest --validate` contract are specified in the companion sub-spec [`cogentia_commons_community_manifest.md`](cogentia_commons_community_manifest.md).

### 4.2 The home-community rule

Every document has **exactly one home community** at any commit. The home community holds the document's formal graph. References from other communities resolve through the URI scheme. This mirrors the cross-repo network symmetry rule already governing the four-repo corpus: one canonical home, references elsewhere.

### 4.3 Federation in v1

The federation contract is the URI scheme (§8) and a `federation.json` file listing trusted community URIs. There is no live push/pull protocol. Cross-community discovery happens by manual subscription or by graph-traversal links inserted by humans.

A live federation protocol is an open question (§14).

### 4.4 Editor eligibility

"Synthesis is editorial labour, not authority" (§3) needs an operational definition before the role is meaningful in v1. Under the §1.1 design principle, the operational definition is permissive: any community member may claim an `editor_synthesis` or `revision_draft` Continuation, subject only to one structural constraint that survives the principle (the independence anti-loop). Reputational consequence and reversibility do the rest of the work.

**Eligibility rules (v1).**

1. **Independence constraint *(structural — non-negotiable)*.** The user claiming the synthesis Continuation MUST NOT be the author of any Objection that the synthesis would consolidate. This is not a "you have to earn it" gate — it is the structural anti-loop that prevents an Objector from authoring their own response. The community manifest MAY tighten this constraint but MAY NOT weaken it.
2. **No contribution floor.** Anyone with a verified GitHub identity in the community can claim. *(Per §1.1 the alternative would be a precondition gate; the principle prefers attribution + reversibility.)*

**New-Editor tag.** A claim by a user with fewer than three previously accepted contributions on the Document is automatically tagged `new_editor` on the resulting Revision and AgentReview rows. The tag is *informational*, not blocking — it surfaces in the UI so Reviewers and Supporters can weight the synthesis accordingly. The tag drops when the contribution threshold is met.

**Reversibility.** A synthesis Revision is itself revisable. A subsequent Editor's synthesis can supersede an earlier one with a `responds_to` edge; the earlier Revision remains visible in the record. There is no overwrite. A poor synthesis is therefore not a binding outcome — it is a transient state that the next eligible Editor (which, under the permissive default, is most of the community) can replace.

**Authoring exception.** A Document's Author is always eligible to synthesise on their own Document, subject to the same independence constraint with respect to Objections they themselves raised under another role.

**Cost of abuse.** A user who repeatedly produces low-quality syntheses, or who claims Continuations they cannot follow through on, accumulates a visible record. The community's accountability policy (§4.5) handles persistent abuse via the graduated mechanisms there. Eligibility is *not* the deterrent in this design — accountability is.

### 4.5 At your own risk — accountability and reversal

The §1.1 permissive default rests on a graduated set of post-hoc accountability mechanisms. The community manifest MUST declare its accountability policy in `COMMUNITY.md`; joining a community is acceptance of that policy.

**The four-rung ladder.**

| Rung | Mechanism | Reversibility | Issued by |
|---|---|---|---|
| 1 | **Informational tag** | Drops when the underlying condition no longer holds (e.g. `new_editor` tag drops at three accepted contributions). | Auto-computed from the Event log. |
| 2 | **Contribution Mark** | The Mark persists on the contribution, never on the user. `un-falsifiable`, `out-of-eligibility`, `withdrawn`, `new_editor`. | Auto-applied per contract; appeal is permitted as a Revision contribution. |
| 3 | **Cooldown** | A signed, time-bounded suspension of a user's right to *open new Continuations* in the community. Existing claims and ongoing work are unaffected. Default duration ceiling: 30 days. Reading and Support are never suspended. | Author (within their own Document) or a named community moderator (community-wide). |
| 4 | **Temporary ban** | A signed, time-bounded suspension of a user's right to *submit any new Events* in the community. Reading remains unaffected. Hard duration ceiling: 90 days. | A named community moderator. The ban is itself a signed Event whose issuer carries the recursive accountability for it. |

Permanent exclusion is **not** a v1 mechanism. It violates the reversibility commitment underneath §1.1, and a system designed for the surfacing of unwelcome objections (Working Paper §6) cannot afford an irreversible-exclusion primitive.

**Issuance semantics.** Cooldowns and bans are issued by emitting a `cogentia.user.cooldown.imposed` or `cogentia.user.banned` Event. The Event payload includes the issuer's GitHub handle, the target's handle, the duration, a free-text reason (mandatory), and the rung. The issuance creates two artefacts:

- a `cogentia/sanction` Artifact recording the action (immutable, COP §2.6); and
- a `cop/continuation` Artifact with `resumeAfter = <expiry timestamp>` and `agent = "scheduler"` whose resolution emits the corresponding `.lifted` Event.

When the Continuation resumes, the sanction lapses automatically. No human action is required to lift a cooldown or ban — they expire by design.

**Appeal.** Anyone (including the sanctioned user) may submit a `cogentia.user.sanction.appealed` Event referencing the sanction. The appeal is itself a contribution and appears in the community record. A community manifest may name an appeals reviewer; absent such, the issuer is asked to revisit. An appeal does not pause the sanction; it produces a record that, if upheld, results in a new Event lifting the sanction early.

**Recursive accountability.** A moderator who issues a frivolous ban is signing their name to that issuance. The signed record is permanent (the action itself remains in the Event log even after the ban expires), it is visible to the community, and it contributes to the moderator's own reputational record. The same skin-in-the-game logic that makes permissive default safe for ordinary actions makes it safe for sanctioning actions too.

**Community manifest requirements (v1).** A `COMMUNITY.md` accountability section MUST specify:

- which roles can issue rung-3 cooldowns and rung-4 bans;
- per-rung maximum durations (subject to the v1 ceilings of 30 and 90 days);
- the appeals protocol (named reviewer, time-to-respond, escalation path if any);
- the *Acceptable Use* statement that joining the community accepts.

A community whose manifest omits any of these MAY NOT issue rung-3 or rung-4 sanctions — the v1 ceiling is enforced at the data layer by refusing to admit such Events without a corresponding manifest declaration.

---

## 5. The Formal Graph

### 5.1 Entities

```
-- All entities below carry a `metadata jsonb` field for forward-compatibility.
-- This mirrors inseme's COP table convention (cop_topic.metadata, cop_event.meta,
-- cop_artifact.metadata, etc. — see C:\tweesic\inseme\apps\platform\supabase\
-- migrations\20251206_add_cop_core.sql). Metadata is the escape hatch for
-- per-instance / per-version fields that don't warrant a column of their own.

Community
  - id, name, home_repo, manifest_commit
  - federation_links: [community_uri]
  - metadata: jsonb

User
  - kind: { github }                 -- v1 has only "github"; future: historical | proxy (§1.4)
  - github_handle (primary key, per community; required when kind=github)
  - joined_at, profile_md_url (optional)
  - contribution_count_cache
  -- post-v1 fields, reserved in v1 schema for forward-compat (NULL in v1):
  - canonical_handle                 -- the polymorphic actor handle: same as github_handle
                                     --   when kind=github; "historical:<slug>" when
                                     --   kind=historical; "proxy:<slug>" when kind=proxy
  - claimed_by_github_handle         -- non-null when a kind=proxy actor has been
                                     --   revendicated by a verified GitHub user
  - metadata: jsonb

Document
  - id, community_id, repo, path
  - author_github_handle
  - current_commit_sha
  - literate_anchor: { repo, commit_sha, path }
  - status: { draft | active | deprecated | published }
  - metadata: jsonb

Thesis
  - id, document_id, anchor_id
  - core_assertion, epistemic_status_tag
  - committed_at, commit_sha
  - metadata: jsonb

Premise
  - id, thesis_id, anchor_id
  - statement, epistemic_status_tag
  - committed_at, commit_sha
  - metadata: jsonb

Claim
  - id, document_id, anchor_id
  - statement
  - derived_from: [thesis_id | premise_id | claim_id]
  - metadata: jsonb

Constraint
  - id, target_id (thesis | claim)
  - statement, evaluation_method
  - metadata: jsonb

Objection
  - id, target_id, target_type
  - author_github_handle
  - statement, falsifiability_form
  - status: { proposed | substantive | needs_revisit | stranded | resolved | rejected }
              -- needs_revisit / stranded set by §5.6 anchor migration
  - marks: [Mark]            -- §4.5 rung 2 — see Marks enum below
  - committed_at
  - metadata: jsonb

Revision
  - id, target_id, target_type
  - replaces_version_commit_sha
  - patch_commit_sha
  - responds_to: [objection_id]
  - marks: [Mark]            -- e.g. `out-of-eligibility`, `new_editor`
  - metadata: jsonb

AgentReview
  - id, plugin_id, plugin_version, target_id
  - invoked_by_github_handle
  - input_snapshot, raw_agent_output, extracted_json
  - contract_class: { structural | substantive }
  - status: { proposed | accepted | rejected }
  - marks: [Mark]            -- e.g. `un-falsifiable` when the underlying contribution carries it
  - metadata: jsonb

Mark (enum, §4.5 rung 2)
  - un-falsifiable           -- Burton conversion produced un-falsifiable verdict
  - out-of-eligibility       -- claim was made by a handle outside eligibleResumers
  - withdrawn                -- author withdrew the contribution
  - new_editor               -- claimant has < 3 prior accepted contributions on the Document
              -- The Mark enum is open per §4.5 rung 2; communities MAY introduce additional Marks
              -- via manifest declaration. v1 reserves the four above.

Support
  - id, giver_github_handle, target_id, target_type
  - justification (required, free text)
  - timestamp
  - lineage: [previous_support_id?]   -- placeholder for future Kudos circulation
  - metadata: jsonb

Publication
  - id, document_id, commit_sha
  - artifact_type: { initial | improved | premise_note | conclusion_note | refutation | synthesis }
  - canonical_uri
  - metadata: jsonb

Sanction (§4.5)
  - id, target_github_handle, issuer_github_handle
  - rung: { 3 | 4 }                    -- cooldown or ban
  - duration_days, reason (mandatory)
  - manifest_commit_at_issuance        -- the manifest values that govern this sanction
  - issued_at, expires_at
  - lift_continuation_id               -- the cop/continuation that auto-lifts on expiry
  - metadata: jsonb

Appeal (§4.5)
  - id, target_artifact_id              -- the sanction or initial-publication rejection
  - target_kind: { sanction | publication_rejection }
  - appellant_github_handle
  - reasoning (mandatory, free text)
  - status: { pending | upheld | lifted | escalated }
  - resolved_by_github_handle, resolved_at
  - metadata: jsonb

PublicationReview (§8.3)
  - id, document_id, requested_commit_sha
  - reviewer_github_handle, requester_github_handle
  - verdict: { approved | rejected }
  - reason (mandatory when rejected)
  - reviewed_at
  - metadata: jsonb

Continuation                         -- projection of a COP cop/continuation Artifact
                                     -- (canonical schema in cop-core/Architecture.md §2.7.1)
  -- COP-native payload fields (verbatim):
  - id                               -- COP Artifact id (URN recommended)
  - topicId                          -- the COP Topic this Continuation belongs to (§5.7.3)
  - taskId                           -- optional: the COP Task within the Topic
  - stepId                           -- optional: the COP Step within the Task
  - agent                            -- primary resumer (github handle, role, or plugin_id)
  - state: jsonb                     -- resume-state payload
  - waitForEvents: [string]          -- COP Event type names that satisfy resumption
  - resumeAfter, resumeBefore        -- ISO-8601 time window (optional)
  - retry: { maxAttempts, attempt, retryDelayMs }  -- advisory
  - label                            -- short human-readable description
  -- Commons profile extensions (carried in meta, §5.7.6):
  - meta.cogentia.attached_to_id, meta.cogentia.attached_to_type
  - meta.cogentia.intent             -- round.open | kernel_extraction | burton_conversion |
                                     --   citation_validation | consistency_scan |
                                     --   objection_response | objection_revisit |
                                     --   stranded_objection_disposition |
                                     --   revision_draft | editor_synthesis |
                                     --   author_acceptance | anchor_migration |
                                     --   publication_initial_review | publication_review |
                                     --   sanction_expiry | custom
                                     -- `sanction_expiry` is the time-triggered intent
                                     --   for the auto-lift Continuation on a Sanction
                                     --   (§4.5 + §5.5 scheduler clarification).
                                     --
                                     -- Note: `revision_draft` and `editor_synthesis` are
                                     -- distinct:
                                     --   - `revision_draft` = draft a Revision against ONE
                                     --     target (single-objection response); can be opened
                                     --     by Author at round closure or by an Editor via
                                     --     §4.4.
                                     --   - `editor_synthesis` = consolidate MULTIPLE
                                     --     Objections into a single Revision; typically
                                     --     requires Editor independence per §4.4. May open
                                     --     a child `revision_draft` Continuation when the
                                     --     synthesiser is ready to actually draft.
  - meta.cogentia.eligibleResumers   -- [{kind, eligibility}] when more than one
                                     --   resumer is acceptable (overflow from `agent`)
  - meta.cogentia.parent_continuation_id   -- forks form a tree
  - meta.cogentia.superseded_by      -- when a Continuation closes as `superseded`,
                                     --   points forward to the winning Continuation
  - meta.cogentia.opened_by_github_handle, meta.cogentia.commit_sha
  -- Projection-only fields (derived by the Commons Projector from Events):
  - status: { active | resumed | expired | abandoned | superseded }    -- COP §5.5.1
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

A **Continuation** is the COP `cop/continuation` Artifact defined in [`cop-core/Architecture.md` §1.8](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md#18-continuations) (concept), §2.7 (canonical schema), and §5.5 (execution semantics). Cogentia Commons consumes this primitive as a **declared profile** — see §5.7 below — and does not invent a parallel todo, queue, or workflow mechanism.

**Attached to any node.** Every Continuation carries `meta.cogentia.attached_to_id` + `attached_to_type`. Any entity in §5.1 — Thesis, Premise, Claim, Constraint, Objection, Revision, AgentReview, Support, Publication, Document — can have zero, one, or many open Continuations at the same time. **Multi-directional** in Commons means *N parallel Continuations targeting the same node* (the COP-conformant pattern), not multiple resumers inside a single Continuation. A Premise can simultaneously be the target of a `citation_validation` Continuation awaiting the `citation_validator` plugin, an `objection_response` Continuation awaiting the Author, and an `editor_synthesis` Continuation awaiting any eligible Editor.

**Primary resumer and eligible alternates.** COP §2.7.1 declares a single `agent` field on a Continuation — the primary resumer. When Commons needs the "any of these can claim" pattern (e.g. any eligible Editor may pick up an `editor_synthesis`), it sets `agent` to the role tag and lists concrete acceptable resumers in the declared extension `meta.cogentia.eligibleResumers` (§5.7.6). First eligible claim wins; remaining open Continuations of equivalent intent on the same target are marked `superseded` with a reference to the winner. This is a profile extension, not a deviation: §10.4.1 of the COP spec permits added Artifact properties provided Core invariants are not weakened.

**Resumption conditions.** Each Continuation declares (via COP-native fields) what makes it resumable: `waitForEvents` lists COP Event type names that satisfy resumption, `resumeAfter` / `resumeBefore` bound a time window, `retry` carries advisory retry hints. Resume-state lives in `state`; no hidden in-memory cache is permitted (COP §5.5 + Invariants §3.3). Prerequisite-Continuation joins are expressed by adding a *prerequisite resolved* Event type to `waitForEvents` and emitting that Event when the prerequisite closes.

**Forking.** A Continuation that needs to fork creates child Continuations and emits a `cogentia.continuation.forked` Event linking them; children carry `meta.cogentia.parent_continuation_id` and list the parent's resolution Event in their own `waitForEvents` if they should block on it. Per COP §5.5.3, the parent Continuation is **not mutated**; the fork is expressed by new Artifacts and Events.

**Lifecycle, verbatim from COP §5.5.1.** Active → resumed | expired | abandoned. Commons additionally projects a `superseded` status for the case above (claim-race resolution); this is a Commons-projection state derived from the COP `cogentia.continuation.superseded` Event and does not contradict COP's lifecycle (it is a refinement of `abandoned` with a forwarding pointer).

**Why not a `tasks` table.** A Continuation is a *capsule of suspended reasoning* with everything needed to resume it on any node, by any eligible resumer, after any interruption — including a process crash, a runtime change, or a migration of the formal graph to a different Supabase instance. Sharing the primitive across Cogentia components (Personal, Commons, plugin runtimes) keeps a single orchestration substrate and a single event log. Agents are replaceable, models evolve, the reasoning trace persists.

**Rule 0 anchoring.** Even when a Continuation's `agent` is a plugin (e.g. `citation_validator` is the eligible resumer of a `citation_validation` Continuation), the *downstream* Continuation that accepts the plugin's output for any substantive purpose is human-resumable. Agents close their own structural Continuations; substantive resolutions always have a human resumer in the close path. This is the data-layer enforcement of §10.

**Time-triggered Continuations (Scheduler resumption).** A small class of Continuations has `agent: "scheduler"` — they are resumed by the COP §5.5.2 time-based mechanism (`resumeAfter` reached, no human action). The v1 examples are sanction-expiry Continuations (§4.5): a cooldown or ban Continuation auto-lifts when its expiry timestamp arrives. This is not a Rule 0 exception, because the Continuation is not *authorising* anything new — it is letting a previous human-signed authorisation lapse. The decision that required a human (the issuance) already happened; the Scheduler resumption is the COP-defined way to express "this lapses at time T." No agent acquires any binding authority via this pattern.

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

### 5.7 COP/Commons Profile Conformance

This section makes the COP profile that Cogentia Commons consumes explicit, normative, and conformant to the rules in [`cop-core/Architecture.md` §10.4.1](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md#1041-rules-for-custom-profiles).

#### 5.7.1 Profile declaration

- **Profile name:** `COP/Commons`
- **Target COP version:** v0.3 (the current `cop-core` reference spec).
- **Composed with:** `COP/HITL` (mandatory). Commons is HITL by Rule 0 — every substantive Continuation resolution has a human in its causal chain.
- **Composed with (optionally):** `COP/AI`, when an audit plugin is the resumer of a structural Continuation. Plugin output is recorded as the COP/AI `agent/result` Artifact pattern.
- **MUST NOT weaken** any COP/Core invariant (immutability, topic-local total order, idempotence, durability, stateless agents, isolation via events).

#### 5.7.2 Concept mapping (Commons → COP)

| Commons concept | COP primitive | Notes |
|---|---|---|
| Document | `cop:Topic` + initial `cop:Artifact` | One Topic per Document. Topic id is derived from `(community, document_id)`. |
| Round (on a target node) | `cop:Task` inside the Document's Topic | Round opening emits `cogentia.round.opened`; closing emits `cogentia.round.closed`. |
| Plugin invocation | `cop:Step` inside the round Task | One Step per plugin run. |
| Thesis, Premise, Claim, Constraint, Objection, Revision, AgentReview, Support, Publication | `cop:Artifact` (typed per §5.7.5) | Each is immutable in the COP sense; "edits" produce new Artifacts (Revision). |
| Continuation | `cop/continuation` Artifact | Canonical schema §2.7.1; Commons extensions §5.7.6. |
| Community manifest | `cop:Topic` + `cogentia/manifest` Artifact | Manifest commits emit `cogentia.manifest.updated` Events. |
| Federation link | `cop:Event.parentEventIds` across Topics | Cross-community references are causal links in the global DAG. |
| Author / Objector / Reviewer / Editor / Supporter | `cop:HumanActor` in `COP/HITL` | Role is a tag on Events, not a seat assignment (§3). |
| Audit plugin | `cop:Agent` in `COP/AI` | Stateless per COP §4.2.1 + plugin run is one Step. |

#### 5.7.3 Commons Topics

A Topic in Commons is the unit of cognitive coherence — a stream of causally related Events. Commons uses Topics at three scales:

- **Document Topics.** One per Document. Lifecycle aligns with Document status: `open → in_progress → exhausted → closed` (COP §2.3.2). Carries all Events related to the Document's formal graph: kernel extraction, round openings, plugin runs, contributions, anchor migrations, publications.
- **Community manifest Topic.** One per community. Carries `cogentia.manifest.updated`, member admissions, plugin allow-list changes, federation-link updates.
- **Cross-Document correlation.** When an Objection in Document A causally depends on a Premise in Document B, the Event listing the dependency includes the referenced Event in `parentEventIds`. This forms the global causal DAG per COP §3.3.

#### 5.7.4 Commons Event types (normative)

All Event payloads MUST be JSON. The `cogentia.*` prefix is reserved by this profile. Inherited HITL Event types (`human.input.requested`, `human.decision.provided`, etc., from COP §10.2.2) are used as-is and are not re-listed here.

| Event type | Emitted when | Required payload fields |
|---|---|---|
| `cogentia.document.opened` | Author opens a new Document | `documentId`, `repo`, `path`, `authorGithubHandle`, `commitSha` |
| `cogentia.kernel.proposed` | `kernel_extractor` plugin returns | `documentId`, `stepId`, `proposalArtifactId` |
| `cogentia.kernel.accepted` | Author confirms kernel proposal | `documentId`, `kernelArtifactIds`, `acceptedByGithubHandle`, `commitSha` |
| `cogentia.round.opened` | Author opens a round on a target | `documentId`, `taskId`, `targetId`, `targetType`, `pluginIds` |
| `cogentia.plugin.invoked` | Plugin Step starts | `taskId`, `stepId`, `pluginId`, `pluginVersion`, `inputSnapshotArtifactId` |
| `cogentia.plugin.returned` | Plugin Step ends with extracted JSON | `stepId`, `outputArtifactId`, `contractClass` |
| `cogentia.objection.submitted` | Human Objector files an Objection | `targetId`, `objectionArtifactId`, `objectorGithubHandle` |
| `cogentia.objection.converted` | Burton conversion produces falsifiable form | `originalObjectionId`, `convertedObjectionId`, `gatekeeperGithubHandle` |
| `cogentia.objection.needs_revisit` | §5.6 anchor migration affects an Objection | `objectionId`, `previousCommitSha`, `newCommitSha` |
| `cogentia.revision.proposed` | Editor or Author drafts a Revision | `revisionArtifactId`, `respondsToObjectionIds`, `proposerGithubHandle` |
| `cogentia.revision.committed` | Revision is committed to GitHub | `revisionArtifactId`, `commitSha`, `committerGithubHandle` |
| `cogentia.support.given` | Human Supporter records recognition | `supportArtifactId`, `targetId`, `giverGithubHandle`, `justification` |
| `cogentia.publication.minted` | Publication act mints a canonical URI | `publicationArtifactId`, `documentId`, `commitSha`, `artifactType`, `canonicalUri` |
| `cogentia.anchor.migration.proposed` | Commons diff detects anchor changes | `documentId`, `previousCommitSha`, `newCommitSha`, `migrationContinuationId` |
| `cogentia.anchor.migration.resolved` | Author resolves the migration Continuation | `migrationContinuationId`, `confirmedMigrations` |
| `cogentia.continuation.forked` | A Continuation creates child Continuations | `parentContinuationId`, `childContinuationIds` |
| `cogentia.continuation.superseded` | Claim-race resolution closes peer Continuations | `winnerContinuationId`, `supersededIds` |
| `cogentia.round.closed` | Round root Continuation resolves | `taskId`, `closedByGithubHandle`, `outcomeCommitSha` |
| `cogentia.continuation.claim.out_of_eligibility` | Out-of-list resumer claims a Continuation | `continuationId`, `claimedByGithubHandle`, `eligibleResumersSnapshot` |
| `cogentia.user.cooldown.imposed` | Rung-3 sanction issued (§4.5) | `targetGithubHandle`, `issuerGithubHandle`, `durationDays`, `reason`, `sanctionArtifactId` |
| `cogentia.user.cooldown.lifted` | Cooldown expires or is appealed-and-overturned | `sanctionArtifactId`, `targetGithubHandle`, `liftReason` |
| `cogentia.user.banned` | Rung-4 sanction issued (§4.5) | `targetGithubHandle`, `issuerGithubHandle`, `durationDays`, `reason`, `sanctionArtifactId` |
| `cogentia.user.unbanned` | Ban expires or is appealed-and-overturned | `sanctionArtifactId`, `targetGithubHandle`, `liftReason` |
| `cogentia.user.sanction.appealed` | Anyone submits an appeal on a sanction | `sanctionArtifactId`, `appellantGithubHandle`, `appealArtifactId` |
| `cogentia.publication.rejection.appealed` | Document Author submits an appeal on a rejected `initial` Publication (§8.3) | `publicationReviewArtifactId`, `appellantGithubHandle`, `appealArtifactId` |
| `cogentia.appeal.upheld` | Appeals reviewer upholds the underlying decision (appeal does NOT succeed); applies to both sanction and publication-rejection appeals | `appealArtifactId`, `reviewerGithubHandle`, `reasoning`, optional `sanctionArtifactId` or `publicationReviewArtifactId` |
| `cogentia.publication.initial.requested` | Author requests `initial` Publication; opens moderator-approval Continuation (§8.3) | `documentId`, `commitSha`, `requesterGithubHandle`, `reviewContinuationId` |
| `cogentia.publication.initial.approved` | Moderator approves an `initial` Publication request | `documentId`, `commitSha`, `approverGithubHandle`, `reviewArtifactId` |
| `cogentia.publication.initial.rejected` | Moderator rejects an `initial` Publication request | `documentId`, `commitSha`, `rejecterGithubHandle`, `reviewArtifactId`, `reason` |
| `cogentia.manifest.updated` | Community manifest commits | `communityId`, `commitSha`, `changedFields` |
| `cogentia.manifest.retroactive.amended` | Manifest amendment with `retroactive: true` (manifest §8.3); distinct from normal updates | `communityId`, `commitSha`, `retroactiveScope`, `justificationArtifactId` |

#### 5.7.5 Commons Artifact types (normative)

The `cogentia/*` Artifact-type prefix is reserved by this profile. Each Artifact MUST be immutable per COP §2.6.

```
cogentia/thesis           cogentia/premise           cogentia/claim
cogentia/constraint       cogentia/objection         cogentia/revision
cogentia/agent-review     cogentia/support           cogentia/publication
cogentia/manifest         cogentia/migration-proposal
cogentia/plugin-input-snapshot   cogentia/plugin-output
cogentia/sanction         cogentia/appeal
cogentia/publication-review
```

`cop/continuation` is used as-is (COP-reserved type name, §2.7.3); Commons does not introduce a Commons-prefixed Continuation type.

#### 5.7.6 Continuation payload extensions

Per COP §2.7.1 the Continuation payload includes `meta: {}`. The `COP/Commons` profile reserves the `cogentia` namespace inside `meta`:

```json
{
  "type": "cop/continuation",
  "payload": {
    "agent": "<github_handle | role | plugin_id>",
    "topicId": "urn:cop:topic:<documentTopicId>",
    "taskId": "urn:cop:task:<roundTaskId>",
    "stepId": "urn:cop:step:<pluginStepId>",
    "state": { /* resume-state, intent-specific */ },
    "waitForEvents": ["cogentia.plugin.returned", "human.input.provided"],
    "resumeAfter": null,
    "resumeBefore": null,
    "retry": { "maxAttempts": 1, "attempt": 0, "retryDelayMs": 0 },
    "label": "Burton conversion for objection #42",
    "meta": {
      "cogentia": {
        "attached_to_id": "<entity id>",
        "attached_to_type": "thesis|premise|claim|objection|revision|agent_review|support|publication|document",
        "intent": "burton_conversion",
        "eligibleResumers": [
          { "kind": "human", "eligibility": "role:reviewer" },
          { "kind": "human", "eligibility": "role:author" }
        ],
        "parent_continuation_id": null,
        "opened_by_github_handle": "jeanhuguesrobert",
        "commit_sha": "abc1234"
      }
    }
  }
}
```

`eligibleResumers` is **advisory** under §1.1, not a hard filter. The list signals the community's expectation about who *typically* should claim; it does not refuse out-of-list claims at the data layer. When a handle that does not match any `eligibleResumers[i]` claims the Continuation, the claim is accepted, the Continuation is marked `out-of-eligibility` on the resulting contribution (§4.5 rung 2), and a `cogentia.continuation.claim.out_of_eligibility` Event is emitted. The claim succeeds; the mark is visible; Reviewers and the Document Author decide whether to adopt the resulting work. Persistent out-of-eligibility claims that produce low-quality work accumulate against the claimant's record (§4.5 rung 1 → rung 3).

Two structural exceptions where `eligibleResumers` IS enforced as a hard filter — these are doctrinal, not gatekeeping:

- The `author_acceptance` Continuation on the Author's own Document. Only the Document's Author can resolve it (Author owns their literate form).
- Any Continuation whose `meta.cogentia.intent` is `anchor_migration`. Only the Document's Author can resolve it (§5.6 — silent re-anchoring would otherwise be possible).

For all other intents, `eligibleResumers` is advisory.

The claim emits a `human.input.provided` Event whose `correlationId` matches the Continuation id. Commons emits `cogentia.continuation.superseded` for any peer Continuation of equivalent intent on the same target (claim-race resolution).

This extension is fully compliant with COP §10.4.1: it adds a property under the COP-permitted `meta` field, does not redefine COP terms, and does not weaken any Core invariant.

#### 5.7.7 Separation of concerns (COP §5.6 applied)

COP §5.6 defines a normative four-way separation. The Commons implementation MUST honour it as follows:

| COP role | Commons component | May emit Events | May mutate Supabase | May invoke Agents |
|---|---|---|---|---|
| **Projector** | Commons sync layer (the daemon that ingests Events and updates the Supabase projection) | No | Yes | No |
| **Scheduler** | Commons round runner (the service that watches Continuations and routes them to resumers) | No | No | Yes |
| **Agent** | Audit plugins (the human-paste-bridge code path is itself a stateless plugin invocation) | Yes | No | No |
| **Human UI** | The `apps/commons` Vite + React frontend | Yes | No | No |

The frontend never writes directly to Supabase. Every state change passes through an emitted Event, which the Projector ingests. This is what makes the Supabase tables a *projection* in the COP sense (§4.1) rather than a primary store, and it is what makes the platform replayable from the Event log alone.

#### 5.7.8 Source-of-truth reconciliation

COP §2.2.3 declares Events as the authoritative source of truth; the §3.5.1 replay rule requires that all derived state be reconstructable from the Event log. Commons reconciles this with its three persistence layers as follows:

| Layer | What it holds | COP role | Authority |
|---|---|---|---|
| **GitHub** | Literate-form Document text; commit hashes; PR threads. | Out-of-band reference + Artifact payload for `cogentia/revision`. | Authoritative for the literate text only. Commit hashes are referenced in Events but the text itself is fetched on demand. |
| **COP Event log** | Every state-changing Event the Commons platform has ever emitted, in `topicSeq` order per Topic. | Source of truth (COP §2.2.3). | **Canonical.** The store of last resort under any replay or audit. |
| **Supabase per-community DB** | The formal-graph projection: rows for Document, Thesis, Premise, Claim, Objection, Revision, AgentReview, Support, Publication, Continuation. | Projection / read-only Store for agents (COP §4.2). | Derived. Reconstructable from the Event log via the Projector. |

In practice the Event log can live inside the same Supabase project as the projection (in a dedicated append-only `events` table partitioned by `topicId`), or in a separate durable substrate. v1 picks the same-Supabase option for operational simplicity; the choice is reversible because COP is transport-agnostic (§6.3).

#### 5.7.9 Conformance checklist (staged)

Six of the seven conformance requirements are moderately complex and belong in v1. One — full drop-and-rebuild byte-parity — is the canonical replayability-tax requirement that event-sourced systems are famous for paying, and is split between v1 (capability) and v1.1 (proof).

**v1 target — full conformance on six items, capability on the seventh.**

1. Every state change in the platform is preceded by a durable Event append with a valid `topicSeq`.
2. Every Continuation in the Supabase projection corresponds 1:1 to a `cop/continuation` Artifact in the Event log (no Continuation exists in the projection without a backing Artifact).
3. *(capability — v1)* The projector functions are pure (no time-based logic outside `createdAt` stamping, no external HTTP calls, no read of `Math.random()` or `Date.now()` in the projection path), and a `pnpm cogentia rebuild` script can drop the Supabase projection and rebuild it from the Event log to a working state. v1 does NOT require byte-identical parity with the previously-live projection.
4. No audit-plugin Agent has direct write access to Supabase. Plugins receive a read-only `COPReadOnlyStore` (COP §4.2) plus an Event-emission endpoint; no Supabase credentials are issued to plugin code.
5. The Commons frontend writes to Supabase only via Event emission. Each mutation is one Netlify Function call that, inside a single transaction, appends the Event and applies the pure projector. The frontend never holds Supabase write credentials.
6. The §5.6 anchor migration produces both an Event (`cogentia.anchor.migration.proposed`) and a `cop/continuation` Artifact; resolution likewise produces an Event (`cogentia.anchor.migration.resolved`).
7. The community manifest, plugin allow-list, and federation-link state are all derivable by replay (verified manually in v1 via the rebuild script).

**v1.1 target — promote item 3 from capability to proof.**

3*. *(proof — v1.1)* A CI job runs `pnpm cogentia rebuild --diff` on every PR: dump the live projection, run the rebuild against a clean target, diff the two (modulo timestamps and primary-key ordering), fail the build on any divergence. A periodic production job (weekly minimum) performs the same audit against the live database and emits an alert on drift.

Items 4 and 5 are the load-bearing ones in *both* v1 and v1.1: they encode the COP §5.6 separation table and the Rule 0 invariant at the same time. Items 1, 2, 6, 7 are mechanical consequences of taking items 4 and 5 seriously. Item 3's split between capability and proof is the deliberate staging: v1 ships a working rebuild path because that capability is what *makes* the Event log canonical; the differential audit is what *proves* nothing has drifted, and is worth deferring only because building it before item 3* has settled tends to encode the early bugs into the audit logic itself.

**What changes between v1 and v1.1 in practice.** Almost nothing on the platform surface. The v1.1 lift is a CI script, a weekly cron, and an alert wire-up. The discipline required by items 1, 4, 5 is what makes v1.1 cheap; the discipline is unavoidable in v1 regardless.

### 5.8 Change Narrative on every state-changing action

Every state-changing action in Cogentia Commons carries an **optional narrative block** in the emitting Event's payload. The narrative is the actor's chance to describe their change — why they did it, what conversational context informed it, where the reasoning trail leads — in a form that future versions of the platform (and the broader scholarly community) can read and build on. This is Rule 1 of `second_method.md` applied at the per-action granularity: "publish the process, not only the result."

#### 5.8.1 The narrative schema

**Coverage — every state-changing action.** Every `cogentia.*` Event listed in §5.7.4 accepts an optional `narrative` field. No state change in Commons is exempt from the opportunity to be narrated: kernel acceptance, objection submission, Burton conversion, revision proposal, revision commit, support, publication minting (and the §8.3 moderator approve/reject decisions), anchor migration resolution, sanction issuance, sanction lifting, appeal submission and disposition, manifest updates (including the retroactive variant), continuation forking and supersession, round opening and closure — all of these emit Events whose payload includes the `narrative` slot. The actor who issued the action is the one whose `narrative` it is; signed by their actor handle on the emitting Event.

**Inheritance via inseme COP.** This is consistent with inseme's existing `cop_event.meta` jsonb (see [`inseme/apps/platform/supabase/migrations/20251206_add_cop_core.sql`](https://github.com/JeanHuguesRobert/inseme/blob/main/apps/platform/supabase/migrations/20251206_add_cop_core.sql)). The `narrative` block lives inside the COP Event payload as a top-level field; it is read and indexed by the Commons projector but is otherwise treated as opaque by the underlying COP runtime.

The Event payload of any `cogentia.*` Event MAY include a top-level `narrative` field:

```json
{
  "narrative": {
    "short": "Switched the corsican yield estimate to ADEME ZNI baseline",
    "long": "The objection from @j-petit-1 named the ADEME ZNI report explicitly; on review the report's 2024 update gives 1280 kWh/kWp/yr versus our 1430 estimate. Reducing the basic-income figure proportionally...",
    "chat_urls": [
      "https://chat.openai.com/share/a1b2c3...",
      "https://claude.ai/share/x9y8z7..."
    ]
  }
}
```

- **`short`** (optional, ≤ 200 chars) — the change as a one-liner. Analogous to a git commit subject. Renders in feeds, history views, notifications.
- **`long`** (optional, free-form markdown) — extended description. Analogous to a git commit body. Renders in the full-action view.
- **`chat_urls`** (optional, array of strings) — URLs pointing to conversational-agent sessions that informed the action. Each MUST be a valid URL; the platform validates well-formedness but does NOT fetch the URLs at narrative-write time (privacy and rate-limit reasons).

The narrative is itself signed: it sits inside the Event payload, the Event carries the actor's `actor_handle`, and the Event is immutable per COP §2.6. A user's narrative is part of their permanent signed record alongside the action it annotates.

#### 5.8.2 Optionality

The narrative block is **never required** by the platform. The §1.1 permissive default applies: the Author/Objector/Editor/Moderator/Supporter who issues the action has the *opportunity* to describe it, not the obligation. The Commons UI surfaces the three fields whenever an action is being issued (the *Describe this change* surface); the user may submit with all three empty.

A community manifest MAY declare a default policy via a new optional field `narrative_policy: optional | encouraged | required-for-publications`. `optional` is the v1 default; `required-for-publications` makes the narrative block mandatory on `cogentia.publication.*` and `cogentia.kernel.accepted` Events specifically. Communities that want stronger Rule 1 adherence can opt in.

#### 5.8.3 Chat-URL semantics — anticipated post-v1 use

The `chat_urls` field has limited use in v1 (the URLs are stored and displayed; they're not fetched or processed). A later release MAY:

- **Cache the conversation content** behind the URL (subject to the conversational-agent platform's terms) so that the reasoning trail survives URL rot.
- **Extract structured data** from the conversation — quoted citations, named premises, intermediate reasoning steps — and surface them in the Document's audit view.
- **Cross-reference across documents** — multiple actions citing the same chat URL signal a shared reasoning thread worth exposing.

These are anticipated v0.2.0+ features; v1's job is to make the URLs *addressable and queryable*, so future processing has something to work with. Authors who suspect their conversations are valuable should include the URLs at the moment of action; retrofitting URLs later is permitted but loses the "captured at decision time" property.

A **`cogentia/chat-conversation`** Artifact type is reserved for a future "I cached this conversation" record; v1 does not emit such Artifacts.

#### 5.8.4 Privacy and Rule 0

The narrative block is the actor's own description of their own action. Posting it under their signed GitHub identity is their consent to its permanence. Chat URLs typically point to share-links the conversational-agent platform has already made public; the actor is responsible for not pasting URLs to sessions containing third-party PII or confidential information they don't have rights to publish. The platform does not check this — it is the actor's accountability under §1.1.

Rule 0 is unaffected: the narrative is a description of an already-decided action by an already-named human; no agent acquires any authority through it.

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
  required: [cogentia_plugin, version, falsifiable, converted_statement]
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

4. Burton handling — admit and flag, do NOT block (per §1.1)
   - if plugin output declares falsifiable=false OR reviewer flags it:
       the contribution is admitted to the record with a permanent
       `un-falsifiable` Mark (§4.5 rung 2) attributed to its author
   - in parallel, a `burton_conversion` Continuation is opened on the
     contribution with resumers = [original author, reviewer-role]
     and is NOT a prerequisite of the round closure
   - if and when the conversion produces a falsifiable form, it enters the
     record as a *converted_statement* contribution with a `responds_to`
     edge to the original; the `un-falsifiable` Mark on the original
     remains (the record never overwrites)
   - the round can close while un-falsifiable contributions sit in the
     record. Their authors carry the reputational cost (§4.5 rung 1
     informational tagging accumulates over a user's record), and other
     contributors are free to ignore, downvote-by-non-Support, or convert
     them later.

   This is the §1.1 design principle applied to Rule 2 (second_method.md):
   the doctrine requires that an objection be DISTINGUISHABLE from a feeling,
   not that feelings be silenced. Admit-and-flag distinguishes; it does
   not gate.

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

### 8.3 Initial Publication Authorization (community-elected gate)

An `initial` Publication is the moment a Document is elevated from "registered in the community" (its kernel exists, contributions can be made) to "part of the community's published catalogue" (it is citable as a `cogentia://` URI to outsiders). Because that elevation has community-visible consequences — the Document becomes part of what the community is *known for* — communities MAY require moderator authorization for `initial` Publications. This is a **community-elected gate** per §1.1's third carve-out category: it is not a universal v1 rule but a manifest-declared choice that survives the permissive default because the manifest declares it explicitly.

**Default behaviour.**

- If the community's manifest names at least one Moderator (per [`COMMUNITY.md`](cogentia_commons_community_manifest.md) §6.1 / §6.5), then `initial` Publications require approval from one of the listed `initial_publication_approvers` (defaults to the same set as `ban_issuers`).
- If the community's manifest names no Moderator, the gate is absent — `initial` Publications proceed without moderator review. This is the degenerate single-Author-Founder case acceptable in tiny / test communities.
- All other Publication types (`improved`, `premise_note`, `conclusion_note`, `refutation`, `synthesis`) proceed without this gate, regardless of moderator availability. The gate is specifically for the *entry of a Document into the catalogue*.

**Flow.**

1. Author selects *Publish* with `artifact_type: initial` (cf. Workflow #6). Commons checks the community manifest: are moderators declared? If no, proceed directly to mint. If yes, continue.
2. Commons emits `cogentia.publication.initial.requested`. A `cop/continuation` Artifact is created with `intent: publication_initial_review`, `agent: role:initial_publication_approver`, `meta.cogentia.eligibleResumers` listing the concrete moderator handles. The Continuation surfaces in each moderator's pending-work view.
3. A moderator claims the Continuation and reviews the Document at the requested commit SHA. The review is a substantive human action — moderators read the kernel, scan for off-topic / spam / out-of-scope content, optionally run the community's plugins to validate citations and consistency.
4. The moderator resolves the Continuation:
   - **Approve** → Commons emits `cogentia.publication.initial.approved`. The Publication minting proceeds automatically (the same Event chain as §8 step 3 onwards). A `cogentia/publication-review` Artifact records the approval (signed by the moderator).
   - **Reject** → Commons emits `cogentia.publication.initial.rejected` with a mandatory `reason` field. A `cogentia/publication-review` Artifact records the rejection. The Author may revise the Document (new commit, new kernel migration per §5.6) and re-request approval at the new commit. The rejected request remains in the immutable record.
5. Recursive accountability applies: a moderator who issues a frivolous rejection signs the rejection record; the Document's Author may submit a `cogentia.user.sanction.appealed`-style appeal targeting the rejection (treated as an appeal even though the rejection is not a sanction per §4.5 — same appeal protocol, declared in the community's manifest §6.3).

**Rule 0 anchoring.** The moderator's decision is a substantive resolution of a `cop/continuation` whose `agent` field resolves to a verified GitHub handle. Per §10, no agent has any role here. The moderator approves or rejects under their own signed identity, with the same recursive accountability that applies to rung-3 cooldowns and rung-4 bans.

**Why this specific gate.** Initial publication is the only moment in a Document's lifecycle where the platform makes a community-visible *categorical* claim ("this Document is part of our catalogue") rather than a contribution-level claim ("X said Y about Z"). Subsequent publications (`improved`, `refutation`, etc.) inherit that categorical claim — they extend it, qualify it, or refute their own prior claims, but they do not re-establish it. The single moderator gate at `initial` is therefore the smallest surface area that lets the community's permanent catalogue be governed deliberately, while leaving every other action subject to §1.1's permissive default.

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
| Submit Objection | Human Objector | GitHub identity + Supabase row. Marks (e.g. `un-falsifiable`) auto-applied per §4.5 rung 2. |
| Run audit plugin | Human invocation; agent produces output | AgentReview row stores invoker handle + raw output. |
| Propose Revision | Human Editor or Author (commit patch) | Commit hash + responds_to edges. |
| Request `initial` Publication | Author | `cogentia.publication.initial.requested` Event + `cop/continuation` for moderator review (§8.3). |
| Approve / Reject `initial` Publication | Named Moderator (community manifest §6.1) | `cogentia/publication-review` Artifact + Moderator's signed GitHub handle. |
| Publish (other artifact_types) | Author | Publication row + commit hash + canonical URI. |
| Support | Human Supporter | Supabase row + handle + justification. |
| Resolve anchor migration | Document Author only | `cogentia.anchor.migration.resolved` Event + commit_sha. |
| Issue rung-3 cooldown | Author (own Document) or Moderator (community-wide), per §4.5 + manifest §6.1 | `cogentia/sanction` Artifact + signed issuer handle. |
| Issue rung-4 ban | Named Moderator only | `cogentia/sanction` Artifact + signed Moderator handle. Recursive accountability applies. |
| Submit appeal on a sanction or initial-publication rejection | Anyone (including the target) | `cogentia/appeal` Artifact + appellant handle. |
| Open Continuation | Any role; carries `opened_by_github_handle` | Continuation row + commit_sha. |
| Resolve substantive Continuation | Human resumer only | Continuation row + `resolved_by_github_handle` + commit_sha. |
| Resolve structural Continuation | Plugin may self-close | AgentReview row + plugin signature; downstream substantive Continuation gates any onward propagation. |
| Time-triggered Continuation lapse | COP Scheduler (`agent: "scheduler"`) | The lapsing Event references the prior human-signed authorisation that the lapse is letting expire (§5.5). No new authority is acquired. |

Every row in the platform has a verified human GitHub handle in its causal chain — either as the direct author of the action, or *(post-v1, per §1.4)* as the **retrofitter** who attests to a historical or proxied source. v1 exercises only the direct-author form; the audit framing anticipates the retrofit form to avoid weakening the rule when retrofit lands. No agent has a write capability that bypasses this. This is verified at the data-access layer, not by convention.

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

## 12. Two surfaces — the existing CLI and the new Brique

Cogentia Commons already has an operational surface: the **`cogentia.js` CLI** in `cogentia/scripts/`. Its own docstring opens with *"cogentia.js — Cogentia Commons CLI. Infrastructure for traceable, auditable, AI-connectable distributed knowledge production across git repositories."* The script is publicly named in `second_method.md` Coda and ships 12 commands today (`add`, `remove`, `list`, `status`, `scan`, `init`, `ref`, `open`, `sync`, `graph`, `check`, `jekyll`). It manages the cross-repo registry and the `research/index.md` files that form the four-repo corpus's distributed knowledge graph.

The v1 work specified in this document **extends and complements** the existing CLI, it does not replace it.

### 12.0 Two surfaces, one Commons

| Surface | What it does | Where it ships |
|---|---|---|
| **`cogentia.js` CLI** | Existing 12 commands + new audit / kernel / objection / publish / continuation / sanction / manifest subcommands. Author / Reviewer / Editor / Moderator can drive the v1 workflows from a terminal. Zero npm dependencies; MIT; named in the doctrine. | `cogentia/scripts/cogentia.js` (already in production). |
| **`@inseme/brique-cogentia-commons`** | Web GUI complement. React + Vite + Tailwind, deployed as a brique inside the inseme platform. Provides the visual / interactive UX for the same operations. | `inseme/packages/brique-cogentia-commons/` (to be created). |

Both surfaces share the **same backing state**: the COP Event log + Supabase projection (§5.7.8). Any state change emitted by the CLI is visible to the brique on its next read; any state change emitted by the brique is visible to the CLI. The Continuation primitive (§5.5) means a round opened on the CLI can be resumed in the brique and vice versa — the COP `agent` field resolves to a GitHub handle, not to a surface.

This is consistent with the §1.1 design principle (permissive default, accountable record): the deterrent and the audit trail apply equally whether the action came through a CLI command or a UI click. The signed Event is what matters.

### 12.1 Why a brique (in addition to the CLI)

### 12.1 Why a brique

Inseme's documented architecture ([`docs/MODULAR_SYSTEM.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/docs/MODULAR_SYSTEM.md)) is "a modular ecosystem of Bricks orchestrated by a central protocol" — that protocol being COP. Cogentia Commons is already a declared `COP/HITL` profile consumer (§5.7); shipping it as a brique inside inseme means:

- **Reusing the COP Supabase tables** (`cop_topic`, `cop_task`, `cop_step`, `cop_event`, `cop_artifact`) that inseme already maintains. Commons-specific tables become projection tables that reference these.
- **Reusing the cop-host runtime** that compiles `brique.config.js` manifests into Netlify entry-points and a frontend registry.
- **Reusing Ophélia** as the AI mediator surface for Commons plugins, via the brique's `tools` array (OpenAI-compatible function schemas the AI invokes).
- **Reusing the existing brique pattern** — 12 briques already follow it (brique-actes, brique-wiki, brique-blog, brique-democracy, brique-map, etc.). Adding brique-cogentia-commons is an additive change.

The four-repo doctrinal corpus (`barons-Mariani`, `marenostrum`, `cogentia`, `FractaVolta`) provides the *what* and *why*; the inseme platform provides the *deployable substrate*. This connection is intentional — it brings the AI Safety anti-capture proposal into the concrete operational platform.

### 12.2 Package layout

```
inseme/packages/brique-cogentia-commons/
├── package.json              # @inseme/brique-cogentia-commons
├── brique.config.js          # the manifest (§12.3)
├── README.md
├── src/
│   ├── pages/                # React UI: kernel view, round runner, paste bridge
│   ├── lib/                  # api.js, hooks.js — Supabase + COP access
│   ├── edge/                 # Edge Function handlers exposing plugins as tools
│   └── functions/            # Netlify Functions: Event emission, projector, resolver
├── public/docs/              # readme, user-facing documentation
└── tests/                    # spec tests
```

Standard inseme brique dependencies: `@inseme/ui` (shared design system), `@inseme/cop-host` (runtime), `react`, `react-router-dom`, `@tanstack/react-query`, `@supabase/supabase-js`.

### 12.3 `brique.config.js` shape (sketch)

```javascript
export default {
  id: "cogentia-commons",
  name: "Cogentia Commons",
  feature: "cogentia_commons",
  routes: [
    { path: "/commons", component: "./src/pages/CommonsHome.jsx", protected: false },
    { path: "/commons/document/:documentId", component: "./src/pages/DocumentView.jsx", protected: false },
    { path: "/commons/document/:documentId/kernel", component: "./src/pages/KernelView.jsx", protected: false },
    { path: "/commons/document/:documentId/round/:taskId", component: "./src/pages/RoundRunner.jsx", protected: true },
    { path: "/commons/document/:documentId/publish", component: "./src/pages/PublishView.jsx", protected: true },
    { path: "/commons/objection/:objectionId", component: "./src/pages/ObjectionView.jsx", protected: false },
    { path: "/commons/community/:communityId", component: "./src/pages/CommunityView.jsx", protected: false },
    { path: "/commons/sanctions", component: "./src/pages/SanctionsView.jsx", protected: true },
  ],
  menuItems: [
    { id: "main-commons", label: "Commons", path: "/commons", icon: "BookOpenText", position: "header" },
  ],
  functions: {
    "emit-event":      { handler: "./src/functions/emit-event.js" },
    "resolver":        { handler: "./src/functions/resolver.js" },     // cogentia:// → GitHub + Supabase
    "rebuild":         { handler: "./src/functions/rebuild.js" },      // §5.7.9 conformance item 3
    "sanction-tick":   { handler: "./src/functions/sanction-tick.js", schedule: "*/15 * * * *" },
  },
  edgeFunctions: {
    "plugin-runner": { path: "/commons/api/plugin/*", handler: "./src/edge/plugin-runner.js" },
  },
  tools: [
    // Each plugin is exposed to Ophélia as a function-tool, per inseme convention
    { type: "function", function: { name: "kernel_extractor", description: "Extract Thesis/Premise/Claim from a Document.", parameters: {/* ... */} }, handler: "./src/edge/tool-kernel-extractor.js" },
    { type: "function", function: { name: "falsifiability_conversion", description: "Run Burton conversion on an Objection.", parameters: {/* ... */} }, handler: "./src/edge/tool-falsifiability-conversion.js" },
    { type: "function", function: { name: "citation_validator", description: "Validate citations in a target node.", parameters: {/* ... */} }, handler: "./src/edge/tool-citation-validator.js" },
    { type: "function", function: { name: "consistency_scanner", description: "Scan a Document's formal graph for cycles, undefined references, candidate contradictions.", parameters: {/* ... */} }, handler: "./src/edge/tool-consistency-scanner.js" },
    { type: "function", function: { name: "objection_summariser", description: "Cluster Objections on a target into a synthesis brief.", parameters: {/* ... */} }, handler: "./src/edge/tool-objection-summariser.js" },
    { type: "function", function: { name: "revision_proposer", description: "Draft a Revision patch addressing one or more Objections.", parameters: {/* ... */} }, handler: "./src/edge/tool-revision-proposer.js" },
  ],
  configSchema: {
    "cogentia_default_community_id": { type: "string", description: "Default community for new Documents registered without an explicit choice." },
    "cogentia_resolver_base_url":    { type: "string", description: "Base URL for the cogentia:// resolver (defaults to brique's own /commons/api/resolver)." },
  },
};
```

This is a sketch; the production manifest is committed in the brique's repository and validated by cop-host at startup.

### 12.4 Schema strategy — reuse cop_* tables, add commons_* projection tables

Inseme already provides:

```sql
public.cop_topic  -- (id, status, current_version, title, metadata jsonb, created_by, ...)
public.cop_task   -- (id, topic_id, type, status, ..., meta jsonb)
public.cop_step   -- (id, task_id, name, status, input jsonb, output jsonb)
public.cop_event  -- (id, topic_id, type, payload jsonb, meta jsonb, ...)
public.cop_artifact -- (id, topic_id, source_task_id, source_step_id, type, format, payload jsonb, metadata jsonb)
```

These are the canonical Event-log and Artifact substrate. Commons adds:

```sql
public.commons_document            -- projection of cogentia.document.opened / current state
public.commons_thesis              -- projection (anchor_id, statement, ...) -- payload mirrors cop_artifact.payload
public.commons_premise
public.commons_claim
public.commons_constraint
public.commons_objection           -- includes status, marks[]
public.commons_revision            -- includes marks[]
public.commons_agent_review        -- includes contract_class, status, marks[]
public.commons_support
public.commons_publication
public.commons_continuation        -- projection of cop_artifact rows where type='cop/continuation'
public.commons_sanction
public.commons_appeal
public.commons_publication_review
public.commons_community           -- registry of known communities (federation)
public.commons_user                -- per-community user with kind discriminator
public.commons_change_narrative    -- derived INDEX of the §5.8 narrative blocks across
                                   -- cop_event.payload.narrative, for full-text search and
                                   -- chat_url cross-referencing. NOT a primary entity — the
                                   -- canonical narrative lives in cop_event.payload, this
                                   -- table is a projection. May be omitted in v1 if FTS is
                                   -- handled via a Postgres tsvector on cop_event.payload
                                   -- directly.
```

Every `commons_*` table carries `metadata jsonb`. Most also carry a foreign key to the originating `cop_event.id` and (where appropriate) `cop_artifact.id` — keeping the projector's job mechanical (read Event log → upsert projection rows).

The Commons-specific migrations live alongside inseme's existing ones at `inseme/apps/platform/supabase/migrations/` (file name `YYYYMMDD_cogentia_commons.sql`), not in a separate database. Per-community isolation is logical (row-level `community_id` + RLS policies) rather than physical (separate Supabase project per community). This is a v1 simplification; v1.1 may move to per-community physical isolation per parent §1.2 item 7.

### 12.5 Where existing Commons artefacts go

The current cogentia repo scaffolding stays:

- `cogentia/research/` — all the spec documents (this one and its companions) remain in the cogentia meta-node repo.
- `cogentia/scripts/cogentia.js` — **the existing Cogentia Commons CLI.** Publicly named in `second_method.md` Coda; its docstring opens with *"cogentia.js — Cogentia Commons CLI"*. v1 extends this CLI with the new subcommands declared throughout the spec set (`manifest`, `audit`, `kernel`, `objection`, `publish`, `continuation`, `sanction`, `rebuild`). The CLI's existing 12 commands are part of the v1 deliverable already operational. Continues to be zero-deps, MIT.
- `cogentia/plugins/` — the directory hosting plugin manifests (`kernel_extractor/manifest.v0.1.0.yaml` etc.) and prompts (`prompt.v0.1.0.md`). Both the CLI and the brique read from here.
- `cogentia/apps/commons/` — the older Vite + React scaffolding. Stays as a research prototype / standalone deployment option. v1 ships the brique inside inseme; the prototype remains useful for offline experimentation and for reviewers who want to inspect the UI surface without an inseme deployment.

The doctrinal artefacts (specs + CLI + plugin manifests) and the platform deployment (brique) are deliberately split between the cogentia and inseme repositories. This is consistent with the four-repo corpus structure: each repo has one canonical home.

### 12.6 CLI / brique parity (v1 acceptance criterion)

For each v1-critical workflow (workflows §3 priority index — #1, #2, #3, #5, #6, #9), the v1 acceptance test (§11.1) MUST be reproducible from the CLI alone OR from the brique alone, using the same underlying Event log + Supabase projection. The brique is the more discoverable UX; the CLI is the more scriptable / audit-friendly UX. Either path produces the same canonical `cogentia://` URIs at the end.

Concretely, a CLI-only path through the acceptance test looks like:

```
cogentia.js add ../barons-Mariani                               # → workflow #9 precondition
cogentia.js init barons-Mariani                                 # → workflow #9
cogentia.js manifest --validate barons-Mariani/COMMUNITY.md     # → community manifest committed
cogentia.js kernel barons-Mariani/research/second_method.md     # → workflow #1
cogentia.js objection submit cogentia://barons-Mariani/<sha>/<premise>  # → workflow #2
cogentia.js audit cogentia://barons-Mariani/<sha>/<premise>             # → workflow #3
cogentia.js publish cogentia://barons-Mariani/<sha>/<doc> --type initial  # → workflow #6 + §8.3
```

Each command emits the same COP Events the brique's UI clicks would emit. The state at the end is byte-identical (modulo timestamps and user-handle differences). This parity is what makes the §5.7.7 separation of concerns operational: the CLI is also a *Human UI* per COP §5.6 — it emits Events, never mutates Supabase directly.

### 12.7 What this changes in the rest of the spec

Nothing structurally. The entity model, the Continuation contract, the audit-plugin architecture, the round mechanics, the §5.7 COP profile, the §5.8 change narrative — none of these change. What changes is the *hosting story*: Cogentia Commons is now explicitly two surfaces (CLI + brique) sharing one backing state, rather than a single web app to be built from scratch.

---

## 13. Risks Inherited from the Working Paper

The Working Paper §7 enumerates seven failure modes. The MVP responses are:

| Failure mode | MVP response |
|---|---|
| Epistemic populism (§7.1) | Support architecturally excluded from status queries. Codified at the data layer. |
| Gaming (§7.2) | Plugin contract_class distinction (substantive plugins always human-gated). For human-vs-human gaming, the §1.1 permissive default + §4.5 accountability ladder replace precondition filters: signed actions accumulate against the actor's record, reputational cost is borne by attribution, and persistent abuse escalates through informational tags → contribution Marks → cooldown → temporary ban. The deterrent is reversal cost, not entry filtering. |
| Plutocratic capture (§7.3) | No money flows in v1. Deferred along with Kudos. |
| Hallucination contamination (§7.4) | `citation_validator` plugin runs on every Thesis/Premise/Claim that contains references. AgentReview rows always carry the raw output for audit. |
| Privacy confusion (§7.5) | Per-community profile model; profile fields are opt-in; no Cogentigram surface in Commons v1. |
| Cultic closure (§7.6) | Federation URI scheme + `federation.json` exists in v1 so external-community objections are first-class once the second community arrives. |
| Over-modeling (§7.7) | Minimal contribution path = submit one Objection on one anchor. Everything else optional. |
| **DRSJ expulsion from host community** | Distinct from §7.6 cultic closure: the *internal* mode is convergence on shared axioms; the DRSJ mode is *external* — the host community expels the platform before it crosses irreversibility. Mitigation: rollout posture under mimetic desynchronization (§11.3). The MVP surface itself is the mitigation; this is not a feature added against the failure mode but the design principle that shaped the in-scope/out-of-scope list of §1. |

---

## 14. Open Questions

1. **Live federation protocol.** Push vs pull, subscription semantics, conflict policy when a referenced community alters a node. Specified only as URI + manual link in v1.
2. **Plugin marketplace and signing chain.** Trivial for the v1 baseline (six plugins, one author). Non-trivial as soon as third-party plugins arrive.
3. **Personhood attestation for high-stakes editorial actions.** Refers to the DHITL Rule 0 research problem; cannot be solved at the Commons layer alone.
4. **Snapshot-vs-streaming sync** between Supabase and GitHub. v1 does snapshot at commit boundaries (resolved at the per-commit level by §5.6, but the question of finer-grained streaming for in-flight edits remains).
5. **Internationalisation.** The doctrine is bilingual. v1 is EN-only on the platform surface. FR support is a v1.1 item.
6. **Measuring proximity to the irreversibility threshold.** §11.3 names the threshold; it does not specify how to detect that the platform is near it inside a given host community. Candidate indicators (number of unprompted Thesis Kernels per active researcher, ratio of accepted Objections from external GitHub identities, retention across two academic terms) need empirical calibration before any of them can drive a decision to lift a desynchronization measure (e.g. enable a public landing page). Until then, the conservative default is to leave each measure in place.

*Resolved since v0.3:* Editor eligibility (now §4.4); re-anchor / formal-vs-literate conflict semantics (now §5.6); `kernel_extractor` sub-specification (now [`cogentia_commons_kernel_extractor.md`](cogentia_commons_kernel_extractor.md)).

---

## 15. Relationship to Existing Artifacts

This spec is a refinement of, and is bound by:

- [`Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md) §4–§5 (entity model), §6 (recursive first use case), §7 (failure modes).
- [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) — the five rules. Rule 0 and Rule 2 are load-bearing on every section here.
- [`DHITL.md`](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md) — Cogentia Commons is Layer 4. By design, no Layer 3 capability lives here.
- [`Cogentia-and-Cogentigram.md`](Cogentia-and-Cogentigram.md) — Personal Cogentia is the individual analogue; the paste-bridge UX is shared.
- [`inseme/packages/cop-core/Architecture.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) — COP (Cognitive Orchestration Protocol). Commons is a COP/HITL profile consumer. The Continuation primitive (§1.8, §2.7, §5.5) is inherited verbatim.
- [`inseme/docs/MODULAR_SYSTEM.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/docs/MODULAR_SYSTEM.md) — the brique pattern. Commons ships as `@inseme/brique-cogentia-commons` (§12).
- [`inseme/packages/cop-host/BRIQUE_SPEC.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-host/BRIQUE_SPEC.md) — the `brique.config.js` contract Commons's manifest implements (§12.3).
- [`inseme/apps/platform/supabase/migrations/20251206_add_cop_core.sql`](https://github.com/JeanHuguesRobert/inseme/blob/main/apps/platform/supabase/migrations/20251206_add_cop_core.sql) — the `cop_topic` / `cop_task` / `cop_step` / `cop_event` / `cop_artifact` tables Commons projects onto (§12.4).
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


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Cogentia](../COGENTIA.md)
- [Corpus Status — cogentia](corpus-status.md)
- [Research Index — Cogentia](index.md)
- [Cogentia Commons — COMMUNITY.md Sub-Specification](cogentia_commons_community_manifest.md)
- [Cogentia Commons — Session Continuation Snapshot](cogentia_commons_continuation.md)
- [Cogentia Commons — `kernel_extractor` Plugin Sub-Specification](cogentia_commons_kernel_extractor.md)
- [Cogentia Commons — Substantive Plugin Sub-Specifications](cogentia_commons_substantive_plugins.md)
- [Cogentia Commons — Workflows](cogentia_commons_workflows.md)
- [Cogentia and Cogentigrams](Cogentia-and-Cogentigram.md)
- [Cogentia Commons — Structural Plugin Sub-Specifications](cogentia_commons_structural_plugins.md)
- [Cogentia Commons: A Platform Architecture for Collaborative Possibility Exploration Under Scientific Constraint](Cogentia_Commons_Working_Paper.md)

<!-- END_AUTO: backlinks -->
