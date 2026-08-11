---
packet_id: CPKT-2026-004
packet_kind: cognitive-packet/v0.1
packet_version: 1
created: "2026-07-29"
title: "Session handoff — SOMA actions, FractaNode health corrections, secret propagation"
home_of_record: "the human author (acceptance authority for every workstream)"
subscribing_homes:
  - "JeanHuguesRobert/operium (live operational state, ONA/SOMA, node health)"
  - "JeanHuguesRobert/cogentia (blackboard and MCP projections)"
  - "JeanHuguesRobert/inseme (private .env secret authority; values never enter this packet)"
carrier: "the human author (opens the next session on any FractaNode or coding environment)"
status: "open — work deliberately postponed; awaiting Hop 1"
visibility: public
document_role: operational
document_kind: cognitive-packet-handoff
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
related_documents:
  - "research/CPKT-2026-003_session_handoff_guide_mcp_instances.md"
  - "https://github.com/JeanHuguesRobert/operium/blob/agent/backup-2026-07-28/docs/soma-semantic-object-management-architecture.md"
  - "https://github.com/JeanHuguesRobert/operium/blob/agent/backup-2026-07-28/docs/operium-node-agent-install.md"
  - "https://github.com/JeanHuguesRobert/operium/issues/11"
  - "https://github.com/JeanHuguesRobert/operium/issues/12"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
---

# CPKT-2026-004 — SOMA actions and FractaNode health corrections

**You are a cognitive processor receiving a continuation packet.** This packet
was created because the human author explicitly chose to postpone the remaining
work. Resume from the published commits and observed state below; do not infer
the missing chat transcript and do not redo the closed rollout.

The workspace may be used concurrently by another coding agent. Before changing
an existing checkout, inspect its current branch and worktree. Prefer a separate
Git worktree or a clean clone for unfinished Operium work. During packaging,
`C:\tweesic\operium` was repeatedly switched between `main` and
`agent/backup-2026-07-28` by another process.

---

## Envelope

**1. Identity.** `CPKT-2026-004`. Append-only hop log. Each processor declares
its packet version in its own hop header.

**2. Home.** Cognitive continuity lives in Cogentia. Operium remains the
authority for live deployment and health facts. `inseme/.env` remains the
private secret authority; this public packet contains names and paths only,
never values or hashes usable as credentials.

**3. Goal.** Finish the health-correction pass started after deploying SOMA
administrative actions on all four current FractaNodes:

- make diagnostic output reflect the newest observation;
- make recommendations capability-specific;
- complete robust blackboard-token propagation;
- restore or deliberately disable expected Gateway/Inox jobs per node profile;
- repair the Pi catalogue projection;
- verify fresh heartbeats, peer discovery, and final health without false
  positives.

**4. Mandate.** Read the target repository `AGENTS.md`. Apply Operium's
Fix-Bugs-First gate. Repository commits and live changes require the human
principal's authorization under the local mandates. The creation of this packet
does not authorize future deployment, secret rotation, or service restart.

Absolute constraints:

- do not print, commit, or place secret values in issues or hop logs;
- do not replace `inseme/.env` as the declared secret authority;
- do not create an application-owned deployment control plane outside
  Operium;
- `agent.restart` restarts ONA only; it is not a machine reboot;
- preserve the Pi's immutable-runtime model and Termux's Node supervisor;
- inspect current `main` before replaying backup-branch commits because another
  agent advanced Operium concurrently.

---

## Closed work — do not redo

### SOMA implementation and specification

Published on Operium branch `agent/backup-2026-07-28`:

| Commit | Result |
|---|---|
| `dd724db` | Initial SOMA node-management profile |
| `9751281` | SOMA Object Inspector in the Operium Console |
| `e1c37b0` (Cogentia) | SOMA node resources proxied through the fleet API |
| `124d234` | Persistent `observation.refresh` and `agent.restart` actions; schema migration 3; Termux supervisor |
| `92a45f2` | Notification-directed bounded-journal recovery model |
| `015117d` | Four-node action-rollout evidence |

The notification model combines push notification with cursor-based recovery:
`journal_id`, producer incarnation, first/last sequence, discarded count,
bounded retention, explicit gap reporting, and replay. MCP notifications are a
projection, not the durable journal.

### Four-node action rollout

Release `92a45f2` was exercised successfully on:

| Node | Supervisor | Evidence |
|---|---|---|
| `fracta` | systemd | refresh completed; restart completed by a new incarnation |
| `i7-thinkpad-jhr` | NSSM/LocalSystem | same; initial activation required UAC |
| `rpi3-view` | systemd, immutable release `92a45f2-git` | same |
| `poco-jhr` | `run-ona-supervised.js` under Termux | supervisor persisted while child PID/incarnation changed |

