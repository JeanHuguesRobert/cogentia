---
title: "Agent CLI Gateway"
subtitle: "OpenAI-compatible SSE gateway over coding-agent child processes"
author: "Jean Hugues Noël Robert, baron Mariani"
date: "2026-07-07"
status: specification — draft
license: "CC BY-SA 4.0 for text; MIT for associated code"
document_role: "source"
document_kind: "specification"
visibility: "public"
lifecycle_state: "draft"
---

# Agent CLI Gateway — specification (draft)

## 1. Purpose

The **Agent CLI Gateway** is a local HTTP daemon that exposes an **OpenAI-compatible**
`POST /v1/chat/completions` endpoint (including **SSE streaming**) and fulfils requests by
driving **vendor coding-agent CLIs** as child processes.

It is the **action plane** complement to existing Cogentia read paths:

| Plane | Existing component | Role |
|-------|-------------------|------|
| Context (read) | Context Gateway (`cogentia.js daemon`) | corpus search, packs, citations |
| Retrieval (session) | `inox-serve` | Phase 4 inline retrieval mandat |
| **Action (agent)** | **Agent CLI Gateway** (this spec) | run Grok/Codex/Claude on local repos |

On Fractanet, a gateway instance on a capable node (`poco-jhr`, `i7-thinkpad-jhr`) becomes an
**attractor** (`attractor:<host>:agent-cli-gateway`) routable over Tailscale — not a public
Internet surface.

## 2. Problem statement

Coding agents are shipped as **CLIs** (Grok Build, Claude Code, OpenAI Codex) with:

- native auth on the device (`~/.grok/auth.json`, proot paths on Termux, etc.);
- working directory semantics (must run inside a git repo);
- two execution modes: **headless single-turn** and **interactive REPL/TUI**.

Clients (Cursor, custom apps, orchestrators) speak **OpenAI Chat Completions + SSE**. They do
not speak PTY REPL protocols.

We need a **stable adapter layer** that:

1. accepts OpenAI-shaped requests;
2. spawns the right child process;
3. streams tokens/events until the turn is complete;
4. remains **provider-pluggable** via adapters implementing one abstract model.

## 3. Design principles

1. **CLI auth stays on the device** — the gateway never holds vendor API keys; it inherits
   credentials by spawning the same binaries the operator already uses.
2. **Prefer headless adapters** when available — simpler, testable, no prompt detection.
3. **PTY REPL is phase 2** — stdin + CR + prompt/idle detection for multi-turn without
   respawning.
4. **One abstract adapter contract** — Grok, Codex, Claude, future tools implement the same
   interface; routing is `model` → adapter id.
5. **Fail closed** — invalid model, busy session, or child crash → structured OpenAI error JSON.
6. **Audit without secrets** — log adapter id, cwd, duration, exit code; never log auth files or
   env secrets.
7. **Fractanet-ready** — bind loopback, expose over Tailscale only, optional bearer token
   (`AGENT_GATEWAY_TOKEN`), blackboard heartbeat optional.

## 4. Architecture

```text
                    OpenAI-compatible clients
                              |
                              v
                 +---------------------------+
                 |     agent-gateway         |
                 |  HTTP :8793 (default)     |
                 |  - auth middleware        |
                 |  - session registry       |
                 |  - SSE encoder            |
                 +-------------+-------------+
                               |
                    AdapterRegistry.get(model)
                               |
         +---------+-----------+-----------+---------+
         |         |           |           |         |
    GrokAdapter CodexAdapter ClaudeAdapter AntigravityAdapter
         |         |           |           |         |
    spawn child spawn child spawn child   spawn child
    (headless)  (headless)  (headless)    (headless)
         |         |           |           |         |
    grok -p …   codex …     claude …      agy --print …
```

### 4.1 Process model (phase 1 — headless)

```text
Request -> create Session -> adapter.spawnHeadless(turn) -> child process
         -> read stdout/stderr -> StreamEngine -> SSE chunks
         -> child exit -> final chunk + [DONE]
         -> destroy Session
```

