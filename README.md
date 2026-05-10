# Cogentia

Cogentia is the **cognitive infrastructure layer** of the [DHITL](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md) AI Safety anti-capture proposal. It comes in two scales:

1. **Personal Cogentia** (`apps/personal/`) — sovereign cognitive twin: knowledge about self from AI-mediated interaction traces, governed under the KYS (*Know Your Self*) license framework. PII-bearing.
2. **Cogentia Commons** (`apps/commons/`) — collaborative epistemic infrastructure: distributed exploration of ideas under explicit scientific constraints, with Thesis Kernels, multi-agent critique loops, and recognition signals structurally decoupled from validity claims. Public.

Both implement Layer 4 of the DHITL architecture (open to agents, auditable). They are the substrate on which Layer 5 — democratic deliberation reserved for living humans — operates.

The architectural axiom lives in [`marenostrum/DHITL.md`](https://github.com/JeanHuguesRobert/marenostrum/blob/main/DHITL.md). The method by which the proposal develops lives in [`barons-Mariani/research/second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md). This repository is one node in a four-repo distributed knowledge graph (see sibling repos: marenostrum, FractaVolta, barons-Mariani).

## Layout

```
apps/
  personal/        # Personal Cogentia — Vite + React + Supabase + Netlify Functions
  commons/         # Cogentia Commons — Vite + React + Supabase
research/          # Knowledge-graph node: index.md + published papers
scripts/           # cogentia.js CLI (manages the cross-repo registry)
```

## Run locally

Uses pnpm workspaces + Turbo (matching the inseme monorepo pattern).

```bash
pnpm install                # installs both workspaces
pnpm personal:dev           # apps/personal on the default Vite port
pnpm commons:dev            # apps/commons on the default Vite port
pnpm dev                    # both via Turbo
```

Each app has its own `.env`, Supabase project, Tailwind/Vite config, and Netlify deploy.

## Research deliverables

All published documents live in `research/` and are catalogued in [`research/index.md`](research/index.md). The `cogentia.js` CLI (`scripts/cogentia.js`) treats each registered repo's `research/index.md` as a node in the network — see `node scripts/cogentia.js help`.

## Preserved principles

- "The platform distributes the conditions of exploration; it does not democratize truth."
- "Donations signal recognition, not validity."
- "The first object explored by Cogentia Commons is Cogentia Commons itself."
- *Cogito ergo sum.* / *Cogentia ergo scimus.*
