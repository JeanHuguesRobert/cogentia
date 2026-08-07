#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const args of [["issues", "--help"], ["issues", "export", "--help"]]) {
  const env = { ...process.env };
  delete env.COGENTIA_REGISTRY;
  const result = spawnSync(process.execPath, ["scripts/cogentia.js", ...args], {
    cwd: root,
    env,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Issue commands:/);
  assert.match(result.stdout, /issues export \[repo\|all\]/);
  assert.doesNotMatch(result.stderr, /No \.cogentia\.json found/);
}

console.log(JSON.stringify({ ok: true, commands: 2 }, null, 2));
