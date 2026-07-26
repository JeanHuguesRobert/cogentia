---
title: "Operium owns operational deploy — agent stigmergy note"
subtitle: "Do not invent a second control plane under cogentia/deploy"
date: "2026-07-26"
author: "Grok Build session, following Jean-Hugues Robert correction"
document_role: "operational"
document_kind: "method"
visibility: "public"
lifecycle_state: "active"
status: "normative for agents"
related_documents:
  - "docs/cogentia-magistral-boundary.md"
  - "docs/update-policy-registry.md"
  - "deploy/fracta/README.md"
---

# Operium owns operational deploy — agent stigmergy note

This note is a **trail mark** for future agents. It records a real error class so it is not repeated.

## Incident class (2026-07-26)

While restoring the public Guide and drafting Magistral → coding-agent synthesis:

1. Live Fracta changes were driven mainly via raw `ssh` + hand-edited Caddy.
2. Desired-state map and apply runbook were first written under **`cogentia/deploy/fracta/`**.
3. The operator corrected: **operational deployments are managed by Operium-defined tools and memory**.

Application work (S7 wiring, Guide HTTP) belonged in Cogentia. **Ops ownership** did not.

## Normative split

| Repository | Role |
|------------|------|
| **[operium](https://github.com/JeanHuguesRobert/operium)** | Versioned operational environment: health, deploy evidence, desired routing, secret *references*, Fractanet/fracta procedure |
| **cogentia** (and other app repos) | Corpus + product code; may ship unit/Caddy *fragments*; must not become a parallel ops control plane |

This matches `UP-INFRASTRUCTURE-HEALTH` in [`docs/update-policy-registry.md`](../docs/update-policy-registry.md): infrastructure availability and deployment reality are **Operium evidence**, not corpus doctrine alone.

## What agents must do

**Do:**

- `operium up` / `operium node diagnose` before declaring Fracta healthy or “deployed”.
- Put ADRs, desired maps, and apply procedures under **Operium** (`decisions/`, `docs/`, `profiles/`).
- Keep `cogentia/deploy/fracta/` as **thin pointers** to Operium when the topic is ops.
- Use `operium invoke tool` for coding-agent / action-plane work on the mesh.

**Do not:**

- Author a second full Fracta runbook only under Cogentia.
- Treat `deploy/fracta/*.md` as the canonical ops manual.
- Skip Operium when the user asked for operational deploy, routing, or infra health.

## Canonical Operium traces (follow these)

- `operium/AGENTS.md` — section **Operational deployments**
- `operium/docs/magistral-coding-agent-routing.md`
- `operium/decisions/magistral-coding-agent-routing.md`
- `operium/profiles/magistral-map.coding-agents.v1.json`
- `operium/docs/fracta-trust-perimeter.md`

## Cogentia local redirects (cleaned)

- `deploy/fracta/README.md` — short pointer + unit install only
- `deploy/fracta/systemd/` — unit templates
- `deploy/fracta/Caddyfile.snippet` — path fragment only
- (removed) stub runbook/map/full Caddyfile — lived in Operium instead

## Related agent feedback (workspace memory)

Claude project memory: `feedback_operium_owns_ops.md` (same rule, short form).

## One-line rule

> **Code in app repos; ops evidence and deploy control in Operium. Stigmergy, not dual runbooks.**
