---
title: "Registry Graph Propagation — CLI, Daemon, Views, MCP"
author: "Jean Hugues Noël Robert"
language: en
date: "2026-08-22"
document_role: operational
document_kind: propagation-note
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
---

# Registry Graph Propagation

## Propagation target

The distributed Registry Graph must remain one semantic capability with symmetric projections for humans and machines:

```text
source-local *.registry.yaml
        ↓
corpus-registries collector
        ↓
Registry Graph
   ├── CLI/read tooling
   ├── generated Markdown view
   ├── Cogentia daemon read API
   └── MCP read tools
```

No projection becomes a competing authority. MCP remains a thin adapter and does not read the filesystem directly.

## Implemented

- source-local `*.registry.yaml` descriptors;
- self-registration through `research/registry_of_registries.registry.yaml`;
- deterministic collector: `scripts/corpus-registries.js`;
- deterministic tests: `scripts/test-corpus-registries.js`;
- generated human/agent view generator: `scripts/generate-registry-view.js`;
- daemon plugin: `scripts/daemon_plugins/registries.js`;
- MCP projection wrapper: `scripts/lib/cogentia-mcp-registries.js`;
- MCP stdio adapter wired to the registry-aware wrapper;
- MCP surface test: `scripts/test-mcp-registries.js`.

## MCP tools

```text
cogentia_registries_list
cogentia_registries_check
cogentia_registry_show
cogentia_registry_related
```

`cogentia_registries_list` accepts a `facet` + `value` pair, making multidimensional classification queryable without imposing a hierarchy.

## Daemon routes

```text
GET /api/registries/list?facet=<facet>&value=<value>
GET /api/registries/check
GET /api/registries/show?id=registry:<id>
GET /api/registries/related?id=registry:<id>&direction=in|out|both
```

## Remaining propagation

The semantic capability is now available through the Cogentia daemon and MCP. The standalone CLI remains:

```text
node scripts/corpus-registries.js ...
```

A direct `node scripts/cogentia.js registries ...` command family should be wired next through the v3 module seam rather than by duplicating collector logic. This is intentionally left as a small integration task: `scripts/cogentia.js` is the existing monolithic command surface, while new capabilities are required by `scripts/lib/v3-modules.js` to register through the module/capability seam.

The eventual target is semantic symmetry:

```text
registries.list
registries.check
registry.show
registry.related
```

provided once, projected as CLI + daemon + MCP + generated view.

## Verification rule

Do not claim runtime PASS until the following have actually been executed in a multi-repository workspace:

```text
node scripts/test-corpus-registries.js
node scripts/test-mcp-registries.js
node scripts/generate-registry-view.js
node scripts/corpus-registries.js check
```

The committed code is a delivered implementation; execution status remains distinct evidence.
