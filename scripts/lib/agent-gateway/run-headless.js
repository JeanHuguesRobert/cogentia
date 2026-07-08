import { spawnResolved } from "./spawn-util.js";
import { stripAnsi } from "./util.js";

export function runHeadlessTurn(adapter, turn, ctx, options = {}) {
  const onDelta = typeof options.onDelta === "function" ? options.onDelta : null;
  const trace = options.trace || null;
  const spec = adapter.buildHeadlessInvocation(turn, ctx);
  const state = adapter.createParseState?.(turn, ctx) ?? adapter.createParseState?.() ?? {};
  const parseCtx = ctx;
  const receivedAt = Date.now();
  let firstByteAt = null;

  return new Promise((resolve, reject) => {
    trace?.mark("child_spawn_start");
    const child = spawnResolved(spec, {
      cwd: spec.cwd,
      env: spec.env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    trace?.mark("child_spawned");

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
      if (firstByteAt == null) {
        firstByteAt = Date.now();
        trace?.mark("child_first_byte");
      }
      for (const delta of adapter.parseHeadlessChunk(chunk, state, parseCtx)) {
        emitDelta(delta);
      }
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", err => reject(err));

    child.on("close", exitCode => {
      trace?.mark("child_exit", { exit_code: exitCode });
      if (adapter.flushHeadless) {
        for (const delta of adapter.flushHeadless(state, parseCtx)) {
          emitDelta(delta);
        }
      }
      const completedAt = Date.now();
      resolve({
        exitCode,
        stderr: stderr.trim(),
        state,
        deltas,
        timing: {
          child_ms: completedAt - receivedAt,
          first_byte_ms: firstByteAt != null ? firstByteAt - receivedAt : null,
        },
      });
    });
  });
}

