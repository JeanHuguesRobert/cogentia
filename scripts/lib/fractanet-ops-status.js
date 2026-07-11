import { summarizeActionLayer } from "./agent-gateway-route.js";
import { summarizeNodeAgentsLayer } from "./ona-proxy.js";

export function summarizeBlackboardSnapshots(blackboard, options = {}) {
  const all = blackboard.snapshot({ fresh: false, ...options });
  const fresh = blackboard.snapshot({ fresh: true, ...options });
  return {
    store_path: all.store_path,
    snapshot_at: all.snapshot_at,
    attractor_count: all.count,
    fresh_attractor_count: fresh.count,
    attractors: all.attractors,
    fresh_attractors: fresh.attractors,
    recent_events: all.recent_events,
  };
}

export async function buildFractanetOpsStatus(deps = {}) {
  const blackboard = deps.blackboard;
  if (!blackboard) throw new Error("blackboard_required");

  const generatedAt = new Date().toISOString();
  let guide = { ok: false };
  let guideError = null;

  // Single daemon probe — avoid duplicate cogentia_health calls (cold path can exceed 15s).
  if (typeof deps.guideHealth === "function") {
    try {
      guide = await deps.guideHealth();
    } catch (error) {
      guideError = error?.message || String(error);
    }
  }

  const blackboardSummary = summarizeBlackboardSnapshots(blackboard);
  const guideContext = guideError ? {} : (guide.context || {});
  const daemon = guideError ? null : (guide.context?.daemon || null);
  const daemonOk = Boolean(daemon?.ok);
  const mcp = guideError
    ? { ok: false, error: guideError }
    : { ok: true, mcp: "cogentia-mcp", version: deps.mcpVersion || null, daemon };

  const legacy = {
    ok: true,
    service: "fractanet-ops",
    generated_at: generatedAt,
    mcp,
    guide: guideError ? { ok: false, error: guideError } : guide,
    blackboard: blackboardSummary,
  };

  return {
    ...legacy,
    schema: "operium.up.v1",
    role: "runtime-aggregator",
    layers: {
      services: {
        fracta: {
          mcp: {
            ok: !guideError && daemonOk,
            error: guideError || (daemonOk ? null : daemon?.error || "daemon_unhealthy"),
            version: deps.mcpVersion || null,
          },
          guide: {
            ok: !guideError && guide.ok === true,
            error: guideError || guide.error || null,
            service: guide.service || null,
            model: guide.model || null,
          },
        },
      },
      blackboard: blackboardSummary,
      retrieval: {
        backend: guideContext.retrieval_backend || null,
        inox_configured: guideContext.inox_retrieval?.configured === true,
        inox_url: guideContext.inox_retrieval?.url || null,
        transport: guideContext.inox_retrieval?.transport || null,
        phase2_wired: false,
      },
      action: summarizeActionLayer(blackboardSummary),
      node_agents: summarizeNodeAgentsLayer(blackboardSummary, {
        env: deps.env,
        now: deps.now,
      }),
      public_face: {
        guide_url: "https://cogentia.fractavolta.com",
        dashboard_url: "https://cogentia.fractavolta.com/ops/dashboard",
        aggregator_ok: true,
      },
    },
    legacy,
  };
}