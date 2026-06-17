---
title: "The Cogentia Commons Living Corpus"
subtitle: "Expected behavior of a multi-repository, agent-readable, versioned corpus"
description: "First consolidation draft for the Living Corpus: the CLI substrate, navigation model, continuation model, source/derived distinction, exploration paths, and future Web interface of Cogentia Commons."
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-06-09"
status: "working-paper — first draft for stabilization"
version: "0.1"
license: "CC BY-SA 4.0"
language: "en"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_commons_living_corpus.md
document_role: "source"
generated_by:
  - "OpenAI Codex — first drafting and consolidation from local corpus sources and user brief"
human_arbitration_by: "pending"
related_documents:
  - "COGENTIA.md"
  - "research/pipeline.md"
  - "research/derived_products.md"
  - "research/agent_resumable_cli.md"
  - "research/cognitive_packets.md"
  - "research/cognitive_packet_switching.md"
  - "research/cogentia_commons_method_packets.md"
  - "research/ideas_to_explore_as_issues.md"
  - "research/self_contained_documents.md"
  - "docs/agent_context_server.md"
  - "docs/knowledge_mesh.md"
  - "barons-Mariani/research/second_method.md"
---

# The Cogentia Commons Living Corpus

## Orientation

Status: sovereign source document in working-paper form.

Function in the corpus: state the expected behavior of the Living Corpus, including source/derived distinction, multi-repository navigation, continuations, generated views, GitHub compatibility, and the future Web interface.

Read before: [Cogentia](../COGENTIA.md), [Discours de la seconde méthode](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md), and [Carte globale du Corpus](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/corpus-map.md).

Read after: [Agent-Resumable CLI](agent_resumable_cli.md), [Derived Products](derived_products.md), [Cognitive Packets](cognitive_packets.md), and [The Knowledge Mesh](../docs/knowledge_mesh.md).

Depends on: the current `scripts/cogentia.js` CLI, the registry of tracked repositories, the continuation model, and Git as the public source of truth.

Continuation: refine this document into a sharper behavioral specification as the CLI and future Web surface stabilize.

Last consolidation: 2026-06-09 — orientation block added during corpus digestion.

## Status

This document is a first consolidation draft.

Its purpose is to stabilize the expected behavior of the **Cogentia Commons Living Corpus**: the multi-repository Markdown/Git corpus, the current `cogentia.js` CLI that lets agents inspect and maintain it, the continuation mechanism used when judgment is required, and the future Web interface that can make the same workflow easier without replacing Git as the source of truth.

The term **Living Corpus** consolidates several earlier names and partial formulations:

- the **corpus as its own evidence**, from [Cogentia](../COGENTIA.md) and the [second method](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md);
- the **pipeline**, understood as a packet-switched transformation network rather than a linear production line, from [Pipeline](pipeline.md);
- the **reactive corpus**, where generated views and derived products re-react to source changes, from [Derived Products](derived_products.md);
- the **generative corpus**, where cognitive packets and method packets allow work to be resumed, from [Cogentia Commons — Method Packets](cogentia_commons_method_packets.md);
- the **knowledge mesh**, where Markdown links, indexes, backlinks, concepts, and trails make the corpus navigable by humans and agents, from [The Knowledge Mesh](../docs/knowledge_mesh.md).

The document is not yet a formal implementation specification. It is a source document whose job is to make the expected behavior explicit enough that `cogentia.js`, future agents, and a later Web interface can be judged against it.

## Object and Associated Documents

### Object of this document

The Living Corpus is not merely a folder of Markdown files. It is a versioned cognitive infrastructure with the following properties:

1. It is **multi-repository**: the corpus spans several GitHub repositories, each with its own role, branch, local policy, index, concepts, and generated status.
2. It is **source-first**: sovereign source documents carry the substance; derived products adapt the substance to a form, scene, audience, or platform.
3. It is **agent-readable**: an AI agent should be able to query structure before reading everything, discover what is source or derived, inspect links, detect index gaps, and find the next useful continuation.
4. It is **human-governed**: agents participate in knowledge, but living persons govern and arbitrate binding decisions.
5. It is **continuation-aware**: unfinished work is not hidden in conversation memory; it is materialized as a continuation, an issue, an open possibility, an objection, or a work-in-progress document.
6. It is **reactive but not opaque**: mechanical views may be regenerated automatically, while semantic or public-facing refreshes are delegated to agents or humans through explicit continuations.
7. It is **local-first and GitHub-compatible**: it must work on a local filesystem and also map naturally to GitHub URLs, issues, commits, branches, and pull requests.

