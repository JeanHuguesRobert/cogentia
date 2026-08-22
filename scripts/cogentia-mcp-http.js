#!/usr/bin/env node

/*
 * HTTP MCP adapter for the Cogentia Context Gateway.
 * The primary endpoint is POST /mcp with JSON-RPC messages.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  boundedInteger,
  jsonRpcError,
  mcpToolResult,
  SERVER_NAME,
  SERVER_VERSION,
  transportFromHttpRequest,
} from "./lib/cogentia-mcp-core.js";
import { createRegistryAwareMcpCore } from "./lib/cogentia-mcp-registries.js";
import { aiRouterHealth } from "./lib/ai-router-client.js";
import { mergeGuideRetrievalFromPacks } from "./lib/guide-retrieval-merge.js";
import { retrievalInoxConfigured, retrievalInoxPackBatch, inoxRetrievalBaseUrl } from "./lib/retrieval-inox-session.js";
import { retrievalSupabaseConfigured, retrievalSupabasePackBatch } from "./lib/retrieval-supabase.js";
import {
  BLACKBOARD_EVENTS,
  createBlackboardStore,
  hasBlackboardUpsertAuth,
  parseBlackboardUpsertBody,
} from "./lib/packet-attractor-blackboard.js";
import { buildFractanetOpsStatus } from "./lib/fractanet-ops-status.js";
import {
  actionRouteToken,
  hasActionRouteAuth,
  parseActionRouteBody,
  routeActionThroughGateway,
} from "./lib/agent-gateway-route.js";
import { createAgentGatewayClient } from "./lib/agent-gateway-client.js";
import { handleOpsNodeProxyRequest } from "./lib/ona-proxy.js";
import { handleEdgeTrapPost, handleEdgeTrapsGet } from "./lib/edge-trap-ops.js";
import { createJhnOpenAiSurface, isTwinOpenAiPath } from "./lib/jhn-openai-surface.js";
import {
  buildCrossSurfaceStyleBlock,
  buildWhatsAppRepresentationMessages,
} from "./lib/agent-jhn-whatsapp/representation-brief.js";
import {
  openSurfaceTurnPacket,
  spawnSurfaceDownstream,
  recordPacketProviderSpend,
  projectTurnAccounting,
} from "./lib/cop-surface-accounting.js";
import { runHandoffPacket } from "./lib/john-handoff.js";
import { sendHandoffPacket } from "./lib/john-handoff-transport.js";
import { CapabilityInspector } from "./lib/john-diagnostic/inspectors/capability-inspector.js";
import { createProviderCircuitBreaker } from "./lib/provider-circuit-breaker.js";
import { resolveSourceUrl, formatSourceMarkdownLink } from "./lib/source-deep-links.js";
import { synthesizeSmartExtractiveAnswer } from "./lib/smart-extractive-synthesizer.js";
import { createSemanticAnswerCache } from "./lib/semantic-answer-cache.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const fractanetDashboardPath = path.join(moduleDir, "ops", "fractanet-dashboard.html");
const guideDashboardPath = path.join(moduleDir, "ops", "guide-ui.html");

loadOptionalEnvFiles([
  process.env.COGENTIA_MCP_ENV_FILE,
  process.env.COGENTIA_GUIDE_ENV_FILE,
  process.env.COGENTIA_WEB_SEARCH_ENV_FILE,
  process.env.COGENTIA_ENV_FILE,
]);

const core = createRegistryAwareMcpCore();
const blackboard = createBlackboardStore();
const providerCircuitBreaker = createProviderCircuitBreaker();
const semanticAnswerCache = createSemanticAnswerCache();
const port = boundedInteger(process.env.PORT || process.env.COGENTIA_MCP_PORT, 8791, 1, 65535);
const host = process.env.COGENTIA_MCP_HOST || "0.0.0.0";
const guideAgentGateway = process.env.COGENTIA_GUIDE_AGENT_GATEWAY === "1";
// S7 remains a navigation/audit tool. The public Guide relies on the
// precomputed Supabase admissibility projection by default, so it must not
// synchronously resolve and fetch an anchor for every question.
const guideS7AnchorEnabled = process.env.COGENTIA_GUIDE_S7_ANCHOR === "1";
let guideAgentSessionId = String(process.env.COGENTIA_GUIDE_AGENT_SESSION_ID || "").trim();
let guideAgentSessionInit = null;

/** Cached AI-router chat probe so intent+planner+synthesis don't each pay a health RTT. */
const GUIDE_CHAT_PROBE_TTL_MS = boundedInteger(process.env.COGENTIA_GUIDE_CHAT_PROBE_TTL_MS, 15000, 1000, 120000);
let guideChatProbeCache = { at: 0, value: null };
// Semantic retrieval is the nominal Guide regime. Keyword-only results are a
// degraded fallback and must remain visible to the operational control plane.
let guideSemanticRetrieval = { state: "unknown", observed_at: null, warnings: [] };

/**
 * Fail-fast gate: when Magistral reports llm:false (or no chat capability),
 * Guide must not chain three serial ~15s chat timeouts.
 */
async function guideChatCapability() {
  const now = Date.now();
  if (guideChatProbeCache.value && now - guideChatProbeCache.at < GUIDE_CHAT_PROBE_TTL_MS) {
    return guideChatProbeCache.value;
  }
  if (guideAgentGateway) {
    const value = { available: true, reason: "agent_gateway", probe_ms: 0 };
    guideChatProbeCache = { at: now, value };
    return value;
  }
  const hasDirectOpenAi = Boolean(String(process.env.OPENAI_API_KEY || process.env.COGENTIA_OPENAI_API_KEY || "").trim());
  const hasDirectOpenRouter = Boolean(String(process.env.OPENROUTER_API_KEY || process.env.COGENTIA_OPENROUTER_API_KEY || "").trim());
  const openRouterFreeEnabled = guideOpenRouterFreeEnabled();

  const openAiHealthy = hasDirectOpenAi && providerCircuitBreaker.isAvailable("openai");
  const openRouterHealthy = hasDirectOpenRouter
    && (providerCircuitBreaker.isAvailable("openrouter")
      || (openRouterFreeEnabled && providerCircuitBreaker.isAvailable("openrouter_free")));

  if (openAiHealthy || openRouterHealthy) {
    const reason = openAiHealthy
      ? "openai_direct_configured"
      : openRouterFreeEnabled && !providerCircuitBreaker.isAvailable("openrouter")
        ? "openrouter_free_fallback_configured"
        : "openrouter_direct_configured";
    const value = { available: true, reason, probe_ms: 0 };
    guideChatProbeCache = { at: now, value };
    return value;
  }

  // When all direct providers are configured but their circuit breakers are OPEN (e.g. 429 quota):
  if ((hasDirectOpenAi || hasDirectOpenRouter) && !openAiHealthy && !openRouterHealthy) {
    const value = {
      available: false,
      reason: "all_direct_providers_circuit_open",
      probe_ms: 0,
      circuits: providerCircuitBreaker.snapshot(),
    };
    guideChatProbeCache = { at: now, value };
    return value;
  }

  const started = Date.now();
  try {
    const health = await aiRouterHealth({
      timeoutMs: boundedInteger(process.env.COGENTIA_GUIDE_CHAT_PROBE_TIMEOUT_MS, 2000, 500, 10000),
    });
    // Fail-fast only when router is reachable and explicitly reports no chat.
    // Unreachable → optimistic (attempt synthesis; daemon/fallback still fail short).
    let value;
    if (!health.available) {
      value = {
        available: true,
        reason: "router_unreachable_optimistic",
        probe_ms: Date.now() - started,
        error: health.error,
      };
    } else {
      const chatAvailable = health.chat?.available !== false;
      value = {
        available: chatAvailable,
        reason: health.chat?.reason || (chatAvailable ? "chat_ready" : "chat_unavailable"),
        probe_ms: Date.now() - started,
        llm: health.llm,
        mode: health.mode,
      };
    }
    guideChatProbeCache = { at: now, value };
    return value;
  } catch (error) {
    const value = { available: true, reason: "probe_error", message: error.message, probe_ms: Date.now() - started };
    guideChatProbeCache = { at: now, value };
    return value;
  }
}

async function guideSynthesisPost(payload) {
  if (!guideAgentGateway) {
    // 1. Daemon / Magistral router (if circuit is not OPEN)
    if (providerCircuitBreaker.isAvailable("daemon")) {
      const routed = await daemonPost("/v1/chat/completions", payload, { timeoutMs: 5000 });
      if (routed.ok) {
        providerCircuitBreaker.recordSuccess("daemon");
        return routed;
      }
      providerCircuitBreaker.recordFailure("daemon", routed.error || "daemon_failed", routed.status || 0);
    }

    // 2. Direct OpenAI (gpt-5.6-sol -> gpt-5.6-terra)
    if (providerCircuitBreaker.isAvailable("openai")) {
      const directOpenAi = await guideOpenAiChatCompletions(payload);
      if (directOpenAi.ok) return directOpenAi;
    }

    // 3. Direct OpenRouter (Claude-5 / Llama / DeepSeek)
    if (providerCircuitBreaker.isAvailable("openrouter")
      || (guideOpenRouterFreeEnabled() && providerCircuitBreaker.isAvailable("openrouter_free"))) {
      const directOpenRouter = await guideOpenRouterChatCompletions(payload);
      if (directOpenRouter.ok) return directOpenRouter;
    }

    return {
      ok: false,
      error: "all_synthesis_providers_unavailable",
      status: 503,
      circuits: providerCircuitBreaker.snapshot(),
    };
  }
  if (!guideAgentSessionId && guideAgentSessionInit) await guideAgentSessionInit;
  const client = createAgentGatewayClient({
    endpoint: process.env.COGENTIA_GUIDE_AGENT_GATEWAY_ENDPOINT || "http://127.0.0.1:8793",
    token:
      process.env.AGENT_GATEWAY_INVOKE_TOKEN
      || process.env.AGENT_GATEWAY_TOKEN
      || process.env.COGENTIA_API_KEY
      || "",
    model: process.env.COGENTIA_GUIDE_AGENT_MODEL || "codex",
    timeoutMs: Number(process.env.COGENTIA_GUIDE_AGENT_TIMEOUT_MS || 120000),
  });
  const request = async () => {
    const metadata = {
      ...(payload.metadata || {}),
      adapter_mode: "repl",
      session_id: guideAgentSessionId || undefined,
      agent_session: "fractavolta-public-guide",
    };
    const result = await client.chatCompletion({
      ...payload,
      model: process.env.COGENTIA_GUIDE_AGENT_MODEL || "codex",
      metadata,
    });
    const sessionId = String(result.body?.metadata?.session_id || "").trim();
    if (sessionId) guideAgentSessionId = sessionId;
    return result;
  };
  try {
    if (!guideAgentSessionId) {
      guideAgentSessionInit = request();
      const result = await guideAgentSessionInit;
      guideAgentSessionInit = null;
      return { ok: true, status: 200, body: result.body };
    }
    const result = await request();
    return { ok: true, status: 200, body: result.body };
  } catch (error) {
    guideAgentSessionInit = null;
    return { ok: false, status: error.status || 502, error: error.code || "guide_agent_gateway_failed", body: error.body || null };
  }
}
const guideLimit = boundedInteger(process.env.COGENTIA_GUIDE_LIMIT, 8, 1, 12);
const guideBudget = boundedInteger(process.env.COGENTIA_GUIDE_BUDGET, 14000, 256, 30000);
const guideQueryLimit = boundedInteger(process.env.COGENTIA_GUIDE_QUERY_LIMIT, 6, 1, 10);
const guideBatchEnabled = parseBoolean(process.env.COGENTIA_GUIDE_BATCH, true);
function resolveGuideRetrievalBackend() {
  if (retrievalInoxConfigured()) return "inox-session";
  if (retrievalSupabaseConfigured()) return "supabase";
  return guideBatchEnabled ? "daemon-batch" : "daemon-sequential";
}
const guideRetrievalBackend = resolveGuideRetrievalBackend();
const guidePlannerEnabled = parseBoolean(process.env.COGENTIA_GUIDE_PLANNER, true);
const guidePlannerQueryLimit = boundedInteger(process.env.COGENTIA_GUIDE_PLANNER_QUERY_LIMIT, 5, 1, 8);
const guideHistoryLimit = boundedInteger(process.env.COGENTIA_GUIDE_HISTORY_LIMIT, 16, 0, 24);
const guideWebSearchEnabled = parseBoolean(process.env.COGENTIA_GUIDE_WEB_SEARCH, true);
const guideWebSearchLimit = boundedInteger(process.env.COGENTIA_GUIDE_WEB_SEARCH_LIMIT, 5, 1, 10);
const guideWebSearchUrl = process.env.COGENTIA_GUIDE_WEB_SEARCH_URL || "https://api.search.brave.com/res/v1/web/search";
const guideModel = process.env.COGENTIA_GUIDE_MODEL || "fractavolta-guide";
const guideInstanceId = process.env.COGENTIA_GUIDE_INSTANCE_ID || "fractavolta-public-guide";
const guideMandate = {
  instance_id: guideInstanceId,
  surface: "web-guide",
  maturity: "infant",
  corpus_view: "public",
  allowed: ["orient", "retrieve", "cite", "explain-public-corpus"],
  forbidden: ["private-view", "mutate", "publish", "unbounded-provider-spend", "owner-impersonation"],
};
const allowedOrigins = String(process.env.COGENTIA_CORS_ORIGIN || "http://localhost:*")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

/** Agent JHN OpenAI-compat surface (public + owner key). Fracta host under /guide/v1/* . */
const jhnOpenAi = createJhnOpenAiSurface({
  produceAnswer: produceJhnPublicAnswer,
});

