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
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
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

1. **agentic-change / gaps noise** — `isIndexGap` now excludes `.cogentia/` and `node_modules/` paths so issue caches stop polluting navigation debt (**196 → ~84** gaps on Fracta after deploy).
2. **agentic-change / privacy MCP** — `daemonCliCorpusPrivacy` maps `from`/`to`/`type` correctly (leaks now show e.g. `operium/docs/README.md → secrets-management.md`).
3. **continuation-handling** — resolve `ctn_cde0b32c` (Operium ADR-0001) as **source** under Agent JHN attestation (loopback mutate fix `4f65a70`).
4. **infra** — daemon allows mutate POST only from loopback so MCP JHN path works without opening public write.

## After deploy (observed)

| Metric | Before | After |
|--------|--------|-------|
| docs_gaps total | 196 | ~84 |
| privacy leak rows usable | empty path | typed paths |
| ctn_cde0b32c | active | resolved → source |

## Not done this session

- Mass-resolve remaining ~22 role-judgment continuations (needs batch policy).
- Fix each of 14 privacy link edges (visibility policy on operium docs — case-by-case).
- Bulk index rebuild on Fracta.

## How to re-run

```bash
# after deploy
# cogentia_docs_gaps should drop sharply for .cogentia noise
# cogentia_corpus_privacy should show type/path/target
```