The current implementation surface is the CLI:

```bash
node scripts/cogentia.js help
```

A Web surface may follow. The Web surface should improve ergonomics; it should not become a second hidden source of truth.

### Associated documents

This document should be read with:

- [Cogentia](../COGENTIA.md) — identity document and five distinctive moves;
- [Discours de la seconde méthode](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) — founding method and rules;
- [Pipeline](pipeline.md) — operational method for routing ideas through critique, source documents, derived products, and reintegration;
- [Derived Products](derived_products.md) — source/derived distinction and reactive corpus;
- [Agent-Resumable CLI](agent_resumable_cli.md) — continuation pattern for CLI tools;
- [Cognitive Packets](cognitive_packets.md) and [Cognitive Packet Switching](cognitive_packet_switching.md) — packet envelope/payload and routing layer;
- [Ideas to Explore as GitHub Issues](ideas_to_explore_as_issues.md) — issues as memory in tension;
- [Self-Contained Documents](self_contained_documents.md) — anti-circularity principle for documents inside an interconnected corpus;
- [Agent Navigation Guide](../docs/agent_context_server.md) — current operational meta-prompt for agents;
- [The Knowledge Mesh](../docs/knowledge_mesh.md) — navigation, concepts, backlinks, trails, and Web rendering.

## 1. Definition

A **Living Corpus** is a versioned, navigable, agent-readable, human-governed set of documents, links, generated views, continuations, issues, and derived products that can be inspected, resumed, criticized, reorganized, and republished without losing provenance.

Shorter:

> A Living Corpus is a Git-based knowledge commons whose structure is alive enough to answer: what exists, what matters, what derives from what, what changed, what remains open, and who or what must judge next.

This definition has an important negative side.

A Living Corpus is not:

- a content dump;
- a CMS database with opaque state;
- a private model memory;
- a backlog where every thought becomes a task;
- an agent that decides doctrine by itself;
- a generated website detached from its sources.

The corpus is alive because its relationships, roles, continuations, and public surfaces are maintained. It is not alive because an AI model is continuously rewriting it.

### Stabilization note: the anti-Ubik function

In this document, **stabilization** does not mean freezing the corpus. It means reducing dislocation while preserving revision.

The Living Corpus is a procedural stabilizer against the **Effet Ubik**: the situation where signs, documents, institutions, identities, sources, and time references still exist, but become increasingly costly to hold together as a shared reality. A stabilizer in this sense is not an authority that declares final truth. It is an infrastructure that lets a claim remain traceable, contestable, versioned, resumable, and reconnectable to its sources.

The anti-Ubik stabilizers of the corpus are practical:

- Git history;
- source/derived distinctions;
- explicit redirects after moves;
- backlinks and indexes;
- concept registries;
- continuations;
- GitHub Issues as memory in tension;
- generated status views;
- human arbitration of semantic decisions.

The test is simple:

> Does this mechanism make it easier for a future human or agent to reconstruct what changed, what was decided, what remains open, and where to resume?

If yes, it stabilizes. If it merely hides uncertainty, imposes closure, or replaces judgment by authority, it does not.

## 2. The Methodological Boundary

The Living Corpus inherits the boundary of the second method:

> Artificial agents participate in knowledge. Living persons alone govern.

For the corpus, this means:

- an agent may read, search, summarize, classify, propose, criticize, draft, and inspect;
- an agent may emit or answer a continuation when it is the delegated judge for a bounded task;
- an agent may not silently replace human arbitration where a binding doctrinal, political, legal, reputational, or public-identity decision is at stake;
- a mechanical tool must not hide semantic judgment inside code.

This is why the CLI design rule matters:

```text
deterministic structure -> handled by cogentia.js
semantic judgment       -> emitted as a continuation
human/public arbitration -> signed by a living person
```

The soundness question remains binding:

> Can the current AI agent be replaced by a human, another AI agent, or a script, without modifying `cogentia.js`?

If yes, the boundary is structurally sound. If no, the tool has absorbed a judgment that should have been externalized.

## 3. Repository Structure

The corpus is made of registered repositories. Today the registry is loaded from a `.cogentia.json` file, usually held by the profile/registry repository.

A registered repository normally contains:

