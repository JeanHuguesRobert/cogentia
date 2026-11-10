/**
 * Inseme #111: local capability-aware continuation selection and FractaRouting.
 * Core only: callers supply already-read continuation snapshots and an independent
 * mandate admissibility predicate. No COP authorization is minted here.
 */
import fs from "node:fs";
import path from "node:path";
import { findCapableResolvers, claimContinuation, getClaim } from "./resolver-registry.js";

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
export function nextContinuation(root, continuations, profile, { claim = false, admissible } = {}) {
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
    if (!claim) {
      if (!getClaim(root, id)) return { status: "available", continuation: c, claimed: false };
      continue;
    }
    const result = claimContinuation(root, id, profile.resolver_id);
    if (result.claimed) return { status: "claimed", continuation: c, claimed: true, claim: result.claim };
  }
  return { status: "no_admissible_unclaimed_continuation", continuation: null };
}

const routeFile = (root, id) => path.join(root, ".cogentia", "resolvers", "routes", safeId(id) + ".jsonl");
export function inspectRouting(root, continuationId) {
  const file = routeFile(root, continuationId);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}
/**
 * Records a proposed hop, not an accepted assignment or a resolution.
 * Identity and origin return slot remain untouched. The caller must ensure
 * the forwarding action itself is mandate-admissible.
 */
export function rerouteContinuation(root, continuation, { from, to, reason, maxHops = 4, admissible } = {}) {
  const id = safeId(continuation?.id || continuation?.continuation_id);
  safeId(from); safeId(to);
  if (typeof admissible !== "function" || admissible(continuation, { from, to }) !== true)
    return { status: "not_admissible", continuation_id: id };
  const hops = inspectRouting(root, id);
  if (continuation.status !== "active") return { status: "not_active", continuation_id: id };
  if (from === to || hops.length >= maxHops || hops.some((h) => h.from === to))
    return { status: "routing_exhausted", continuation_id: id, hops: hops.length };
  const target = findCapableResolvers(root, "").find((r) => r.resolver_id === to);
  if (!target) return { status: "destination_unregistered", continuation_id: id };
  const targetProfile = { capabilities: target.capabilities, judgement: target.capabilities.includes("Judgement") };
  if (!matching(continuation, targetProfile) || (isJudgement(continuation) && !hasJudgement(targetProfile)))
    return { status: "destination_incapable", continuation_id: id };
  const event = {
    schema: "cogentia.fractarouting.hop.v1", continuation_id: id,
    from, to, reason: String(reason || ""), status: "proposed",
    hop: hops.length + 1, at: new Date().toISOString(),
    return_ref: continuation.return_contract?.result_ref || `continuation:${id}/resolution`,
  };
  const file = routeFile(root, id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(event) + "\n", "utf8");
  return { status: "proposed", event };
}
