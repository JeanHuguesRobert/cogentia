import { timingSafeEqual } from "node:crypto";
import { invokeThroughGateway } from "./agent-gateway-client.js";
import { pickAgentGatewayAttractor } from "./agent-gateway-resolve.js";
import { isAttractorFresh } from "./packet-attractor-blackboard.js";

const GATEWAY_PROFILE = "agent-gateway.v1";

export function actionRouteToken(env = process.env) {
  return String(
    env.COGENTIA_ACTION_ROUTE_TOKEN
    || env.COGENTIA_ADMIN_TOKEN
    || "",
  ).trim();
}

export function gatewayInvokeToken(env = process.env) {
  return String(
    env.AGENT_GATEWAY_INVOKE_TOKEN
    || env.AGENT_GATEWAY_ACCEPT_TOKEN
    || env.AGENT_GATEWAY_TOKEN
    || "",
  ).trim();
}

export function hasActionRouteAuth(req, env = process.env) {
  const expected = actionRouteToken(env);
  if (!expected) return false;
  const authorization = String(req.headers?.authorization || "");
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const supplied = bearer || String(req.headers?.["x-cogentia-action-token"] || "");
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

export function resolveAgentGatewayFromSnapshot(blackboardStore, options = {}) {
  const snapshot = blackboardStore.snapshot({
    capability: options.capability,
    fresh: options.fresh !== false,
    now: options.now,
  });
  const attractor = pickAgentGatewayAttractor(snapshot.attractors, options);
  if (!attractor) {
    return {
      ok: false,
      error: "attractor_not_found",
      snapshot_at: snapshot.snapshot_at,
      count: snapshot.count,
    };
  }

  const status = String(attractor.availability?.status || "online").trim() || "online";
  if (status === "degraded" && !options.allowDegraded) {
    return {
      ok: false,
      error: "attractor_degraded",
      attractor_id: attractor.id,
      endpoint: String(attractor.transport?.endpoint_ref || "").trim(),
      snapshot_at: snapshot.snapshot_at,
    };
  }

  return {
    ok: true,
    attractor,
    endpoint: String(attractor.transport?.endpoint_ref || "").trim().replace(/\/$/, ""),
    attractor_id: attractor.id,
    snapshot_at: snapshot.snapshot_at,
    fresh: isAttractorFresh(attractor, options.now),
    status,
    routed_via: "local_blackboard",
  };
}

export function parseActionRouteBody(body = {}) {
  const model = String(body.model || "").trim();
  const prompt = String(body.prompt ?? body.content ?? "").trim();
  if (!model) return { ok: false, error: "missing_model" };
  if (!prompt) return { ok: false, error: "missing_prompt" };
  return {
    ok: true,
    capability: String(body.capability || "").trim() || undefined,
    attractorId: String(body.attractor_id || body.attractorId || "").trim() || undefined,
    hostname: String(body.hostname || body.host || "").trim() || undefined,
    model,
    prompt,
    repl: body.repl === true,
    sessionId: String(body.session_id || body.sessionId || "").trim() || undefined,
    cwd: String(body.cwd || "").trim() || undefined,
    expect: String(body.expect || "").trim() || undefined,
    allowDegraded: body.allow_degraded === true || body.allowDegraded === true,
    fresh: body.fresh !== false,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
  };
}

export function summarizeActionLayer(blackboardSummary = {}) {
  const attractors = pickGatewayAttractors(
    blackboardSummary.attractors || blackboardSummary.fresh_attractors || [],
  );
  const fresh = attractors.filter(item => isAttractorFresh(item));
  const online = attractors.filter(item => String(item.availability?.status || "online") === "online");
  return {
    phase2_wired: true,
    route: "POST /ops/route/action",
    client: "guide action route",
    attractor_count: attractors.length,
    fresh_attractor_count: fresh.length,
    online_attractor_count: online.length,
    tool_hosts: attractors.map(item => ({
      id: item.id,
      endpoint: item.transport?.endpoint_ref || null,
      status: item.availability?.status || null,
      fresh: isAttractorFresh(item),
      capabilities: summarizeToolCapabilities(item),
      models: listGatewayModels(item),
    })),
  };
}

export async function routeActionThroughGateway(blackboardStore, body, options = {}) {
  const parsed = body?.ok === true && body.model ? body : parseActionRouteBody(body);
  if (!parsed.ok) return parsed;

  const resolved = resolveAgentGatewayFromSnapshot(blackboardStore, {
    capability: parsed.capability,
    attractorId: parsed.attractorId,
    hostname: parsed.hostname,
    model: parsed.model,
    allowDegraded: parsed.allowDegraded,
    fresh: parsed.fresh,
    now: options.now,
  });

  if (!resolved.ok || !resolved.endpoint) {
    return {
      ok: false,
      error: resolved.error || "attractor_not_found",
      snapshot_at: resolved.snapshot_at,
      count: resolved.count,
      attractor_id: resolved.attractor_id,
      endpoint: resolved.endpoint,
    };
  }

  const token = String(options.token || gatewayInvokeToken(options.env)).trim();
  try {
    const result = await invokeThroughGateway({
      endpoint: resolved.endpoint,
      token: token || undefined,
      model: parsed.model,
      prompt: parsed.prompt,
      repl: parsed.repl,
      sessionId: parsed.sessionId,
      cwd: parsed.cwd,
      expect: parsed.expect,
      metadata: parsed.metadata,
      timeoutMs: options.timeoutMs,
      allowDegraded: parsed.allowDegraded,
    });
    return {
      ok: true,
      service: "cogentia-action-route",
      model: result.model,
      content: result.content,
      session_id: result.session_id,
      timing: result.timing,
      route: {
        ...result.route,
        snapshot_at: resolved.snapshot_at,
        attractor_id: resolved.attractor_id,
        status: resolved.status,
        fresh: resolved.fresh,
        routed_via: "guide_blackboard",
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error.code || "route_action_failed",
      message: error.message,
      detail: error.detail || null,
      route: {
        endpoint: resolved.endpoint,
        attractor_id: resolved.attractor_id,
        status: resolved.status,
        snapshot_at: resolved.snapshot_at,
        routed_via: "guide_blackboard",
      },
    };
  }
}

function pickGatewayAttractors(attractors) {
  return (Array.isArray(attractors) ? attractors : [])
    .filter(item => String(item?.transport?.profile || "").trim() === GATEWAY_PROFILE);
}

function summarizeToolCapabilities(attractor = {}) {
  const capabilities = Array.isArray(attractor.matches?.capabilities) ? attractor.matches.capabilities : [];
  return capabilities.filter(value => String(value || "").startsWith("dev.tools"));
}

function listGatewayModels(attractor = {}) {
  const capabilities = Array.isArray(attractor.matches?.capabilities) ? attractor.matches.capabilities : [];
  return capabilities
    .map(value => String(value || "").trim())
    .filter(value => value.startsWith("model."))
    .map(value => value.slice("model.".length));
}