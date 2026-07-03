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

- `healthcheck`: verifies daemon index health and Guide MCP health.
- `restart`: restarts `cogentia.service`, waits, restarts `mcp-cogentia.service`, verifies.
- `ensure-healthy`: healthcheck; on failure, restart unless cooldown is active (default 30 min).

Timers:

- healthcheck every 15 minutes
- proactive restart daily at 04:30 UTC

Logs: `journalctl -u cogentia-guide-healthcheck.service` and `journalctl -u cogentia-guide-restart.service`