---
document_role: operational
document_kind: guide
visibility: public
lifecycle_state: active
classification_source: cogentia.js
classification_version: '1'
classification_rule: guide
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
title: Cogentia daemon & plugin tutorial
---

# Cogentia daemon & plugin tutorial

This short tutorial shows how to run the local Cogentia daemon, inspect plugins, use the built-in UI, and create a minimal plugin.

Prerequisites
- Node.js 18+ (tested on Node 24)
- A checkout of this repository

The daemon is launched from the same `cogentia.js` CLI that also supports repository inspection, full-text search with `grep`, and document navigation via `docs` / `documents`.

1) Start the daemon

Pick a free port (example: 8790) and start the daemon from the repository root:

```bash
node scripts/cogentia.js daemon --port 8790
```

You should see a message like:

```
Cogentia Local daemon listening on http://127.0.0.1:8790
```

2) Inspect loaded plugins

Open the API to list plugins:

```bash
curl http://127.0.0.1:8790/api/plugins
```

This returns JSON with plugin names, classes, sources and declared routes.

3) Use the browser UI

Open http://127.0.0.1:8790/ui in your browser. The UI provides a sidebar to browse files (served by the `fs` plugin) and a preview pane for Markdown files.

4) Browse the filesystem API

List a directory (root is the configured registry root; by default the registry path from configuration):

```bash
curl "http://127.0.0.1:8790/api/fs/list?dir="
```

Fetch a file; to render Markdown as HTML:

```bash
curl "http://127.0.0.1:8790/api/fs/file?path=path/to/file.md&render=html"
```

5) Run whitelisted commands (example cmd plugin)

If the `cmd` plugin is present the manifest lists allowed commands. List them:

```bash
curl http://127.0.0.1:8790/api/cmd/list
```

Run a command by name (whitelisted only):

```bash
curl "http://127.0.0.1:8790/api/cmd/run?name=ls"
```

6) Create a minimal plugin

Create `scripts/daemon_plugins/hello.js`:

```js
export const plugin = {
  name: 'hello',
  title: 'Hello plugin',
  description: 'Simple example',
};

export const routes = [
  {
    method: 'GET',
    path: '/api/hello',
    handler: (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, message: 'hello' }));
    }
  }
];
```

Optional: add `scripts/daemon_plugins/hello.plugin.json` with metadata and routes.

Restart the daemon and query:

```bash
curl http://127.0.0.1:8790/api/hello
```

7) Development tips
- Keep plugin code small and avoid blocking the event loop.
- Use `ctx.registryRoot` when handling filesystem paths.
- Use `register` in a `register` export when your plugin needs dynamic runtime registration.

That's it — this should be enough to get started developing plugins for the Cogentia local daemon.
