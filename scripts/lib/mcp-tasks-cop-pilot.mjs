/**
 * Pilot MCP 2026-07-28 Tasks -> existing COP event store.
 * No independent task database, scheduler, or production activation.
 * The canonical work remains the Cognitive Packet; taskId is an opaque handle.
 * This adapter deliberately requires an explicitly selected tool; the
 * COP scheduler may invoke its worker. Production activation remains opt-in.
 */
import { randomUUID } from "node:crypto";
import { createPacketWithInitialContinuation } from "../../../inseme/packages/cop-kernel/src/Cop-kerneltasks.js";
import {
  createFractalogActRecord, validateFractalogActRecord,
} from "../../../inseme/packages/cop-core/src/fractalog.js";

const profile = "cogentia.mcp-tasks-cop-pilot/v1";
const valid = x => x !== null && typeof x === "object" && !Array.isArray(x);
// One canonical work history, addressed by the packet. MCP taskId is only a
// reversible external handle, not a second mutable source ledger.
export function packetRefForMcpTask(id) {
  if (typeof id !== "string" || !/^task:[0-9a-f-]{36}$/.test(id))
    throw new TypeError("invalid_mcp_task_id");
  return "pkt-mcp-" + id.slice(5);
}
export function packetTopicForMcpTask(id) {
  return "packet:" + packetRefForMcpTask(id);
}
export function mcpTaskIdFromPacketTopic(value) {
  if (typeof value !== "string" || !/^packet:pkt-mcp-[0-9a-f-]{36}$/.test(value))
    throw new TypeError("invalid_mcp_packet_topic");
  return "task:" + value.slice("packet:pkt-mcp-".length);
}
const topic = packetTopicForMcpTask;
const unknown = () => Object.assign(new Error("unknown_task"), { code: "unknown_task" });

