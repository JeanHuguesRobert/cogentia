import { formatMessagesAsPrompt } from "../util.js";
import { buildChildEnv } from "../host-context.js";

export const grokAdapter = {
  id: "grok",
  models: ["grok-build"],
  defaultMode: "headless",

  async probe(ctx) {
    const { spawnResolved } = await import("../spawn-util.js");
    return new Promise(resolve => {
      const child = spawnResolved(
        { command: ctx.grokCommand, args: ["--version"] },
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
          output_format: ctx.grokOutputFormat,
        });
      });
    });
  },

  formatTurn(messages) {
    return formatMessagesAsPrompt(messages);
  },

  buildHeadlessInvocation(turn, ctx) {
    const prompt = turn.prompt;
    const args = ["-p", prompt, "--output-format", ctx.grokOutputFormat];
    return {
      command: ctx.grokCommand,
      args,
      cwd: turn.cwd,
      env: buildChildEnv(ctx),
      pty: false,
    };
  },

  createParseState() {
    return { lineBuffer: "", done: false, plainBuffer: "" };
  },

  parseHeadlessChunk(chunk, state, ctx) {
    const text = chunk.toString("utf8");
    if (ctx.grokOutputFormat === "plain") {
      state.plainBuffer += text;
      return [];
    }
    state.lineBuffer += text;
    const deltas = [];
    let idx;
    while ((idx = state.lineBuffer.indexOf("\n")) >= 0) {
      const line = state.lineBuffer.slice(0, idx).trim();
      state.lineBuffer = state.lineBuffer.slice(idx + 1);
      const parsed = parseStreamingJsonLine(line, ctx);
      if (parsed) deltas.push(parsed);
      if (parsed?.complete) state.done = true;
    }
    return deltas;
  },

  flushHeadless(state, ctx) {
    if (ctx.grokOutputFormat === "plain") {
      const content = state.plainBuffer.trim();
      return content ? [{ content, complete: true }] : [{ content: "", complete: true }];
    }
    const line = state.lineBuffer.trim();
    if (!line) return [];
    const parsed = parseStreamingJsonLine(line, ctx);
    return parsed ? [parsed] : [];
  },

  isHeadlessComplete(exitCode, state) {
    if (state.done) return true;
    return exitCode !== null;
  },

  buildReplInvocation(turn, ctx) {
    return {
      command: ctx.grokCommand,
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
        { id: "grok-banner", pattern: /grok\s+[\d.]+/i, action: "continue", priority: 10 },
        { id: "grok-thinking", pattern: /(?:^|\n).*(?:thinking|working).*$/im, action: "continue", priority: 20 },
        { id: "grok-ready", pattern: /(?:^|\n)[›>❯]\s*$/m, action: "complete", priority: 30 },
      ],
      inactivityMs: 300,
      stripAnsi: true,
      tailWindowBytes: 65536,
    };
  },

  filterReplNoise(line) {
    const trimmed = String(line).trim();
    if (!trimmed) return null;
    if (/^grok\s+[\d.]+/i.test(trimmed)) return null;
    if (/^(?:›|>|❯)\s*$/.test(trimmed)) return null;
    if (/^(?:thinking|working)\b/i.test(trimmed)) return null;
    return `${trimmed}\n`;
  },
};

function parseStreamingJsonLine(line, ctx) {
  if (!line) return null;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return null;
  }
  if (event.type === "end") {
    return { content: "", complete: true };
  }
  if (event.type === "text" && event.data) {
    return { content: String(event.data), complete: false };
  }
  if (event.type === "thought" && event.data && ctx.includeThoughts) {
    return { content: String(event.data), complete: false, thought: true };
  }
  return null;
}