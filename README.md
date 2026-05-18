# Cogentia

> *Cogito ergo sum.* *Cogentia ergo scimus.*

📖 **Start here →** [**COGENTIA.md**](COGENTIA.md) — the framework in five distinctive moves (entry-point document, ~5 minute read).

---

Cogentia is the **cognitive infrastructure tooling** of a five-repository corpus that operationalizes the [DHITL](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md) AI Safety anti-capture proposal.

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
- **[The Sovereign Digital Twin](research/cogentia-digital-twin.md)** — Personal Cogentia: Cogentia, Cogentigram, Cogentiscope. The individual-scale foundation.
- **[Cogentia Commons Working Paper](research/Cogentia_Commons_Working_Paper.md)** — Commons methodology, formal specification. The collective-scale foundation.
- **[Cogentia Commons MVP Spec](research/cogentia_commons_mvp_spec.md)** — the v1 architecture for `brique-cogentia-commons`.
- **[Democratic AI Safety](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/democratic_ai_safety.md)** — the political thesis on which both scales rest (canonical in barons-Mariani).
- **[Agent Navigation Guide](docs/agent_context_server.md)** — meta-prompt for AI agents navigating the corpus.
- **[The Knowledge Mesh](docs/knowledge_mesh.md)** — backlinks, trails, and Jekyll for human navigation.

## CLI features (v0.9.0)

- **Concepts & Taxonomy**
  * `cogentia concepts init` · `concepts status` · `concepts check` (orphan validation)
- **Agentic Context Server**
  * `cogentia bundle --concept <name>` — compile a sub-graph into a single LLM-ready payload
  * `cogentia query "keyword"` — structural search (respects `.cogentiaignore`)
- **Cross-repo overview**
  * `cogentia documents` — consolidated `research/documents.md` listing every tracked repo's markdown, reverse-chronological on activity (the bulk-pass filter strips out stamp/jekyll noise) and chronological on authorship, with per-repo anchored replays
- **Knowledge Mesh (Wiki)**
  * `cogentia backlinks` — auto-inject "Mentioned in" lists
  * `cogentia trails` — inject Previous/Next navigation from curated playlists
  * `cogentia init-jekyll` — generate `_config.yml` for GitHub Pages
- **Integrity**
  * `cogentia install-hooks` — cross-platform pre-commit hooks (Node.js + .cmd)

## Ecosystem

Cogentia is one node in a five-repository corpus:

| Repository | Role |
|---|---|
| [MareNostrum](https://github.com/JeanHuguesRobert/marenostrum) | Strategic framework. CXU specification, DHITL axiom, Mediterranean solar commons. |
| [FractaVolta](https://github.com/JeanHuguesRobert/FractaVolta) | Engineering firm + software publisher + stack operator. EPN, DC-native nodes, PGN, IPN, Mariani Village. |
| **Cogentia** | **Cognitive infrastructure tooling. `cogentia.js` CLI, Cogentia Commons methodology, continuation protocol.** |
| [inseme](https://github.com/JeanHuguesRobert/inseme) | Platform — COP runtime, briques, Kudocracy.Survey, Inseme Agora, Ophélia AI mediator, Atlas of Biodiversity. |
| [barons-Mariani](https://github.com/JeanHuguesRobert/barons-Mariani) | Political and institutional framework. Plan 2038, *Discours de la seconde méthode*. |

Mapped onto the [FractaVolta four-layer stack](https://fractavolta.com): Cogentia tools the **cognition layer**.

## Preserved principles

- "The platform distributes the conditions of exploration; it does not democratize truth."
- "Donations signal recognition, not validity."
- "The first object explored by Cogentia Commons is Cogentia Commons itself."
- *Cogito ergo sum. / Cogentia ergo scimus.*

---

*License: MIT (code), CC BY-SA 4.0 (research). Author: Jean Hugues Noël Robert, baron Mariani — Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte.*
