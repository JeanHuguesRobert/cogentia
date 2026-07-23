---
title: "Corpus Navigation Audit — the Substitution Test Applied to Navigation"
description: "Empirical audit of agent navigability across the corpus, from three lived failures on 2026-07-21; findings and a prioritized specification."
author: "Claude (Anthropic), under mandate of Jean Hugues Noël Robert"
date: "2026-07-21"
document_role: "source"
document_kind: "audit"
visibility: "public"
lifecycle_state: "working"
license: "CC BY-SA 4.0"
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/corpus_navigation_audit.md"
provenance:
  origin_type: "working-session"
  origin_date: "2026-07-21"
  derived_from:
    - "FractaVolta/research/when_cognition_became_traffic.md"
    - "FractaVolta/research/CPKT-2026-001_c11_substitution.md"
  editing_note: >
    S7 was destroyed by an unversioned read-modify-write during drafting and
    reconstructed from the editing agent's recollection, not from a versioned
    source; its text is therefore unverified against its original. Recorded per
    the corpus's own provenance discipline. Subsequent edits are diff-verified.
review:
  status: "awaiting human arbitration"
  reviewed_by: []
---

# Corpus Navigation Audit — the Substitution Test Applied to Navigation

## 0. Method and evidence

This audit is empirical, not speculative. On 2026-07-21, an AI agent (Claude, claude.ai) worked a full session inside the corpus with the author's active guidance, cloning five repositories (cogentia, FractaVolta, barons-Mariani, marenostrum, JeanHuguesRobert). Despite full attention and full access, navigation failed three times and required human guidance each time:

1. **Potentics** — the corpus's foundational "science of the possible" — was not resolved during the session. *Correction (same day, on the author's pointer):* the canonical file exists and was greppable all along (`barons-Mariani/research/potentics.md`; full-text search returns 19 matching files). The agent's search had truncated its own result list (`head -8`) without declaring the truncation, then concluded absence — an A1 violation by the auditor itself, preserved here as evidence. The finding stands in corrected form: name→file resolution required exhaustive multi-repository full-text search where a one-hop index lookup should suffice, and a truncated search that does not know it is truncated produces confident false negatives. Both lessons feed the S6 benchmark.
2. **The channels-fragmentation document** — mentioned by the author as existing "somewhere in the corpus" — was unresolvable. Neither concept index nor grep produced it (closest match: one passing mention in `barons-Mariani/research/vigilia.md`).
3. **The interaction register** (`JeanHuguesRobert/interaction_packets/`) was found only because the author named the repository.

The corpus's own soundness test (cogentia/README.md) is binding here:

> Can the current AI agent be replaced by a human, or by another agent, without modifying `cogentia.js`?

Applied to navigation, the answer today is **no** — not because the tooling is absent, but because the navigation authority lives in the tooling and the workspace, not in the corpus itself. Navigation currently fails its own substitution test.

## 1. Findings

**F-NAV-1 — Agent entry is tool-mediated, not corpus-mediated.** `cogentia.js` v2 provides registry loading, classification, generated navigation, indexed context, daemon-backed retrieval, agent gateways. All of it presupposes an agent *running the substrate*. An agent arriving bare — a claude.ai session, a reviewer's LLM, a correspondent's assistant following a link from an email — has clone and grep. The navigation layer exists; its *static projection* does not.

**F-NAV-2 — The authoritative registry is not published.** The global index declares that current state is "generated through cogentia.js using the authoritative registry" and scopes itself to `C:\tweesic workspace` — a local Windows path. No registry artifact is findable in the public cogentia repository. An external agent cannot authoritatively know which repositories exist, their roles, or their entry points. The measured effect: this audit's own agent, working attentively with full access, believed the corpus spanned five repositories; a later inventory revealed ten. The corpus's map depends on one workstation.

**F-NAV-3 — The concept index is rich but its resolution layer is thin.** `cogentia/research/concepts.md` (~27 typed concepts, Seed→Canonical status scale, parent/child/related links, reference documents) is excellent structure. But: (a) coverage — 27 concepts for a corpus of hundreds of documents, and load-bearing doctrines (Potentics, Exploration Rationnelle du Possible, Seconde Méthode as such) are not resolvable through it; (b) no aliases — a concept is findable only under its exact name, so "fragmentation des canaux" resolves to nothing even if the doctrine exists under another title; (c) per-repo scope — no corpus-level concept resolution.

