/**
 * Evidence-gated route assessment. A catalog is a map, not a live capability
 * or an authorization grant. This function performs no side effects.
 */
export function evaluateCapabilityRoutes({required, routes = [], callable = [], mandates = [], evidence = []}) {
  if (typeof required !== "string" || !required.trim()) {
    throw new TypeError("required capability must be named");
  }
  const live = new Set(callable);
  const grants = new Set(mandates);
  const witnessed = new Map(evidence.filter(x => x?.route_id).map(x => [x.route_id, x]));
  const candidates = routes.filter(r => r.capability === required).map(r => {
    // An unconfigured route must never be treated as callable.
    const steps = Array.isArray(r.steps) ? r.steps : [];
    const valid = Boolean(r.id && steps.length && steps.every(s => typeof s === "string" && s.length));
    const missing = steps.filter(s => !live.has(s));
    const callableNow = valid && missing.length === 0;
    const authorized = Boolean(r.mandate && grants.has(r.mandate));
    const probe = witnessed.get(r.id);
    const tested = probe?.ok === true && probe?.reachable === true && probe?.verified === true && probe?.capability === required && probe?.route_id === r.id;
    const reachable = callableNow && authorized && tested;
    const status = !valid ? "invalid"
      : !authorized ? "unauthorized"
      : !callableNow ? "unavailable"
      : !tested ? "untested" : "operational";
    return {
      id: r.id, remembered: true, callable: callableNow, missing, authorized,
      reachable, tested, outcome: tested ? (probe.outcome || "unknown") : "not_verified", status
    };
  });
  const status = candidates.some(r => r.status === "operational") ? "operational"
    : candidates.some(r => r.status === "untested") ? "probe_required"
    : candidates.length ? "blocked" : "not_discovered";
  return {required, status, candidates};
}
