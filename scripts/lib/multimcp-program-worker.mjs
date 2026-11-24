/**
 * Permission-restricted child interpreter for MultiMCP JavaScript.
 * Launched with Node's OS-backed process isolation and --permission:
 * no filesystem (other than this script), network, child processes, workers,
 * inspector or inherited secrets. Host performs every governed MCP call.
 *
 * vm is syntax/context separation, NOT the permission boundary: the
 * restricted child process and its minimal environment provide that boundary.
 */
import vm from "node:vm";

if (!process.send) throw new Error("multimcp_parent_ipc_required");

const pending = new Map();
let nextId = 0;
let running = false;

function plain(value) {
  // Cross the context and process boundary only through JSON data.
  const text = JSON.stringify(value);
  return text === undefined ? null : JSON.parse(text);
}

function invoke(provider, name, args = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    try {
      const supplied = plain(args);
      pending.set(id, {resolve, reject});
      process.send({type: "invoke", id, provider, name, args: supplied});
    } catch(error) {
      pending.delete(id);
      reject(error);
    }
  });
}

process.on("message", async message => {
  if (message?.type === "tool-result") {
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error));
    else entry.resolve(plain(message.value));
    return;
  }
  if (message?.type !== "start" || running) return;
  running = true;
  const tools = Object.create(null);
  for (const [provider, names] of Object.entries(message.catalog)) {
    const exposed = Object.create(null);
    for (const name of names) {
      Object.defineProperty(exposed, name, {
        enumerable: true, value: args => invoke(provider, name, args),
      });
    }
    Object.freeze(exposed);
    Object.defineProperty(tools, provider, {enumerable: true, value: exposed});
  }
  Object.freeze(tools);
  try {
    const context = vm.createContext({tools}, {
      codeGeneration: {strings: false, wasm: false},
    });
    const script = new vm.Script(
      '(async () => { "use strict";\n' + message.code + '\n})()',
      {filename: "multimcp-user-program.js"},
    );
    const value = await script.runInContext(context, {
      timeout: message.syncTimeoutMs,
    });
    process.send({type: "finished", value: plain(value)});
  } catch (error) {
    process.send({type: "failed", error: String(error?.message || error)});
  }
});

process.on("disconnect", () => process.exit(0));
