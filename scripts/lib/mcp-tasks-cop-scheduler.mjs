/**
 * MCP Tasks -> COP scheduling pilot.
 *
 * Uses the existing COPJobScheduler + COPScheduler; COP EventStore remains
 * authoritative. Rebuild pending work from existing events, never from the
 * scheduler's volatile Map. A claimed task is not blindly replayed.
 * Pilot-only: no production MCP HTTP activation or new authority.
 */
import { COPBus } from "../../../inseme/packages/cop-kernel/src/bus.js";
import { COPScheduler } from "../../../inseme/packages/cop-kernel/src/scheduler.js";
import { COPJobScheduler } from "../../../inseme/packages/cop-kernel/src/jobScheduler.js";
import { packetTopicForMcpTask, mcpTaskIdFromPacketTopic, temporalWorkEligibility } from "./mcp-tasks-cop-pilot.mjs";

const PROFILE = "cogentia.mcp-tasks-cop-pilot/v1";
const createdEvent = event => event.payload?.profile === PROFILE &&
  event.payload?.phase === "created";
const terminalPhases = new Set(["completed", "failed", "cancelled"]);
function stageEligibility(rows) {
  if (rows.some(x=>terminalPhases.has(x.payload?.phase))) return "terminal";
  const waiting=rows.findLast(x=>x.payload?.phase==="input_required");
  if (!waiting)
    return rows.some(x=>x.payload?.phase==="claimed")
      ? "claimed_or_uncertain" : "ready";
  const answer=rows.find(x=>x.payload?.phase==="input_received" &&
    x.payload?.suspension_event_ref===waiting.event_id);
  if (!answer) return "waiting_input";
  if (rows.some(x=>x.payload?.phase==="claimed" &&
      x.payload?.resume_from_event===answer.event_id))
    return "claimed_or_uncertain";
  return "ready";
}

