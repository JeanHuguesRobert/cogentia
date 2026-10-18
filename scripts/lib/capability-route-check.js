/** A bounded read-only assessment; catalog claims do not confer runtime authority. */
export function evaluateCapabilityRoutes({required, routes = [], callable = [], mandates = [], evidence = []}) {
  if (!required || typeof required !== "string") throw new TypeError("required capability must be named");
  const live = new Set(callable);
  const grants = new Set(mandates);
  const witnessed = new Map(evidence.map(x => [x.route_id, x]));
  return {
    required,
    status: "unresolved",
    candidates: routes.filter(r => r.capability === required).map(r => {
      const steps = r.steps || [];
      const missing = steps.filter(s => !live.has(s));
      const authorized = grants.has(r.mandate);
      const probe = witnessed.get(r.id);
      const tested = probe?.ok === true && probe?.reachable === true;
      const reachable = missing.length === 0 && tested;
      return {id:r.id, remembered:true, callable:missing.length===0, missing, authorized,
        reachable, tested, outcome:probe?.outcome || "not_tested",
        status: !authorized ? "unauthorized" : missing.length ? "unavailable" : !tested ? "untested" : "operational"};
    })
  };
}