export function createCopMcpTasksPilot({
  store, toolName, handler, allowAnonymous = false,
  ownerInstanceRef = "instance:mcp-tasks-cop-pilot",
  primaryStoreId = null, verifyExternalResult = null,
} = {}) {
  if (!store || typeof store.append !== "function" ||
      typeof store.transaction !== "function" || typeof store.listTopic !== "function")
    throw new TypeError("COP event store required");
  if (typeof toolName !== "string" || !toolName || typeof handler !== "function")
    throw new TypeError("explicit pilot tool and handler required");
  if (typeof primaryStoreId !== "string" || !/^sqlite:[a-zA-Z0-9:._-]+$/.test(primaryStoreId))
    throw new TypeError("explicit local primaryStoreId required");
  if (verifyExternalResult !== null && typeof verifyExternalResult !== "function")
    throw new TypeError("trusted external result verifier required");

  function identity(auth) {
    if (auth?.auth === "jhn" && auth.actor) return "jhn:" + auth.actor;
    if (auth?.auth === "admin") return "admin:" + (auth.actor || "local");
    if (allowAnonymous && (!auth || auth.auth === "none")) return "anonymous:pilot";
    return null;
  }

  function history(taskId, auth) {
    if (typeof taskId !== "string" || !/^task:[0-9a-f-]{36}$/.test(taskId)) throw unknown();
    const events = store.listTopic(topic(taskId));
    const created = events.find(x => x.payload?.profile === profile && x.payload.phase === "created");
    if (!created || created.payload.owner !== identity(auth) ||
      created.payload.toolName !== toolName) throw unknown();
    return { events, created: created.payload };
  }

  function commit(taskId, phase, payload, idempotencyKey, writer = null) {
    // Resolve the causal predecessor *under the same per-locality write lock*.
    // Otherwise concurrent Task updates could persist stale parent references.
    if (!writer) {
      const outcome = store.transaction(tx =>
        commit(taskId, phase, payload, idempotencyKey, tx));
      if (!outcome.ok) throw new Error(outcome.error || "cop_event_commit_failed");
      return outcome.value;
    }
    const packetRef = packetRefForMcpTask(taskId);
    const current = writer.listTopic(topic(taskId));
    const previous = current.at(-1);
    // FractaLog source act remains packet-local, with causal links and a
    // document hash; the COP store hashes the local event chain per topic.
    const log = createFractalogActRecord({
      record_id: "fractalog:" + idempotencyKey,
      act_id: idempotencyKey,
      act_kind: "mcp.task." + phase,
      act_phase: phase === "failed" ? "failed" :
        phase === "cancel_requested" ? "attempt" : "observed",
      owner_instance_ref: ownerInstanceRef,
      trace: { packet_ref: packetRef, mcp_task_id: taskId,
        parent_event_ids: previous ? [previous.event_id] : [] },
      links: previous ? [{ ref: previous.event_id, relation: "caused_by" }] : [],
      effect: { phase },
    });
    const event = writer.append({
      topic_id: topic(taskId),
      event_type: "cop.event/v1",
      actor_id: "cop:mcp-tasks-pilot",
      subject_ref: packetRef,
      epistemic_status: "observed",
      idempotency_key: idempotencyKey,
      ...(previous ? { parent_event_ids: [previous.event_id] } : {}),
      payload: { profile, phase, packet_ref: packetRef,
        fractalog: log, ...payload },
    });
    if (!event.ok) throw new Error("cop_event_commit_failed");
    return event;
  }

  function project(taskId, auth) {
    const { events, created } = history(taskId, auth);
    const last = events.at(-1);
    const completed = events.find(x => x.payload?.phase === "completed");
    const failed = events.find(x => x.payload?.phase === "failed");
    const cancelled = events.find(x => x.payload?.phase === "cancelled");
    const input = events.findLast(x => x.payload?.phase === "input_required");
    const answered = events.findLast(x => x.payload?.phase === "input_received");
    const cancel = events.find(x => x.payload?.phase === "cancel_requested");
    const unresolved = events.find(x => x.payload?.phase === "reconciliation_required");
    const status = completed ? "completed" : failed ? "failed" : cancelled ? "cancelled" :
      input && (!answered || answered.topic.seq < input.topic.seq)
        ? "input_required" : "working";
    const result = {
      taskId, status, createdAt: created.createdAt,
      lastUpdatedAt: last?.time?.recorded_at || created.createdAt,
      ttlMs: 86_400_000, pollIntervalMs: 200,
      ...(unresolved && status === "working"
        ? { statusMessage: "outcome_unknown_reconciliation_required" }
        : cancel && status === "working"
          ? { statusMessage: "cancellation_requested" } : {}),
      ...(completed ? { result: completed.payload.result } : {}),
      ...(failed ? { error: failed.payload.error } : {}),
      ...(status === "input_required" ? { inputRequests: input.payload.inputRequests } : {}),
    };
    return result;
  }

  function auditPacket(taskId) {
    const events = store.listTopic(topic(taskId));
    const hasPacket = events.some(e =>
      e.payload?.profile === profile && e.payload?.phase === "created" &&
      e.payload?.toolName === toolName &&
      e.payload?.packet?.packet_id === packetRefForMcpTask(taskId) &&
      e.payload?.continuation?.packetRef === packetRefForMcpTask(taskId) &&
      e.payload?.packet?.placements?.length === 1 &&
      e.payload.packet.placements[0].is_primary === true &&
      e.payload.packet.placements[0].store_id === primaryStoreId &&
      e.payload.continuation.packetPlacementWitness?.[0]?.store_id === primaryStoreId);
    const failedFractaLog = events.filter(e =>
      e.payload?.profile === profile &&
      (!e.payload.fractalog ||
        !validateFractalogActRecord(e.payload.fractalog).ok ||
        e.payload.fractalog.trace?.packet_ref !== packetRefForMcpTask(taskId)));
    const commitment = typeof store.auditTopicCommitment === "function"
      ? store.auditTopicCommitment(topic(taskId)) : null;
    return {
      ok: hasPacket && failedFractaLog.length === 0 && commitment?.ok === true,
      packetRef: packetRefForMcpTask(taskId),
      events: events.length, source_packet_present: hasPacket,
      fractalog_verified: failedFractaLog.length === 0,
      topic_commitment_verified: commitment?.ok === true,
    };
  }

  function recordReconciliationRequired(taskId) {
    const exists = store.listTopic(topic(taskId))
      .some(e => e.payload?.profile === profile && e.payload?.phase === "created");
    if (!exists) throw unknown();
    return commit(taskId, "reconciliation_required", {},
      "mcp-reconciliation-required:" + taskId);
  }

  const adapter = {
    durable: true,
    async shouldCreate({ name, auth }) {
      return name === toolName && identity(auth) !== null;
    },
    async create({ name, args = {}, auth }) {
      if (name !== toolName || identity(auth) === null) throw new Error("not_authorized");
      const taskId = "task:" + randomUUID();
      const createdAt = new Date().toISOString();
      const packetRef = packetRefForMcpTask(taskId);
      const { packet, continuation } = await createPacketWithInitialContinuation({
        packetId: packetRef,
        packetKind: "work",
        packetEnvelope: { createdAt, status: "pending",
          trace: { correlationId: taskId } },
        placements: [{
          store_id: primaryStoreId,
          store_kind: "sqlite",
          locator: primaryStoreId + "#" + packetRef,
          is_primary: true,
        }],
        resumeTo: "handler:mcp-tasks-cop-pilot",
        resumeIntent: "Deliver MCP Task result via COP",
        taskId, state: { toolName: name, args }, emit: false,
      });
      // Persist packet and its continuation atomically as the first source
      // event; all later acts are appended to this same packet's topic.
      commit(taskId, "created", { owner: identity(auth), toolName: name, args,
        createdAt, packetRef, packet, continuation },
      "mcp-created:" + taskId);
      return { taskId };
    },
    async get({ taskId, auth }) { return project(taskId, auth); },
    async update({ taskId, auth, inputResponses }) {
      const { events } = history(taskId, auth);
      if (!valid(inputResponses)) throw new TypeError("inputResponses required");
      if (events.some(x => ["completed", "failed"].includes(x.payload?.phase)))
        return { ok: true };
      const open = events.findLast(x => x.payload?.phase === "input_required");
      if (!open) throw new Error("no_pending_input_request");
      if (events.some(x => x.payload?.phase === "input_received" &&
        x.payload?.suspension_event_ref === open.event_id))
        return {ok:true};
      // MCP tasks/update from a client is not evidence that a governed
      // external effect occurred. Only a host-side verifier may release it.
      if (open.payload?.verified_external_result_required)
        throw new Error("trusted_cps_return_required");
      commit(taskId, "input_received", { inputResponses,
        suspension_event_ref: open.event_id },
      "mcp-input:" + taskId + ":" + open.event_id);
      return { ok: true };
    },
    async cancel({ taskId, auth }) {
      history(taskId, auth);
      commit(taskId, "cancel_requested", {}, "mcp-cancel:" + taskId);
      return { ok: true };
    },
  };

  // A verified external return is ingested ONLY through the host, after
  // checking the original CPS source. It must not be injected by MCP
  // tasks/update or by the program. The idempotency fence is packet-local.
  async function acceptVerifiedExternalResult(taskId, auth, candidate) {
    if (!verifyExternalResult) throw new Error("external_result_verifier_unconfigured");
    history(taskId, auth);
    const events = store.listTopic(topic(taskId));
    const open = events.findLast(x => x.payload?.phase === "input_required" &&
      x.payload?.verified_external_result_required === true);
    if (!open) throw new Error("verified_external_suspension_missing");
    if (events.some(x => x.payload?.phase === "input_received" &&
      x.payload?.suspension_event_ref === open.event_id))
      return {ok:true,duplicate:true};
    // The injected verifier must derive the result and receipt from the
    // canonical CPS source. Never trust candidate.result as a receipt.
    const verified = await verifyExternalResult({
      taskId, packetRef:packetRefForMcpTask(taskId), candidate,
      suspension:open.payload.checkpoint, pending:open.payload.pending,
    });
    if (verified?.verified !== true ||
      typeof verified.receipt_ref !== "string" || !verified.receipt_ref ||
      !valid(verified.value))
      throw new Error("verified_cps_result_required");
    const saved = store.transaction(tx => {
      const rows = tx.listTopic(topic(taskId));
      if (rows.some(x => x.payload?.phase === "input_received" &&
        x.payload?.suspension_event_ref === open.event_id))
        return "duplicate";
      if (rows.some(x => ["cancelled","failed","completed"].includes(x.payload?.phase)))
        throw new Error("task_already_terminal");
      const latest = rows.findLast(x => x.payload?.phase === "input_required");
      if (latest?.event_id !== open.event_id)
        throw new Error("suspension_changed");
      return commit(taskId,"input_received",{
        inputResponses:verified.value,
        suspension_event_ref:open.event_id,
        external_receipt_ref:verified.receipt_ref,
        verified_external_result:true,
      },"mcp-verified-input:"+taskId+":"+open.event_id,tx);
    });
    if (!saved.ok)throw new Error("verified_external_result_commit_failed");
    return {ok:true,duplicate:saved.value==="duplicate"};
  }

  // Pilot worker: claims each continuation stage once. Never blindly
  // rerun a stage whose effect result is uncertain after a crash.
  async function run(taskId, auth) {
    const { created, events } = history(taskId, auth);
    if (events.some(x => ["completed", "failed", "cancelled"].includes(x.payload?.phase)))
      return project(taskId, auth);
    const suspended = events.findLast(x => x.payload?.phase === "input_required");
    const answered = suspended && events.find(x =>
      x.payload?.phase === "input_received" &&
      x.payload?.suspension_event_ref === suspended.event_id);
    if (suspended && !answered) return project(taskId, auth);
    const claim = store.transaction(tx => {
      const rows = tx.listTopic(topic(taskId));
      const currentSuspension=rows.findLast(x=>x.payload?.phase==="input_required");
      const currentAnswer=currentSuspension && rows.find(x=>
        x.payload?.phase==="input_received" &&
        x.payload?.suspension_event_ref===currentSuspension.event_id);
      if (rows.some(x => ["completed","failed","cancelled"].includes(x.payload?.phase)))
        return "already_claimed";
      if (currentSuspension && !currentAnswer) return "waiting_input";
      const claimKey=currentAnswer
        ? "mcp-claimed-resume:"+taskId+":"+currentAnswer.event_id
        : "mcp-claimed:"+taskId;
      if (rows.some(x=>x.idempotency_key===claimKey)) return "already_claimed";
      if (!currentAnswer && rows.some(x=>x.payload?.phase==="claimed"))
        return "already_claimed";
      // A cancellation received before dispatch can be honored without
      // executing the handler. For a claimed job it stays an intent.
      if (rows.some(x => x.payload?.phase === "cancel_requested")) {
        const stopped = commit(taskId, "cancelled", {},
          "mcp-cancelled:" + taskId, tx);
        if (!stopped.ok) throw new Error("cannot_cancel");
        return "cancelled";
      }
      const ev = commit(taskId, "claimed", {
        ...(currentAnswer ? {resume_from_event:currentAnswer.event_id} : {}),
      }, claimKey, tx);
      if (!ev.ok) throw new Error("cannot_claim");
      return "claimed";
    });
    if (!claim.ok) throw new Error(claim.error);
    if (claim.value !== "claimed") return project(taskId, auth);
    try {
      // The effective caller was revalidated by the COP dispatcher before
      // this invocation. Pass its identity to adapters that enforce
      // program-level and per-capability permissions; old handlers can
      // ignore the additional contextual argument.
      const result = await handler(created.args, {taskId,auth,
        ...(answered ? {resume:{
          checkpoint:suspended.payload.checkpoint,
          pending:suspended.payload.pending,
          inputResponses:answered.payload.inputResponses,
          receipt_ref:answered.payload.external_receipt_ref||null,
          verified:answered.payload.verified_external_result===true,
        }} : {}),
      });
      if (result?.type === "cop.task.suspension/v1") {
        if (!valid(result.checkpoint)||!valid(result.pending))
          throw new Error("invalid_program_suspension");
        const stage=events.filter(x=>x.payload?.phase==="input_required").length;
        commit(taskId,"input_required",{
          inputRequests:{external_cps_result:{
            type:"text",prompt:"Await verified external CPS result",
          }},
          verified_external_result_required:true,
          checkpoint:result.checkpoint,
          pending:result.pending,
        },"mcp-input-required:"+taskId+":"+stage);
      } else {
        // A tool-level isError is a completed Task, not failed transport.
        commit(taskId, "completed", { result }, "mcp-completed:" + taskId);
      }
    } catch (error) {
      commit(taskId, "failed",
        { error: { code: -32603, message: error?.message || "worker_failed" } },
        "mcp-failed:" + taskId);
    }
    return project(taskId, auth);
  }

  // Testable native COP continuation: publish input_required without
  // granting any new capabilities or returning raw internal identifiers.
  async function requireInput(taskId, auth, inputRequests) {
    history(taskId, auth);
    if (!valid(inputRequests)) throw new TypeError("inputRequests required");
    commit(taskId, "input_required", { inputRequests }, "mcp-input-required:" + taskId);
    return project(taskId, auth);
  }

  return { toolName, adapter, run, requireInput,
    acceptVerifiedExternalResult, auditPacket, recordReconciliationRequired };
}
