import assert from "node:assert/strict";
import {
  listAgentSkills,
  getAgentSkill,
  exportSkillAsMethodPackage,
} from "./lib/cogentia-agent-skills.js";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";

// Test 1: Direct function exportSkillAsMethodPackage
const pkg = exportSkillAsMethodPackage("continuation-handling");
assert.equal(pkg.ok, true);
assert.equal(pkg.schema, "cogentia.skill_method_package/v1");
assert.equal(pkg.id, "cogentia.continuation-handling");
assert.equal(pkg.effects, "prepare_only");
assert.ok(Array.isArray(pkg.sources));
assert.ok(pkg.sources.length >= 1);
assert.ok(pkg.instructions_markdown.includes("continuation"));

// Test 2: MCP tool invocation cogentia_skill_export
const core = createMcpCore();
const result = await core.handleJsonRpc({
  jsonrpc: "2.0",
  id: 101,
  method: "tools/call",
  params: {
    name: "cogentia_skill_export",
    arguments: { id: "corpus-evidence-retrieval" },
  },
});

assert.equal(result.result.isError, undefined);
const data = result.result.structuredContent.data;
assert.equal(data.ok, true);
assert.equal(data.schema, "cogentia.skill_method_package/v1");
assert.equal(data.id, "cogentia.corpus-evidence-retrieval");
assert.equal(data.effects, "read_only");

console.log(JSON.stringify({ ok: true, test: "agent-skills-export", id: data.id }));
