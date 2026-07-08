#!/usr/bin/env node
/**
 * Capture Grok TUI PTY output and validate REPL expect patterns (spec §7.4.4).
 * Usage: node scripts/calibrate-grok-repl.js [--prompt "say OK"]
 */

import pty from "node-pty";
import { grokAdapter } from "./lib/agent-gateway/adapters/grok.js";
import { normalizePtyText } from "./lib/agent-gateway/util.js";
import { loadHostContext } from "./lib/agent-gateway/host-context.js";
import { resolveSpawnSpec } from "./lib/agent-gateway/spawn-util.js";

const prompt = process.argv.includes("--prompt")
  ? process.argv[process.argv.indexOf("--prompt") + 1]
  : "Reply with exactly: GROK_REPL_OK";

const ctx = loadHostContext();
const config = grokAdapter.getExpectConfig();
const readyRule = config.rules.find(r => r.id === "grok-ready");

let raw = "";
const spec = grokAdapter.buildReplInvocation({ cwd: process.cwd() }, ctx);
const resolved = resolveSpawnSpec(spec);
const shell = pty.spawn(resolved.command, resolved.args, {
  name: "xterm-color",
  cols: 120,
  rows: 30,
  cwd: process.cwd(),
  env: spec.env,
});

function tail() {
  return normalizePtyText(raw).slice(-config.tailWindowBytes);
}

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("bootstrap_timeout")), 60_000);
  shell.onData(data => {
    raw += data;
    if (readyRule.pattern.test(tail())) {
      clearTimeout(timer);
      resolve();
    }
  });
});

shell.write(`${prompt}\r`);

let assistantStarted = false;
const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("turn_timeout")), 120_000);
  let idleTimer = null;

  shell.onData(data => {
    raw += data;
    const norm = normalizePtyText(raw);
    const lines = norm.split("\n").slice(-8);
    for (const line of lines) {
      const filtered = grokAdapter.filterReplNoise?.(line);
      if (filtered && !assistantStarted) assistantStarted = true;
    }
    if (assistantStarted && readyRule.pattern.test(tail())) {
      clearTimeout(timer);
      clearTimeout(idleTimer);
      resolve({ reason: "grok-ready" });
      return;
    }
    clearTimeout(idleTimer);
    if (assistantStarted) {
      idleTimer = setTimeout(() => {
        clearTimeout(timer);
        resolve({ reason: "idle-timeout" });
      }, config.inactivityMs);
    }
  });
});

shell.kill();

const norm = normalizePtyText(raw);
const report = {
  ok: true,
  grok_version: (await grokAdapter.probe(ctx)).version,
  completion: result.reason,
  ready_pattern: readyRule.pattern.toString(),
  ready_matches_tail: readyRule.pattern.test(tail()),
  tail_preview: tail().slice(-400),
  rules: config.rules.map(r => ({
    id: r.id,
    matches: r.pattern.test(tail()),
  })),
};

console.log(JSON.stringify(report, null, 2));