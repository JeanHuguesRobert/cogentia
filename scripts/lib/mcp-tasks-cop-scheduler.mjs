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
import { packetTopicForMcpTask, mcpTaskIdFromPacketTopic } from "./mcp-tasks-cop-pilot.mjs";

const PROFILE = "cogentia.mcp-tasks-cop-pilot/v1";
const createdEvent = event => event.payload?.profile === PROFILE &&
  event.payload?.phase === "created";
const terminalPhases = new Set(["claimed", "completed", "failed", "cancelled"]);

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
    const history = store.listTopic(packetTopicForMcpTask(taskId));
    if (history.some(e => terminalPhases.has(e.payload?.phase)))
      return { scheduled: false, reason: "claimed_or_terminal_needs_reconciliation" };
    const created = history.find(createdEvent);
    if (!created) throw new Error("mcp_task_creation_missing");
    // A deferred COP continuation already owns its timer. Re-registering
    // the same id on tasks/update would replace its Map entry while leaving
    // the previous timeout pending in COPScheduler.
    if (jobs.jobs.has(taskId))
      return { scheduled: false, reason: "already_registered" };
    await jobs.schedule({
      jobId: taskId,
      type: "continuation",
      // Only use a real Packet reference when an upstream COP record has one.
      packetRef: created.payload.packetRef || null,
      topicId: packetTopicForMcpTask(taskId),
      resumeTo: "handler:mcp-tasks-cop-pilot",
      schedule: { type: "delay", delayMs: startDelayMs },
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
  };

  async function recover() {
    if (!started) throw new Error("tasks_dispatcher_not_started");
    const result = { scheduled: 0, unresolved: 0, waiting_input: 0, not_authorized: 0 };
    // The production composition supplies a local-source query for only
    // this profile. Never require a global replay of unrelated COP topics
    // just to recover one instance's work.
    const taskIds = typeof listTaskIds === "function"
      ? listTaskIds()
      : store.replay().filter(createdEvent).map(event =>
          mcpTaskIdFromPacketTopic(event.topic.id));
    for (const taskId of taskIds) {
      if (!taskId) continue;
      const existing = store.listTopic(packetTopicForMcpTask(taskId));
      if (existing.some(x => terminalPhases.has(x.payload?.phase))) {
        if (!existing.some(x => ["completed", "failed", "cancelled"].includes(x.payload?.phase))) {
          result.unresolved++;
          // A crash after acquiring work does not authorize a second effect.
          // Make that unresolved fact visible to MCP clients, durably.
          const receipt = pilot.recordReconciliationRequired(taskId);
          if (!receipt.ok) throw new Error("cannot_record_reconciliation_requirement");
        }
        continue;
      }
      const auth = await authorizationForTask?.(taskId);
      if (!auth) { result.not_authorized++; continue; }
      const scheduled = await schedule(taskId, auth);
      if (scheduled.scheduled) result.scheduled++;
      if (scheduled.reason === "waiting_input") result.waiting_input++;
    }
    return result;
  }

  const api = { adapter, start, stop, schedule, recover, bus, scheduler, jobs };
  return api;
}