One in-flight request per session; global concurrency limit configurable
(`AGENT_GATEWAY_MAX_CONCURRENT`, default 2 on mobile, 4 on laptop).

### 4.2 Process model (phase 2 — REPL)

```text
Request -> get or create ReplSession -> adapter.attachPty()
         -> write formatted turn to stdin (+ CR)
         -> StreamEngine reads PTY stdout
         -> adapter.isTurnComplete(buffer) == true -> end SSE
         -> ReplSession stays alive for next HTTP request (session id)
```

## 5. HTTP API

### 5.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness + adapter probe summary |
| `GET` | `/v1/models` | List adapter ids exposed as models |
| `POST` | `/v1/chat/completions` | OpenAI-compatible chat (JSON or SSE) |

### 5.2 `POST /v1/chat/completions`

**Request** (subset of OpenAI; required fields marked *):

```json
{
  "model": "grok-build",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "stream": true,
  "temperature": 0.2
}
```

**Extensions** (gateway-specific, optional):

| Field | Type | Meaning |
|-------|------|---------|
| `metadata.cwd` | string | Working directory for child (must be under allowlist) |
| `metadata.session_id` | string | Reuse REPL session (phase 2) |
| `metadata.adapter_mode` | `"headless"` \| `"repl"` | Force mode; default per adapter preference |

**Response (non-stream)** — standard OpenAI `chat.completion` object.

**Response (stream)** — `Content-Type: text/event-stream`:

```text
data: {"id":"agw-…","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant"}}]}

data: {"id":"agw-…","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hello"}}]}

data: [DONE]
```

Errors use OpenAI-style `{ "error": { "type", "message", "code" } }` with appropriate HTTP status.

### 5.3 Model names (initial registry)

| `model` | Adapter | Child command (headless) | Notes |
|---------|---------|--------------------------|-------|
| `grok-build` | `grok` | `grok -p <prompt> --output-format streaming-json` | Native on Termux aarch64 |
| `claude-code` | `claude` | `claude -p <prompt>` via `agent-claude` wrapper | Ubuntu proot on Termux |
| `codex` | `codex` | `codex exec <prompt>` via `agent-codex` wrapper | Ubuntu proot on Termux |

`GET /v1/models` returns these ids with `owned_by: "agent-cli-gateway"`.

## 6. Abstract adapter contract

Language-agnostic interface (TypeScript shape for documentation):

```typescript
interface AgentAdapter {
  /** Stable id, e.g. "grok" */
  id: string;
  /** OpenAI model id(s) served */
  models: string[];
  /** Preferred mode when client does not specify */
  defaultMode: "headless" | "repl";

  /** Probe binary + auth without running a full turn */
  probe(ctx: HostContext): Promise<AdapterProbeResult>;

  /** Build argv + env for headless single-turn */
  buildHeadlessInvocation(turn: TurnInput, ctx: HostContext): SpawnSpec;

  /** Optional: open long-lived REPL (phase 2) */
  buildReplInvocation?(ctx: HostContext): SpawnSpec;

  /** OpenAI messages[] -> CLI input string */
  formatTurn(messages: ChatMessage[], ctx: HostContext): string;

  /** Headless: parse child stdout chunk -> zero or more text deltas */
  parseHeadlessChunk(chunk: Buffer, state: ParseState): TextDelta[];

  /** Headless: true when child output is complete */
  isHeadlessComplete(exitCode: number | null, state: ParseState): boolean;

  /** REPL: write turn to stdin (includes trailing CR if needed) */
  writeReplTurn?(stdin: Writable, turn: TurnInput): void;

  /** REPL: inspect accumulated PTY output; true => end of assistant turn */
  isReplTurnComplete?(buffer: string, state: ParseState): boolean;
}

interface SpawnSpec {
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  /** When true, gateway wraps with script/pty (phase 2) */
  pty?: boolean;
}

interface TurnInput {
  messages: ChatMessage[];
  prompt: string;       // result of formatTurn
  stream: boolean;
  metadata?: Record<string, unknown>;
}
```