Do not repeat the action rollout merely to prove that it existed. Re-run an
action only when validating a new runtime revision.

### Blackboard authentication establishment

Observed cause of `blackboard_upsert_failed`: the MCP process initially had no
`COGENTIA_BLACKBOARD_UPSERT_TOKEN`, so all upserts correctly returned
`401 unauthorized_blackboard_upsert`.

Completed operational changes:

- a new random token was generated directly into private authority
  `C:\tweesic\inseme\.env`, without disclosure;
- the authority was published to `/srv/cogentia/repos/inseme/.env` on Fracta;
- Fracta MCP drop-in
  `/etc/systemd/system/mcp-cogentia.service.d/blackboard-auth.conf` loads that
  authority;
- `mcp-cogentia.service` was restarted and reported
  `upsert_auth_configured: true`;
- the key was synchronized into Fracta and Termux `ona-heartbeat.env`;
- manual ONA heartbeat succeeded for Fracta
  (`snapshot_at: 2026-07-28T16:17:10.443Z`) and `poco-jhr`
  (`snapshot_at: 2026-07-28T16:21:41.852Z`);
- Linux/Termux heartbeat files were normalized from CRLF to LF.

No token value belongs in this packet.

---

## Published but not integrated everywhere

Two focused Operium commits exist on
`origin/agent/backup-2026-07-28`:

| Commit | Content | Verification already run |
|---|---|---|
| `3169db2` | newest-probe-per-kind drift fix; capability-specific next actions; atomic `sync-env-key.js` | `test:ona-drift`, `test:node-diagnose`, `test:env-key-sync` |
| `50e2d77` | explicit heartbeat env files override stale inherited values while first declared file retains precedence | `test:ona-jobs`, `test:ona-heartbeat`, `test:env-key-sync`, `test:ona-drift` |

These commits were not present in Operium `main` at packaging time. Operium
`main` was `638897a`; it contained concurrent Agent Gateway lifetime work.
Review and integrate the focused changes rather than resetting or replacing
`main`.

Relevant concurrent `main` commits:

| Commit | Content |
|---|---|
| `fbb91b1` | Guide conversational path green; Magistral key/timeouts evidence |
| `638897a` | Windows Agent CLI Gateway lifetime moved under Operium; durable apply script and docs |

`OP-BUG-001` was `in_progress`; `OP-BUG-002` remained open.

---

## Open workstreams

### W1 — Integrate and deploy diagnostic/rotation fixes

1. Use a clean worktree.
2. Compare `main` with `3169db2` and `50e2d77`.
3. Integrate without overwriting the concurrent backlog/lifetime work.
4. Run:

```powershell
cd C:\tweesic\operium
npm run test:ona-drift
npm run test:node-diagnose
npm run test:ona-jobs
npm run test:ona-heartbeat
npm run test:env-key-sync
git diff --check
```

5. Deploy as distinct immutable/runtime revisions where appropriate.
6. Restart ONA only after confirming the correct worktree/release.

The bug fixed by `3169db2`: `readLatestProbes()` returns newest first, but
`new Map(probes.map(...))` allowed an older row to overwrite the newest row of
the same kind.

The bug fixed by `50e2d77`: explicit env files could not replace a stale token
already inherited by the process, making rotation ineffective until complete
process reconstruction.

### W2 — Complete OP-BUG-002 secret propagation

Current partial state:

- authority key exists locally and on Fracta;
- Fracta and Termux ONA manual heartbeats succeeded;
- Windows private files `ona-blackboard.env`,
  `agent-gateway-blackboard.env`, and
  `attractor-i7-thinkpad-jhr.env` were synchronized;
- a Windows manual heartbeat still returned 401 because it ran from Operium
  `main` after the checkout had been switched away from the fixed loader.

Next:

- test Windows heartbeat using an integrated equivalent of `50e2d77`;
- verify scheduled ONA, Agent Gateway, and retrieval heartbeats, not only
  manual commands;
- implement one documented, idempotent apply procedure:

```text
inseme/.env authority
  -> declared runtime copies
  -> consumer service/task restart when required
  -> non-secret fingerprint/status verification
  -> live authenticated smoke
```

- add `--dry-run`;
- keep values out of stdout/stderr;
- update and eventually close Operium `OP-BUG-002` / GitHub issue 12 only
  after all known consumers pass.

### W3 — Agent Gateway and Inox health

Last observations before concurrent `main` work:

