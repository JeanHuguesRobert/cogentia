---
title: "Agentic-change session — live debt exercise (2026-08-07)"
document_role: operational
document_kind: session-note
visibility: public
lifecycle_state: working
skills:
  - agentic-change
  - continuation-handling
  - corpus-evidence-retrieval
related:
  - docs/agent-skills-contract.md
  - skills/agentic-change/SKILL.md
---

# Agentic-change session — live debt (step 3)

## Observation (MCP, Fracta, Agent JHN)

| Signal | Before fix | Notes |
|--------|------------|--------|
| consolidate (quick) | 196 gaps, 14 privacy, 23 continuations | High false positive on gaps |
| docs_gaps sample | Mostly `cogentia/.cogentia/issues/…` | Runtime issue sync, not corpus navigation |
| corpus_privacy | 14 leaks but empty path/code in MCP | Sanitizer bug mapping wrong fields |
| alive continuations | 23 `index.document_role_judgment` | Stale weak-role index blocks |

## Actions under mandate (prepare + small writes)

1. **agentic-change / gaps noise** — `isIndexGap` now excludes `.cogentia/` and `node_modules/` paths so issue caches stop polluting navigation debt.
2. **agentic-change / privacy MCP** — `daemonCliCorpusPrivacy` maps `from`/`to`/`type` correctly for operators.
3. **continuation-handling** — resolve `ctn_cde0b32c` (Operium ADR-0001) as **source** (frontmatter `document_role: source`, public decision record).

## Not done this session

- Mass-resolve all 23 role-judgment continuations (needs batch policy).
- Fix each of 14 privacy link edges (needs case-by-case; now visible with paths).
- Bulk index rebuild on Fracta.

## How to re-run

```bash
# after deploy
# cogentia_docs_gaps should drop sharply for .cogentia noise
# cogentia_corpus_privacy should show type/path/target
```
