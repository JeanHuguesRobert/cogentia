#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { watchdogEnabled, restartAgentGateway } from "./lib/agent-gateway-watchdog.js";

assert.equal(watchdogEnabled({ AGENT_GATEWAY_WATCHDOG: "0" }), false);
assert.equal(watchdogEnabled({ AGENT_GATEWAY_WATCHDOG: "1" }), true);

const noop = process.platform === "win32" ? "cmd /c exit 0" : "true";
const result = await restartAgentGateway({
  env: {
    ...process.env,
    AGENT_GATEWAY_WATCHDOG: "1",
    AGENT_GATEWAY_WATCHDOG_RESTART_SCRIPT: noop,
  },
});
assert.equal(result.attempted, true);
assert.equal(result.ok, true);

const disabled = await restartAgentGateway({
  env: { AGENT_GATEWAY_WATCHDOG: "0" },
});
assert.equal(disabled.attempted, false);

const missing = await restartAgentGateway({
  env: {
    AGENT_GATEWAY_WATCHDOG: "1",
    AGENT_GATEWAY_WATCHDOG_RESTART_SCRIPT: path.join(os.tmpdir(), `missing-${Date.now()}.sh`),
  },
});
assert.equal(missing.attempted, true);
assert.equal(missing.ok, false);

console.log(JSON.stringify({ ok: true, watchdog: true }, null, 2));