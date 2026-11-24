/**
 * Optional MultiMCP MCP-tool surface over the existing Cogentia Core.
 * A host-owned, situated runtime supplies live provider descriptions.
 * No new capability registry and no independent Tasks service.
 */
import { isResolvedCallerAuth } from "./cogentia-mcp-auth.js";
import { MULTIMCP_PROGRAM_TOOL } from "./multimcp-cop-bridge.mjs";

const object = properties => ({
  type:"object", properties, additionalProperties:false,
});

export const MULTIMCP_SURFACE_TOOLS = Object.freeze([
  {
    name:"multimcp_search",
    description:"Search tools provided by MCP suppliers in the current local capability composition. No external catalog.",
    inputSchema:object({
      query:{type:"string"},
      provider:{type:"string"},
      limit:{type:"integer",minimum:1,maximum:100},
    }),
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
  },
  {
    name:"multimcp_describe",
    description:"Describe an exact source-owned MCP capability, with its live input schema.",
    inputSchema:{
      ...object({provider:{type:"string"},name:{type:"string"}}),
      required:["provider","name"],
    },
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
  },
  {
    name:MULTIMCP_PROGRAM_TOOL,
    description:"Execute a short JavaScript or Alan program under a durable COP Task, using only individually authorized read-only MCP tools.",
    inputSchema:{
      ...object({
        language:{type:"string",enum:["javascript","alan"]},
        code:{type:"string",minLength:1,maxLength:16384},
        inputs:{type:"object"},
        timeoutMs:{type:"integer",minimum:100,maximum:30000},
        maxCalls:{type:"integer",minimum:1,maximum:32},
      }),
      required:["language","code"],
    },
    annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
  },
]);

export function createMultiMcpMcpSurface({runtime} = {}) {
  if (!runtime || typeof runtime.search !== "function" ||
      typeof runtime.describe !== "function")
    throw new TypeError("situated_multimcp_runtime_required");
  return {
    tools:MULTIMCP_SURFACE_TOOLS,
    async call({name,args,auth}) {
      if (name === "multimcp_search") return runtime.search(args);
      if (name === "multimcp_describe") return runtime.describe(args);
      if (name === MULTIMCP_PROGRAM_TOOL)
        throw new Error("multimcp_program_requires_cop_task");
      throw new Error("unknown_multimcp_tool");
    },
    verifiedTaskCaller(auth) {
      return isResolvedCallerAuth(auth) &&
        auth.auth === "jhn" && auth.allowMutate === true &&
        auth.reason === "jhn_attested" &&
        auth.principal_ref === "principal:jhn";
    },
  };
}