| Path | Role |
|---|---|
| `README.md` | public entry point or dashboard for the repository |
| `research/` | source documents, index, concepts, corpus status, trails, and research-grade notes |
| `docs/` | operational or public documentation |
| `prompts/` | prompts, agent contracts, review templates, method packets |
| `scripts/` | tooling, especially CLI scripts |
| `derived_products/` or `research/derived_products/` | situated products derived from source material |
| `.cogentia/` | local tool state such as continuations, when present |

This structure is **fractal**. A subproject may contain its own `README.md`, `docs/`, `prompts/`, `scripts/`, or derived-product area. The tool should therefore avoid assuming that only the repository root matters. A subdirectory can become a local corpus neighborhood when it has its own documents, navigation, and maintenance needs.

The current multi-repository corpus includes, at minimum:

| Repository | Corpus role |
|---|---|
| `cogentia` | cognitive infrastructure tooling, continuation protocol, Commons method |
| `barons-Mariani` | political, institutional, and second-method doctrine |
| `marenostrum` | strategic framework, DHITL, CXU, Mediterranean commons |
| `FractaVolta` | engineering, energy, packet networks, Fractanet substrate |
| `inseme` | platform, COP runtime, briques, operational Web substrate |
| `Inox` | language/runtime substrate |
| `JeanHuguesRobert` | profile and registry repository |

The list is not closed. `cogentia.js state --json` is the operational source for the currently tracked list.

## 4. Document Classes

The Living Corpus must distinguish document roles because agents need to know which texts carry substance and which texts adapt, index, or route it.

### 4.1 Sovereign source documents

A **sovereign source document** is a document that carries the substance of a concept, doctrine, argument, method, specification, or operational rule.

It should normally be:

- versioned in Git;
- indexed in the repository's `research/index.md`;
- self-contained enough to be criticized without reading the whole corpus;
- linkable from other repositories;
- eligible to generate derived products;
- explicit about its status, limits, objections, and continuations.

Most important documents under `research/` are presumed source documents unless frontmatter, path, or index context says otherwise. For important cases, the role should be explicit with:

```yaml
document_role: "source"
```

### 4.2 Derived products

A **derived product** is a situated form derived from source material for a specific audience, platform, persona, or function.

Examples:

- public blogpost;
- academic article;
- concept situation brief;
- tutorial generated from code and doctrine;
- social media note;
- website page;
- campaign brief;
- prompt;
- slide deck;
- README when it functions as a public synthesis rather than a mechanical index.

Derived does not mean inferior. It means that the document's authority depends on traceability to the source corpus.

### 4.3 Symmetric derived documents

A derived document may be **symmetric** when it preserves enough structure to reconstruct the source or to serve as the best available source until a better source document exists.

This case matters. A derived academic article, tutorial, or synthesis may temporarily act as a sovereign source when:

- it is structurally faithful to the corpus;
- it preserves the argument, not only the conclusion;
- it cites or names the source lineage;
- no clearer source document exists yet;
- the corpus marks the status as provisional.

Operational rule:

> A symmetric derived document may count as a provisional sovereign source, but this is a judgment, not a regex result.

Therefore `cogentia.js docs judgments` should surface such cases, and `docs judgments --emit-continuations` should ask the invoking agent or human to decide whether the document is:

- a sovereign source;
- an asymmetric derived product;
- a symmetric derived document that temporarily counts as source;
- an alias or redirect;
- operational documentation;
- unknown and requiring human review.

### 4.4 Operational documents

Operational documents explain how to use, run, or maintain a subsystem. They may live in `docs/`, `scripts/`, package directories, or local app folders.

They are important, but they are not automatically sovereign doctrine. Their role is to make the corpus executable and inspectable.

### 4.5 Index and navigation documents

Each repository should maintain:

- `research/index.md` — map of published documents, referenced documents, work in progress, and open possibilities;
- `research/concepts.md` — local concept registry;
- `research/corpus-status.md` — generated or semi-generated status view;
- optional trail files under `research/trails/`;
- optional `research/documents.md` in the registry repository for the global document catalog.

These documents are part of the corpus surface. Some are source-like, some are generated views, and some are mixed. The crucial distinction is whether a block is curated by a human/agent or generated mechanically.

### 4.6 Alias and redirect documents

The corpus has a development history. Some documents were created before the current structure stabilized. Moving them is sometimes necessary, but links should not break.

