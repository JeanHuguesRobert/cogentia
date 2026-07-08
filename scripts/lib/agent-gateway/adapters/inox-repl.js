import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildChildEnv } from "../host-context.js";
import { createLineReplExpectConfig, writeReplInput, filterPromptLines } from "../session-entity.js";

const inoxReplFixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/agent-gateway-inox-repl.js",
);

function resolveInoxLaunch(ctx) {
  if (fs.existsSync(inoxReplFixture)) {
    return { command: process.execPath, args: [inoxReplFixture], cwd: process.cwd() };
  }
  if (ctx.inoxCommandArgs?.length) {
    return { command: ctx.inoxCommand, args: [...ctx.inoxCommandArgs] };
  }
  for (const root of ctx.repoRoots) {
    const launcher = path.join(root, "Inox", "bin", "inox.js");
    if (fs.existsSync(launcher)) {
      return { command: process.execPath, args: [launcher] };
    }
  }
  return { command: ctx.inoxCommand, args: [] };
}

export const inoxReplEntity = {
  id: "inox",
  models: ["inox-repl"],
  defaultMode: "repl",
  entityKind: "session",

  async probe(ctx) {
    const { spawnResolved } = await import("../spawn-util.js");
    const launch = resolveInoxLaunch(ctx);
    return new Promise(resolve => {
      const child = spawnResolved(
        { command: launch.command, args: [...launch.args, "--version"] },
        { env: buildChildEnv(ctx) },
      );
      let out = "";
      child.stdout.on("data", c => { out += c; });
      child.stderr.on("data", c => { out += c; });
      child.on("error", () => resolve({ ok: false, error: "spawn_failed" }));
      child.on("close", code => resolve({ ok: code === 0, version: out.trim().split("\n")[0] || null }));
    });
  },

  formatTurn(messages) {
    const last = messages.filter(m => m.role === "user").pop();
    return String(last?.content || "").trim();
  },

  buildHeadlessInvocation(turn, ctx) {
    const launch = resolveInoxLaunch(ctx);
    return {
      command: launch.command,
      args: [...launch.args, "-e", turn.prompt],
      cwd: turn.cwd,
      env: buildChildEnv(ctx),
      transport: "pipe",
    };
  },

  createParseState() {
    return { buffer: "" };
  },

  parseHeadlessChunk(chunk, state) {
    state.buffer += chunk.toString("utf8");
    return [];
  },

  flushHeadless(state) {
    const content = state.buffer.trim();
    return [{ content, complete: true }];
  },

  isHeadlessComplete(exitCode) {
    return exitCode === 0;
  },

  buildReplInvocation(turn, ctx) {
    const launch = resolveInoxLaunch(ctx);
    return {
      transport: "pipe",
      command: launch.command,
      args: launch.args,
      cwd: launch.cwd || turn.cwd,
      env: buildChildEnv(ctx),
    };
  },

  writeReplTurn(handle, turn) {
    writeReplInput(handle, turn.prompt);
  },

  getExpectConfig() {
    return createLineReplExpectConfig({
      readyPattern: /ok $/m,
      continuePatterns: [/Inox is starting/i, /cli-stdlib/i, /Mips to start REPL/i],
      inactivityMs: 500,
    });
  },

  filterReplNoise(line) {
    const filtered = filterPromptLines(line, ["ok"]);
    if (!filtered) return null;
    const trimmed = filtered.trim();
    if (/^Inox$/i.test(trimmed)) return null;
    if (/ms and .* Mips to start REPL/i.test(trimmed)) return null;
    return filtered;
  },

  signals: {
    interrupt: { bytes: "\x03" },
    eof: { bytes: "\x04" },
    terminate: { kill: "SIGTERM" },
  },
};