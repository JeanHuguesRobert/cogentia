/**
 * Inseme #111: local capability-aware continuation selection and FractaRouting.
 * Core only: callers supply already-read continuation snapshots and an independent
 * mandate admissibility predicate. No COP authorization is minted here.
 */
import fs from "node:fs";
import path from "node:path";
import { findCapableResolvers, claimContinuation, getClaim } from "./resolver-registry.js";
import { acquirePacketClaim, currentPacketClaim } from "./continuation-packet-claim.js";

const safeId = (id) => {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("invalid continuation/resolver id");
  return id;
};
const needs = (c) => Array.isArray(c.required_capabilities)
  ? c.required_capabilities : c.required_capability ? [c.required_capability] : [];
const hasJudgement = (profile) => profile.judgement === true ||
  profile.capabilities?.some((c) => c.toLowerCase() === "judgement") === true;
const isJudgement = (c) => needs(c).some((v) => /^(judgement|legal_judgment)$/i.test(v)) ||
  /judg(e)?ment/i.test(c.kind || "");
const matching = (c, profile) => needs(c).every((v) =>
  profile.capabilities.includes(v) ||
  (v === "Judgement" && hasJudgement(profile)));
const rank = (a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0) ||
  String(a.created_at || "").localeCompare(String(b.created_at || "")) ||
  String(a.id).localeCompare(String(b.id));

/**
 * Select next work. claim=false is strictly read-only.
 * admissible(c, profile) MUST be supplied by the caller: it is an independent
 * mandate + budget admission check, not an inference from a technical capability.
 * When claim=true the atomic exclusive-create decides concurrent claim races.
 */
export function nextContinuation(root, continuations, profile, { claim = false, admissible, claimMode = "legacy", leaseMs = 300000 } = {}) {
  if (!["legacy", "cop_v1"].includes(claimMode)) throw new Error("unknown claimMode");
  if (!profile?.resolver_id || !Array.isArray(profile.capabilities))
    throw new Error("resolver profile with capabilities required");
  safeId(profile.resolver_id);
  if (typeof admissible !== "function") throw new Error("independent admissible predicate required");
  const registered = findCapableResolvers(root, "").find((r) => r.resolver_id === profile.resolver_id);
  if (!registered) return { status: "resolver_not_registered", continuation: null };
  const effective = { ...profile, judgement: profile.judgement === true && registered.capabilities.includes("Judgement"), capabilities: profile.capabilities.filter((v) => registered.capabilities.includes(v)) };
  const candidates = [...continuations].filter((c) => c && c.status === "active" && (c.id || c.continuation_id))
    .filter((c) => matching(c, effective) && (!isJudgement(c) || hasJudgement(effective)))
    .filter((c) => admissible(c, effective) === true).sort(rank);
  for (const c of candidates) {
    const id = safeId(c.id || c.continuation_id);
    const canonical = currentPacketClaim(root, id);
    const canonicalLive = canonical && Date.parse(canonical.expires_at) > Date.now();
    // Once a packet entered v1, all subsequent claims must use v1 epochs.
    // The legacy adapter must never reclaim it even after lease expiry.
    // Cross-mode simultaneous FIRST claims remain unsupported: deploy with
    // a single configured claim mode, not with concurrent mixed writers.
    if (getClaim(root, id) || canonicalLive || (canonical && claimMode === "legacy")) continue;
    if (!claim) return { status: "available", continuation: c, claimed: false };
    const result = claimMode === "cop_v1"
      ? acquirePacketClaim(root, id, profile.resolver_id, { leaseMs })
      : claimContinuation(root, id, profile.resolver_id);
    if (result.claimed) return { status: "claimed", continuation: c, claimed: true,
      claim: result.claim, claim_mode: claimMode };
  }
  return { status: "no_admissible_unclaimed_continuation", continuation: null };
}

