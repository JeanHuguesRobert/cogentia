#!/usr/bin/env node
/**
 * Cross-node acceptance: blackboard → resolve → tools → shell-repl reuse.
 *
 * Usage:
 *   node scripts/ops/accept-agent-gateway-fractanet.js
 *   npm run accept:agent-gateway
 */

import { loadAgentGatewayEnv, parseBooleanEnv } from "../lib/agent-gateway-env.js";
import {
  createAgentGatewayClient,
  invokeThroughGateway,
} from "../lib/agent-gateway-client.js";

loadAgentGatewayEnv();

const blackboardUrl = String(process.env.COGENTIA_BLACKBOARD_URL || "").trim();
const attractorId = String(process.env.AGENT_GATEWAY_ACCEPT_ATTRACTOR_ID || "attractor:i7-thinkpad-jhr:agent-cli-gateway").trim();
const capability = String(process.env.AGENT_GATEWAY_ACCEPT_CAPABILITY || "dev.tools.shell").trim();
const hostname = String(process.env.AGENT_GATEWAY_ACCEPT_HOST || "i7-thinkpad-jhr").trim();
const token = String(
  process.env.AGENT_GATEWAY_ACCEPT_TOKEN
  || process.env.AGENT_GATEWAY_INVOKE_TOKEN
  || process.env.AGENT_GATEWAY_TOKEN
  || "",
).trim();
const skipRepl = parseBooleanEnv(process.env.AGENT_GATEWAY_ACCEPT_SKIP_REPL, false);

const clientOptions = {
  blackboardUrl,
  token,
  attractorId,
  capability,
  hostname,
};

const report = {
  ok: false,
  blackboard_url: blackboardUrl || null,
  attractor_id: attractorId,
  capability,
  hostname,
};

if (!blackboardUrl) {
  fail(report, "missing_blackboard_url");
}

try {
  const client = createAgentGatewayClient(clientOptions);
  const route = await client.resolve();
  report.blackboard = {
    ok: true,
    endpoint: route.endpoint,
    attractor_id: route.attractor_id,
    status: route.status,
    fresh: route.fresh,
    snapshot_at: route.snapshot_at || null,
  };

  const health = await client.health();
  report.health = { ok: health.ok === true, repl_sessions: health.repl_sessions ?? null };

  const tools = await client.listTools();
  const toolList = Array.isArray(tools.data) ? tools.data : [];
  report.tools = {
    ok: toolList.length > 0,
    count: toolList.length,
    ids: toolList.map(item => item.id),
  };

  const shellTool = toolList.find(item => Array.isArray(item.models) && item.models.includes("shell-repl"));
  if (!shellTool?.probe?.ok) {
    fail(report, "shell_repl_unavailable");
  }

  if (!skipRepl) {
    if (!token) fail(report, "missing_gateway_token_for_repl");

    const turnOne = await invokeThroughGateway({
      ...clientOptions,
      model: "shell-repl",
      prompt: "echo FRACTANET_TURN1",
      repl: true,
      expect: "FRACTANET_TURN1",
    });
    const sessionId = turnOne.session_id;
    report.repl = {
      turn1: {
        ok: Boolean(sessionId),
        session_id: sessionId,
        content: turnOne.content?.slice(0, 80) || null,
      },
    };
    if (!sessionId) fail(report, "repl_turn1_no_session");

    const turnTwo = await invokeThroughGateway({
      ...clientOptions,
      model: "shell-repl",
      prompt: "echo FRACTANET_TURN2",
      repl: true,
      expect: "FRACTANET_TURN2",
      sessionId,
    });
    report.repl.turn2 = {
      ok: turnTwo.session_id === sessionId,
      session_id: turnTwo.session_id,
      session_reused: turnTwo.timing?.session_reused ?? null,
      content: turnTwo.content?.slice(0, 80) || null,
    };
    if (!report.repl.turn2.ok) fail(report, "repl_session_not_reused");
  }

  report.ok = true;
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  fail(report, String(error.code || error.message || "accept_failed"), {
    ...(error.detail && typeof error.detail === "object" ? error.detail : {}),
    message: error.message || null,
  });
}

function fail(report, error, detail = null) {
  report.ok = false;
  report.error = error;
  if (detail) report.detail = detail;
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}