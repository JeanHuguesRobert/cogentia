---
title: "cogentia.js — Tutorial and Near-Specification"
subtitle: "From core ideas to workflows to command reference — sufficient for a faithful re-implementation in another language, storage layer, or rendering format"
version: "0.1"
status: "historical-derived — v0.10/v1 tutorial pending v2 refresh"
date: "2026-05-31"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
language: "en"
target_implementation: "cogentia.js v0.10.0"
derived_by: agent
derived_from: "scripts/cogentia.js source and manifest; research/agent_resumable_cli.md; research/cognitive_packets.md; research/pipeline.md; research/derived_products.md"
tags:
  - cogentia
  - cogentia.js
  - cli
  - tutorial
  - specification
  - re-implementation
  - reference
  - workflows
  - distributed-knowledge-graph
  - continuation-protocol
  - cognitive-packets
  - cogentia-commons
related_projects:
  - "Cogentia Commons"
  - "Cogentia Pipeline"
  - "Cognitive Packets"
  - "Continuation Protocol"
  - "Second Method"
ai_assisted_by:
  - "Claude"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_js_tutorial.md
last_stamped_at: 2026-06-01
corpus_role: "derived"
derived_product_type: "tutorial"
---

> **Historical auto-generated tutorial.** This document was produced from the live `cogentia.js v0.10.0` source, its manifest, and the corpus's existing doctrinal papers (see *Associated documents* below). It is no longer descriptive of the current `scripts/cogentia.js` v2 CLI. Treat it as a historical derived product and near-specification for the older v0.10/v1 surface until a refreshed v2 tutorial is generated from the current source.

---

## Object and associated documents

### Object of this document

This tutorial combines three roles: a **tour** of `cogentia.js v0.10.0`, a **workflow handbook** for daily use, and a **near-functional specification** sufficient for someone to re-implement the tool in another language, against another persistence layer, or for another rendering pipeline. It is *not* doctrine — the doctrine is the *Discours de la seconde méthode*; this tutorial is the operational gloss on top of the existing reference implementation.

The document follows the corpus's [`## Object and associated documents`](https://github.com/JeanHuguesRobert/cogentia/blob/main/research/pipeline.md#object-and-associated-documents) convention: clickable links live in the section below, not in the YAML frontmatter (which is plain text by spec).

### Associated documents

This tutorial should be read together with:

- [Discours de la seconde méthode](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) — founding methodological doctrine v1.0; names `cogentia.js` as canonical tooling;
- [Agent-Resumable CLI](agent_resumable_cli.md) — the continuation-protocol paper; defines the v1 research pattern and documents which parts were consolidated into the current v2 surface;
- [Cognitive Packets](cognitive_packets.md) — envelope + payload format that generalises the continuation pattern beyond the CLI;
- [Pipeline](pipeline.md) — operational method note: *pipeline on the surface, packet network in depth*; the working method this tutorial describes the tooling for;
- [Derived Products](derived_products.md) — source ↔ derived split; this tutorial is a derived product whose v2 refresh requires agent judgment;
- [Cogentia Commons Working Paper](Cogentia_Commons_Working_Paper.md) — collective-scale foundation; the methodology layer the CLI implements;
- [Cogentia Commons — MVP Specification](cogentia_commons_mvp_spec.md) — the v1 architecture; lists the new subcommands (`manifest`, `kernel`, `objection`, `publish`, `audit`, `sanction`, `rebuild`) that extend the v0.10.0 surface;
- [Cogentia Commons — Method Packets](cogentia_commons_method_packets.md) — infrastructure for producing, transmitting, criticising and improving packets;
- [Cogentia Commons — Continuation Snapshot](cogentia_commons_continuation.md) — session-handoff document; entry point for whoever picks up Commons next;
- [Cogentia — the framework, in five distinctive moves](../COGENTIA.md) — the identity document, ~5-minute read;
- [The Knowledge Mesh (Decentralized Wiki)](../docs/knowledge_mesh.md) — how humans and agents curate, cross-reference, and navigate the corpus;
- [Agent Navigation Guide (Context Server)](../docs/agent_context_server.md) — meta-prompt for AI agents.

---

## 0. What `cogentia.js` is

`cogentia.js` is the operational CLI of the **Cogentia Commons** methodology: a **distributed, git-anchored, AI-connectable, audit-trailed knowledge production substrate** spanning multiple repositories. It implements the [Discours de la seconde méthode](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) as a tool — *publish process, treat objections as first-class, structure for machine readability, let the corpus be its own evidence, encode the boundary in the architecture*.

It is intentionally:

- **Zero-dependency Node.js.** No npm install; a single source file (`scripts/cogentia.js`).
- **MIT-licensed.** No copyleft on the tool itself.
- **Local-first.** Operates on a working tree of sibling git repositories. Never opens a network connection except for explicit GitHub API calls (`forks`, `check` external links).
- **Audit-best-effort.** Every state-changing call appends one line to `.cogentia/audit.jsonl`. Audit failures never fail the command.
- **Provider-neutral.** Continuations and packets carry no vendor lock. The soundness test is binding: *can the current AI agent be replaced by a human or by another agent without modifying `cogentia.js`?*

