# TODO — cogentia

Repo-local engineering follow-ups. Network-level / cross-repo work lives in `JeanHuguesRobert/TODO.md`.

## Strategic distance — where we are vs the stated goal

**Goal:** provide both (a) a new method for rational exploration of the possible, and (b) a first GitHub-based tool that complies with that method.

**Distance estimate (2026-05-09):**

- **Method as *statement* — ~80%.** `second_method.md` exists, applies its own rules to its own production, and names what it has not yet solved. The remaining 20% is the hard 20%, and it is named explicitly in the doctrine itself: Rule 0's architectural enforcement is unsolved; the bootstrap problem ("30 years" is not a path); the circular guarantee can only be closed by external challengers, which currently don't exist.
- **`cogentia.js` (the static corpus tool) — ~70%.** Works, MIT, zero deps, named in the doctrine. The `scan` correctness gap is the largest remaining liability — it can produce false-clean reports, which directly contradicts Rule 4. See "`cogentia.js` improvements" below.
- **Cogentia Commons (`apps/commons`, the operational platform) — ~15-20%.** Currently UI scaffolding over `mockData`. The multi-agent critique loop — the piece that would *demonstrate* the method, not just state it — does not yet exist. See "Cogentia Commons — design contracts from `second_method.md`" below.

**Honest reading:** the *method* is articulated, the *static tool* works, the *operational platform* is a stub. Mutual cross-linking among four repos by one author is structurally close to one repo with extra `git remote`s — the method requires external challengers to close its circular guarantee, and we have none yet.

## Strategic priorities (ranked)

Three highest-leverage next moves, in order of impact-per-effort. Detailed sub-items live in the dedicated sections below.

1. **Build the smallest real multi-agent critique loop in `apps/commons`** — agent reads `research/second_method.md`, surfaces an unanchored claim, produces a falsifiable counter-claim, human gates whether it enters the corpus. Even crude. That is the smallest unit of the method *working*, not just *stated*. Doing this on the doctrine itself, publicly, with the resulting commits visible, is the demonstration the method requires of itself. Sub-items in "Cogentia Commons — design contracts from `second_method.md`" below.
2. **Fix `scan` correctness in `cogentia.js`.** Roughly one day. Replaces basename-substring matching with actual link parsing. Shores up the only public-facing claim ("the tool flags every unanchored assertion") that doesn't fully hold today. Sub-item in "`cogentia.js` improvements" below.
3. **Invite specific named external participants to fork** — *(driver: jhrobert; this one cannot be done from inside)*. The circular guarantee cannot close from inside the four-repo corpus. Until at least one external fork exists with a `research/index.md` that links into the network, the corpus is structurally a single-author project regardless of repo count. Pick names. Reach out concretely.

## Verify the monorepo migration

- [ ] `pnpm install` from repo root — confirm both workspaces resolve, both lockfiles agree.
- [ ] `pnpm personal:dev` — `apps/personal` boots, all routes (`/`, `/submit`, `/results/:id`, `/history`, `/docs`, `/auth`) render. Supabase calls succeed against the Personal project.
- [ ] `pnpm commons:dev` — `apps/commons` boots, all routes (`/`, `/kernel`, `/project`, `/critique`, `/trace`, `/paper`) render against `mockData`.
- [ ] `pnpm build` (Turbo) — both apps build cleanly, `apps/*/dist/` produced.

## Migration decisions still open

