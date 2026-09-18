#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  allocateExplicit,
  createFactLog,
  executeFundedBranch,
  joinChoicePoint,
  openAndChoicePoint,
  projectFrontier,
  publishVerifiedEvidence,
  shareEvidence,
} from "./lib/continuation-frontier-f2a.js";

const CP = "f4-and-quorum";
const BRANCHES = ["hypothesis-a", "hypothesis-b", "hypothesis-c"];
const log = createFactLog();
openAndChoicePoint(log, {
  id: CP,
  parentRef: "f4-parent-objective",
  quorum: 2,
  branches: BRANCHES.map((id) => ({ id, title: id, payload: { input: { text: "F4 convergence" } } })),
});

let orientationComputations = 0;
const orientation = { type: "orientation_result", ok: true, value: { route: ["F4", "shared-evidence"] } };
orientationComputations += 1;
const published = publishVerifiedEvidence(log, { id: "orientation-fact", producerRef: "orientation-handler", receipt: orientation });
shareEvidence(log, { evidenceId: published.evidenceId, recipientRefs: BRANCHES });

for (const id of BRANCHES) {
  allocateExplicit(log, { choicePointId: CP, fund: id });
  const outcome = id === "hypothesis-c" ? { ok: false, stopReason: "falsified", costUnits: 0 } : { ok: true, costUnits: 1, capabilityCalls: 1 };
  await executeFundedBranch(log, { continuationRef: id, execute: async () => outcome });
}

const beforeJoin = projectFrontier(log.facts());
assert.equal(orientationComputations, 1, "orientation must be computed once");
assert.equal(Object.keys(beforeJoin.evidence).length, 1);
for (const id of BRANCHES) {
  const branch = beforeJoin.choicePoints[0].branches.find((item) => item.continuationRef === id);
  assert.deepEqual(branch.sharedEvidence, [{ evidenceId: "orientation-fact", parentEventIds: [published.eventId] }]);
}
assert.equal(beforeJoin.choicePoints[0].branches.find((branch) => branch.continuationRef === "hypothesis-c").viability, "exhausted");

joinChoicePoint(log, {
  choicePointId: CP,
  synthesis: { answer: "two compatible hypotheses converge" },
  includeResidueRefs: ["hypothesis-c"],
});
const converged = projectFrontier(log.facts());
assert.deepEqual(converged.choicePoints[0].convergence.succeededRefs, ["hypothesis-a", "hypothesis-b"]);
assert.deepEqual(converged.choicePoints[0].convergence.residueRefs, ["hypothesis-c"]);
assert.equal(converged.choicePoints[0].branches.find((branch) => branch.continuationRef === "hypothesis-c").viability, "exhausted");
assert.deepEqual(projectFrontier(log.facts()), converged, "event replay must reconstruct convergence");
console.log("ok - F4 shares immutable evidence by parent event and converges an AND quorum with exhausted residue");
