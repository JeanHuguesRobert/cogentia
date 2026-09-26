/**
 * Resolver capability registry + optimistic-locking claim protocol
 * (inseme#111, part of the "Super ACP" umbrella, inseme#112).
 *
 * Design note (kept here rather than a separate doc, per the issue's own
 * preference for a short note over a research paper):
 *
 * - Implements cognitive_packets.md §10.6's "routing" payload kind for
 *   real: a continuation carries a `required_capability` (a coarse
 *   string from an open, uncontrolled vocabulary -- e.g.
 *   "corpus_research", "tool_use", "image_view"); a resolver declares,
 *   in a small registered file, which capabilities it currently has.
 * - Deliberately NOT auto-discovery: resolvers register themselves via
 *   registerResolver() (a human or agent calls this once per session/
 *   process start); nothing probes liveness or capability automatically.
 *   Per the issue's own stated assumption, the realistic resolver pool
 *   is small (jhrobert + one or two coding-agent sessions), so a
 *   manually-maintained registry is acceptable for v1.
 * - Claiming uses the filesystem's own atomic "create if not exists"
 *   semantics (`fs.writeFileSync(path, data, { flag: "wx" })`) as the
 *   optimistic-locking primitive: two resolvers racing to claim the same
 *   continuation will have exactly one writeFileSync succeed and one
 *   throw EEXIST, with no separate lock server or database needed --
 *   matching the corpus's existing preference for git-trackable,
 *   inspectable, filesystem-based state.
 * - This module deliberately does NOT touch cogentia.js's own
 *   `.cogentia/continuations/*.json` files -- resolver registrations and
 *   claims live in a sibling `.cogentia/resolvers/` tree, so this stays
 *   additive and doesn't require changing continuation.js's file format
 *   or its owning code.
 * - NOT wired into continuation-acp-server.js yet (inseme#107/#108/#109/
 *   #110's server) -- this is the claim-step prototype only, tested in
 *   isolation, per the issue's own Next Action #2 ("prototype the claim
 *   step only... before wiring it into the full ACP server").
 */

import fs from "node:fs";
import path from "node:path";

function resolversDir(cogentiaRoot) {
  return path.join(cogentiaRoot, ".cogentia", "resolvers");
}

function claimsDir(cogentiaRoot) {
  return path.join(resolversDir(cogentiaRoot), "claims");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Register (or re-register, overwriting) a resolver's declared
 * capabilities. Idempotent -- calling it again just updates the file.
 */
export function registerResolver(cogentiaRoot, resolverId, capabilities) {
  if (!resolverId) throw new Error("registerResolver requires a resolverId");
  if (!Array.isArray(capabilities)) throw new Error("registerResolver requires an array of capability strings");
  const dir = resolversDir(cogentiaRoot);
  ensureDir(dir);
  const record = {
    resolver_id: resolverId,
    capabilities,
    registered_at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dir, `${resolverId}.json`), JSON.stringify(record, null, 2), "utf8");
  return record;
}

export function deregisterResolver(cogentiaRoot, resolverId) {
  const file = path.join(resolversDir(cogentiaRoot), `${resolverId}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

export function listResolvers(cogentiaRoot) {
  const dir = resolversDir(cogentiaRoot);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

/**
 * Resolvers whose declared capabilities include the required one.
 * required_capability of "" or undefined matches every resolver (no
 * specific capability was asked for).
 */
export function findCapableResolvers(cogentiaRoot, requiredCapability) {
  const all = listResolvers(cogentiaRoot);
  if (!requiredCapability) return all;
  return all.filter((r) => Array.isArray(r.capabilities) && r.capabilities.includes(requiredCapability));
}

/**
 * Attempt to claim a continuation for a given resolver. Returns
 * { claimed: true, claim } on success, { claimed: false, existingClaim }
 * if someone else already claimed it first -- the optimistic-locking
 * race resolution, using the filesystem's own atomic exclusive-create.
 */
export function claimContinuation(cogentiaRoot, continuationId, resolverId) {
  if (!continuationId) throw new Error("claimContinuation requires a continuationId");
  if (!resolverId) throw new Error("claimContinuation requires a resolverId");
  const dir = claimsDir(cogentiaRoot);
  ensureDir(dir);
  const claimFile = path.join(dir, `${continuationId}.json`);
  const claim = { continuation_id: continuationId, resolver_id: resolverId, claimed_at: new Date().toISOString() };
  try {
    fs.writeFileSync(claimFile, JSON.stringify(claim, null, 2), { encoding: "utf8", flag: "wx" });
    return { claimed: true, claim };
  } catch (err) {
    if (err.code === "EEXIST") {
      const existingClaim = JSON.parse(fs.readFileSync(claimFile, "utf8"));
      return { claimed: false, existingClaim };
    }
    throw err;
  }
}

export function getClaim(cogentiaRoot, continuationId) {
  const claimFile = path.join(claimsDir(cogentiaRoot), `${continuationId}.json`);
  if (!fs.existsSync(claimFile)) return null;
  return JSON.parse(fs.readFileSync(claimFile, "utf8"));
}

export function releaseClaim(cogentiaRoot, continuationId) {
  const claimFile = path.join(claimsDir(cogentiaRoot), `${continuationId}.json`);
  if (fs.existsSync(claimFile)) fs.unlinkSync(claimFile);
}
