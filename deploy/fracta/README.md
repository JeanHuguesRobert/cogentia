# Fracta Guide stack supervision

Operational scripts for the public Guide on the `fracta` node.

## Stack

```text
cogentia.service (127.0.0.1:8790)
  -> mcp-cogentia.service (8791)
  -> https://cogentia.fractavolta.com/guide/chat
```

## Install on fracta

```bash
cd /srv/cogentia/repos/cogentia
git pull
chmod +x scripts/ops/fracta-guide-stack.sh
sudo cp deploy/fracta/systemd/cogentia-guide-*.service /etc/systemd/system/
sudo cp deploy/fracta/systemd/cogentia-guide-*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cogentia-guide-healthcheck.timer
sudo systemctl enable --now cogentia-guide-restart.timer
```

## Manual commands

```bash
sudo scripts/ops/fracta-guide-stack.sh healthcheck
sudo scripts/ops/fracta-guide-stack.sh restart
sudo scripts/ops/fracta-guide-stack.sh ensure-healthy
```

## Behavior

- `healthcheck`: verifies lightweight daemon and MCP liveness (`/api/status`, `/tools`).
- `restart`: restarts `cogentia.service`, waits, restarts `mcp-cogentia.service`, verifies.
- `ensure-healthy`: healthcheck; on failure, restart unless cooldown is active (default 30 min).

Timers:

- healthcheck every 15 minutes
- proactive restart daily at 04:30 UTC

Logs: `journalctl -u cogentia-guide-healthcheck.service` and `journalctl -u cogentia-guide-restart.service`

## Fast Guide retrieval (batch + optional Supabase)

Roadmap: `docs/retrieval-roadmap.md`.

After `git pull`, restart the stack so MCP picks up batch retrieval:

```bash
sudo scripts/ops/fracta-guide-stack.sh restart
```

### Default: local batch (no Supabase)

Guide issues one `POST /api/context/pack-batch` per visitor turn (one SQLite session, vectors loaded once). In `/srv/cogentia/secrets/guide.env`:

```bash
COGENTIA_GUIDE_BATCH=1
```

Unset or `0` falls back to sequential `GET /api/context/pack` (slower on a 1GB VPS).

### Optional: regional Supabase backend

1. Apply migration: `deploy/supabase/001_retrieval_chunks.sql`
2. Sync public corpus after each index rebuild:

```bash
cd /srv/cogentia/repos/cogentia
COGENTIA_REGISTRY=/srv/cogentia/registry COGENTIA_DATA_DIR=/var/lib/cogentia \
  node scripts/sync-retrieval-supabase.js --corpus cogentia-public
```

3. Add to `/srv/cogentia/secrets/guide.env` (must be readable by `ubuntu`: `chown root:ubuntu`, `chmod 640`):

```bash
COGENTIA_RETRIEVAL_BACKEND=supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
COGENTIA_RETRIEVAL_CORPUS_KEY=cogentia-public
OPENAI_API_KEY=...   # query embeddings for uncached queries
```

4. Sync corpus (uses `guide.env` via sudo):

```bash
sudo bash -c 'set -a; source /srv/cogentia/secrets/guide.env; set +a; \
  export COGENTIA_REGISTRY=/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json \
         COGENTIA_DATA_DIR=/var/lib/cogentia; \
  cd /srv/cogentia/repos/cogentia && node scripts/sync-retrieval-supabase.js --corpus cogentia-public'
```

5. Restart MCP: `sudo systemctl restart mcp-cogentia.service`

Re-run sync after each `cogentia index update` on fracta.