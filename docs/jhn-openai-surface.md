---
document_kind: "documentation"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "documentation"
classification_confidence: "medium"
title: "Agent JHN OpenAI Chat Completions surface"
date: "2026-08-08"
document_role: operational
visibility: public
---

# Agent JHN — OpenAI Chat Completions surface (Fracta)

## Two stories (do not conflate)

| Story | Focus |
| ----- | ----- |
| Local model runtime (Ollama, llama.cpp, GGUF) | Inference hardware |
| **UX clients ↔ OpenAI-shaped twin server** | **This document** |

Agent JHN **provides** an OpenAI-compatible endpoint. Open WebUI, Cursor, curl, etc. are **clients**.

## Live base URL (Fracta VPS, Phase 1)

Compute may later move to Netlify Edge (or similar) talking to the instance Supabase; **v1 host is Fracta** next to the Guide.

```text
Base (OpenAI-style root):  https://cogentia.fractavolta.com/guide/v1
```

| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/guide/v1/models` | Model list for the caller's key tier |
| POST | `/guide/v1/chat/completions` | Chat Completions; `stream: true` → SSE |
| GET/POST | `/twin/jhn/v1/*` | Aliases (same handlers; ensure Caddy proxies `/twin/*` if used) |

Also still:

```text
POST https://cogentia.fractavolta.com/guide/chat   # native Guide JSON API
GET  https://cogentia.fractavolta.com/guide/health
```

SPA host `https://jhn.baronsmariani.org` remains the **product UI**; it may later proxy or document this base URL. Static-only deploys do **not** serve `/v1/chat/completions` on the Netlify site until edge is reattached.

## Access keys (v1)

| Tier | How | Models |
| ---- | --- | ------ |
| **public** | No `Authorization` header (when `COGENTIA_JHN_PUBLIC_API_KEY` is unset), or Bearer public key | `jhn-public`, `fractavolta-guide` |
| **Jean Hugues (owner)** | `Authorization: Bearer <COGENTIA_JHN_OWNER_API_KEY>` | + `jhn-owner` |

Set on Fracta only (never commit):

```bash
# /srv/cogentia/secrets/guide.env (or twin.env loaded by mcp-cogentia)
COGENTIA_JHN_OWNER_API_KEY=...   # Jean Hugues master key
# optional: require a public key even for readonly
# COGENTIA_JHN_PUBLIC_API_KEY=...
```

**v1 owner tier** still uses the **public corpus turn** (same retrieval as Guide/JHN public). Private vault tools and mandate-gated mutates come later (#35). Irreversible acts still require mandate + budget **before** execution (AGENTS irreversibility rule).

## Example (curl)

```bash
# Models (public)
curl -sS https://cogentia.fractavolta.com/guide/v1/models | jq .

# Chat non-stream
curl -sS -X POST https://cogentia.fractavolta.com/guide/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"jhn-public","stream":false,"messages":[{"role":"user","content":"Who is Agent John?"}]}'

# Chat SSE
curl -sS -N -X POST https://cogentia.fractavolta.com/guide/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"jhn-public","stream":true,"messages":[{"role":"user","content":"Hello"}]}'

# Owner
curl -sS https://cogentia.fractavolta.com/guide/v1/models \
  -H "Authorization: Bearer $COGENTIA_JHN_OWNER_API_KEY"
```

## Smoke

```bash
# Unit (auth/path only)
node scripts/test-jhn-openai-surface.js

# Live (Guide + OpenAI surface)
node scripts/smoke-jhn-openai-live.js
COGENTIA_GUIDE_BASE=https://cogentia.fractavolta.com node scripts/smoke-jhn-openai-live.js
```

## WebUI clients (common open-source)

Point any OpenAI-compatible UI at the base URL **including `/v1`**:

| Tool | Config |
| ---- | ------ |
| **Open WebUI** | Admin → Connections → OpenAI API: URL `https://cogentia.fractavolta.com/guide/v1`, API key empty (public) or owner key |
| **LibreChat** | `endpoints.custom` / OpenAI reverse proxy with same base |
| **AnythingLLM** | Generic OpenAI provider, base URL as above |
| **Continue.dev** | `apiBase`: `https://cogentia.fractavolta.com/guide/v1` |
| **Chatbox / LobeChat** | OpenAI compatible, custom endpoint |

API key field:

- leave blank or any dummy if anonymous public is enabled;
- Jean Hugues key for owner model list.

Prefer **streaming** enabled in the client.

## Deploy (operator)

```bash
# On fracta after git pull of cogentia
sudo /srv/cogentia/repos/cogentia/scripts/ops/fracta-guide-stack.sh restart
# Confirm
curl -fsS https://cogentia.fractavolta.com/guide/v1/models | head
```

Operium owns live Caddy; `/guide/*` is already on mcp-cogentia :8791. Optional later: proxy `/v1/*` from jhn Netlify to Fracta.

## Related

- inseme#37 public intelligence core  
- inseme#35 access policy  
- Guide agile plan (FractaVolta)  
- `operium/docs/fracta-trust-perimeter.md`  