export function createCopMcpTasksScheduledPilot({
  pilot, store, authorizationForTask = null,
  listTaskIds = null,
  startDelayMs = 20,
} = {}) {
  if (!pilot?.adapter || typeof pilot.run !== "function" ||
      typeof store?.replay !== "function")
    throw new TypeError("existing COP Tasks pilot and EventStore required");
  if (!Number.isSafeInteger(startDelayMs) || startDelayMs < 0)
    throw new TypeError("startDelayMs must be nonnegative");

  const bus = new COPBus({ name: "mcp-tasks-cop-pilot" });
  const scheduler = new COPScheduler(bus, {
    // COP admission, not the timer, determines eligibility to wake.
    // A suspended judgment must remain suspended until an input response.
    admissionResolver: async continuation => {
      const taskId = continuation?.meta?.jobId;
      if (!taskId) return { admitted: false, reason: "missing_task_id" };
      const auth = await authorizationForTask?.(taskId);
      if (!auth) return { admitted: false, reason: "no_verified_dispatch_authority" };
      try {
        const state = await pilot.adapter.get({ taskId, auth });
        const temporal=temporalWorkEligibility(state.temporal_window);
        if(temporal!=="ready")return {admitted:false,reason:temporal};
        if (state.status === "input_required")
          return { admitted: false, reason: "task_waiting_for_input" };
        if (["completed", "failed", "cancelled"].includes(state.status))
          return { admitted: false, reason: "task_terminal" };
        return true;
      } catch {
        return { admitted: false, reason: "task_not_authorized_or_missing" };
      }
    },
    handlerResolver: async resumeTo => {
      if (resumeTo !== "handler:mcp-tasks-cop-pilot")
        throw new Error("unknown_tasks_handler");
      return async ({ continuation }) => {
        const taskId = continuation?.meta?.jobId;
        if (!taskId) throw new Error("missing_task_id");
        // The trusted host supplies a principal/actor after its own
        // authentication. A stored packet's owner is not a credential.
        const auth = await authorizationForTask?.(taskId);
        if (!auth) throw new Error("mcp_task_dispatch_authority_unavailable");
        return pilot.run(taskId, auth);
      };
    },
  });
  const jobs = new COPJobScheduler({ scheduler, bus });
  const belongsToPilot = event => createdEvent(event) &&
    event.payload.toolName === pilot.toolName;
  let started = false;
  function start() {
    if (!started) {
      scheduler.start();
      started = true;
    }
    return api;
  }
  function stop() {
    scheduler.stop();
    started = false;
  }

  async function schedule(taskId, auth) {
    if (!started) throw new Error("tasks_dispatcher_not_started");
    const record = await pilot.adapter.get({ taskId, auth });
    if (["completed", "failed", "cancelled"].includes(record.status))
      return { scheduled: false, reason: "terminal" };
    if (record.status === "input_required")
      return { scheduled: false, reason: "waiting_input" };
    const temporal=temporalWorkEligibility(record.temporal_window);
    if(temporal==="temporal_review_required")
      return {scheduled:false,reason:temporal};
    const history = store.listTopic(packetTopicForMcpTask(taskId));
    if (stageEligibility(history) !== "ready")
      return { scheduled: false, reason: "claimed_or_terminal_needs_reconciliation" };
    const created = history.find(belongsToPilot);
    if (!created) throw new Error("mcp_task_creation_missing_or_foreign");
    // Scheduling identity is (Packet, resume stage), not just the opaque
    // Task id. A prior stage completed before a verified external result
    // arrived, so its in-memory scheduler projection must not mask the new
    // continuation. Still reject duplicate registration of the SAME stage.
    const stage = history.findLast(e =>
      e.payload?.phase === "input_received")?.event_id || "initial";
    const prior = jobs.jobs.get(taskId);
    if (prior?.sourceStage === stage)
      return { scheduled: false, reason: "already_registered" };
    if (prior) jobs.jobs.delete(taskId);
    await jobs.schedule({
      jobId: taskId,
      sourceStage: stage,
      type: "continuation",
      // Only use a real Packet reference when an upstream COP record has one.
      packetRef: created.payload.packetRef || null,
      topicId: packetTopicForMcpTask(taskId),
      resumeTo: "handler:mcp-tasks-cop-pilot",
      schedule: record.temporal_window
        ? {type:"once",resumeAfter:record.temporal_window.not_before}
        : { type: "delay", delayMs: startDelayMs },
    });
    return { scheduled: true };
  }

  // The MCP core receives this adapter, not the base pilot adapter.
  // The Task is durable *before* it is scheduled. If scheduling fails,
  // existing COP events support recovery without recreating the task.
  const adapter = {
    ...pilot.adapter,
    async create(context) {
      const receipt = await pilot.adapter.create(context);
      await schedule(receipt.taskId, context.auth);
      return receipt;
    },
    async update(context) {
      const receipt = await pilot.adapter.update(context);
      // The response is durably journaled before new dispatch eligibility.
      if (receipt.ok) await schedule(context.taskId, context.auth);
      return receipt;
    },
    async acceptVerifiedExternalResult(taskId,auth,candidate) {
      const receipt=await pilot.acceptVerifiedExternalResult(taskId,auth,candidate);
      if (receipt.ok && !receipt.duplicate)await schedule(taskId,auth);
      return receipt;
    },
  };

  async function recover() {
    if (!started) throw new Error("tasks_dispatcher_not_started");
    const result = { scheduled: 0, unresolved: 0, waiting_input: 0, not_authorized: 0 };
    // The production composition supplies a local-source query for only
    // this profile. Never require a global replay of unrelated COP topics
    // just to recover one instance's work.
    const taskIds = typeof listTaskIds === "function"
      ? listTaskIds()
      : store.replay().filter(belongsToPilot).map(event =>
          mcpTaskIdFromPacketTopic(event.topic.id));
    for (const taskId of taskIds) {
      if (!taskId) continue;
      const existing = store.listTopic(packetTopicForMcpTask(taskId));
      // A packet from a different MCP tool may share the same physical
      // journal and profile; it must not become this dispatcher's work.
      if (!existing.some(belongsToPilot)) continue;
      const eligibility=stageEligibility(existing);
      if (eligibility==="terminal")continue;
      if (eligibility==="waiting_input") {
        result.waiting_input++;
        continue;
      }
      if (eligibility==="claimed_or_uncertain") {
        result.unresolved++;
        // A crashed stage may already have dispatched an external effect.
        const receipt=pilot.recordReconciliationRequired(taskId);
        if (!receipt.ok) throw new Error("cannot_record_reconciliation_requirement");
        continue;
      }
      const auth = await authorizationForTask?.(taskId);
      if (!auth) { result.not_authorized++; continue; }
      const scheduled = await schedule(taskId, auth);
      if (scheduled.scheduled) result.scheduled++;
      if (scheduled.reason === "waiting_input") result.waiting_input++;
      if (scheduled.reason === "temporal_review_required")
        result.temporal_review_required=(result.temporal_review_required||0)+1;
    }
    return result;
  }

  const api = { adapter, start, stop, schedule, recover, bus, scheduler, jobs };
  return api;
}