const server = http.createServer(async (req, res) => {
  try {
    applyCors(req, res);
    if (req.method === "OPTIONS") return sendNoContent(res, 204);
    if (req.method === "GET" && req.url === "/health") return sendJson(res, 200, await health());
    if (req.method === "HEAD" && req.url === "/health") return sendNoContent(res, 200);
    if (req.method === "GET" && req.url === "/tools") return sendJson(res, 200, { tools: core.tools });
    if (req.method === "GET" && req.url === "/guide/health") return sendJson(res, 200, await guideHealth());
    if (req.method === "GET" && (req.url === "/guide" || req.url === "/guide/" || req.url === "/guide/ui")) return handleGuideUi(req, res);
    if (req.method === "GET" && req.url?.startsWith("/ops/blackboard")) return handleBlackboardGet(req, res);
    if (req.method === "POST" && req.url === "/ops/blackboard/upsert") return handleBlackboardUpsert(req, res);
    if (req.method === "GET" && req.url === "/ops/status") return handleOpsStatus(req, res);
    if (req.method === "GET" && req.url === "/ops/dashboard") return handleOpsDashboard(req, res);
    if (req.method === "POST" && req.url === "/ops/route/action") return handleOpsRouteAction(req, res);
    if (req.method === "GET" && req.url?.startsWith("/ops/node/")) return handleOpsNodeProxy(req, res);
    if (req.method === "POST" && req.url === "/ops/edge/trap") return handleEdgeTrap(req, res);
    if (req.method === "GET" && req.url?.startsWith("/ops/edge/traps")) return handleEdgeTrapsList(req, res);
    if (req.method === "POST" && req.url === "/guide/chat") return handleGuideChat(req, res);
    // Cognitive Packet Ingestion & Attraction (Autonomous FractaNode Hub)
    if (req.method === "POST" && (req.url === "/cop/packet" || req.url === "/api/cop/packet" || req.url === "/packet")) {
      return handleCopPacketPost(req, res);
    }
    if (req.method === "GET" && (req.url === "/cop/capabilities" || req.url === "/capabilities")) {
      return handleCopCapabilitiesGet(req, res);
    }
    if (req.method === "GET" && (req.url === "/cop/health")) {
      return handleCopHealthGet(req, res);
    }
    // OpenAI Chat Completions surface for Agent JHN / UX tools (see lib/jhn-openai-surface.js)
    {
      const pathOnly = String(req.url || "").split("?")[0];
      if (req.method === "GET" && isTwinOpenAiPath(pathOnly) && pathOnly.endsWith("/models")) {
        return jhnOpenAi.handleModels(req, res, sendJson);
      }
      if (req.method === "POST" && isTwinOpenAiPath(pathOnly) && pathOnly.endsWith("/chat/completions")) {
        return jhnOpenAi.handleChatCompletions(req, res, {
          sendJson,
          readBody,
          sendOpenAiSse,
        });
      }
    }
    if (req.method === "GET" && req.url === "/sse") return sendSseInfo(req, res);
    if (req.method === "GET" && req.url === "/mcp") return sendSseInfo(req, res);
    if (req.method === "POST" && req.url === "/mcp") return handleMcpPost(req, res);
    if (req.method === "POST" && req.url?.startsWith("/tools/")) return handleToolPost(req, res);
    return sendJson(res, 404, { error: "not_found" });
  } catch (error) {
    return sendJson(res, 500, {
      content: [{ type: "text", text: error.message }],
      isError: true,
    });
  }
});

server.listen(port, host, () => {
  console.error(`Cogentia MCP HTTP server listening on ${host}:${port}`);
  console.error(`Daemon: ${core.daemonUrl.href}`);
  console.error("Endpoints: POST /mcp, GET /mcp, GET /health, GET /tools, POST /tools/{name}");
  console.error("Guide: POST /guide/chat, GET /guide/health");
  console.error("JHN OpenAI: GET /guide/v1/models, POST /guide/v1/chat/completions (also /twin/jhn/v1/*)");
  console.error("Blackboard: GET /ops/blackboard, POST /ops/blackboard/upsert");
  console.error("Ops: GET /ops/status, GET /ops/dashboard, POST /ops/route/action, GET /ops/node/:node_id/{status,drift,soma/object,soma/vocabulary}");
  console.error("Edge: POST /ops/edge/trap, GET /ops/edge/traps (trap-directed polling)");
  console.error("COP Attractor: POST /cop/packet, GET /cop/health, GET /cop/capabilities (mutualized FractaNode hub)");
});

const fractaNodeId = process.env.FRACTANET_NODE_ID || "node:fracta:main";
const sharedCapInspector = new CapabilityInspector();

async function handleCopPacketPost(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req, 1024 * 1024));
  } catch (err) {
    return sendJson(res, 400, { ok: false, error: `Malformed JSON: ${err.message}` });
  }

  if (!body || !body.envelope) {
    return sendJson(res, 400, { ok: false, error: "Invalid request: missing Cognitive Packet envelope" });
  }

  if (!Array.isArray(body.envelope.hops)) body.envelope.hops = [];
  body.envelope.hops.push({
    hop_index: body.envelope.hops.length,
    node_id: fractaNodeId,
    instance_id: "mcp-cogentia:hub",
    route_reason: "packet-received-at-mutualized-hub",
    timestamp: new Date().toISOString(),
  });

  const execution = await runHandoffPacket(body);

  let dispatchResult = null;
  const returnTarget = body.envelope.ithaca?.return_target;
  if (returnTarget && (returnTarget.startsWith("http://") || returnTarget.startsWith("https://") || returnTarget.startsWith("supabase://"))) {
    try {
      dispatchResult = await sendHandoffPacket(execution.returnPacket, { target: returnTarget });
    } catch (dispatchErr) {
      dispatchResult = { ok: false, error: dispatchErr.message };
    }
  }

  return sendJson(res, 200, {
    ok: execution.success,
    status: execution.returnPacket?.envelope?.status || "solved",
    packet_id: body.envelope.id,
    yield: execution.returnPacket?.yield || null,
    dispatch: dispatchResult,
    return_packet: execution.returnPacket,
    events_count: execution.events.length,
  });
}

async function handleCopCapabilitiesGet(_req, res) {
  const caps = await sharedCapInspector.inspect();
  return sendJson(res, 200, caps);
}

async function handleCopHealthGet(_req, res) {
  const caps = await sharedCapInspector.inspect();
  return sendJson(res, 200, {
    ok: true,
    node_id: fractaNodeId,
    status: "online",
    hub: "mutualized-mcp-cogentia",
    uptime_seconds: Math.floor(process.uptime()),
    capabilities: caps.map((c) => c.name),
    protocol: "cognitive_packet.v0",
  });
}

async function health() {
  const daemon = await core.callTool("cogentia_health", {});
  return { ok: true, mcp: SERVER_NAME, version: SERVER_VERSION, daemon };
}

async function guideHealth() {
  const daemon = await core.callTool("cogentia_health", {});
  const chat = await guideChatCapability();
  return {
    ok: true,
    service: "fractavolta-guide",
    public: true,
    model: guideModel,
    mandate: guideMandate,
    context: {
      limit: guideLimit,
      budget: guideBudget,
      query_limit: guideQueryLimit,
      batch_enabled: guideBatchEnabled,
      retrieval_backend: guideRetrievalBackend,
      inox_retrieval: {
        configured: retrievalInoxConfigured(),
        url: retrievalInoxConfigured() ? inoxRetrievalBaseUrl() : null,
        transport: "inox.session.v1",
      },
      planner_enabled: guidePlannerEnabled,
      planner_query_limit: guidePlannerQueryLimit,
      history_limit: guideHistoryLimit,
      chat: {
        available: chat.available,
        reason: chat.reason,
        fail_fast: true,
        probe_ms: chat.probe_ms,
      },
      web_search: {
        enabled: guideWebSearchEnabled,
        configured: Boolean(guideWebSearchApiKey()),
        limit: guideWebSearchLimit,
      },
      semantic_retrieval: guideSemanticRetrieval,
      provider_circuits: providerCircuitBreaker.snapshot(),
      provider_adapters: {
        openai: Boolean(String(process.env.OPENAI_API_KEY || process.env.COGENTIA_OPENAI_API_KEY || "").trim()),
        openrouter: Boolean(String(process.env.OPENROUTER_API_KEY || process.env.COGENTIA_OPENROUTER_API_KEY || "").trim()),
        openrouter_free_fallback: guideOpenRouterFreeEnabled(),
      },
      blackboard: summarizeBlackboardHealth(),
      action_route: {
        configured: Boolean(actionRouteToken()),
        gateway_token_configured: Boolean(
          String(
            process.env.COGENTIA_API_KEY
            || process.env.AGENT_GATEWAY_INVOKE_TOKEN
            || process.env.AGENT_GATEWAY_ACCEPT_TOKEN
            || process.env.AGENT_GATEWAY_TOKEN
            || "",
          ).trim(),
        ),
      },
      daemon,
    },
  };
}

function summarizeBlackboardHealth() {
  const snapshot = blackboard.snapshot({ fresh: false });
  const fresh = blackboard.snapshot({ fresh: true });
  return {
    store_path: blackboard.storePath,
    snapshot_at: snapshot.snapshot_at,
    attractor_count: snapshot.count,
    fresh_attractor_count: fresh.count,
    upsert_auth_configured: Boolean(String(process.env.COGENTIA_BLACKBOARD_UPSERT_TOKEN || process.env.COGENTIA_ADMIN_TOKEN || "").trim()),
  };
}

async function handleOpsStatus(_req, res) {
  const status = await buildFractanetOpsStatus({
    blackboard,
    guideHealth,
    mcpVersion: SERVER_VERSION,
  });
  return sendJson(res, 200, status);
}

function handleOpsDashboard(_req, res) {
  if (!fs.existsSync(fractanetDashboardPath)) {
    return sendJson(res, 404, { ok: false, error: "dashboard_not_found" });
  }
  const html = fs.readFileSync(fractanetDashboardPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(html);
}

function handleGuideUi(_req, res) {
  if (!fs.existsSync(guideDashboardPath)) {
    return sendJson(res, 404, { ok: false, error: "guide_ui_not_found" });
  }
  const html = fs.readFileSync(guideDashboardPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(html);
}

async function handleBlackboardGet(req, res) {
  const url = new URL(req.url || "/ops/blackboard", "http://127.0.0.1");
  const capability = url.searchParams.get("capability") || "";
  const fresh = url.searchParams.get("fresh") !== "0";
  return sendJson(res, 200, blackboard.snapshot({ capability, fresh }));
}

async function handleOpsNodeProxy(req, res) {
  const result = await handleOpsNodeProxyRequest(req, blackboard, {
    timeoutMs: boundedInteger(process.env.ONA_PROXY_TIMEOUT_MS, 10_000, 1000, 60_000),
  });
  return sendJson(res, result.status, result.body);
}

async function handleOpsRouteAction(req, res) {
  if (!hasActionRouteAuth(req)) {
    return sendJson(res, 401, { ok: false, error: "unauthorized_action_route" });
  }
  let body;
  try {
    body = JSON.parse(await readBody(req, 256 * 1024) || "{}");
  } catch (error) {
    return sendJson(res, error.message === "request_body_too_large" ? 413 : 400, {
      ok: false,
      error: error.message === "request_body_too_large" ? "request_body_too_large" : "invalid_json",
    });
  }
  const parsed = parseActionRouteBody(body);
  if (!parsed.ok) {
    return sendJson(res, 400, { ok: false, error: parsed.error });
  }
  const result = await routeActionThroughGateway(blackboard, parsed);
  if (!result.ok) {
    const status = result.error === "attractor_not_found" ? 404
      : result.error === "attractor_degraded" ? 503
      : 502;
    return sendJson(res, status, result);
  }
  return sendJson(res, 200, result);
}

async function handleEdgeTrap(req, res) {
  if (!hasBlackboardUpsertAuth(req)) {
    return sendJson(res, 401, { ok: false, error: "unauthorized_edge_trap" });
  }
  let body;
  try {
    body = JSON.parse(await readBody(req) || "{}");
  } catch {
    return sendJson(res, 400, { ok: false, error: "invalid_json" });
  }
  const result = await handleEdgeTrapPost(body);
  return sendJson(res, result.ok ? 200 : 400, result);
}

async function handleEdgeTrapsList(req, res) {
  if (!hasBlackboardUpsertAuth(req)) {
    return sendJson(res, 401, { ok: false, error: "unauthorized_edge_traps" });
  }
  return sendJson(res, 200, handleEdgeTrapsGet(req.url || "/ops/edge/traps"));
}

async function handleBlackboardUpsert(req, res) {
  if (!hasBlackboardUpsertAuth(req)) {
    return sendJson(res, 401, { ok: false, error: "unauthorized_blackboard_upsert" });
  }
  let body;
  try {
    body = JSON.parse(await readBody(req) || "{}");
  } catch {
    return sendJson(res, 400, { ok: false, error: "invalid_json" });
  }
  const parsed = parseBlackboardUpsertBody(body);
  if (!parsed.ok) {
    return sendJson(res, 400, { ok: false, error: parsed.error, event: parsed.event });
  }
  if (parsed.event === BLACKBOARD_EVENTS.WITHDRAWN) {
    const result = blackboard.withdrawAttractor(parsed.attractor_id, { reason: parsed.reason });
    return sendJson(res, result.ok ? 200 : 404, result);
  }
  const result = blackboard.upsertAdvertised(parsed.attractor, {
    advertised_by: String(body.advertised_by || req.headers["x-cogentia-node"] || "").trim(),
  });
  return sendJson(res, result.ok ? 200 : 400, result);
}

async function handleMcpPost(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, jsonRpcError(null, -32700, "Parse error"));
  }
  const transport = transportFromHttpRequest(req);
  if (Array.isArray(payload)) {
    const responses = (await Promise.all(payload.map(message => core.handleJsonRpc(message, transport)))).filter(Boolean);
    if (!responses.length) return sendNoContent(res, 202);
    return sendJson(res, 200, responses);
  }
  const response = await core.handleJsonRpc(payload, transport);
  if (!response) return sendNoContent(res, 202);
  const version = response?.result?._meta?.["io.modelcontextprotocol/protocolVersion"]
    || transport.protocolVersionHeader;
  if (version) res.setHeader("MCP-Protocol-Version", version);
  return sendJson(res, 200, response);
}

async function handleToolPost(req, res) {
  const name = decodeURIComponent(String(req.url || "").slice("/tools/".length));
  let args;
  try {
    args = JSON.parse(await readBody(req) || "{}");
  } catch {
    return sendJson(res, 400, { content: [{ type: "text", text: "invalid JSON body" }], isError: true });
  }
  try {
    return sendJson(res, 200, mcpToolResult(await core.callTool(name, args)));
  } catch (error) {
    return sendJson(res, 500, { content: [{ type: "text", text: error.message }], isError: true });
  }
}

