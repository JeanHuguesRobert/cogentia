---
schema: cogentia.agent_skill/v1
id: cogentia.corpus-evidence-retrieval
version: 1
status: experimental
name: corpus-evidence-retrieval
description: >
  Retrieve bounded, citable Cogentia corpus evidence: snapshot or search,
  context pack, get_lines verification, qualify evidence strength. Use for
  research questions, claims about the corpus, citation-backed answers.
  Slash: /corpus-evidence-retrieval. MCP tools: cogentia_search, context_pack,
  get_lines, docs_inspect, views_snapshot.
triggers:
  - research question requiring corpus evidence
  - claim about Cogentia / corpus content needing citation
  - context pack or search before answering
  - verify a source_id or line interval
inputs:
  - question
  - optional_repo
  - optional_budget
outputs:
  - evidence-pack
  - citations
  - qualification
effects: read_only
requires:
  capabilities:
    - corpus.snapshot
    - corpus.search
    - corpus.get_lines
    - corpus.docs_inspect
governance:
  minimum_mandate: read_public
  may_disclose: false
  may_resolve_without_mandate: false
  may_widen_authority: false
  trace_minimum: material
sources:
  - docs/agent-skills-contract.md
  - docs/cogentia-mcp.md
  - docs/connect-mcp-clients.md
  - research/agent_configuration_layer.md
document_role: "operational"
document_kind: "documentation"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "skill-procedure"
classification_confidence: "strong"
---

# Skill: corpus-evidence-retrieval

## Purpose

Produce **bounded, citable** evidence from the Cogentia corpus without dumping private material or inventing quotes.

## Procedure

1. **Bootstrap (optional)** — `cogentia_views_snapshot` or `cogentia_agent_start` if session-cold.
2. **Broad** — `cogentia_context_pack` with the question (or `cogentia_search` while exploring).
3. **Verify** — before asserting a passage, `cogentia_get_lines` on the cited `source_id` / ref interval.
4. **Inspect** — `cogentia_docs_inspect` when document role/metadata matters.
5. **Qualify** — state evidence strength: direct quote vs paraphrase vs inference; note gaps.
6. **Cite** — always return `source_id` (and repo/path/lines when present). Prefer packet envelope `citations[]` from MCP Phase 3.

## MCP / CLI

```text
cogentia_search / cogentia_context_pack / cogentia_get_lines
cogentia_docs_inspect / cogentia_views_snapshot
# CLI: node scripts/cogentia.js docs search|inspect ; context via daemon
```

## Stop conditions

- No public hit and private view not authorized → say so; do not invent.
- `get_lines` fails → do not claim the passage.
- Budget exhausted → return partial pack with explicit limit note.

## Non-goals

- No corpus mutation.
- No secret/path disclosure beyond public metadata.
- Not a substitute for `continuation-handling` when judgment is suspended.
