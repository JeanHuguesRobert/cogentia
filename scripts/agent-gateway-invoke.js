#!/usr/bin/env node
/**
 * Invoke agent-cli-gateway via blackboard routing (Phase 2 action plane client).
 *
 * Usage:
 *   node scripts/agent-gateway-invoke.js --model shell-repl --prompt "echo ROUTED_OK" --repl --expect ROUTED_OK
 *   node scripts/agent-gateway-invoke.js --capability dev.tools.shell --model shell-repl --prompt "echo OK" --repl --expect OK
 *   node scripts/agent-gateway-invoke.js --endpoint http://i7-thinkpad-jhr:8793 --model grok-build --prompt "say OK"
 *
 * Environment:
 *   COGENTIA_BLACKBOARD_URL
 *   AGENT_GATEWAY_INVOKE_TOKEN / AGENT_GATEWAY_TOKEN
 *   AGENT_GATEWAY_INVOKE_ENDPOINT   skip blackboard when set
 *   AGENT_GATEWAY_INVOKE_CAPABILITY
 *   AGENT_GATEWAY_INVOKE_ATTRACTOR_ID
 *   AGENT_GATEWAY_INVOKE_HOST
 */

import { loadAgentGatewayEnv, parseBooleanEnv } from "./lib/agent-gateway-env.js";
import {
  clientError,
  createAgentGatewayClient,
  extractCompletionContent,
  invokeThroughGateway,
} from "./lib/agent-gateway-client.js";

loadAgentGatewayEnv();

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const command = args.command || "invoke";

