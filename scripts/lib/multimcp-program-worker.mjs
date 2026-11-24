/**
 * Short-lived JavaScript interpreter for the local MultiMCP prototype.
 * Separate worker event loop; host owns every tool invocation and authority.
 * This VM context is *not* a security boundary for hostile JavaScript.
 */
import { parentPort, workerData } from "node:worker_threads";
import vm from "node:vm";

const pending = new Map();
let nextId = 0;
parentPort.on("message", message => {
  if (message?.type !== "tool-result") return;
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(message.error));
  else entry.resolve(message.value);
});

function invoke(provider, name, args = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    parentPort.postMessage({ type: "invoke", id, provider, name, args });
  });
}

const tools = Object.create(null);
for (const [provider, names] of Object.entries(workerData.catalog)) {
  const exposed = Object.create(null);
  for (const name of names) {
    Object.defineProperty(exposed, name, {
      enumerable: true,
      value: args => invoke(provider, name, args),
    });
  }
  Object.freeze(exposed);
  Object.defineProperty(tools, provider, { enumerable: true, value: exposed });
}
Object.freeze(tools);
try {
  const context = vm.createContext({ tools }, {
    codeGeneration: { strings: false, wasm: false },
  });
  const script = new vm.Script(
    '(async () => { "use strict";\n' + workerData.code + '\n})()',
    { filename: "multimcp-user-program.js" },
  );
  const value = await script.runInContext(context, { timeout: workerData.syncTimeoutMs });
  parentPort.postMessage({ type: "finished", value });
} catch (error) {
  parentPort.postMessage({ type: "failed", error: String(error?.message || error) });
}