The corpus therefore needs an equivalent of HTTP `301 Moved Permanently`.

A moved Markdown document may leave a minimal alias file at the old path:

```markdown
---
title: "Old title — moved"
document_role: "alias"
redirect_to: "new/path/document.md"
moved_at: "2026-06-09"
---

# Moved

See [new/path/document.md](new/path/document.md), since 2026-06-09.
```

If a file is moved multiple times, aliases should preferably point to the final canonical target rather than force readers and agents to follow every intermediate hop. A tool may preserve the historical chain in frontmatter or comments, but navigation should be consolidated.

Git can preserve file history across moves when the content similarity is sufficient; GitHub also often displays history across renames. That helps auditability, but it does not replace explicit corpus-level redirects, because Markdown links, agents, and generated catalogs still need a stable semantic signal.

## 5. Generated Views and Curated Content

The Living Corpus distinguishes:

```text
generated view   = deterministic projection of current corpus structure
curated content  = human/agent-authored prose or judgment
```

Generated views may include:

- backlink blocks;
- document catalogs;
- per-repository corpus status;
- concept summaries;
- coupling tables;
- index gap reports;
- dirty/ahead/behind git status.

Curated content includes:

- arguments;
- objections;
- status judgments;
- public identity text;
- doctrinal claims;
- derived products requiring voice, selection, or rhetorical fit;
- decisions about source/derived/symmetric status.

`cogentia.js` may update generated views through a plan/apply/verify cycle:

```bash
node scripts/cogentia.js corpus plan --json
node scripts/cogentia.js corpus apply
node scripts/cogentia.js corpus verify --strict
```

The tool should only write bounded auto-managed regions or known generated files. It should not rewrite curated prose because it can compute a plausible sentence.

## 6. Significant Updates and Maintenance Noise

Agents navigating the corpus need to know both document size and time. But raw file modification time is not enough because a document may be touched by automatic maintenance: backlinks, generated navigation, index refresh, stamping, or bulk frontmatter cleanup.

The corpus should distinguish:

| Metric | Meaning |
|---|---|
| creation age | when the document first entered Git history or first declared a semantic date |
| last modified | filesystem or Git-level last change |
| last significant update | last change that appears to alter curated content, argument, role, title, source lineage, or status |
| last maintenance update | last change limited to generated blocks, backlinks, stamps, formatting, or mechanical metadata |
| size | bytes, lines, words, or approximate tokens |

Current `cogentia.js` already uses maintenance-oriented heuristics when classifying changes. The expected direction is:

- report document size and age in `docs query` / `docs inspect`;
- sort documents by `created`, `updated`, `size`, and link count;
- avoid treating automatic navigation refreshes as substantive intellectual updates;
- expose uncertainty rather than pretending the distinction is perfect.

The rule is pragmatic:

> If a tool cannot know whether a change was semantically significant, it should say so or emit a continuation. It should not fabricate precision.

## 7. Current CLI Contract

The CLI is the current operational surface of the Living Corpus.

Its minimum contract is:

### 7.1 State and health

```bash
node scripts/cogentia.js state --json
node scripts/cogentia.js status
node scripts/cogentia.js git verify --json
```

Expected behavior:

- load the registered repositories;
- show branch, path, existence, local policy, index/concepts/status presence;
- report dirty working trees and ahead/behind drift;
- respect local policies such as `inseme` being scoped to `research/` when the rest is unstable.

### 7.2 Document inventory

```bash
node scripts/cogentia.js docs summary --json
node scripts/cogentia.js docs query all --role source --sort updated --json
node scripts/cogentia.js docs gaps --json
node scripts/cogentia.js docs inspect cogentia/research/pipeline.md --json
```

Expected behavior:

- count active Markdown documents;
- classify roles;
- detect index gaps;
- expose source/derived/operational/index/alias counts;
- report per-repository summaries;
- expose cross-repository coupling through link weights;
- make it cheap for an agent to find likely source documents before reading the corpus.

### 7.3 Search

```bash
node scripts/cogentia.js docs search "continuation" --json
node scripts/cogentia.js docs search "Open Possibilities" --include-generated --json
```

Expected behavior:

- search active Markdown documents;
- return repo/path/title and useful line anchors;
- allow repository restriction;
- exclude generated noise by default when appropriate;
- permit generated content search when the agent explicitly asks.

### 7.4 Concepts

