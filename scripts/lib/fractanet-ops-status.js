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

  return {
    ok: true,
    service: "fractanet-ops",
    generated_at: generatedAt,
    mcp: mcpError ? { ok: false, error: mcpError } : mcp,
    guide: guideError ? { ok: false, error: guideError } : guide,
    blackboard: blackboardSummary,
  };
}