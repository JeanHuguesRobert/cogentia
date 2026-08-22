/**
 * Scenario: skills inventory + get over dual-era MCP core (tools-first).
 */
import {
  createMcpCore,
  PROTOCOL_VERSION,
  PROTOCOL_VERSION_MODERN,
  MCP_META,
} from "../../../scripts/lib/cogentia-mcp-core.js";

export async function run() {
  const core = createMcpCore({
    COGENTIA_DAEMON_URL: process.env.COGENTIA_DAEMON_URL || "http://127.0.0.1:8790",
    COGENTIA_MCP_VIEW: "public",
  });

  const init = await core.handleJsonRpc({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "sandbox-skills-discover", version: "1" },
    },
  });

  const discover = await core.handleJsonRpc({
    jsonrpc: "2.0",
    id: 2,
    method: "server/discover",
    params: {
      _meta: { [MCP_META.protocolVersion]: PROTOCOL_VERSION_MODERN },
    },
  });

  const list = await core.callTool("cogentia_skill_list");
  const get = await core.callTool("cogentia_skill_get", {
    id: "continuation-handling",
    meta_only: true,
  });

  const experimental = discover.result?.experimental || discover.result?._meta?.experimental;

  const sepList = await core.handleJsonRpc({
    jsonrpc: "2.0",
    id: 3,
    method: "skills/list",
    params: { _meta: { [MCP_META.protocolVersion]: PROTOCOL_VERSION_MODERN } },
  });

  return {
    ok:
      init.result?.serverInfo?.name === "cogentia-mcp" &&
      list.ok === true &&
      list.count >= 1 &&
      get.ok === true &&
      get.skill?.slug === "continuation-handling" &&
      Boolean(discover.result?.capabilities?.extensions?.["io.modelcontextprotocol/skills"]) &&
      Array.isArray(sepList.result?.skills) &&
      sepList.result.skills.length >= 1,
    initialize_version: init.result?.protocolVersion,
    discover_has_experimental_skills: Boolean(experimental?.skills || experimental?.skills_count),
    sep2640_skill_count: sepList.result?.skills?.length || 0,
    skill_count: list.count,
    skill_ids: (list.skills || []).map((s) => s.id),
    note: "SEP-2640 skills/list plus tools-first skill_list/get; experimental, not a marketplace claim.",
  };
}