```bash
node scripts/cogentia.js concepts list all --json
node scripts/cogentia.js concepts check all --json
```

Expected behavior:

- parse `research/concepts.md` in each repository;
- ignore auto-managed blocks;
- surface missing fields, duplicate names, and undefined references;
- make concept navigation possible without requiring a database.

### 7.5 Continuations

```bash
node scripts/cogentia.js continuation emit --question "..." --json
node scripts/cogentia.js continuation list --status active --json
node scripts/cogentia.js continuation inspect <ctn_id> --json
node scripts/cogentia.js continuation resolve <ctn_id> result.json
node scripts/cogentia.js continuation cancel <ctn_id> --reason "..."
```

Expected behavior:

- serialize judgment requests under `.cogentia/continuations/`;
- carry a title, kind, question, subject, context, expected response, status, and history;
- deduplicate active requests when the same judgment is already pending;
- let any competent external judge answer;
- validate the answer enough to resume safely;
- preserve the resolution rather than erasing the uncertainty.

### 7.6 Role judgments

```bash
node scripts/cogentia.js docs judgments all --json
node scripts/cogentia.js docs judgments all --emit-continuations --json
```

Expected behavior:

- find documents whose role is ambiguous, weakly inferred, derived, or likely symmetric-derived;
- ask explicitly whether they should count as source, derived, alias, operational, or provisional symmetric source;
- avoid hard-coding semantic classification in the scanner.

## 8. Coupling and Navigation Metrics

The Living Corpus should make inter-repository coupling visible.

A coupling metric is not a judgment of quality. It is a navigational signal.

Useful metrics include:

| Metric | Use |
|---|---|
| directed link weight `A -> B` | how often repository A cites repository B |
| incoming links | which repositories depend on this repository's documents |
| outgoing links | which repositories this repository depends on |
| asymmetry | where one repository cites another much more than the reverse |
| centrality | which repositories serve as hubs |
| stale links | where referenced paths no longer resolve |
| cross-repo source coverage | whether referenced documents have canonical source homes |
| orphan documents | source-like documents not indexed anywhere |

For an agent, these metrics answer practical questions:

- Which repository should I read first?
- Is this document central or peripheral?
- Is a local update likely to affect another repository?
- Is a derived product drifting away from its source?
- Which cross-repo edge deserves consolidation?

The CLI already reports directed coupling weights in `docs summary --json`. Future versions may add richer coupling views, but the basic rule is already clear:

> Coupling metrics guide navigation and maintenance; they do not prove intellectual dependency by themselves.

## 9. Paths of Exploration

The Living Corpus must show the paths of rational exploration that remain open.

An open path may appear as:

- an **Open Possibility** in `research/index.md`;
- a **Work in Progress** entry in `research/index.md`;
- a **Continuation** under `.cogentia/continuations/`;
- a **GitHub Issue** acting as memory in tension;
- an objection not yet answered;
- a TODO that has been promoted into a tracked packet;
- a planned derived product;
- a provisional symmetric-derived source waiting for a clearer source document;
- a broken, moved, or ambiguous document needing redirect or consolidation;
- a concept entry that is missing definition, source, or relation.

These paths should be queryable at three levels:

| Level | Question |
|---|---|
| document | what remains open for this file? |
| repository | what remains open in this project? |
| corpus | what remains open across the tracked repositories? |

The order of exploration belongs to the user. The tool may rank by urgency, coupling, age, risk, or dependency, but it should not silently decide the user's research agenda.

In second-method terms:

```text
possibility -> packet -> issue or continuation -> source document -> critique -> derived product -> feedback -> reintegration -> new possibility
```

No step is mandatory for every idea. The corpus also needs Occam discipline: choose the smallest sufficient container.

## 10. GitHub Issues

GitHub Issues are not merely software tickets in this corpus. They can be procedural memory.

An issue is appropriate when an idea, objection, missing source, possible transformation, or future task is too important to lose but not yet ready to become a source document.

Minimal formula:

```text
Issue = unresolved continuation made addressable.
```

Expected future behavior for `cogentia.js` or the Web interface:

- list relevant open issues by repository;
- connect issues to target documents;
- distinguish issue, continuation, pull request, commit, and source document;
- export an issue as a cognitive packet;
- close the loop when a commit or document update resolves it;
- avoid treating every issue as a binding task.

The issue remains memory in tension until it is resolved, superseded, rejected, or transformed into a source artifact.

