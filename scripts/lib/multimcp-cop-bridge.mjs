/**
 * Bind short MultiMCP programs to the already existing COP Tasks pilot.
 * The host supplies the real local source store and an effective dispatch
 * authority resolver. No separate task store, scheduler or registry.
 *
 * Internal bridge only; public MCP tool registration is a separate decision.
 */
import { createCopMcpTasksPilot } from "./mcp-tasks-cop-pilot.mjs";
import { createCopMcpTasksScheduledPilot } from "./mcp-tasks-cop-scheduler.mjs";

export const MULTIMCP_PROGRAM_TOOL = "multimcp_program_execute";

export function createMultiMcpCopBridge({
  runtime, store, primaryStoreId, ownerInstanceRef,
  authorizationForTask, listTaskIds, allowAnonymous = false,
  startDelayMs = 20,
} = {}) {
  if (!runtime || typeof runtime.execute !== "function")
    throw new TypeError("existing_multimcp_runtime_required");
  if (typeof authorizationForTask !== "function")
    throw new TypeError("verified_cop_dispatch_authority_resolver_required");
  const pilot = createCopMcpTasksPilot({
    store, primaryStoreId, ownerInstanceRef,
    toolName: MULTIMCP_PROGRAM_TOOL, allowAnonymous,
    handler: async (args, {taskId, auth}) => {
      if (!args || !["javascript", "alan"].includes(args.language) ||
        typeof args.code !== "string")
        throw new TypeError("invalid_multimcp_program");
      const result = await runtime.execute({
        language: args.language,
        code: args.code,
        inputs: args.inputs || {},
        timeoutMs: args.timeoutMs ?? 5_000,
        maxCalls: args.maxCalls ?? 32,
        // The verified dispatch identity is carried into each capability
        // check; a stored Packet owner is not by itself an authorization.
        context: { taskId, auth, ...(args.alanContext ?
          { alanContext: args.alanContext } : {}) },
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result, isError: false };
    },
  });
  const dispatch = createCopMcpTasksScheduledPilot({
    pilot, store, authorizationForTask, listTaskIds, startDelayMs,
  });
  return { pilot, ...dispatch };
}
