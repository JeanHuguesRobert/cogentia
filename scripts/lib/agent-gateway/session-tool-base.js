import { buildChildEnv } from "./host-context.js";
import { createLineReplExpectConfig, writeReplInput, filterPromptLines } from "./session-entity.js";

export const TOOL_SIGNALS = {
  interrupt: { bytes: "\x03" },
  eof: { bytes: "\x04" },
  terminate: { kill: "SIGTERM" },
};

export function lastUserContent(messages) {
  const last = messages.filter(m => m.role === "user").pop();
  return String(last?.content || "").trim();
}

export async function probeCommand(command, args = [], ctx) {
  const { spawnResolved } = await import("./spawn-util.js");
  return new Promise(resolve => {
    const child = spawnResolved(
      { command, args },
      { env: buildChildEnv(ctx) },
    );
    let out = "";
    child.stdout.on("data", c => { out += c; });
    child.stderr.on("data", c => { out += c; });
    child.on("error", () => resolve({ ok: false, error: "spawn_failed" }));
    child.on("close", code => resolve({
      ok: code === 0,
      version: out.trim().split("\n")[0] || null,
    }));
  });
}

export function createInterpreterEntity({
  id,
  model,
  toolCategory,
  command,
  probeArgs = ["--version"],
  replArgs,
  headlessArgsFactory,
  readyPattern,
  continuePatterns = [],
  promptTokens = [],
  mergeStderrForExpect = false,
  inactivityMs = 250,
  bootstrapMode = "prompt",
}) {
  return {
    id,
    models: [model],
    defaultMode: "repl",
    entityKind: "session",
    toolCategory,

    probe(ctx) {
      return probeCommand(command(ctx), probeArgs, ctx);
    },

    formatTurn(messages) {
      return lastUserContent(messages);
    },

    buildHeadlessInvocation(turn, ctx) {
      return {
        transport: "pipe",
        command: command(ctx),
        args: headlessArgsFactory(turn, ctx),
        cwd: turn.cwd,
        env: buildChildEnv(ctx),
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
      return [{ content: state.buffer.trim(), complete: true }];
    },

    isHeadlessComplete(exitCode) {
      return exitCode === 0;
    },

    buildReplInvocation(turn, ctx) {
      return {
        transport: "pipe",
        command: command(ctx),
        args: replArgs(turn, ctx),
        cwd: turn.cwd,
        env: buildChildEnv(ctx),
        mergeStderrForExpect,
      };
    },

    writeReplTurn(handle, turn) {
      writeReplInput(handle, turn.prompt);
    },

    getExpectConfig() {
      return {
        ...createLineReplExpectConfig({
          readyPattern,
          continuePatterns,
          inactivityMs,
        }),
        bootstrapMode,
      };
    },

    filterReplNoise(line) {
      return filterPromptLines(line, promptTokens);
    },

    signals: TOOL_SIGNALS,
  };
}