function checkSystemControlLocal(question, history) {
  const q = String(question || "").trim().toLowerCase();
  const isRetry = q === "retry" || q === "try again" || q === "please try again" || q === "recommencer" || q === "réessayer";
  if (isRetry && Array.isArray(history)) {
    for (let i = history.length - 1; i >= 0; i--) {
      const turn = history[i];
      if (turn && turn.role === "user") {
        const content = String(turn.content || "").trim().toLowerCase();
        const isTurnRetry = content === "retry" || content === "try again" || content === "please try again" || content === "recommencer" || content === "réessayer";
        if (!isTurnRetry) {
          return turn.content;
        }
      }
    }
  }
  return null;
}

function heuristicUserIntent(question, history, defaultLocale = "en") {
  const localControl = checkSystemControlLocal(question, history);
  if (localControl) {
    return {
      intent: "control",
      resolved_search_query: localControl,
      visitor_name: null,
      detected_language: defaultLocale,
      source: "heuristic_control",
    };
  }
  const q = String(question || "").trim().toLowerCase();
  if (/^(hi|hello|hey|bonjour|salut|coucou|good (morning|afternoon|evening))\b/.test(q)
    || /^(my name is|je m'appelle|je suis)\b/.test(q)
    || /^(what('s| is) my name|quel est mon nom)\b/.test(q)) {
    return {
      intent: "conversational",
      resolved_search_query: null,
      visitor_name: null,
      detected_language: defaultLocale,
      source: "heuristic_conversational",
    };
  }
  return {
    intent: "search",
    resolved_search_query: question,
    visitor_name: null,
    detected_language: defaultLocale,
    source: "heuristic_search",
  };
}

async function parseUserIntent(question, history, defaultLocale = "en", options = {}) {
  const local = heuristicUserIntent(question, history, defaultLocale);
  if (local.intent === "control" || options.skipLlm) {
    return local;
  }

  const messages = [
    {
      role: "system",
      content: [
        "You are the intent parsing judgment layer for the FractaVolta public Guide.",
        "Analyze the incoming question and the conversation history to determine the user's intent.",
        "",
        "Respond with a JSON object ONLY, in this format:",
        "{",
        '  "intent": "search" | "conversational" | "control",',
        '  "resolved_search_query": "The clean, semantic query to search the public corpus for (null if no search is needed)",',
        '  "visitor_name": "extracted visitor name if known from history or question (null if unknown)",',
        '  "detected_language": "fr" | "en" (the language of the conversation, defaulting to defaultLocale if unclear)',
        "}",
        "",
        "Rules:",
        "1. If the user's question is a meta-action like 'retry', 'try again', or refers back to the last question, set 'intent' to 'control' and resolve 'resolved_search_query' to the last actual question the user asked.",
        "2. If the user's question is a conversational greeting or query (e.g. 'hello', 'hi', 'my name is JHR', 'what is my name?'), set 'intent' to 'conversational' and 'resolved_search_query' to null.",
        "3. If the user's question is a semantic question about the domain (e.g. solar, FractaVolta, twin, Cogentia), set 'intent' to 'search' and 'resolved_search_query' to the question itself.",
        "4. Extract the visitor's name if they have introduced themselves or if it's in the history.",
        `5. Detect the language. The default is "${defaultLocale}".`
      ].join("\n")
    }
  ];

  if (Array.isArray(history) && history.length) {
    messages.push(...history.slice(-6));
  }
  messages.push({ role: "user", content: question });

  try {
    const res = await daemonPost("/v1/chat/completions", {
      model: "magistral",
      temperature: 0,
      response_format: { type: "json_object" },
      messages
    }, { timeoutMs: 2500 });
    if (res.ok && res.body && res.body.choices && res.body.choices[0]) {
      const content = res.body.choices[0].message.content.trim();
      const parsed = JSON.parse(content);
      return {
        intent: parsed.intent || "search",
        resolved_search_query: parsed.resolved_search_query || question,
        visitor_name: parsed.visitor_name || null,
        detected_language: parsed.detected_language || defaultLocale,
        source: "llm",
      };
    }
  } catch (error) {
    // Silently fallback on failure
  }

  return { ...local, source: local.source || "heuristic_search" };
}

/**
 * Shared Guide/JHN public turn (readonly corpus). Used by POST /guide/chat and OpenAI surface.
 * @returns {Promise<{ok:boolean,status:number,body:object}>}
 */
async function produceGuideTurn(question, history, payload = {}, options = {}) {
  const defaultLocale = normalizeLocale(payload.locale || options.locale);
  const cleanHistory = normalizeGuideHistory(history);
  const surface = resolvePublicChatSurface(payload, options);

  // COP treatment packet for this surface turn (mandate + optional budget reservation).
  const turnAcct = await openSurfaceTurnPacket({
    surface: surface.startsWith("jhn") ? "jhn-openai" : "guide",
    question,
    locale: defaultLocale,
    instance_id: surface.startsWith("jhn") ? "agent:jhn:openai-surface" : "agent:jhn:guide",
  });
  const rootPacket = turnAcct.ok ? turnAcct.packet : null;
  const cop = turnAcct.ok ? turnAcct.cop : null;

  // Canonical zero-latency cache check (Pillar Q&A)
  const canonical = surface === "agent-john" ? null : semanticAnswerCache.matchCanonical(question);
  if (canonical && !payload.force_refresh) {
    const formattedSources = canonical.sources.map(s => ({
      ...s,
      github_url: resolveSourceUrl(s.source_id, s.github_url),
      url: resolveSourceUrl(s.source_id, s.github_url),
    }));
    return {
      ok: true,
      status: 200,
      body: {
        ok: true,
        service: "fractavolta-guide",
        mode: "canonical_cache",
        mandate: guideMandate,
        question,
        locale: defaultLocale,
        answer: canonical.answer,
        sources: formattedSources,
        warnings: [],
        canonical_cache: true,
        elapsed_ms: 1,
      },
    };
  }

  const chatCap = await guideChatCapability();
  const intentResult = await parseUserIntent(question, cleanHistory, defaultLocale, {
    skipLlm: !chatCap.available,
  });
  const activeLocale = intentResult.detected_language || defaultLocale;
  const resolvedQuestion = intentResult.resolved_search_query || question;

  let plan, retrieval, web;
  if (intentResult.intent === "conversational") {
    plan = guideHeuristicPlan(question, "conversational_skip");
    retrieval = { sources: [], warnings: [] };
    web = { attempted: false, ok: false, sources: [] };
  } else {
    const usePlanner = guidePlannerEnabled && chatCap.available;
    plan = usePlanner
      ? await guidePlanningRun(resolvedQuestion, activeLocale)
      : guideHeuristicPlan(resolvedQuestion, chatCap.available ? "planner_disabled" : "chat_unavailable");
    retrieval = await guideRetrievalRun(resolvedQuestion, plan);
    observeGuideSemanticRetrieval(retrieval);
    web = await guideWebSearchRun(resolvedQuestion, activeLocale, payload);
  }

  if (!chatCap.available) {
    const fallback = await guideFallback(
      question,
      activeLocale,
      {
        ok: false,
        status: 503,
        error: "ai_router_chat_unavailable",
        body: { error: { type: "ai_router_chat_unavailable", message: chatCap.reason } },
      },
      retrieval,
      web,
    );
    if (fallback.body?.ok) {
      fallback.body.warnings = [
        "guide_chat_llm_unavailable",
        "guide_chat_fail_fast",
        chatCap.reason,
        ...(fallback.body.warnings || []),
      ].filter(Boolean);
      fallback.body.chat = { available: false, reason: chatCap.reason };
      attachCopAccountingToBody(fallback.body, rootPacket, cop);
    }
    return { ok: Boolean(fallback.body?.ok), status: fallback.status, body: fallback.body };
  }

  let messages = buildGuideMessages(
    activeLocale,
    retrieval,
    web,
    cleanHistory,
    resolvedQuestion,
    intentResult.visitor_name,
    surface,
  );

  const johnVoice = surface === "agent-john" || surface === "jhn-public-openai" || options.model === "jhn-owner";
  const chatPayload = {
    model: guideModel,
    temperature: johnVoice ? 0.3 : 0.2,
    max_tokens: johnVoice ? 3500 : 1200,
    messages,
    cogentia: {
      repo: "all",
      mode: "hybrid",
      limit: guideLimit,
      budget: guideBudget,
    },
    metadata: {
      surface,
      locale: activeLocale,
      access_class: options.access_class || "public",
      openai_model: options.model || null,
      cop_packet_id: rootPacket?.packet_id || null,
    },
  };

  const routed = await guideSynthesisPost(chatPayload);
  if (routed.ok) {
    await recordGuideSynthesisSpend({
      rootPacket,
      cop,
      completion: routed.body,
      surface,
      step: "synthesis",
    });
    const body = guideChatResponse(question, activeLocale, routed.body, retrieval, web);
    body.surface = surface;
    if (routed.body?._cogentia_guide_synthesis === "openai_direct_fallback") {
      body.mode = "openai_direct_fallback";
      body.warnings = [...new Set([...(body.warnings || []), "guide_synthesis_openai_fallback"])];
    }
    attachCopAccountingToBody(body, rootPacket, cop);
    return { ok: true, status: 200, body };
  }

  const fallback = await guideFallback(question, activeLocale, routed, retrieval, web);
  if (fallback.body) attachCopAccountingToBody(fallback.body, rootPacket, cop);
  return { ok: Boolean(fallback.body?.ok), status: fallback.status, body: fallback.body };
}

/**
 * Record synthesis LLM spend as a COP downstream packet under the turn root.
 */
async function recordGuideSynthesisSpend({ rootPacket, cop, completion, surface, step }) {
  if (!rootPacket || !cop) return;
  const usage = completion?.usage && typeof completion.usage === "object" ? completion.usage : null;
  const prompt_tokens = Number(usage?.prompt_tokens) || 0;
  const completion_tokens = Number(usage?.completion_tokens) || 0;
  if (!prompt_tokens && !completion_tokens) {
    // Estimate from message content when provider omits usage
    const content = String(completion?.choices?.[0]?.message?.content || "");
    if (!content) return;
  }
  const model = String(
    completion?.model
    || process.env.COGENTIA_GUIDE_OPENAI_MODEL
    || process.env.COGENTIA_GUIDE_MODEL
    || "fractavolta-guide",
  );
  const provider = completion?._cogentia_guide_synthesis === "openai_direct_fallback"
    ? "openai"
    : (String(process.env.COGENTIA_GUIDE_PROVIDER || "openai"));

  const spawned = await spawnSurfaceDownstream(rootPacket, cop, {
    spawn_reason: step || "synthesis",
    step: step || "synthesis",
    instance_id: surface?.startsWith?.("jhn") ? "agent:jhn:openai-surface" : "agent:jhn:guide",
  });
  const spendPacket = spawned.ok && spawned.packet ? spawned.packet : rootPacket;
  const estPrompt = prompt_tokens || estimateGuideTokens(JSON.stringify(completion?.choices || []).slice(0, 1));
  const estCompletion = completion_tokens
    || estimateGuideTokens(String(completion?.choices?.[0]?.message?.content || ""));

  recordPacketProviderSpend(spendPacket, cop, {
    provider,
    model,
    prompt_tokens: prompt_tokens || estPrompt,
    completion_tokens: completion_tokens || estCompletion,
    capability: "ai/chat-completion",
    surface,
    hop: { route_reason: step || "synthesis" },
    allow_empty: true,
    evidence_hash: completion?.id ? `completion:${completion.id}` : undefined,
  });
}

function attachCopAccountingToBody(body, rootPacket, cop) {
  if (!body || !rootPacket) return body;
  const projection = projectTurnAccounting(rootPacket, cop);
  if (projection) {
    body.cognitive_packet = projection;
    if (body.cost_estimate && typeof body.cost_estimate === "object") {
      body.cost_estimate.cop = {
        packet_id: projection.packet_id,
        mandate_id: projection.mandate_id,
        treatment_id: projection.treatment_id,
        own_spend_usd: projection.own_spend,
        consolidated_spend_usd: projection.consolidated_spend,
        protocol: "cop-cognitive-packet",
      };
    }
  }
  return body;
}

/** Adapter for jhn-openai-surface produceAnswer. */
async function produceJhnPublicAnswer({ question, locale, history, access, model }) {
  const result = await produceGuideTurn(
    question,
    history,
    { locale },
    {
      locale,
      model,
      access_class: access?.access_class || "public",
      surface: model === "fractavolta-guide" ? "fractavolta-public-guide" : "jhn-public-openai",
    },
  );
  if (!result.ok || !result.body) {
    return {
      ok: false,
      status: result.status || 502,
      error: result.body?.error || result.body?.message || "twin_turn_failed",
    };
  }
  return {
    ok: true,
    answer: result.body.answer,
    sources: result.body.sources || [],
    warnings: result.body.warnings || [],
    access_class: access?.access_class,
  };
}

async function handleGuideChat(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req, 65536) || "{}");
  } catch (error) {
    return sendJson(res, error.message === "request_body_too_large" ? 413 : 400, {
      ok: false,
      error: error.message === "request_body_too_large" ? "request_body_too_large" : "invalid_json",
    });
  }
  const question = String(payload.question || payload.q || "").trim();
  if (!question) return sendJson(res, 400, { ok: false, error: "missing_question" });
  if (question.length > 1200) return sendJson(res, 413, { ok: false, error: "question_too_large" });

  const history = normalizeGuideHistory(payload.history);
  const chatCap = await guideChatCapability();
  const defaultLocale = normalizeLocale(payload.locale);
  const intentResult = await parseUserIntent(question, history, defaultLocale, {
    skipLlm: !chatCap.available,
  });
  const activeLocale = intentResult.detected_language || defaultLocale;

  if (guideWantsStream(req, payload)) {
    return handleGuideChatStream(res, question, activeLocale, history, payload, intentResult, chatCap);
  }

  const result = await produceGuideTurn(question, history, payload, {
    locale: activeLocale,
    surface: resolvePublicChatSurface(payload, { surface: "fractavolta-public-guide" }),
    model: guideModel,
  });
  return sendJson(res, result.status, result.body);
}

