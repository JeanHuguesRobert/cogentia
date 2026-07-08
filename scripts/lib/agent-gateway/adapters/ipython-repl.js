import { buildChildEnv } from "../host-context.js";
import { createLineReplExpectConfig, writeReplInput, filterPromptLines } from "../session-entity.js";
import { probeCommand, TOOL_SIGNALS, lastUserContent } from "../session-tool-base.js";

function launch(ctx) {
  if (ctx.ipythonArgsPrefix?.length) {
    return { command: ctx.ipythonCommand, prefix: [...ctx.ipythonArgsPrefix] };
  }
  return { command: ctx.ipythonCommand, prefix: [] };
}

export const ipythonReplEntity = {
  id: "ipython",
  models: ["ipython-repl"],
  defaultMode: "repl",
  entityKind: "session",
  toolCategory: "interpreter",

  probe(ctx) {
    const { command, prefix } = launch(ctx);
    return probeCommand(command, [...prefix, "--version"], ctx);
  },

  formatTurn: lastUserContent,

  buildHeadlessInvocation(turn, ctx) {
    const { command, prefix } = launch(ctx);
    return {
      transport: "pipe",
      command,
      args: [...prefix, "-c", turn.prompt],
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
    const { command, prefix } = launch(ctx);
    return {
      transport: "pipe",
      command,
      args: [...prefix],
      cwd: turn.cwd,
      env: buildChildEnv(ctx),
      mergeStderrForExpect: true,
    };
  },

  writeReplTurn(handle, turn) {
    writeReplInput(handle, turn.prompt);
  },

  getExpectConfig() {
    return createLineReplExpectConfig({
      readyPattern: /In \[[0-9]+]: $/m,
      continuePatterns: [/\.\.\.:\s*$/m],
      inactivityMs: 300,
    });
  },

  filterReplNoise(line) {
    const filtered = filterPromptLines(line, []);
    if (!filtered) return null;
    if (/^In \[[0-9]+\]:/.test(filtered.trim())) return null;
    if (/^\.\.\.:/.test(filtered.trim())) return null;
    return filtered;
  },

  signals: TOOL_SIGNALS,
};