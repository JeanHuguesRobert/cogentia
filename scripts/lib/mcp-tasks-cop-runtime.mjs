/**
 * Optional MCP 2026-07-28 Tasks -> COP production composition root.
 * Reuses Inseme's per-topic committed COP source log and its schedulers.
 * The older portable cop_events projection is not a FractaLog authority.
 * Never enables itself from a version string or creates a new SQLite store.
 */
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createSqliteCopEventStore } from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {
  ACTOR_META_KEY, PRINCIPAL_META_KEY, resolveCallerAuth, isResolvedCallerAuth,
} from "./cogentia-mcp-auth.js";
import {
  createCopMcpTasksPilot, packetTopicForMcpTask, mcpTaskIdFromPacketTopic,
} from "./mcp-tasks-cop-pilot.mjs";
import { createCopMcpTasksScheduledPilot } from "./mcp-tasks-cop-scheduler.mjs";

const PROFILE = "cogentia.mcp-tasks-cop-pilot/v1";
const TOOL = "cogentia_pattern_list";
const ENABLE = "COGENTIA_MCP_TASKS_COP_ENABLED";
const STORE_PATH = "COGENTIA_MCP_TASKS_COP_DATABASE";

function requireAuthorizedJhn(auth) {
  return isResolvedCallerAuth(auth) && auth?.auth === "jhn" &&
    auth.allowMutate === true && auth.reason === "jhn_attested" &&
    auth.principal_ref === "principal:jhn" && typeof auth.actor === "string";
}

