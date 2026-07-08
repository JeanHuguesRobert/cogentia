const BUILTIN_SIGNALS = {
  interrupt: { bytes: "\x03", kill: "SIGINT" },
  eof: { bytes: "\x04" },
  terminate: { kill: "SIGTERM" },
  kill: { kill: "SIGKILL" },
};

export function listBuiltinSignals() {
  return Object.keys(BUILTIN_SIGNALS);
}

/**
 * Apply an out-of-band signal to a live REPL handle.
 * @param {import('./repl-handle.js').ReplHandle} handle
 * @param {{ signal?: string, bytes?: string, kill?: string }} payload
 * @param {object} [adapter]
 */
export function applySessionSignal(handle, payload = {}, adapter = null) {
  if (!handle) {
    throw Object.assign(new Error("repl_handle_missing"), { code: "session_no_handle" });
  }

  const signalName = String(payload.signal || "").trim();
  const adapterSignal = signalName && adapter?.signals?.[signalName];
  const builtin = signalName && BUILTIN_SIGNALS[signalName];

  const bytes = payload.bytes ?? adapterSignal?.bytes ?? builtin?.bytes ?? null;
  const kill = payload.kill ?? adapterSignal?.kill ?? builtin?.kill ?? null;

  if (signalName === "custom" && payload.bytes != null) {
    handle.write(String(payload.bytes));
    return { signal: "custom", bytes: String(payload.bytes) };
  }

  if (bytes != null) {
    handle.write(bytes);
  }
  if (kill) {
    handle.kill(kill);
  }

  if (!bytes && !kill && signalName !== "custom") {
    throw Object.assign(new Error(`unknown_signal: ${signalName || "(empty)"}`), {
      code: "signal_unknown",
      status: 400,
    });
  }

  return {
    signal: signalName || (kill ? "kill" : "custom"),
    bytes: bytes ?? undefined,
    kill: kill ?? undefined,
  };
}