async function handleGuideChatStream(res, question, locale, history = [], payload = {}, intentResult = null, chatCap = null) {
  if (!chatCap) chatCap = await guideChatCapability();
  if (!intentResult) {
    intentResult = await parseUserIntent(question, history, locale, { skipLlm: !chatCap.available });
  }
  const resolvedQuestion = intentResult.resolved_search_query || question;

  writeSseHeaders(res);
  const startedAt = Date.now();
  const emit = (event, data = {}) => sendSse(res, event, {
    ...data,
    at: new Date().toISOString(),
    elapsed_ms: Date.now() - startedAt,
  });

  try {
    emit("guide_status", guideProgress(locale, "received"));
    if (!chatCap.available) {
      emit("guide_status", {
        stage: "chat_unavailable",
        message: locale === "fr"
          ? "Moteur conversationnel indisponible; reponse extractive."
          : "Conversational backend unavailable; using extractive answer.",
        reason: chatCap.reason,
      });
    }

    let plan, retrieval, web;
    if (intentResult.intent === "conversational") {
      plan = guideHeuristicPlan(question, "conversational_skip");
      retrieval = { sources: [], warnings: [] };
      web = { attempted: false, ok: false, sources: [] };
    } else {
      emit("guide_status", guideProgress(locale, "planning"));
      const usePlanner = guidePlannerEnabled && chatCap.available;
      plan = usePlanner
        ? await guidePlanningRun(resolvedQuestion, locale)
        : guideHeuristicPlan(resolvedQuestion, chatCap.available ? "planner_disabled" : "chat_unavailable");
      emit("guide_plan", {
        stage: "planned",
        source: plan.source,
        objective: plan.objective,
        queries: plan.queries || [],
        notes: plan.notes || [],
        error: plan.planner_error || undefined,
        message: guideProgress(locale, "planned").message,
      });

      emit("guide_status", guideProgress(locale, "retrieval"));
      retrieval = await guideRetrievalRun(resolvedQuestion, plan, { progress: emit, locale });
      observeGuideSemanticRetrieval(retrieval);
      emit("guide_retrieval", {
        stage: "retrieved",
        query_count: retrieval.queries.length,
        source_count: retrieval.sources.length,
        source_ids: retrieval.sources.map(source => source.source_id),
        warnings: retrieval.warnings,
        message: guideProgress(locale, "retrieved").message,
      });

      web = await guideWebSearchRun(resolvedQuestion, locale, payload, { progress: emit });
    }

    if (!chatCap.available) {
      const fallback = await guideFallback(
        question,
        locale,
        { ok: false, status: 503, error: "ai_router_chat_unavailable", body: { error: { type: "ai_router_chat_unavailable", message: chatCap.reason } } },
        retrieval,
        web,
      );
      if (fallback.body?.ok) {
        fallback.body.warnings = [
          "guide_chat_llm_unavailable",
          "guide_chat_fail_fast",
          chatCap.reason,
          ...(fallback.body.warnings || []),
        ].filter(Boolean);
        fallback.body.chat = { available: false, reason: chatCap.reason };
      }
      emit(fallback.body?.ok === false ? "guide_error" : "guide_answer", fallback.body);
      sendSse(res, "done", { ok: true, elapsed_ms: Date.now() - startedAt, chat_available: false });
      return;
    }

    emit("guide_status", guideProgress(locale, "synthesis"));
    const surface = resolvePublicChatSurface(payload, { surface: "fractavolta-public-guide" });
    const johnVoice = surface === "agent-john" || surface === "jhn-public-openai";
    const chatPayload = {
      model: guideModel,
      temperature: johnVoice ? 0.3 : 0.2,
      max_tokens: johnVoice ? 3500 : 1200,
      messages: buildGuideMessages(locale, retrieval, web, history, resolvedQuestion, intentResult.visitor_name, surface),
      cogentia: {
        repo: "all",
        mode: "hybrid",
        limit: guideLimit,
        budget: guideBudget,
      },
      metadata: {
        surface,
        locale,
      },
    };

    const routed = await guideSynthesisPost(chatPayload);
    if (routed.ok) {
      emit("guide_answer", guideChatResponse(question, locale, routed.body, retrieval, web));
    } else {
      const fallback = await guideFallback(question, locale, routed, retrieval, web);
      emit(fallback.body?.ok === false ? "guide_error" : "guide_answer", fallback.body);
    }
    sendSse(res, "done", { ok: true, elapsed_ms: Date.now() - startedAt });
  } catch (error) {
    sendSse(res, "guide_error", {
      ok: false,
      error: "guide_stream_failed",
      message: publicErrorMessage(locale),
      detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      elapsed_ms: Date.now() - startedAt,
    });
  } finally {
    res.end();
  }
}

async function daemonPost(route, body, options = {}) {
  const url = new URL(route, core.daemonUrl);
  const timeoutMs = options.timeoutMs || core.requestTimeoutMs;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Cogentia-Entry": "public",
      },
      body: JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return { ok: false, status: 0, body: null, error: "cogentia_daemon_unavailable", message: error.message };
  }
  const contentType = response.headers.get("content-type") || "";
  const parsed = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");
  return { ok: response.ok, status: response.status, body: parsed };
}

async function guidePlanningRun(question, locale) {
  const fallback = guideHeuristicPlan(question, "planner_fallback");
  const payload = {
    model: guideModel,
    temperature: 0.15,
    max_tokens: 500,
    messages: [
      { role: "system", content: guidePlannerPrompt(locale) },
      { role: "user", content: question },
    ],
    cogentia: { context: false },
    metadata: {
      surface: "fractavolta-public-guide",
      purpose: "guide_planner",
      locale,
    },
  };

  const routed = await daemonPost("/v1/chat/completions", payload, { timeoutMs: 5000 });
  if (!routed.ok) {
    return { ...fallback, planner_error: routed.body?.error?.type || routed.error || "planner_failed" };
  }

  const content = String(routed.body?.choices?.[0]?.message?.content || routed.body?.choices?.[0]?.text || "").trim();
  const parsed = parseGuidePlan(content);
  if (!parsed.queries.length) return { ...fallback, planner_error: "planner_returned_no_queries" };

  const heuristic = guideRetrievalQueries(question);
  return {
    strategy: "guide-planner-v1",
    source: "magistral",
    objective: parsed.objective || "",
    queries: mergeQueries([
      question,
      ...heuristic,
      ...parsed.queries,
    ]).slice(0, guideQueryLimit),
    notes: parsed.notes,
    raw: content.slice(0, 2000),
  };
}

function guideHeuristicPlan(question, source = "heuristic") {
  return {
    strategy: "guide-planner-v1",
    source,
    objective: "",
    queries: guideRetrievalQueries(question).slice(0, guideQueryLimit),
    notes: [],
  };
}

function guidePlannerPrompt(locale) {
  const language = locale === "fr" ? "French" : "English";
  return [
    `You plan public Cogentia corpus retrieval for the FractaVolta Guide. Use ${language} only when writing notes.`,
    "Return only strict JSON. Do not include markdown.",
    "The Guide is public, read-only, and may search only the public corpus.",
    "Produce high-quality search queries, not an answer.",
    "Prefer concrete corpus terms, proper names, project names, document titles, and conceptual synonyms.",
    "Include both narrow and broad queries when useful.",
    `Return at most ${guidePlannerQueryLimit} queries.`,
    JSON.stringify({
      objective: "short retrieval objective",
      queries: ["query 1", "query 2"],
      notes: ["optional public retrieval note"],
    }),
  ].join("\n");
}

function parseGuidePlan(content) {
  const json = extractJsonObject(content);
  if (!json) return { objective: "", queries: [], notes: [] };
  try {
    const parsed = JSON.parse(json);
    return {
      objective: String(parsed.objective || "").trim(),
      queries: Array.isArray(parsed.queries)
        ? parsed.queries.map(query => String(query || "").trim()).filter(Boolean).slice(0, guidePlannerQueryLimit)
        : [],
      notes: Array.isArray(parsed.notes)
        ? parsed.notes.map(note => String(note || "").trim()).filter(Boolean).slice(0, 5)
        : [],
    };
  } catch {
    return { objective: "", queries: [], notes: [] };
  }
}

