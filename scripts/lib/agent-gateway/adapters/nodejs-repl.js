import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildChildEnv } from "../host-context.js";
import { createLineReplExpectConfig, writeReplInput, filterPromptLines } from "../session-entity.js";

const nodeReplFixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/agent-gateway-nodejs-repl.js",
);

export const nodejsReplEntity = {
  id: "nodejs",
  models: ["nodejs-repl"],
  defaultMode: "repl",
  entityKind: "session",
  toolCategory: "interpreter",

  async probe(ctx) {
    const { spawnResolved } = await import("../spawn-util.js");
    return new Promise(resolve => {
      const child = spawnResolved(
        { command: ctx.nodejsCommand, args: ["--version"] },
        { env: buildChildEnv(ctx) },
      );
      let out = "";
      child.stdout.on("data", c => { out += c; });
      child.on("error", () => resolve({ ok: false, error: "spawn_failed" }));
      child.on("close", code => resolve({ ok: code === 0, version: out.trim() || null }));
    });
  },

  formatTurn(messages) {
    const last = messages.filter(m => m.role === "user").pop();
    return String(last?.content || "").trim();
  },

  buildHeadlessInvocation(turn, ctx) {
    return {
      command: ctx.nodejsCommand,
      args: ["-e", turn.prompt],
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
    return {
      transport: "pipe",
      command: ctx.nodejsCommand,
      args: [nodeReplFixture],
      cwd: turn.cwd,
      env: buildChildEnv(ctx),
    };
  },

  writeReplTurn(handle, turn) {
    writeReplInput(handle, turn.prompt);
  },

  getExpectConfig() {
    return createLineReplExpectConfig({
      readyPattern: /(?:^|\n)> $/m,
      continuePatterns: [/\.\.\. $/m],
      inactivityMs: 250,
    });
  },

  filterReplNoise(line) {
    return filterPromptLines(line, [">", "..."]);
  },

  signals: {
    interrupt: { bytes: "\x03" },
    eof: { bytes: "\x04" },
    terminate: { kill: "SIGTERM" },
  },
};