## 11. Local Filesystem and GitHub Modes

The Living Corpus must work in two modes.

### 11.1 Local filesystem mode

In local mode:

- the corpus is a set of sibling working trees;
- `cogentia.js` reads local files directly;
- agents may edit files, run checks, inspect git status, and prepare commits;
- the user decides when to commit and push;
- local dirty state is visible and must not be hidden.

This mode is best for deep consolidation because it permits fast search, bulk navigation refresh, and local verification.

### 11.2 GitHub mode

In GitHub mode:

- documents are fetched through GitHub repositories;
- issues, pull requests, branches, commits, and reviews are first-class surfaces;
- agents such as ChatGPT, Claude, Grok, or future tools can operate through GitHub access;
- the corpus can be navigated publicly even without local checkout;
- edits may happen through branches or pull requests.

This mode is best for distributed collaboration and public review.

### 11.3 Shared invariant

Both modes must preserve the same invariant:

> The Markdown/Git document remains the canonical literate artifact.

A Web database, Supabase projection, COP event log, or agent conversation may add structure and traceability. It should not silently become the canonical text.

## 12. Future Web Interface

The future Web interface should be a usability layer over the Living Corpus, not a replacement for it.

The expected per-document workspace has three main windows:

| Window | Role |
|---|---|
| Redactor agent conversation | draft, restructure, propose patches, maintain source/derived fidelity |
| Reviewer agent conversation | criticize, check self-containment, surface objections, test evidence levels |
| Document view/edit | display and edit the current Markdown document, diff, metadata, links, and status |

This workspace is **per document**. The user may work on multiple documents at the same time, so the interface should support multiple active document sessions, each with its own redactor context, reviewer context, document state, continuations, and pending actions.

The Web interface should also provide a corpus navigation window:

- local corpus view when connected to a filesystem workspace;
- public GitHub corpus view when working remotely;
- document search;
- role filters;
- index gaps;
- source/derived lineage;
- coupling graph;
- open continuations;
- related GitHub Issues;
- local or public URLs.

When using local filesystem mode, the interface should offer an explicit path from document acceptance to Git:

```text
edit -> review -> user accepts -> commit -> optional push to GitHub
```

The push must be explicit because publication is an act.

## 13. Agent Roles

The Living Corpus is agent-compatible, but agents should have bounded roles.

### 13.1 Redactor

The Redactor helps produce or revise text.

It may:

- turn a continuation into a draft;
- consolidate scattered material;
- improve structure and self-containment;
- propose frontmatter;
- propose links;
- produce derived products from declared sources;
- update a document after human instructions.

It should not silently invent sources, resolve political decisions, or declare a document stable without review.

### 13.2 Reviewer

The Reviewer tests the document.

It may:

- find internal contradictions;
- check whether claims are self-contained;
- classify evidence levels;
- detect circular references;
- identify missing sources;
- convert feelings of certainty into falsifiable objections;
- recommend continuations or issues.

It should not become a veto authority. An unrefuted objection is a discovery, not a hidden block.

### 13.3 Navigator

The Navigator uses `cogentia.js` to orient work.

It may:

- run `docs summary`, `docs search`, `docs inspect`, and `concepts check`;
- find source documents and derived products;
- detect open paths;
- propose next consolidation targets;
- prepare navigation refreshes.

### 13.4 Maintainer

The Maintainer performs bounded mechanical work.

It may:

- apply generated-view plans;
- update indexes after a source document is added;
- create alias/redirect stubs after moves;
- run verification;
- prepare commits.

The Maintainer should not rewrite doctrine.

## 14. Lifecycle of a Corpus Idea

A typical idea may move through these containers:

```text
conversation fragment
-> local note or continuation
-> GitHub Issue if worth remembering
-> cognitive packet if it needs to travel
-> source document if it stabilizes
-> review and objections
-> derived products
-> publication
-> feedback
-> reintegration
-> new continuations
```

The important part is not that every idea follows every step. The important part is that each transition has a reason.

The smallest sufficient container rule applies:

```text
conversation before note
note before issue
issue before source document
source update before new document
commit after checkpoint
```

This protects the corpus from becoming noise while preserving fertile possibilities.

## 15. Stability Requirements

For the Living Corpus to be considered stable enough for daily agent use, these conditions should hold:

