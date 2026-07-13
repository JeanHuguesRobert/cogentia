# Agent Gateway invocation runbook

This document explains how a human operator or an agent can invoke the
Agent CLI Gateway through the governed Fractanet routing path.

The gateway is an action-plane tool. It can run coding-agent adapters and shell
or REPL sessions on a capable host. It is not a public Internet API and it is
not a corpus retrieval endpoint.

Related doctrine:

- [Agent CLI Gateway](../research/agent_cli_gateway.md)
- [Trusted Boundaries](../research/trusted_boundaries.md)
- [Cogentia Context Gateway](cogentia-context-gateway.md)

## Boundary rule

Use the Agent Gateway only inside an administrative trust boundary, typically a
Tailscale mesh or localhost.

The routing flow is:

```text
caller
  -> blackboard / packet attractor lookup
  -> selected agent-gateway endpoint
  -> /v1/chat/completions on the tool host
  -> coding-agent or REPL adapter
```

The client does not query SQLite, does not read the corpus filesystem directly,
and does not publish the gateway as a public web route. The gateway endpoint may
execute commands, so it belongs to a stronger boundary than public RAG search.

## Configuration

The invocation client loads environment values from process environment first,
then from local secret env files when present. Secret files are local machine
configuration and must not be committed.

Common variables:

```text
COGENTIA_BLACKBOARD_URL
AGENT_GATEWAY_INVOKE_TOKEN
AGENT_GATEWAY_ACCEPT_TOKEN
AGENT_GATEWAY_TOKEN
AGENT_GATEWAY_INVOKE_ENDPOINT
AGENT_GATEWAY_INVOKE_CAPABILITY
AGENT_GATEWAY_INVOKE_ATTRACTOR_ID
AGENT_GATEWAY_INVOKE_HOST
```

`AGENT_GATEWAY_INVOKE_ENDPOINT` bypasses blackboard resolution and talks to one
gateway directly. Prefer blackboard routing for Fractanet acceptance checks, and
direct endpoint mode for local debugging.

## Commands

From the `cogentia` repository:

```bash
npm run invoke:agent-gateway -- --help
```

The command is a wrapper for:

```bash
node scripts/agent-gateway-invoke.js
```

Available subcommands:

```bash
node scripts/agent-gateway-invoke.js resolve --capability dev.tools.shell
node scripts/agent-gateway-invoke.js health --capability dev.tools.shell
node scripts/agent-gateway-invoke.js tools --capability dev.tools.shell
node scripts/agent-gateway-invoke.js invoke --model shell-repl --prompt "echo OK" --repl --expect OK
```

The default subcommand is `invoke`, so this is equivalent:

```bash
node scripts/agent-gateway-invoke.js --model shell-repl --prompt "echo OK" --repl --expect OK
```

Useful options:

```text
--blackboard-url <url>   blackboard or Fracta Guide base URL
--endpoint <url>         direct gateway endpoint, skipping blackboard
--token <bearer>         gateway bearer token
--attractor-id <id>      exact attractor id
--capability <name>      capability filter, for example dev.tools.shell
--hostname <host>        MagicDNS or node hostname filter
--model <id>             adapter model, for example shell-repl
--prompt <text>          user turn
--repl                   request a reusable REPL session
--session-id <id>        reuse a previous REPL session
--cwd <path>             requested working directory metadata
--expect <pattern>       expected output marker for REPL tools
--content-only           print only assistant text
--allow-degraded         allow a degraded attractor
```

## Acceptance check

Run the cross-node Fractanet acceptance script when the blackboard and gateway
host are expected to be reachable:

```bash
npm run accept:agent-gateway
```

The script checks:

- blackboard route resolution;
- gateway health;
- available tools;
- `shell-repl` probe state;
- optional two-turn REPL session reuse.

Set this variable to skip the REPL turn while still checking routing and tools:

