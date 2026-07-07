import { spawn } from "node:child_process";
import { stripAnsi } from "./util.js";

export function runHeadlessTurn(adapter, turn, ctx, options = {}) {
  const onDelta = typeof options.onDelta === "function" ? options.onDelta : null;
  const spec = adapter.buildHeadlessInvocation(turn, ctx);
  const state = adapter.createParseState?.() || {};
  const parseCtx = ctx;

  return new Promise((resolve, reject) => {
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: spec.env || process.env,
      shell: process.platform === "win32" && !spec.command.includes(pathSep()),
      stdio: ["ignore", "pipe", "pipe"],
    });

    const deltas = [];
    let stderr = "";

    const emitDelta = delta => {
      const normalized = delta.content
        ? { ...delta, content: stripAnsi(delta.content) }
        : delta;
      deltas.push(normalized);
      if (onDelta) onDelta(normalized);
    };

    child.stdout.on("data", chunk => {
      for (const delta of adapter.parseHeadlessChunk(chunk, state, parseCtx)) {
        emitDelta(delta);
      }
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", err => reject(err));

    child.on("close", exitCode => {
      if (adapter.flushHeadless) {
        for (const delta of adapter.flushHeadless(state, parseCtx)) {
          emitDelta(delta);
        }
      }
      resolve({
        exitCode,
        stderr: stderr.trim(),
        state,
        deltas,
      });
    });
  });
}

function pathSep() {
  return process.platform === "win32" ? "\\" : "/";
}