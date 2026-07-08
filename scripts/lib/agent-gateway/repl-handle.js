import { resolveSpawnSpec, spawnResolved } from "./spawn-util.js";

/**
 * @typedef {object} ReplHandle
 * @property {'pty'|'pipe'} transport
 * @property {(data: string) => void} write
 * @property {(signal?: string) => void} kill
 * @property {(cb: (data: string) => void) => { dispose: () => void }} onData
 * @property {(cb: (data: string) => void) => { dispose: () => void }} onStderr
 * @property {(cb: (detail: { exitCode: number|null }) => void) => { dispose: () => void }} onExit
 * @property {() => void} dispose
 */

export async function createReplHandle(spec, session, loadPty) {
  const transport = spec.transport || "pty";
  if (transport === "pipe") {
    return createPipeReplHandle(spec, session);
  }
  return createPtyReplHandle(spec, session, loadPty);
}

async function createPtyReplHandle(spec, session, loadPty) {
  const pty = await loadPty();
  const resolved = resolveSpawnSpec(spec);
  const ptyProcess = pty.spawn(resolved.command, resolved.args, {
    name: "xterm-color",
    cols: spec.cols ?? 120,
    rows: spec.rows ?? 30,
    cwd: spec.cwd,
    env: spec.env || process.env,
  });

  const dataHandlers = new Set();
  const stderrHandlers = new Set();
  const exitHandlers = new Set();

  ptyProcess.onData(data => {
    session.buffer += data;
    session.lastActivity = Date.now();
    for (const handler of dataHandlers) handler(data);
    session.pendingWaiters?.forEach(waiter => waiter(data));
  });

  return {
    transport: "pty",
    raw: ptyProcess,
    write(data) {
      ptyProcess.write(data);
    },
    kill(signal = "SIGTERM") {
      try {
        ptyProcess.kill(signal);
      } catch {}
    },
    onData(handler) {
      dataHandlers.add(handler);
      return {
        dispose() {
          dataHandlers.delete(handler);
        },
      };
    },
    onStderr(handler) {
      stderrHandlers.add(handler);
      return { dispose() {} };
    },
    onExit(handler) {
      const disposable = ptyProcess.onExit(({ exitCode }) => handler({ exitCode }));
      exitHandlers.add(handler);
      return {
        dispose() {
          disposable.dispose?.();
          exitHandlers.delete(handler);
        },
      };
    },
    dispose() {
      dataHandlers.clear();
      stderrHandlers.clear();
      exitHandlers.clear();
    },
  };
}

function createPipeReplHandle(spec, session) {
  const resolved = resolveSpawnSpec(spec);
  const child = spawnResolved(spec, {
    cwd: spec.cwd,
    env: spec.env || process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  const dataHandlers = new Set();
  const stderrHandlers = new Set();
  const exitHandlers = new Set();

  child.stdout.on("data", chunk => {
    const data = chunk.toString("utf8");
    session.buffer += data;
    session.lastActivity = Date.now();
    for (const handler of dataHandlers) handler(data);
    session.pendingWaiters?.forEach(waiter => waiter(data));
  });

  child.stderr.on("data", chunk => {
    const data = chunk.toString("utf8");
    session.stderrBuffer = (session.stderrBuffer || "") + data;
    session.lastActivity = Date.now();
    if (spec.mergeStderrForExpect) {
      session.buffer += data;
      for (const handler of dataHandlers) handler(data);
      session.pendingWaiters?.forEach(waiter => waiter(data));
    }
    for (const handler of stderrHandlers) handler(data);
  });

  child.on("close", exitCode => {
    for (const handler of exitHandlers) handler({ exitCode });
  });

  child.on("error", err => {
    for (const handler of exitHandlers) handler({ exitCode: 1, error: err });
  });

  return {
    transport: "pipe",
    raw: child,
    write(data) {
      child.stdin.write(data);
    },
    kill(signal = "SIGTERM") {
      try {
        child.kill(signal);
      } catch {}
    },
    onData(handler) {
      dataHandlers.add(handler);
      return {
        dispose() {
          dataHandlers.delete(handler);
        },
      };
    },
    onStderr(handler) {
      stderrHandlers.add(handler);
      return {
        dispose() {
          stderrHandlers.delete(handler);
        },
      };
    },
    onExit(handler) {
      exitHandlers.add(handler);
      return {
        dispose() {
          exitHandlers.delete(handler);
        },
      };
    },
    dispose() {
      dataHandlers.clear();
      stderrHandlers.clear();
      exitHandlers.clear();
    },
  };
}