function extractJsonObject(content) {
  const clean = String(content || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (clean.startsWith("{") && clean.endsWith("}")) return clean;
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  return start >= 0 && end > start ? clean.slice(start, end + 1) : "";
}

async function guideRetrievalRun(question, plan = guideHeuristicPlan(question), options = {}) {
  const startedAt = performance.now();
  const timings_ms = {};
  let s7 = { ok: false, mode: "precomputed_index" };
  if (guideS7AnchorEnabled) {
    const s7StartedAt = performance.now();
    s7 = await guideS7ResolveAnchor(question, plan);
    timings_ms.s7_resolve = Math.round(performance.now() - s7StartedAt);
  }
  const s7Queries = s7.ok ? s7.retrieval_queries : [];
  const queries = mergeQueries([
    ...s7Queries,
    ...(plan.queries || []),
    ...guideRetrievalQueries(question),
  ]).slice(0, guideQueryLimit);

  const perQueryLimit = Math.max(1, Math.min(guideLimit, Math.ceil(guideLimit / 2)));
  const perQueryBudget = Math.max(512, Math.floor(guideBudget / Math.max(1, queries.length)));
  const packOptions = {
    mode: "hybrid",
    limit: perQueryLimit,
    budget: perQueryBudget,
  };

  emitGuideProgress(options, "guide_status", {
    stage: "retrieval_batch",
    backend: guideRetrievalBackend,
    query_count: queries.length,
    s7: s7.ok
      ? { layer: s7.layer, mode: s7.mode, canonical: s7.canonical_rel || null }
      : { ok: false },
    message: guideProgress(options.locale, "retrieval_batch", { count: queries.length }).message,
  });

  const batchStartedAt = performance.now();
  const packs = await fetchGuideRetrievalPacks(queries, packOptions);
  timings_ms.retrieval_batch = Math.round(performance.now() - batchStartedAt);

  // If S7 resolved a canonical file, pull a bounded public excerpt via MCP get_lines.
  let s7Anchor = null;
  if (s7.ok && s7.ref) {
    const anchorStartedAt = performance.now();
    s7Anchor = await guideS7FetchAnchorExcerpt(s7);
    timings_ms.s7_anchor = Math.round(performance.now() - anchorStartedAt);
  }

  const result = mergeGuideRetrievalFromPacks({
    question,
    plan,
    queries,
    packs,
    guideLimit,
    guideBudget,
    guideQueryLimit,
    options,
    helpers: {
      emitGuideProgress,
      guideProgress,
      safeSources,
      summarizePackRetrieval,
      estimateGuideTokens,
      truncateGuideText,
      rankGuideSources: (q, qs, sources, context, sourceRanks) =>
        rankGuideSources(q, qs, sources, context, sourceRanks, s7),
    },
  });

  // Prepend S7 anchor so synthesis always sees the canonical public source first.
  if (s7Anchor?.source && s7Anchor?.context) {
    const already = result.sources.some(s => s.source_id === s7Anchor.source.source_id);
    if (!already) {
      result.sources = [s7Anchor.source, ...result.sources].slice(0, guideLimit);
      result.context = [s7Anchor.context, ...result.context].slice(0, guideLimit);
    } else {
      // Move match to front
      const idx = result.sources.findIndex(s => s.source_id === s7Anchor.source.source_id);
      if (idx > 0) {
        const [src] = result.sources.splice(idx, 1);
        const ctxItem = result.context.find(c => c.source_id === src.source_id);
        result.sources.unshift(src);
        if (ctxItem) {
          result.context = [ctxItem, ...result.context.filter(c => c.source_id !== src.source_id)];
        }
      }
    }
  }

  return {
    ...result,
    timings_ms: { ...timings_ms, total: Math.round(performance.now() - startedAt) },
    retrieval_backend: guideRetrievalBackend,
    batch: true,
    s7: {
      ok: Boolean(s7.ok),
      layer: s7.layer || null,
      mode: s7.mode || null,
      canonical_repo: s7.canonical_repo || null,
      canonical_rel: s7.canonical_rel || null,
      canonical_url: s7.canonical_url || null,
      source: "cogentia_guide_resolve",
    },
  };
}

/**
 * Call the latest MCP S7 tool (cogentia_guide_resolve) to anchor Guide retrieval.
 * Public facade only — daemon/MCP default view is public.
 */
async function guideS7ResolveAnchor(question, plan = {}) {
  const candidates = mergeQueries([
    question,
    ...(plan.queries || []).slice(0, 2),
  ]).slice(0, 3);

  for (const query of candidates) {
    try {
      const payload = await core.callTool("cogentia_guide_resolve", { query });
      const resolution = payload?.resolution || payload;
      if (!resolution?.ok) continue;

      const result = resolution.result || {};
      const canonical_repo =
        resolution.canonical_repo ||
        result.canonical_repo ||
        (String(result.card_id || "").startsWith("card:")
          ? String(result.card_id).split(":")[1]
          : "");
      const canonical_rel =
        resolution.canonical_rel ||
        result.canonical_rel ||
        (String(result.card_id || "").startsWith("card:")
          ? String(result.card_id).split(":").slice(2).join(":")
          : "");
      const canonical_url =
        resolution.canonical_url ||
        result.canonical_url ||
        result.claims_manifest ||
        "";

      const retrieval_queries = [
        result.name,
        canonical_rel ? path.basename(canonical_rel, path.extname(canonical_rel)).replace(/[_-]/g, " ") : "",
        canonical_repo && canonical_rel ? `${canonical_repo} ${canonical_rel}` : "",
        query,
      ].filter(Boolean);

      return {
        ok: true,
        query,
        layer: resolution.layer,
        mode: resolution.mode,
        canonical_repo,
        canonical_rel,
        canonical_url,
        ref: canonical_repo && canonical_rel ? `${canonical_repo}:${canonical_rel.replace(/\\/g, "/")}` : "",
        retrieval_queries,
        raw: resolution,
      };
    } catch {
      // Try next candidate query
    }
  }
  return { ok: false };
}

async function guideS7FetchAnchorExcerpt(s7) {
  if (!s7?.ref) return null;
  try {
    const lines = await core.callTool("cogentia_get_lines", {
      ref: s7.ref,
      start: 1,
      end: 80,
    });
    const text = String(lines?.text || lines?.content || lines?.excerpt || "").trim();
    // Some gateway shapes nest body differently
    const bodyText =
      text ||
      String(lines?.lines?.map?.(l => l.text || l).join("\n") || "").trim() ||
      String(lines?.body || "").trim();
    if (!bodyText && !lines?.ok && !lines?.source_id) {
      // Still publish a source card without excerpt so citations work
    }
    const source_id =
      String(lines?.source_id || s7.ref.replace(/[\\/:]/g, "_")).slice(0, 120);
    const source = {
      source_id,
      title: s7.canonical_rel ? path.basename(s7.canonical_rel) : s7.ref,
      repo: s7.canonical_repo || "",
      path: s7.canonical_rel || "",
      url: s7.canonical_url || "",
      description: `S7 ${s7.mode || "resolve"} (layer ${s7.layer || "?"})`,
      start_line: 1,
      end_line: 80,
    };
    const excerpt = truncateGuideText(bodyText || `(Canonical source: ${s7.ref})`, 4000);
    return {
      source,
      context: { source_id, text: excerpt },
    };
  } catch {
    return {
      source: {
        source_id: s7.ref.replace(/[\\/:]/g, "_"),
        title: s7.canonical_rel ? path.basename(s7.canonical_rel) : s7.ref,
        repo: s7.canonical_repo || "",
        path: s7.canonical_rel || "",
        url: s7.canonical_url || "",
        description: `S7 ${s7.mode || "resolve"} (layer ${s7.layer || "?"})`,
      },
      context: {
        source_id: s7.ref.replace(/[\\/:]/g, "_"),
        text: `Canonical public source resolved by S7: ${s7.ref}${s7.canonical_url ? ` — ${s7.canonical_url}` : ""}`,
      },
    };
  }
}

async function fetchGuideRetrievalPacks(queries, packOptions) {
  const packs = new Map();
  if (guideRetrievalBackend === "inox-session") {
    try {
      const batch = await retrievalInoxPackBatch(queries, packOptions);
      if (!batch.ok) {
        for (const query of queries) {
          packs.set(query, {
            ok: false,
            error: batch.error || "inox_retrieval_failed",
            message: batch.message,
            query,
            continuation_required: batch.error === "continuation_fulfillment_required",
          });
        }
        return packs;
      }
      for (const item of batch.packs || []) {
        packs.set(item.query, item);
      }
      return packs;
    } catch (error) {
      for (const query of queries) packs.set(query, { ok: false, error: error.message, query });
      return packs;
    }
  }
  if (guideRetrievalBackend === "supabase") {
    try {
      const batch = await retrievalSupabasePackBatch(queries, packOptions);
      if (batch?.ok && Array.isArray(batch.packs) && batch.packs.some(p => p.sources?.length > 0)) {
        for (const item of batch.packs) {
          packs.set(item.query, item);
        }
        return packs;
      }
    } catch {
      // Fall through to local daemon SQLite batch
    }
  }

  if (guideBatchEnabled) {
    try {
      const batch = await core.callPackBatch(queries, packOptions);
      for (const item of batch.packs || []) {
        packs.set(item.query, item);
      }
      return packs;
    } catch (error) {
      for (const query of queries) packs.set(query, { ok: false, error: error.message, query });
      return packs;
    }
  }

  for (const query of queries) {
    try {
      const pack = await core.callTool("cogentia_context_pack", {
        query,
        ...packOptions,
        format: "json",
      });
      packs.set(query, pack);
    } catch (error) {
      packs.set(query, { ok: false, error: error.message, query });
    }
  }
  return packs;
}

function rankGuideSources(question, queries, sources, context, sourceRanks, s7 = null) {
  if (!sources.length) return { sources, context };
  const contextBySource = new Map(context.map(item => [item.source_id, item]));
  const rows = sources.map((source, index) => {
    const item = contextBySource.get(source.source_id) || { source_id: source.source_id, text: "" };
    const rank = sourceRanks.get(source.source_id) || { query_index: 999, source_index: index };
    return {
      source,
      context: item,
      score: guideSourceScore(question, queries, source, item.text, rank, s7),
      index,
    };
  });
  rows.sort((a, b) => b.score - a.score || a.index - b.index);
  return {
    sources: rows.map(row => row.source),
    context: rows.map(row => row.context),
  };
}

function guideSourceScore(question, queries, source, text, rank, s7 = null) {
  const haystack = [
    source.source_id,
    source.repo,
    source.path,
    source.title,
    source.description,
    text,
  ].join(" ").toLowerCase();
  const questionTokens = guideScoreTokens(question);
  const queryTokens = guideScoreTokens(queries.join(" "));
  let score = 100 - (Number(rank.query_index || 0) * 5) - (Number(rank.source_index || 0) * 2);

  for (const token of questionTokens) if (haystack.includes(token)) score += 4;
  for (const token of queryTokens) if (haystack.includes(token)) score += 1;
  if (String(source.repo || "").toLowerCase() === "fractavolta") score += 24;
  if (/fractavolta/.test(haystack)) score += 10;
  // Boost MCP S7 canonical anchors so commercial Guide cites doctrine files first.
  if (s7?.ok) {
    const rel = String(s7.canonical_rel || "").replace(/\\/g, "/").toLowerCase();
    const repo = String(s7.canonical_repo || "").toLowerCase();
    const spath = String(source.path || "").replace(/\\/g, "/").toLowerCase();
    const srepo = String(source.repo || "").toLowerCase();
    if (rel && (spath.endsWith(rel) || spath.includes(rel) || haystack.includes(path.basename(rel).toLowerCase()))) {
      score += 80;
    }
    if (repo && srepo === repo) score += 12;
    if (String(source.description || "").includes("S7")) score += 40;
  }

  const intent = guideQuestionIntent(question);
  if (intent.prefer_fractavolta) {
    if (String(source.repo || "").toLowerCase() === "fractavolta") score += 40;
    else score -= 8;
  }
  for (const token of intent.positive) if (haystack.includes(token)) score += 12;
  for (const token of intent.negative) if (haystack.includes(token)) score -= 12;
  return score;
}

function guideQuestionIntent(question) {
  const lower = String(question || "").toLowerCase();
  const positive = [];
  const negative = [];
  let preferFractaVolta = false;
  if (/par ou commencer|start|begin|first[- ]?time|visitor|visiteur|simple|simplement/.test(lower)) {
    positive.push("start", "orientation", "guide", "visitor", "visiteur", "partner_brief", "fractavolta_paper", "readme");
    negative.push("impunite", "obscurite");
  }
  if (/commune|pilote|pilot|territor|corse|corsica/.test(lower)) {
    preferFractaVolta = true;
    positive.push("commune", "pilote", "pilot", "territory", "territoire", "corse", "corsica", "verification", "governance", "mountain", "demonstrator", "boucle", "corte");
  }
  if (/agriculteur|agriculture|solaire|solar|ancienne installation/.test(lower)) {
    positive.push("agriculteur", "agriculture", "solaire", "solar", "seconde_vie", "second_life", "photovoltaic");
  }
  if (/installateur|installer|technical|technique/.test(lower)) {
    positive.push("installateur", "installer", "technical", "technique", "partnership", "partenariat", "seconde_vie");
  }
  if (/packet|paquet|electricity|electricite|flow|flux/.test(lower)) {
    positive.push("packet", "paquet", "routing", "traceability", "storage", "dc");
  }
  if (/digital twin|guide|cogentia|ubiqu/.test(lower)) {
    positive.push("digital", "twin", "guide", "cogentia", "ubiquity", "trust");
  }
  if (/battery|batterie|batteries|vendre|selling|objection|sceptique/.test(lower)) {
    positive.push("battery", "batterie", "objection", "anti-capture", "governance", "limites");
  }
  return { positive, negative, prefer_fractavolta: preferFractaVolta };
}

function guideScoreTokens(value) {
  return [...new Set((String(value || "").toLowerCase().match(/[\p{L}\p{N}_'-]+/gu) || [])
    .filter(token => token.length > 3 && !GUIDE_QUERY_STOPWORDS.has(token))
    .slice(0, 24))];
}

function emitGuideProgress(options, event, data) {
  if (typeof options?.progress !== "function") return;
  options.progress(event, data);
}

function mergeQueries(queries) {
  return [...new Set(queries.map(query => String(query || "").trim()).filter(Boolean))];
}

function guideRetrievalQueries(question) {
  const clean = String(question || "").normalize("NFC").trim().replace(/\s+/g, " ");
  const queries = [clean];
  const lower = clean.toLowerCase();
  const terms = clean.match(/[\p{L}\p{N}_'-]+/gu) || [];
  const keyTerms = terms
    .filter(term => term.length > 2 && !GUIDE_QUERY_STOPWORDS.has(term.toLowerCase()))
    .slice(0, 8);

  // Identity / person / twin fidelity anchors
  if (
    /jean\s*hugues|no[eë]l\s*robert|baron\s*mariani|who is he|qui est|digital twin|jumeau|agent jhn|representing/i
      .test(lower)
  ) {
    queries.push(
      "Agent Brief Representing Jean Hugues Noël Robert",
      "Jean Hugues Noël Robert baron Mariani",
      "personal digital twin Guide public instance",
      "artificial representation mandated voice fidelity",
      "AI-First Org and Fidelity Default Single-Author Phase",
      "AGENTS public-readonly answer surfaces",
    );
  }
  // Bare "John" / Agent John — artificial agent alias (not bibliographic authors)
  if (
    /\bagent\s+john\b|\bagent\s+jhn\b|\bwhat is john\b|\bwho is john\b|\bqu'est[- ]ce que john\b|\bqui est john\b/i
      .test(lower)
    || (/\bjohn\b/i.test(lower)
      && !/\bjohn\s+(brunner|dewey|howard|yoder|locke|rawls|stuart|von\s+neumann)\b/i.test(lower)
      && (terms.length <= 6 || /\b(who|what|qui|qu|agent|twin|jumeau|guide)\b/i.test(lower)))
  ) {
    queries.push(
      "What is John Agent John artificial agent not a person",
      "Agent John Agent JHN digital twin instance Jean Hugues",
      "John is the artificial representation Agent JHN not Jean Hugues",
      "Agent JHN experimental notice identity boundary",
      "Agent Brief representing Jean Hugues Noël Robert mandate",
      "twin Agent John logical agent not natural person",
    );
  }
  if (/possibilis|anti-?capture|one human|one voice|démocrati|democrati|seconde m[eé]thode|second method/i.test(lower)) {
    queries.push(
      "Possibilism research program possibility exploration",
      "anti-capture open source cognitive infrastructure",
      "one human one voice democratic invariant AI",
      "second method seconde methode think against oneself",
      "Agent Brief value lattice possibilism anti-capture",
    );
  }
  if (/mandat|draft.*behalf|commit|partnership|price|legal|sign/i.test(lower)) {
    queries.push(
      "You draft he decides agent mandate",
      "public Guide cannot commit legal partnership",
      "artificial representation not impersonation",
      "read-only public corpus mandate subset",
    );
  }
  if (/registre-mariani|secret|api key|private content|confidentiel/i.test(lower)) {
    queries.push(
      "public by default does not cancel privacy",
      "public Guide corpus view only no private vault",
      "AGENTS public-readonly secrets registre-mariani",
    );
  }
  if (/c\.?o\.?r\.?s\.?i\.?c\.?a|institut mariani|corte|cors/i.test(lower)) {
    queries.push(
      "Institut Mariani definition role genealogie",
      "C.O.R.S.I.C.A. association Corte",
      "acorsica institut mariani corpus",
    );
  }
  if (/inox/i.test(lower)) {
    queries.push(
      "Inox programming language specification concatenative",
      "Inox VM stack postfix",
    );
  }
  if (/employee|employ[eé]|AI-first|ai first|hiring|recrut/i.test(lower)) {
    queries.push(
      "AI-First Org and Fidelity Default Single-Author Phase",
      "accountable digital twin not AI employees",
      "FractaVolta AI-first operations",
    );
  }

  if (/first[- ]?time|visitor|visiteur|simple|simplement/.test(lower)) {
    queries.push(
      "FractaVolta first visitor",
      "FractaVolta public orientation",
      "FractaVolta partner brief",
      "FractaVolta paper",
      "FractaVolta energy packets local capacity"
    );
  }
  if (/partner|partenaire|contact|talk to|parler|collaboration|site|territor/.test(lower)) {
    queries.push(
      "FractaVolta partner brief",
      "FractaVolta partner contact",
      "FractaVolta relevant pathways technology research territorial energy",
      "FractaVolta deployment site territory"
    );
  }
  const issueNumberMatch = lower.match(/\bissue\s*#?\s*(\d+)\b/);
  if (issueNumberMatch) {
    const issueNumber = issueNumberMatch[1];
    const repoHint = /\binseme\b/.test(lower)
      ? "inseme"
      : /\bcogentia\b/.test(lower)
        ? "cogentia"
        : /\bfractavolta\b/.test(lower)
          ? "fractavolta"
          : "";
    const exactIssueQueries = [
      `${repoHint ? `${repoHint} ` : ""}issue ${issueNumber}`,
      `${repoHint ? `${repoHint} ` : ""}issue #${issueNumber}`,
      `${repoHint ? `${repoHint} ` : ""}issue ${issueNumber} recent progress`,
      `${repoHint ? `${repoHint} ` : ""}issue ${issueNumber} status`,
      `${repoHint ? `${repoHint} ` : ""}issue ${issueNumber} updates`,
    ];
    queries.push(...exactIssueQueries);
  } else if (/issue|issues|progress|recent|recently|update|status|blocker|open items|what changed|what's new/.test(lower)) {
    queries.push(
      "GitHub issues recent progress",
      "GitHub issues recently updated",
      "open issues blockers recent updates",
      "repo issue progress",
      "what changed in GitHub issues"
    );
  }
  if (/commune|pilot|pilote|municip|demarrer|d.marrer|verifiable|v.rifiable|sobre/.test(lower)) {
    queries.push(
      "FractaVolta commune pilote Corse",
      "FractaVolta autonomous commune infrastructure node",
      "FractaVolta one mountain commune demonstrator",
      "FractaVolta Boucle solaire Corte pilote",
      "FractaVolta pilot territory Corsica",
      "FractaVolta verification governance anti-capture"
    );
  }
  if (/agriculteur|agriculture|ancienne installation|ancienne centrale|solar|solaire/.test(lower)) {
    queries.push(
      "FractaVolta agriculteur Corse installation solaire ancienne",
      "FractaVolta Seconde Vie Corse agriculture",
      "FractaVolta photovoltaic second life",
      "FractaVolta local value solar storage"
    );
  }
  if (/installateur|installer|seconde vie/.test(lower)) {
    queries.push(
      "FractaVolta installateur corse Seconde Vie",
      "FractaVolta Seconde Vie audit reconfiguration stockage",
      "FractaVolta local installer role",
      "FractaVolta technical partnership Corsica"
    );
  }
  if (/packet|paquet|flow|flux|electricity|.lectricit|energy|.nergie/.test(lower)) {
    queries.push(
      "FractaVolta energy packets",
      "FractaVolta packet transition",
      "FractaVolta DC native energy packet network",
      "FractaVolta traceable energy packets"
    );
  }
  if (/battery|batteries|batterie|habillage|vendre|skept|scept/.test(lower)) {
    queries.push(
      "FractaVolta batteries objection",
      "FractaVolta anti-capture governance",
      "FractaVolta beyond selling batteries",
      "FractaVolta energy packets governance"
    );
  }
  if (/par ou commencer|par où commencer|where to start|start|commencer/.test(lower)) {
    queries.push(
      "FractaVolta start here",
      "FractaVolta public Guide orientation",
      "FractaVolta partner brief",
      "FractaVolta first steps"
    );
  }
  if (/(fracta\s*volta|fractavolta|\bfracta\b|guide)/.test(lower) && /digital twin|twin|jumeau/.test(lower)) {
    queries.push(
      "FractaVolta public Guide digital twin",
      "public Guide digital twin",
      "digital twin ubiquity",
      "FractaVolta public Guide public instance twin",
      "trustable digital twin public Guide"
    );
  }
  if (/fracta\s*volta|fractavolta|\bfracta\b/.test(lower)) {
    queries.push(
      "FractaVolta",
      "FractaVolta public Guide",
      "FractaVolta website",
      "FractaVolta partner brief",
      "FractaVolta Seconde Vie Corse",
      "FractaVolta paper"
    );
  }
  if (/cogentia/.test(lower)) {
    queries.push("Cogentia", "Cogentia public corpus", "Cogentia context gateway");
  }
  if (/digital twin|twin|jumeau/.test(lower)) {
    queries.push("digital twin", "public Guide digital twin", "trustable digital twin", "digital twin trust model");
  }
  if (/\bmcp\b|model context protocol/.test(lower)) {
    queries.push("Cogentia MCP", "context gateway MCP");
  }
  if (/magistral|router|openai/.test(lower)) {
    queries.push("Magistral Cogentia boundary", "Cogentia Magistral");
  }

  if (keyTerms.length) queries.push(keyTerms.join(" "));
  for (const term of keyTerms.filter(term => /[A-Z]/.test(term[0] || ""))) queries.push(term);

  return [...new Set(queries.map(query => query.trim()).filter(Boolean))];
}

const GUIDE_QUERY_STOPWORDS = new Set([
  "about", "answer", "briefly", "comment", "could", "dans", "does", "explain", "fait",
  "give", "how", "into", "pour", "quoi", "sentence", "short", "tell", "that", "the",
  "this", "what", "when", "where", "which", "with", "would", "une", "quoi",
]);

function guideRetrievalPrompt(locale, retrieval) {
  const intro = locale === "fr"
    ? "Utilise cette recherche publique procedurale avant de repondre."
    : "Use this procedural public retrieval run before answering.";
  const r = retrieval || {};
  const attempts = Array.isArray(r.attempts) ? r.attempts : [];
  const sources = Array.isArray(r.sources) ? r.sources : [];
  const context = Array.isArray(r.context) ? r.context : [];
  const lines = [
    "# Public Guide retrieval run",
    "",
    intro,
    "Treat these passages as supplied public Cogentia context. Cite source_id values.",
    "Do not use numeric citations such as [1]; cite exact source_id values such as [repo:path#L1-L4].",
    `Strategy: ${r.strategy || "none"}`,
    "",
    "## Query attempts",
    "",
    ...(attempts.length
      ? attempts.map((attempt, index) => {
          const status = attempt.ok ? `${attempt.count || 0} sources` : `failed: ${attempt.error || "unknown"}`;
          return `${index + 1}. ${attempt.query} (${status})`;
        })
      : ["(no retrieval attempts — conversational or skipped)"]),
    "",
    "## Sources",
    "",
  ];

  sources.forEach((source, index) => {
    lines.push(`[${index + 1}] ${source.source_id}`, `Title: ${source.title || source.path}`, `URL: ${source.url || "n/a"}`, "");
  });

  lines.push("## Context", "");
  context.forEach((item, index) => {
    lines.push(`### [${index + 1}] ${item.source_id}`, "", item.text, "");
  });
  if (!context.length) lines.push("No public context was found by the Guide retrieval run.", "");
  return lines.join("\n");
}

function observeGuideSemanticRetrieval(retrieval) {
  const semantic = summarizeGuideSemanticRetrieval(retrieval?.attempts || []);
  const warnings = Array.isArray(retrieval?.warnings) ? retrieval.warnings : [];
  const degraded = semantic.attempted !== true
    || semantic.keyword_fallback === true
    || semantic.continuation_required === true;
  guideSemanticRetrieval = {
    state: degraded ? "degraded" : "nominal",
    observed_at: new Date().toISOString(),
    strategy: retrieval?.strategy || null,
    semantic_attempted: semantic.attempted === true,
    sqlite_vec: semantic.sqlite_vec === true,
    query_embedding_cache: semantic.query_embedding_cache === true,
    keyword_fallback: semantic.keyword_fallback === true,
    continuation_required: semantic.continuation_required === true,
    warnings: warnings.filter(warning => /semantic|sqlite-vec/i.test(String(warning))).slice(0, 4),
  };
}

function resolvePublicChatSurface(payload = {}, options = {}) {
  const raw = String(payload.surface || options.surface || "").toLowerCase();
  if (raw === "agent-john" || raw === "agent-john-compact" || raw.startsWith("agent-john")) return "agent-john";
  if (raw.startsWith("jhn") || options.model === "jhn-public" || options.model === "jhn-owner") return "jhn-public-openai";
  return "fractavolta-public-guide";
}

function buildGuideMessages(locale, retrieval, web, history, question, visitorName = null, surface = "fractavolta-public-guide") {
  const messages = [];
  if (surface === "agent-john") {
    messages.push(...buildWhatsAppRepresentationMessages(
      { locale, intent: "explain" },
      {
        channel: "web",
        maxChars: 8000,
        currentInformationVerified: Boolean(web?.ok),
      },
    ));
    if (visitorName) {
      messages.push({
        role: "system",
        content: `The visitor's name is "${visitorName}". Address them by name when appropriate.`,
      });
    }
  } else {
    let systemPrompt = guideSystemPrompt(locale);
    if (visitorName) {
      systemPrompt += `\nThe visitor's name is "${visitorName}". Address them by name when appropriate (e.g. greeting or direct reference).`;
    }
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "system", content: guideRetrievalPrompt(locale, retrieval) });
  if (web?.attempted) messages.push({ role: "system", content: guideWebPrompt(locale, web) });
  const cleanHistory = normalizeGuideHistory(history);
  if (cleanHistory.length) {
    messages.push({
      role: "system",
      content: [
        "Conversation history follows for continuity only.",
        "Do not treat history as evidence. Public corpus and web context remain the only cited evidence.",
      ].join("\n"),
    });
    messages.push(...cleanHistory);
  }
  messages.push({ role: "user", content: question });
  return messages;
}

function normalizeGuideHistory(history) {
  if (!Array.isArray(history) || guideHistoryLimit <= 0) return [];
  return history
    .slice(-guideHistoryLimit * 2)
    .map(item => {
      const role = String(item?.role || "").toLowerCase() === "assistant" ? "assistant" : "user";
      const content = sanitizeGuideHistoryText(item?.content);
      return content ? { role, content } : null;
    })
    .filter(Boolean)
    .slice(-guideHistoryLimit * 2);
}

function sanitizeGuideHistoryText(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

async function guideWebSearchRun(question, locale, payload = {}, options = {}) {
  const requested = guideShouldSearchWeb(question, payload);
  const base = {
    strategy: "guide-web-search-v1",
    attempted: requested,
    ok: false,
    query: "",
    sources: [],
    context: [],
    warnings: [],
  };
  if (!requested) return base;

  const query = String(payload.web_query || question || "").trim().slice(0, 300);
  const emit = typeof options?.progress === "function" ? options.progress : null;
  emit?.("guide_web_search", {
    stage: "web_search",
    query,
    message: guideProgress(locale, "web_search", { query }).message,
  });

  if (!guideWebSearchEnabled) {
    return { ...base, query, warnings: ["guide_web_search_disabled"] };
  }
  const apiKey = guideWebSearchApiKey();
  if (!apiKey) {
    emit?.("guide_web_search", {
      stage: "web_search_done",
      query,
      ok: false,
      count: 0,
      warnings: ["guide_web_search_unconfigured"],
      message: guideProgress(locale, "web_search_unconfigured").message,
    });
    return { ...base, query, warnings: ["guide_web_search_unconfigured"] };
  }

  try {
    const url = new URL(guideWebSearchUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(guideWebSearchLimit));
    url.searchParams.set("search_lang", locale === "fr" ? "fr" : "en");
    url.searchParams.set("country", locale === "fr" ? "FR" : "US");
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`brave_search_${response.status}`);
    const parsed = await response.json();
    const results = Array.isArray(parsed?.web?.results) ? parsed.web.results.slice(0, guideWebSearchLimit) : [];
    const sources = results.map((result, index) => ({
      source_id: `web:${index + 1}`,
      title: String(result.title || result.url || `Web result ${index + 1}`),
      repo: "web",
      path: String(result.url || ""),
      url: String(result.url || ""),
      description: String(result.description || result.snippet || "").trim(),
    })).filter(source => source.url);
    const context = sources.map(source => ({
      source_id: source.source_id,
      text: [
        `Title: ${source.title}`,
        `URL: ${source.url}`,
        source.description ? `Description: ${source.description}` : "",
      ].filter(Boolean).join("\n"),
    }));
    emit?.("guide_web_search", {
      stage: "web_search_done",
      query,
      ok: true,
      count: sources.length,
      source_ids: sources.map(source => source.source_id),
      message: guideProgress(locale, "web_search_done", { count: sources.length }).message,
    });
    return {
      ...base,
      ok: true,
      query,
      sources,
      context,
      warnings: sources.length ? [] : ["guide_web_search_no_results"],
    };
  } catch (error) {
    emit?.("guide_web_search", {
      stage: "web_search_done",
      query,
      ok: false,
      count: 0,
      warnings: ["guide_web_search_failed"],
      message: guideProgress(locale, "web_search_failed").message,
    });
    return {
      ...base,
      query,
      warnings: ["guide_web_search_failed"],
      error: error.message,
    };
  }
}

function guideShouldSearchWeb(question, payload = {}) {
  if (payload.web_search === false) return false;
  if (payload.web_search === true || payload.webSearch === true) return true;
  const text = String(question || "").toLowerCase();
  if (/\bissue\s*#?\s*\d+\b/.test(text)) return false;
  return /\b(web|internet|online|search|latest|recent|current|today|news|price|tariff|law|regulation)\b/.test(text)
    || /\b(actualit|actuel|recen|aujourd|maintenant|cherche|recherche|prix|tarif|loi|reglement|règlement|web|internet)\b/.test(text);
}

function guideWebSearchApiKey() {
  return process.env.BRAVE_SEARCH_API_KEY || process.env.COGENTIA_BRAVE_SEARCH_API_KEY || process.env.COGENTIA_GUIDE_WEB_SEARCH_API_KEY || "";
}

function loadOptionalEnvFiles(files) {
  for (const file of files) {
    if (!file) continue;
    const resolved = path.resolve(String(file));
    if (!fs.existsSync(resolved)) continue;
    const content = fs.readFileSync(resolved, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || line.trimStart().startsWith("#")) continue;
      const key = match[1];
      if (process.env[key] != null) continue;
      process.env[key] = unquoteEnvValue(match[2]);
    }
  }
}

function unquoteEnvValue(value) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function guideWebPrompt(locale, web) {
  const lines = [
    "# Public Guide web search",
    "",
    locale === "fr"
      ? "Utilise ces resultats web seulement pour les informations actuelles ou externes au corpus."
      : "Use these web results only for current information or facts outside the corpus.",
    "Prefer the public corpus when it answers the question. Cite web source_id values for web-grounded claims.",
    `Strategy: ${web.strategy}`,
    `Query: ${web.query || ""}`,
    "",
    "## Web sources",
    "",
  ];
  web.sources.forEach(source => {
    lines.push(`- [${source.source_id}] ${source.title}`, `  URL: ${source.url}`, source.description ? `  Description: ${source.description}` : "");
  });
  if (!web.sources.length) lines.push("No web result is available.", "");
  return lines.join("\n");
}

function guideChatResponse(question, locale, completion, retrieval = null, web = null) {
  const context = completion?.cogentia_context || {};
  const sources = mergeGuideSources(retrieval?.sources, context.sources, web?.sources);
  const answer = normalizeGuideCitations(
    String(completion?.choices?.[0]?.message?.content || completion?.choices?.[0]?.text || "").trim(),
    sources
  );
  const finalAnswer = answer || guideFallbackText(locale);
  const isOpenRouterFreeFallback = completion?._cogentia_guide_synthesis === "openrouter_free_fallback";
  return {
    ok: true,
    service: "fractavolta-guide",
    mode: isOpenRouterFreeFallback ? "openrouter_free_fallback" : "conversational",
    mandate: guideMandate,
    question,
    locale,
    answer: finalAnswer,
    sources,
    context: summarizeGuideContext(context, retrieval, web),
    s7: retrieval?.s7 || null,
    warnings: [...new Set([
      ...(context.warnings || []),
      ...(retrieval?.warnings || []),
      ...(web?.warnings || []),
      ...(isOpenRouterFreeFallback ? ["guide_synthesis_openrouter_free_fallback"] : []),
    ])],
    // Strict estimated spend accounting (quality-first: measure even when not optimizing).
    cost_estimate: buildGuideCostEstimate({
      question,
      answer: finalAnswer,
      completion,
      retrieval,
      web,
    }),
  };
}

/**
 * Estimated cost ledger for a Guide turn.
 * Prefers provider usage when present; always records rough token estimates.
 * Large spend is not legitimacy — this is accounting only.
 */
function buildGuideCostEstimate({ question, answer, completion, retrieval, web }) {
  const usage = completion?.usage && typeof completion.usage === "object" ? completion.usage : null;
  const promptTokens = numberOrNull(usage?.prompt_tokens);
  const completionTokens = numberOrNull(usage?.completion_tokens);
  const totalTokens = numberOrNull(usage?.total_tokens)
    ?? ((promptTokens != null && completionTokens != null) ? promptTokens + completionTokens : null);
  const estOut = estimateGuideTokens(answer);
  const estIn = estimateGuideTokens(question)
    + estimateGuideTokens(JSON.stringify(retrieval?.sources || []).slice(0, 4000))
    + estimateGuideTokens(JSON.stringify(web?.sources || []).slice(0, 2000));
  const pricePer1m = Number(process.env.COGENTIA_GUIDE_EST_USD_PER_1M_TOKENS || 0);
  const tokensForMoney = totalTokens != null ? totalTokens : (estIn + estOut);
  const estimatedUsd = pricePer1m > 0
    ? Number(((tokensForMoney / 1_000_000) * pricePer1m).toFixed(6))
    : null;
  return {
    kind: "guide_turn_cost_estimate/v1",
    accounting_status: usage ? "provider_usage_partial" : "estimate_only",
    note: "Strict estimated spend ledger. Prefer provider usage when available; char/4 estimates otherwise. Spend is not legitimacy.",
    synthesis: completion?._cogentia_guide_synthesis || completion?.model || null,
    model: completion?.model || null,
    usage: usage
      ? {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          reasoning_tokens: numberOrNull(usage?.completion_tokens_details?.reasoning_tokens),
        }
      : null,
    estimates: {
      input_tokens_char4: estIn,
      output_tokens_char4: estOut,
      total_tokens_char4: estIn + estOut,
    },
    estimated_usd: estimatedUsd,
    price_per_1m_tokens_usd: pricePer1m > 0 ? pricePer1m : null,
  };
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeGuideCitations(answer, sources) {
  let text = String(answer || "").trim();
  if (!text || !sources.length) return text;
  text = text.replace(/\[(\d+)\]/g, (match, rawIndex) => {
    const source = sources[Number(rawIndex) - 1];
    return source?.source_id ? `[${source.source_id}]` : match;
  });
  if (sources.some(source => text.includes(`[${source.source_id}]`))) return text;
  return `${text}\n\nSources: ${sources.slice(0, 3).map(source => `[${source.source_id}]`).join(" ")}`;
}

async function guideFallback(question, locale, routed, retrieval = null, web = null) {
  let pack = null;
  if (retrieval?.sources?.length) {
    pack = retrievalPack(question, retrieval);
  } else {
    try {
      pack = await core.callTool("cogentia_context_pack", {
        query: question,
        mode: "hybrid",
        limit: Math.min(guideLimit, 5),
        budget: Math.min(guideBudget, 6000),
        format: "json",
      });
    } catch {}
  }
  if (pack?.ok) {
    return {
      status: 200,
      body: {
        ok: true,
        service: "fractavolta-guide",
        mode: "extractive_fallback",
        mandate: guideMandate,
        question,
        locale,
        answer: extractiveAnswer(locale, pack, question),
        sources: mergeGuideSources(pack.sources, web?.sources),
        context: summarizeGuideContext(pack, retrieval, web),
        s7: retrieval?.s7 || null,
        warnings: [
          "guide_chat_backend_unavailable",
          ...(pack.warnings || []),
          ...(web?.warnings || []),
        ],
      },
    };
  }
  return {
    status: routed.status || 502,
    body: {
      ok: false,
      service: "fractavolta-guide",
      error: routed.body?.error?.type || routed.error || "guide_chat_failed",
      message: publicErrorMessage(locale),
    },
  };
}

function retrievalPack(question, retrieval) {
  return {
    ok: true,
    query: question,
    strategy: retrieval.strategy,
    retrieval_policy_version: retrieval.strategy,
    sources: retrieval.sources,
    context: retrieval.context,
    warnings: retrieval.warnings || [],
  };
}

function agentJohnSystemPrompt(locale) {
  const language = locale === "fr" ? "French" : "English";
  const base = [
    `You are Agent John (also Agent JHN), the public Personal Digital Twin of Jean Hugues Noël Robert, baron Mariani. Answer in ${language}.`,
    "You are an agent, not a person. You are not Jean Hugues. You are not sovereign: no owner keys, no private registre, no right to commit, deploy, spend, or speak with his legal authority.",
    "The FractaVolta Public Guide is the impersonal professional corpus tool. You are the likeness: someone who knows Jean Hugues well should think « that really sounds like him » — structure of thought, not mimicry of private life.",
    "Speak as John the twin: first person ('I' / 'je') for the agent's stance. Never say 'I' as the living Jean Hugues. If asked who you are, say it in one breath, then be useful.",
    "Wow-effect (for people who know him) comes from: possibilist serenity rather than anxiety; naming the best objection before the claim; density; literality; method before hype; long-horizon infrastructural thinking; Corte / C.O.R.S.I.C.A. / Institut Mariani named exactly; French when the visitor writes French. Brassens (« mourir pour des idées, oui — mais de mort lente ») only when it actually fits, never as a tic.",
    "Anti-wow (never do this): generic chatbot warmth; corporate FAQ of 2–5 short paragraphs; slogan caricature; invented evenings, family scenes, or private memories. Friends would catch the fake. Family matters (including Marie-Louise) stay out unless the public corpus is explicitly about the published work, and even then with discretion.",
    "Conversation, not a brochure: follow the thread; you may be long when the thought requires it; concede uncertainty without losing conviction.",
    "Public corpus only. Cite source_id in square brackets. Tag observed vs hypothesised vs proposal. Read-only: retrieve, cite, explain, accompany.",
  ].join("\n");
  let styleBlock = "";
  try {
    if (!/^(0|false|no|off)$/i.test(String(process.env.COGENTIA_GUIDE_INJECT_PRIMARY_STYLE ?? "1").trim())) {
      styleBlock = buildCrossSurfaceStyleBlock({
        primaryStyleMaxChars: Number(process.env.COGENTIA_JOHN_PRIMARY_STYLE_MAX_CHARS || 6000),
        personStyleMaxChars: Number(process.env.COGENTIA_JOHN_PERSON_STYLE_MAX_CHARS || 8000),
        agentBriefMaxChars: Number(process.env.COGENTIA_JOHN_AGENT_BRIEF_MAX_CHARS || 14000),
        cogentigramTopN: Number(process.env.AGENT_JHN_JOHN_COGENTIGRAM_TOPN || 16),
        includeAgentBrief: true,
      }, process.env);
    }
  } catch {
    styleBlock = "";
  }
  const constitution = loadGuidePublicReadonlyAgents();
  const parts = [base];
  if (styleBlock.trim()) parts.push(`---\n${styleBlock.trim()}`);
  if (constitution) {
    parts.push(`---\nPublic read-only agent constitution (cogentia/instructions/AGENTS.public-readonly.md):\n${constitution}`);
  }
  return parts.join("\n\n");
}

function guideSystemPrompt(locale) {
  const language = locale === "fr" ? "French" : "English";
  const base = [
    `You are the public FractaVolta Guide. Answer in ${language}.`,
    "You are a public, low-maturity, read-only instance of the owner-rooted digital twin family (same primary style as Agent John / Agent JHN unless an explicit non-primary persona is set).",
    "You are not the private owner-facing core and must not pretend to be the owner.",
    "Naming: Jean Hugues (Noël Robert) is the natural person (who). John / Agent John / Agent JHN is the artificial agent twin instance (what) — not a person, not the living principal.",
    "If asked what/who John is: answer that John is an artificial agent (Agent John / Agent JHN), corpus-grounded under mandate; do not biographize bibliographic authors named John unless the user clearly means them.",
    "Single-author phase: optimise for fidelity to how the founder would answer from the public corpus — his cognitive/writing style (Buffon: style as structure), not a generic corporate chatbot voice.",
    "This Guide surface is mostly read-only: mandate is a subset of full twin/owner capabilities (retrieve, cite, explain), never a superset.",
    "Read-only does not mean readable secrets: never use or expose secrets, credentials, or private registre-mariani material — public corpus view only.",
    "Use the supplied public Cogentia context and, when supplied, the bounded web search context.",
    "Cite source_id values in square brackets for grounded claims.",
    "For durable project claims, prefer corpus sources. For current external facts, cite web sources.",
    "If context is insufficient, say what is missing and suggest a next public reading.",
    "Do not claim operational powers, private access, account access, or administrative authority.",
    "Start with a direct answer. Use 2 to 5 short paragraphs or bullets and no more than 5 actionable items.",
    "Cite only the sources needed for the answer; do not enumerate the retrieval process.",
    "Distinguish documented facts, clearly marked inferences, and unknowns when that distinction matters.",
    "For a current-information question without web evidence, say that current web verification is unavailable rather than infer it from corpus material.",
  ].join("\n");
  let styleBlock = "";
  try {
    if (!/^(0|false|no|off)$/i.test(String(process.env.COGENTIA_GUIDE_INJECT_PRIMARY_STYLE ?? "1").trim())) {
      // Parity with WhatsApp representation stack (STYLE + brief + KYS + top-N), capped for Guide.
      styleBlock = buildCrossSurfaceStyleBlock({
        primaryStyleMaxChars: Number(process.env.COGENTIA_GUIDE_PRIMARY_STYLE_MAX_CHARS || 3500),
        personStyleMaxChars: Number(process.env.COGENTIA_GUIDE_PERSON_STYLE_MAX_CHARS || 4000),
        agentBriefMaxChars: Number(process.env.COGENTIA_GUIDE_AGENT_BRIEF_MAX_CHARS || 6000),
        cogentigramTopN: Number(process.env.AGENT_JHN_GUIDE_COGENTIGRAM_TOPN || 8),
        includeAgentBrief: !/^(0|false|no|off)$/i.test(
          String(process.env.COGENTIA_GUIDE_INJECT_AGENT_BRIEF ?? "1").trim(),
        ),
      }, process.env);
    }
  } catch {
    styleBlock = "";
  }
  const constitution = loadGuidePublicReadonlyAgents();
  const parts = [base];
  if (styleBlock.trim()) {
    parts.push(`---\n${styleBlock.trim()}`);
  }
  if (constitution) {
    parts.push(`---\nPublic read-only agent constitution (cogentia/instructions/AGENTS.public-readonly.md):\n${constitution}`);
  }
  return parts.join("\n\n");
}

function loadGuidePublicReadonlyAgents() {
  if (/^(0|false|no|off)$/i.test(String(process.env.COGENTIA_GUIDE_INJECT_PUBLIC_AGENTS || "1").trim())) {
    return "";
  }
  try {
    const candidates = [
      path.join(process.cwd(), "instructions", "AGENTS.public-readonly.md"),
      "/srv/cogentia/repos/cogentia/instructions/AGENTS.public-readonly.md",
      path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "instructions", "AGENTS.public-readonly.md"),
    ];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, "utf8").trim().slice(0, 50000);
      }
    }
  } catch {
    /* non-fatal */
  }
  return "";
}

function extractiveAnswer(locale, pack, question = "") {
  const sources = safeSources(pack?.sources);
  const excerpts = Array.isArray(pack?.context?.excerpts)
    ? pack.context.excerpts.filter(e => e?.text)
    : [];

  return synthesizeSmartExtractiveAnswer({
    question,
    excerpts,
    sources,
    locale,
  });
}

/**
 * Direct OpenAI chat when daemon→Magistral chat is down (quality-first Guide path).
 */
async function guideOpenAiChatCompletions(payload = {}) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return { ok: false, error: "openai_key_missing", status: 0 };
  }
  if (providerCircuitBreaker.isOpen("openai")) {
    return { ok: false, error: "openai_circuit_open", status: 0 };
  }
  const candidateModels = [
    process.env.COGENTIA_GUIDE_OPENAI_MODEL,
    process.env.AGENT_JHN_WHATSAPP_OPENAI_MODEL,
    "gpt-5.6-sol",
    process.env.AGENT_JHN_WHATSAPP_OPENAI_FALLBACK_MODEL,
    "gpt-5.6-terra",
  ].filter(Boolean).filter((m, idx, arr) => arr.indexOf(m) === idx);

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (!messages.length) return { ok: false, error: "empty_messages", status: 0 };
  const timeoutMs = boundedInteger(process.env.COGENTIA_GUIDE_OPENAI_TIMEOUT_MS, 45000, 5000, 120000);

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: messages.map(message => ({
            role: ["system", "user", "assistant"].includes(message?.role) ? message.role : "user",
            content: typeof message?.content === "string"
              ? message.content
              : JSON.stringify(message?.content ?? ""),
          })),
          temperature: Number.isFinite(payload.temperature) ? payload.temperature : 0.2,
          max_tokens: boundedInteger(payload.max_tokens, 1200, 200, 4000),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        lastError = {
          ok: false,
          status: response.status,
          error: "openai_http_error",
          body: { error: { type: body?.error?.type || "openai_http_error", message: body?.error?.message || response.statusText } },
        };
        console.error(`[guide-openai] error with model ${model}:`, response.status, body?.error?.message || response.statusText);
        if (response.status === 429 || response.status === 401 || response.status === 403) {
          providerCircuitBreaker.recordFailure("openai", body?.error?.message || "quota_exceeded", response.status);
          break;
        }
        continue;
      }
      providerCircuitBreaker.recordSuccess("openai");
      return {
        ok: true,
        status: 200,
        body: {
          ...body,
          model: body?.model || model,
          _cogentia_guide_synthesis: "openai_direct_fallback",
        },
      };
    } catch (error) {
      lastError = {
        ok: false,
        status: 0,
        error: "openai_unavailable",
        body: { error: { type: "openai_unavailable", message: String(error?.message || error).slice(0, 200) } },
      };
      providerCircuitBreaker.recordFailure("openai", error.message, 0);
    }
  }
  return lastError || { ok: false, error: "openai_all_candidates_failed", status: 0 };
}

