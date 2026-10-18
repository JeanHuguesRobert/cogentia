/**
 * Pure capability-path qualification. No side effects, no grants.
 * Source contract: Inseme packages/magistral/src/execution.js.
 *
 * Receipt content alone is untrusted, even when schema-valid: a caller-supplied
 * "verified" flag is NOT proof. The owning resolver supplies a trusted
 * synchronous verifyReceipt(receipt, route) predicate after checking the
 * provider / durable trace in its own trust domain.
 */
export function evaluateCapabilityRoutes({
  required, routes = [], callable = [], mandates = [], evidence = [], verifyReceipt
}) {
  if (typeof required !== "string" || !required.trim()) {
    throw new TypeError("required capability must be named");
  }
  const live = new Set(callable);
  const grants = new Set(mandates);
  const candidates = routes.filter(r => r.capability === required).map(r => {
    const steps = Array.isArray(r.steps) ? r.steps : [];
    const valid = Boolean(r.id && r.requirement_ref && r.offer_id &&
      steps.length && steps.every(s => typeof s === "string" && s.length));
    const missing = steps.filter(s => !live.has(s));
    const callableNow = valid && missing.length === 0;
    const authorized = Boolean(r.mandate && grants.has(r.mandate));

    // Reject forged, stale, cross-route, incomplete or non-terminal receipts.
    // A completed execution proves the transport, not the task's success.
    const matching = evidence.filter(e =>
      e?.schema === "magistral.execution-receipt/v1" &&
      e.binding?.schema === "magistral.execution-binding/v1" &&
      e.binding.requirement_ref === r.requirement_ref &&
      e.binding.offer_id === r.offer_id &&
      typeof e.binding.provider_execution_id === "string" &&
      e.binding.provider_execution_id.length > 0 &&
      e.status === "completed" && e.terminal === true
    );
    const tested = callableNow && authorized &&
      typeof verifyReceipt === "function" &&
      matching.some(receipt => verifyReceipt(receipt, r) === true);
    const status = !valid ? "invalid"
      : !authorized ? "unauthorized"
      : !callableNow ? "unavailable"
      : !tested ? "untested" : "operational";
    return {
      id: r.id, remembered: true, callable: callableNow, missing,
      authorized, tested, reachable: tested, status,
      // Document retrieval remains a separate, task-level Reality test.
      outcome: tested ? "execution_confirmed" : "execution_unverified"
    };
  });
  const status = candidates.some(r => r.status === "operational") ? "operational"
    : candidates.some(r => r.status === "untested") ? "probe_required"
    : candidates.length ? "blocked" : "not_discovered";
  return {required, status, candidates};
}
