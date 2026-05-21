# Cogentia

> *Cogito ergo sum.* *Cogentia ergo scimus.*

📖 **Start here →** [**COGENTIA.md**](COGENTIA.md) — the framework in five distinctive moves (entry-point document, ~5 minute read).

---

Cogentia is the **cognitive infrastructure tooling** of a six-repository corpus that operationalizes the [DHITL](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md) AI Safety anti-capture proposal.

One infrastructure, two scales — *I* and *we*:

- **`scripts/cogentia.js`** — the zero-dependency Node.js CLI substrate. Multi-repo registry, canonical-URL stamping, link validation, scan-for-unreferenced-claims, and the **`cogentia.continuation.v1`** protocol for typed, provider-neutral, resumable judgment.
- **Cogentia Personal** — the *individual* scale. A sovereign cognitive twin: Cogentia (memory + mandate + traces), Cogentigram (structured profile of the Cogentia), Cogentiscope (navigation surface). See [`apps/personal/`](apps/personal/) and [`research/cogentia-digital-twin.md`](research/cogentia-digital-twin.md).
- **Cogentia Commons** — the *collective* scale. The methodology of public, accountable, audit-trailed knowledge: GitHub-anchored, every objection a first-class contribution. See [`apps/commons/`](apps/commons/) and [`research/Cogentia_Commons_Working_Paper.md`](research/Cogentia_Commons_Working_Paper.md). The web GUI also ships as **`brique-cogentia-commons`** inside the [inseme](https://github.com/JeanHuguesRobert/inseme) platform (shared COP Event log + Supabase projection).

The CLI is the substrate both scales sit on; Personal and Commons are the two faces of the same cognitive infrastructure, applied to one person or to a community.

Cogentia implements **Layer 4** of the DHITL architecture (cognitive infrastructure, open to agents, auditable). It is the substrate on which Layer 5 — democratic deliberation reserved for living humans — operates.

The architectural axiom lives in [`marenostrum/DHITL.md`](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md). The method by which the proposal develops lives in [`barons-Mariani/research/second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md).

## The Continuation protocol

Cogentia's load-bearing technical contribution is `cogentia.continuation.v1` — a typed, validated, provider-neutral resumption point for CLI tools. The protocol is specified in [`research/agent_resumable_cli.md`](research/agent_resumable_cli.md) and implemented in `scripts/cogentia.js`.

The soundness test is binding:

> Can the current AI agent be replaced by a human, or by another agent, without modifying `cogentia.js`?
> If yes, the protocol is sound. If no, it is contaminated.

It rides inside COP's `cop/continuation` Artifact (in `inseme/packages/cop-core`) as a profile — they are aligned by construction.

**Cognitive Packets** (v0.3, [`research/cognitive_packets.md`](research/cognitive_packets.md)) generalise the continuation pattern beyond the CLI: a transport-neutral **envelope + payload** structure that lets a continuation travel by copy or by reference across humans, AI agents, GitHub issues, prompts, and tools. The `cogentia.continuation.v1` object is the canonical payload of a packet whose `packet_kind = continuation` — no semantic change to the CLI primitive, only a clearer transport story. Five other payload kinds are defined: objection, hypothesis, decision, failure, routing.

## Layout

```
COGENTIA.md         # Entry-point document — the framework in five moves
scripts/            # cogentia.js — the operational CLI
research/           # Research-grade documents + index.md + corpus-status.md
prompts/            # Operational artefacts (designer + user prompts for the continuation protocol)
apps/
  personal/         # Personal Cogentia — sovereign cognitive twin (Vite + React + Supabase)
  commons/          # Cogentia Commons web GUI scaffold (work-in-progress)
```

## Quickstart with cogentia.js

```bash
# From any of your registered repositories
node scripts/cogentia.js help                      # show all commands
node scripts/cogentia.js add ../FractaVolta        # register a sibling repo
node scripts/cogentia.js scan                      # flag unreferenced research-grade files
node scripts/cogentia.js check                     # validate internal links across the corpus
node scripts/cogentia.js continuation schema       # describe the continuation protocol
node scripts/cogentia.js continuation queue        # list active and dormant continuations
```

The CLI has zero npm dependencies. Node 20+ recommended. MIT-licensed.

## Run the apps (optional)

The web apps use pnpm workspaces + Turbo (matching the inseme monorepo pattern).

```bash
pnpm install                # installs both workspaces
pnpm personal:dev           # apps/personal on the default Vite port
pnpm commons:dev            # apps/commons on the default Vite port
pnpm dev                    # both via Turbo
```

Each app has its own `.env`, Supabase project, Tailwind/Vite config, and Netlify deploy.

## Research deliverables

All published documents live in `research/` and are catalogued in [`research/index.md`](research/index.md). Headline papers:

- **[Agent-Resumable CLI](research/agent_resumable_cli.md)** — *Externalized Judgment, Continuations, and Provider-Neutral Resumption for AI-Compatible CLI Tools.* The protocol paper. Defines `cogentia.continuation.v1`.
- **[Cognitive Packets](research/cognitive_packets.md)** — *An Envelope and Payload Format for Human–AI and Multi-Agent Cooperation* (v0.3). Generalises continuations beyond the CLI: envelope (kind-agnostic metadata) + payload (kind-specific content). Six packet kinds defined.
- **[The Sovereign Digital Twin](research/cogentia-digital-twin.md)** — Personal Cogentia: Cogentia, Cogentigram, Cogentiscope. The individual-scale foundation.
- **[Cogentia Commons Working Paper](research/Cogentia_Commons_Working_Paper.md)** — Commons methodology, formal specification. The collective-scale foundation.
- **[Cogentia Commons MVP Spec](research/cogentia_commons_mvp_spec.md)** — the v1 architecture for `brique-cogentia-commons`.
- **[Democratic AI Safety](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/democratic_ai_safety.md)** — the political thesis on which both scales rest (canonical in barons-Mariani).
- **[Agent Navigation Guide](docs/agent_context_server.md)** — meta-prompt for AI agents navigating the corpus.
- **[The Knowledge Mesh](docs/knowledge_mesh.md)** — backlinks, trails, and Jekyll for human navigation.

## CLI features (v0.11)

- **Sync & inspection**
  * `cogentia drift` — fetch and report ahead/behind/diverged vs upstream across all repos. `--pull` fast-forwards behind repos; `--strict` exits non-zero on drift (pre-commit hook friendly)
  * `cogentia lint` — single-table corpus health report: unreferenced, frontmatter issues, drift, in one pass. `--strict` for pre-commit semantics
- **Derived views (refresh)**
  * `cogentia refresh` — runs all derived-view generators in canonical order (`corpus-status` → `backlinks` → `trails` → `documents`). One command replaces 4
  * `cogentia documents` — consolidated cross-corpus catalog with reverse-chrono activity and chrono authorship, bulk-pass commits filtered out
  * `cogentia corpus-status` — per-repo living health view
- **Frontmatter governance**
  * `cogentia frontmatter check [repo]` — diagnose docs missing Level 2 fields, using deprecated names, or carrying a `status:` value outside the controlled vocabulary
  * `cogentia frontmatter promote <file>` — add a Level 2 skeleton (placeholders for title/author/affiliation/date/license/status)
  * `cogentia frontmatter promote --batch` — bulk-inject only the three invariants (author/affiliation/license) across substantive docs; leaves judgment fields for human edit
  * `cogentia frontmatter schema` — canonical schema reference (Level 1/2/3, status vocabulary, deprecated fields)
- **Personal scheduler — *fractal***
  * `cogentia todo` — list, add, done, defer, drop. Each `.cogentia/SCHEDULE.md` is sovereign at its scope; `--global` aggregates across the workspace
  * `cogentia next [--pick]` — apply scheduler policy (priority → overdue → FIFO) and surface the next item; `--pick` marks it Active and audits
  * Storage: markdown task lists with priority + tags + cross-scope refs ; readable on GitHub, editable by hand
- **Concepts & taxonomy**
  * `cogentia concepts init` · `concepts status` · `concepts check` (orphan validation) · `concepts graph` · `concepts ref` · `concepts schema`
- **Agentic context server**
  * `cogentia bundle --concept <name>` — compile a sub-graph into a single LLM-ready payload
  * `cogentia query "keyword"` — structural search (respects `.cogentiaignore`)
- **Knowledge mesh (Wiki)**
  * `cogentia backlinks` — auto-inject "Mentioned in" lists
  * `cogentia trails` — inject Previous/Next navigation from curated playlists; emits absolute GitHub URLs for cross-repo links (so they render on the web)
  * `cogentia init-jekyll` — generate `_config.yml` for GitHub Pages
- **Integrity**
  * `cogentia install-hooks` — cross-platform pre-commit hooks (Node.js + .cmd)
  * `cogentia check` — internal + external link validation across all `research/index.md`

The session ritual that emerges: `cogentia drift` (start of session) → work → `cogentia refresh` → `cogentia lint` (pre-commit). Three commands replace the dozen-step manual rituals that preceded.

## Ecosystem

Cogentia is one node in a six-repository corpus:

| Repository | Role |
|---|---|
| [MareNostrum](https://github.com/JeanHuguesRobert/marenostrum) | Strategic framework. CXU specification, DHITL axiom, Mediterranean solar commons. |
| [FractaVolta](https://github.com/JeanHuguesRobert/FractaVolta) | Engineering firm + software publisher + stack operator. EPN, DC-native nodes, PGN, IPN, Mariani Village. |
| **Cogentia** | **Cognitive infrastructure tooling. `cogentia.js` CLI, Cogentia Commons methodology, continuation protocol.** |
| [inseme](https://github.com/JeanHuguesRobert/inseme) | Platform — COP runtime, briques, Kudocracy.Survey, Inseme Agora, Ophélia AI mediator, Atlas of Biodiversity. |
| [barons-Mariani](https://github.com/JeanHuguesRobert/barons-Mariani) | Political and institutional framework. Plan 2038, *Discours de la seconde méthode*. |
| [Inox](https://github.com/JeanHuguesRobert/Inox) | Language and runtime substrate. Concatenative stack VM, strict control/data plane separation, designed for nodes of the future *Fractanet*. JS today, WASM and C/C++ next, ESP32 bare-metal eventually. |

Mapped onto the [FractaVolta four-layer stack](https://fractavolta.com): Cogentia tools the **cognition layer**.

## Preserved principles

- "The platform distributes the conditions of exploration; it does not democratize truth."
- "Donations signal recognition, not validity."
- "The first object explored by Cogentia Commons is Cogentia Commons itself."
- *Cogito ergo sum. / Cogentia ergo scimus.*

---

*License: MIT (code) · CC BY-SA 4.0 (research).*
*Author: Jean Hugues Noël Robert, baron Mariani — Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica — jhr@baronsmariani.org*