1. `node scripts/cogentia.js state --json` lists the intended repositories and policies.
2. Every registered repository has `research/index.md`, `research/concepts.md`, and `research/corpus-status.md`, unless explicitly exempted.
3. `docs summary --json` gives plausible document counts, role counts, gap counts, and coupling weights.
4. `docs gaps --json` is empty or intentionally explained.
5. Source/derived/alias/operational distinctions are explicit where ambiguity matters.
6. `docs judgments --json` surfaces real judgment candidates and does not flood the user with noise.
7. `continuation list --status active --json` exposes pending external judgments.
8. `corpus plan --json` is read-only and understandable.
9. `corpus apply` writes only planned generated views.
10. `corpus verify --strict` detects stale generated views, gaps, and git drift.
11. Moved documents leave aliases or redirects when links would otherwise break.
12. Generated maintenance does not masquerade as significant intellectual update.
13. The agent navigation guide remains consistent with the actual CLI.

## 16. Failure Modes

The Living Corpus can fail in several recognizable ways.

| Failure mode | Symptom | Correction |
|---|---|---|
| hidden judgment | the tool silently classifies a semantic case | emit a continuation |
| generated drift | status, backlinks, or documents catalog no longer match files | `corpus plan/apply/verify` |
| source/derived confusion | a public article becomes treated as source without trace | document role review |
| link rot | moved files break links | alias/redirect stubs and consolidated targets |
| over-proliferation | every idea becomes a document | smallest sufficient container |
| circularity | documents only justify each other | self-contained document discipline |
| stale issue memory | issues accumulate without closure path | issue-to-continuation review |
| stale tutorial/spec | derived docs describe old CLI behavior | refresh or mark outdated |
| Web capture | UI/database becomes canonical text | restore Markdown/Git primacy |
| agent capture | agent voice replaces human arbitration | require explicit human acceptance |

## 17. Open Continuations

This first draft leaves several continuations open. A first consolidation rule has now been chosen: traverse the corpus from the most recent semantic updates backward, and update each document's continuation section only where the real situation has changed. Each update should distinguish:

- what has been done since the last significant semantic update;
- which paths of rational exploration remain open;
- which apparent tasks are no longer open because they were completed, superseded, or transformed into another container.

Current open continuations:

1. **CLI issue integration** — decide whether `cogentia.js` v2 should regain read-only GitHub Issue commands or leave issue work to a Web/GitHub layer.
2. **Significant-update metric** — implement a more reliable distinction between maintenance changes and semantic updates.
3. **Redirect schema** — stabilize frontmatter names for aliases and moved documents: `document_role: alias`, `redirect_to`, `moved_at`, `previous_paths`, `canonical_target`.
4. **Symmetric-derived policy** — define a short decision schema for documents that are derived but temporarily sovereign.
5. **Web workspace model** — specify the per-document Redactor/Reviewer/Document session state and how it maps to local files and GitHub branches.
6. **Exploration path query** — add a command or view that lists open possibilities, active continuations, issues, work-in-progress docs, and unresolved objections together.
7. **Tutorial upkeep** — keep `cogentia_js_tutorial.md` regenerated from the current v2 CLI source and associated doctrine as the command surface evolves.
8. **Stabilizer concept consolidation** — connect the Living Corpus, Cogentia CLI, COP, DHITL, and source/derived workflow explicitly as procedural anti-Ubik stabilizers.

These should not all become immediate implementation work. They are paths of exploration. The user chooses the order.

## 18. Minimal Formula

The Living Corpus can be summarized as:

```text
Git gives memory.
Markdown gives literate form.
Links give navigation.
Indexes give maps.
Concepts give vocabulary.
Continuations give resumability.
Issues give memory in tension.
Derived products give situated publication.
Agents give acceleration.
Humans give arbitration.
```

And the operational rule:

> `cogentia.js` should make the corpus visible, navigable, checkable, and resumable; it should not pretend that mechanical structure is semantic judgment.
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Rendre capable — noyau doctrinal provisoire](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/noyau_doctrinal_rendre_capable.md)
- [Cogentia](../COGENTIA.md)
- [Cogentia Commons — Public by Default, Private by Exception](cogentia_commons_visibility_and_private_modes.md)
- [Research Index — Cogentia](index.md)
- [Corpus Start Here — Carte globale du Corpus](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/corpus-map.md)
- [Documents - All Tracked Repos](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/documents.md)
<!-- END_AUTO: backlinks -->
