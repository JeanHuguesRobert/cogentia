# Cogentia

Two connected products under one monorepo:

1. **Personal Cogentia (KYS)** — `apps/personal/` — knowledge about self from AI-mediated interaction traces. PII-bearing.
2. **Cogentia Commons** — `apps/commons/` — evolving shared knowledge under explicit scientific constraints. Public.

The repository is a **node** in the [Cogentia Commons](research/index.md) distributed knowledge graph (see sibling repos: marenostrum, FractaVolta, barons-Mariani).

## Layout

```
apps/
  personal/        # KYS app — Vite + React + Supabase + Netlify Functions
  commons/         # Public peer-review app — Vite + React + Supabase
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

All published documents live in `research/` and are catalogued in `research/index.md`. The `cogentia.js` CLI (`scripts/cogentia.js`) treats each registered repo's `research/index.md` as a node in the network — see `node scripts/cogentia.js help`.

## Preserved principles

- "The platform distributes the conditions of exploration; it does not democratize truth."
- "Donations signal recognition, not validity."
- "The first object explored by Cogentia Commons is Cogentia Commons itself."