try {
  if (command === "resolve") {
    await runResolve(args);
  } else if (command === "tools") {
    await runTools(args);
  } else if (command === "health") {
    await runHealth(args);
  } else if (command === "invoke") {
    await runInvoke(args);
  } else {
    throw clientError("unknown_command", `Unknown command: ${command}`);
  }
} catch (error) {
  const payload = {
    ok: false,
    error: error.code || error.message || "invoke_failed",
    message: error.message || null,
    detail: error.detail || null,
  };
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

async function runInvoke(args) {
  const result = await invokeThroughGateway(buildClientOptions(args));
  const output = {
    ok: true,
    command: "invoke",
    model: result.model,
    content: result.content,
    session_id: result.session_id,
    timing: result.timing,
    route: result.route,
  };
  if (args.contentOnly) {
    process.stdout.write(String(result.content || ""));
    if (output.content && !String(output.content).endsWith("\n")) process.stdout.write("\n");
    return;
  }
  console.log(JSON.stringify(output, null, 2));
}

async function runResolve(args) {
  const client = createAgentGatewayClient(buildClientOptions(args));
  const route = await client.resolve();
  console.log(JSON.stringify({ ok: true, command: "resolve", route }, null, 2));
}

async function runTools(args) {
  const client = createAgentGatewayClient(buildClientOptions(args));
  const tools = await client.listTools();
  console.log(JSON.stringify({
    ok: true,
    command: "tools",
    route: tools._route,
    count: Array.isArray(tools.data) ? tools.data.length : 0,
    data: tools.data,
  }, null, 2));
}

async function runHealth(args) {
  const client = createAgentGatewayClient(buildClientOptions(args));
  const health = await client.health();
  console.log(JSON.stringify({
    ok: true,
    command: "health",
    route: health._route,
    service: health.service,
    repl_sessions: health.repl_sessions,
    tools: Array.isArray(health.tools) ? health.tools.length : 0,
  }, null, 2));
}

function buildClientOptions(args) {
  return {
    blackboardUrl: args.blackboardUrl || process.env.COGENTIA_BLACKBOARD_URL,
    token: args.token
      || process.env.AGENT_GATEWAY_INVOKE_TOKEN
      || process.env.AGENT_GATEWAY_ACCEPT_TOKEN
      || process.env.AGENT_GATEWAY_TOKEN,
    endpoint: args.endpoint || process.env.AGENT_GATEWAY_INVOKE_ENDPOINT,
    attractorId: args.attractorId || process.env.AGENT_GATEWAY_INVOKE_ATTRACTOR_ID,
    capability: args.capability || process.env.AGENT_GATEWAY_INVOKE_CAPABILITY,
    model: args.model,
    hostname: args.hostname || process.env.AGENT_GATEWAY_INVOKE_HOST,
    allowDegraded: args.allowDegraded,
    ...(Number.isFinite(args.timeoutMs) ? { timeoutMs: args.timeoutMs } : {}),
    prompt: args.prompt,
    stream: args.stream,
    repl: args.repl,
    expect: args.expect,
    sessionId: args.sessionId,
    cwd: args.cwd,
    metadata: args.metadata,
    includeRaw: args.raw,
  };
}

function parseArgs(argv) {
  const args = {
    command: "invoke",
    help: false,
    contentOnly: false,
    stream: false,
    repl: false,
    allowDegraded: parseBooleanEnv(process.env.AGENT_GATEWAY_INVOKE_ALLOW_DEGRADED, false),
    raw: false,
  };

  const takeValue = index => {
    const value = argv[index + 1];
    if (value == null || value.startsWith("-")) return null;
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "resolve" || arg === "tools" || arg === "health" || arg === "invoke") {
      args.command = arg;
      continue;
    }
    if (arg === "--blackboard" || arg === "--blackboard-url") {
      args.blackboardUrl = takeValue(i); i++; continue;
    }
    if (arg === "--token") { args.token = takeValue(i); i++; continue; }
    if (arg === "--endpoint") { args.endpoint = takeValue(i); i++; continue; }
    if (arg === "--attractor-id") { args.attractorId = takeValue(i); i++; continue; }
    if (arg === "--capability") { args.capability = takeValue(i); i++; continue; }
    if (arg === "--hostname" || arg === "--host") { args.hostname = takeValue(i); i++; continue; }
    if (arg === "--model") { args.model = takeValue(i); i++; continue; }
    if (arg === "--prompt" || arg === "-p") { args.prompt = takeValue(i); i++; continue; }
    if (arg === "--expect") { args.expect = takeValue(i); i++; continue; }
    if (arg === "--session-id") { args.sessionId = takeValue(i); i++; continue; }
    if (arg === "--cwd") { args.cwd = takeValue(i); i++; continue; }
    if (arg === "--timeout-ms") {
      const value = Number(takeValue(i));
      if (Number.isFinite(value) && value > 0) args.timeoutMs = value;
      i++;
      continue;
    }
    if (arg === "--metadata") {
      args.metadata = JSON.parse(takeValue(i) || "{}");
      i++;
      continue;
    }
    if (arg === "--stream") { args.stream = true; continue; }
    if (arg === "--repl") { args.repl = true; continue; }
    if (arg === "--allow-degraded") { args.allowDegraded = true; continue; }
    if (arg === "--content-only") { args.contentOnly = true; continue; }
    if (arg === "--raw") { args.raw = true; continue; }
    if (arg === "--") {
      args.prompt = argv.slice(i + 1).join(" ").trim();
      break;
    }
    if (!arg.startsWith("-") && !args.prompt && args.command === "invoke") {
      args.prompt = argv.slice(i).join(" ").trim();
      break;
    }
  }

  return args;
}

function printHelp() {
  console.log(`agent-gateway-invoke — blackboard-routed agent CLI gateway client

Usage:
  node scripts/agent-gateway-invoke.js [command] [options]

Commands:
  invoke    POST /v1/chat/completions (default)
  resolve   Print resolved endpoint from blackboard
  tools     GET /v1/tools
  health    GET /health

Options:
  --blackboard-url <url>   fracta guide base (COGENTIA_BLACKBOARD_URL)
  --endpoint <url>         direct gateway URL (skip blackboard)
  --token <bearer>         AGENT_GATEWAY_INVOKE_TOKEN / AGENT_GATEWAY_TOKEN
  --attractor-id <id>      pin attractor
  --capability <cap>       e.g. dev.tools.shell
  --hostname <host>        filter by MagicDNS host
  --model <id>             e.g. shell-repl, grok-build
  --prompt, -p <text>      user message
  --repl                   metadata.adapter_mode=repl
  --expect <pattern>       REPL expect regex/string
  --session-id <id>        reuse REPL session
  --cwd <path>             metadata.cwd
  --content-only           print assistant text only
  --allow-degraded         accept degraded attractors

Examples:
  node scripts/agent-gateway-invoke.js --capability dev.tools.shell --model shell-repl --repl --expect ROUTED_OK --prompt "echo ROUTED_OK"
  node scripts/agent-gateway-invoke.js resolve --capability dev.tools.shell
`);
}

export { extractCompletionContent };