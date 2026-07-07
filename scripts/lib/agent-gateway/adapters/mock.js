import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatMessagesAsPrompt } from "../util.js";
import { grokAdapter } from "./grok.js";

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/agent-gateway-mock-headless.js",
);

/** Test-only adapter — streams NDJSON like grok streaming-json. */
export const mockAdapter = {
  id: "mock",
  models: ["mock-agent"],
  defaultMode: "headless",

  async probe() {
    return { ok: true, version: "mock-1" };
  },

  formatTurn(messages) {
    return formatMessagesAsPrompt(messages);
  },

  buildHeadlessInvocation(turn) {
    return {
      command: process.execPath,
      args: [fixturePath, turn.prompt],
      cwd: turn.cwd,
      env: process.env,
      pty: false,
    };
  },

  createParseState: grokAdapter.createParseState,
  parseHeadlessChunk(chunk, state, ctx) {
    return grokAdapter.parseHeadlessChunk(chunk, state, { ...ctx, grokOutputFormat: "streaming-json" });
  },
  flushHeadless: grokAdapter.flushHeadless,
  isHeadlessComplete: grokAdapter.isHeadlessComplete,
};