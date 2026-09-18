#!/usr/bin/env node
/** Integration entrypoint: Guide HTTP under COGENTIA_REASONING_LOOP_V2=true. */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const child = spawnSync(process.execPath, ["scripts/test-guide-http.js"], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(child.status, 0, child.stdout + child.stderr);
assert.match(child.stdout, /"guide_chat": true/);
console.log("ok - Guide runs through the Agent John V2 feature-flagged adapter");