The reference implementation is at `cogentia/scripts/cogentia.js` (~6000 lines). The doctrinal anchor is [`barons-Mariani/research/second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md). The published name `cogentia.js` is part of that doctrine; a re-implementation in another language should keep the name or qualify it (e.g. `cogentia-rs`, `cogentia.py`) to preserve traceability.

---

## 1. Core ideas

### 1.1 The corpus is a distributed knowledge graph

The unit of organisation is a **registered repository**. The registry lives in `.cogentia.json` (typically in a *profile-repo* that contains nothing but the registry; today this is `JeanHuguesRobert/`). Every registered repo is expected to contain a [`research/index.md`](index.md) with two tables: **Published** (this repo's authoritative documents) and **Referenced** (documents hosted elsewhere, intellectually connected here).

The **network-symmetry rule**: every *Referenced* row from repo A pointing at repo B must correspond to a *Published* row in repo B. A document has exactly one canonical home; everywhere else it is referenced.

The current corpus is six repositories — `cogentia` (meta-node), `marenostrum`, `FractaVolta`, `barons-Mariani`, `inseme`, `Inox`. With Inox added 2026-05, the directed cross-reference graph closed as a K6 (30 directed edges).

### 1.2 Auto-injected blocks vs curated content

Every research document may contain one or more **auto-managed blocks** delimited by HTML comments:

```html
<!-- BEGIN_AUTO: trails -->
...
<!-- END_AUTO: trails -->
```

Recognised block names:

| Name              | Content                                                         | Generated by         |
| ----------------- | --------------------------------------------------------------- | -------------------- |
| `trails`          | Trail navigation header (Previous / Next per curated playlist)  | `cogentia trails`    |
| `backlinks`       | "These documents link to this file" list                        | `cogentia backlinks` |
| `readme_index`    | Index of the docs in a README's own subtree (opt-in; root or subdir README) | `cogentia readme` |
| `registered_repos`| Per-repo table (in [`corpus-status.md`](corpus-status.md))                          | `cogentia corpus-status` |
| `graph`           | Mermaid cross-reference graph (in [`corpus-status.md`](corpus-status.md))           | `cogentia corpus-status` |
| `concepts`        | Concept summary table (in [`corpus-status.md`](corpus-status.md))                   | `cogentia corpus-status` |
| `concept_graph`   | Mermaid concept graph (in [`corpus-status.md`](corpus-status.md))                   | `cogentia corpus-status` |
| `published`       | Per-repo published-document table (in [`corpus-status.md`](corpus-status.md))       | `cogentia corpus-status` |
| `possibilities`   | Per-repo "What Remains Possible" list (in [`corpus-status.md`](corpus-status.md))   | `cogentia corpus-status` |

Anything **outside** these blocks is **human-curated and preserved across refreshes**. The split is load-bearing: it lets [`corpus-status.md`](corpus-status.md) (and equivalents) be both auto-regenerated AND carry hand-written "What Is Proved" / "Open Objections" sections that no generator overwrites.

### 1.3 Continuations as first-class objects (`cogentia.continuation.v1`)

A continuation is a typed JSON object that **suspends a judgment** at the boundary between deterministic computation and required reasoning. It carries everything the next agent (human or machine) needs to resume: task, context, alternatives, expected result schema, resume command.

Storage: `.cogentia/continuations/<id>.json` per registry (each continuation is one file). Status transitions: `active → completed | aborted` (success terminates and emits a dormant successor; abort terminates and emits a dormant successor). Dormant successors carry the chain non-terminally — *history never 100% ends* (Heraclitean follow-up).

### 1.4 Cognitive Packets as transport

A **cognitive packet** is `envelope + payload`:

- The **envelope** is kind-agnostic (protocol header, provenance, context reference, routing). Any agent can queue, archive, or acknowledge a packet by reading the envelope alone.
- The **payload** is kind-specific (`continuation`, `objection`, `hypothesis`, `decision`, `failure`, `routing`). Only an agent that understands the declared kind interprets it.

The `cogentia.continuation.v1` object **is** the canonical payload of a packet whose `packet_kind = continuation`. See [`research/cognitive_packets.md`](cognitive_packets.md) for the envelope/payload specification.

### 1.5 Typed concept registry

Each repo may carry [`research/concepts.md`](concepts.md), a typed glossary of concepts. Each entry has Type, Scope (Global / repository-specific / project-specific), Status (Seed / Working / Defined / Operational / Canonical), short definition, and optional parent / child / related concept links. The registry is consumed by `cogentia concepts` to validate orphan references and build a Mermaid concept graph.

### 1.6 Trails (curated reading paths)

A **trail** is an ordered playlist of documents at `cogentia/research/trails/<slug>.md`. Running `cogentia trails` auto-injects "⬅️ Previous / ➡️ Next" headers into every target document. A document may belong to multiple trails — each gets its own header line.

### 1.7 Cross-document references: the Object and Associated documents convention

YAML frontmatter is plain text by spec — fields like `related_projects:` carry *names*, not clickable links. The corpus complements the frontmatter with a Markdown header section that DOES carry links:

```markdown
## Object and associated documents
   (or, in French: ## Objet et documents associés)

### Object of this document
   (or: ### Objet de ce document)

(plain prose stating the document's purpose, scope, and intent)

### Associated documents
   (or: ### Documents associés)

This document should be read together with:

- [Document Name](relative/or/absolute/url) — *short descriptor*;
- ...
```

**Placement**: after title + subtitle, before the body. Bilingual based on the document's `language:` field.

**Link form**: relative path within the same repo; absolute GitHub URL across repos. Cite documents by their name (e.g. *Pipeline*, *Cognitive Packets*) — not by filename — when the name carries doctrinal weight; cite by `` [`filename.md`](filename.md) `` for documents whose name *is* their identifier.

**Editorial discipline**: *anywhere* in body prose, prefer `[backtick-text](path.md)` over bare backtick-text when the backtick names a corpus document. The `cogentia.js links` command (v0.10.0+, see §4.7) automates this sweep — `links --check` previews, `links --fix` applies. The tool resolves each backtick against the corpus-wide doc index, prefers same-repo matches (relative path), falls back to absolute GitHub URLs across repos, and skips fenced code blocks, headings, already-linked refs, and unresolvable names (planned-but-not-published docs, placeholders).

### 1.8 Frontmatter as Level 1 / Level 2 / Level 3

Every published document carries YAML frontmatter, classified by depth:

- **Level 1**: minimal (`title`, optional `description`).
- **Level 2**: substantive (Level 1 + `author`, `affiliation`, `date`, `license`, `status`, sometimes `version`).
- **Level 3**: doctrinal full (Level 2 + `repository`, `intended_path`, `canonical_url`, `last_stamped_at`, `tags`, `related_projects`, `ai_assisted_by`).

The dialect is documented in [`research/pipeline.md`](pipeline.md) and [`research/derived_products.md`](derived_products.md) for the *content-level* fields; here we define the *machine-level* fields (`canonical_url`, `last_stamped_at`, `repository`, `intended_path`) that `cogentia.js` reads.

### 1.9 Audit trail as first-class deliverable

Every state-changing call appends one JSON line to `.cogentia/audit.jsonl` in the registry-containing directory. Format:

```json
{
  "ts": "ISO-8601",
  "actor": {
    "git_user_name":  "string|null",
    "git_user_email": "string|null",
    "process_user":   "string|null",
    "invoked_via":    "cogentia.js"
  },
  "command":   "string (e.g. 'continuation.emit')",
  "args":      {...},
  "result":    {...},
  "narrative": { "short": "...", "long": "...", "chat_urls": [...] } | null
}
```

Read-only commands (`list`, `status`, `scan`, `graph`, `check`) do not write to the audit log. The audit log is the **process layer of the second method** in operational form.

### 1.10 The cogentia:// URI scheme

### 1.11 Inversion of control extended to meta-operations

The core inversion of control ("the tool emits a continuation instead of calling an embedded AI") can and should apply even to decisions *about the continuation system itself*.

Examples observed in practice:
- Deciding whether a long-dormant continuation is still relevant (`human_judgment_on_continuation`).
- Cleaning the continuation queue in a governed way (`prune_continuation_judgment`).

This creates a coherent recursive model: any judgment that is not mechanically obvious can be externalized, including judgments on the judgment objects.

---

For cross-repo references with commit-pinned addressing:

```
cogentia://<repo>/<sha>/<path>[#fragment]
```

Example: `cogentia://barons-Mariani/a1b2c3/research/second_method.md#rule-0`. Used by the planned Commons workflows (`objection submit`, `audit`, `publish`). Resolution: walk the registry → find the named repo → check commit hash → return the path within. Implementations may also accept partial SHA prefixes (8+ chars) and `HEAD` as a special token.

---

## 2. Storage model

A faithful re-implementation must preserve this layout. Field names and paths are normative; ordering within JSON objects is not.

### 2.1 Registry (`.cogentia.json`)

Lives in a *registry-host* directory (typically a profile-repo). One JSON object:

```json
{
  "repos": [
    { "name": "cogentia",        "path": "../cogentia" },
    { "name": "barons-Mariani",  "path": "../barons-Mariani" },
    ...
  ]
}
```

Paths are **relative to the registry file's containing directory**. `name` is the registered identifier; `path` is the on-disk location. Discovery walks upward from `cwd` to find the nearest `.cogentia.json`, or honours `--registry <path>` / `COGENTIA_REGISTRY=<path>`.

### 2.2 Audit log (`.cogentia/audit.jsonl`)

JSONL (one JSON object per line). Append-only. Lives in `<registry-dir>/.cogentia/audit.jsonl`. See §1.9 for shape. **Best-effort writes**: failure to write must never fail the command.

### 2.3 Continuations (`.cogentia/continuations/<id>.json`)

One file per continuation. Id format: `ctn_<8 hex chars>` (e.g. `ctn_a3f9b1c2`). File contents:

```json
{
  "type":                   "continuation",
  "protocol":               "cogentia.continuation.v1",
  "id":                     "ctn_xxxxxxxx",
  "topicId":                "urn:cop:topic:cogentia/<repo>[/<paper>]",
  "agent":                  "*",
  "task":                   "short string",
  "context":                {...},
  "alternatives":           [{ "id": "alt-a", "description": "..." }, ...],
  "expected_result_schema": { "field": "type-string", ... },
  "constraints":            {...},
  "status":                 "active|completed|aborted|dormant",
  "createdAt":              "ISO-8601",
  "priority":               0,
  "predecessor":            "ctn_xxxxxxxx (optional)",
  "successor":              "ctn_xxxxxxxx (optional)",
  "failed_alternatives":    [{ "id": "alt-b", "reason": "...", "failed_at": "ISO-8601" }],
  "step_result":            {...},
  "resume":                 { "command": "..." }
}
```

A **dormant** continuation has only `id`, `topicId`, `protocol`, `type`, `agent`, `predecessor`, `status: "dormant"`, `createdAt`. Activating it with `continuation emit --from <id>` fills in the rest.

### 2.4 Step result format

The input to `continuation resume`:

```json
{
  "type":               "step_result",
  "continuation_id":    "ctn_xxxxxxxx",
  "status":             "success|failed|aborted|needs_more_context",
  "chosen_alternative": "alt-a (on success)",
  "failed_alternative": "alt-b (on failed)",
  "reason":             "string",
  "confidence":         0.0,
  "...":                "domain-specific fields per continuation.expected_result_schema"
}
```

Validation is **loose by default** (warnings to stderr; resume proceeds). `--strict` or `COGENTIA_VALIDATE=strict` blocks resume on validation errors.

### 2.5 Heraclitean follow-up

When a continuation transitions to `completed` or `aborted`, the implementation emits a **dormant successor** (new id, same `topicId`, `predecessor` set to the closed continuation's id). The closed continuation gets its `successor` field populated. This is non-optional: the chain must remain non-terminal.

### 2.6 Concepts (`research/concepts.md`)

Markdown with one section per concept, plus a YAML-like attribute block per concept:

```markdown
## Cogentia Pipeline

**Type:** methodology / packet-based transformation network
**Scope:** Global
**Status:** Defined

**Short definition:**
...

**Parent concepts:**
- Cogentia Commons
- Cognitive Packet

**Child concepts:**
- Source Document
- Derived Product

**Reference documents:**
- `research/pipeline.md`
- `research/derived_products.md`
```

Scope vocabulary: `Global`, `project-specific`, `repository-specific`.
Status vocabulary: `Seed`, `Working`, `Defined`, `Operational`, `Canonical`.

### 2.7 Trail playlists (`research/trails/<slug>.md`)

Markdown with an ordered list. Each item starts with a numbered bullet, contains exactly one markdown link as its first non-numeric content, then an italic descriptor on the next line:

```markdown
# Trail: From Method to Machine

*The origin story of Cogentia — from philosophical axiom to operational infrastructure.*

---

1. [Discours de la seconde méthode](https://...)
   *The founding doctrine. ...*

2. [Pipeline — From cognitive packets to source documents and derived products](../pipeline.md)
   *The operational counterpart of the Discours. ...*
```

A trail injects `BEGIN_AUTO: trails` blocks into each linked document, with `⬅️ Previous` / `➡️ Next` references.

### 2.8 Frontmatter fields read by `cogentia.js`

Machine-significant fields (Level 3):

| Field              | Read by                                | Written by               |
| ------------------ | -------------------------------------- | ------------------------ |
| `canonical_url`    | `check`, `documents`                   | `stamp`                  |
| `last_stamped_at`  | `frontmatter check`, drift detection   | `stamp`                  |
| `repository`       | reverse-lookup of doc → repo           | `frontmatter promote`    |
| `intended_path`    | path-drift detection                   | author (manual)          |
| `status`           | `frontmatter check` (controlled vocab) | author                   |
| `last_modified_at` | freshness                              | author / git hook        |

Status controlled vocabulary: `draft`, `working paper`, `working notes`, `living research note`, `method note`, `source document`, `derived product`, `canonical`, `deprecated`, `superseded`, `idea`, `seed`. Extending this vocabulary is a corpus-policy decision, not a tool decision.

### 2.9 `.cogentiaignore`

One pattern per line. Patterns without `/` match basename at any depth; patterns with `/` match the full relative path. Globs: `*` (single segment), `**` (multi-segment). Built-in defaults that should not be re-declared:

```
README.md
LICENSE*
TODO.md
CHANGELOG.md
CHANGES.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
```

---

## 3. Workflows

### 3.1 First-time setup

```bash
# from a fresh checkout
mkdir -p ~/work && cd ~/work
git clone https://github.com/JeanHuguesRobert/cogentia
git clone https://github.com/JeanHuguesRobert/JeanHuguesRobert  # registry host
git clone https://github.com/JeanHuguesRobert/marenostrum
# ...

cd JeanHuguesRobert
node ../cogentia/scripts/cogentia.js add ../cogentia
node ../cogentia/scripts/cogentia.js add ../marenostrum
# ...

node ../cogentia/scripts/cogentia.js list      # confirm registry
node ../cogentia/scripts/cogentia.js status    # quick health check
node ../cogentia/scripts/cogentia.js check     # validate all internal links
```

After this, every `cogentia.js` invocation from any subdirectory finds the registry via upward search, or uses `COGENTIA_REGISTRY=~/work/JeanHuguesRobert`.

### 3.2 Daily session ritual

```bash
cogentia drift          # detect ahead/behind/diverged across all repos; --pull to sync behind
# ... do work ...
cogentia refresh        # corpus-status + backlinks + trails + documents + readmes + derived
cogentia lint           # single-table health report (unreferenced, frontmatter, drift)
# git add / commit / push  (manual — DHITL)
cogentia verify         # post-commit ritual: every repo committed, pushed, in sync
```

These commands frame the day-in / day-out flow: `drift` opens the session, `refresh` consolidates derived views (mechanical regen + delegated continuations for judgment-requiring products — see §3.3.1), `lint` is the pre-commit gate, and `verify` is the post-commit safety net that re-fetches and catches a forgotten `git add` or unpushed commit (because to err is human).

### 3.3 Authoring a new document

```bash
# 1. write research/foo.md with full Level 2/3 frontmatter (see §2.8)
# 2. add it to research/index.md (Published table) — manually or via:
cogentia ref research/foo.md

# 3. stamp it to inject canonical_url:
cogentia stamp research/foo.md

# 4. refresh derived views
cogentia refresh

# 5. commit
git add research/foo.md research/index.md research/corpus-status.md research/documents.md
git commit -m "research: add foo.md"
```

For cross-corpus references: if `foo.md` is cited from another repo, that repo's [`research/index.md`](index.md) Referenced table must include the row (network-symmetry rule).

### 3.3.1 Maintaining derived products (READMEs, tutorials, trails, websites)

Beyond the symmetric, regex-generated views (backlinks / trails / documents / corpus-status), the corpus carries **judgment-requiring derived products** that a regex must not author. These are refreshed by **delegation to an intelligent agent** through typed continuations (`cogentia.continuation.v1`), not mechanical writing. See [`pipeline.md`](pipeline.md) §4.14 and the typology in [`derived_products.md`](derived_products.md) §6.7.

**READMEs** — `cogentia readme` (also inside `refresh`):

1. **Mechanical index (opt-in).** Any README — repo root or any subdirectory — that carries the marker
   ```markdown
   <!-- BEGIN_AUTO: readme_index -->
   <!-- END_AUTO: readme_index -->
   ```
   gets a deterministic, alphabetical index of the Markdown documents in *that README's own subtree*. A README without the marker is never touched, so hand-written public pages stay fully manual.

2. **Profile README (derived product).** The root README of the user-attached profile repository (`github.com/<user>/<user>`) is **not** a mechanical index. It is a public, human-facing page authored *from* the corpus — an asymmetric derived product. `cogentia readme` emits an idempotent continuation delegating its refresh to the agent, citing the sources to draw from (e.g. `research/index.md`, `research/agent_brief.md`, `CONTEXT.md`, `POSSIBILISM.md`, `PROJECTS.md`, `TIMELINE.md`).

**Tutorials, reading trails, websites** — `cogentia derived` (also inside `refresh`) emits **one grouped continuation per type**, idempotent, with the items listed in `context.items`. Detection is hybrid:

| Type | How detected | Examples |
|---|---|---|
| Tutorials & opt-in docs | Frontmatter `derived_by: agent` (+ `derived_from`) | `cogentia_js_tutorial.md` (this file), `Inox/research/learning-inox.md` |
| Reading trails | `research/trails/*.md` by convention | `cogentia/research/trails/from_method_to_machine.md`, … |
| Websites | Directory contains `_config.yml` (root or subdirectory) | `cogentia/`, `barons-Mariani/`, `marenostrum/`, `FractaVolta/` (+ `FractaVolta/docs/`), `inseme/` |

The agent decides, per item, whether a refresh is actually warranted. At most one active delegation exists per type, so re-running `refresh` does not flood the queue.

Taken together — mechanical views that regenerate themselves and judgment-requiring products that are delegated and refreshed on demand — these artefacts begin to make the corpus genuinely **reactive**: documents (and now also websites and other rendered surfaces, not only Markdown) that stay *live* and refresh in response to changes in their sources rather than silently drifting.

### 3.4 Cross-linking two repositories (network symmetry)

When repo B's document references a document in repo A:

1. In **A**: confirm the document is listed in [`research/index.md`](index.md) Published.
2. In **B**: add a row to [`research/index.md`](index.md) Referenced pointing at `https://github.com/JeanHuguesRobert/A/blob/main/research/X.md`.
3. Run `cogentia check` — broken links surface in the report.
4. Optionally run `cogentia graph` to verify the directed edge appears.

The corpus invariant `cogentia.js graph` enforces is *every Referenced row resolves to a Published row in the named repo*; missing the dual edge causes a `check` failure.

### 3.5 Emitting and resolving a continuation

When a tool reaches a decision point that requires judgment outside its deterministic boundary:

```bash
# 1. emit (the tool creates a task.json and calls cogentia)
cat > task.json <<EOF
{
  "task": "decide whether to merge X into research/index.md",
  "context": { "file": "research/X.md", "reason": "uncatalogued" },
  "alternatives": [
    { "id": "merge", "description": "add to Published" },
    { "id": "ignore", "description": "add to .cogentiaignore" },
    { "id": "delete", "description": "remove file" }
  ],
  "expected_result_schema": { "chosen_alternative": "string", "reason": "string" }
}
EOF
cogentia continuation emit task.json --paper research/X.md
#   → emits ctn_a3f9b1c2 as active; writes file; prints resume command

# 2. (offline) a human or another agent reads ctn_a3f9b1c2 and produces:
cat > step_result.json <<EOF
{
  "continuation_id": "ctn_a3f9b1c2",
  "status": "success",
  "chosen_alternative": "merge",
  "reason": "X is the canonical home for the kernel extractor sub-spec"
}
EOF

# 3. validate (pre-flight, optional)
cogentia continuation validate ctn_a3f9b1c2 step_result.json

# 4. resume
cogentia continuation resume ctn_a3f9b1c2 step_result.json
#   → transitions to completed; emits dormant successor; logs audit
```

Failed branch (the alternative didn't work):

```bash
cogentia continuation fail ctn_a3f9b1c2 merge --reason "X is co-owned with Y; need their assent"
#   → records failed_alternative; continuation stays active for retry with remaining alternatives
```

Abort (cannot decide):

```bash
cogentia continuation abort ctn_a3f9b1c2 --reason "blocked on external policy decision"
#   → terminates; emits dormant successor with predecessor=ctn_a3f9b1c2
```

### 3.6 Prioritising the continuation queue

```bash
cogentia continuation queue --status active        # see current order
cogentia continuation prioritize ctn_a3f9b1c2 --priority 10
cogentia continuation prioritize ctn_b4c5d6e7 --priority 5
cogentia continuation queue --status active        # now sorted by priority desc, createdAt asc
```

Priority is an integer; default 0; higher sorts first.

### 3.7 Exporting a continuation for an external agent

```bash
# copy-paste form (stdout)
cogentia continuation export ctn_a3f9b1c2

# file form, with predecessor + successor in one payload
cogentia continuation export ctn_a3f9b1c2 --bundle -o packet.json
```

The exported JSON is self-contained: an external agent that understands the schema can resume without access to the original `.cogentia/continuations/` directory, provided it returns a valid `step_result` (which can then be `resume`d locally).

### 3.8 Auditing what happened to a continuation

```bash
cogentia continuation log ctn_a3f9b1c2
```

Replays every audit entry referencing the id (emit, prioritize, validate, export, resume, fail, abort, log itself). Includes `narrative.short` annotations when present. Works even after `prune` removes the continuation file, as long as `.cogentia/audit.jsonl` still carries the trace.

### 3.9 Externalizing meta-decisions on continuations

It is sometimes necessary to decide the fate of existing continuations themselves (e.g. during cleanup with `prune`, or when an agent wants a human opinion on a specific continuation).

In line with the inversion of control principle, `cogentia.js` offers two complementary mechanisms:

- **Mechanical pruning** (`continuation prune --mechanical`): The tool can autonomously delete clearly obsolete continuations (e.g. aborted ones, very old dormant ones without task, obvious test artifacts).
- **Judgment emission**: For ambiguous cases, the tool emits a dedicated continuation (`prune_continuation_judgment` or `human_judgment_on_continuation`) instead of deciding locally.

The dedicated helper:

```bash
cogentia continuation consult <id> [--question "..."]
```

creates a well-formed continuation that asks the human (or another agent) for a structured decision on the target continuation. By default, it includes strong guidance for AI agents to perform genuine analysis before proposing an answer (`analysis_instructions`, pre-defined `alternatives`, and an `expected_result_schema` that encourages `nuances` and `follow_up`).

This pattern allows "continuations about continuations" (meta-continuations) while keeping the core tool deterministic and auditable.

### 3.10 Registering a concept

```bash
# 1. ensure research/concepts.md exists
cogentia concepts init                    # bootstraps the file with header + Status scale

# 2. add a concept section manually (see §2.6 format)

# 3. validate
cogentia concepts check                   # orphan references, duplicates, scope warnings
cogentia concepts graph                   # Mermaid graph (also auto-injected in corpus-status)
cogentia concepts ref Pipeline            # show all backreferences to a concept
```

### 3.10 Curating a trail

```bash
# 1. write research/trails/<slug>.md per §2.7 format

# 2. inject Previous/Next headers
cogentia trails

# 3. observe — each linked document now has a <!-- BEGIN_AUTO: trails --> block
```

### 3.11 Diagnosing frontmatter problems

```bash
cogentia frontmatter check                # per-repo report
cogentia frontmatter check cogentia       # one repo only
cogentia frontmatter promote research/X.md  # add Level 2 skeleton (placeholder fields)
cogentia frontmatter promote --batch       # bulk-inject author/affiliation/license invariants
cogentia frontmatter schema                # canonical field reference
```

### 3.12 Inspecting cross-corpus state (read-only)

```bash
cogentia state --json | jq .              # full snapshot (registry + per-repo status + identity)
cogentia status                            # quick text view
cogentia graph                             # Mermaid cross-reference graph
cogentia forks cogentia                    # list forks of a registered repo on GitHub
cogentia documents                         # consolidated cross-corpus catalogue
cogentia query "second method"             # structural keyword search
cogentia bundle --concept Pipeline         # compile sub-graph into one LLM-ready payload
```

### 3.13 The personal scheduler (fractal `.cogentia/SCHEDULE.md`)

Each scope (workspace root, a repo, a sub-directory) may carry its own `.cogentia/SCHEDULE.md`. The scheduler walks the tree from CWD upward, aggregating per scope.

```bash
cogentia todo list                          # at current scope
cogentia todo list --global                 # aggregated across all scopes
cogentia todo add "fix the documents.md regen ordering"
cogentia todo done <id>
cogentia todo defer <id> --until 2026-06-01
cogentia todo drop <id>
cogentia next                               # apply policy (priority → overdue → FIFO)
cogentia next --pick                        # mark item Active + audit
```

### 3.14 Continuous Integration

Recommended pre-commit hook:

```bash
cogentia install-hooks      # generates pre-commit hooks for all registered repos
```

The hook runs:

```bash
cogentia drift --check --strict
cogentia lint --strict
```

CI workflow:

```bash
cogentia check              # internal + external link validation
cogentia frontmatter check  # diagnose missing fields
cogentia concepts check     # orphan references
```

---

## 4. Command reference

### 4.1 Conventions

Every command:

- Reads the registry via upward search OR `--registry` OR `COGENTIA_REGISTRY`.
- Honours global flags: `--json`, `--cwd`, `--narrative-short`, `--narrative-long`, `--chat-url`, `--github-token`.
- Exits 0 on success, non-zero on user-facing error (`die()` path) or schema invalidity in strict modes.
- Appends one audit entry per state-changing call (read-only commands do not).

Side-effect taxonomy used below:

- *registry-write* — modifies `.cogentia.json`
- *audit-log* — appends to `.cogentia/audit.jsonl`
- *file-write* — modifies a markdown file (research/index.md, corpus-status.md, etc.)
- *fs-create* — creates a file or directory
- *editor* — invokes the user's `$EDITOR`
- *network* — performs a network call (GitHub API, HTTP HEAD)

### 4.2 Registry & inspection

| Command | Signature | Effects |
|---|---|---|
| `add <name\|path>` | Register a repo. Resolves by directory name (upward search from CWD) or by path. | registry-write, audit-log |
| `remove <name>` | Unregister a repo. | registry-write, audit-log |
| `list` | Tabular view: name, path, branch, last commit, index ok. | (none) |
| `status` | Per-repo quick health: total .md, ignored, unreferenced. | (none) |
| `whoami` | Detected git identity + registry location. | (none) |
| `state` | Denormalised JSON snapshot (replaces list+status+whoami in one call). | (none) |
| `manifest` | OpenAI-compatible tool definitions for every command. Use `--json`. | (none) |

### 4.3 Discovery & scanning

| Command | Signature | Effects |
|---|---|---|
| `scan` | List every markdown per repo, flag unreferenced (not in [`research/index.md`](index.md) Published table AND not matched by `.cogentiaignore`). | fs-create (research/index.md if missing) |
| `init [name]` | Bootstrap [`research/index.md`](index.md) with Jekyll-ready scaffold. | fs-create, audit-log |
| `ref <file>` | Emit a [`research/index.md`](index.md) row for the file. Returns the markdown line on stdout. | (none) |
| `open [name]` | Open [`research/index.md`](index.md) in default editor. | editor |
| `explain-ignore <file>` | Report whether the file is matched by `.cogentiaignore` and which pattern. | (none) |

### 4.4 Git lifecycle

| Command | Signature | Effects |
|---|---|---|
| `sync` | `git pull --ff-only` in every registered repo. | (file-write via git) |
| `drift` | Fetch + report ahead/behind/diverged. `--check` for cached only; `--pull` fast-forwards behind repos; `--strict` exits non-zero on drift. | network (fetch), file-write via git |
| `commit propose <repo>` | `--message "<m>" [--files f1,f2,…\|--all] [--no-push]`. Emits a `commit_proposal` continuation; SHA-1 stale-guard per file recorded at proposal time. Parses `Closes #N` / `Fixes #N` keywords so the proposal can later be located by issue number. Read-only on git. *DHITL ceremony — never commits on its own.* | fs-create (continuation), audit-log |
| `commit apply <ref>` | `<ref>` is either `ctn_xxxx` or `#N`/`N` (a referenced issue). Runs `git add` + `git commit` (+ `git push` unless `--no-push` was set at proposal time). **Refuses** if any of the proposed files changed (SHA-1) since the proposal — re-propose instead of overriding. Emits a dormant Heraclitean successor. | file-write via git, network (push), audit-log |
| `commit reject <ref>` | Discard the proposal. | file-write (continuation update), audit-log |

### 4.5 Cross-corpus graph & validation

| Command | Signature | Effects |
|---|---|---|
| `graph` | Mermaid cross-reference graph across all registered repos. `--include-orphans` shows degree-0 nodes. | (none) |
| `check` | Validate internal links + external GitHub URLs across all [`research/index.md`](index.md). | network (HEAD requests) |
| `stamp <file>` | Inject `canonical_url` and `last_stamped_at` into the file's frontmatter, anchored to the file's GitHub URL (current `main`/`master` branch). | file-write, audit-log |
| `stamp --all [--check]` | Stamp every research-grade .md in every registered repo. `--check` for dry-run. | file-write (×N), audit-log |
| `corpus-status [name] [--check]` | Refresh [`research/corpus-status.md`](corpus-status.md) per repo. Auto-regenerates structural sections (Registered Repositories, Cross-Reference Graph, Concepts, Concept Graph, Published, Possibilities). Preserves manually-curated *What Is Proved* and *Open Objections*. Bootstraps the file if missing. | file-write, audit-log |

### 4.6 Documentation generation

| Command | Signature | Effects |
|---|---|---|
| `jekyll` | Ensure Jekyll frontmatter (title, layout, nav_order) in all [`research/index.md`](index.md). | file-write |
| `init-jekyll` | Generate `_config.yml` for GitHub Pages (just-the-docs theme). | fs-create |
| `backlinks` | For every cross-document markdown link, inject a `<!-- BEGIN_AUTO: backlinks -->` block in the target listing all sources. Idempotent (sorts deterministically). | file-write |
| `trails` | For every trail playlist under `cogentia/research/trails/`, inject `<!-- BEGIN_AUTO: trails -->` blocks with Previous/Next links in each listed document. | file-write |
| `documents` | Refresh `research/documents.md` in the registry repo: consolidated cross-corpus catalogue with reverse-chrono activity and chronological authorship tables. Bulk-pass commits filtered out. | file-write, audit-log |
| `readme` | Refresh README files. (1) Mechanical: README (root or subdir) carrying a `<!-- BEGIN_AUTO: readme_index -->` marker gets a regenerated index of the docs in its subtree. (2) The user-attached profile README is delegated to the agent as a derived product via a continuation, never auto-written. See §3.3.1. | file-write, audit-log |
| `derived` | Delegate judgment-requiring derived products (auto-generated tutorials, reading trails, websites) to the agent via grouped continuations — one per type, idempotent. Detection: frontmatter `derived_by: agent` for docs; `research/trails/` by convention; `_config.yml` directories for websites. See §3.3.1 and [`derived_products.md`](derived_products.md) §6.7. | file-write, audit-log |

### 4.7 Operational and hygiene

| Command | Signature | Effects |
|---|---|---|
| `forks <name>` | List GitHub forks of a registered repo. Auth: `--github-token` → `GITHUB_TOKEN` → `gh auth token` → anonymous. | network |
| `install-hooks` | Cross-platform pre-commit hooks (Node.js + .cmd) in every registered repo. | fs-create |
| `lint` | Single-table corpus health report: unreferenced, frontmatter issues, drift. `--strict` exits non-zero on any issue. | (none) |
| `links [<name>\|all] [--check\|--fix] [--include-headings] [--include-code]` | Convert backtick `` `*.md` `` references to clickable Markdown links across the corpus. Default is `--check` (preview). `--fix` applies. Resolves each ref against the doc index — same-repo preferred (relative path) → cogentia (meta-node) → first registry hit (absolute URL). Skips fenced code blocks, headings, already-linked refs, self-refs, and unresolvable names. See §1.7. | file-write (in `--fix`), audit-log |
| `refresh [--check]` | Run `corpus-status`, `backlinks`, `trails`, `documents` in canonical order. `--check` for dry-run. | file-write, audit-log |
| `consolidate` | Pre-commit ritual. Composite check: `drift` → `lint --strict` → `refresh --check` → `todo list --global`. Read-only — no files modified. Run when the work feels reasonably ready to publish; fix the surfaced problems before `git commit`. | audit-log, network (via `drift`) |
| `verify [--check]` | Post-commit ritual — companion to `consolidate`, run after manual commit + push. Re-fetches every registered repo and reports a per-repo verdict: committed (working tree clean), pushed (nothing ahead of upstream), in sync (nothing behind). Catches a forgotten `git add`, an unpushed commit, or a repo left behind the remote. Read-only (fetch only). `--check` skips the fetch and uses cached refs. | network (fetch) |

### 4.8 Frontmatter

`frontmatter check [repo]` — diagnose missing Level 2 fields, deprecated names, status outside vocabulary.
`frontmatter promote <file>` — add Level 2 skeleton (title, author, affiliation, date, license, status placeholders).
`frontmatter promote --batch [--repo <name>] [--check]` — bulk-inject the three invariants (author, affiliation, license).
`frontmatter schema` — canonical schema reference (Level 1/2/3, vocabulary, deprecated fields).

### 4.9 Concepts

`concepts init [repo]` — bootstrap [`research/concepts.md`](concepts.md) with header + Status scale.
`concepts list [repo]` — tabular list of concepts.
`concepts check [repo]` — orphan validation, duplicate detection, scope warnings.
`concepts graph [repo]` — Mermaid concept graph.
`concepts ref <concept> [repo]` — show all documents referencing the concept.
`concepts status [repo]` — counts by Status / Scope.
`concepts schema` — canonical field reference for concept entries.

### 4.10 Continuations (`cogentia.continuation.v1`)

| Sub | Signature | Status semantics | Effects |
|---|---|---|---|
| `emit <task.json>` | Create a new continuation. Optional: `--paper <file>` (derive topicId from path), `--topic <urn>` (override), `--from <id>` (activate a dormant successor), `--as-packet` (also print the `cognitive_packet.v0.3` Markdown form on stdout — see §4.11). | active | fs-create, audit-log |
| `inspect <id>` | Read-only view of a continuation. | (no transition) | audit-log |
| `resume <id> <step_result.json>` | Apply a step result. `--strict` blocks on validation errors. | active → completed (success), or active stays (failed: backtrack), or active → aborted (abort). Emits dormant successor on completed/aborted. | file-write, audit-log |
| `fail <id> <branch-id>` | Record an alternative as failed; continuation stays active. `--reason "..."` required. | active stays | file-write, audit-log |
| `abort <id>` | Abort the continuation. `--reason "..."` required. | active → aborted; emits dormant successor | file-write, audit-log |
| `queue [--status <s>]` | List continuations. Sort: priority desc, createdAt asc. Filter optional. | (none) | (none) |
| `prioritize <id> [--priority <N>]` | Without `--priority`: read current. With: set integer priority (default 0). | (no transition) | file-write (when setting), audit-log |
| `validate <id> [<step_result.json>]` | Pre-flight: run continuation shape validator + optional step_result validator. Exit 1 on errors. | (no transition) | audit-log |
| `export <id> [-o <file>] [--bundle]` | Serialize for handoff. `--bundle` includes predecessor + successor. Stdout by default. | (no transition) | file-write (when -o), audit-log |
| `log <id>` | Replay audit.jsonl entries referencing the id, chronologically. Best-effort if continuation file missing. | (no transition) | audit-log |
| `prune` | Advanced continuation cleanup. Supports `--days` / `--older-than`, `--status`, `--task <substring>`, `--mechanical` (only safe/obvious cases), and `--apply` (dry-run by default). When not in mechanical mode, the command can emit `prune_continuation_judgment` continuations for cases requiring human or agent judgment. | file-write (deletion) + possible continuation creation, audit-log |
| `consult <id> [--question "..."]` | Emit a `human_judgment_on_continuation` asking for a structured opinion on an existing continuation (relevance, priority, keep / archive / delete / postpone). Includes rich default analysis instructions for AI agents. The emitted continuation contains `analysis_instructions`, `alternatives`, and an enriched `expected_result_schema`. | fs-create (new continuation), audit-log |
| `schema` | Print canonical schema reference. | (none) | (none) |

### 4.11 Packets (`cognitive_packet.v0.3` bridge)

A bridge between the local CLI primitive `cogentia.continuation.v1` and the corpus-level [`cognitive_packet.v0.3`](cognitive_packets.md) envelope/payload format. Read-only — no file mutation, no network. The packet form is what a continuation looks like when it leaves the queue and is shipped to another agent, another corpus, or simply rendered for human inspection.

| Sub | Signature | Effects |
|---|---|---|
| `packet validate <packet.json>` | Envelope check: `protocol == "cognitive_packet.v0.3"`, `packet_kind ∈ {continuation, objection, hypothesis, decision, failure, routing}`, `transmission_mode ∈ {copy, reference}`, `status ∈ {draft, active, completed, failed, superseded}`, `self_describing` boolean. Payload check: `object` present. Errors are fatal (exit 1); warnings (e.g. missing `provenance`, missing `protocol_header`) are non-blocking. | (none) |
| `packet convert <ctn_xxxx\|file.json> [--to markdown\|json]` | Load a continuation (by id, resolved from `.cogentia/continuations/`) or a JSON file (continuation or packet shape) and convert to `cognitive_packet.v0.3`. Default render: Markdown (envelope + payload sections, traces from context). Use `--to json` for the wire-shape JSON. | (stdout) |

Companion: `continuation emit --as-packet` (§4.10) prints the packet form alongside the queued continuation file. Status mapping at conversion time:

- `active` (continuation) → `active` (packet)
- `completed` → `completed`
- `aborted` → `failed`
- `dormant` → `draft`

See [`cognitive_packets.md`](cognitive_packets.md) §8 (envelope schema), §9 (JSON representation), §10 (kind catalogue) for the authoritative spec.

### 4.12 Issues (GitHub Issues as Cogentia continuations)

Couche E of the [persistence backends](persistence_backends.md) frame: work items adressable beyond the version-control layer. Today bound to GitHub Issues; the seam is identified (§3 of `persistence_backends.md`) but not yet abstracted — the day this is needed, an adapter slots in at the five GitHub-tied points.

| Sub | Signature | Effects |
|---|---|---|
| `issues list <repo>` | `[--state=open\|closed\|all] [--limit=N]`. REST `GET /repos/{owner}/{repo}/issues`. Pull requests filtered out (GitHub returns PRs in the issues list). | network |
| `issues packet <repo> <number>` | Export a single issue as an `issue_continuation.v1` packet — the issue payload wrapped in the same continuation shape used elsewhere. Useful for handoff to another agent. | (stdout) |
| `issues delegate [repo]` | Emit a **grouped** continuation per repo with one-or-more open issues — the agent receives the list as a single judgement point rather than N separate items. Idempotent (existing pending delegation reused). | fs-create (continuation), network, audit-log |
| `issues close propose <repo> <number>` | `[--reason "..."] [--comment "..."]`. Emits an `issue_close_proposal` continuation. *Read-only on GitHub* — pure proposal. | fs-create, audit-log |
| `issues close apply <ref>` | `<ref>` is `ctn_xxxx` or `#N`/`N`. Closes the issue via REST `PATCH /repos/{owner}/{repo}/issues/{n}` (with optional comment via `POST .../comments`). Needs a GitHub token. | network (write), audit-log |
| `issues close reject <ref>` | Discard the proposal. | audit-log |

The proposal/apply pattern mirrors `commit` (§4.4): the agent surfaces judgement; the human applies the action. Both flows resolve `<ref>` symmetrically — by continuation id or by issue number (when the proposal has a `Closes #N` link). Audit entries chain proposals to closures so the trace survives in `.cogentia/audit.jsonl` regardless of GitHub's own activity feed.

### 4.13 Scheduler

`todo list [--global]` — per-scope or aggregated.
`todo add "<title>"` — append to current `.cogentia/SCHEDULE.md`.
`todo done <id>` — mark as done.
`todo defer <id> [--until <date>]` — defer.
`todo drop <id>` — drop without doing.
`next [--global] [--tag <t>] [--limit <N>] [--pick]` — surface next item(s) per policy (priority → overdue → FIFO). `--pick` marks Active + audits.

### 4.14 Agent context server

`query "<keyword>"` — structural keyword search (respects `.cogentiaignore`).
`bundle --concept <name>` — compile a sub-graph into a single LLM-ready payload (the concept node, its parents/children/related, and all reference documents).

---

## 5. Implementation notes for a re-implementer

### 5.1 What is doctrinally load-bearing (preserve)

1. **Audit-best-effort.** Audit failures must not fail the command. Every state-changing call appends. Read-only calls do not.
2. **Continuation soundness test.** *Can the current AI agent be replaced by a human or by another agent without modifying the tool?* If a re-implementation introduces any vendor-specific call inside `continuation emit` / `resume`, it has violated the protocol.
3. **Heraclitean follow-up.** Every `completed` or `aborted` resume emits a dormant successor with same `topicId`, `predecessor` set. The chain stays non-terminal.
4. **Network-symmetry rule** (cross-repo). Every Referenced row in repo A must have a Published row in repo B. `check` is the enforcer.
5. **Auto-blocks are sacred.** Content between `BEGIN_AUTO:` and `END_AUTO:` is regenerable; content outside is preserved across refreshes. The split is the difference between *the corpus as code* and *the corpus as authored work*.
6. **Frontmatter Level 2 invariants.** `author`, `affiliation`, `license` must be present on every research-grade document. `frontmatter promote --batch` bulk-injects them; do not silently drop missing ones.
7. **Zero-dependency baseline.** The reference is zero npm deps. A re-implementation may use the standard library of its language, but must not require vendor SDKs or non-stdlib packages for any command in the core surface (the YAML parser for `manifest --validate` is the one explicitly-deferred exception, per [`cogentia_commons_continuation.md`](cogentia_commons_continuation.md) §161).

### 5.2 What is conventional (flexible)

- Output formatting (colours, padding, table layouts) is implementation choice.
- `--json` mode is required for every command that has a useful machine-readable form; the shape need not be byte-identical to the reference implementation, only schema-equivalent.
- Storage backend (filesystem vs SQLite vs Supabase) is flexible *as long as the JSON shapes above remain projectable*. The reference is filesystem-based; the MVP spec includes a Supabase projection via `rebuild`.
- Markdown rendering of [`corpus-status.md`](corpus-status.md), [`documents.md`](https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/research/documents.md), [`concepts.md`](concepts.md) is a convention. A re-implementation may emit different prose around the same `BEGIN_AUTO`/`END_AUTO` blocks, but the auto-block delimiters and the data they contain must be preserved.

### 5.3 Identifier formats

- Continuation id: `ctn_<8 hex chars>`. Random; collision check on emit is optional but recommended.
- Concept anchor (in [`concepts.md`](concepts.md)): the concept name lowercased with non-alphanumerics replaced by `-` (Markdown auto-anchor convention).
- Topic URN: `urn:cop:topic:cogentia/<repo>[/<paper-relative-path>]`. The `cop` segment refers to inseme's COP (Cognitive Orchestration Protocol); a re-implementation outside that ecosystem may use a different URN namespace, but must preserve URN-shape addressability.
- cogentia:// URI: `cogentia://<repo>/<sha>/<path>[#fragment]` (§1.10). Full SHA is canonical; 8+ char prefix accepted; `HEAD` resolves to current commit.

### 5.4 What re-implementations have historically gotten wrong

This is the failure-mode catalogue distilled from the reference implementation's own bug history:

- **`includes(basename)` for reference detection.** A naive substring match on `cogentia-old` falsely flags it as a reference to `cogentia`. Use real link parsing.
- **Path-segment matching for cross-repo URLs.** When testing whether a URL refers to a repo named X, match `(?:^|/)<X>(?:/|$|#|?)`, not substring containment.
- **Concept dedup.** When the same concept appears in multiple repos' [`concepts.md`](concepts.md), the canonical home is the one whose Scope contains "global" (case-insensitive). Fall back to load order from `.cogentia.json`.
- **Continuation status transitions.** A `resume` on a non-active continuation is an error, not a no-op. A `failed` step result does NOT terminate the continuation — it backtracks.
- **Sort stability.** `queue` sorts by priority desc THEN createdAt asc; ties on both fields preserve emit order. `documents` sorts by date desc THEN by repo name asc.

### 5.5 Test fixtures and the doctrinal-status posture

Per the `cogentia.js doctrinal status` posture (memory tracked in `[[cogentia-js-doctrine]]`), the CLI's surface is part of a published methodological commitment. New subcommands need test coverage from day one. The reference implementation has the gap explicitly documented in [`cogentia/TODO.md`](../TODO.md) ("No tests for the CLI itself"); a re-implementation should not inherit this gap.

A useful minimum test matrix per command:
- Happy path (one valid invocation).
- Missing required arg → exit code, error message format.
- Invalid registry → graceful failure.
- Audit log appended exactly once per state-changing call.
- `--json` output validates against the documented shape.

---

## 6. Glossary

| Term | Definition |
|---|---|
| **Cogentia** | The framework: distributed knowledge production under AI conditions, in five distinctive moves. See [`cogentia/COGENTIA.md`](../COGENTIA.md). |
| **Cogentia Commons** | The methodology layer. Public, accountable, audit-trailed knowledge production with first-class objections. See [`Cogentia_Commons_Working_Paper.md`](Cogentia_Commons_Working_Paper.md). |
| **`cogentia.js`** | The operational CLI; the *static tool* that compiles with the Commons methodology. Doctrinally named in [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md). |
| **Continuation** | A typed, serializable, resumable judgment point. Suspends computation at the boundary of required reasoning. |
| **Cognitive Packet** | Envelope + payload transport for cognitive work across agents/processes. A continuation is one packet kind. |
| **Pipeline (Cogentia)** | The operational method note: *pipeline on the surface, packet network in depth.* Source corpus → derived products → reintegration. |
| **Derived Product** | An audience-adapted form of a versioned source corpus (paper, blogpost, parliamentary note, dashboard). |
| **Network symmetry** | Every Referenced row resolves to a Published row in the named repo. |
| **K6** | The closed directed cross-reference graph of the six-repo corpus (30 edges). |
| **Heraclitean follow-up** | The dormant successor every terminated continuation emits, keeping the chain non-terminal. |
| **Topic URN** | `urn:cop:topic:cogentia/<repo>[/<paper>]`. Continuation address. |
| **cogentia:// URI** | `cogentia://<repo>/<sha>/<path>[#fragment]`. Commit-pinned cross-repo reference. |
| **Trail** | A curated ordered reading playlist with Previous/Next navigation auto-injected. |
| **Frontmatter Level 2** | Substantive YAML: title, author, affiliation, date, license, status (+ optional version). |
| **Frontmatter Level 3** | Doctrinal full: Level 2 + repository, intended_path, canonical_url, last_stamped_at, tags, related_projects, ai_assisted_by. |
| **Auto-block** | Content between `<!-- BEGIN_AUTO: <name> -->` and `<!-- END_AUTO: <name> -->`; regenerable. |
| **Audit-best-effort** | Audit log writes must never fail the command. |
| **Soundness test** | "Can Claude be replaced by a human or another agent without modifying `cogentia.js`?" — binding criterion for the continuation protocol. |

---

*End of historical tutorial. This document is evidence of the v0.10/v1 implementation surface, not the current v2 CLI contract. Per [Pipeline](pipeline.md) and [Derived Products](derived_products.md), the next continuation is to regenerate or supersede it from the current `scripts/cogentia.js` source, citing the current source documents and inventing nothing.*
