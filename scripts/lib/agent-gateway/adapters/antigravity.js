import { formatMessagesAsPrompt } from "../util.js";
import { buildChildEnv } from "../host-context.js";
import {
  createPlainTextParseState,
  parsePlainTextChunk,
  flushPlainText,
  isPlainTextComplete,
} from "./plain-text.js";

export const antigravityAdapter = {
  id: "antigravity",
  models: ["antigravity", "agy"],
  defaultMode: "headless",

  async probe(ctx) {
    const { spawnResolved } = await import("../spawn-util.js");
    return new Promise(resolve => {
      const child = spawnResolved(
        { command: ctx.agyCommand, args: ["help"] },
        { env: buildChildEnv(ctx) },
      );
      let out = "";
      child.stdout.on("data", c => { out += c; });
      child.stderr.on("data", c => { out += c; });
      child.on("error", () => resolve({ ok: false, error: "spawn_failed" }));
      child.on("close", code => {
        resolve({
          ok: code === 0,
          version: out.trim().split("\n")[0] || null,
          output_format: "plain",
        });
      });
    });
  },

  formatTurn(messages) {
    return formatMessagesAsPrompt(messages);
  },

  buildHeadlessInvocation(turn, ctx) {
    const args = ["--print", turn.prompt];
    if (ctx.agySkipPermissions) {
      args.unshift("--dangerously-skip-permissions");
    }
    return {
      command: ctx.agyCommand,
      args,
      cwd: turn.cwd,
      env: buildChildEnv(ctx),
      pty: false,
    };
  },

  createParseState(turn, ctx) {
    return createPlainTextParseState();
  },

  parseHeadlessChunk(chunk, state, ctx) {
    return parsePlainTextChunk(chunk, state);
  },

  flushHeadless(state, ctx) {
    return flushPlainText(state);
  },

  isHeadlessComplete(exitCode, state) {
    return isPlainTextComplete(exitCode);
  },

  buildReplInvocation(turn, ctx) {
    return {
      command: ctx.agyCommand,
      args: [],
      cwd: turn.cwd,
      env: buildChildEnv(ctx),
      pty: true,
    };
  },

  writeReplTurn(pty, turn) {
    pty.write(`${turn.prompt}\r`);
  },

  getExpectConfig() {
    return {
      rules: [
        { id: "agy-banner", pattern: /Antigravity/i, action: "continue", priority: 10 },
        { id: "agy-ready", pattern: /(?:^|\n)[›>❯]\s*$/m, action: "complete", priority: 30 },
      ],
      inactivityMs: 300,
      stripAnsi: true,
      tailWindowBytes: 65536,
    };
  },

  filterReplNoise(line) {
    const trimmed = String(line).trim();
    if (!trimmed) return null;
    if (/Antigravity/i.test(trimmed)) return null;
    if (/^(?:›|>|❯)\s*$/.test(trimmed)) return null;
    return `${trimmed}\n`;
  },
};
