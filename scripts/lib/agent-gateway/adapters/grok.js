import { formatMessagesAsPrompt } from "../util.js";
import { buildChildEnv } from "../host-context.js";

export const grokAdapter = {
  id: "grok",
  models: ["grok-build"],
  defaultMode: "headless",

  async probe(ctx) {
    const { spawn } = await import("node:child_process");
    return new Promise(resolve => {
      const child = spawn(ctx.grokCommand, ["--version"], {
        env: buildChildEnv(ctx),
        shell: false,
      });
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