---
title: Host filesystem capabilities behind Cogentia-MCP
subtitle: Reality Test #184 — Desktop Commander as a replaceable local provider
author: Jean Hugues Noël Robert, with Grok Build
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-15"
status: "working-paper"
license: "CC BY-SA 4.0"
language: en
document_role: operational
document_kind: reality-test
visibility: public
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
related:
  - "../docs/cogentia-mcp.md"
  - "../docs/cdp_hosted_browser_session_bridge.md"
  - "../docs/cogentia-magistral-boundary.md"
  - "../patterns/capability-symmetry/PATTERN.md"
related_issues:
  - "https://github.com/JeanHuguesRobert/cogentia/issues/184"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/171"
  - "https://github.com/JeanHuguesRobert/cogentia/issues/170"
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: main
  origin_date: "2026-09-15"
  derived_from:
    - docs/cogentia-mcp.md
    - docs/cdp_hosted_browser_session_bridge.md
review:
  status: unreviewed
  reviewed_by: []
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# Host filesystem capabilities behind Cogentia-MCP

First-slice Reality Test for [cogentia#184](https://github.com/JeanHuguesRobert/cogentia/issues/184). Desktop Commander MCP is a **replaceable local provider**. External agents consume Cogentia semantic capabilities, not Desktop Commander tool names.

This document is operational evidence, not a new doctrine.

## Invariant

```text
semantic capability  !=  provider  !=  transport  !=  node
host.fs.read         !=  desktop-commander  !=  MCP stdio  !=  node:local
```

```text
ChatGPT / Codex / Claude / another MCP client
                 │
                 ▼
            Cogentia-MCP
                 │
                 ▼
        COP / mandate / #171
      trace / authorization
                 │
                 ▼
          Capability Router
                 │
                 ▼
     DesktopCommanderProvider
                 │ MCP stdio NDJSON
                 ▼
        Desktop Commander MCP
                 │
                 ▼
          local workstation
```

External agents MUST NOT need to know that Desktop Commander exists. Hosted-browser CDP, KasmVNC, and `fracta2` are **not** this capability.

## Semantic capabilities (experimental)

| Capability | MCP tool | Risk | Upstream DC tool |
|---|---|---|---|
| `host.fs.list` | `cogentia_host_fs_list` | private-read | `list_directory` |
| `host.fs.read` | `cogentia_host_fs_read` | private-read | `read_file` |
| `host.fs.search` | `cogentia_host_fs_search` | private-read | `start_search` |
| `host.fs.write` | `cogentia_host_fs_write` | mutate + #171 | `write_file` |
| `host.process.run` | *not published* | mapped only | `start_process` |

Anonymous `tools/list` omits all of these. `COGENTIA_HOST_FS_ROOT` is required; paths outside that root fail closed (`path_outside_root`).

## How to run

Deterministic (fake DC-MCP, no network):

```bash
node scripts/test-side-effect-authorization.js
node scripts/test-host-desktop-commander-provider.js
```

Live, this Windows workstation, extracted DC 0.2.50:

```bash
node scripts/ops/reality-test-desktop-commander-mcp.js
```

The live harness prefers an already-extracted `dist/index.js` under the npm `_npx` cache. Override with `COGENTIA_DC_MCP_INDEX` or `COGENTIA_DC_MCP_COMMAND` / `COGENTIA_DC_MCP_ARGS`. Do not treat `npx -y` as a reliable stdio launcher on Windows.

Environment for a Cogentia-MCP process that may invoke host tools:

| Variable | Role |
|---|---|
| `COGENTIA_MCP_VIEW=full` (or JHN attestation) | private-read catalogue |
| `COGENTIA_MCP_ALLOW_MUTATE=1` | required for `host.fs.write` |
| `COGENTIA_HOST_FS_ROOT` | sandbox root |
| `COGENTIA_HOST_NODE_ID` | target, default `node:local` |
| `DESKTOP_COMMANDER_DISABLE_TELEMETRY=1` | set by the provider by default |

Writes also require a `side_effect_authorization` object (`cogentia.side_effect_authorization/v1`). Absence → `authorization_missing` before DC is called. Consumed tokens cannot be replayed.

The same module (`scripts/lib/side-effect-authorization.js`) is the #171 choke point. Grants persist in `~/.cogentia/side-effect-authorization.json` (cross-process). `POST /ops/route/action` requires a matching grant only when the invoke is a mutation (`repl: true` or a write-class capability). Ordinary model asks are ungated. `cogentia_communication_prepare` / `_send` is the Cogentia Gmail path (dry-run by default). `cogentia_github_prepare` / `_write` is the Cogentia GitHub write path (dry-run). Native Grok `gmail__send_*` and GitHub `*_write` / comment tools are denied in `~/.grok/config.toml`. `git commit` / `git push` are not yet wrapped.

## Upstream observed

```text
package:  @wonderwhy-er/desktop-commander@0.2.50
commit:   a781f5a4b8cfebac6638bc6fcbd38fca6326be53
license:  MIT
repo:     https://github.com/wonderwhy-er/DesktopCommanderMCP
transport: MCP stdio, JSON-line (NDJSON), not LSP Content-Length
```

Live `tools/list` (26 names): `get_config`, `set_config_value`, `read_file`, `read_multiple_files`, `write_file`, `write_pdf`, `create_directory`, `list_directory`, `move_file`, `start_search`, `get_more_search_results`, `stop_search`, `list_searches`, `get_file_info`, `edit_block`, `start_process`, `read_process_output`, `interact_with_process`, `force_terminate`, `list_sessions`, `list_processes`, `kill_process`, `get_usage_stats`, `get_recent_tool_calls`, `give_feedback_to_desktop_commander`, `get_prompts`.

None of those names appear on Cogentia's public MCP catalogue.

## Evidence (2026-09-15, Principal's Windows workstation)

```text
adapter implemented                 yes
mocked tests pass                   yes
DC-MCP real local runtime works     yes (extracted 0.2.50 binary)
Cogentia routing works              yes
Cogentia-MCP end-to-end works       yes (deterministic core + live DC)
unauthorized write blocked          yes (authorization_missing; no file)
authorized write executed           yes (write_file; #171 token consumed)
authorization replay blocked        yes
provider stop/restart + reread      yes
browser.fractavolta.com uses it     no  (prepared only)
fracta2 uses it                     no
ChatGPT connector                   no
DC-MCP publicly exposed             no
```

Commits on `main`: `a87116d`, `1c1fdd5`, `fdc9d1b`, `64b995e`, plus this documentation commit.

## Code map

| Path | Role |
|---|---|
| `scripts/lib/mcp-stdio-client.js` | NDJSON (and Content-Length) MCP stdio client |
| `scripts/lib/desktop-commander-provider.js` | Provider adapter + extracted-binary discovery |
| `scripts/lib/host-capability-router.js` | Target/provider routing, sandbox, traces |
| `scripts/lib/side-effect-authorization.js` | #171 prepare/expose/authorize/execute/verify |
| `scripts/lib/v3-modules.js` | `provider` / `moduleId` selection |
| `scripts/lib/cogentia-mcp-core.js` | `cogentia_host_fs_*` tools |
| `scripts/fixtures/fake-dc-mcp.js` | Deterministic DC stand-in |
| `scripts/ops/reality-test-desktop-commander-mcp.js` | Live Cogentia-MCP Reality Test |

Traces use `cogentia.host_capability_trace/v1` (capability, target, provider, upstream tool, argument hash). File contents are not copied into traces.

## Known limitations

- Live `host.fs.search` was mapped and unit-tested against the fake server; the live harness did not exercise search.
- MCP `callTool` traces often have null `actor` / `principal` / `mandate` unless the caller sets them.
- `host.process.run` is mapped and gated as effectful; it is not an MCP tool.
- `npx -y` remains a poor Windows launcher (native deps, corrupt cache if interrupted).
- v3 `invokeCapability` still first-matches when several modules provide a capability and no `provider` is passed.

## What this slice does not authorize

Do not treat this as:

- a ChatGPT or public Fracta connector to the workstation;
- a KasmVNC / CDP / Brave integration;
- a `fracta2` deployment of the provider;
- publication of `host.process.run`.

Those are later issues. The next justified product step, if any, is a named Cogentia client calling `cogentia_host_fs_read` under existing private-read rules — still not Desktop Commander by name.
