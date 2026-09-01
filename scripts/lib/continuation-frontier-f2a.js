import fs from "node:fs";
import path from "node:path";

export const F2A_FACT_PROTOCOL = "cogentia.f2a_fact/v1";
export const F2A_FRONTIER_PROTOCOL = "cogentia.continuation_frontier.f2a/v1";
export const CHOICE_POINT_MODE_OR = "OR";
export const CHOICE_POINT_MODE_AND = "AND";

export function createFactLog(seed = []) {
  const facts = [];
  const log = {
    append(type, payload = {}) {
      const fact = Object.freeze({
        protocol: F2A_FACT_PROTOCOL,
        seq: facts.length + 1,
        type: String(type),
        payload: Object.freeze({ ...payload }),
      });
      facts.push(fact);
      return fact;
    },
    facts() {
      return facts.slice();
    },
  };
  for (const fact of seed) {
    log.append(fact.type, fact.payload || {});
  }
  return log;
}

export function createDurableFactLog(filePath, options = {}) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("filePath string is required for durable fact log");
  }
  const resolvedPath = path.resolve(filePath);
  const parentDir = path.dirname(resolvedPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const facts = [];

  // Replay existing facts if file exists on disk
  if (fs.existsSync(resolvedPath)) {
    const raw = fs.readFileSync(resolvedPath, "utf8");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && parsed.protocol === F2A_FACT_PROTOCOL) {
          facts.push(Object.freeze(parsed));
        }
      } catch (err) {
        if (!options.ignoreCorruptLines) {
          throw new Error(`Corrupted fact line in ${resolvedPath}: ${err.message}`);
        }
      }
    }
  }

  const log = {
    filePath: resolvedPath,
    append(type, payload = {}) {
      const fact = Object.freeze({
        protocol: F2A_FACT_PROTOCOL,
        seq: facts.length + 1,
        type: String(type),
        payload: Object.freeze({ ...payload }),
      });
      facts.push(fact);
      const line = JSON.stringify(fact) + "\n";
      fs.appendFileSync(resolvedPath, line, "utf8");
      return fact;
    },
    facts() {
      return facts.slice();
    },
    reload() {
      facts.length = 0;
      if (fs.existsSync(resolvedPath)) {
        const raw = fs.readFileSync(resolvedPath, "utf8");
        const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
        for (const line of lines) {
          const parsed = JSON.parse(line);
          if (parsed && parsed.protocol === F2A_FACT_PROTOCOL) {
            facts.push(Object.freeze(parsed));
          }
        }
      }
      return facts.slice();
    },
  };

  return log;
}

export function continuationShaped(fields = {}) {
  const id = String(fields.id || "").trim();
  if (!id) throw new Error("continuation id is required");
  return Object.freeze({
    protocol: "cogentia.continuation.v2",
    id,
    status: "active",
    kind: String(fields.kind || "f2a_branch"),
    title: String(fields.title || id),
    question: String(fields.question || ""),
    subject: fields.parentRef || null,
    context: Object.freeze({ parentRef: fields.parentRef || null, f2a: true }),
    expected_response: null,
    resume: null,
    payload: fields.payload && typeof fields.payload === "object" ? Object.freeze({ ...fields.payload }) : Object.freeze({}),
    capsulePath: fields.capsulePath || null,
    capsuleSha256: fields.capsuleSha256 || null,
    closed: Boolean(fields.closed),
    f2a_does_not_test_continuation_closure: fields.f2a_does_not_test_continuation_closure ?? true,
    closure: fields.closure ? Object.freeze({ ...fields.closure }) : Object.freeze({
      verified: false,
      closed: false,
      f2a_does_not_test_closed: true,
      note: "possibility != materializability != authorization != funding != runnable-now",
    }),
  });
}

export function openOrChoicePoint(log, { id, parentRef, branches } = {}) {
  const choicePointId = String(id || "").trim();
  if (!choicePointId) throw new Error("choice point id is required");
  if (!Array.isArray(branches) || branches.length < 2) {
    throw new Error("OR choice point requires at least two branches");
  }
  const branchRefs = [];
  for (const branch of branches) {
    const continuation = continuationShaped({ ...branch, parentRef });
    log.append("continuation_registered", { continuation });
    branchRefs.push(continuation.id);
  }
  log.append("choice_point_opened", {
    id: choicePointId,
    mode: CHOICE_POINT_MODE_OR,
    parentRef: parentRef || null,
    branchRefs,
  });
  return projectFrontier(log.facts());
}

