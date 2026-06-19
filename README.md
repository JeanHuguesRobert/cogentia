# Cogentia

> *Cogito ergo sum.* *Cogentia ergo scimus.*

📖 **Start here →** [**COGENTIA.md**](COGENTIA.md) — the framework in five distinctive moves (entry-point document, ~5 minute read).

## Quick Orientation

- [`research/index.md`](research/index.md) — generated document catalog
- [`research/corpus-status.md`](research/corpus-status.md) — generated status, backlinks, and navigation checks
- [`research/agent_resumable_cli.md`](research/agent_resumable_cli.md) — continuation protocol
- [`research/cognitive_packets.md`](research/cognitive_packets.md) — packet layer above continuations

---

Cogentia is the **cognitive infrastructure tooling** of a multi-repository public corpus that operationalizes the [DHITL](https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/DHITL.md) AI Safety anti-capture proposal.

One infrastructure, two scales — *I* and *we*:

- **`scripts/cogentia.js`** — the zero-dependency Node.js CLI substrate. Version 2 is a compact corpus navigator: multi-repo registry loading, document inventory, source/derived classification, generated navigation plans, concept checks, full-text search, and git drift reports. The historical v1 implementation is archived as [`scripts/cogentia.v1-history.js`](scripts/cogentia.v1-history.js).
- **Cogentia Personal** — the *individual* scale. A sovereign cognitive twin: Cogentia (memory + mandate + traces), Cogentigram (structured profile of the Cogentia), Cogentiscope (navigation surface). See [`apps/personal/`](apps/personal/) and [`research/cogentia-digital-twin.md`](research/cogentia-digital-twin.md).
- **Cogentia Commons** — the *collective* scale. The methodology of public, accountable, audit-trailed knowledge: GitHub-anchored, every objection a first-class contribution. It is **public by default, private by exception**: private or restricted community spaces are visibility modes for sensitive, strategic or patent-oriented exploration, not separate product cores. See [`apps/commons/`](apps/commons/), [`research/Cogentia_Commons_Working_Paper.md`](research/Cogentia_Commons_Working_Paper.md), and [`research/cogentia_commons_visibility_and_private_modes.md`](research/cogentia_commons_visibility_and_private_modes.md). The web GUI also ships as **`brique-cogentia-commons`** inside the [inseme](https://github.com/JeanHuguesRobert/inseme) platform (shared COP Event log + Supabase projection).

The CLI is the substrate both scales sit on; Personal and Commons are the two faces of the same cognitive infrastructure, applied to one person or to a community.

Cogentia implements **Layer 4** of the DHITL architecture (cognitive infrastructure, open to agents, auditable). It is the substrate on which Layer 5 — democratic deliberation reserved for living humans — operates.

The architectural axiom lives in [`marenostrum/DHITL.md`](https://github.com/JeanHuguesRobert/marenostrum/blob/main/research/DHITL.md). The method by which the proposal develops lives in [`barons-Mariani/research/second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md).

## The Continuation protocol

Cogentia's load-bearing technical contribution is `cogentia.continuation.v1` — a typed, validated, provider-neutral resumption point for CLI tools. The protocol is specified in [`research/agent_resumable_cli.md`](research/agent_resumable_cli.md). The earlier CLI implementation is preserved in [`scripts/cogentia.v1-history.js`](scripts/cogentia.v1-history.js); the current v2 CLI focuses on the corpus navigation layer that agents use before issuing or resuming judgment-bearing work.

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
node scripts/cogentia.js version                   # show the CLI version
node scripts/cogentia.js state --json              # show registered repos and policies
node scripts/cogentia.js agent start               # read-only start summary for humans/agents
node scripts/cogentia.js status                    # compact corpus health table
node scripts/cogentia.js grep "exergy" --json     # full-text search over active markdown
node scripts/cogentia.js docs summary --json       # numeric corpus summary
node scripts/cogentia.js docs judgments --json     # list cases needing external judgment
node scripts/cogentia.js continuation list          # inspect active judgment requests
node scripts/cogentia.js corpus plan --json        # inspect generated navigation changes
node scripts/cogentia.js corpus apply              # apply the fresh generated plan
node scripts/cogentia.js corpus verify --strict    # verify generated views, gaps and drift
node scripts/cogentia.js git noise plan            # classify scratch/noise vs substantive edits
node scripts/cogentia.js corpus commit-generated   # dry-run generated-only commit plan
node scripts/cogentia.js daemon --port 8790        # start the local daemon
```

The CLI has zero npm dependencies. Node 20+ recommended. MIT-licensed.

Note: `docs` and `documents` are equivalent top-level commands in this version of `cogentia.js`.

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
- **[Cognitive Packet Switching](research/cognitive_packet_switching.md)** — *A Protocol Layer for Routable Ideas, Continuations, and Agent Orchestration* (published source document v1.0). Extends the envelope/payload model into a switching/routing layer. Companion derived products: [HN-optimized form](research/derived_products/tcp_ip_for_ideas_hacker_news.md) and [Concept Situation Brief](research/derived_products/concept_situation_brief_cognitive_packet_switching.md).
- **[Concept Situation Briefs](research/concept_situation_briefs.md)** — *A Derived Product Category for Locating Ideas in Origin, Lineage, Neighborhood, Current Relevance, and Use* (published source document v1.0). Defines a new derived product category for orienting readers around a concept.
- **[Pipeline](research/pipeline.md)** — *From cognitive packets to source documents and derived products* (method note v0.4). The corpus's operational method: *pipeline on the surface, packet network in depth*. Self-applicative — the document follows the method it describes. Operational counterpart of *Discours de la seconde méthode*.
- **[Derived Products](research/derived_products.md)** — *Versioned Source Corpora, Situated Forms, and Publication Agents* (v0.2). Source ↔ derived split: academic papers, blogposts, parliamentary notes, social posts are *all* derived forms of equal status, each adapted to a specific scene. *Do not popularize from the academic paper; derive from the corpus.*
- **[cogentia.js — Tutorial and Near-Specification](research/cogentia_js_tutorial.md)** — generated v2 tutorial covering current corpus navigation, continuations, trails, GitHub issue packets, consolidation, and command reference. Sufficient detail to orient human and AI agents before operating on the corpus.
- **[Cogentia Commons — Method Packets](research/cogentia_commons_method_packets.md)** — *Method Packets, Continuations, and the Generative Corpus.* Infrastructure for producing, transmitting, criticising, and improving cognitive packets, method packets, and corpus-based continuations across humans, AI agents, tools, and repositories.
- **[The Sovereign Digital Twin](research/cogentia-digital-twin.md)** — Personal Cogentia: Cogentia, Cogentigram, Cogentiscope. The individual-scale foundation.
- **[Cogentia Commons Working Paper](research/Cogentia_Commons_Working_Paper.md)** — Commons methodology, formal specification. The collective-scale foundation.
- **[Cogentia Commons MVP Spec](research/cogentia_commons_mvp_spec.md)** — the v1 architecture for `brique-cogentia-commons`.
- **[Cogentia Commons Visibility Modes](research/cogentia_commons_visibility_and_private_modes.md)** — public by default, private by exception; private spaces as visibility modes for sensitive, strategic or patent-oriented exploration.
- **[Democratic AI Safety](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/democratic_ai_safety.md)** — the political thesis on which both scales rest (canonical in barons-Mariani).
- **[Agent Navigation Guide](docs/agent_context_server.md)** — meta-prompt for AI agents navigating the corpus.
- **[The Knowledge Mesh](docs/knowledge_mesh.md)** — backlinks, trails, and Jekyll for human navigation.

## CLI features (v2)

- **Tooling**
  * `help`, `-h`, `--help` — show command usage and available commands.
  * `version`, `--version` — show the current CLI version.
  * `daemon` — start the local HTTP daemon for plugins and browser UI.
  * `documents` — alias for `docs`.
  * `agent start` — read-only session summary and next-action hints for human and AI agents.
- **Corpus state**
  * `state` — registered repositories, branches and local policies.
  * `status` — compact health table for hooks and humans.
  * `git verify` — ahead/behind and dirty-state report, with local dirty-ignore policies.
  * `git noise plan` — conservative action suggestions for scratch, generated, and substantive dirty files.
- **Document navigation**
  * `grep <text>` — full-text search over active Markdown documents.
  * `docs summary` — totals by repo and role, plus cross-repo coupling weights.
  * `docs query [repo|all]` — catalog query by role, indexing gap, metadata text and sort order.
  * `docs search <text>` — full-text search over active Markdown documents.
  * `docs gaps` and `docs inspect <repo/path.md>` — focused navigation aids for agents.
  * `docs judgments [repo|all]` — list document-role cases where the tool should ask for external judgment; `--emit-continuations` writes the requests.
- **Continuations**
  * `continuation emit` — create a typed external judgment request.
  * `continuation list` / `inspect` — inspect active or historical requests.
  * `continuation resolve` / `resume` / `cancel` — record the agent or human decision without embedding that judgment inside the mechanical command.
- **GitHub issue packets**
  * `issues list <repo>` — read live GitHub issues for a registered repository or explicit `owner/name`.
  * `issues packet <repo> <number>` — export one issue as a read-only `cogentia.issue_continuation.v1` packet.
- **Generated corpus views**
  * `corpus plan` — read-only plan for per-repo `research/corpus-status.md`, registry `research/documents.md`, and existing backlink blocks.
  * `corpus apply` — apply exactly the fresh generated plan.
  * `corpus verify` — report stale generated views, index gaps and git drift; `--strict` exits non-zero on issues.
  * `corpus commit-generated` — dry-run generated-only commit planner; add `--apply` to stage and commit generated files when no substantive dirty files block the repo.
- **Concepts**
  * `concepts list` and `concepts check` — parse every `research/concepts.md`, excluding generated auto-blocks and surfacing missing fields, duplicates and undefined references.

The current session ritual is: `agent start` at the start, `grep` or `docs search` / `docs inspect` while navigating, `issues packet` or `docs judgments --emit-continuations` when work must become resumable, `git noise plan` before deciding what dirty files mean, `corpus plan` before mechanical refresh, then `corpus apply`, `corpus commit-generated`, and `corpus verify --strict` when the generated views should be updated.

## Ecosystem

Cogentia is one node in the public corpus:

| Repository | Role |
|---|---|
| [MareNostrum](https://github.com/JeanHuguesRobert/marenostrum) | Strategic framework. CXU specification, DHITL axiom, Mediterranean solar commons. |
| [FractaVolta](https://github.com/JeanHuguesRobert/FractaVolta) | Engineering firm + software publisher + stack operator. EPN, DC-native nodes, PGN, IPN, Mariani Village. |
| **Cogentia** | **Cognitive infrastructure tooling. `cogentia.js` CLI, Cogentia Commons methodology, continuation protocol.** |
| [inseme](https://github.com/JeanHuguesRobert/inseme) | Platform — COP runtime, briques, Kudocracy.Survey, Inseme Agora, Ophélia AI mediator, Atlas of Biodiversity. |
| [barons-Mariani](https://github.com/JeanHuguesRobert/barons-Mariani) | Political and institutional framework. Plan 2038, *Discours de la seconde méthode*. |
| [Inox](https://github.com/JeanHuguesRobert/Inox) | Language and runtime substrate. Concatenative stack VM, strict control/data plane separation, designed for nodes of the future *Fractanet*. JS today, WASM and C/C++ next, ESP32 bare-metal eventually. |
| [Ubikia](https://github.com/JeanHuguesRobert/ubikia) | Editorial derivation and publication layer. Source-first derived products, personas, platform packages, and publication ledger. |

Mapped onto the [FractaVolta four-layer stack](https://fractavolta.com): Cogentia tools the **cognition layer**.

## Preserved principles

- "The platform distributes the conditions of exploration; it does not democratize truth."
- "Donations signal recognition, not validity."
- "The first object explored by Cogentia Commons is Cogentia Commons itself."
- *Cogito ergo sum. / Cogentia ergo scimus.*

---

*License: MIT (code) · CC BY-SA 4.0 (research).*
*Author: Jean Hugues Noël Robert, baron Mariani — Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica — jhr@baronsmariani.org*
