---
document_role: operational
document_kind: documentation
visibility: public
lifecycle_state: active
classification_source: cogentia.js
classification_version: '1'
classification_rule: documentation
classification_confidence: medium
author: unknown
date: unknown
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
update_policy: UP-DEFAULT-REVIEWED
---

# Cogentia Daemon Plugin API

This document describes the plugin manifest and module contract for daemon plugins.

## Manifest (JSON)

A plugin manifest is optional but recommended. It must be a JSON file named `<module>.plugin.json` placed next to the plugin module. Minimal manifest shape:

{
  "name": "plugin-name",
  "class": "filesystem|ui|generic",
  "title": "Human readable title",
  "description": "Short description",
  "routes": [ { "method": "GET", "path": "/api/x" } ]
}

Rules:
- `name` (string) should be present.
- `routes`, if present, must be an array.

## Module contract (ESM)

Plugins are ESM modules that export either:

- `export const plugin = { ... }` — metadata object (may include `routes`)
- `export const routes = [...]` — array of route objects
- `export async function register({ ctx, register })` — optional dynamic registration function

A route object:
- `method` (string) optional, default `GET`
- `path` (string) required. May end with `*` to match prefix
- `handler` (function) required when exported from `routes` (or provided via `register`). Signature: `(req, res, ctx, url)` and may be async

Examples: see `scripts/daemon_plugins/fs.js` and `scripts/daemon_plugins/ui.js`.

## Security and context

Handlers receive `ctx` from the daemon via `loadContext()`; plugin filesystem handlers should use `ctx.registryRoot` (when present) as a safe root for path resolution.

## Deployment

Place plugin `.js` files under `scripts/daemon_plugins/`. The daemon will load any `.js` files and attempt to read a sidecar `.plugin.json` manifest.
