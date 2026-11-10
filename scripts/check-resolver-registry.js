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
  findCapableResolversForAll,
  claimAdmissibleResolver,
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

  // AND semantics: both requirements must be held by the same resolver.
  assert.deepEqual(
    findCapableResolversForAll(root, ["corpus_research", "image_view"]).map((r) => r.resolver_id),
    ["human-jhrobert"]
  );
  assert.deepEqual(
    findCapableResolversForAll(root, ["corpus_research", "quantum_computing"]),
    [],
    "unknown requirements must fail closed"
  );
  assert.equal(findCapableResolversForAll(root, []).length, 2);
  assert.equal(findCapableResolversForAll(root, ["image_view", "image_view"]).length, 1);
  assert.throws(() => findCapableResolversForAll(root, "image_view"), TypeError);
  assert.throws(() => findCapableResolversForAll(root, ["image_view", ""]), TypeError);

  const noRequirement = findCapableResolvers(root, "");
  assert.equal(noRequirement.length, 2, "an empty requirement should match every resolver");

  const nobodyCapable = findCapableResolvers(root, "quantum_computing");
  assert.equal(nobodyCapable.length, 0);

  // No implicit admission: registered capability does not imply authority.
  assert.equal(
    claimAdmissibleResolver(root, "ctn_no_gates", ["corpus_research"]).reason,
    "missing_admission_checks"
  );
  assert.equal(getClaim(root, "ctn_no_gates"), null);
  const unavailable = claimAdmissibleResolver(root, "ctn_unavailable", ["corpus_research"], {
    isAvailable: () => false,
    isAuthorized: () => true,
  });
  assert.equal(unavailable.reason, "no_admissible_resolver");
  assert.equal(getClaim(root, "ctn_unavailable"), null);
  const unauthorized = claimAdmissibleResolver(root, "ctn_unauthorized", ["corpus_research"], {
    isAvailable: () => true,
    isAuthorized: () => false,
  });
  assert.equal(unauthorized.reason, "no_admissible_resolver");
  assert.equal(getClaim(root, "ctn_unauthorized"), null);
  const admitted = claimAdmissibleResolver(root, "ctn_admitted", ["corpus_research", "image_view"], {
    isAvailable: () => true,
    isAuthorized: () => true,
  });
  assert.equal(admitted.claimed, true);
  assert.equal(admitted.claim.resolver_id, "human-jhrobert");
  assert.equal(claimAdmissibleResolver(root, "ctn_admitted", ["corpus_research", "image_view"], {
    isAvailable: () => true,
    isAuthorized: () => true,
  }).reason, "already_claimed");
  assert.equal(claimAdmissibleResolver(root, "ctn_unknown", ["not-a-capability"], {
    isAvailable: () => true,
    isAuthorized: () => true,
  }).reason, "no_capable_resolver_available");

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