### 6.1 HostContext

Captured once at gateway startup:

```typescript
interface HostContext {
  hostname: string;
  platform: "termux" | "linux" | "windows";
  pathExtra: string[];      // e.g. ~/.grok/bin, ~/.local/bin
  repoRoots: string[];      // allowlisted cwd roots
  defaultCwd: string;
  termuxProot?: boolean;    // codex/claude need agent-* wrappers
}
```

## 7. Stream engine

The **StreamEngine** is adapter-agnostic. It consumes byte chunks from stdout (or PTY) and
emits SSE deltas.

### 7.1 Strategies (per adapter config)

| Strategy | When | Emit on |
|----------|------|---------|
| `line` | Headless plain text | each `\n` (strip ANSI) |
| `streaming-json` | Grok `--output-format streaming-json` | parsed JSON events |
| `inactivity` | REPL PTY fallback | debounce 200–500 ms silence after bytes |
| `prompt` | REPL primary completion | regex match on prompt signature |

**Rule:** completion is **`prompt` OR `inactivity` OR process exit`** (first satisfied wins).
For headless, **only process exit** (and parser `done` event for streaming-json).

### 7.2 ANSI handling

PTY and some headless modes emit ANSI escapes. The gateway strips SGR sequences before SSE
unless `metadata.preserve_ansi: true`.

### 7.3 Backpressure

If the HTTP client disconnects, the gateway sends SIGTERM to the child, then SIGKILL after
`AGENT_GATEWAY_KILL_GRACE_MS` (default 3000).

### 7.4 Expect-equivalent semantics (phase 2 REPL)

The classic Tcl tool **Expect** (Don Libes) automates interactive programs: `spawn` with a
PTY, `send` to stdin, `expect` until stdout matches a pattern or a **timeout** fires. Phase 2
REPL mode implements the same semantics inside the gateway — not necessarily by shelling out to
Tcl `expect`.

#### 7.4.1 Mapping Expect → Agent CLI Gateway

| Expect (Tcl) | Gateway component | Notes |
|--------------|-------------------|-------|
| `spawn cmd` | `adapter.buildReplInvocation()` + `node-pty` | PTY required; plain pipes buffer differently |
| `send "text\r"` | `adapter.writeReplTurn(stdin, turn)` | `\r` (CR) is default line ending unless adapter overrides |
| `expect "pattern"` | `adapter.isReplTurnComplete(buffer)` | Regex on accumulated PTY output (ANSI-stripped) |
| `expect timeout` | StreamEngine strategy `inactivity` | Debounce after last byte (default 300 ms) |
| `expect eof` | Child process `exit` event | REPL crash or explicit quit |
| `exp_continue` | Internal state `ParseState.turnPhase` | Assistant still streaming; do not close SSE yet |
| `interact` | *Not in v1* | User TUI handoff; gateway always proxies to HTTP SSE |

**Turn lifecycle (REPL):**

```text
idle
  -> HTTP request arrives
  -> writeReplTurn (send + CR)
  -> streaming (emit SSE on line breaks and/or partial buffer)
  -> isReplTurnComplete OR inactivity timeout
  -> emit [DONE], return ReplSession to idle (child stays alive)