```bash
AGENT_GATEWAY_ACCEPT_SKIP_REPL=1 npm run accept:agent-gateway
```

If the gateway requires a bearer token, provide it through environment or the
local secret env file. The scripts must never print token values.

## Typical agent workflow

An agent should use a narrow progression:

1. `resolve` to confirm the selected route.
2. `health` to confirm the endpoint is alive.
3. `tools` to inspect available adapters and trust-boundary metadata.
4. `invoke` only after the route and model are explicit.

Example:

```bash
node scripts/agent-gateway-invoke.js resolve --capability dev.tools.shell
node scripts/agent-gateway-invoke.js tools --capability dev.tools.shell
node scripts/agent-gateway-invoke.js --model shell-repl --repl --expect ROUTED_OK --prompt "echo ROUTED_OK"
```

For a long-lived shell REPL, keep and reuse the returned `session_id`:

```bash
node scripts/agent-gateway-invoke.js \
  --model shell-repl \
  --repl \
  --session-id <session-id> \
  --prompt "pwd"
```

## Failure interpretation

Common structured errors:

```text
missing_blackboard_url       no COGENTIA_BLACKBOARD_URL and no --endpoint
attractor_not_found          no blackboard attractor matched filters
attractor_degraded           matched attractor is degraded without --allow-degraded
missing_model                invoke was called without --model
missing_prompt               invoke was called without --prompt
gateway_request_failed       gateway returned non-2xx
```

Treat degraded or missing attractors as routing state, not as corpus state. The
canonical corpus remains Git and Markdown; the Agent Gateway is an operational
action endpoint.

## Public exposure

Do not expose the Agent Gateway directly on the public Internet.

Public users may use the Cogentia Context Gateway read routes. The Agent Gateway
belongs to a local or Tailnet administrative boundary because it can cross from
reading into action. If a future public facade is needed, it should be a separate
read-only or tightly mediated service, not the raw `/v1/chat/completions`
action endpoint.

## Mobile Setup (poco-jhr)

For mobile-attractor nodes running Termux on Android:

1. **proot-distro containment**: Because the Google `agy` dynamic binary requires glibc (unavailable natively on Termux Bionic libc), `agy` is installed inside the Ubuntu proot container under `/root/.local/bin/agy`.
2. **Interactive Auth Step**: The Bubble Tea framework inside `agy` requires a TTY to initialize. Before running headlessly, log into the container manually once over SSH:
   ```bash
   ssh poco-jhr
   proot-distro login ubuntu
   agy
   ```
   Follow the Google OAuth sign-in flow (copy the login URL and complete it in your browser).
3. **Headless Wrapper**: A Termux wrapper `~/.local/bin/agy` delegates directly to the container using:
   ```bash
   exec proot-distro run ubuntu -- /root/.local/bin/agy "$@"
   ```
   Using `proot-distro run` instead of `login` avoids hanging waiting for TTY resource allocations.
4. **Heartbeat Config**: The mobile daemon reads `~/srv/cogentia/secrets/agent-gateway-blackboard.env` to push heartbeat snapshots (containing the mobile's capability list and models `"agy"`, `"antigravity"`, `"claude"`, `"grok"`) to the `fracta` VPS.

Antigravity headless calls preserve the CLI permission boundary by default. The
`--dangerously-skip-permissions` flag is added only when the operator explicitly
sets `AGENT_GATEWAY_AGY_SKIP_PERMISSIONS=1` in a protected, non-public runtime
environment. Do not enable it on a public or broadly delegated gateway.

## Verification

Local deterministic checks:

```bash
node scripts/test-agent-gateway-client.js
node scripts/test-agent-gateway-bind.js
node scripts/test-agent-gateway.js
node scripts/test-agent-gateway-session-entities.js
git diff --check
```

Full package script:

```bash
npm run test:agent-gateway
```

`psql` and `ipython` probes may be skipped when the host does not provide those
tools. A skipped optional probe is not a routing failure.
