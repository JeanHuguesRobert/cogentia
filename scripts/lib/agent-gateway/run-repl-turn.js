import { createExpectLoop, waitForReplReady } from "./expect-loop.js";
import { createReplHandle } from "./repl-handle.js";

let ptyModulePromise = null;

async function loadPty() {
  if (!ptyModulePromise) {
    ptyModulePromise = import("node-pty").then(mod => mod.default);
  }
  try {
    return await ptyModulePromise;
  } catch (error) {
    ptyModulePromise = null;
    throw Object.assign(new Error("node_pty_unavailable"), {
      code: "repl_unavailable",
      cause: error,
    });
  }
}

export async function spawnReplProcess(adapter, turn, ctx, session = null) {
  if (!adapter.buildReplInvocation) {
    throw Object.assign(new Error("adapter_repl_unsupported"), { code: "repl_unsupported" });
  }
  const spec = adapter.buildReplInvocation(turn, ctx);
  if (spec.transport === "pipe") {
    return createReplHandle(spec, session, loadPty);
  }
  return createReplHandle({ ...spec, transport: "pty" }, session, loadPty);
}

export async function runReplTurn(adapter, turn, ctx, registry, options = {}) {
  const onDelta = typeof options.onDelta === "function" ? options.onDelta : null;
  const sessionId = options.sessionId || null;
  const expectConfig = adapter.getExpectConfig?.(ctx);
  if (!expectConfig) {
    throw Object.assign(new Error("adapter_expect_config_missing"), { code: "repl_unsupported" });
  }
  if (!adapter.writeReplTurn) {
    throw Object.assign(new Error("adapter_write_repl_missing"), { code: "repl_unsupported" });
  }

  const trace = options.trace || null;
  trace?.mark("repl_acquire_start");
  const { session, sessionSpawned, sessionReused } = await registry.acquireSession({
    sessionId,
    adapter,
    model: options.model,
    turn,
    ctx,
    spawnRepl: shell => spawnReplProcess(adapter, turn, ctx, shell),
  });
  trace?.mark("repl_acquired", { session_spawned: sessionSpawned, session_reused: sessionReused });

  const replTiming = {
    session_spawned: sessionSpawned,
    session_reused: sessionReused,
    bootstrap_ms: 0,
    transport: session.handle?.transport || session.pty?.transport || "pty",
  };

  try {
    if (session.needsBootstrap) {
      const bootstrapStart = Date.now();
      if (expectConfig.bootstrapMode === "immediate") {
        session.needsBootstrap = false;
        replTiming.bootstrap_ms = 0;
        trace?.mark("repl_bootstrap_done", { mode: "immediate" });
      } else {
        await waitForReplReady({
          adapter,
          config: expectConfig,
          timeoutMs: ctx.replBootstrapTimeoutMs,
          getBuffer: () => session.buffer,
          onData(handler) {
            session.pendingWaiters = session.pendingWaiters || [];
            session.pendingWaiters.push(handler);
            return () => {
              session.pendingWaiters = session.pendingWaiters.filter(w => w !== handler);
            };
          },
        });
        session.needsBootstrap = false;
        replTiming.bootstrap_ms = Date.now() - bootstrapStart;
        trace?.mark("repl_bootstrap_done");
      }
    }

    const turnTimeoutMs = Number(ctx.replTurnTimeoutMs || 180_000);

    return await new Promise((resolve, reject) => {
      const turnTimer = setTimeout(() => {
        cleanup();
        registry.releaseSession(session.id);
        reject(Object.assign(new Error("repl_turn_timeout"), { code: "repl_turn_timeout", status: 504 }));
      }, turnTimeoutMs);

      const stderrChunks = [];

      const loop = createExpectLoop({
        adapter,
        config: expectConfig,
        turn,
        onDelta,
        onComplete(result) {
          clearTimeout(turnTimer);
          cleanup();
          registry.releaseSession(session.id);
          trace?.mark("repl_turn_complete", { reason: result.reason });
          resolve({
            sessionId: session.id,
            reason: result.reason,
            error: Boolean(result.error),
            exitCode: result.exitCode ?? null,
            deltas: loop.deltas,
            stderr: stderrChunks.join("").trim() || null,
            timing: replTiming,
          });
        },
        onError(err) {
          clearTimeout(turnTimer);
          cleanup();
          registry.releaseSession(session.id);
          reject(err);
        },
      });

      let exitDisposable = null;
      let stderrDisposable = null;

      function cleanup() {
        clearTimeout(turnTimer);
        loop.dispose();
        session.dataDisposable?.dispose?.();
        session.dataDisposable = null;
        stderrDisposable?.dispose?.();
        stderrDisposable = null;
        exitDisposable?.dispose?.();
        exitDisposable = null;
      }

      const handle = session.handle || session.pty;
      const onTurnData = data => loop.append(data);
      session.pendingWaiters = session.pendingWaiters || [];
      session.pendingWaiters.push(onTurnData);
      session.dataDisposable = {
        dispose() {
          session.pendingWaiters = session.pendingWaiters.filter(w => w !== onTurnData);
        },
      };

      stderrDisposable = handle.onStderr?.(data => {
        const text = data.toString("utf8");
        stderrChunks.push(text);
        onDelta?.({ stderr: text });
      });

      exitDisposable = handle.onExit(({ exitCode }) => {
        loop.onChildExit(exitCode);
        if (!loop.completed) {
          registry.destroySession(session.id);
        }
      });

      try {
        trace?.mark("repl_turn_sent");
        adapter.writeReplTurn(handle, turn);
        loop.signalSent();
      } catch (error) {
        cleanup();
        registry.releaseSession(session.id);
        reject(error);
      }
    });
  } catch (error) {
    if (session?.id) registry.releaseSession(session.id);
    throw error;
  }
}