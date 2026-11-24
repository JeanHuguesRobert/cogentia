/**
 * MultiMCP program composition, first local JS slice (#80 / #233).
 * Providers own their MCP catalogs and authority; no second registry.
 * This does not install an independent scheduler or durable work ledger.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseAlan } from "../../tools/alan-lang/grammar.js";
import { start as startAlan, resume as resumeAlan } from "../../tools/alan-lang/run-reference.js";

const PROVIDER = /^[a-z][a-z0-9_-]{0,50}$/;
const MAX_CODE = 16_384;
const MAX_CALLS = 32;

function method(name, params = {}) {
  return { jsonrpc: "2.0", id: 1, method: name, params };
}

function asJson(value) {
  return JSON.parse(JSON.stringify(value));
}

async function withinDeadline(promise, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error("program_deadline_exceeded");
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() =>
          reject(new Error("program_deadline_exceeded")), remaining);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function createMultiMcpProgramRuntime({ providers, authorizeCall } = {}) {
  if (!providers || typeof providers !== "object" ||
    Object.keys(providers).length === 0 ||
    Object.entries(providers).some(([name, core]) =>
      !PROVIDER.test(name) || !core || typeof core.handleJsonRpc !== "function"))
    throw new TypeError("MCP providers must have distinct valid names and handleJsonRpc");
  if (authorizeCall != null && typeof authorizeCall !== "function")
    throw new TypeError("authorizeCall must be a function");

  async function catalog() {
    const available = Object.create(null);
    for (const [provider, core] of Object.entries(providers)) {
      const response = await core.handleJsonRpc(method("tools/list"));
      if (response?.error || !Array.isArray(response?.result?.tools))
        throw new Error("mcp_catalog_unavailable:" + provider);
      // Inventory is not authorization. Keep every source-advertised tool
      // visible to search/describe, including ones that require a separately
      // governed effect. Admission is checked only at actual dispatch.
      const entries = response.result.tools.filter(tool =>
        typeof tool.name === "string" && tool.name.length > 0);
      const map = new Map();
      for (const tool of entries) {
        if (map.has(tool.name)) throw new Error("mcp_catalog_duplicate_tool:" + provider);
        map.set(tool.name, {
          provider, name: tool.name, description: tool.description || "",
          inputSchema: tool.inputSchema || { type: "object" },
          annotations: tool.annotations || {},
          executionClass: tool.annotations?.readOnlyHint === true
            ? "read_only" : "governed_effect",
        });
      }
      available[provider] = map;
    }
    return available;
  }

  async function search({ query = "", provider = null, limit = 30 } = {}) {
    if (typeof query !== "string" || !Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new TypeError("invalid_mcp_search_query");
    const snapshot = await catalog();
    const q = query.toLowerCase();
    return Object.entries(snapshot).flatMap(([id, entries]) =>
      provider && provider !== id ? [] :
        [...entries.values()].filter(item =>
          (item.name + " " + item.description).toLowerCase().includes(q))
    ).slice(0, limit).map(asJson);
  }

  async function describe({ provider, name } = {}) {
    if (!PROVIDER.test(String(provider || "")) ||
      typeof name !== "string" || !name)
      throw new TypeError("invalid_mcp_capability_reference");
    const snapshot = await catalog();
    const tool = snapshot[provider]?.get(name);
    if (!tool) throw new Error("mcp_capability_not_found");
    return asJson(tool);
  }

  async function execute({ language = "javascript", code, timeoutMs = 5_000,
    maxCalls = MAX_CALLS, context = null, inputs = {} } = {}) {
    if (!["javascript", "alan"].includes(language))
      throw new Error("language_executor_unavailable:" + language);
    if (typeof code !== "string" || !code.trim() || code.length > MAX_CODE)
      throw new TypeError("invalid_program_code");
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000 ||
        !Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > MAX_CALLS)
      throw new TypeError("invalid_program_budget");
    const snapshot = await catalog();

    if (language === "alan") {
      // Alan's interpreter produces caller-mediated suspensions rather than
      // invoking tools. The same local MCP catalogs and authority check apply.
      const program = parseAlan(code);
      let state = startAlan(program, {
        args: inputs,
        context: context?.alanContext || {},
        bounds: { maxSteps: 1000, maxStateBytes: 131072 },
      });
      let calls = 0;
      const deadline = Date.now() + timeoutMs;
      while (state.type === "alan.suspension") {
        if (Date.now() >= deadline) throw new Error("program_deadline_exceeded");
        if (calls >= maxCalls) throw new Error("tool_not_available_or_budget_exhausted");
        const capability = state.pending_call.capability;
        const dot = capability.indexOf(".");
        const provider = capability.slice(0, dot);
        const name = capability.slice(dot + 1);
        const tool = snapshot[provider]?.get(name);
        if (!tool || tool.executionClass !== "read_only" ||
            state.pending_call.policy?.effect !== "read_only")
          throw new Error("tool_not_available_or_budget_exhausted");
        if (authorizeCall && await withinDeadline(
          Promise.resolve(authorizeCall({
            provider, tool, context, args: state.pending_call.input,
          })), deadline) !== true)
          throw new Error("program_tool_authority_denied");
        if (Date.now() >= deadline) throw new Error("program_deadline_exceeded");
        calls++;
        const response = await withinDeadline(
          providers[provider].handleJsonRpc(
            method("tools/call", {
              name, arguments: state.pending_call.input,
            })
          ), deadline);
        if (response.error || response.result?.isError)
          throw new Error("mcp_tool_failed:" + provider + ":" + name);
        const result = response.result?.structuredContent ??
          response.result?.content?.[0]?.text ?? response.result;
        state = resumeAlan(program, state, {
          type: "alan.step_result",
          for_suspension: state.suspension_id,
          supplied_by: "caller",
          trace: { caller_mediated: true, direct_invocation_by_alan: false,
            execution_performed: true },
          value: { value: asJson(result ?? null) },
        });
      }
      if (state.type !== "alan.terminal")
        throw new Error(state.error?.code || "alan_execution_failed");
      return { language, value: asJson(state.result ?? null), calls };
    }

    const names = Object.fromEntries(Object.entries(snapshot)
      .map(([id, values]) => [id, [...values.values()]
        .filter(tool => tool.executionClass === "read_only")
        .map(tool => tool.name)]));
    const childScript = fileURLToPath(
      new URL("./multimcp-program-worker.mjs", import.meta.url));
    // Do not share credentials, filesystem, network or process spawning
    // with the code interpreter. The parent keeps full authority.
    // Linux bwrap creates a separate filesystem and network namespace.
    // The sandbox only sees node + shared libraries + its own source file.
    // No source repository, host configuration or network is mounted.
    const parts = childScript.split("/").slice(1);
    const parents = parts.slice(0, -1).map((_, i) =>
      "/" + parts.slice(0, i + 1).join("/"));
    const child = spawn("/usr/bin/bwrap", [
      "--unshare-all", "--die-with-parent",
      "--ro-bind", "/usr", "/usr",
      "--ro-bind", "/lib", "/lib",
      "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp",
      ...parents.flatMap(parent => ["--dir", parent]),
      "--ro-bind", childScript, childScript,
      "--chdir", "/tmp",
      "--",
      process.execPath,
      "--permission", "--allow-fs-read=" + childScript,
      "--max-old-space-size=64", childScript,
    ], {
      env: { PATH: "/usr/bin:/bin", LANG: "C" },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    });
    let remaining = maxCalls;
    const outcome = await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve(value);
      };
      const timer = setTimeout(() => finish(new Error("program_deadline_exceeded")),
        timeoutMs);
      child.on("message", async message => {
        if (message?.type === "finished") return finish(null, {
          language, value: asJson(message.value ?? null), calls: maxCalls - remaining,
        });
        if (message?.type === "failed") return finish(new Error(message.error));
        if (message?.type !== "invoke" || settled) return;
        const { provider, name, id } = message;
        const tool = snapshot[provider]?.get(name);
        if (!tool || tool.executionClass !== "read_only" || remaining <= 0) {
          if (child.connected) child.send({ type: "tool-result", id,
            error: "tool_not_available_or_budget_exhausted" });
          return;
        }
        remaining--;
        try {
          if (authorizeCall && await authorizeCall({ provider, tool, context,
            args: message.args }) !== true)
            throw new Error("program_tool_authority_denied");
          // Authorization may finish after the program deadline. It never
          // licenses a new provider dispatch after the child was terminated.
          if (settled) return;
          const response = await providers[provider].handleJsonRpc(
            method("tools/call", { name, arguments: message.args || {} }));
          if (response.error || response.result?.isError)
            throw new Error("mcp_tool_failed:" + provider + ":" + name);
          const result = response.result?.structuredContent ??
            response.result?.content?.[0]?.text ??
            response.result;
          if (child.connected && !settled) child.send({ type: "tool-result",
            id, value: asJson(result ?? null) });
        } catch (error) {
          if (child.connected && !settled) child.send({ type: "tool-result",
            id, error: String(error.message || error) });
        }
      });
      child.on("error", error => finish(error));
      child.on("exit", code => {
        if (!settled) finish(new Error("program_child_exited:" + code));
      });
      child.send({ type: "start", code, catalog: names,
        syncTimeoutMs: Math.min(1000, timeoutMs) });
    }).finally(() => {
      // Terminate the entire permission-restricted process, including code
      // with unresolved async work; no live sandbox state survives the call.
      child.kill("SIGKILL");
    });
    return outcome;
  }
  return { search, describe, execute };
}