const routeFile = (root, id) => path.join(root, ".cogentia", "resolvers", "routes", safeId(id) + ".jsonl");
export function inspectRouting(root, continuationId) {
  const file = routeFile(root, continuationId);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}
function recordRouteEvent(root, id, event) {
  const file = routeFile(root, id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(event) + "\n", "utf8");
  return event;
}
/**
 * Records a proposed hop, not an accepted assignment or a resolution.
 * Identity and origin return slot remain untouched. The caller must ensure
 * the forwarding action itself is mandate-admissible.
 */
export function rerouteContinuation(root, continuation, { from, to, reason, maxHops = 4, admissible } = {}) {
  const id = safeId(continuation?.id || continuation?.continuation_id);
  safeId(from);
  if (to) safeId(to);
  const prior = inspectRouting(root, id);
  const hops = prior.filter((h) => h.status === "proposed");
  const base = { schema: "cogentia.fractarouting.hop.v1", continuation_id: id,
    from, to: to || null, reason: String(reason || ""),
    at: new Date().toISOString(),
    return_ref: continuation.return_contract?.result_ref || `continuation:${id}/resolution` };
  const reject = (status) => {
    recordRouteEvent(root, id, { ...base, status, hop: hops.length });
    return { status, continuation_id: id, hops: hops.length };
  };
  if (typeof admissible !== "function" || admissible(continuation, { from, to }) !== true)
    return reject("not_admissible");
  if (continuation.status !== "active") return reject("not_active");
  if (!to || from === to || hops.length >= maxHops || hops.some((h) => h.from === to))
    return reject("routing_exhausted");
  const target = findCapableResolvers(root, "").find((r) => r.resolver_id === to);
  if (!target) return reject("destination_unregistered");
  const targetProfile = { capabilities: target.capabilities, judgement: target.capabilities.includes("Judgement") };
  if (!matching(continuation, targetProfile) || (isJudgement(continuation) && !hasJudgement(targetProfile)))
    return reject("destination_incapable");
  const event = recordRouteEvent(root, id, { ...base, status: "proposed", hop: hops.length + 1 });
  return { status: "proposed", event };
}

/**
 * Reconcile a routing proposal with an observed claim or a canonical
 * continuation resolution. This is evidence recording, NOT assignment,
 * authorization, an alternate resolver, or a delivery notification.
 */
export function recordRoutingOutcome(root, continuation, { resolverId, phase, receiptRef = null } = {}) {
  const id = safeId(continuation?.id || continuation?.continuation_id);
  safeId(resolverId);
  if (!["accepted", "treated"].includes(phase))
    throw new Error("routing outcome phase must be accepted or treated");
  const prior = inspectRouting(root, id);
  const proposal = prior.findLast((h) => h.status === "proposed" && h.to === resolverId);
  if (!proposal) return { status: "missing_proposal", continuation_id: id };
  const holder = getClaim(root, id);
  if (!holder || holder.resolver_id !== resolverId)
    return { status: "claim_not_held", continuation_id: id };
  if (phase === "treated" && continuation.status !== "resolved")
    return { status: "resolution_not_observed", continuation_id: id };
  if (phase === "treated" && !continuation.resolution?.return_state?.result_available)
    return { status: "return_slot_not_ready", continuation_id: id };
  const priorOutcome = prior.find((h) => h.status === phase && h.to === resolverId && h.proposal_hop === proposal.hop);
  if (priorOutcome) return { status: "already_recorded", event: priorOutcome };
  const event = recordRouteEvent(root, id, {
    schema: "cogentia.fractarouting.outcome.v1",
    continuation_id: id, from: proposal.from, to: resolverId,
    status: phase, proposal_hop: proposal.hop, at: new Date().toISOString(),
    claim_at: holder.claimed_at,
    receipt_ref: receiptRef || (phase === "treated"
      ? continuation.resolution.return_state.result_ref : null),
    delivery_confirmed: false,
  });
  return { status: phase, event };
}