```

**Completion rule (unchanged from §7.1):** first satisfied signal wins among `prompt`,
`inactivity`, and `eof`. During assistant output, `exp_continue`-style logic prevents premature
prompt matches inside the answer text.

#### 7.4.2 Implementation choice

| Approach | Use when |
|----------|----------|
| **Headless** (`-p`, `exec`, `streaming-json`) | Default — no Expect semantics needed |
| **`node-pty` + JS pattern engine** | Production REPL in the Node daemon (recommended) |
| **Tcl `expect` helper script** | Calibration only — capture real prompts per CLI version, then port regex to adapter YAML |
| **Python `pexpect`** | Avoid on Termux unless Python is already a fleet standard |

Do **not** depend on the Tcl `expect` package in the production daemon path: extra dependency,
second process, awkward SSE bridging. Use it as a **reference implementation** for pattern
discovery.

Example calibration script (developer machine, not shipped):

```tcl
#!/usr/bin/expect -f
set timeout 120
spawn grok
expect {
  -re {(?i)grok build} { exp_continue }
  -re {[›>]\s*$} {
    send "say hello\r"
    exp_continue
  }
  timeout { exit 1 }
}
expect -re {[›>]\s*$}
send "\x04"
expect eof
```

#### 7.4.3 Pattern engine (JavaScript)

Proposed module: `stream-engine/expect-loop.js`

```typescript
interface ExpectRule {
  id: string;
  /** Match on ANSI-stripped PTY tail window (last N KB) */
  pattern: RegExp;
  action: "emit" | "complete" | "continue" | "error";
  priority: number;
}