/** An environment-only opt-in, with a real, pre-existing COP database. */
export function createMcpCopTasksRuntime(env = process.env, { coreAccessor } = {}) {
  if (String(env[ENABLE] || "") !== "1")
    return { enabled: false, extras: {}, async start() {}, close() {} };
  if (typeof coreAccessor !== "function")
    throw new TypeError("MCP Tasks requires the host's actual MCP core");
  const filename = String(env[STORE_PATH] || "").trim();
  if (!filename || !existsSync(filename))
    throw new Error("mcp_tasks_existing_cop_database_required");
  if (String(env.COGENTIA_MCP_JHN_MUTATE || "") !== "1" ||
      !String(env.COGENTIA_MCP_JHN_TOKEN || "").trim())
    throw new Error("mcp_tasks_existing_jhn_attestation_required");
  const ownerInstanceRef = String(env.COGENTIA_MCP_LOCAL_INSTANCE_REF || "").trim();
  if (!/^instance:[a-zA-Z0-9][a-zA-Z0-9:._-]{1,127}$/.test(ownerInstanceRef))
    throw new Error("mcp_tasks_local_instance_ref_required");
  const primaryStoreId = String(env.COGENTIA_MCP_LOCAL_STORE_ID || "").trim();
  if (!/^sqlite:[a-zA-Z0-9:._-]+$/.test(primaryStoreId))
    throw new Error("mcp_tasks_local_store_id_required");

  // Open read-only for schema verification: SQLite must not auto-create a
  // missing file or promote the older portable projection into authority.
  const preflight = new DatabaseSync(filename, { readOnly: true });
  try {
    const events = new Set(preflight.prepare("PRAGMA table_info(cop_events)")
      .all().map(row => row.name));
    const commitments = new Set(
      preflight.prepare("PRAGMA table_info(cop_topic_commitments)")
        .all().map(row => row.name));
    if (!["event_id", "topic", "seq", "envelope"].every(key => events.has(key)) ||
        !["topic", "seq", "head"].every(key => commitments.has(key)))
      throw new Error("mcp_tasks_local_fractalog_commitment_store_required");
  } finally { preflight.close(); }

  // Recover this locality only: the SQL query is a reconstructible
  // projection over the first Event of packet-local histories, not a second
  // authoritative ledger or a requirement to replay all unrelated topics.
  function listTaskIdsForRecovery() {
    const reader = new DatabaseSync(filename, { readOnly: true });
    try {
      return reader.prepare(
        // Discover by owned packet namespace, *not* by parsing the event:
        // a corrupted creation event must remain discoverable and fail audit.
        "SELECT DISTINCT topic FROM cop_events " +
        "WHERE topic LIKE 'packet:pkt-mcp-%' ORDER BY topic"
      ).all().map(row => mcpTaskIdFromPacketTopic(row.topic));
    } finally { reader.close(); }
  }

  const store = createSqliteCopEventStore(filename);
  try {
    const pilot = createCopMcpTasksPilot({
      store, toolName: TOOL,
      ownerInstanceRef, primaryStoreId,
      handler: async args => {
        const core = coreAccessor();
        if (!core || typeof core.callTool !== "function")
          throw new Error("mcp_tasks_core_unavailable");
        // The existing JHN bearer authenticates the requester; it is not
        // a COP MandateDeclaration. The only dispatch authority used here
        // is Cogentia's existing public, explicitly read-only tool contract.
        // Recheck it at dispatch, not only when the Task was created.
        const catalog = await core.handleJsonRpc({
          jsonrpc: "2.0", id: "mcp-cop-readonly-check",
          method: "tools/list", params: {},
        });
        const capability = catalog?.result?.tools?.find(tool => tool.name === TOOL);
        if (capability?.annotations?.readOnlyHint !== true)
          throw new Error("mcp_tasks_public_readonly_capability_unavailable");
        const data = await core.callTool(TOOL, args);
        return { content: [{ type: "text", text: JSON.stringify(data) }], isError: false };
      },
    });

    async function authorizationForTask(taskId) {
      const entry = store.listTopic(packetTopicForMcpTask(taskId))
        .find(event => event.payload?.profile === PROFILE &&
          event.payload?.phase === "created");
      if (!entry || entry.payload.toolName !== TOOL ||
          typeof entry.payload.owner !== "string" ||
          !entry.payload.owner.startsWith("jhn:")) return null;
      const actor = entry.payload.owner.slice("jhn:".length);
      // Fresh host-side identity attestation at dispatch; a stored owner
      // is NOT a credential, and the bearer does NOT grant COP authority.
      // Capability authorization comes from the public read-only catalog.
      const auth = resolveCallerAuth(env, {
        view: "public",
        headers: { "x-cogentia-jhn-token": env.COGENTIA_MCP_JHN_TOKEN },
        meta: {
          [ACTOR_META_KEY]: actor,
          [PRINCIPAL_META_KEY]: "principal:jhn",
        },
      });
      return requireAuthorizedJhn(auth) && auth.actor === actor ? auth : null;
    }

    // Only inspect packet-local source histories that this MCP runtime owns.
    // Their FractaLog documents and COP commitments both have to validate.
    for (const taskId of listTaskIdsForRecovery()) {
      const events = store.listTopic(packetTopicForMcpTask(taskId));
      const creation = events.find(event => event.payload?.phase === "created");
      // A shared COP source hosts distinct local Task families. A verified
      // program-family Packet must not be audited as a pattern-list Task;
      // unknown or corrupted creations remain subject to this audit.
      if (creation?.payload?.toolName === "multimcp_program_execute" &&
          String(env.COGENTIA_MCP_MULTIMCP_ENABLED || "") === "1")
        continue;
      if (!pilot.auditPacket(taskId).ok)
        throw new Error("mcp_tasks_local_commitments_invalid");
    }
    const dispatch = createCopMcpTasksScheduledPilot({
      pilot, store, authorizationForTask,
      listTaskIds: listTaskIdsForRecovery, startDelayMs: 35,
    });
    const adapter = {
      ...dispatch.adapter,
      async shouldCreate(context) {
        return requireAuthorizedJhn(context.auth) &&
          await dispatch.adapter.shouldCreate(context);
      },
      async create(context) {
        if (!requireAuthorizedJhn(context.auth))
          throw new Error("mcp_task_verified_caller_required");
        return dispatch.adapter.create(context);
      },
    };
    let started = false, closed = false;
    return {
      enabled: true,
      extras: { mcpTasksAdapter: adapter },
      async start() {
        if (closed) throw new Error("mcp_tasks_runtime_closed");
        if (started) return;
        dispatch.start();
        started = true;
        try {
          return await dispatch.recover();
        } catch (error) {
          dispatch.stop();
          started = false;
          throw error;
        }
      },
      close() {
        if (closed) return;
        dispatch.stop();
        store.close();
        closed = true;
      },
    };
  } catch (error) {
    store.close();
    throw error;
  }
}
