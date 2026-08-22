# Fracta — app fragments only

**Operational ownership is Operium**, not this directory.

| Need | Where |
|------|--------|
| Health / deploy evidence | `operium` → `operium up` |
| Fracta trust perimeter | `operium/docs/fracta-trust-perimeter.md` |
| MCP catalog desired state | `operium/docs/mcp-capability-surface.md` |
| Guide synthesis routing (Magistral → coding agents) | `operium/docs/magistral-coding-agent-routing.md` |
| Desired Magistral map | `operium/profiles/magistral-map.coding-agents.v1.json` |

## What ships here

| Path | Purpose |
|------|---------|
| `systemd/` | Guide stack healthcheck / restart **unit templates** |
| `Caddyfile.snippet` | Suggested path list for MCP/Guide vs Views (merge under Operium change control) |

Install units (operator, after Operium procedure says so):

```bash
cd /srv/cogentia/repos/cogentia
sudo cp deploy/fracta/systemd/cogentia-guide-*.service /etc/systemd/system/
sudo cp deploy/fracta/systemd/cogentia-guide-*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cogentia-guide-healthcheck.timer
sudo systemctl enable --now cogentia-guide-restart.timer
```

Stack scripts live in-repo: `scripts/ops/fracta-guide-stack.sh` (not ops doctrine).
