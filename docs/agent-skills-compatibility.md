---
title: Agent Skills and MCP client compatibility evidence
date: '2026-08-07'
document_role: operational
document_kind: evidence-log
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: issue
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: '82'
  derived_from:
    - docs/agent-skills-contract.md
    - docs/cogentia-js-mcp-agent-path.md
---

# Agent Skills / MCP compatibility evidence

Claims about client support must cite a row below. Do not invent universal Skills-over-MCP support.

## MCP tool surface (P0 / P1)

| Date | Client | Version / host | Endpoint | Protocol era | Result | Notes |
|------|--------|----------------|----------|--------------|--------|-------|
| 2026-08-07 | dual-era unit test | `node scripts/test-mcp-dual-era.js` | in-process core | legacy + modern | **verified** | tools/list hides mutate tools on public; tier_forbidden on emit |
| 2026-08-07 | dual-era + live daemon | same + `127.0.0.1:8790` | local daemon | legacy + modern | **verified** | health, continuation_list (count≥0), continuation_inspect on alive id; protocol `cogentia.continuation.v2` |
| 2026-08-07 | MCP core smoke | health → snapshot → search → continuation_list | local daemon | — | **verified** | search hits=3 for `continuation`; skill_hint=`continuation-handling` |
| 2026-08-07 | Public Fracta HTTP | production | `https://cogentia.fractavolta.com/mcp` | legacy initialize `2025-11-25` | **verified** | initialize + serverInfo `cogentia-mcp` 0.3.0 |
| 2026-08-07 | Fracta VPS P1 deploy | `5401f0e` on `/srv/cogentia/repos/cogentia` | `https://cogentia.fractavolta.com/mcp` + loopback `:8790`/`:8791` | dual-era | **verified** | `tools/list` count=**17**; mutate tools hidden; emit → `tier_forbidden`; real `continuation_list` (alive count on host); services `cogentia`+`mcp-cogentia` restarted |
| 2026-08-07 | Phase 2 unit + skills | `node scripts/test-mcp-dual-era.js` | in-process | dual-era | **verified** | 21 public tools; skill_list/get continuation-handling body; instructions playbook |
| 2026-08-07 | Grok Build | session config | project + workspace `.grok/config.toml` | dual-era via stdio/HTTP | **partial** → prefer retest after Fracta deploy | local stdio + public HTTP; public now matches P1 tier |

## Local Agent Skills discovery

| Date | Client | Skill | Discovery path | Result |
|------|--------|-------|----------------|--------|
| 2026-08-07 | any | `continuation-handling` | `skills/continuation-handling/SKILL.md` + `node scripts/validate-agent-skills.js` | **verified** inventory PASS |

## Classification legend

| Class | Meaning |
|-------|---------|
| verified | Reproduced with command/trace |
| partial | Config or subset works; full smoke pending |
| legacy-only | Only 2025-era initialize |
| incompatible | Failed with evidence |
| unknown | Not tested |

## Mutate tier (P3) — not public

Mutate tools (`cogentia_continuation_emit`, `cogentia_continuation_resolve`, `cogentia_issues_sync`) require:

```text
COGENTIA_MCP_VIEW=full
COGENTIA_ADMIN_TOKEN=<token matching daemon>
COGENTIA_MCP_ALLOW_MUTATE=1
```

Public Fracta and default Grok project config must keep mutate **disabled**.
