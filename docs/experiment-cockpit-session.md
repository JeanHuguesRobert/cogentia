---
title: "Experiment — Session cockpit (Views + load + daemon/MCP)"
document_role: operational
document_kind: experiment-plan
visibility: private
lifecycle_state: active
created_at: 2026-07-23
status: in_progress
resume_hint: "Re-read this file, then continue from § Status / next step"
related:
  - docs/views-store.md
  - docs/connect-mcp-clients.md
  - docs/cogentia-mcp.md
  - research/memory_and_corpus_sleep_cycle.md
  - operium/docs/cogentia-mcp-clients.md
---

# Experiment — Session cockpit

## Goal

Check in practice how well these planes articulate:

1. **Load** (`cogentia.load.v0`) — measure before dispatch  
2. **Views Store** — cognitive cockpit (browser)  
3. **Daemon + MCP** — agent bootstrap (`views snapshot` / `cogentia_views_snapshot`)  
4. Optional **Operium Console** — compute plane  

Compute mesh serves cognitive workload. Do **not** merge products; only cross-check consistency.

## Baseline (2026-07-23, workstation)

| Surface | Result |
|---------|--------|
| CLI `views snapshot` | OK |
| Load | **loaded**, mode **sleep_cautious**, total_load **~42.9**, capacity 100, ratio ~0.43 |
| Workloads (approx.) | alive 1×8=8; issues 115×0.2=23; hibernating 5×1=5; embed gap ~17×0.4≈7 |
| Continuations | 1 alive (`ctn_573a9623` semantic-search) |
| Issues export | 115 open |
| Index | built, ~12971 chunks, embeddings ~8782 (~68% coverage) |
| Daemon `:8790` | **DOWN** at baseline (MCP cannot call snapshot) |
| Public Views Store | **UP** (~43 views, corpus-state present) |

Commands:

```powershell
$env:COGENTIA_REGISTRY = 'C:\tweesic\JeanHuguesRobert'
# or .cogentia.json path for daemon — see connect-mcp-clients.md
node C:\tweesic\cogentia\scripts\cogentia.js views snapshot
```

## Success criteria

| # | Question | Good | Bad |
|---|----------|------|-----|
| A | Load readable/actionable? | Mode + coherent next actions | Nonsense numbers |
| B | Views match snapshot story? | Alive / issues / corpus-state aligned | Stale store or contradiction |
| C | MCP = CLI snapshot? | Same level/mode/alive count | Daemon down or diverge |
| D | Weights make sense? | Issues light unit, alive heavy unit | Panic or ignore load |
| E | Sleep gate credible? | No heavy rebuild in sleep_cautious without thought | Ignore mode |

## Protocol steps

### Step 0 — Local photo
- [x] Run `views snapshot` (baseline captured above)
- [ ] Re-run if session resumes later; update baseline table

### Step 1 — Human Views cockpit
Open:

1. https://cogentia.fractavolta.com/ (sort default: attention)
2. Tag `continuations` — is alive work visible?
3. Tag `issues` — volume/order sensible vs 115?
4. Tag `corpus-state` — coverage/hash roughly vs local snapshot?

**Ask:** Do I *see* the same load in ~2 minutes of browsing?

### Step 2 — Agent plane (daemon → HTTP → MCP)
```powershell
cd C:\tweesic\cogentia
$env:COGENTIA_REGISTRY = 'C:\tweesic\JeanHuguesRobert\.cogentia.json'
$env:COGENTIA_DATA_DIR = 'C:\tweesic\JeanHuguesRobert'
node scripts\cogentia.js daemon --host 127.0.0.1 --port 8790
```
```powershell
Invoke-RestMethod 'http://127.0.0.1:8790/api/views/snapshot?no_store_probe=1' |
  Select-Object -ExpandProperty load
```
- Compare `load.level` / `mode` / `total_load` to CLI
- If MCP configured: call `cogentia_views_snapshot` in Claude/Codex/Cursor

**Ask:** CLI = daemon = MCP?

### Step 3 — Safe action under sleep_cautious
Only light consolidation (no index rebuild / bulk embeddings):

```powershell
node C:\tweesic\cogentia\scripts\cogentia.js corpus-state export --skip-remote
node C:\tweesic\cogentia\scripts\cogentia.js publish push corpus-state
```

**Ask:** Did the mode usefully restrain heavier work?

### Step 4 — Optional compute plane
- https://cogentia.fractavolta.com/ops/console/ (if deployed)
- Note: fleet green + cognitive **loaded** is expected, not a bug

### Step 5 — Mini log
```text
Date / time:
load.level / mode / total_load:
Views useful? (y/n + why):
MCP/daemon: OK | down | diverged:
One fix first:
```

## If interrupted — resume here

1. Open **this file**  
2. Check **§ Status / next step** below  
3. Re-run Step 0 snapshot if > few hours old  
4. Continue from the first unchecked step  
5. Do **not** start sleep automation or heavy rebuild mid-experiment  

## Status / next step

| Field | Value |
|-------|--------|
| **Status** | `in_progress` — Steps 0+2 partially done |
| **Next step** | **Step 1** (browser Views) then **Step 3** (safe corpus-state publish); MCP client call if configured |
| **Blocked on** | — |
| **Owner** | human + Grok session |

### Run log

| When | Step | Result |
|------|------|--------|
| 2026-07-23 baseline | 0 | CLI snapshot OK; load=loaded/sleep_cautious/42.9; daemon was DOWN; store UP |
| 2026-07-23 | 2 | Daemon started on 127.0.0.1:8790 (pid ~16484). HTTP snapshot: load=loaded, sleep_cautious, total=42.9, alive=1. **CLI vs daemon load: MATCH** |
| | 1,3,4,5 | not done yet |

## Out of scope (this experiment)

- Full Corpus Sleep Cycle automation  
- Spot/preemptible job dispatch  
- ONA `consolidate` implementation  
- Renaming all French “charge” in historical research docs  

## Architecture reminder

```text
Operium Console  →  compute fabric (can it run?)
Views Store      →  cognitive state (what is open / owed?)
load (snapshot)  →  total_load / capacity before dispatch
MCP              →  thin adapter over daemon / cogentia.js
```

English: **load** (French: *charge*). Not “mental load” for the mesh.
