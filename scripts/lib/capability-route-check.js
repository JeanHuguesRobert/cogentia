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


/**
 * Resolve evidence through an adapter owned by the execution trust domain.
 * The caller supplies requirements/routes and the admitted adapter reference;
 * it cannot supply an evidence array or a verifier callback here.
 *
 * This is an integration seam, NOT a built-in verification of GitHub or COP.
 * A real adapter must fetch receipts from authoritative run/trace storage,
 * validate their correlation and integrity, and enforce its trust boundary.
 */
export async function assessCapabilityFromReceiptSource({
  required, routes, callable, mandates, receiptSource
}) {
  if (!receiptSource || typeof receiptSource.fetchVerified !== "function") {
    throw new TypeError("trusted receipt source with fetchVerified() required");
  }
  const admissible = (routes || []).filter(r =>
    r.capability === required &&
    r.mandate && (mandates || []).includes(r.mandate) &&
    Array.isArray(r.steps) && r.steps.length > 0 &&
    r.steps.every(s => (callable || []).includes(s))
  );
  const evidence = [];
  const verifiedKeys = new Set();
  for (const route of admissible) {
    const record = await receiptSource.fetchVerified({
      requirement_ref: route.requirement_ref,
      offer_id: route.offer_id
    });
    // The source must return both its own verification decision and the
    // correlated receipt. Never trust a boolean embedded in the receipt.
    if (!record || record.verified !== true || !record.receipt) continue;
    const receipt = record.receipt;
    const key = JSON.stringify([
      receipt.binding?.requirement_ref, receipt.binding?.offer_id,
      receipt.binding?.provider_execution_id
    ]);
    evidence.push(receipt);
    verifiedKeys.add(key);
  }
  return evaluateCapabilityRoutes({
    required, routes, callable, mandates, evidence,
    verifyReceipt: receipt => verifiedKeys.has(JSON.stringify([
      receipt.binding?.requirement_ref, receipt.binding?.offer_id,
      receipt.binding?.provider_execution_id
    ]))
  });
}