- Windows: Gateway `:8793` and Inox `:8792` were unreachable;
- Fracta: Gateway health returned 401 because the probe lacked the appropriate
  bearer;
- Termux: Gateway was not listening and its scheduled heartbeat reported
  `script_not_found`.

However, concurrent Operium `main` commit `638897a` records Gateway lifetime
work and states that Gateway became reachable from Fracta after start. Inspect
and apply its documented durable startup mechanism before diagnosing again.
Do not preserve the old observation as if it were current.

For each node:

- decide from the catalogue whether Gateway or Inox is actually required;
- run only applicable probes;
- authenticate health probes when the service contract requires it;
- disable or remove invalid scheduled jobs instead of retrying forever;
- ensure recommendations name the actual failing service.

### W4 — Raspberry Pi catalogue and heartbeat profile

Observed:

- current ONA and aggregator probes succeeded;
- score `2` was caused by missing configured registry
  `~/.cogentia/registry/resources.yaml`;
- the stored ONA heartbeat dated from 2026-07-10;
- ONA jobs were disabled in the active Pi profile.

Next decision:

- either deploy a minimal read-only catalogue projection to a stable path and
  enable only the lightweight ONA heartbeat;
- or explicitly define a catalogue-less edge profile whose healthy ceiling
  and diagnostics do not claim an error.

Do not clone the full corpus onto the Pi. Preserve its consultation/edge role.

### W5 — Fresh peer discovery

Before blackboard auth repair, every node reported `peer_count_fresh: 0`.
After successful Fracta and Termux advertisements:

- run fresh probe cycles;
- verify blackboard `fresh_attractor_count`;
- verify each ONA imports current peer attractors;
- distinguish expected offline nodes from publication/auth failures;
- use the notification-directed journal model for future durable event
  recovery, not as a substitute for current peer synchronization.

### W6 — Console and MCP action projection

The SOMA Inspector source exists but was not deployed at `/ops/console/` during
this work. Direct ONA action endpoints are operational. Administrative action
proxying through Cogentia and Console buttons still require a deliberate
read/admin token boundary. Do not collapse read and admin authority merely for
UI convenience.

---

## Known traps

1. **Concurrent checkout switching.** Always run `git status --short --branch`
   immediately before testing or committing.
2. **Pi source path is not a Git worktree.** Build immutable releases from a
   verified Git archive; include the existing validated `yaml` dependency.
3. **Termux `git -C` behaved inconsistently in compound SSH commands.** `cd`
   into the repository before Git operations.
4. **CRLF in Linux env files** can inject carriage returns into HTTP headers or
   make `source` fail. Normalize to LF while preserving values and mode.
5. **Do not `source` the entire `inseme/.env` in Bash.** Some values are not
   shell-safe. Use the Node env parser/synchronizer or systemd
   `EnvironmentFile`.
6. **Low score is not itself a root cause.** Report the catalogue state and
   individual applicable probes.
7. **Public `/ops/status` can be large.** Query the required slice rather than
   dumping the full blackboard during routine verification.

---

## Completion conditions

This packet may return home when:

- the newest-probe and recommendation fixes are on the accepted Operium line;
- secret rotation has one idempotent authority-to-consumer procedure and all
  known heartbeats authenticate;
- applicable Gateway/Inox probes are green or explicitly disabled by profile;
- the Pi catalogue/profile decision is implemented;
- fresh peer discovery is demonstrated for all online nodes;
- health reports contain no known false positive;
- Operium backlog/issues and deployment evidence reflect the final state;
- commits are pushed and restart instructions are sufficient for another
  processor.

Console/MCP administrative action projection may be split into a new packet if
the health work closes first.

---

## Resumability report — fill after the first working block

- **R0.** Processor/provider; machine; repositories writable; live SSH
  available; additional side-channel state.
- **R1.** Could work begin without clarification? Score 0/1/2 and assumptions.
- **R2.** What load-bearing information was missing from this packet?
- **R3.** What payload was unnecessary?
- **R4.** Instruction conflicts or concurrent-work interference?
- **R5.** Portability score, 0–10.

---

## Hop Log

### Hop 0 — Packaging. Processor: OpenAI Codex, 2026-07-29. Packet version 1.

Packaged the deliberately postponed SOMA/ONA health-correction work. Verified
the three prior `CPKT` artifacts before authoring. Preserved closed rollout
evidence, published-but-unintegrated commits, private-secret boundaries,
concurrent Operium `main` work, exact remaining workstreams, known traps, and
completion conditions. No credential value was included. The packet is
released to the human carrier for Hop 1.

### Hop 1 — [processor, date, packet version 2 — append here]
