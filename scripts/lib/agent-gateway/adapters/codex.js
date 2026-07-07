import { formatMessagesAsPrompt } from "../util.js";
import { buildChildEnv } from "../host-context.js";

export const codexAdapter = {
  id: "codex",
  models: ["codex"],
  defaultMode: "headless",

  async probe(ctx) {
    const { spawnResolved } = await import("../spawn-util.js");
    return new Promise(resolve => {
      const child = spawnResolved(
        { command: ctx.codexCommand, args: ["--version"] },
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
          output_format: "jsonl",
        });
      });
    });
  },

  formatTurn(messages) {
    return formatMessagesAsPrompt(messages);
  },

  buildHeadlessInvocation(turn, ctx) {
    const args = ["exec", "--json", "--skip-git-repo-check", turn.prompt];
    return {
      command: ctx.codexCommand,
      args,
      cwd: turn.cwd,
      env: buildChildEnv(ctx),
      pty: false,
    };
  },

  createParseState() {
    return { lineBuffer: "", done: false };
  },

  parseHeadlessChunk(chunk, state) {
    state.lineBuffer += chunk.toString("utf8");
    const deltas = [];
    let idx;
    while ((idx = state.lineBuffer.indexOf("\n")) >= 0) {
      const line = state.lineBuffer.slice(0, idx).trim();
      state.lineBuffer = state.lineBuffer.slice(idx + 1);
      const parsed = parseCodexJsonLine(line);
      if (parsed) deltas.push(parsed);
      if (parsed?.complete) state.done = true;
    }
    return deltas;
  },

  flushHeadless(state) {
    const line = state.lineBuffer.trim();
    if (!line) return state.done ? [] : [{ content: "", complete: true }];
    const parsed = parseCodexJsonLine(line);
    return parsed ? [parsed] : [];
  },

  isHeadlessComplete(exitCode, state) {
    if (state.done) return true;
    return exitCode !== null;
  },
};

function parseCodexJsonLine(line) {
  if (!line || !line.startsWith("{")) return null;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return null;
  }
  if (event.type === "turn.completed") {
    return { content: "", complete: true };
  }
  if (event.type === "item.completed" && event.item?.type === "agent_message" && event.item.text) {
    return { content: String(event.item.text), complete: false };
  }
  return null;
}