**F-NAV-4 — Named doctrines lack the one-doctrine-one-canonical-file discipline.** Potentics is the exhibit: referenced from at least four repositories, extended by an addendum, and yet not locatable by name. A doctrine that cannot be found by its own name does not exist for an incoming agent.

**F-NAV-5 — Duplication without declared convention.** `FractaVolta/UNCONSCIOUS_GRID.md` (13 lines, root) coexists with `FractaVolta/research/UNCONSCIOUS_GRID.md` (430 lines). If the root file is a stub or redirect, nothing in its frontmatter says so; an agent reading it may take 13 lines for the paper.

**F-NAV-6 — The packet is not yet the unit of navigation.** *The Unconscious Grid* carries an "Optimized condensed version for AI agents"; most documents do not. Documents do not yet publish attractor claims. Yet the corpus's own doctrine (When Cognition Became Traffic, §5) specifies exactly what navigation needs: attractors advertising *"I hold corpus X at version Y; I can resolve questions of type T"*. The theory of informational gravity exists; it has not been applied to the corpus that states it.

**F-NAV-7 — The indexes are generated but never read-tested.** Every research/ directory carries an index.md and a concepts.md, built automatically by cogentia.js with LLM assistance. The write path is sophisticated; the read path has no falsification. No query has ever been run against the indexes from a cold start, so no failure has ever been fed back — the exact epistemic error the Seconde Méthode names (negative returns discarded), and the exact resistance the paper names in §8.3 (false completion: a fluent artifact that satisfies its production test without ever facing its use test). The generating LLM also suffers the curse of knowledge: it summarizes in the author's ontology, while a searching agent arrives with the reader's vocabulary — which is why aliases, not better summaries, are the missing layer.

**F-NAV-8 — The Guide miscast embeddings, and its eval lacks a referee.** The corpus already operates an embedding-based Guide (HTTP service, site widget, retrieval merge with query planning, an eval harness). Its disappointing results have identifiable causes: (a) one similarity search is asked to serve three distinct question kinds — deterministic *resolution* (name→canonical file, where embeddings structurally return the similar rather than the canonical), *doctrine* retrieval (where they work if chunking respects structure), and cross-document *synthesis* (where retrieval alone cannot) — collapsing Γ to its single dimension r, the recommender failure the corpus's own §5 forbids; (b) the embedded corpus is polluted by its own generated echo (index, status, snapshot, derived files paraphrasing the sources), while the frontmatter needed for hard admissibility filtering (document_role, lifecycle_state) exists and is unused as a pre-filter; (c) the bilingual corpus degrades cross-language similarity silently; (d) guide-eval compares runs to runs — A/B without ground truth — so failures are observed, not conserved.

## 2. Specification, by priority

**S1 — Publish the static projection (generated, never hand-maintained).** `cogentia.js` gains one command (`emit-static` or similar) producing, on every corpus sync: (a) a corpus-level entry file at the profile repository root — repository list, role of each, canonical entry point of each, concept-resolution pointer — following the emerging `llms.txt` convention so that arbitrary agents recognize it; (b) one per-repo agent entry block (the existing AGENTS.md files, extended with "what this repo holds, where its index is"). One generator, zero dual maintenance: the tooling remains the authority, the projection makes it substitutable.

**S2 — Publish the registry itself.** The authoritative registry (repositories, roles, status) becomes a versioned public artifact, generated to a stable path. The map leaves the workstation.

