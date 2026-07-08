import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildChildEnv } from "../host-context.js";
import { createLineReplExpectConfig, writeReplInput, filterPromptLines } from "../session-entity.js";
import { probeCommand, TOOL_SIGNALS, lastUserContent } from "../session-tool-base.js";

const shellFixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/agent-gateway-shell-repl.js",
);

export const shellReplEntity = {
  id: "shell",
  models: ["shell-repl"],
  defaultMode: "repl",
  entityKind: "session",
  toolCategory: "shell",

  async probe(ctx) {
    if (ctx.shellMode === "native" && ctx.shellCommand) {
      const native = await probeCommand(
        ctx.shellCommand,
        ctx.platform === "windows" ? ["-NoLogo", "-Command", "1+1"] : ["-c", "echo ok"],
        ctx,
      );
      if (native?.ok) return { ...native, mode: "native" };
    }
    const base = await probeCommand(process.execPath, ["--version"], ctx);
    return { ...base, mode: "fixture" };
  },

  formatTurn: lastUserContent,

  buildHeadlessInvocation(turn, ctx) {
    const spec = buildShellLaunch(turn, ctx);
    return {
      transport: "pipe",
      command: spec.command,
      args: [...spec.args, "-c", turn.prompt],
      cwd: turn.cwd,
      env: spec.env,
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
    const spec = buildShellLaunch(turn, ctx);
    return {
      transport: "pipe",
      command: spec.command,
      args: spec.args,
      cwd: turn.cwd,
      env: spec.env,
      mergeStderrForExpect: true,
    };
  },

  writeReplTurn(handle, turn) {
    writeReplInput(handle, turn.prompt);
  },

  getExpectConfig() {
    return createLineReplExpectConfig({
      readyPattern: /tool\$ $/m,
      continuePatterns: [/tool-shell cwd=/],
      inactivityMs: 500,
    });
  },

  filterReplNoise(line) {
    return filterPromptLines(line, ["tool$", "tool-shell cwd="]);
  },

  signals: TOOL_SIGNALS,
};

function buildShellLaunch(turn, ctx) {
  const env = {
    ...buildChildEnv(ctx),
    AGENT_GATEWAY_TOOL_CWD: turn.cwd,
  };

  if (ctx.shellMode === "native" && ctx.shellCommand) {
    const args = ctx.platform === "windows"
      ? ["-NoLogo", "-NoProfile", "-i"]
      : ["--norc", "--noprofile", "-i"];
    if (ctx.platform !== "windows") {
      env.PS1 = "tool$ ";
    }
    return { command: ctx.shellCommand, args, env };
  }

  return {
    command: process.execPath,
    args: [shellFixture],
    env,
  };
}