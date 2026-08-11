---
document_role: "operational"
document_kind: "continuation-packet"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "continuation-resume"
classification_confidence: "strong"
---

# Session resume — MCP 2026 packet sandbox

## State

- Harness: `sandbox/mcp-2026-cognitive-packet/`
- Production MCP phases 0–4 deployed on Fracta (see `docs/agent-skills-compatibility.md`)
- Phase 5 adds: experimental scenarios + **JHN-attested mutate** path in `cogentia-mcp-core`

## First actions

1. `node sandbox/mcp-2026-cognitive-packet/index.js run all`
2. Read scenario traces under `sandbox/mcp-2026-cognitive-packet/.traces/` if present
3. For live JHN mutate on Fracta: operator sets `COGENTIA_MCP_JHN_MUTATE` + `COGENTIA_MCP_JHN_TOKEN` on `mcp-cogentia` only (never public anonymous)

## Do not

- Treat sandbox pass as universal Skills-over-MCP support
- Enable JHN token without rotating / storing outside git
