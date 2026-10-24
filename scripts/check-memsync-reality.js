#!/usr/bin/env node
/**
 * #283: synthetic, provider-neutral memory portability reality slice.
 * No real user information, provider account, network, or persistent write.
 * A process boundary is simulated through a JSON round-trip; this does not
 * establish portability of hidden vendor memory or PrivAI certification.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { ingestAgentAcquiredContext } from "./lib/agent-acquired-context-ingest.js";
import { extractSnapshotClaims, compareSnapshots, buildAlignmentPrompt } from "./lib/agent-acquired-context-alignment.js";
import { buildMultiAgentComparison } from "./lib/agent-context-comparison.js";
import { createItemReview } from "./lib/agent-acquired-context-review.js";
import { sha256Prefixed } from "./lib/agent-acquired-context.js";

const fixture = (name) => fs.readFileSync(new URL(`../prompts/fixtures/agent-acquired-context/${name}`, import.meta.url), "utf8");
const raw = fixture("rich-memory.yaml");
const before = ingestAgentAcquiredContext(raw);
assert.equal(before.ok, true, "synthetic source capture must validate");
assert.equal(before.raw.text, raw, "original source survives ingestion");
assert.equal(before.raw.sha256, sha256Prefixed(raw), "source integrity is inspectable");
assert.equal(before.normalized.claim_status, "agent_claim_not_fact");

const claims = extractSnapshotClaims(before.normalized);
assert.ok(claims.length > 0);
const office = claims.find((c) => c.id === "item:office");
const morning = claims.find((c) => c.id === "item:morning-meetings");
assert.ok(office && morning, "stable fixture identities");

const reviews = {
  [office.id]: createItemReview({
    captureId: before.normalized.capture_id, itemId: office.id,
    verdict: "rejected", note: "Fictional user explicitly rejects this claim.",
  }),
  [morning.id]: createItemReview({
    captureId: before.normalized.capture_id, itemId: morning.id,
    verdict: "accepted", note: "Fictional user confirms this preference.",
  }),
};
const alignment = buildAlignmentPrompt({ snapshot: before.normalized, reviews, provider: "Synthetic A" });
assert.ok(alignment.includes("AFFIRMATIONS REJETÉES"));
assert.ok(alignment.includes(office.content));
assert.ok(alignment.includes(morning.content));

// Export an independent, source-faithful handoff. A second handler receives
// precisely this value and no agent session or original in-memory object.
const envelope = {
  format: "cogentia.memsync-reality.synthetic.v0",
  origin: "synthetic_fixture_only",
  provider_state_claim: "not_exported",
  source: { text: raw, sha256: sha256Prefixed(raw) },
  reviews,
  policy: {
    no_automatic_corpus_promotion: true,
    requires_human_review: true,
    no_public_personal_data: true,
  },
};
const copied = JSON.parse(JSON.stringify(envelope));
assert.equal(copied.source.sha256, sha256Prefixed(copied.source.text));
const resumed = ingestAgentAcquiredContext(copied.source.text);
assert.equal(resumed.ok, true);
assert.deepEqual(resumed.normalized, before.normalized, "cold source-based reconstruction is deterministic");
assert.deepEqual(copied.reviews, reviews);
assert.equal(copied.policy.no_automatic_corpus_promotion, true);

// Distinguish a second agent's bounded observation from provider-memory transfer.
const second = ingestAgentAcquiredContext(fixture("no-persistent-memory.yaml"));
assert.equal(second.ok, true);
const multi = buildMultiAgentComparison([before.normalized, second.normalized]);
assert.equal(multi.snapshotsCount, 2);
assert.equal(multi.epistemicInvariants.majorityVoteNeverBecomesTruth, true);
const diff = compareSnapshots(before.normalized, second.normalized, reviews);
assert.ok(diff.epistemicDisclaimer.includes("ne garantit pas"));
assert.ok(diff.droppedCount > 0, "missing claims are observable, not proof of forgetting");

// Native assessments stay separate. No invented minute/$ or hidden-state claim.
const metrics = {
  source_items: claims.length,
  resumed_items: extractSnapshotClaims(resumed.normalized).length,
  distinct_agent_snapshots: multi.snapshotsCount,
  human_reviews: Object.keys(reviews).length,
  lost_source_bytes: copied.source.text === raw ? 0 : null,
  human_attention: { status: "not_estimated", resource_type: "human.attention", reason: "No observed matched human trial" },
  provider_hidden_memory_continuity: "not_tested",
  production_browser_journey: "not_tested",
  provider_swap_execution: "synthetic_source_roundtrip_only",
};
assert.equal(metrics.source_items, metrics.resumed_items);
assert.equal(metrics.lost_source_bytes, 0);
console.log(JSON.stringify({ result: "PASS_synthetic_only", packet: 283, metrics }, null, 2));
