---
title: "Cogentia Commons — Session Continuation Snapshot"
description: "Handoff document for continuing the Cogentia Commons MVP specification work in another conversation. Designed to be readable by any AI agent or human picking up where we left off."
layout: default
nav_order: 11
version: "snapshot-2026-05-13"
last_modified_at: 2026-05-13
author: "Jean Hugues Noël Robert, baron Mariani (with AI co-drafting)"
affiliation: "Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
status: "working-paper"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_commons_continuation.md
last_stamped_at: 2026-05-16
---

# Cogentia Commons — Session Continuation Snapshot

*This document is itself a COP-style Continuation (cf. [`cop-core/Architecture.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) §1.8) applied recursively to the design-conversation that produced the Cogentia Commons MVP specification set. It encodes (a) where to resume, (b) the state needed to resume, (c) the conditions under which resumption is appropriate. Hand it to the next agent.*

---

## 0. How to use this document

If you are a human (or AI agent) being asked to continue Cogentia Commons design work:

1. **Read this document end-to-end first.** It is ~600 lines; budget 15–20 minutes.
2. **Then read the parent spec** [`cogentia_commons_mvp_spec.md`](cogentia_commons_mvp_spec.md) (~1100 lines). It is the canonical contract.
3. **Skim the five companion sub-specs** in the order listed under §3 below.
4. **Pull the four key memory files** listed under §10. They contain the user's expressed preferences and architectural principles that may not be visible from the specs alone.
5. **Read the user-profile memory** [`MEMORY.md`](file:///C:/Users/admin/.claude/projects/C--tweesic/memory/MEMORY.md) — it points to all the rest.

The user's style is terse, elliptical, bilingual (FR/EN). Expect short directives that assume you've absorbed the context. Push back with concrete options when ambiguous; don't over-question.

---

## 1. What this project is — one paragraph

Cogentia Commons is a public-by-default infrastructure for collaborative epistemic exploration — a platform where AI agents help humans surface, contest, and refine ideas under explicit scientific constraints, with every action signed, attributable, and reversible. It is **Layer 4 (Cognitive Infrastructure)** of the [DHITL framework](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md) — open to agents, never sovereign. It operationalizes the [*Discours de la seconde méthode*](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md). The first Document it will host is `second_method.md` itself.

**Cogentia Commons already exists as a CLI.** [`cogentia/scripts/cogentia.js`](../scripts/cogentia.js) — publicly named in `second_method.md` Coda — declares itself in its own docstring as *"cogentia.js — Cogentia Commons CLI. Infrastructure for traceable, auditable, AI-connectable distributed knowledge production across git repositories."* The CLI is operational today with 12 commands (§14) managing registered repositories' `research/index.md` files. The v1 work specified in the parent spec **extends** this CLI (new subcommands for manifest validation, audit-plugin runs, kernel extraction, round mechanics, sanction tooling) and **complements** it with a web GUI shipped as `@inseme/brique-cogentia-commons` (§12). CLI and brique are two surfaces of the same Commons, sharing the same backing state (COP Event log + Supabase projection).

---

## 2. The broader corpus the user is building

| Repo | Role |
|---|---|
| `barons-Mariani` | Methodological doctrine. Hosts [`research/second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) (the five rules), [`mimetic_desynchronization.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/mimetic_desynchronization.md) (DRSJ + indirect action), [`invidia.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/invidia.md), [`toy_story.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/toy_story.md). |
| `marenostrum` | Energy commons + DHITL load-bearing axiom + CXU spec + Constellia (ICOME'26). |
| `cogentia` | **Meta-node** — methodology + `scripts/cogentia.js` CLI + the Cogentia Commons specification set lives in `research/`. |
| `FractaVolta` | Physical infrastructure layer (PGN, traceable_governance). |
| **`inseme`** | The deployable platform. 12 existing briques. COP runtime in `packages/cop-core` + `packages/cop-host`. Commons targets this as `brique-cogentia-commons`. |
| `Kudos` | The book on Kudos as Mauss-style gift economy. Anchors the deferred reward primitive (Support in v1, Kudos post-v1). |

The four canonical research repos (`barons-Mariani`, `marenostrum`, `cogentia`, `FractaVolta`) form a distributed knowledge graph via cross-referenced `research/index.md` files. `cogentia/scripts/cogentia.js` is publicly named in `second_method.md` Coda — its surface stability matters (treat changes there conservatively).

---

## 3. The Cogentia Commons spec set — six documents

All live in `cogentia/research/` and are catalogued in `cogentia/research/index.md`. Current versions:

| # | Document | Version | What it specifies |
|---|---|---|---|
| 1 | [`cogentia_commons_mvp_spec.md`](cogentia_commons_mvp_spec.md) | **v0.10.1** | Parent spec. 16 sections covering scope, design principle, document model, actors, communities, formal graph (entities + COP profile + change narrative + anchor lifecycle), audit-plugin architecture, round mechanics, publication, support, Rule 0 audit, MVP target, **brique deployment**, risks, open questions. |
| 2 | [`cogentia_commons_community_manifest.md`](cogentia_commons_community_manifest.md) | **v0.2** | `COMMUNITY.md` file format + amendment semantics (*lex prospicit, non respicit*) + `cogentia.js manifest --validate` contract. Worked example for `barons-Mariani`. |
| 3 | [`cogentia_commons_kernel_extractor.md`](cogentia_commons_kernel_extractor.md) | v0.1 | The bootstrap plugin: prose Document → Thesis/Premise/Claim/Constraint formal graph. Anchor ID generation strategy, genre disambiguation, full prompt template. |
| 4 | [`cogentia_commons_structural_plugins.md`](cogentia_commons_structural_plugins.md) | v0.1 | `citation_validator` (deterministic), `consistency_scanner` (hybrid), `objection_summariser` (LLM). All auto-apply to AgentReview but never to underlying nodes. |
| 5 | [`cogentia_commons_substantive_plugins.md`](cogentia_commons_substantive_plugins.md) | v0.1 | `falsifiability_conversion` (Burton), `revision_proposer`. Always human-gated. Full prompt templates. |
| 6 | [`cogentia_commons_workflows.md`](cogentia_commons_workflows.md) | v0.1 | 11 end-to-end user journeys (Document registration → Publication, Sanction issuance & appeal, Cross-community citation, Community founding, Manifest amendment, Retrofit sketch). Prioritised for v1 velocity. |
| — | [`cogentia_commons_continuation.md`](cogentia_commons_continuation.md) | this | This handoff document. |
| — | [`Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md) | published 2026 | The *what & why* paper. Was published earlier — predates this spec set. Cited throughout. |

---

## 4. Architectural decisions made — read these before changing anything

The numbered list below is the load-bearing set. Each represents a deliberate choice the user signed off on (or actively introduced). Don't reverse without explicit reason.

### 4.1 Foundational
1. **DHITL Layer 4 anchor.** Cogentia Commons sits at the cognitive-infrastructure layer. Agents may participate. Agents NEVER hold sovereign authority. Rule 0 of `second_method.md`.
2. **First object explored is itself.** v1 acceptance test runs the platform on `second_method.md`. The recursive commitment is doctrinal, not rhetorical.
3. **GitHub is the process anchor.** Identity = GitHub account. Canonical timestamp = commit SHA. Commit chronology = veneer-adoption mitigation.
4. **Per-community Supabase, federated.** Per parent §4. Cross-community references via `cogentia://` URI scheme. No live federation protocol in v1.

### 4.2 The dual representation
5. **Every Document has two forms.** *Literate* (markdown in git, owned by Author). *Formal* (graph in Supabase, derived). The literate wins on text, the formal wins on edge structure.
6. **No silent re-anchoring.** §5.6 specifies five anchor-change cases (Unchanged / Edited / Removed / Split / Merged), per-entity migration rules, provisional commit semantics. Anchor IDs are locked after Author acceptance and become permanent components of `cogentia://` URIs.

### 4.3 Orchestration substrate
7. **Commons is a COP/HITL profile consumer.** Reuses COP primitives verbatim: Event, Topic, Task, Step, Artifact, Continuation. Spec §5.7 declares this formally.
8. **Continuations on every artefact.** Not a separate todo system. Multi-directional via *N parallel Continuations on the same node*, not multi-resumer-per-Continuation. `meta.cogentia.eligibleResumers` is advisory per §1.1, not a hard filter.
9. **Source-of-truth reconciliation.** COP Event log = canonical. Supabase projection = derived. GitHub = literate text only. Rebuild-from-events MUST work (§5.7.9 item 3, v1 capability / v1.1 proof).

### 4.4 The §1.1 design principle (load-bearing)
10. **Permissive action, accountable record.** *Any modification is almost always authorized, because it is reversible, traced, and attributable.* §1.1.
11. **Three carve-outs only.** Precondition gates survive ONLY when they encode (i) a doctrinal invariant (Rule 0), (ii) a structural anti-loop (e.g. §4.4 Editor independence), or (iii) a community-elected gate declared in the manifest (e.g. §8.3 initial-publication moderator approval).
12. **Four-rung accountability ladder.** Informational tag → Contribution Mark → Cooldown (≤ 30d) → Temporary ban (≤ 90d). No permanent exclusion. All sanctions reversible by time-triggered Continuation (`agent: "scheduler"`).
13. **Recursive accountability.** A moderator who issues a frivolous sanction signs the record permanently. Their issuance is part of their own reputation.

### 4.5 Reward
14. **Support primitive only in v1.** Non-fungible recognition signal, decoupled from status computation at the data layer. Mandatory justification.
15. **Kudos deferred.** Monetary primitive comes post-v1, must preserve the five Mauss-anchored properties (non-fungibility, mémoire sociale, abondance, création décentralisée, non-accumulation).

### 4.6 Identity
16. **GitHub-anchored, with `kind` discriminator from v1.** v1 has `kind: github` only. Future kinds (`historical`, `proxy`) are reserved in the schema for the post-v1 retrofit/revendication direction (parent §1.4).
17. **Polymorphic `actor_handle` in Event payloads.** v1 emits only github handles; field shape doesn't bake "github" into its name on Events that may accept other actor kinds later.

### 4.7 The audit-plugin architecture
18. **Six v1 baseline plugins.** `kernel_extractor`, `falsifiability_conversion`, `revision_proposer` (substantive); `citation_validator`, `consistency_scanner`, `objection_summariser` (structural).
19. **Paste-bridge UX for substantive plugins.** Pattern reused from `cogentia/apps/personal/src/pages/Submit.jsx`. The COP `agent` for a substantive Continuation is the *human's* GitHub handle, NOT the LLM. The LLM is a tool the human invokes.
20. **Burton conversion = admit-and-flag, NOT block.** Un-falsifiable Objections enter the record with a `un-falsifiable` Mark. The round can close around them. Rule 2 is satisfied — objections are *distinguishable* from feelings, not silenced.

### 4.8 §5.8 Change Narrative (added 2026-05-13)
21. **Every state-changing Event accepts an optional `narrative` block.** `{short, long, chat_urls}`. Signed by the actor, immutable, part of their permanent record.
22. **Chat URLs are reasoning-trail evidence.** v1 stores and displays. Post-v1 may cache content, extract structured data, cross-reference. The URLs being addressable in v1 is what makes future processing possible.
23. **`narrative_policy` is a per-community manifest field.** Default `optional`. Communities may opt up to `encouraged` or `required-for-publications`. Forward-only amendable.

### 4.9 Deployment as a brique (added 2026-05-13)
24. **Commons ships as `@inseme/brique-cogentia-commons`.** Peer of brique-actes, brique-wiki, etc. Reuses inseme's `cop_*` Supabase tables, cop-host runtime, Ophélia AI mediator. Per parent §12.
25. **Metadata everywhere.** Every entity in §5.1 carries `metadata jsonb`. Mirrors inseme's existing COP convention (cop_topic.metadata, cop_event.meta, cop_artifact.metadata, …).
26. **Schema layering.** Reuse `cop_*` tables (Event log substrate). Add `commons_*` projection tables. Per-community isolation is logical (RLS + `community_id`) in v1; physical separation is a v1.1 concern.
27. **`cogentia/apps/commons/` becomes a research prototype.** The brique is the v1 ship target. The standalone scaffolding stays for offline/test use.

### 4.10 The §11.3 rollout posture
28. **Mimetic desynchronization is the deliberate design principle.** The v1 surface is small *because* small reduces DRSJ-cycle activation in the host community. Six mechanisms (delayed visibility, interpretive buffering, semantic minimization, non-ostentation, reversibility, institutional pre-legitimation) each map onto specific v1 design choices.
29. **ICOME'26 at Université de Corse is the institutional pre-legitimation anchor.** v1 rolls out alongside the conference, not before, not against.

---

## 5. The v1 acceptance test (parent §11.1, never lose sight of this)

A visitor with only a browser must be able to reproduce, from URLs alone:

1. Navigate to Commons. Find `second_method.md` as a registered Document in `barons-Mariani` community.
2. View its formal graph: Thesis + Premises + Claims with anchor IDs matching the literate form.
3. See at least one accepted Objection that went through Burton conversion (falsifiable form visible).
4. See at least one Revision proposed in response, with commit hash resolving to a real GitHub commit on `barons-Mariani`.
5. See at least one Support attached to an Objection or Revision.
6. See the Publication record with a stable `cogentia://barons-Mariani/<sha>/<node>` URI.
7. All seven steps verifiable from URLs alone — no platform login required to audit.

Mapped to workflows: #1 (Document registration) + #2 (Objection + Burton) + #4 (Editor synthesis OR Author self-synthesis via #3) + #5 (anchor migration if any) + #6 (Publication mint) + #9 (community founding). v1-critical set per workflows §3.

---

## 6. Open items, in priority order

### 6.1 Spec-level open items (carried forward)

| # | Item | Where | Status |
|---|---|---|---|
| 1 | Live federation protocol | parent §14.1 | open; URI scheme + manual `federation.json` suffices for v1 |
| 2 | Plugin marketplace + signing chain | parent §14.2 | open; trivial for v1 baseline |
| 3 | Personhood attestation for high-stakes editorial actions | parent §14.3 | depends on DHITL Rule 0 research problem; cannot solve at Commons layer alone |
| 4 | Snapshot vs streaming sync | parent §14.4 | resolved at per-commit by §5.6; finer-grained streaming deferred |
| 5 | Internationalisation (FR support) | parent §14.5 | v1 EN-only; v1.1 item |
| 6 | Measuring proximity to irreversibility threshold | parent §14.6 | open; conservative default = keep all §11.3 measures in place |
| 7 | Multi-owner manifest stewardship | COMMUNITY.md §10.1 | open; v1 has single Founder owner |
| 8 | Cross-community policy conflicts on federation links | COMMUNITY.md §10.3 | v1 answer: home-community-of-target wins; v1.1 may revisit |
| 9 | YAML parser dependency for `cogentia.js manifest --validate` | COMMUNITY.md §10.4 | conflicts with zero-dependency commitment; defer |
| 10 | Acceptable Use Statement as separate file | COMMUNITY.md §10.5 | inside-the-manifest in v1; sibling file is a v1.1 candidate |

### 6.2 Surfaced this session

| # | Item | Where |
|---|---|---|
| 11 | Decision: keep narrative in `cop_event.payload` (top-level field) vs move to `meta` jsonb | parent §5.8.1 + §5.8 |
| 12 | Decide whether to extract Acceptable Use Statement to a sibling file | COMMUNITY.md §10.5 |
| 13 | Decide whether `narrative_policy: required-for-publications` should be the v1 default for the `barons-Mariani` community specifically | COMMUNITY.md §6.6 worked example currently has `encouraged` |
| 14 | First brique skeleton — `inseme/packages/brique-cogentia-commons/{package.json, brique.config.js, README.md, src/}` | not yet written; user expressed interest in starting this |
| 15 | Concrete DDL for `commons_*` projection tables, derived from parent §5.1 + §12.4 | not yet written |
| 16 | Initial migration file at `inseme/apps/platform/supabase/migrations/YYYYMMDD_cogentia_commons.sql` | not yet written |

### 6.3 Decisions deliberately deferred

- **Multi-Document rounds** (one Round acting on nodes in several Documents) — workflows §B.5.
- **GitHub webhook for anchor migration sync** — workflows §B.1; v1 uses manual *Sync from GitHub* button.
- **PR-vs-direct-push flow for Editor-initiated Revisions** — workflows §B.2; default UX should be "open PR + Author merges."
- **Notification UX** — workflows §B.7; v1 surface is in-app banner; email digest / webhook is v1.1.
- **Retrofit Event types** (`cogentia.actor.claim.*`, `cogentia/retrofit`) — explicitly deferred per parent §1.4; v1 schema reserves the User.kind discriminator and the polymorphic actor_handle column shape.

---

## 7. The conversation arc — what was done in what order

The session started fresh with the user asking for a specification for Cogentia Commons. The arc:

1. **v0.1 — Initial draft of the MVP spec.** Six core sections established: dual representation, communities, actors, formal graph, audit plugin architecture, publication. Cataloged in `research/index.md` as *In Progress*.
2. **v0.2 — Continuation primitive woven in.** The user reminded me that COP defines Continuations as a first-class primitive in `inseme/packages/cop-core`. I had missed this. Saved as feedback memory: "check COP before inventing orchestration primitives." Continuations became §5.5; entity model updated.
3. **v0.3 — Mimetic desynchronization (§11.3) + DRSJ risk row added.** After the user asked where mimetic_desynchronization was defined.
4. **v0.4 — Audit pass resolving Editor eligibility (§4.4) + Anchor lifecycle (§5.6).** Re-anchor semantics were a load-bearing open question; now have concrete five-case migration protocol.
5. **v0.5 — COP/Commons profile conformance (§5.7) added.** Concept mapping, declared Event types, Artifact types, Continuation payload extensions, separation of concerns, source-of-truth reconciliation.
6. **v0.6 — Staged conformance checklist (§5.7.9).** v1 ships capability; v1.1 promotes capability to proof (drop-and-rebuild differential audit).
7. **v0.7 — Permissive action, accountable record (§1.1) introduced.** The big design-principle shift. §4.4 contribution floor dropped; §7 Burton becomes admit-and-flag; §5.7.6 eligibleResumers becomes advisory; new §4.5 four-rung accountability ladder with temporary-ban primitive.
8. **v0.8 — Retrofit / proxied actors (§1.4) reserved in v1 schema.** Schema discriminator (User.kind) and polymorphic actor_handle added. Full retrofit/revendication protocol deferred to v1.2+ with the design sketch on record.
9. **Five plugin sub-specs drafted.** kernel_extractor (its own sub-spec because most ambitious); structural plugins (citation_validator, consistency_scanner, objection_summariser) and substantive plugins (falsifiability_conversion, revision_proposer) bundled into two sub-specs grouped by contract_class.
10. **Workflows sub-spec drafted.** 11 end-to-end user journeys with priority tags (v1-critical / v1-if-velocity / v1.1+ / deferred-by-design). Acceptance-test mapping at §A.
11. **v0.9 — Audit pass resolving 12 bugs + 1 gap + 3 cosmetic + the user's initial-publication moderator-gate constraint (§8.3).** Moderator role added to §3. Mark capitalisation normalised. Stale references cleaned.
12. **v0.10 — Inseme brique pivot.** Explored inseme; found 12 existing briques, full COP Supabase schema (`cop_*` tables with metadata jsonb everywhere), the `brique.config.js` contract. Recast §12 from "Reference Implementation Sketch" to "Deployment as an Inseme Brique." Added §5.8 change narrative (the user's specific feature request). Added `metadata jsonb` to every entity. Added Sanction, Appeal, PublicationReview entities. COMMUNITY.md §6.6 narrative_policy.
13. **v0.10.1 — Final audit pass (this turn).** Three small fixes: `sanction_expiry` Continuation intent, `cogentia.publication.rejection.appealed` Event, `commons_change_narrative` clarified as derived index.

The user explicitly requested at v0.10.1: "let's audit first and let's establish a 'continuation' snapshot to continue this work in another conversation, maybe with a different AI agent."

---

## 8. Style notes — how this user works

These are inferred from observation across the session. Treat as guidelines, not rules.

- **Terse and elliptical.** A reply like "go" or "draft" or "explain" expects you to know which thing they mean from immediate context.
- **Bilingual FR/EN.** Doctrine has FR préambule and EN body. Code/spec are EN. Comments OK in either.
- **Pushback is information, not rejection.** When they say "no, that's not it" or "I prefer X," it's design-shaping input. Don't be defensive; capture and apply.
- **Skin in the game = individual action, not governance.** Don't conflate with second_method.md's rejection of skin-in-the-game as a *political* boundary. The user is precise about this distinction; you should be too.
- **Permissive default reflexively.** When in doubt, prefer reversibility + traceability + attribution over pre-hoc gates. The §1.1 design principle is the user's stable preference, not a one-time choice.
- **Metadata everywhere.** "Prefer to use metadata more than less, for flexibility, make sure every entity (or most of them) have a metadata field." Stated explicitly on 2026-05-13. The inseme COP schema already follows this.
- **Brique-ify by default.** When a thing could live as an inseme brique, it should. The platform-vs-app trade-off has been resolved in favour of the platform.
- **Cogentia.js doctrinal status.** The CLI is publicly named in second_method.md. Surface stability (help text, command names) is part of a published commitment. Be conservative with changes.
- **Four-repo network symmetry.** Cross-repo `research/index.md` Published/Referenced edges must agree. If you edit one, check the other side.
- **First commit establishes priority.** Anti-veneer. Commit chronology is the veneer-adoption mitigation. Don't retro-fit a "version 1.0" after the fact; ship snapshots with their commit chains visible.
- **Explicit faith commitments.** DHITL names "the democratic faith — a Lakatosian hard core." Naming the commitment is part of what makes it robust. Don't hide foundational assumptions; surface them.

---

## 9. The user's profile (terse summary, with full version in memory)

Jean Hugues Noël Robert, baron Mariani. Based at Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica. GitHub: JeanHuguesRobert. Email: jeanhuguesrobert@gmail.com (also jhr@baronsmariani.org). Founded C.O.R.S.I.C.A. in 1995 — predates "open source" as a term. Author of *Discours de la seconde méthode* (`barons-Mariani/research/second_method.md`, v1.0 2026-05-08). Architect of the six-repo Cogentia corpus and the #PERTITELLU / inseme civic-tech agenda.

Works on **Windows + PowerShell**. Uses **pnpm**, not npm. Prefers **monorepo over multi-repo** when avoidable. Reads and writes both French and English; published doctrine is bilingual.

---

## 10. Memory pointers — files in `C:\Users\admin\.claude\projects\C--tweesic\memory\`

Index: `MEMORY.md`. Specific files:

| File | What it captures |
|---|---|
| `user_profile.md` | jhrobert identity + style + tooling preferences |
| `cogentia_corpus.md` | Four-repo network structure |
| `system_purpose.md` | Corpus is fundamentally an AI Safety anti-capture proposal; DHITL is the load-bearing axiom held as a faith commitment |
| `cogentia_js_doctrine.md` | The CLI is publicly named in doctrine; surface stability matters |
| `network_symmetry.md` | Cross-repo Published/Referenced edges must agree |
| `cogentia_commons_mvp_architecture.md` | GitHub-anchored + per-community Supabase, dual representation, Support primitive |
| `cop_continuations.md` | COP primitives Commons inherits |
| `check_cop_before_inventing.md` | **Feedback rule** — before any orchestration primitive, search cop-core first |
| `cogentia_retrofit_and_proxied_actors.md` | Post-v1 direction, v1 schema constraints |
| `inseme_brique_pattern.md` | Inseme is the deployable platform; Commons targets it as a brique; 12 briques exist; COP tables already in place |

Load all ten before starting substantive work in a new session.

---

## 11. What to do next

In priority order, the natural next steps:

### 11.1 Start the brique skeleton (recommended)

Begin drafting `inseme/packages/brique-cogentia-commons/` per parent §12.2. Minimum scaffold:

- `package.json` — `@inseme/brique-cogentia-commons` with workspace deps on `@inseme/ui`, `@inseme/cop-host`.
- `brique.config.js` — promote parent §12.3 sketch to production manifest. Validate by running cop-host's brique compiler.
- `README.md` — short, follows brique-actes pattern.
- `src/pages/CommonsHome.jsx` — minimal landing.
- `src/lib/api.js` — Supabase client + Event emission helper.
- `src/edge/tool-kernel-extractor.js` — stub that returns the prompt rendered against inputs.
- `src/functions/emit-event.js` — Netlify Function that appends to cop_event with the projector applied in the same transaction.

This is the *make-it-real* step. After it, the spec becomes testable against running code.

### 11.2 Draft the Supabase migration

Single file: `inseme/apps/platform/supabase/migrations/YYYYMMDD_cogentia_commons.sql`. Derive from parent §5.1 + §12.4. Every `commons_*` table includes `metadata jsonb` and `community_id` (RLS-enforced). Project from cop_* — most rows have an FK to `cop_event.id` or `cop_artifact.id`.

Reference template: look at how `brique-actes` extends the schema (if it has migrations). The 20251231 mandats migration in inseme is also a useful pattern.

### 11.3 Final audit pass on v0.10.1

The audit pass that produced v0.10.1 was light (three small findings). A heavier pass — including reading the COMMUNITY.md and the plugin sub-specs cover-to-cover with the v0.10 changes in mind — would catch any residual inconsistencies I introduced when adding the brique section and the metadata-everywhere change. Not blocking, but recommended before code generation.

### 11.4 Decide the open items in §6.2

The four substantive items surfaced this session (#11–#14) deserve a pass before broader work. Of these, #14 (start the brique skeleton) and #15 (concrete DDL) are the unblocking ones for code-generation.

### 11.5 Connect back to ICOME'26

The Working Paper §10.5 names ICOME'26 (Université de Corse, June 2026) as the institutional pre-legitimation anchor. The v1 demo against `second_method.md` should ideally be ready for that. Concrete deadline: probably April 2026 for soft launch, May for the ICOME submission alignment. Worth tracking.

---

## 12. Glossary — terms a fresh reader will encounter

| Term | Meaning |
|---|---|
| **Brique** | French for "brick." Modular package in the inseme platform pattern (`inseme/packages/brique-*`). Each ships as `@inseme/brique-X` with a `brique.config.js` manifest that cop-host compiles. |
| **COP** | Cognitive Orchestration Protocol. Specified in `inseme/packages/cop-core/Architecture.md`. Six primitives: Event, Topic, Task, Step, Artifact, Continuation. |
| **COP/HITL** | Human-in-the-Loop COP profile. Commons is a declared consumer. |
| **Continuation** | A COP `cop/continuation` Artifact — suspended reasoning state with a named resumer and resumption conditions. Commons attaches them to any artefact for the "what's next" property. |
| **DHITL** | Democratic Humans in the Loop. The load-bearing AI Safety axiom in `marenostrum/DHITL.md`. Five-layer architecture; Commons sits at Layer 4. |
| **DRSJ** | Denial → Reattribution → Suspicion → Justification. The four-stage cycle of interpretive stabilisation, named in `barons-Mariani/mimetic_desynchronization.md`. Resistance mechanism the v1 rollout posture (§11.3) is designed to delay. |
| **Burton conversion** | Robert Burton's *On Being Certain* (2008) showed certainty is a brain state. Rule 2 of second_method requires objections be distinguishable from feelings — converted into falsifiable claims. The `falsifiability_conversion` plugin operationalises this. |
| **Kudocracy** | The complementary-currency concept from `Kudos/concept.md` — Mauss gift-economy semantics. Deferred reward primitive. |
| **Mark** | A typed primitive in §4.5 rung 2 — `un-falsifiable`, `out-of-eligibility`, `withdrawn`, `new_editor`. Attaches to contributions, not users. |
| **Mimetic desynchronization** | Deliberate decoupling of perception / interpretation / reaction to prevent DRSJ from completing before structural change reaches its irreversibility threshold. Six mechanisms documented. |
| **Ophélia** | The inseme platform's AI mediator (the "neutral mirror"). Briques expose tools to her via the `tools` array in `brique.config.js`. |
| **Permissive default** | §1.1 design principle. Any modification is almost always authorized because reversible + traced + attributable. Three named carve-outs. |
| **PERTITELLU** | The Corsican civic-tech movement the user founded. inseme is its technical infrastructure. |
| **Skin in the game** | Used precisely. Rejected as a *governance* boundary in second_method (would exclude the stateless, the destitute). Adopted at the *individual action* layer per §1.1. |
| **Thesis Kernel** | A Document's central assertion with its premises, claims, constraints, and audience. The minimal structured representation that becomes the formal-graph spine. |

---

## 13. `cogentia.js` — the existing CLI face of Cogentia Commons

The script at `cogentia/scripts/cogentia.js` is publicly named in `second_method.md` Coda and is **already operational**. Its docstring opens with: *"cogentia.js — Cogentia Commons CLI. Infrastructure for traceable, auditable, AI-connectable distributed knowledge production across git repositories."* The CLI is the existing Cogentia Commons; the brique is the GUI complement we're adding.

**Existing commands (v0, in production):**

| Command | What it does | Mapping to the v1 spec |
|---|---|---|
| `add <name\|path>` | Register a repo in the cross-repo registry (`.cogentia.json`). | Precondition for Document registration (Workflow #1) — registers the GitHub repo that hosts a Document's literate form. |
| `remove <name>` | Unregister a repo. | Inverse of `add`. |
| `list` | Show registered repos + status. | Operational view of the federation. |
| `status` | Quick health check across all repos. | Operational dashboard precursor. |
| `scan` | List all markdown, flag unreferenced. | **Doctrinally load-bearing.** §1 of `second_method.md` Rule 4 — "every unanchored claim becomes visible." The current substring-based detection is a known correctness gap (see `cogentia_js_doctrine.md` memory). |
| `init [name]` | Bootstrap `research/index.md` with Jekyll-ready front-matter. | Lightweight community founding (Workflow #9) — a community's manifest commit can follow. |
| `ref <file>` | Generate a `research/index.md` entry for a file. | Subset of Document registration — produces the Published / Referenced row. |
| `open [name]` | Open `research/index.md` in default editor. | Author UX shortcut. |
| `sync` | `git pull --ff-only` in all repos. | Federation refresh. |
| `graph` | Mermaid cross-reference graph of the corpus. | Visualization of the federation DAG (parent §5.7.3 cross-Document correlation). |
| `check` | Validate URLs and internal links in every `research/index.md`. | Subset of `citation_validator` plugin (§6.3 + structural-plugins §1). |
| `jekyll` | Ensure Jekyll front-matter on every `research/index.md`. | Maintenance / lint. |

**Subcommands the v1 spec adds (already specified):**

| Subcommand | Where specified | Notes |
|---|---|---|
| `manifest --validate <path>` | `cogentia_commons_community_manifest.md` §7.2 | Validate a `COMMUNITY.md` against the schema; exit code 0 / 1 (schema violation) / 2 (amendment violation) / 3 (I/O). |
| `manifest --diff <commit-a> <commit-b>` | manifest §7.3 | Field-by-field diff of two manifest commits. |
| `manifest --check-amend <prev> <proposed>` | manifest §7.4 | Validate amendment legality (immutable / forward-only / freely-amendable fields). |
| `rebuild` | parent §5.7.9 conformance item 3 | Drop the Supabase projection and rebuild it from the Event log. v1 capability; v1.1 adds `--diff` for the differential audit. |

**Likely v1 additions not yet specified** (candidates for the brique implementation pass):

| Candidate | Purpose |
|---|---|
| `audit <doc-uri>` | Run the full v1 plugin set against a Document (kernel_extractor + citation_validator + consistency_scanner) and emit a structured report. |
| `kernel <doc-path>` | Run `kernel_extractor` from the CLI — emits the rendered prompt to stdout for the user to paste into a conversational agent; accepts the agent's JSON response on stdin and persists the proposed kernel. |
| `objection submit <target-uri>` | CLI surface for filing an Objection (mirrors Workflow #2). |
| `publish <doc-uri> --type <kind>` | CLI surface for minting a Publication (mirrors Workflow #6). The `initial` variant triggers the §8.3 moderator-review Continuation. |
| `continuation list [--mine]` | List open Continuations resumable by the current GitHub identity. |
| `sanction issue --target <handle> --rung <3\|4> --days <n> --reason <text>` | CLI surface for §4.5 issuance. |

**Doctrinal commitments inherited by any change to the CLI** (from `cogentia_js_doctrine.md` memory):

- The script is publicly named in `second_method.md` — surface stability (help text, command names, output format) is part of a published commitment.
- Zero npm dependencies (per the script's own docstring and the doctrine).
- MIT license for code; CC BY-SA 4.0 for documentation that quotes its surface.
- Help text in the doctrinal Coda calls it `node scripts/cogentia.js`, not `node cogentia.js` — preserve the path form.
- The `scan` correctness gap (substring-based reference detection vs proper markdown link parsing) is a doctrinal violation, not just a code-quality issue — it should be fixed before the v1 ship.

The CLI is the existing Cogentia Commons. The brique extends it. The shared substrate is the COP Event log + Supabase projection. A new session picking up this work should not treat `cogentia.js` as a peripheral utility — it is the platform's published face.

---

## 14. License + provenance

This continuation snapshot: **CC BY-SA 4.0**.

Drafted 2026-05-13 in Corte, in conversation between Jean Hugues Noël Robert (baron Mariani) and Claude (Anthropic, model Opus 4.7). The user explicitly invoked the *continuation* primitive at end-of-session: "let's establish a 'continuation' snapshot to continue this work in another conversation, maybe with a different AI agent, thanks."

The conversation itself is the chat URL the next session may wish to consult, per §5.8 of the parent spec — the recursive principle holds. (If the user has the chat URL handy, append it to this file; if not, the spec set + memories are sufficient context.)

---

*Premier commit : 2026-05-13 — Corte. Continuation snapshot v1.*
*Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica*

*— the next session begins by reading this document.*


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Cogentia Commons — COMMUNITY.md Sub-Specification](cogentia_commons_community_manifest.md)
- [Cogentia Commons — Session Continuation Snapshot](cogentia_commons_continuation.md)
- [Cogentia Commons — `kernel_extractor` Plugin Sub-Specification](cogentia_commons_kernel_extractor.md)
- [Cogentia Commons — MVP Specification](cogentia_commons_mvp_spec.md)
- [Cogentia Commons — Structural Plugin Sub-Specifications](cogentia_commons_structural_plugins.md)
- [Cogentia Commons — Substantive Plugin Sub-Specifications](cogentia_commons_substantive_plugins.md)
- [Cogentia Commons — Workflows](cogentia_commons_workflows.md)
- [Cogentia Commons: A Platform Architecture for Collaborative Possibility Exploration Under Scientific Constraint](Cogentia_Commons_Working_Paper.md)
- [Corpus Status — cogentia](corpus-status.md)
- [Research Index — Cogentia](index.md)

<!-- END_AUTO: backlinks -->
