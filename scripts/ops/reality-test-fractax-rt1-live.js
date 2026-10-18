#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveAgentGatewayAttractor } from "../lib/agent-gateway-resolve.js";
import { loadAgentGatewayEnv } from "../lib/agent-gateway-env.js";

loadAgentGatewayEnv();

const blackboardUrl = String(process.env.COGENTIA_BLACKBOARD_URL || "").trim();
if (!blackboardUrl) {
  console.error(JSON.stringify({ ok:false, error:"missing_blackboard_url" }, null, 2));
  process.exit(2);
}

const token =
  process.env.COGENTIA_API_KEY ||
  process.env.AGENT_GATEWAY_INVOKE_TOKEN ||
  process.env.AGENT_GATEWAY_ACCEPT_TOKEN ||
  process.env.AGENT_GATEWAY_TOKEN ||
  null;

const capability = process.argv[2] || "agent.cli.gateway";
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cogentia-rt1-live-"));
const cachePath = path.join(tmpDir, "blackboard-cache.json");
const unreachableBlackboard = "http://127.0.0.1:9";

try {
  const warm = await resolveAgentGatewayAttractor({
    blackboardUrl,
    capability,
    cachePath,
    token,
    timeoutMs: 3000,
  });

  if (!warm.ok || warm.routed_via !== "blackboard") {
    console.error(JSON.stringify({ ok:false, phase:"warm", result:warm }, null, 2));
    process.exit(3);
  }

  const offline = await resolveAgentGatewayAttractor({
    blackboardUrl: unreachableBlackboard,
    capability,
    cachePath,
    token,
    timeoutMs: 250,
  });

  const passed = Boolean(
    offline.ok &&
    offline.routed_via === "offline_cache_fallback" &&
    offline.endpoint
  );

  console.log(JSON.stringify({
    ok: passed,
    reality_test: "fractax-rt1-process-local-blackboard-loss",
    capability,
    blackboard_scope: "one-client-process-only",
    destructive_network_change: false,
    warm: {
      ok: warm.ok,
      routed_via: warm.routed_via,
      attractor_id: warm.attractor?.id || null,
      endpoint: warm.endpoint || null,
      snapshot_at: warm.snapshot_at || null,
    },
    offline: {
      ok: offline.ok,
      error: offline.error || null,
      routed_via: offline.routed_via || null,
      attractor_id: offline.attractor?.id || null,
      endpoint: offline.endpoint || null,
      snapshot_at: offline.snapshot_at || null,
    },
  }, null, 2));

  process.exit(passed ? 0 : 4);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
