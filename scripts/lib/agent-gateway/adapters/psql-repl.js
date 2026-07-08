import { buildChildEnv } from "../host-context.js";
import { createLineReplExpectConfig, writeReplInput, filterPromptLines } from "../session-entity.js";
import { probeCommand, TOOL_SIGNALS, lastUserContent } from "../session-tool-base.js";

function psqlArgs(turn, ctx) {
  const fromMeta = turn.metadata?.tool_config?.psql_args;
  if (Array.isArray(fromMeta) && fromMeta.length) return fromMeta.map(String);
  const fromEnv = String(ctx.psqlArgsEnv || "").trim();
  if (fromEnv) return fromEnv.split(/\s+/).filter(Boolean);
  return ["-d", ctx.psqlDatabase];
}

export const psqlReplEntity = {
  id: "psql",
  models: ["psql-repl"],
  defaultMode: "repl",
  entityKind: "session",
  toolCategory: "database",

  probe(ctx) {
    return probeCommand(ctx.psqlCommand, ["--version"], ctx);
  },

  formatTurn: lastUserContent,

  buildHeadlessInvocation(turn, ctx) {
    return {
      transport: "pipe",
      command: ctx.psqlCommand,
      args: [...psqlArgs(turn, ctx), "-c", turn.prompt],
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
      command: ctx.psqlCommand,
      args: psqlArgs(turn, ctx),
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
      readyPattern: /(?:^|\n)[a-zA-Z0-9_]+=(?:#|=>) $/m,
      continuePatterns: [/Type "help" for help/i],
      inactivityMs: 400,
    });
  },

  filterReplNoise(line) {
    const filtered = filterPromptLines(line, []);
    if (!filtered) return null;
    const trimmed = filtered.trim();
    if (/^=#$/.test(trimmed) || /^=>$/.test(trimmed)) return null;
    if (/^Type "help"/i.test(trimmed)) return null;
    return filtered;
  },

  signals: TOOL_SIGNALS,
};