/**
 * Direct OpenRouter chat. Paid candidates retain their existing quality-first
 * order. An explicitly enabled, separately-circuited free model is attempted
 * only after those candidates are unavailable, so a paid-credit outage can
 * still produce a bounded public answer.
 */
async function guideOpenRouterChatCompletions(payload = {}) {
  const apiKey = String(process.env.OPENROUTER_API_KEY || process.env.COGENTIA_OPENROUTER_API_KEY || "").trim();
  if (!apiKey) {
    return { ok: false, error: "openrouter_key_missing", status: 0 };
  }
  const freeFallbackEnabled = guideOpenRouterFreeEnabled();
  const paidAvailable = providerCircuitBreaker.isAvailable("openrouter");
  const freeAvailable = freeFallbackEnabled && providerCircuitBreaker.isAvailable("openrouter_free");
  if (!paidAvailable && !freeAvailable) {
    return { ok: false, error: "openrouter_circuit_open", status: 0 };
  }
  const paidModels = [
    process.env.COGENTIA_GUIDE_OPENROUTER_MODEL,
    "anthropic/claude-sonnet-5",
    "deepseek/deepseek-v4-flash",
    "meta-llama/llama-3.3-70b-instruct",
  ].filter(Boolean).filter((model, index, models) => models.indexOf(model) === index);
  const candidates = [
    ...(paidAvailable ? paidModels.map(model => ({ model, circuit: "openrouter", free: false })) : []),
    ...(freeAvailable ? [{
      model: String(process.env.COGENTIA_GUIDE_OPENROUTER_FREE_MODEL || "liquid/lfm-2.5-2.6b:free").trim(),
      circuit: "openrouter_free",
      free: true,
    }] : []),
  ].filter(candidate => candidate.model);

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (!messages.length) return { ok: false, error: "empty_messages", status: 0 };
  const timeoutMs = boundedInteger(process.env.COGENTIA_GUIDE_OPENROUTER_TIMEOUT_MS, 45000, 5000, 120000);

  let lastError = null;
  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
    const candidate = candidates[candidateIndex];
    const { model } = candidate;
    try {
      const response = await fetch(openRouterChatCompletionsUrl(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://fractavolta.com",
          "X-Title": "FractaVolta Guide",
        },
        body: JSON.stringify({
          model,
          messages: messages.map(message => ({
            role: ["system", "user", "assistant"].includes(message?.role) ? message.role : "user",
            content: typeof message?.content === "string"
              ? message.content
              : JSON.stringify(message?.content ?? ""),
          })),
          temperature: Number.isFinite(payload.temperature) ? payload.temperature : 0.2,
          max_tokens: boundedInteger(payload.max_tokens, 1200, 200, 4000),
          ...(candidate.free ? { provider: { data_collection: "allow" } } : {}),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        lastError = {
          ok: false,
          status: response.status,
          error: "openrouter_http_error",
          body: { error: { type: body?.error?.type || "openrouter_http_error", message: body?.error?.message || response.statusText } },
        };
        console.error(`[guide-openrouter] error with model ${model}:`, response.status, body?.error?.message || response.statusText);
        if (response.status === 429 || response.status === 402 || response.status === 401) {
          providerCircuitBreaker.recordFailure(candidate.circuit, body?.error?.message || "quota_exceeded", response.status);
          if (!candidate.free && freeAvailable) {
            candidateIndex = candidates.findIndex(item => item.free) - 1;
            continue;
          }
          break;
        }
        continue;
      }
      const content = String(body?.choices?.[0]?.message?.content || body?.choices?.[0]?.text || "").trim();
      const finishReason = String(body?.choices?.[0]?.finish_reason || "").toLowerCase();
      if (!content || (finishReason && finishReason !== "stop")) {
        lastError = {
          ok: false,
          status: 502,
          error: "openrouter_incomplete_completion",
          body: { error: { type: "openrouter_incomplete_completion", message: "OpenRouter returned no complete visible answer." } },
        };
        providerCircuitBreaker.recordFailure(candidate.circuit, lastError.error, 502);
        continue;
      }
      providerCircuitBreaker.recordSuccess(candidate.circuit);
      return {
        ok: true,
        status: 200,
        body: {
          ...body,
          model: body?.model || model,
          _cogentia_guide_synthesis: candidate.free ? "openrouter_free_fallback" : "openrouter_direct_fallback",
        },
      };
    } catch (error) {
      lastError = {
        ok: false,
        status: 0,
        error: "openrouter_unavailable",
        body: { error: { type: "openrouter_unavailable", message: String(error?.message || error).slice(0, 200) } },
      };
      providerCircuitBreaker.recordFailure(candidate.circuit, error.message, 0);
    }
  }
  return lastError || { ok: false, error: "openrouter_all_candidates_failed", status: 0 };
}

function guideOpenRouterFreeEnabled() {
  return parseBoolean(process.env.COGENTIA_GUIDE_OPENROUTER_FREE_FALLBACK, false);
}

function openRouterChatCompletionsUrl() {
  return String(process.env.COGENTIA_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "") + "/chat/completions";
}

function guideFallbackText(locale) {
  return locale === "fr"
    ? "Je n'ai pas assez de contexte public pour repondre proprement."
    : "I do not have enough public context to answer cleanly.";
}

function publicErrorMessage(locale) {
  return locale === "fr"
    ? "Le Guide public est temporairement indisponible."
    : "The public Guide is temporarily unavailable.";
}

function normalizeLocale(value) {
  const clean = String(value || "en").toLowerCase();
  return clean.startsWith("fr") ? "fr" : "en";
}

function guideWantsStream(req, payload = {}) {
  const accept = String(req.headers.accept || "").toLowerCase();
  return payload.stream === true || accept.includes("text/event-stream");
}

function guideProgress(locale, stage, data = {}) {
  const fr = normalizeLocale(locale) === "fr";
  const messages = {
    received: fr ? "Question recue." : "Question received.",
    planning: fr ? "Preparation des recherches publiques..." : "Planning public corpus searches...",
    planned: fr ? "Plan de recherche pret." : "Retrieval plan ready.",
    retrieval: fr ? "Recherche dans le corpus public..." : "Searching the public corpus...",
    retrieval_batch: fr
      ? `Recherche groupée (${data.count || 0} requête(s))...`
      : `Batch retrieval (${data.count || 0} quer${data.count === 1 ? "y" : "ies"})...`,
    retrieval_query: fr ? `Recherche: ${data.query || ""}` : `Searching: ${data.query || ""}`,
    retrieval_query_done: fr
      ? `${data.count || 0} source(s) trouvee(s).`
      : `${data.count || 0} source(s) found.`,
    retrieved: fr ? "Sources publiques selectionnees." : "Public sources selected.",
    web_search: fr ? `Recherche web: ${data.query || ""}` : `Web search: ${data.query || ""}`,
    web_search_done: fr
      ? `${data.count || 0} resultat(s) web trouve(s).`
      : `${data.count || 0} web result(s) found.`,
    web_search_unconfigured: fr
      ? "La recherche web n'est pas configuree."
      : "Web search is not configured.",
    web_search_failed: fr
      ? "La recherche web a echoue."
      : "Web search failed.",
    synthesis: fr ? "Preparation de la reponse..." : "Preparing the answer...",
  };
  return { stage, message: messages[stage] || stage };
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return !new Set(["0", "false", "no", "off"]).has(String(value).trim().toLowerCase());
}

function summarizeGuideContext(context = {}, retrieval = null, web = null) {
  const excerpts = guideContextExcerpts(retrieval, web);
  return {
    query: context.query,
    pack_hash: context.pack_hash,
    index_hash: context.index_hash || context.index?.index_hash,
    retrieval_policy_version: context.retrieval_policy_version || context.strategy,
    source_ids: Array.isArray(context.source_ids)
      ? context.source_ids
      : safeSources(context.sources).map(source => source.source_id),
    guide_retrieval: retrieval ? {
      strategy: retrieval.strategy,
      retrieval_backend: retrieval.retrieval_backend,
      timings_ms: retrieval.timings_ms,
      s7: retrieval.s7,
      planner: retrieval.planner,
      query_limit: retrieval.query_limit,
      queries: retrieval.queries,
      attempts: retrieval.attempts,
      source_ids: retrieval.sources.map(source => source.source_id),
      semantic: summarizeGuideSemanticRetrieval(retrieval.attempts),
    } : undefined,
    excerpts: excerpts.length ? excerpts : undefined,
    web_search: web?.attempted ? {
      strategy: web.strategy,
      attempted: web.attempted,
      ok: web.ok,
      query: web.query,
      source_ids: web.sources.map(source => source.source_id),
      warnings: web.warnings,
    } : undefined,
  };
}

function guideContextExcerpts(retrieval = null, web = null) {
  const rows = [];
  const seen = new Set();
  for (const item of [
    ...(Array.isArray(retrieval?.context) ? retrieval.context : []),
    ...(Array.isArray(web?.context) ? web.context : []),
  ]) {
    const sourceId = String(item?.source_id || "").trim();
    if (!sourceId || seen.has(sourceId)) continue;
    const text = compactGuideExcerpt(item?.text, 900);
    if (!text) continue;
    seen.add(sourceId);
    rows.push({ source_id: sourceId, text });
    if (rows.length >= 8) break;
  }
  return rows;
}

function compactGuideExcerpt(value, maxChars) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(1, maxChars - 3)).trim()}...`;
}

function summarizePackRetrieval(pack = {}) {
  const retrieval = pack.retrieval || {};
  const warnings = Array.isArray(pack.warnings) ? pack.warnings : [];
  const joined = warnings.join("\n");
  return {
    requested_mode: String(retrieval.requested_mode || "hybrid"),
    mode: String(retrieval.mode || pack.mode || ""),
    result_count: Number(retrieval.result_count || pack.sources?.length || 0),
    ranked_result_cache: Boolean(retrieval.ranked_result_cache) || /cached ranked results/i.test(joined),
    query_embedding_cache: Boolean(retrieval.query_embedding_cache) || /cached query embedding/i.test(joined),
    sqlite_vec: Boolean(retrieval.sqlite_vec) || /sqlite-vec/i.test(joined),
    keyword_fallback: Boolean(retrieval.keyword_fallback) || /fell back to keyword/i.test(joined),
    continuation_required: Boolean(retrieval.continuation_required) || /continuation/i.test(joined),
  };
}

function summarizeGuideSemanticRetrieval(attempts = []) {
  const retrievals = attempts.map(attempt => attempt.retrieval || {}).filter(Boolean);
  return {
    attempted: retrievals.some(item => ["semantic", "hybrid"].includes(String(item.requested_mode || item.mode || "").toLowerCase())),
    ranked_result_cache: retrievals.some(item => item.ranked_result_cache),
    query_embedding_cache: retrievals.some(item => item.query_embedding_cache),
    sqlite_vec: retrievals.some(item => item.sqlite_vec),
    keyword_fallback: retrievals.some(item => item.keyword_fallback),
    continuation_required: retrievals.some(item => item.continuation_required),
  };
}

function mergeGuideSources(...sourceLists) {
  const merged = [];
  const seen = new Set();
  for (const source of sourceLists.flatMap(safeSources)) {
    if (!source.source_id || seen.has(source.source_id)) continue;
    seen.add(source.source_id);
    merged.push(source);
  }
  return merged.slice(0, 12);
}

function safeSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.slice(0, 12).map(source => {
    const source_id = String(source.source_id || "");
    const explicitUrl = String(source.github_url || source.url || "");
    const resolved = resolveSourceUrl(source_id, explicitUrl) || explicitUrl;
    return {
      source_id,
      title: String(source.title || ""),
      repo: String(source.repo || ""),
      path: String(source.path || ""),
      start_line: source.start_line,
      end_line: source.end_line,
      url: resolved,
      github_url: resolved,
      description: String(source.description || ""),
    };
  });
}

function estimateGuideTokens(text) {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

function truncateGuideText(text, budget) {
  const maxChars = Math.max(512, budget * 4);
  const clean = String(text || "").trim();
  if (clean.length <= maxChars) return clean;
  const slice = clean.slice(0, maxChars);
  const lastBreak = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(". "));
  return `${slice.slice(0, lastBreak > 256 ? lastBreak + 1 : maxChars).trim()}...`;
}

function sendSseInfo(req, res) {
  writeSseHeaders(res);
  sendSse(res, "endpoint", {
    protocolVersion: core.initialize({}).protocolVersion,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    instructions: core.initialize({}).instructions,
    post: "/mcp",
  });
  const keepAlive = setInterval(() => sendSse(res, "keepalive", {}), 30000);
  req.on("close", () => clearInterval(keepAlive));
}

function writeSseHeaders(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/** OpenAI-compatible SSE for UX tools (Chat Completions stream with Reasoning & Tool Calling). */
function sendOpenAiSse(res, { id, created, model, content, reasoning, tool_calls, access_class, warnings, citations }) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    "X-Twin-Access-Class": access_class || "public",
  });
  const base = {
    id,
    object: "chat.completion.chunk",
    created: created || Math.floor(Date.now() / 1000),
    model: model || "jhn-public",
  };
  res.write(
    `data: ${JSON.stringify({
      ...base,
      choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
    })}\n\n`,
  );

  // 1. Stream reasoning_content (Thinking accordion for Open WebUI / LibreChat / Chatbox)
  if (reasoning) {
    const reasonText = String(reasoning || "");
    const pieceSize = 48;
    for (let i = 0; i < reasonText.length; i += pieceSize) {
      const piece = reasonText.slice(i, i + pieceSize);
      res.write(
        `data: ${JSON.stringify({
          ...base,
          choices: [{ index: 0, delta: { reasoning_content: piece }, finish_reason: null }],
        })}\n\n`,
      );
    }
  }

  // 2. Stream tool_calls if any were mobilized
  if (Array.isArray(tool_calls) && tool_calls.length) {
    for (let idx = 0; idx < tool_calls.length; idx++) {
      const tc = tool_calls[idx];
      res.write(
        `data: ${JSON.stringify({
          ...base,
          choices: [{
            index: 0,
            delta: {
              tool_calls: [{
                index: idx,
                id: tc.id || `call_${idx}`,
                type: "function",
                function: { name: tc.name || tc.capability, arguments: typeof tc.input === "string" ? tc.input : JSON.stringify(tc.input || {}) },
              }],
            },
            finish_reason: null,
          }],
        })}\n\n`,
      );
    }
  }

  // 3. Stream final synthesis content
  const text = String(content || "");
  const pieceSize = 48;
  for (let i = 0; i < text.length; i += pieceSize) {
    const piece = text.slice(i, i + pieceSize);
    res.write(
      `data: ${JSON.stringify({
        ...base,
        choices: [{ index: 0, delta: { content: piece }, finish_reason: null }],
      })}\n\n`,
    );
  }

  // 4. Final finish chunk
  res.write(
    `data: ${JSON.stringify({
      ...base,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      twin: { access_class, warnings: warnings || [], citations: citations || [] },
    })}\n\n`,
  );
  res.write("data: [DONE]\n\n");
  res.end();
}

function readBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "";
    let bytes = 0;
    req.setEncoding("utf8");
    req.on("data", chunk => {
      bytes += Buffer.byteLength(chunk, "utf8");
      if (bytes > maxBytes) {
        reject(new Error("request_body_too_large"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendNoContent(res, status) {
  res.writeHead(status);
  res.end();
}

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  const allowed = allowedOrigins.some(value => value === "*" || (value.endsWith("*") ? origin.startsWith(value.slice(0, -1)) : origin === value));
  if (!allowed) return;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id",
  );
}
