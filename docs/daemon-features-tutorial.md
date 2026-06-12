# Cogentia Local Daemon — Features Tutorial

This document explains the features and usage of the `cogentia.js` local daemon, focusing on the daemon's observable behavior, configuration, plugin system, APIs, security considerations, and development workflow.

## Overview
The Cogentia local daemon is a small HTTP service bundled with the repository that exposes local repository metadata, a filesystem browsing API, a minimal browser UI, and an extensible plugin system.

Key features
- HTTP daemon with small JSON API (status, state, repos, plugin list)
- Plugin architecture: discover `.js` modules in `scripts/daemon_plugins/` with optional sidecar `<name>.plugin.json` manifests
- Built-in plugins: `fs` (filesystem navigator), `ui` (browser UI), `cmd` (example command runner)
- Lightweight Markdown→HTML renderer for previewing files
- Safety: plugins should respect `ctx.registryRoot` as safe root for filesystem operations

## Running the daemon
From the repository root:

```bash
node scripts/cogentia.js daemon --port 8790
```

The daemon is started from the same `cogentia.js` CLI that also supports commands like `help`, `version`, `state`, `status`, `grep`, `docs`, `documents`, `corpus`, `concepts`, and `continuation`.

Options:
- `--port <n>` — port to bind (default 8787)
- `--host <addr>` — host to bind (default 127.0.0.1)

Important endpoints
- `GET /api/status` — health/status object
- `GET /api/state` — daemon state including registry path and repos
- `GET /api/plugins` — list discovered plugins and their declared routes

## Plugin system
Plugins live in `scripts/daemon_plugins/` as ESM modules. Each plugin may provide:
- `export const plugin = { ... }` — metadata (name, class, title, description, optionally `routes`)
- `export const routes = [ ... ]` — explicit array of route objects with `method`, `path`, and `handler`
- `export async function register({ ctx, register })` — runtime registration hook to call `register(route)` for dynamic routes

Route object shape
- `method` (string) optional, default `GET`
- `path` (string) required. Paths may end with `*` to match prefixes
- `handler` (function) required for exported `routes` or registered routes. Signature: `async function handler(req,res,ctx,url)`

Manifest sidecar
- Place a JSON file next to the plugin module named `<module>.plugin.json` with metadata and `routes` array.
- Manifests are validated with a small helper (`scripts/daemon_plugins/manifest.js`) — include `name` and prefer an explicit `routes` list.

## Built-in plugins (examples)
- `fs.js` — exposes `GET /api/fs/list?dir=` and `GET /api/fs/file?path=&render=html`.
  - Filesystem operations resolve under `ctx.registryRoot` (or cwd fallback), and return JSON or HTML for markdown.
- `ui.js` — serves `GET /ui` and `GET /ui/static/*`, the browser UI uses `/api/fs` and `/api/plugins`.
- `cmd.js` — demo plugin that reads a manifest-defined whitelist of commands and exposes `GET /api/cmd/list` and `GET /api/cmd/run?name=`.

## Security notes
- The daemon is intended for local use; default CORS and host binding restrict access to `127.0.0.1`.
- Plugins that run local commands (the `cmd` plugin) must use a manifest whitelist and avoid executing untrusted input.
- Filesystem handlers should always resolve paths under `ctx.registryRoot` and deny traversal outside that root.

## Development workflow
- Add a plugin JS file in `scripts/daemon_plugins/`. Export `plugin` and/or `routes` or provide `register()`.
- Optionally add `<name>.plugin.json` manifest with `routes` and `config`.
- Use `scripts/plugin_api_test.js` to smoke-test plugins:

```bash
node scripts/plugin_api_test.js
```

- Run the daemon locally and exercise endpoints via `curl` or the `/ui` interface.

## Testing and CI suggestions
- Add a JSON Schema for plugin manifests and run a validator in CI.
- Add a smoke integration job that:
  1. Starts the daemon on a free port.
  2. Calls `/api/plugins`, `/api/fs/list`, `/ui` and other relevant endpoints.
  3. Shuts down the daemon.

A minimal GitHub Actions job can start Node, run `node scripts/cogentia.js daemon --port 8789` in the background, run the smoke checks, then kill the process.

## Troubleshooting
- Syntax errors when importing plugins: run `node --check <file>` to detect template or ESM issues.
- `r.handler is not a function` in route dispatch: ensure plugin `routes` entries include a `handler` function (exported functions cannot be serialized via a manifest — export the function in the `.js` module).
- Port in use: pick a different `--port` or kill the process using the port.

## Examples
Minimal plugin (`hello.js`):

```js
export const plugin = { name: 'hello', title: 'Hello', description: 'Example' };
export const routes = [ {
  method: 'GET', path: '/api/hello', handler: (req,res) => { res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify({ok:true,msg:'hello'})); }
} ];
```

Manifest example (`hello.plugin.json`):

```json
{
  "name":"hello",
  "class":"example",
  "routes":[ { "method":"GET","path":"/api/hello" } ]
}
```

## Closing notes
This daemon is intentionally minimal and designed to be extended by small, local plugins. The refactor moves plugin registry and manifest validation into small modules (`scripts/daemon_plugins/registry.js` and `manifest.js`) to keep `scripts/cogentia.js` focused on CLI commands and core functionality.

If you'd like, I can now:
- Add a JSON Schema and manifest validator call, or
- Add a GitHub Actions workflow to run the smoke tests and daemon checks, or
- Expand the tutorial with step-by-step screenshots and example responses.

Which would you prefer next? 
