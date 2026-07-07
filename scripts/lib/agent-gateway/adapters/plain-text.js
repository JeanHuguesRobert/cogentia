import { stripAnsi } from "../util.js";

export function createPlainTextParseState() {
  return { lineBuffer: "" };
}

export function parsePlainTextChunk(chunk, state) {
  state.lineBuffer += chunk.toString("utf8");
  const deltas = [];
  let idx;
  while ((idx = state.lineBuffer.indexOf("\n")) >= 0) {
    const line = stripAnsi(state.lineBuffer.slice(0, idx));
    state.lineBuffer = state.lineBuffer.slice(idx + 1);
    deltas.push({ content: `${line}\n`, complete: false });
  }
  return deltas;
}

export function flushPlainText(state) {
  const remaining = stripAnsi(state.lineBuffer);
  state.lineBuffer = "";
  return remaining
    ? [{ content: remaining, complete: false }]
    : [{ content: "", complete: true }];
}

export function isPlainTextComplete(exitCode) {
  return exitCode !== null;
}