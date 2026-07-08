import { formatMessagesAsPrompt } from "../util.js";
import { buildChildEnv } from "../host-context.js";
import {
  createPlainTextParseState,
  parsePlainTextChunk,
  flushPlainText,
  isPlainTextComplete,
} from "./plain-text.js";

export const claudeAdapter = {
  id: "claude",
  models: ["claude-code"],
  defaultMode: "headless",

  async probe(ctx) {
    const { spawnResolved } = await import("../spawn-util.js");
    return new Promise(resolve => {
      const child = spawnResolved(
        { command: ctx.claudeCommand, args: ["--version"] },
        { env: buildChildEnv(ctx) },
      );
      let out = "";
      child.stdout.on("data", c => { out += c; });
      child.stderr.on("data", c => { out += c; });
      child.on("error", () => resolve({ ok: false, error: "spawn_failed" }));
      child.on("close", code => {
        resolve({
          ok: code === 0,
          version: out.trim().split("\n").pop() || null,
          output_format: ctx.claudeOutputFormat,
        });
      });
    });
  },

  formatTurn(messages) {
    return formatMessagesAsPrompt(messages);
  },

  buildHeadlessInvocation(turn, ctx) {
    const args = ["-p", turn.prompt];
    if (useClaudeStreamJson(turn, ctx)) {
      args.push("--output-format", "stream-json", "--verbose");
    }
    return {
      command: ctx.claudeCommand,
      args,
      cwd: turn.cwd,
      env: buildChildEnv(ctx),
      pty: false,
    };
  },

  createParseState(turn, ctx) {
    if (useClaudeStreamJson(turn, ctx)) {
      return { lineBuffer: "", done: false, mode: "stream-json" };
    }
    return { ...createPlainTextParseState(), mode: "plain" };
  },

  parseHeadlessChunk(chunk, state, ctx) {
    if (state.mode === "plain") {
      return parsePlainTextChunk(chunk, state);
    }
    state.lineBuffer += chunk.toString("utf8");
    const deltas = [];
    let idx;
    while ((idx = state.lineBuffer.indexOf("\n")) >= 0) {
      const line = state.lineBuffer.slice(0, idx).trim();
      state.lineBuffer = state.lineBuffer.slice(idx + 1);
      const parsed = parseClaudeStreamJsonLine(line, ctx);
      if (parsed) deltas.push(parsed);
      if (parsed?.complete) state.done = true;
    }
    return deltas;
  },

  flushHeadless(state, ctx) {
    if (state.mode === "plain") {
      return flushPlainText(state);
    }
    const line = state.lineBuffer.trim();
    if (!line) return state.done ? [] : [{ content: "", complete: true }];
    const parsed = parseClaudeStreamJsonLine(line, ctx);
    return parsed ? [parsed] : [];
  },

  isHeadlessComplete(exitCode, state) {
    if (state.mode === "stream-json" && state.done) return true;
    return isPlainTextComplete(exitCode);
  },

  buildReplInvocation(turn, ctx) {
    return {
      command: ctx.claudeCommand,
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
        { id: "claude-version", pattern: /Claude Code\s+[\d.]+/i, action: "continue", priority: 10 },
        { id: "claude-tool", pattern: /(?:^|\n).*(?:running|executing|tool).*$/im, action: "continue", priority: 20 },
        { id: "claude-ready", pattern: /(?:^|\n)(?:›|>)\s*$/m, action: "complete", priority: 30 },
      ],
      inactivityMs: 300,
      stripAnsi: true,
      tailWindowBytes: 65536,
    };
  },

  filterReplNoise(line) {
    const trimmed = String(line).trim();
    if (!trimmed) return null;
    if (/^Claude Code\s+[\d.]+/i.test(trimmed)) return null;
    if (/^(?:›|>)\s*$/.test(trimmed)) return null;
    if (/^(?:running|executing|tool)\b/i.test(trimmed)) return null;
    return `${trimmed}\n`;
  },
};

function useClaudeStreamJson(turn, ctx) {
  if (ctx.claudeOutputFormat === "plain") return false;
  return Boolean(turn.stream) || ctx.claudeOutputFormat === "stream-json";
}

function parseClaudeStreamJsonLine(line, ctx) {
  if (!line) return null;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return null;
  }
  if (event.type === "result") {
    return { content: "", complete: true };
  }
  if (event.type === "assistant" && Array.isArray(event.message?.content)) {
    for (const block of event.message.content) {
      if (block.type === "text" && block.text) {
        return { content: String(block.text), complete: false };
      }
      if (block.type === "thinking" && block.thinking && ctx.includeThoughts) {
        return { content: String(block.thinking), complete: false, thought: true };
      }
    }
  }
  return null;
}