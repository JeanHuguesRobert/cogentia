---
title: Workstation daemon stall vs crash (2026-08-22)
document_role: operational
document_kind: investigation
visibility: public
lifecycle_state: working
---

# Workstation daemon: stall vs crash

## Claim under test

`cogentia.js daemon` on Windows “dies” after `grep` / inventory.

## What is measured

| Experiment | Result |
| --- | --- |
| `git log --name-only -- '*.md'` per registry repo | Max **0.10 MB**, ~40s total. Not an OOM payload. |
| CLI `docs summary --json` (same `buildInventory`) | **exit 0**, RSS peak **241 MB**, ~117s |
| Isolated HTTP two greps (no MCP, pid 18832) | Both **200**; RSS **254–284 MB**, heap **126–141 MB**; health still **ok** after |
| JSONL on that run | **Two `inventory_build` cache misses** (65.7s then 77.2s) |

## Conclusions

1. **Not a V8 heap OOM.** Hundreds of MB, not gigabytes. No Node diagnostic report. `uncaughtException` never fired. Empty stderr on “disappear” is consistent with an **external kill** or with us restarting (`-Replace`, Grok job teardown), not with a JS throw.
2. **The event loop is blocked ~35–80s** on `buildInventory` (mostly `git log` across ~20 repos, then reading 1477 markdown files twice). During that window MCP’s 60s `fetch` abort looks like “daemon down”.
3. **Cache never hit** for grep #2: TTL was stamped at **start** of the walk. A 65s build is already older than the 60s TTL when stored, so every grep rebuilt. That is a real bug; stamp TTL at **end** of build (and 300s TTL).
4. **`get_lines` is independently slow** (40–63s, `inventory: none`). Separate from grep. Parallel `get_lines` + 60s MCP timeout ⇒ one call “unavailable”.
5. **Process death after MCP grep was not reproduced** with HTTP-only greps. Treat MCP-era disappearances as: timeout + later restart/kill, until a JSONL `uncaughtException` or a Node report file appears.

## What we will not pretend

Switching grep to FTS is a **performance** change, not an explanation of a crash we have not reproduced under isolation.