export function openAndChoicePoint(log, { id, parentRef, branches } = {}) {
  const choicePointId = String(id || "").trim();
  if (!choicePointId) throw new Error("choice point id is required");
  if (!Array.isArray(branches) || branches.length < 2) {
    throw new Error("AND choice point requires at least two branches");
  }
  const branchRefs = [];
  for (const branch of branches) {
    const continuation = continuationShaped({ ...branch, parentRef });
    log.append("continuation_registered", { continuation });
    branchRefs.push(continuation.id);
  }
  log.append("choice_point_opened", {
    id: choicePointId,
    mode: CHOICE_POINT_MODE_AND,
    parentRef: parentRef || null,
    branchRefs,
  });
  return projectFrontier(log.facts());
}

export function allocateExplicit(log, { choicePointId, fund } = {}) {
  const frontier = projectFrontier(log.facts());
  const choicePoint = frontier.choicePoints.find((item) => item.id === choicePointId);
  if (!choicePoint) throw new Error(`unknown choice point: ${choicePointId}`);
  const fundedId = String(fund || "").trim();
  if (!choicePoint.branches.some((branch) => branch.continuationRef === fundedId)) {
    throw new Error(`unknown branch: ${fundedId}`);
  }
  log.append("allocation_decided", {
    choicePointId,
    funded: [fundedId],
    unfunded: choicePoint.branches
      .map((branch) => branch.continuationRef)
      .filter((ref) => ref !== fundedId),
    policy: "explicit",
  });
  return projectFrontier(log.facts());
}

export async function executeFundedBranch(log, { continuationRef, execute } = {}) {
  if (typeof execute !== "function") {
    throw new Error("execute callback is required; F2a does not own the inner loop");
  }
  const before = projectFrontier(log.facts());
  const located = locateBranch(before, continuationRef);
  if (!located) throw new Error(`unknown continuation: ${continuationRef}`);
  if (located.branch.allocation !== "funded") {
    throw new Error(`continuation is not funded: ${continuationRef}`);
  }
  if (located.branch.viability !== "live") {
    throw new Error(`continuation is not live: ${continuationRef}`);
  }
  if (located.branch.readiness !== "runnable") {
    throw new Error(`continuation is not runnable: ${continuationRef}`);
  }

  const result = await execute(located.continuation);
  const costUnits = Number(result?.costUnits) || 0;
  const capabilityCalls = Number(result?.capabilityCalls) || 0;
  const stepCount = Number(result?.stepCount) || 0;
  log.append("branch_run", {
    continuationRef,
    choicePointId: located.choicePoint.id,
    ok: Boolean(result?.ok),
    stopReason: result?.stopReason || null,
    costUnits,
    capabilityCalls,
    stepCount,
  });
  if (result?.ok) {
    if (located.choicePoint.mode === CHOICE_POINT_MODE_AND) {
      log.append("and_branch_completed", {
        continuationRef,
        choicePointId: located.choicePoint.id,
        answer: result?.answer,
        value: result?.value,
      });
      const updatedFrontier = projectFrontier(log.facts());
      const updatedCp = updatedFrontier.choicePoints.find((cp) => cp.id === located.choicePoint.id);
      if (updatedCp && updatedCp.branches.every((b) => b.viability === "satisfied")) {
        log.append("and_objective_converged", {
          choicePointId: located.choicePoint.id,
          completedBranches: updatedCp.branches.map((b) => b.continuationRef),
        });
      }
    } else {
      log.append("or_objective_satisfied", {
        choicePointId: located.choicePoint.id,
        by: continuationRef,
      });
    }
  } else {
    log.append("branch_exhausted", {
      continuationRef,
      choicePointId: located.choicePoint.id,
      stopReason: result?.stopReason || "exhausted",
    });
  }
  return { result, frontier: projectFrontier(log.facts()) };
}

