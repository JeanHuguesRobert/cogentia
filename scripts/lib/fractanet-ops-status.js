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
  let mcp = { ok: false };
  let guide = { ok: false };
  let mcpError = null;
  let guideError = null;

  if (typeof deps.health === "function") {
    try {
      mcp = await deps.health();
    } catch (error) {
      mcpError = error?.message || String(error);
    }
  }

  if (typeof deps.guideHealth === "function") {
    try {
      guide = await deps.guideHealth();
    } catch (error) {
      guideError = error?.message || String(error);
    }
  }

  const blackboardSummary = summarizeBlackboardSnapshots(blackboard);
  const guideContext = guideError ? {} : (guide.context || {});
  const legacy = {
    ok: true,
    service: "fractanet-ops",
    generated_at: generatedAt,
    mcp: mcpError ? { ok: false, error: mcpError } : mcp,
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
            ok: !mcpError && mcp.ok === true,
            error: mcpError || mcp.error || null,
            version: mcp.version || null,
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
      public_face: {
        guide_url: "https://cogentia.fractavolta.com",
        dashboard_url: "https://cogentia.fractavolta.com/ops/dashboard",
        aggregator_ok: true,
      },
    },
    legacy,
  };
}