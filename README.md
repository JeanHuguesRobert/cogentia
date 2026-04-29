# Cogentia Platform (Dual MVP)

This repository now hosts two connected products:

1. **Personal Cogentia (KYS)** — knowledge about self from AI-mediated interaction traces.
2. **Cogentia Commons** — evolving shared knowledge under explicit scientific constraints.

Together they represent two sides of the same idea: private epistemic self-modeling and public collaborative exploration.

## Routing architecture
- `/` → platform index (choose a side)
- `/personal/*` → Personal Cogentia MVP
- `/commons/*` → Cogentia Commons MVP

## Stack
- React (Vite), 100% JavaScript (no TypeScript)
- Tailwind CSS
- Supabase (Postgres)
- Netlify Functions (Node.js)

## Personal Cogentia scope
- Prompt-driven analysis submission
- Results/history/docs/auth flow
- Existing netlify/supabase processing pipeline retained

## Cogentia Commons scope
- Thesis Kernel
- Public Project page
- Multi-agent critique loop
- Traceability/version view
- Working paper integration
- Donation/reputation signaling mock

## Database files
To support coexistence, SQL has been split:
- `supabase_schema_personal.sql` + `supabase_seed_personal.sql`
- `supabase_schema_commons.sql` + `supabase_seed_commons.sql`

`supabase_schema.sql` and `supabase_seed_prompt.sql` remain Commons-compatible baseline files for backward compatibility.

## Run locally
```bash
npm install
npm run dev
```

## Research deliverables (Commons)
- `research/Cogentia_Commons_Working_Paper.md`
- `research/ARCHITECTURE_NOTE.md`

## Preserved principles
- “The platform distributes the conditions of exploration; it does not democratize truth.”
- “Donations signal recognition, not validity.”
- “The first object explored by Cogentia Commons is Cogentia Commons itself.”