interface ExpectConfig {
  rules: ExpectRule[];
  inactivityMs: number;
  stripAnsi: boolean;
  tailWindowBytes: number;   // default 65536
}
```

Evaluation order each time bytes arrive:

1. Append to `buffer`, strip ANSI for matching.
2. If adapter emits **assistant text** since last `send`, stream deltas (line or chunk).
3. Test `rules` by ascending `priority` (lower = earlier).
4. On `complete` rule match **and** `state.assistantStarted` → end SSE turn.
5. If no bytes for `inactivityMs` **and** `assistantStarted` → end SSE turn (fallback).
6. On child `exit` → end SSE turn or error if exit code ≠ 0.

**Guard:** ignore prompt patterns until at least one byte of assistant output was forwarded
(post-`send`), to avoid matching prompts echoed in user context.

#### 7.4.4 Candidate patterns per adapter (draft — calibrate before prod)

Stored in `adapters/<id>.expect.yaml`, versioned with observed CLI `--version`.

**Grok Build REPL** (`grok` TUI, no `-p`):

| Rule id | Pattern (regex, ANSI-stripped) | Action | Notes |
|---------|----------------------------------|--------|-------|
| `grok-banner` | `grok\s+[\d.]+` | continue | Startup banner |
| `grok-ready` | `(?:^|\n)[›>❯]\s*$` | complete | Input prompt idle |
| `grok-thinking` | `(?i)thinking|working` | continue | Optional spinner text |

**Claude Code REPL** (`claude` TUI):

| Rule id | Pattern | Action | Notes |
|---------|---------|--------|-------|
| `claude-version` | `Claude Code\s+[\d.]+` | continue | Version line on start |
| `claude-ready` | `(?:^|\n)(?:›|>)\s*$` | complete | Primary prompt |
| `claude-tool` | `(?i)running|executing|tool` | continue | Tool invocation in progress |

**OpenAI Codex REPL** (`codex` TUI):

| Rule id | Pattern | Action | Notes |
|---------|---------|--------|-------|
| `codex-ready` | `(?:^|\n)codex>\s*$` | complete | Hypothesis — verify on installed 0.142.x |
| `codex-exec` | `(?i)exec|command` | continue | May overlap; tune after capture |

**Shared fallback:**

| Rule id | Condition | Action |
|---------|-----------|--------|
| `idle-timeout` | no bytes ≥ `inactivityMs` after `assistantStarted` | complete |
| `child-exit` | process exit | complete or error |

Patterns are **hypotheses** until validated with Expect or scripted PTY capture on each target
host (`poco-jhr`, `i7-thinkpad-jhr`). Record calibrated patterns in
`adapters/<id>.expect.yaml` with `cli_version_observed` field.

#### 7.4.5 Adapter hook for Expect rules

Extend `AgentAdapter` (phase 2):

```typescript
interface AgentAdapter {
  // ...existing fields...
  /** REPL Expect rules; merged with shared fallback rules */
  getExpectConfig?(ctx: HostContext): ExpectConfig;
  /** Optional: strip spinner lines before SSE emit */
  filterReplNoise?(line: string): string | null;
}
```

`filterReplNoise` drops TUI chrome (spinners, status bars) so clients receive assistant prose
only.

#### 7.4.6 When Expect semantics are unnecessary

Prefer **headless** adapters and skip PTY entirely when the CLI exposes:

| CLI | Headless escape hatch |
|-----|----------------------|
| Grok | `-p` + `--output-format streaming-json` (structured events, no prompt detection) |
| Claude | `-p` / `--print` style single-turn |
| Codex | `codex exec` |

Expect-equivalent logic is a **fallback for true REPL sessions** (`metadata.session_id`,
multi-turn without respawning the child), not the default path.

## 8. Adapter profiles (observed 2026-07)

### 8.1 Grok Build (`grok-build`)

| Field | Value |
|-------|-------|
| Binary | `grok` (native `linux-aarch64` on Termux) |
| Auth | `~/.grok/auth.json` (X account OAuth) |
| Headless | `grok -p "<prompt>" --output-format streaming-json` |
| Plain fallback | `--output-format plain` |
| REPL | `grok` TUI — phase 2 PTY |
| Verified | `grok -p "Reply with exactly: GROK_MOBILE_OK"` on `poco-jhr` |

**streaming-json:** gateway maps JSON events to `delta.content`; on terminal event, close SSE.

### 8.2 Claude Code (`claude-code`)

| Field | Value |
|-------|-------|
| Binary | `claude` or wrapper `agent-claude` |
| Termux | **proot Ubuntu** — spawn `agent-claude` (sets PATH + cwd) |
| Headless | `claude -p "<prompt>"` |
| REPL | `claude` TUI — phase 2 |
| Auth | `~/.claude/.credentials.json` (in proot `/root/.claude/`) |

### 8.3 OpenAI Codex (`codex`)

| Field | Value |
|-------|-------|
| Binary | `codex` or wrapper `agent-codex` |
| Termux | **proot Ubuntu** — native Termux npm `codex` is broken (no arm64-android native) |
| Headless | `codex exec "<prompt>"` or `codex -p` per installed version |
| REPL | `codex` TUI — phase 2 |
| Auth | `~/.codex/auth.json` (in proot `/root/.codex/`) |

### 8.4 Windows ThinkPad (future profile)

| Adapter | Invocation |
|---------|------------|
| `grok-build` | `grok -p …` native |
| `claude-code` | `claude -p …` native |
| `codex` | `codex exec …` native |

No proot wrappers; `HostContext.platform = "windows"`.

## 9. Session and concurrency

### 9.1 Phase 1

- No cross-request REPL persistence.
- Each HTTP request = one child lifecycle.
- `409` if `AGENT_GATEWAY_MAX_CONCURRENT` reached.

### 9.2 Phase 2

- `metadata.session_id` maps to `ReplSession` in memory (TTL 30 min idle).
- One REPL child per `session_id`.
- Mutex per REPL — concurrent requests on same session queue or `409`.

## 10. Security and trust

The Agent CLI Gateway is an **action boundary**, not a public context boundary.

It follows the [`Trusted Boundaries`](trusted_boundaries.md) invariant:

```text
cognitive access != public exposure != action power
```

Default policy:

| Exposure | Policy |
|----------|--------|
| Public Internet | Not a supported default exposure |
| Localhost | Allowed for owner/admin operation |
| Tailnet | Allowed with bearer token and node-level trust |
| Shell / database / interpreter tools | Admin-only action tools |
| Context retrieval | Use the Context Gateway, not this action daemon |

| Concern | Policy |
|---------|--------|
| Bind address | `127.0.0.1` default; Tailscale exposure via explicit config |
| Auth | `Authorization: Bearer <AGENT_GATEWAY_TOKEN>` when set |
| `cwd` | Must resolve under `repoRoots` (e.g. `~/srv/cogentia/repos`) |
| Command injection | `formatTurn` produces text; spawn uses `execFile` with argv array, no shell |
| Secrets in logs | Never log env, auth paths, or child stderr containing tokens |
| Client trust | Same model as `inox-serve` — owner-operated tailnet |

## 11. Fractanet integration (phase 3)

```text
Client (fracta Guide or workstation)
    -> Tailscale -> http://100.x.x.x:8793/v1/chat/completions
    -> agent-gateway on capable node
    -> local CLI + local corpus cwd