export function projectFrontier(facts = []) {
  const continuations = {};
  const choicePointsById = new Map();
  const allocationByContinuation = {};
  const execution = {};
  const viabilityOverride = {};
  const resolvedBy = {};
  const branchResults = {};
  const convergedById = {};

  for (const fact of facts) {
    const payload = fact.payload || {};
    switch (fact.type) {
      case "continuation_registered": {
        const continuation = payload.continuation;
        if (!continuation?.id) break;
        continuations[continuation.id] = continuation;
        if (!execution[continuation.id]) {
          execution[continuation.id] = { count: 0, costUnits: 0, capabilityCalls: 0 };
        }
        break;
      }
      case "choice_point_opened": {
        choicePointsById.set(payload.id, {
          id: payload.id,
          mode: payload.mode,
          parentRef: payload.parentRef,
          branchRefs: [...(payload.branchRefs || [])],
        });
        for (const ref of payload.branchRefs || []) {
          if (allocationByContinuation[ref] === undefined) allocationByContinuation[ref] = "unfunded";
        }
        break;
      }
      case "allocation_decided": {
        for (const ref of payload.funded || []) allocationByContinuation[ref] = "funded";
        for (const ref of payload.unfunded || []) allocationByContinuation[ref] = "unfunded";
        break;
      }
      case "continuation_capsule_stored": {
        const ref = payload.continuationRef;
        if (ref && continuations[ref]) {
          continuations[ref] = {
            ...continuations[ref],
            capsulePath: payload.capsulePath || null,
            capsuleSha256: payload.capsuleSha256 || null,
          };
        }
        break;
      }
      case "branch_run": {
        const acc = execution[payload.continuationRef] || { count: 0, costUnits: 0, capabilityCalls: 0 };
        acc.count += 1;
        acc.costUnits += Number(payload.costUnits) || 0;
        acc.capabilityCalls += Number(payload.capabilityCalls) || 0;
        execution[payload.continuationRef] = acc;
        if (payload.capsulePath && continuations[payload.continuationRef]) {
          continuations[payload.continuationRef] = {
            ...continuations[payload.continuationRef],
            capsulePath: payload.capsulePath,
            capsuleSha256: payload.capsuleSha256 || null,
          };
        }
        break;
      }
      case "or_objective_satisfied": {
        resolvedBy[payload.choicePointId] = payload.by;
        const choicePoint = choicePointsById.get(payload.choicePointId);
        for (const ref of choicePoint?.branchRefs || []) {
          if (ref === payload.by) continue;
          // Exhausted residue (a branch that ran and failed) must not be
          // rewritten as obsolete (never needed). Both remain reconstructible.
          if (viabilityOverride[ref] !== "exhausted") viabilityOverride[ref] = "obsolete";
        }
        break;
      }
      case "and_branch_completed": {
        viabilityOverride[payload.continuationRef] = "satisfied";
        if (payload.answer !== undefined || payload.value !== undefined) {
          branchResults[payload.continuationRef] = payload.answer ?? payload.value;
        }
        break;
      }
      case "and_objective_converged": {
        convergedById[payload.choicePointId] = true;
        break;
      }
      case "branch_exhausted": {
        viabilityOverride[payload.continuationRef] = "exhausted";
        break;
      }
      default:
        break;
    }
  }

  return {
    protocol: F2A_FRONTIER_PROTOCOL,
    continuations,
    choicePoints: [...choicePointsById.values()].map((choicePoint) => {
      const isAnd = choicePoint.mode === CHOICE_POINT_MODE_AND;
      const branches = choicePoint.branchRefs.map((ref) => ({
        continuationRef: ref,
        readiness: "runnable",
        viability: viabilityOverride[ref] || "live",
        allocation: allocationByContinuation[ref] || "unfunded",
        executionCount: execution[ref]?.count || 0,
        costUnits: execution[ref]?.costUnits || 0,
        capabilityCalls: execution[ref]?.capabilityCalls || 0,
        capsulePath: continuations[ref]?.capsulePath || null,
        capsuleSha256: continuations[ref]?.capsuleSha256 || null,
        result: branchResults[ref] ?? null,
      }));

      const completedCount = branches.filter((b) => b.viability === "satisfied").length;
      const exhaustedCount = branches.filter((b) => b.viability === "exhausted").length;
      const allCompleted = branches.length > 0 && completedCount === branches.length;
      const isBlocked = isAnd && exhaustedCount > 0;

      let status = "open";
      if (isAnd) {
        if (convergedById[choicePoint.id] || allCompleted) status = "converged";
        else if (isBlocked) status = "blocked";
        else if (completedCount > 0) status = "in_progress";
      } else {
        if (resolvedBy[choicePoint.id]) status = "resolved";
        else if (branches.every((b) => b.viability === "exhausted")) status = "exhausted";
      }

      return {
        id: choicePoint.id,
        mode: choicePoint.mode,
        parentRef: choicePoint.parentRef,
        status,
        converged: isAnd ? Boolean(convergedById[choicePoint.id] || allCompleted) : false,
        resolvedBy: isAnd ? (allCompleted ? choicePoint.branchRefs : null) : (resolvedBy[choicePoint.id] || null),
        joinResults: isAnd ? branchResults : null,
        branches,
      };
    }),
  };
}

function locateBranch(frontier, continuationRef) {
  const id = String(continuationRef || "").trim();
  for (const choicePoint of frontier.choicePoints) {
    const branch = choicePoint.branches.find((item) => item.continuationRef === id);
    if (branch) {
      return {
        choicePoint,
        branch,
        continuation: frontier.continuations[id] || null,
      };
    }
  }
  return null;
}
