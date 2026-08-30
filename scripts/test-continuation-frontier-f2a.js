#!/usr/bin/env node
/**
 * F2a Reality Test: OR Choice Point + Continuation Frontier projection.
 * F2a DOES NOT TEST Closed(p,h,E). F2 is not declared converged here.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  allocateExplicit,
  createFactLog,
  executeFundedBranch,
  openOrChoicePoint,
  projectFrontier,
} from "./lib/continuation-frontier-f2a.js";
import {
  createCapabilityRegistry,
  createGovernedHarness,
} from "./lib/agent-jhn-whatsapp/governed-harness.js";

const tests = [];
const test = (name, run) => tests.push({ name, run });
const here = path.dirname(fileURLToPath(import.meta.url));

const PARENT = "parent-objective-or-1";
const CP = "choice-or-1";
const A = "branch-A";
const B = "branch-B";
const CORPUS_QUESTION = "How do Kudos affect Cognitive Packet routing?";

function registry() {
  return createCapabilityRegistry([
    {
      name: "corpus.search",
      kind: "tool",
      risk: "read_only",
      resultVisibility: "reasoner",
      costUnits: 1,
      execute: async ({ query }) => ({ excerpts: [`evidence:${query}`] }),
    },
  ]);
}

function stubOrientation() {
  return {
    "orientation.required": async ({ input }) => ({
      type: "orientation_result",
      ok: true,
      value: { query: input.text, conceptual_route: ["Kudos", "Cognitive Packet"] },
    }),
  };
}

function successHarness() {
  let calls = 0;
  return createGovernedHarness({
    registry: registry(),
    requiredEventHandlers: stubOrientation(),
    reasoner: {
      async nextStep() {
        calls += 1;
        if (calls === 1) {
          return { kind: "capability_call", capability: "corpus.search", input: { query: "Kudos" } };
        }
        return { kind: "answer", answer: "A satisfies the parent OR objective" };
      },
    },
  });
}

function failHarness() {
  return createGovernedHarness({
    registry: registry(),
    requiredEventHandlers: stubOrientation(),
    reasoner: {
      async nextStep() {
        return { kind: "stop", reason: "hypothesis_exhausted" };
      },
    },
  });
}

function openWorld() {
  const log = createFactLog();
  openOrChoicePoint(log, {
    id: CP,
    parentRef: PARENT,
    branches: [
      { id: A, title: "Hypothesis A", question: CORPUS_QUESTION, payload: { input: { text: CORPUS_QUESTION } } },
      { id: B, title: "Hypothesis B", question: CORPUS_QUESTION, payload: { input: { text: CORPUS_QUESTION } } },
    ],
  });
  return log;
}

function branch(frontier, id) {
  return frontier.choicePoints[0].branches.find((item) => item.continuationRef === id);
}

function runF1(harness) {
  return async (continuation) => harness.run(
    continuation.payload.input,
    { allowedCapabilities: ["corpus.search"] },
    { maxSteps: 2, maxCapabilityCalls: 2, maxCostUnits: 5 }
  );
}

test("A — two alternatives coexist; selection deletes neither", () => {
  const log = openWorld();
  const afterOpen = projectFrontier(log.facts());
  assert.equal(afterOpen.choicePoints.length, 1);
  assert.equal(afterOpen.choicePoints[0].mode, "OR");
  assert.equal(afterOpen.choicePoints[0].parentRef, PARENT);
  assert.equal(afterOpen.choicePoints[0].branches.length, 2);
  assert.ok(afterOpen.continuations[A]);
  assert.ok(afterOpen.continuations[B]);
  assert.equal(afterOpen.continuations[A].closure.verified, false);

  const afterFund = allocateExplicit(log, { choicePointId: CP, fund: A });
  assert.equal(afterFund.choicePoints[0].branches.length, 2);
  assert.equal(branch(afterFund, A).allocation, "funded");
  assert.equal(branch(afterFund, B).allocation, "unfunded");
  assert.equal(branch(afterFund, A).viability, "live");
  assert.equal(branch(afterFund, B).viability, "live");
});

test("B — funding is separate from readiness; unfunded stays live and cannot run", async () => {
  const log = openWorld();
  allocateExplicit(log, { choicePointId: CP, fund: A });
  const frontier = projectFrontier(log.facts());
  assert.equal(branch(frontier, A).readiness, "runnable");
  assert.equal(branch(frontier, B).readiness, "runnable");
  assert.equal(branch(frontier, A).allocation, "funded");
  assert.equal(branch(frontier, B).allocation, "unfunded");
  assert.equal(branch(frontier, B).viability, "live");

  let bRuns = 0;
  await assert.rejects(
    () => executeFundedBranch(log, {
      continuationRef: B,
      execute: async () => {
        bRuns += 1;
        return { ok: true, costUnits: 1 };
      },
    }),
    /not funded/
  );
  assert.equal(bRuns, 0);
  assert.equal(branch(projectFrontier(log.facts()), B).executionCount, 0);
});

test("C — success obsoletes sibling without running it", async () => {
  const log = openWorld();
  allocateExplicit(log, { choicePointId: CP, fund: A });
  const { result, frontier } = await executeFundedBranch(log, {
    continuationRef: A,
    execute: runF1(successHarness()),
  });
  assert.equal(result.ok, true);
  assert.equal(frontier.choicePoints[0].resolvedBy, A);
  assert.equal(branch(frontier, A).executionCount, 1);
  assert.equal(branch(frontier, B).executionCount, 0);
  assert.equal(branch(frontier, B).viability, "obsolete");
  assert.equal(branch(frontier, B).allocation, "unfunded");
  assert.equal(branch(frontier, A).viability, "live");
  assert.ok(frontier.continuations[B], "obsolete branch remains as residue");
});

test("D — failure preserves fallback; B can later be funded and run", async () => {
  const log = openWorld();
  allocateExplicit(log, { choicePointId: CP, fund: A });
  const afterA = await executeFundedBranch(log, {
    continuationRef: A,
    execute: runF1(failHarness()),
  });
  assert.equal(afterA.result.ok, false);
  assert.equal(branch(afterA.frontier, A).viability, "exhausted");
  assert.equal(branch(afterA.frontier, B).viability, "live");
  assert.equal(branch(afterA.frontier, B).executionCount, 0);
  assert.equal(afterA.frontier.choicePoints[0].resolvedBy, null);

  const afterFundB = allocateExplicit(log, { choicePointId: CP, fund: B });
  assert.equal(branch(afterFundB, B).allocation, "funded");
  assert.equal(branch(afterFundB, A).allocation, "unfunded");
  assert.equal(branch(afterFundB, A).viability, "exhausted");

  const afterB = await executeFundedBranch(log, {
    continuationRef: B,
    execute: runF1(successHarness()),
  });
  assert.equal(afterB.result.ok, true);
  assert.equal(branch(afterB.frontier, B).executionCount, 1);
  assert.equal(afterB.frontier.choicePoints[0].resolvedBy, B);
  assert.equal(branch(afterB.frontier, A).viability, "exhausted");
});

test("E — replay rebuilds the same Frontier projection", async () => {
  const log = openWorld();
  allocateExplicit(log, { choicePointId: CP, fund: A });
  await executeFundedBranch(log, { continuationRef: A, execute: runF1(successHarness()) });
  const first = projectFrontier(log.facts());
  const replayed = projectFrontier(log.facts());
  assert.deepEqual(replayed, first);
  const fromSeed = projectFrontier(createFactLog(log.facts()).facts());
  assert.deepEqual(fromSeed, first);
});

test("F — accounting stays per-branch; existing is not a cost", async () => {
  const log = openWorld();
  allocateExplicit(log, { choicePointId: CP, fund: A });
  const { frontier } = await executeFundedBranch(log, {
    continuationRef: A,
    execute: runF1(successHarness()),
  });
  assert.equal(branch(frontier, A).costUnits, 1);
  assert.equal(branch(frontier, A).capabilityCalls, 1);
  assert.equal(branch(frontier, B).costUnits, 0);
  assert.equal(branch(frontier, B).capabilityCalls, 0);
  assert.equal(branch(frontier, B).executionCount, 0);
});

test("G — F1.2 required-event tests still pass", () => {
  const script = path.join(here, "test-agent-jhn-f1-required-events.js");
  const child = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(child.status, 0, child.stdout + child.stderr);
  assert.match(child.stdout, /"passed": 11/);
});

const failures = [];
for (const item of tests) {
  try {
    await item.run();
    console.log(`ok  - ${item.name}`);
  } catch (error) {
    failures.push({ name: item.name, error });
    console.log(`fail- ${item.name}`);
    console.log(error.stack || error.message);
  }
}
if (failures.length) {
  console.log(`\n${failures.length} failed, ${tests.length - failures.length} passed`);
  process.exit(1);
}
console.log(`\n${tests.length} passed`);
