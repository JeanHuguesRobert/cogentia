#!/usr/bin/env node
/**
 * Reality test: an already mandatory, read-only orientation receipt must give
 * the reasoner actionable source pointers, not only a concept count.
 */
import assert from "node:assert/strict";
import { projectOrientationForAgent, ORIENT_SCHEMA } from "./lib/corpus-orient.js";
import {
  createCapabilityRegistry, createGovernedHarness,
} from "./lib/agent-jhn-whatsapp/governed-harness.js";

const canonical = "research/cognitive_packet_switching.md";
const concept = "Cognitive Packet Switching";
const question = "Does Cognitive Packet Switching need a continuous end-to-end circuit?";

const knownOrientation = {
  ok: true,
  schema: ORIENT_SCHEMA,
  terminal_state: "bounded_exhausted",
  resolved_concepts: [{ name: concept }],
  read_first: [
    { repo: "cogentia", path: "research/other.md", title: "Other", provenance: "derived_structurally" },
    { repo: "cogentia", path: canonical, title: concept, provenance: "explicit" },
    { repo: "cogentia", path: canonical, title: concept, provenance: "explicit" },
    { repo: "cogentia", path: "../private/passwords", provenance: "explicit" },
    { repo: "cogentia", path: "research/more.md", title: "More", provenance: "derived_structurally" },
    { repo: "cogentia", path: "research/last.md", title: "Last", provenance: "derived_structurally" },
  ],
};

const projected = projectOrientationForAgent(knownOrientation);
assert.equal(projected.ok, true);
assert.equal(projected.type, "orientation_result");
assert.equal(projected.source, "corpus.orient");
assert.equal(projected.evidence_status, "unverified_navigation_hints");
assert.equal(projected.resolved_concept_count, 1);
assert.equal(projected.read_first[0].path, canonical);
assert.equal(projected.read_first.length, 3);
assert.ok(projected.read_first.every((entry) => !entry.path.includes("..")));
assert.ok(projected.next_action.includes("get_lines"));
assert.deepEqual(projectOrientationForAgent({ ok: false }), {
  ok: false, reason: "orientation_unavailable",
});

let lookups = 0;
let firstReasonerObservation;
const registry = createCapabilityRegistry([{
  name: "corpus.search",
  kind: "tool",
  risk: "read_only",
  resultVisibility: "reasoner",
  costUnits: 1,
  execute: async ({ query }) => {
    lookups += 1;
    assert.match(query, /circuit/);
    return { source: canonical, excerpt: "No dedicated end-to-end circuit is required." };
  },
}]);

const harness = createGovernedHarness({
  registry,
  requiredEventHandlers: {
    "orientation.required": async () => projectOrientationForAgent(knownOrientation),
  },
  reasoner: {
    async nextStep(state) {
      const observed = state.observations.find((item) => item.type === "orientation_result");
      assert.ok(observed, "orient before the first reasoning step");
      assert.equal(observed.read_first[0].path, canonical);
      assert.equal(observed.evidence_status, "unverified_navigation_hints");
      firstReasonerObservation ||= observed;
      const evidence = state.observations.find((item) =>
        item.type === "capability_result" && item.capability === "corpus.search");
      if (!evidence) {
        return { kind: "capability_call", capability: "corpus.search",
          input: { query: "packet switching circuit" } };
      }
      return {
        kind: "answer",
        answer: "Already documented: " + evidence.value.source + ": " + evidence.value.excerpt,
      };
    },
  },
});
const result = await harness.run(
  { text: question },
  { allowedCapabilities: ["corpus.search"] },
  { maxSteps: 3, maxCapabilityCalls: 1 }
);
assert.equal(result.ok, true);
assert.equal(result.requiredEventCount, 1);
assert.equal(lookups, 1);
assert.equal(result.steps[0].step.kind, "capability_call");
assert.equal(result.steps[1].step.kind, "answer");
assert.ok(result.answer.includes(canonical));
assert.equal(firstReasonerObservation.read_first[0].provenance, "explicit");

const blocked = createGovernedHarness({
  registry,
  requiredEventHandlers: {
    "orientation.required": async () => projectOrientationForAgent({ ok: false }),
  },
  reasoner: {
    async nextStep() { throw Error("reasoner must not run without mandatory orientation"); },
  },
});
const failed = await blocked.run({ text: question });
assert.equal(failed.stopReason, "required_event_failed");
console.log(JSON.stringify({
  ok: true,
  scenario: "existing CPS doctrine discovered before answer",
  mandatory_orientation: result.requiredEventCount,
  first_source: canonical,
  verification_probes: lookups,
  no_unverified_claim: true,
  failed_orientation_fails_closed: true,
}, null, 2));
