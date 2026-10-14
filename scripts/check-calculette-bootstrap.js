#!/usr/bin/env node
import assert from "node:assert/strict";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";
import { createCalculetteBootstrap } from "./lib/calculette-bootstrap.js";

const core = createMcpCore({ COGENTIA_MCP_VIEW: "public" });
assert.ok(core.tools.some(t => t.name === "cogentia_calculette_bootstrap"));
const packet = await core.callTool("cogentia_calculette_bootstrap", {});
assert.equal(packet.protocol, "cogentia.calculette_bootstrap/v1");
assert.equal(packet.status, "discovered_in_registry");
assert.equal(packet.entrypoint, "cogentia_exploration_dependencies");
assert.equal(packet.verification, "registry_only");
assert.deepEqual(packet.operations, ["upstream","downstream","impact"]);
assert.equal(packet.authorization.risk, "read_only");
assert.ok(packet.missing.includes("live deployment verification"));
const offline = createCalculetteBootstrap();
assert.equal(offline.entrypoint, null);
assert.equal(offline.status, "not_discovered");
console.log("ok - MCP cold bootstrap, discoverability, mandate boundary and no false deployment claim");