**S3 — Alias layer + coverage rule on the concept index.** Every concept gains `aliases:` (the corpus's own memory files already model this). Coverage rule, checkable by cogentia.js: *every doctrine named in any paper's prose must resolve through the concept index to exactly one canonical file.* Potentics is the first test case; "Exploration Rationnelle du Possible" the second.

**S4 — Attractor cards: generalize the condensed-for-agents block.** Every source document gains a generated attractor card — five lines: what I hold, what questions I resolve, my claims manifest pointer, my version, my canonical URL. Navigation then *is* informational gravity: an incoming question-packet routes across document-attractors, exactly as §5 of When Cognition Became Traffic specifies. The corpus becomes the first CPsN instance — and dogfooding closes: the tools navigate their own doctrine.

**S5 — Declare the stub convention.** Root-level duplicates carry `document_role: stub` and a `canonical:` pointer in frontmatter; cogentia.js flags undeclared duplicates.

**S6 — Navigation benchmark: the standing negative-return loop.** A suite of *navigation packets* — miniature CPKT-style queries, each naming a target by its colloquial names ("Where does Potentics live?", "Which document treats channel fragmentation?", "Where is the interaction register?") — run by cogentia.js at every sync against the static projection alone, simulating a bare agent (name-and-alias resolution, no daemon, no workspace). Success = resolution to the canonical file in one hop. Every failure is appended to a negative-return log that the next LLM-assisted index generation MUST consume before regenerating. This closes the loop the pipeline currently lacks: non-deterministic generation + deterministic verification + conserved negative returns — the Seconde Méthode operationalized on the corpus's own navigation, and the corpus's first standing instance of Exploration Rationnelle du Possible applied to itself. The three failures of 2026-07-21 seed the benchmark.

**S7 — Recast the Guide as three layers, and ship its MCP under the packet contract.** Layer one, deterministic resolution: alias→canonical-file lookup (S3-backed), no embeddings involved. Layer two, hard admissibility before similarity: frontmatter pre-filter (document_role=source, live lifecycle states, language match), excluding the corpus's generated echo from the embedded set. Layer three, similarity and reranking — the job embeddings are actually good at — over attractor cards (S4). The Guide's eval merges with S6: every benchmark question ships its expected canonical source, turning A/B comparison into refereed grading with conserved failures. The MCP declination, currently and rightly on hold, ships only under the packet contract — `resolve(name)`, `route(question, policy)`, `fetch(card)` — each verb falsifiable by S6 before release. The Guide thereby stops being a recommender and becomes the corpus's first CPsN interface: informational gravity, not similarity, applied to the corpus that defined it.

**S8 — Freeze convention for submitted and published documents.** Living documents are the corpus's norm, but a journal submission is not one: a reader following a citation must retrieve exactly what was submitted. Three additions, all mechanical. (a) A `frozen` lifecycle state, materialized as an immutable artifact — a Git tag at minimum, a DOI (Zenodo or equivalent) where citation matters. (b) Bidirectional pointers: the living document declares `published_versions:` (venue → tag/DOI → date), the frozen artifact declares `superseded_by:` pointing at the living document — so neither reader is stranded, and neither version can be mistaken for the other. (c) Navigation consequence for S7's admissibility pre-filter: "what does the paper say" must route to the living version, "verify this citation" to the frozen one; a filter that knows only live-versus-dead will answer one of those two questions wrongly. Applies imminently — *When Cognition Became Traffic* names its target journals. (d) The same axis governs publication protocol, not only citation: a living document publishes optimistically — publish, notify those cited, amend on contest, the rollback cost being one commit — while a frozen artifact requires the pessimistic protocol, consent obtained before the write, since rollback is unavailable. Choosing the protocol by document lifecycle rather than by habit avoids blocking a living document on a permission it does not need. Layer one, deterministic resolution: alias→canonical-file lookup (S3-backed), no embeddings involved. Layer two, hard admissibility before similarity: frontmatter pre-filter (document_role=source, live lifecycle states, language match), excluding the corpus's generated echo from the embedded set. Layer three, similarity and reranking — the job embeddings are actually good at — over attractor cards (S4). The Guide's eval merges with S6: every benchmark question ships its expected canonical source, turning A/B comparison into refereed grading with conserved failures. The MCP declination, currently and rightly on hold, ships only under the packet contract — `resolve(name)`, `route(question, policy)`, `fetch(card)` — each verb falsifiable by S6 before release. The Guide thereby stops being a recommender and becomes the corpus's first CPsN interface: informational gravity, not similarity, applied to the corpus that defined it.

## 3. What this audit does not claim

It does not claim the tooling is deficient — the opposite: the tooling is ahead of its projection. It does not claim exhaustiveness — five repositories were examined, on one day, by one agent. It does not replace the author's arbitration on any of S1–S5.

## Continuation

Requested next processors: the author (arbitration on S1–S5 and on the canonical location of Potentics); cogentia.js (implementation of the accepted items); one bare external agent, later, to re-run the three failure cases as the audit's falsification test — navigation is fixed when an unguided agent resolves Potentics, the channels document, and the register in one hop each.
