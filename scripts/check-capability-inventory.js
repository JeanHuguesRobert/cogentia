import assert from "node:assert/strict";
import { createMcpCore, PROTOCOL_VERSION_MODERN, MCP_META } from "./lib/cogentia-mcp-core.js";
import {
  buildCapabilityInventory,
  assertCliMcpCoverage,
  CLI_COMMANDS,
} from "./lib/capability-inventory.js";

const inventory = buildCapabilityInventory();
assert.equal(inventory.ok, true);
assert.ok(inventory.mcp_tool_count >= 40, `expected many MCP tools, got ${inventory.mcp_tool_count}`);
assert.ok(inventory.skills.length >= 1);
assert.ok(inventory.patterns.length >= 1);
assert.ok(inventory.prompts.length >= 1);
assert.ok(inventory.mcp_resources.includes("cogentia://cli/catalog"));
assert.ok(inventory.mcp_resources.some((u) => u.startsWith("skill://cogentia/")));
assert.ok(inventory.mcp_resources.some((u) => u.includes("pattern/")));

const coverage = assertCliMcpCoverage(inventory);
assert.equal(coverage.ok, true, `CLI missing MCP projection: ${coverage.missing.join(", ")}`);
assert.ok(CLI_COMMANDS.some((c) => c.mcp_tool === "cogentia_grep"));

const core = createMcpCore({ COGENTIA_MCP_VIEW: "public" });

const discover = await core.handleJsonRpc({
  jsonrpc: "2.0",
  id: 1,
  method: "server/discover",
  params: { _meta: { [MCP_META.protocolVersion]: PROTOCOL_VERSION_MODERN } },
});
assert.ok(discover.result.capabilities.resources);
assert.ok(discover.result.capabilities.prompts);
assert.ok(discover.result.capabilities.completions);
assert.ok(discover.result.capabilities.extensions["io.modelcontextprotocol/skills"]);
assert.equal(discover.result.experimental.skills_delivery, "sep2640_and_tools_first");

const resources = await core.handleJsonRpc({
  jsonrpc: "2.0",
  id: 2,
  method: "resources/list",
  params: { _meta: { [MCP_META.protocolVersion]: PROTOCOL_VERSION_MODERN } },
});
assert.ok(resources.result.resources.length >= 5);
assert.equal(resources.result.ttlMs, 3_600_000);

const skillUri = resources.result.resources.find((r) => r.uri?.includes("continuation-handling/SKILL.md"));
assert.ok(skillUri, "skill resource missing");
const skillRead = await core.handleJsonRpc({
  jsonrpc: "2.0",
  id: 3,
  method: "resources/read",
  params: { uri: skillUri.uri, _meta: { [MCP_META.protocolVersion]: PROTOCOL_VERSION_MODERN } },
});
assert.ok(String(skillRead.result.contents?.[0]?.text || "").includes("continuation"));

const prompts = await core.handleJsonRpc({
  jsonrpc: "2.0",
  id: 4,
  method: "prompts/list",
  params: {},
});
assert.ok(prompts.result.prompts.some((p) => p.name === "continuation_user_prompt"));

const skillsList = await core.handleJsonRpc({
  jsonrpc: "2.0",
  id: 5,
  method: "skills/list",
  params: { _meta: { [MCP_META.protocolVersion]: PROTOCOL_VERSION_MODERN } },
});
assert.ok(skillsList.result.skills.length >= 1);
assert.ok(skillsList.result.skills[0].resources?.length >= 1);

const patterns = await core.callTool("cogentia_pattern_list");
assert.equal(patterns.ok, true);
assert.ok(patterns.count >= 1);
const one = await core.callTool("cogentia_pattern_get", { id: "capability-symmetry" });
assert.equal(one.ok, true);
assert.equal(one.pattern.slug, "capability-symmetry");

const catalog = await core.callTool("cogentia_cli_catalog");
assert.equal(catalog.ok, true);
assert.ok(catalog.mcp_tool_count >= 40);

const publicList = await core.handleJsonRpc({ jsonrpc: "2.0", id: 6, method: "tools/list", params: {} });
const names = publicList.result.tools.map((t) => t.name);
for (const name of ["cogentia_status", "cogentia_grep", "cogentia_pattern_list", "cogentia_docs_query", "cogentia_repos"]) {
  assert.ok(names.includes(name), `public tools/list missing ${name}`);
}
assert.ok(publicList.result.tools.every((t) => t.annotations && typeof t.annotations.readOnlyHint === "boolean"));

const complete = await core.handleJsonRpc({
  jsonrpc: "2.0",
  id: 7,
  method: "completion/complete",
  params: { ref: { type: "ref/prompt" }, argument: { name: "name", value: "cont" } },
});
assert.ok(complete.result.completion.values.some((v) => String(v).includes("continuation")));

console.log(JSON.stringify({
  ok: true,
  test: "capability_inventory_mcp_surface",
  mcp_tools: inventory.mcp_tool_count,
  skills: inventory.skills.length,
  patterns: inventory.patterns.length,
  resources: resources.result.resources.length,
  sep2640_skills: skillsList.result.skills.length,
}, null, 2));
