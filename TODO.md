# TODO — cogentia

Repo-local engineering follow-ups. Network-level / cross-repo work lives in `JeanHuguesRobert/TODO.md`.

## Strategic distance — where we are vs the stated goal

**Goal:** provide both (a) a new method for rational exploration of the possible, and (b) a first GitHub-based tool that complies with that method.

**Distance estimate (2026-05-10):**

- **Method as *statement* — ~80%.** `second_method.md` exists, applies its own rules to its own production, and names what it has not yet solved. The remaining 20% is the hard 20%, and it is named explicitly in the doctrine itself: Rule 0's architectural enforcement is unsolved; the bootstrap problem ("30 years" is not a path); the circular guarantee can only be closed by external challengers, which currently don't exist.
- **`cogentia.js` (the static corpus tool) — ~70%.** Works, MIT, zero deps, named in the doctrine. The `scan` correctness gap is the largest remaining liability — it can produce false-clean reports, which directly contradicts Rule 4. See "`cogentia.js` improvements" below.
- **Cogentia Commons (`apps/commons`, the operational platform) — ~15-20%.** Currently UI scaffolding over `mockData`. The multi-agent critique loop — the piece that would *demonstrate* the method, not just state it — does not yet exist. See "Cogentia Commons — design contracts from `second_method.md`" below.

**Honest reading:** the *method* is articulated, the *static tool* works, the *operational platform* is a stub. Mutual cross-linking among four repos by one author is structurally close to one repo with extra `git remote`s — the method requires external challengers to close its circular guarantee, and we have none yet.

## Strategic priorities (ranked)

Three highest-leverage next moves, in order of impact-per-effort. Detailed sub-items live in the dedicated sections below.

1. **Build the smallest real multi-agent critique loop in `apps/commons`** — agent reads `research/second_method.md` (or `marenostrum/DHITL.md`), surfaces an unanchored claim, produces a falsifiable counter-claim, human gates whether it enters the corpus. Even crude. That is the smallest unit of the method *working*, not just *stated*. Doing this on the doctrine itself, publicly, with the resulting commits visible, is the demonstration the method requires of itself.
2. **Fix `scan` correctness in `cogentia.js`.** Roughly one day. Replaces basename-substring matching with actual link parsing. Shores up the only public-facing claim ("the tool flags every unanchored assertion") that doesn't fully hold today.
3. **Invite specific named external participants to fork** — *(driver: jhrobert; this one cannot be done from inside)*. The circular guarantee cannot close from inside the four-repo corpus. Until at least one external fork exists with a `research/index.md` that links into the network, the corpus is structurally a single-author project regardless of repo count. Pick names. Reach out concretely.

## Verify the monorepo migration

- [ ] `pnpm install` from repo root — confirm both workspaces resolve.
- [ ] `pnpm personal:dev` — `apps/personal` boots, all routes (`/`, `/submit`, `/results/:id`, `/history`, `/docs`, `/auth`) render. Supabase calls succeed against the Personal project.
- [ ] `pnpm commons:dev` — `apps/commons` boots, all routes (`/`, `/kernel`, `/project`, `/critique`, `/trace`, `/paper`) render against `mockData`.
- [ ] `pnpm build` (Turbo) — both apps build cleanly, `apps/*/dist/` produced.

## Migration decisions still open