- [ ] **PlatformIndex.jsx** — parked in `apps/commons/src/pages/` but unrouted. Decide: delete, or extract into a tiny third "front-door" landing (Netlify redirect from `cogentia.com` → `personal.cogentia.com` / `commons.cogentia.com`).
- [ ] **`apps/commons/netlify.toml`** — Commons currently has no Netlify config. Add one when its Netlify site is provisioned.
- [ ] **`apps/commons/.env.example`** — none yet (Commons doesn't import Supabase today). Add when Commons starts using a real backend.
- [ ] **Commit strategy** — this refactor is one giant changeset. Split into ~4 logical commits (skeleton + workspaces, source moves, doc moves + index update, README + cleanup) or one with a long body? My instinct: split.

## Audit findings (pre-migration, still relevant)

- [ ] **`apps/personal/samples/cogentigram_author.json`** (19KB) — orphan. Document its purpose in `apps/personal/README.md`, or remove.
- [ ] **`research/ARCHITECTURE_NOTE.md`** — 9-line stub titled "MVP — Architectural Note" but contains only 5 bullet "future extensions". Rename to `ROADMAP.md` or expand into an actual architecture doc.
- [ ] **`scripts/cogentia.js` help text** — top of help and example workflow say `node cogentia.js`, but actual invocation is `node scripts/cogentia.js`. Cosmetic.
- [ ] Consider a root pnpm script `cogentia` → `node scripts/cogentia.js` so usage becomes `pnpm cogentia list` etc.

## `cogentia.js` improvements

Promoted in priority because `second_method.md` (`barons-Mariani/research/`) is the founding doctrinal document and explicitly names `cogentia.js scan` / `check` as canonical tooling. The script is no longer just a workspace utility — its behaviour is part of a published method.

- [ ] **Tighten `scan` reference detection.** Replace `indexContent.includes(basename(X))` with actual link parsing (regex `[...](path)` + path resolution). The current implementation gives **false-clean** scan results when an index uses a non-basename relative path — which directly undermines the doctrinal claim that "every unanchored claim becomes visible" (Rule 4 / second_method.md §"On Certainty and Its Discontents").
- [ ] **Fix help-text invocation string.** Top-of-help and example workflow say `node cogentia.js`; the doctrinal Coda calls it `node scripts/cogentia.js`. Align the help text with the published invocation.
- [ ] `extractCrossRefs` matches repo names by `link.url.includes('/${name}')`, which can false-positive between similarly-named repos (e.g. `cogentia-old` alongside `cogentia`).
- [ ] No tests for the CLI itself.

## Cogentia Commons — design contracts from `second_method.md`

The Five Rules are now load-bearing on the `apps/commons` product.

- [ ] **Rule 0 audit** — any "validation" / "vote" / "binding decision" feature must structurally exclude agent participation (Cogentia Commons sits at DHITL Layer 4: open to agents, *not* deliberative). Document where the human is in the causal chain of every binding decision.
- [ ] **Rule 2 — Burton conversion affordance** — the multi-agent critique loop must distinguish *feelings of certainty* from falsifiable objections. UI implication: every objection input should have an explicit "convert your feeling into a falsifiable claim" prompt before it enters the record.
- [ ] **Veneer-adoption mitigation** — Cogentia Commons must verify *commit chronology*, not just current state. Accepting a thesis whose history was retro-fitted is a doctrinal failure (per "Conditions of Failure").
- [ ] **Self-test the multi-agent critique loop on `second_method.md` itself** — the doctrinal "fractal" claim implies the method must apply to its own foundational document.
- [ ] **Surface "what does the corpus currently demonstrate"** as a first-class view (Rule 4 — corpus-as-evidence). Reuse / extend `barons-Mariani/research/corpus-status.md` as the data source.

## Done this session (for context)

- ESM conversion of `scripts/cogentia.js` (was CommonJS, broke under `"type": "module"`).
- Renamed `congentia-project.md` → `cogentia-project.md` (typo).
- Added KYS, Digital Twin, Cogentia v1.0 prompt, Projet Cogentia to `research/index.md`.
- Fixed broken/wrong links across all four registered repos (`check` reports 0).
- Constellia ownership resolved: lives in `marenostrum`; `cogentia` references it.
- Moved registry to `JeanHuguesRobert/.cogentia.json`; `.gitignore`d locally.
- Refactored to monorepo: `apps/personal`, `apps/commons`, `research/`, pnpm + Turbo (matches `inseme/`).
- Removed SQL duplicates (`supabase_schema.sql`, `supabase_seed_prompt.sql`).
