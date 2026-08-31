/**
 * F2a: Choice Point + Continuation Frontier projection.
 *
 * Composability experiment only. Not a Cognitive Scheduler, not COP/Core,
 * not Closed(p,h,E). Frontier is a projection over an append-only fact list.
 * Allocation is explicit and separable. The inner executor is injected
 * (F1.2 governed harness in tests) and advances ONE funded continuation.
 */

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
        id: `evt-${facts.length + 1}`,
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
    closed: false,
    f2a_does_not_test_continuation_closure: true,
    closure: Object.freeze({
      verified: false,
      closed: false,
      f2a_does_not_test_closed: true,
      note: "possibility != materializability != authorization != funding != runnable-now",
    }),
  });
}

export function openOrChoicePoint(log, { id, parentRef, branches } = {}) {
  return openCompositeChoicePoint(log, { id, parentRef, branches, mode: CHOICE_POINT_MODE_OR });
}

export function openAndChoicePoint(log, { id, parentRef, branches, quorum = null } = {}) {
  return openCompositeChoicePoint(log, { id, parentRef, branches, mode: CHOICE_POINT_MODE_AND, quorum });
}

export function openCompositeChoicePoint(log, { id, parentRef, branches, mode = CHOICE_POINT_MODE_OR, quorum = null } = {}) {
  const choicePointId = String(id || "").trim();
  if (!choicePointId) throw new Error("choice point id is required");
  if (!Array.isArray(branches) || branches.length < 2) {
    throw new Error("choice point requires at least two branches");
  }
  if (![CHOICE_POINT_MODE_OR, CHOICE_POINT_MODE_AND].includes(mode)) throw new Error(`unsupported choice point mode: ${mode}`);
  const requiredBranches = quorum == null ? branches.length : Number(quorum);
  if (!Number.isInteger(requiredBranches) || requiredBranches < 1 || requiredBranches > branches.length) throw new Error("quorum must be within branch count");
  const branchRefs = [];
  for (const branch of branches) {
    const continuation = continuationShaped({ ...branch, parentRef });
    log.append("continuation_registered", { continuation });
    branchRefs.push(continuation.id);
  }
  log.append("choice_point_opened", {
    id: choicePointId,
    mode,
    parentRef: parentRef || null,
    branchRefs,
    quorum: requiredBranches,
  });
  return projectFrontier(log.facts());
}

/** Publish a receipt once; it becomes immutable causal evidence, not copied branch state. */
export function publishVerifiedEvidence(log, { id, producerRef = null, receipt } = {}) {
  if (!receipt || typeof receipt !== "object") throw new Error("verified evidence receipt is required");
  const evidenceId = String(id || "").trim() || `evidence-${log.facts().length + 1}`;
  const fact = log.append("evidence_verified", { evidenceId, producerRef, receipt: Object.freeze({ ...receipt }) });
  return { evidenceId, eventId: fact.id };
}

/** Share evidence by causal reference. Recipients never receive a copied receipt. */
export function shareEvidence(log, { evidenceId, recipientRefs } = {}) {
  const frontier = projectFrontier(log.facts());
  const evidence = frontier.evidence[String(evidenceId || "")];
  if (!evidence) throw new Error(`unknown evidence: ${evidenceId}`);
  const recipients = Array.isArray(recipientRefs) ? recipientRefs.map(String) : [];
  if (!recipients.length || recipients.some((ref) => !frontier.continuations[ref])) throw new Error("known evidence recipients are required");
  return log.append("evidence_shared", { evidenceId: evidence.id, recipientRefs: recipients, parentEventIds: [evidence.eventId] });
}

/** Record a deterministic AND/quorum synthesis without erasing failed branch residue. */
export function joinChoicePoint(log, { choicePointId, synthesis = null, includeResidueRefs = [] } = {}) {
  const frontier = projectFrontier(log.facts());
  const choicePoint = frontier.choicePoints.find((item) => item.id === choicePointId);
  if (!choicePoint || choicePoint.mode !== CHOICE_POINT_MODE_AND) throw new Error("AND choice point is required");
  const succeeded = choicePoint.branches.filter((branch) => branch.lastRunOk === true);
  if (succeeded.length < choicePoint.quorum) throw new Error("AND/quorum convergence is not yet satisfied");
  const residueRefs = [...new Set(includeResidueRefs.map(String))].filter((ref) => choicePoint.branches.some((branch) => branch.continuationRef === ref));
  return log.append("join_completed", {
    choicePointId,
    succeededRefs: succeeded.map((branch) => branch.continuationRef),
    residueRefs,
    synthesis,
  });
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
  if (result?.ok && located.choicePoint.mode === CHOICE_POINT_MODE_OR) {
    log.append("or_objective_satisfied", {
      choicePointId: located.choicePoint.id,
      by: continuationRef,
    });
  } else {
    if (result?.ok) return { result, frontier: projectFrontier(log.facts()) };
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
  const evidence = {};
  const sharedEvidenceByContinuation = {};
  const joins = {};

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
          quorum: payload.quorum || (payload.branchRefs || []).length,
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
      case "branch_run": {
        const acc = execution[payload.continuationRef] || { count: 0, costUnits: 0, capabilityCalls: 0 };
        acc.count += 1;
        acc.costUnits += Number(payload.costUnits) || 0;
        acc.capabilityCalls += Number(payload.capabilityCalls) || 0;
        execution[payload.continuationRef] = acc;
        acc.lastRunOk = payload.ok === true;
        break;
      }
      case "evidence_verified":
        evidence[payload.evidenceId] = { id: payload.evidenceId, eventId: fact.id, producerRef: payload.producerRef || null, receipt: payload.receipt };
        break;
      case "evidence_shared":
        for (const ref of payload.recipientRefs || []) {
          if (!sharedEvidenceByContinuation[ref]) sharedEvidenceByContinuation[ref] = [];
          sharedEvidenceByContinuation[ref].push({ evidenceId: payload.evidenceId, parentEventIds: [...(payload.parentEventIds || [])] });
        }
        break;
      case "join_completed":
        joins[payload.choicePointId] = { succeededRefs: [...(payload.succeededRefs || [])], residueRefs: [...(payload.residueRefs || [])], synthesis: payload.synthesis || null };
        break;
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
    evidence,
    choicePoints: [...choicePointsById.values()].map((choicePoint) => ({
      id: choicePoint.id,
      mode: choicePoint.mode,
      parentRef: choicePoint.parentRef,
      quorum: choicePoint.quorum,
      resolvedBy: resolvedBy[choicePoint.id] || null,
      convergence: joins[choicePoint.id] || null,
      branches: choicePoint.branchRefs.map((ref) => ({
        continuationRef: ref,
        readiness: "runnable",
        viability: viabilityOverride[ref] || "live",
        allocation: allocationByContinuation[ref] || "unfunded",
        executionCount: execution[ref]?.count || 0,
        costUnits: execution[ref]?.costUnits || 0,
        capabilityCalls: execution[ref]?.capabilityCalls || 0,
        lastRunOk: execution[ref]?.lastRunOk ?? null,
        sharedEvidence: sharedEvidenceByContinuation[ref] || [],
      })),
    })),
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