- [ ] **PlatformIndex.jsx** — parked in `apps/commons/src/pages/` but unrouted. Decide: delete, or extract into a tiny third "front-door" landing (Netlify redirect from `cogentia.com` → `personal.cogentia.com` / `commons.cogentia.com`).
- [ ] **`apps/commons/netlify.toml`** — Commons currently has no Netlify config. Add one when its Netlify site is provisioned.
- [ ] **`apps/commons/.env.example`** — none yet (Commons doesn't import Supabase today). Add when Commons starts using a real backend.
- [ ] **Commit strategy** — the monorepo refactor + corpus restructuring is two large changesets. Split into ~5 logical commits (workspace skeleton, source moves, doc consolidation + DHITL canonicalization, version-scaffolding cleanup, README + Foundation headers) or one each? My instinct: split.

## Audit follow-ups (lighter)

- [ ] **`apps/personal/samples/cogentigram_author.json`** (19KB) — orphan. Document its purpose in `apps/personal/README.md`, or remove.
- [ ] Consider a root pnpm script `cogentia` → `node scripts/cogentia.js` so usage becomes `pnpm cogentia list` etc.

## `cogentia.js` improvements

Priority is doctrinally-anchored: `second_method.md` names `cogentia.js scan` / `check` as canonical tooling. The script's behaviour is part of a published method.

- [ ] **Tighten `scan` reference detection.** Replace `indexContent.includes(basename(X))` with actual link parsing (regex `[...](path)` + path resolution). Current implementation gives **false-clean** scan results when an index uses a non-basename relative path — undermines Rule 4.
- [ ] **Fix help-text invocation string.** Top-of-help and example workflow say `node cogentia.js`; the doctrinal Coda calls it `node scripts/cogentia.js`. Align.
- [ ] `extractCrossRefs` matches repo names by `link.url.includes('/${name}')`, which can false-positive between similarly-named repos (e.g. `cogentia-old` alongside `cogentia`).
- [ ] No tests for the CLI itself.

## Cogentia Commons — design contracts from `second_method.md` and DHITL

The Five Rules are load-bearing on the `apps/commons` product. DHITL is the architectural axiom every feature must respect.

- [ ] **Rule 0 audit** — any "validation" / "vote" / "binding decision" feature must structurally exclude agent participation. Cogentia Commons sits at the cognitive infrastructure layer: open to agents, *not* deliberative. Document where the human is in the causal chain of every binding decision.
- [ ] **Rule 2 — Burton conversion affordance** — the multi-agent critique loop must distinguish *feelings of certainty* from falsifiable objections. UI implication: every objection input should have an explicit "convert your feeling into a falsifiable claim" prompt before it enters the record.
- [ ] **Veneer-adoption mitigation** — Cogentia Commons must verify *commit chronology*, not just current state. Accepting a thesis whose history was retro-fitted is a doctrinal failure.
- [ ] **Self-test the multi-agent critique loop on `second_method.md` (or DHITL)** — the doctrinal "fractal" claim implies the method must apply to its own foundational documents.
- [ ] **Surface "what does the corpus currently demonstrate"** as a first-class view (Rule 4 — corpus-as-evidence). Reuse / extend `barons-Mariani/research/corpus-status.md` as the data source.

## Cross-doc consistency follow-ups (residual from the corpus restructuring)

The internal-consistency audit is largely resolved by the restructuring just performed (DHITL is canonical for the Layer scheme; version markers dropped; Cogentiscope added to formal definitions; outdated docs removed). Residual items:

- [ ] **Read `marenostrum/DHITL.md` directly** to confirm it actually states the layer scheme the corpus now defers to. If DHITL.md itself uses an outdated/different scheme, fix at source — the canonical document must match what its citers say it says.
- [ ] **Review `Cogentia_Commons_Working_Paper.md` cross-section references** — beyond §10.2 (already fixed), spot-check that no other section references are dangling.
- [ ] **Consider unifying the EN/FR `kys-prompt.md` / `cogentia_prompt_v1.md`** into a single source-of-truth + translation, rather than two parallel documents that can drift.

## Done this session (for context)

### Earlier (2026-05-09)

- ESM conversion of `scripts/cogentia.js`.
- Renamed `congentia-project.md` → `cogentia-project.md` (typo).
- Fixed broken/wrong links across all four registered repos (`check` reports 0).
- Constellia ownership resolved: lives in `marenostrum`; `cogentia` references it.
- Moved registry to `JeanHuguesRobert/.cogentia.json`; `.gitignore`d locally.
- Refactored to monorepo: `apps/personal`, `apps/commons`, `research/`, pnpm + Turbo.
- Removed SQL duplicates (`supabase_schema.sql`, `supabase_seed_prompt.sql`).

### Today (2026-05-10) — corpus restructuring around DHITL as foundation

- Deleted `research/cogentia-project.md` (March 2026 outdated formulation, predated the DHITL/Cogentia Commons synthesis).
- Deleted `research/ARCHITECTURE_NOTE.md` (9-line stub; not a research deliverable).
- Promoted DHITL as the single source of truth for the layer scheme. Removed competing layer enumerations from `Cogentia_Commons_Working_Paper.md`, `Cogentia-and-Cogentigram.md`, and `cogentia-digital-twin.md` — all three now cite DHITL instead.
- Added Cogentiscope definition to `Cogentia-and-Cogentigram.md` §3 (resolves the audit gap where the Triptych was incomplete in the formal paper).
- Reframed `democratic_ai_safety.md` as a *Coherence Demonstration* — the Cogentia Commons format applied to DHITL itself.
- Dropped version-number scaffolding (`v0.4`, `v0.3`, `v0.1` markers, `Δ depuis v0.1` notes, the explicit Revision History section). Trust git for versioning.
- Fixed Working Paper §10.2 broken cross-references to non-existent §6 / §9 content (audit H2).
- Removed unsupported framework claim ("Big Five, MBTI, DISC, Enneagram") from `cogentia-digital-twin.md`; it now correctly defers to `Cogentia-and-Cogentigram.md` §4 for the formal axis construction.
- Updated stale reference [5] in `democratic_ai_safety.md` ("À commettre" → actual GitHub URL).
- Synced model-name examples between EN and FR prompt versions.
- Added **Foundation** headers to all four `research/index.md` files (cogentia, marenostrum, FractaVolta, barons-Mariani), each declaring the repo's role in the AI Safety anti-capture proposal and pointing at DHITL + second_method.
- Rewrote `cogentia/README.md` to lead with the architectural framing (Layer 4 of DHITL) instead of the product framing ("two products under one monorepo").
- Saved system-purpose memory: corpus is fundamentally an AI Safety anti-capture proposal; DHITL is the load-bearing axiom held openly as a faith commitment.
