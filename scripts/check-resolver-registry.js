#!/usr/bin/env node
/**
 * Isolated test for the resolver capability registry + optimistic-locking
 * claim protocol (inseme#111). Uses a throwaway temp directory as the
 * "cogentia root" so it never touches the real .cogentia/ tree.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  registerResolver,
  deregisterResolver,
  listResolvers,
  findCapableResolvers,
  claimContinuation,
  getClaim,
  releaseClaim,
} from "./lib/resolver-registry.js";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "resolver-registry-test-"));

try {
  // Registration is idempotent and readable back.
  registerResolver(root, "claude-session-a", ["corpus_research", "tool_use"]);
  registerResolver(root, "human-jhrobert", ["corpus_research", "image_view", "legal_judgment"]);
  const all = listResolvers(root);
  assert.equal(all.length, 2, "both resolvers should be listed");

  // Capability matching.
  const capable = findCapableResolvers(root, "image_view");
  assert.equal(capable.length, 1);
  assert.equal(capable[0].resolver_id, "human-jhrobert");

  const noRequirement = findCapableResolvers(root, "");
  assert.equal(noRequirement.length, 2, "an empty requirement should match every resolver");

  const nobodyCapable = findCapableResolvers(root, "quantum_computing");
  assert.equal(nobodyCapable.length, 0);

  // The actual point of this issue: optimistic-locking claim race.
  const continuationId = "ctn_test_race";
  const first = claimContinuation(root, continuationId, "claude-session-a");
  assert.equal(first.claimed, true);

  const second = claimContinuation(root, continuationId, "human-jhrobert");
  assert.equal(second.claimed, false, "a second claim on the same continuation must be rejected");
  assert.equal(second.existingClaim.resolver_id, "claude-session-a", "the rejection must name who actually holds it");

  const claim = getClaim(root, continuationId);
  assert.equal(claim.resolver_id, "claude-session-a");

  releaseClaim(root, continuationId);
  assert.equal(getClaim(root, continuationId), null, "release should clear the claim");

  // After release, a claim attempt should succeed again.
  const third = claimContinuation(root, continuationId, "human-jhrobert");
  assert.equal(third.claimed, true);

  deregisterResolver(root, "claude-session-a");
  assert.equal(listResolvers(root).length, 1);

  console.log(JSON.stringify({ ok: true, message: "resolver registry + optimistic-locking claim protocol verified" }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