```

Blackboard upsert (optional):

```json
{
  "attractor_id": "attractor:poco-jhr:agent-cli-gateway",
  "capabilities": ["agent.cli.gateway", "coding-agents.grok"],
  "endpoint": "http://100.97.223.45:8793",
  "ttl_seconds": 300
}
```

Distinct from `attractor:i7-thinkpad-jhr:retrieval-inline` (inox retrieval).

## 12. Relationship to existing Cogentia agent gateway

`cogentia.js` already exposes `POST /v1/chat/completions` routed to **ai-router / Magistral**
(retrieval-oriented). The Agent CLI Gateway is a **separate daemon** (proposed default port
**8793**) to avoid mixing:

- cloud/router inference (context Q&A), vs
- local coding-agent CLIs (repo write access, tool use on host).

Future: optional **compose path** — gateway prepends a context pack from local Context Gateway
before calling `formatTurn` (`metadata.inject_context: true`).

## 13. Implementation plan

| Phase | Deliverable | Acceptance |
|-------|-------------|------------|
| **0** | This spec + `agent-gateway` module skeleton | Reviewed |
| **1a** | Grok headless adapter + SSE + `/health` | `curl` stream from ThinkPad → phone |
| **1b** | Claude + Codex headless (proot spawn) | Three models on `GET /v1/models` |
| **2** | PTY REPL + `session_id` + prompt/idle detection | Multi-turn without respawn |
| **3** | Tailscale + token + blackboard on Fractanet node | `operium up` sees attractor |
| **4** | Optional context injection from Context Gateway | `metadata.inject_context` |

**Proposed code layout:**

```text
cogentia/scripts/lib/agent-gateway/
  server.js           # HTTP + SSE
  stream-engine.js
  adapter-registry.js
  adapters/
    grok.js
    claude.js
    codex.js
    antigravity.js
    plain-text.js
  host-context.js
cogentia/scripts/ops/install-agent-gateway-termux.sh
cogentia/scripts/ops/install-agent-gateway-windows.ps1
```

CLI entry: `node scripts/agent-gateway.js --host 127.0.0.1 --port 8793`

## 14. Open questions

1. **Tool calls** — map OpenAI `tools`/`tool_calls` to CLI-native tools, or ignore in v1?
2. **Codex argv** — confirm `codex exec` vs `codex -p` across installed versions; adapter
   version probe at startup.
3. **REPL prompt signatures** — maintain per-adapter regex file versioned with CLI semver.
4. **Multi-repo routing** — `metadata.cwd` only, or infer from last message path hints?
5. **Merge with cogentia daemon** — single process vs separate daemon for blast radius?
6. **Mobile battery** — gateway on `poco-jhr` only on demand vs always-on with heartbeat?

## 15. References

- [Cogentia Context Gateway](../docs/cogentia-context-gateway.md) — read plane
- [Agent Gateway invocation runbook](../docs/agent-gateway-invocation.md) — blackboard-routed invocation and Fractanet acceptance commands
- [Trusted Boundaries](trusted_boundaries.md) — fractal trust and action-boundary doctrine
- [Agent-Resumable CLI](agent_resumable_cli.md) — continuation protocol (orthogonal)
- [Fractanet mesh](../../operium/docs/fractanet-mesh.md) — node capabilities, `poco-jhr` dev stack
- [Packet Attractor](../../inseme/research/packet_attractor_fractanet.md) — attractor routing
- Operium issue [#6](https://github.com/JeanHuguesRobert/operium/issues/6) — Termux:Boot deferred

## Changelog

| Date | Change |
|------|--------|
| 2026-07-07 | Initial specification draft |
| 2026-07-07 | §7.4 Expect-equivalent semantics, pattern tables, calibration workflow |
| 2026-07-08 | Added invocation runbook reference |
