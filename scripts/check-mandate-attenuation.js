#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compareMandateAttenuation } from "./lib/mandate-attenuation.js";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const passEx = JSON.parse(
  fs.readFileSync(path.join(root, "skills/mandate-attenuation-check/examples/pass-attenuate.json"), "utf8")
);
const failEx = JSON.parse(
  fs.readFileSync(path.join(root, "skills/mandate-attenuation-check/examples/fail-widen.json"), "utf8")
);

const pass = compareMandateAttenuation(passEx.parent, passEx.child);
assert.equal(pass.verdict, "PASS", JSON.stringify(pass.summary));
assert.equal(pass.ok, true);

const fail = compareMandateAttenuation(failEx.parent, failEx.child);
assert.equal(fail.verdict, "FAIL");
assert.equal(fail.ok, false);
assert.ok(fail.summary.fail >= 3);

const core = createMcpCore({
  COGENTIA_DAEMON_URL: "http://127.0.0.1:8790",
  COGENTIA_MCP_VIEW: "public",
});
const viaTool = await core.callTool("cogentia_mandate_attenuation_check", {
  parent: passEx.parent,
  child: passEx.child,
});
assert.equal(viaTool.verdict, "PASS");

const failTool = await core.callTool("cogentia_mandate_attenuation_check", {
  parent: failEx.parent,
  child: failEx.child,
});
assert.equal(failTool.verdict, "FAIL");

// MCP envelope path
const rpc = await core.handleJsonRpc({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "cogentia_mandate_attenuation_check",
    arguments: { parent: failEx.parent, child: failEx.child },
  },
});
assert.equal(rpc.result.structuredContent?.data?.verdict || rpc.result.structuredContent?.verdict, "FAIL");
// structuredContent is full envelope; data holds tool payload
const env = rpc.result.structuredContent;
assert.equal(env.tool, "cogentia_mandate_attenuation_check");
assert.equal(env.data.verdict, "FAIL");
assert.equal(env.skill_hint, "mandate-attenuation-check");

console.log(
  JSON.stringify(
    {
      ok: true,
      pass_summary: pass.summary,
      fail_summary: fail.summary,
      mcp_tool: true,
    },
    null,
    2
  )
);
