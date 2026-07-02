# Cogentia/Fractanet node: fracta

This document is operational guidance for running a local Cogentia/Fractanet node on the Oracle VPS named `fracta`.

## Target layout

Use three separate roots:

```text
/srv/cogentia/repos
/srv/cogentia/work/codex
/var/lib/cogentia
```

- `/srv/cogentia/repos` contains the Git corpus repositories.
- `/srv/cogentia/work/codex` is scratch/workspace space for agent work.
- `/var/lib/cogentia` contains reconstructible local state such as the SQLite index cache.

The canonical portable registry is:

```text
/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json
```

Relative repository paths in that registry are resolved from the directory containing the registry file, not from the shell current directory. This lets the same registry work on Windows and on the VPS.

## Suggested wrapper

Create a local wrapper such as `cogentia-fracta` that sets the node environment:

```bash
#!/usr/bin/env bash
export COGENTIA_REGISTRY=/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json
export COGENTIA_DATA_DIR=/var/lib/cogentia
exec node /srv/cogentia/repos/cogentia/scripts/cogentia.js "$@"
```

The index cache will then live under:

```text
/var/lib/cogentia/.cogentia/index/corpus.sqlite
```

It is a cache, not a source of truth. It can be deleted and rebuilt from Git and Markdown.

## Active cache checks

On `fracta`, the running daemon uses `COGENTIA_DATA_DIR=/var/lib/cogentia`.
Do not diagnose or import the deployed cache with only `COGENTIA_REGISTRY`,
because that targets the registry-local cache under:

```text
/srv/cogentia/repos/JeanHuguesRobert/.cogentia
```

That registry-local cache can be useful for offline work, but it is not the
cache read by `cogentia.service`.

Before exporting or transferring a full embedding cache artifact, compare the
active daemon cache:

```bash
COGENTIA_REGISTRY=/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json \
COGENTIA_DATA_DIR=/var/lib/cogentia \
node /srv/cogentia/repos/cogentia/scripts/cogentia.js index status --json

COGENTIA_REGISTRY=/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json \
COGENTIA_DATA_DIR=/var/lib/cogentia \
node /srv/cogentia/repos/cogentia/scripts/cogentia.js embeddings status --json
```

If an embedding artifact is already available, run a plan against the active
cache before importing:

```bash
COGENTIA_REGISTRY=/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json \
COGENTIA_DATA_DIR=/var/lib/cogentia \
node /srv/cogentia/repos/cogentia/scripts/cogentia.js embeddings sync-plan /tmp/cache.jsonl.gz --json
```

Only import when the plan shows missing compatible rows:

```bash
COGENTIA_REGISTRY=/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json \
COGENTIA_DATA_DIR=/var/lib/cogentia \
node /srv/cogentia/repos/cogentia/scripts/cogentia.js embeddings import-cache /tmp/cache.jsonl.gz --json
```

For query-time semantic retrieval, continuations and `search-with --cache-query`
must also target the active cache:

```bash
COGENTIA_REGISTRY=/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json \
COGENTIA_DATA_DIR=/var/lib/cogentia \
node /srv/cogentia/repos/cogentia/scripts/semantic-search-worker.js run --limit 10
```

The Guide CLI can emit and fulfill the exact semantic continuations needed by a
Guide question:

```bash
cd /srv/cogentia/repos/cogentia

COGENTIA_REGISTRY=/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json \
COGENTIA_DATA_DIR=/var/lib/cogentia \
node scripts/guide-cli.js prewarm \
  --url http://127.0.0.1:8791 \
  --q "For a public Guide connected to a digital twin corpus, what should the Guide be allowed to do?" \
  --verify
```

Prewarm the standard evaluation questions:

```bash
COGENTIA_REGISTRY=/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json \
COGENTIA_DATA_DIR=/var/lib/cogentia \
node scripts/guide-cli.js prewarm \
  --url http://127.0.0.1:8791 \
  --questions docs/evals/guide-questions.json \
  --dry-run
```

Use `--dry-run` first when the expected provider spend or query list is unclear.

## Repository sync

Synchronize declared public repositories:

```bash
cogentia-fracta repos sync
```

Preview without cloning, checkout, fetch, or pull:

```bash
cogentia-fracta repos sync --dry-run
```

Private, confidential, and secret repositories are skipped unless explicitly enabled:

```bash
cogentia-fracta repos sync --include-private
```

The sync command does not overwrite local work. If a repository is dirty it may fetch remote refs, but it skips checkout and pull.

## Index

Build or refresh the local index:

```bash
cogentia-fracta index rebuild
cogentia-fracta index update
cogentia-fracta index search "Autonomie de Capacite" --limit 10
```

The index remains reconstructible. Git and Markdown are canonical.

## Daemon

Run the daemon locally:

```bash
cogentia-fracta daemon --host 127.0.0.1 --port 8790
```

Equivalent direct invocation:

```bash
COGENTIA_REGISTRY=/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json \
COGENTIA_DATA_DIR=/var/lib/cogentia \
node scripts/cogentia.js daemon --host 127.0.0.1 --port 8790
```

Useful local checks:

```bash
curl http://127.0.0.1:8790/api/status
curl "http://127.0.0.1:8790/api/state?view=public"
curl "http://127.0.0.1:8790/api/state?view=full"
curl "http://127.0.0.1:8790/api/repos?view=public"
curl "http://127.0.0.1:8790/api/index/status?view=public"
curl "http://127.0.0.1:8790/api/index/search?q=Autonomie%20de%20Capacite&limit=10"
```

`view=public` must not expose local absolute paths, private repositories, credentials, raw filesystem access, or dangerous POST actions. `view=full` is for local/admin use only.

## Public exposure

Do not expose the full local daemon through Nginx as-is. A public Nginx entry should wait until a deliberately filtered public view is reviewed end to end.

The architecture rule is:

```text
acces cognitif total != exposition publique totale != pouvoir d'action total
```

The node may need full local cognitive access to be useful. That does not imply the public web should see the same data, and it does not imply the public web should be able to trigger state-changing actions.
