#!/usr/bin/env node
/**
 * test-intent-navigator.js — Tests for Issue #108 (Intent-first Corpus Navigation)
 */

import assert from "node:assert/strict";
import { locateCorpusSubject, getCorpusSubjectStatus } from "./lib/intent-navigator.js";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";

// 1. Test Locate on Cogentiscope
const loc1 = await locateCorpusSubject({ subject: "Cogentiscope", intent: "read_definition" });
assert.ok(loc1.ok);
assert.ok(loc1.targets.length > 0);
assert.equal(loc1.targets[0].repo, "cogentia");
assert.match(loc1.targets[0].url, /github\.com\/JeanHuguesRobert\/cogentia/);

// 2. Test Locate on Possibilisme (implementation intent)
const loc2 = await locateCorpusSubject({ subject: "Possibilisme", intent: "find_implementation" });
assert.ok(loc2.ok);
assert.equal(loc2.targets[0].relation, "implements");
assert.equal(loc2.targets[0].repo, "barons-Mariani");

// 3. Test Subject Status on Inox
const status = await getCorpusSubjectStatus({ subject: "Inox" });
assert.ok(status.ok);
assert.equal(status.doctrine_status, "defined");
assert.ok(status.authoritative_targets.length > 0);

// 4. Test via MCP Core JSON-RPC
const core = createMcpCore({ COGENTIA_MCP_VIEW: "public" });
const mcpResp = await core.handleJsonRpc({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "cogentia_locate",
    arguments: {
      subject: "FractaVolta",
      intent: "read_definition",
    },
  },
});
assert.ok(!mcpResp.error);
assert.ok(mcpResp.result.content);

console.log(JSON.stringify({
  ok: true,
  test: "intent_navigator_issue_108",
  locate_tested: true,
  status_tested: true,
  mcp_tool_tested: true,
  completed: true,
}, null, 2));
