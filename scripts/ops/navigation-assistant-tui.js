#!/usr/bin/env node
/** Resident terminal UI for the local Brave navigation assistant. */

import fs from "node:fs/promises";
import process from "node:process";
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import vm from "node:vm";
import blessed from "blessed";
import { WebSocket, WebSocketServer } from "ws";
import packageJson from "../../package.json" with { type: "json" };
import { listTabs, readPageContext, selectTab, insertTextInTab, DEFAULT_CDP_ENDPOINT } from "./navigation-assistant.js";
import { tabSiteLabel, redactTab, showFullTabLocation } from "../lib/navigation-assistant/tab-location.js";
import { fileURLToPath } from "node:url";

const DRAFT_IN = "draft.txt";
const DRAFT_OUT = "draft_out.txt";
const EXTENSION_DIR = fileURLToPath(new URL("../../browser-extension", import.meta.url));

const REFRESH_MS = 1500;
const BRIDGE_PORT = Number(process.env.NAV_ASSIST_PORT || 8765);
const LOCAL_GATEWAY_URL = String(process.env.NAV_ASSIST_LOCAL_GATEWAY || `ws://127.0.0.1:${BRIDGE_PORT}/assistant`).trim();
const HOSTED_GATEWAY_URL = String(process.env.NAV_ASSIST_GATEWAY || "ws://fracta2:8776/assistant").trim();
const LOCAL_GATEWAY_WAIT_MS = Number(process.env.NAV_ASSIST_LOCAL_GATEWAY_WAIT_MS || 800);
// Deliberately in-memory: this is a live troubleshooting trace, not a
// persistence mechanism or a second source of truth.
const MAX_DIAGNOSTICS = 5000;
const BRIDGE_PROTOCOL_VERSION = 2;
const FACEBOOK_DEFAULT_SIGNATURE = "#suvranu";

function recordDiagnostic(state, level, code, message, details = undefined) {
  state.diagnosticSequence += 1;
  state.diagnostics.push({
    sequence: state.diagnosticSequence,
    at: new Date().toISOString(),
    level,
    code,
    message: String(message),
    ...(details === undefined ? {} : { details }),
  });
  if (state.diagnostics.length > MAX_DIAGNOSTICS) state.diagnostics.shift();
}

function codePreview(code) {
  return String(code).replace(/\s+/g, " ").slice(0, 240);
}

function eventSequence(state, limit = MAX_DIAGNOSTICS) {
  // Heartbeats prove liveness but add no behavioural signal.  Everything else
  // remains ordered by the same monotonic sequence number as the raw journal.
  return state.diagnostics
    .filter((entry) => entry.code !== "bridge.ping")
    .slice(-limit);
}

function recordingSequence(state) {
  const recording = state.recording || state.lastRecording;
  if (!recording) return eventSequence(state);
  return eventSequence(state).filter((event) => event.sequence >= recording.startSequence && (!recording.endSequence || event.sequence <= recording.endSequence));
}

function activeSocket(state) {
  if (state.bridgeFocus === "hosted") return state.hostedSocket;
  return state.localAssistantSocket || state.bridgeSocket;
}

function queueExtensionRpcOn(state, socket, method, params, kind, origin, id = crypto.randomUUID()) {
  state.rpcKinds.set(id, { kind, origin, method, requestedAt: Date.now(), codePreview: method === "page.evaluate" ? codePreview(params.code) : null });
  sendWebSocketText(socket, { jsonrpc: "2.0", id, method, params });
  recordDiagnostic(state, "info", "rpc-request", `${method} queued (${kind}).`, { id, origin, method, params: method === "page.evaluate" ? { code: codePreview(params.code) } : params });
  return id;
}

function queueExtensionRpc(state, method, params, kind, origin, id = crypto.randomUUID()) {
  return queueExtensionRpcOn(state, activeSocket(state), method, params, kind, origin, id);
}

function requestContextOn(state, socket, origin) {
  if (!socket) return;
  fs.readFile(new URL("../../browser-stdlib/navigation.js", import.meta.url), "utf8").then((source) => {
    queueExtensionRpcOn(state, socket, "page.evaluate", { code: contextProbeCode(source) }, "context", origin);
  }).catch((error) => recordDiagnostic(state, "error", "refresh-request", "Could not load browser stdlib.", { error: error.message, origin }));
}

function queuePageEvaluation(state, code, kind, origin, id = crypto.randomUUID()) {
  return queueExtensionRpc(state, "page.evaluate", { code }, kind, origin, id);
}

function invokeExtensionRpc(state, method, params, kind, origin) {
  if (!activeSocket(state)) return Promise.reject(new Error("extension bridge is not connected"));
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (!state.rpcWaiters.has(id)) return;
      state.rpcWaiters.delete(id);
      reject(new Error(`${method} timed out`));
    // Complex React editors can keep Chromium's Runtime.evaluate pending for
    // tens of seconds even for a local DOM read.  Keep the bridge responsive
    // while allowing one such round-trip to complete.
    }, 60_000);
    state.rpcWaiters.set(id, { resolve, reject, timeout });
    queueExtensionRpc(state, method, params, kind, origin, id);
  });
}

function evaluatePage(state, code, kind, origin) {
  return invokeExtensionRpc(state, "page.evaluate", { code }, kind, origin);
}

function assistantMemory(state) {
  return JSON.parse(JSON.stringify({
    bridge: state.bridgeConnected,
    extensionVersion: state.extensionVersion,
    extensionContext: state.extensionContext,
    lastEvaluation: state.lastEvaluation || null,
    recording: state.recording || state.lastRecording || null,
    diagnosticSequence: state.diagnosticSequence,
  }));
}

function jsonValue(value) {
  try { return JSON.parse(JSON.stringify(value)); }
  catch { return String(value); }
}

// Keep assistant-produced public prose plain and conventional. This is applied
// at outbound assistant surfaces; it never rewrites source material at rest.
function normalizeAssistantText(text) {
  return String(text).replaceAll("\u2014", "-");
}

function formatFacebookComment(text, signature = FACEBOOK_DEFAULT_SIGNATURE) {
  const normalized = normalizeAssistantText(text).trimEnd();
  const normalizedSignature = String(signature).trim();
  if (!normalizedSignature || normalized.endsWith(normalizedSignature)) return normalized;
  return `${normalized}\n\n${normalizedSignature}`;
}

function startAssistantScript(state, code) {
  const id = crypto.randomUUID();
  const run = { id, status: "running", startedAt: new Date().toISOString(), events: [], result: null, error: null };
  state.scriptRuns.set(id, run);
  while (state.scriptRuns.size > 100) state.scriptRuns.delete(state.scriptRuns.keys().next().value);
  const emit = (type, value = null) => {
    const event = { at: new Date().toISOString(), type, value: jsonValue(value) };
    run.events.push(event);
    recordDiagnostic(state, "info", "assistant-script-event", `Assistant script emitted ${type}.`, { runId: id, event });
  };
  const assistant = Object.freeze({
    memory: () => assistantMemory(state),
    emit,
    page: Object.freeze({
      evaluate: async (expression) => evaluatePage(state, String(expression), "script-page-evaluate", `assistant-script:${id}`),
      insertText: async (text) => invokeExtensionRpc(state, "page.insertText", { text: normalizeAssistantText(text) }, "script-page-insert-text", `assistant-script:${id}`),
      context: async () => {
        const source = await fs.readFile(new URL("../../browser-stdlib/navigation.js", import.meta.url), "utf8");
        return evaluatePage(state, contextProbeCode(source), "script-page-context", `assistant-script:${id}`);
      },
      facebookFeed: async () => {
        const [navigationSource, adapterSource] = await Promise.all([
          fs.readFile(new URL("../../browser-stdlib/navigation.js", import.meta.url), "utf8"),
          fs.readFile(new URL("../../browser-stdlib/adapters/facebook.js", import.meta.url), "utf8"),
        ]);
        return evaluatePage(state, `${navigationSource}\n${adapterSource}\nwindow.__cogentiaNavigationAssistant.adapters.facebook.visibleItems()`, "script-facebook-feed", `assistant-script:${id}`);
      },
      facebookPost: async (options = {}) => {
        const [navigationSource, adapterSource] = await Promise.all([
          fs.readFile(new URL("../../browser-stdlib/navigation.js", import.meta.url), "utf8"),
          fs.readFile(new URL("../../browser-stdlib/adapters/facebook.js", import.meta.url), "utf8"),
        ]);
        return evaluatePage(state, `${navigationSource}\n${adapterSource}\nwindow.__cogentiaNavigationAssistant.adapters.facebook.currentPost(${JSON.stringify(options)})`, "script-facebook-post", `assistant-script:${id}`);
      },
      facebookDiscussion: async (options = {}) => {
        const [navigationSource, adapterSource] = await Promise.all([
          fs.readFile(new URL("../../browser-stdlib/navigation.js", import.meta.url), "utf8"),
          fs.readFile(new URL("../../browser-stdlib/adapters/facebook.js", import.meta.url), "utf8"),
        ]);
        return evaluatePage(state, `${navigationSource}\n${adapterSource}\nwindow.__cogentiaNavigationAssistant.adapters.facebook.discussion(${JSON.stringify(options)})`, "script-facebook-discussion", `assistant-script:${id}`);
      },
      facebookInsertComment: async (text) => {
        const [navigationSource, adapterSource] = await Promise.all([
          fs.readFile(new URL("../../browser-stdlib/navigation.js", import.meta.url), "utf8"),
          fs.readFile(new URL("../../browser-stdlib/adapters/facebook.js", import.meta.url), "utf8"),
        ]);
        const outboundText = formatFacebookComment(text);
        return evaluatePage(state, `${navigationSource}\n${adapterSource}\nwindow.__cogentiaNavigationAssistant.adapters.facebook.insertComment(${JSON.stringify(outboundText)})`, "script-facebook-insert-comment", `assistant-script:${id}`);
      },
      facebookReplaceComment: async (text, expected = {}) => {
        const [navigationSource, adapterSource] = await Promise.all([
          fs.readFile(new URL("../../browser-stdlib/navigation.js", import.meta.url), "utf8"),
          fs.readFile(new URL("../../browser-stdlib/adapters/facebook.js", import.meta.url), "utf8"),
        ]);
        const outboundText = formatFacebookComment(text);
        return evaluatePage(state, `${navigationSource}\n${adapterSource}\nwindow.__cogentiaNavigationAssistant.adapters.facebook.replaceComment(${JSON.stringify(outboundText)}, ${JSON.stringify(expected)})`, "script-facebook-replace-comment", `assistant-script:${id}`);
      },
    }),
    tabs: Object.freeze({
      list: async () => invokeExtensionRpc(state, "tabs.list", {}, "script-tabs-list", `assistant-script:${id}`),
      activate: async (tabId) => invokeExtensionRpc(state, "tabs.activate", { tabId: Number(tabId) }, "script-tabs-activate", `assistant-script:${id}`),
      create: async (url, options = {}) => invokeExtensionRpc(state, "tabs.create", { url: String(url), active: options.active !== false }, "script-tabs-create", `assistant-script:${id}`),
      close: async (tabId) => invokeExtensionRpc(state, "tabs.close", { tabId: Number(tabId) }, "script-tabs-close", `assistant-script:${id}`),
    }),
    text: Object.freeze({ normalize: normalizeAssistantText, facebookComment: formatFacebookComment }),
    clipboard: Object.freeze({ read: readTextFromClipboard, write: (text) => copyTextToClipboard(normalizeAssistantText(text)) }),
    draft: Object.freeze({ read: () => fs.readFile(DRAFT_IN, "utf8") }),
  });
  recordDiagnostic(state, "info", "assistant-script-started", "Assistant JavaScript task started.", { runId: id, code: codePreview(code) });
  const context = vm.createContext({ assistant, JSON, console: Object.freeze({ log: (...values) => emit("console", values) }) });
  // runInContext may throw synchronously while compiling a submitted script.
  // Start inside a Promise turn so malformed task code becomes a recorded
  // `failed` run instead of terminating the resident daemon.
  Promise.resolve()
    .then(() => vm.runInContext(`(async () => { ${code}\n})()`, context, { timeout: 5_000 }))
    .then((result) => {
      run.status = "completed";
      run.result = jsonValue(result);
      run.completedAt = new Date().toISOString();
      recordDiagnostic(state, "info", "assistant-script-completed", "Assistant JavaScript task completed.", { runId: id, result: run.result });
    })
    .catch((error) => {
      run.status = "failed";
      run.error = { name: error.name, message: error.message, stack: error.stack };
      run.completedAt = new Date().toISOString();
      recordDiagnostic(state, "error", "assistant-script-failed", "Assistant JavaScript task failed.", { runId: id, error: run.error });
    });
  return run;
}

// CDP's exception summary is often just "Uncaught".  Keep a page-side catch
// around the diagnostic probe so that the rolling trace retains the actual
// message and stack even with an older extension.
function contextProbeCode(source) {
  return `(() => { try { ${source}\nwindow.__cogentiaNavigationAssistant.observe(); return window.__cogentiaNavigationAssistant.context(); } catch (error) { return { __cogentiaProbeError: { name: error?.name, message: error?.message, stack: error?.stack } }; } })()`;
}

function runClipboardCommand(command, args, { input = null } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: [input === null ? "ignore" : "pipe", "pipe", "pipe"],
      windowsHide: true,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || `${command} exited with ${code}`)));
    if (input !== null) child.stdin.end(input, "utf8");
  });
}

function copyTextToClipboard(text) {
  // Keep the payload on stdin: no draft content is interpolated into a shell
  // command.
  if (process.platform === "win32") {
    return runClipboardCommand("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; Set-Clipboard -Value ([Console]::In.ReadToEnd())",
    ], { input: text }).then(() => undefined);
  }
  if (process.env.WAYLAND_DISPLAY) {
    return runClipboardCommand("wl-copy", ["--foreground"], { input: text }).then(() => undefined);
  }
  return runClipboardCommand("xclip", ["-selection", "clipboard"], { input: text }).then(() => undefined);
}

function readTextFromClipboard() {
  if (process.platform === "win32") {
    return runClipboardCommand("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Get-Clipboard -Raw"]);
  }
  if (process.env.WAYLAND_DISPLAY) return runClipboardCommand("wl-paste", ["--no-newline"]);
  return runClipboardCommand("xclip", ["-selection", "clipboard", "-o"]);
}

function sendWebSocketText(socket, value) {
  if (socket?.readyState === 1) socket.send(JSON.stringify(value));
}

function sendRpcRequest(state, method, params) {
  const id = crypto.randomUUID();
  sendWebSocketText(activeSocket(state), { jsonrpc: "2.0", id, method, params });
  return id;
}

function ingestBridgeMessage(state, message, origin = "local") {
  const hosted = origin === "hosted";
  if (message.type === "gateway.hello") {
    if (hosted) {
      state.hostedGatewayUp = true;
      state.hostedExtensionConnected = Boolean(message.extensionConnected);
    } else {
      state.localGatewayUp = true;
      state.bridgeConnected = Boolean(message.extensionConnected);
    }
    recordDiagnostic(state, "info", message.type, "Gateway hello.", { origin, instance: message.instance, extensionConnected: message.extensionConnected });
    if (message.extensionConnected) {
      requestContextOn(state, hosted ? state.hostedSocket : state.localAssistantSocket, origin);
    }
    render(state);
    return;
  }
  if (message.type === "gateway.extensionConnected") {
    if (hosted) state.hostedExtensionConnected = true;
    else state.bridgeConnected = true;
    recordDiagnostic(state, "info", message.type, "Extension connected to gateway.", { origin, instance: message.instance });
    requestContextOn(state, hosted ? state.hostedSocket : state.localAssistantSocket, origin);
    render(state);
    return;
  }
  if (message.type === "gateway.extensionDisconnected") {
    if (hosted) {
      state.hostedExtensionConnected = false;
      state.hostedContext = null;
    } else {
      state.bridgeConnected = false;
      state.extensionContext = null;
    }
    recordDiagnostic(state, "info", message.type, "Extension disconnected from gateway.", { origin });
    render(state);
    return;
  }
  if (message.jsonrpc === "2.0" && message.method) {
    recordDiagnostic(state, "info", message.method, hosted ? "Hosted extension event." : "Extension event received.", message.params || {});
    if (message.method === "page.activeChanged") {
      const ctx = {
        title: message.params?.tab?.title,
        url: message.params?.tab?.url,
        tabId: message.params?.tab?.id,
        windowId: message.params?.tab?.windowId,
        tabStatus: message.params?.tab?.status,
        attached: message.params?.attached,
        currentAttachedTabId: message.params?.currentAttachedTabId,
        desiredTabId: message.params?.desiredTabId,
        activeElement: null,
      };
      if (hosted) state.hostedContext = ctx;
      else state.extensionContext = ctx;
    }
    if (message.method === "page.event" && message.params?.event?.context) {
      if (hosted) state.hostedContext = { ...state.hostedContext, ...message.params.event.context, tabId: message.params.tabId || state.hostedContext?.tabId };
      else state.extensionContext = { ...state.extensionContext, ...message.params.event.context, tabId: message.params.tabId || state.extensionContext?.tabId };
    }
    render(state);
  }
  if (message.jsonrpc === "2.0" && message.id !== undefined) {
    const failed = Boolean(message.error);
    const request = state.rpcKinds.get(message.id);
    state.lastEvaluation = { requestId: message.id, kind: request?.kind || "unknown", ok: !failed, result: message.result?.value ?? null, error: message.error?.message || null };
    if (request?.kind === "context" && !failed) {
      const probeError = message.result?.value?.__cogentiaProbeError;
      if (probeError) state.error = `Context probe failed: ${probeError.message || "unknown error"}`;
      else if (hosted) state.hostedContext = message.result?.value || null;
      else state.extensionContext = message.result?.value || null;
    }
    state.rpcKinds.delete(message.id);
    const waiter = state.rpcWaiters.get(message.id);
    if (waiter) {
      state.rpcWaiters.delete(message.id);
      clearTimeout(waiter.timeout);
      if (failed) waiter.reject(new Error(message.error?.message || "page evaluation failed"));
      else waiter.resolve(message.result);
    }
    if (state.error === "Insertion demandée…") state.error = failed ? `Insertion refusée : ${message.error.message}` : null;
    recordDiagnostic(state, failed ? "error" : "info", "rpc-result", failed ? message.error.message : "JSON-RPC request completed.", {
      id: message.id,
      kind: request?.kind || "unknown",
      origin: request?.origin || origin,
      elapsedMs: request ? Date.now() - request.requestedAt : null,
      request: request?.codePreview,
      tab: message.result?.tab,
      result: message.result?.value ?? null,
      error: message.error || null,
    });
    render(state);
  }
  if (message.channel === "control" && message.type === "browser.context.changed") {
    if (hosted) state.hostedContext = message;
    else state.extensionContext = message;
    render(state);
  }
  if (message.channel === "control" && message.type === "bridge.hello") {
    if (hosted) state.hostedExtensionVersion = message.extensionVersion || null;
    else state.extensionVersion = message.extensionVersion || null;
    recordDiagnostic(state, "info", "bridge-hello", `Extension ${message.extensionVersion || "unknown"} connected (${origin}, protocol ${message.protocolVersion || "?"}).`);
    render(state);
  }
  if (message.channel === "control" && message.type === "browser.diagnostic") {
    recordDiagnostic(state, message.level || "error", message.code || "extension", message.message || "Unknown extension diagnostic.");
    state.error = `${message.code}: ${message.message}`;
    render(state);
  }
  if (message.channel === "control" && message.type === "execute.result") {
    state.lastEvaluation = { requestId: message.requestId, ok: message.ok, result: message.value, error: message.error || null };
    if (state.error === "Insertion demandée…") state.error = message.ok && message.value?.ok !== false ? null : `Insertion refusée : ${message.value?.error || message.error || "résultat inconnu"}`;
    recordDiagnostic(state, "info", "evaluate-result", `Page evaluation completed (${message.requestId}).`);
    render(state);
  }
  if (message.channel === "control" && message.type === "browser.insert.result") {
    recordDiagnostic(state, message.ok ? "info" : "error", "insert-result", message.ok ? "Text inserted into the active field." : "Insertion failed.");
    state.error = message.ok ? null : "Insertion failed.";
    render(state);
  }
}

function startGatewayClient(state, url, origin) {
  if (!url || url === "off") return () => {};
  const socketKey = origin === "hosted" ? "hostedSocket" : "localAssistantSocket";
  let retry = 0;
  let timer = null;
  const connect = () => {
    if (state.closed) return;
    const socket = new WebSocket(url);
    socket.on("open", () => {
      retry = 0;
      state[socketKey] = socket;
      recordDiagnostic(state, "info", "gateway-connected", `Assistant connected to ${url}`, { origin });
      render(state);
    });
    socket.on("message", (data) => {
      try { ingestBridgeMessage(state, JSON.parse(data.toString()), origin); }
      catch (error) { recordDiagnostic(state, "error", "gateway-message", "Malformed gateway JSON.", { error: error.message, origin }); }
    });
    socket.on("close", () => {
      if (state[socketKey] === socket) {
        state[socketKey] = null;
        if (origin === "hosted") {
          state.hostedGatewayUp = false;
          state.hostedExtensionConnected = false;
        } else {
          state.localGatewayUp = false;
        }
        render(state);
      }
      if (state.closed) return;
      retry += 1;
      timer = setTimeout(connect, Math.min(30000, 1000 * (2 ** Math.min(retry, 5))));
    });
    socket.on("error", () => socket.close());
  };
  connect();
  return () => { clearTimeout(timer); state[socketKey]?.close(); };
}

function startBridge(state) {
  const server = http.createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ok: true, bridge: state.bridgeConnected, port: BRIDGE_PORT, diagnostics: state.diagnostics.length, firstSequence: state.diagnostics[0]?.sequence ?? null, lastSequence: state.diagnosticSequence }));
      return;
    }
    if (request.method === "GET" && request.url === "/version") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({
        assistant: packageJson.version,
        bridgeProtocol: BRIDGE_PROTOCOL_VERSION,
        extension: state.extensionVersion || null,
        bridge: state.bridgeConnected,
      }));
      return;
    }
    if (request.method === "GET" && request.url === "/state") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      const extensionContext = state.extensionContext
        ? { ...state.extensionContext, url: tabSiteLabel(state.extensionContext.url) }
        : state.extensionContext;
      response.end(JSON.stringify({
        bridge: state.bridgeConnected,
        target: redactTab(state.target),
        extensionContext,
        lastEvaluation: state.lastEvaluation || null,
        error: state.error,
        locationRedacted: !showFullTabLocation(),
      }));
      return;
    }
    if (request.method === "GET" && request.url?.startsWith("/diagnostics")) {
      const url = new URL(request.url, `http://127.0.0.1:${BRIDGE_PORT}`);
      const limit = Math.max(1, Math.min(MAX_DIAGNOSTICS, Number(url.searchParams.get("limit")) || 100));
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({
        capacity: MAX_DIAGNOSTICS,
        firstSequence: state.diagnostics[0]?.sequence ?? null,
        lastSequence: state.diagnosticSequence,
        diagnostics: state.diagnostics.slice(-limit),
      }));
      return;
    }
    if (request.method === "GET" && request.url?.startsWith("/event-sequence")) {
      const url = new URL(request.url, `http://127.0.0.1:${BRIDGE_PORT}`);
      const limit = Math.max(1, Math.min(MAX_DIAGNOSTICS, Number(url.searchParams.get("limit")) || MAX_DIAGNOSTICS));
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({
        schema: "cogentia.navigation.event-sequence/v1",
        capturedAt: new Date().toISOString(),
        capacity: MAX_DIAGNOSTICS,
        events: eventSequence(state, limit),
      }));
      return;
    }
    if (request.method === "GET" && request.url?.startsWith("/script-runs/")) {
      const id = request.url.slice("/script-runs/".length);
      const run = state.scriptRuns.get(id);
      response.writeHead(run ? 200 : 404, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(run ? { run } : { ok: false, error: "script run not found" }));
      return;
    }
    if (request.method === "POST" && request.url === "/control/assistant-evaluate") {
      let body = "";
      request.on("data", (chunk) => { body += chunk.toString(); if (body.length > 20000) request.destroy(); });
      request.on("end", () => {
        let code = null;
        try { code = JSON.parse(body).code; } catch { /* malformed body */ }
        if (typeof code !== "string" || !code.trim()) {
          response.writeHead(400, { "content-type": "application/json; charset=utf-8" });
          response.end(JSON.stringify({ ok: false, error: "code is required" }));
          return;
        }
        const run = startAssistantScript(state, code);
        response.writeHead(202, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ ok: true, runId: run.id, statusUrl: `/script-runs/${run.id}` }));
      });
      return;
    }
    if (request.method === "POST" && (request.url === "/stop" || request.url === "/control/stop" || request.url === "/control/restart")) {
      requestAssistantRestart(state);
      response.writeHead(202, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ok: true, restarting: true, stopping: true }));
      return;
    }
    if (request.method === "POST" && (request.url === "/quit" || request.url === "/control/quit")) {
      requestAssistantQuit(state);
      response.writeHead(202, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ok: true, stopping: true }));
      return;
    }
    if (request.method === "POST" && request.url === "/control/reload-extension") {
      if (state.bridgeSocket) {
        sendWebSocketText(state.bridgeSocket, { channel: "control", type: "extension.reload" });
        recordDiagnostic(state, "info", "extension-reload-requested", "Extension self-reload requested.");
        response.writeHead(202, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ ok: true, queued: true }));
      } else {
        response.writeHead(503, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ ok: false, error: "extension bridge is not connected" }));
      }
      return;
    }
    if (request.method === "POST" && request.url === "/control/connect") {
      let body = "";
      request.on("data", (chunk) => { body += chunk.toString(); if (body.length > 4096) request.destroy(); });
      request.on("end", () => {
        let endpoint;
        try { endpoint = JSON.parse(body).endpoint; } catch { endpoint = null; }
        if (!state.bridgeSocket || typeof endpoint !== "string" || !/^wss?:\/\//i.test(endpoint)) {
          response.writeHead(400, { "content-type": "application/json; charset=utf-8" });
          response.end(JSON.stringify({ ok: false, error: "endpoint must be ws:// or wss:// and bridge must be connected" }));
          return;
        }
        sendWebSocketText(state.bridgeSocket, { channel: "control", type: "bridge.connect", endpoint });
        recordDiagnostic(state, "info", "bridge-connect-requested", `Extension endpoint change requested: ${endpoint}`);
        response.writeHead(202, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ ok: true, queued: true }));
      });
      return;
    }
    if (request.method === "POST" && request.url === "/control/evaluate") {
      let body = "";
      request.on("data", (chunk) => { body += chunk.toString(); if (body.length > 20000) request.destroy(); });
      request.on("end", () => {
        let expression = null;
        try { expression = JSON.parse(body).expression; } catch { /* malformed body */ }
        if (!state.bridgeSocket || typeof expression !== "string" || !expression.trim()) {
          response.writeHead(400, { "content-type": "application/json; charset=utf-8" });
          response.end(JSON.stringify({ ok: false, error: "expression required and extension bridge must be connected" }));
          return;
        }
        const requestId = queuePageEvaluation(state, expression, "evaluate", "http-control");
        response.writeHead(202, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ ok: true, requestId }));
      });
      return;
    }
    if (request.method === "POST" && request.url === "/control/refresh") {
      if (state.bridgeSocket) {
        const source = await fs.readFile(new URL("../../browser-stdlib/navigation.js", import.meta.url), "utf8");
        const requestId = queuePageEvaluation(state, contextProbeCode(source), "context", "http-refresh");
        response.writeHead(202, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ ok: true, queued: true }));
      } else {
        response.writeHead(503, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ ok: false, error: "extension bridge is not connected" }));
      }
      return;
    }
    if (request.method === "GET" && request.url === "/resource/draft.txt") {
      try {
        const draft = await fs.readFile(DRAFT_IN, "utf8");
        response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        response.end(draft);
      } catch (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500, { "content-type": "text/plain; charset=utf-8" });
        response.end(error.code === "ENOENT" ? "draft.txt not found" : "resource read failed");
      }
      return;
    }
    if (request.method === "GET" && request.url === "/resource/draft_out.txt") {
      try {
        const draft = await fs.readFile(DRAFT_OUT, "utf8");
        response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        response.end(draft);
      } catch (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500, { "content-type": "text/plain; charset=utf-8" });
        response.end(error.code === "ENOENT" ? "draft_out.txt not found" : "resource read failed");
      }
      return;
    }
    if (request.method === "GET" && request.url === "/stdlib/navigation.js") {
      try {
        const source = await fs.readFile(new URL("../../browser-stdlib/navigation.js", import.meta.url), "utf8");
        response.writeHead(200, { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-cache" });
        response.end(source);
      } catch {
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        response.end("stdlib unavailable");
      }
      return;
    }
    if (request.method === "GET" && request.url === "/stdlib/adapters/facebook.js") {
      try {
        const source = await fs.readFile(new URL("../../browser-stdlib/adapters/facebook.js", import.meta.url), "utf8");
        response.writeHead(200, { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-cache" });
        response.end(source);
      } catch {
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        response.end("Facebook adapter unavailable");
      }
      return;
    }
    response.writeHead(426, { "content-type": "text/plain; charset=utf-8" });
    response.end("WebSocket or a known local resource is required");
  });
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (socket) => {
    state.bridgeSocket?.terminate();
    state.bridgeSocket = socket;
    state.bridgeConnected = true;
    state.cdpUnavailable = false;
    recordDiagnostic(state, "info", "bridge-connected", "Extension bridge connected.");
    socket.on("close", (code, reason) => {
      recordDiagnostic(state, "error", "bridge-closed", `WebSocket closed (${code}): ${reason.toString() || "no reason"}`);
      if (state.bridgeSocket === socket) { state.bridgeSocket = null; state.bridgeConnected = false; render(state); }
    });
    socket.on("message", (data) => {
      try { ingestBridgeMessage(state, JSON.parse(data.toString()), "local"); }
      catch (error) { recordDiagnostic(state, "error", "bridge-message", "Malformed bridge JSON.", { error: error.message, raw: data.toString().slice(0, 500) }); }
    });
  });
  server.listen(BRIDGE_PORT, "127.0.0.1");
  return server;
}

function contextVersion(state, page = state.page) {
  return JSON.stringify({
    targetId: state.target?.id,
    targetUrl: state.target?.url,
    pageUrl: page?.url,
    activeElement: page?.activeElement,
    selection: page?.selection,
  });
}

function render(state) {
  if (!state.panel) return;
  // The extension is authoritative for the focused tab when CDP is not
  // available (and also avoids depending on CDP's arbitrary target order).
  const localCtx = state.extensionContext;
  const hostedCtx = state.hostedContext;
  const focusedHosted = state.bridgeFocus === "hosted";
  const target = focusedHosted
    ? (hostedCtx && { id: hostedCtx.tabId, title: hostedCtx.title, url: hostedCtx.url })
    : (state.target || (localCtx && { id: localCtx.tabId, title: localCtx.title, url: localCtx.url }));
  const page = focusedHosted ? hostedCtx : (state.page || localCtx);
  const lines = [
    "Cogentia Navigation Assistant (resident TUI)",
    "=".repeat(62),
    `Local    : ${state.bridgeConnected ? "extension" : (state.localGatewayUp ? "gateway, pas d'extension" : `en attente :${BRIDGE_PORT}`)}`,
    `Hosted   : ${state.hostedExtensionConnected ? "extension" : (state.hostedGatewayUp ? "gateway, pas d'extension" : "en attente")}`,
    `Cible    : ${focusedHosted ? "hosted" : "local"}  ([h] hosted  [l] local)`,
  ];
  if (!state.bridgeConnected && !state.hostedGatewayUp) {
    lines.push(`CDP      : ${state.cdpAvailable ? "disponible" : "indisponible"}`);
  }
  if (state.cdpUnavailable) lines.push("État     : CDP indisponible (mode extension requis)");
  if (!state.bridgeConnected && !state.hostedExtensionConnected) {
    lines.push("", "Extension non connectée.", "Brave : chrome://extensions → Mode développeur → Charger non empaquetée", `→ ${EXTENSION_DIR}`);
  }
  lines.push(`Onglet   : ${target?.title || "(aucun)"}`, `Lieu     : ${tabSiteLabel(target?.url)}`);
  const active = state.extensionContext?.activeField || page?.activeElement;
  lines.push(`Champ    : ${active ? `${active.tag} ${active.role || ""} ${active.ariaLabel || ""}`.trim() : "(aucun)"}`, "-".repeat(62), "Actions : [h]/[l] cible  [[] début démo  []] fin démo  [c] contexte  [i] insérer  [p] presse-papiers → draft_out  [e] exporter  [q] redémarrer  [x] quitter");
  if (state.error) lines.push(`Erreur   : ${state.error}`);
  if (state.clipboard) lines.push(`Presse-papiers : ${state.clipboard}`);
  if (state.recording) lines.push(`Démonstration : en cours depuis #${state.recording.startSequence}`);
  else if (state.lastRecording) lines.push(`Démonstration : terminée (#${state.lastRecording.startSequence}–#${state.lastRecording.endSequence})`);
  if (state.eventExport) lines.push(`Séquence : ${state.eventExport}`);
  const last = state.diagnostics.at(-1);
  if (last) lines.push(`Trace    : #${last.sequence} ${last.level}/${last.code} - ${last.message}`);
  lines.push("", "Journal vivant : GET /diagnostics?limit=100  (circulaire, mémoire seule). Aucun envoi automatique. [q] redémarrer  [x] quitter.");
  state.panel.setContent(lines.join("\n"));
  state.screen.render();
}

async function insertDraft(state) {
  if (activeSocket(state)) {
    const text = normalizeAssistantText(await fs.readFile(DRAFT_IN, "utf8"));
    try {
      await copyTextToClipboard(text);
      state.clipboard = "mis à jour avec la dernière insertion";
      recordDiagnostic(state, "info", "clipboard-updated", "Draft copied to the clipboard.", { length: text.length });
    } catch (error) {
      // Clipboard support is an extra convenience; a temporary Windows
      // clipboard failure must not prevent direct text insertion.
      state.clipboard = `indisponible (${error.message})`;
      recordDiagnostic(state, "error", "clipboard-failed", "Could not update the clipboard.", { error: error.message });
    }
    const code = `window.__cogentiaNavigationAssistant?.insertText(${JSON.stringify(text)}) || ({ok:false,error:"stdlib unavailable"})`;
    queuePageEvaluation(state, code, "insert", "tui");
    state.error = "Insertion demandée…";
    render(state);
    return;
  }
  if (!state.target) throw new Error("Aucun onglet CDP sélectionné ou extension non connectée.");
  const currentPage = await readPageContext(state.target);
  if (state.contextVersion !== contextVersion(state, currentPage)) {
    throw new Error("Contexte modifié depuis l’affichage ; insertion annulée (verrouillage optimiste).");
  }
  const active = currentPage?.activeElement;
  const editable = active && (["INPUT", "TEXTAREA"].includes(active.tag) || active.isContentEditable || active.contentEditable === "true");
  if (!editable) throw new Error("Insertion refusée : le champ actif n’est pas éditable.");
  const text = normalizeAssistantText(await fs.readFile(DRAFT_IN, "utf8"));
  await insertTextInTab(state.target, text);
  state.error = null;
}

async function saveClipboardToDraftOut(state) {
  const text = await readTextFromClipboard();
  await fs.writeFile(DRAFT_OUT, text, "utf8");
  state.clipboard = `${text.length} caractères copiés dans draft_out.txt`;
  state.error = null;
  recordDiagnostic(state, "info", "clipboard-saved", "Clipboard saved to draft_out.txt.", { length: text.length, path: DRAFT_OUT });
  render(state);
}

async function exportEventSequence(state) {
  const path = "navigation-event-sequence.json";
  const recording = state.recording || state.lastRecording || null;
  const payload = {
    schema: "cogentia.navigation.event-sequence/v1",
    capturedAt: new Date().toISOString(),
    capacity: MAX_DIAGNOSTICS,
    recording,
    events: recordingSequence(state),
  };
  await fs.writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  state.error = null;
  state.eventExport = `${payload.events.length} événements → navigation-event-sequence.json`;
  recordDiagnostic(state, "info", "event-sequence-exported", "Event sequence exported for macro analysis.", { path: "navigation-event-sequence.json", count: payload.events.length });
  render(state);
}

function startRecording(state) {
  if (state.recording) {
    state.error = "Une démonstration est déjà en cours.";
    render(state);
    return;
  }
  const recording = { id: crypto.randomUUID(), startedAt: new Date().toISOString(), startSequence: state.diagnosticSequence + 1 };
  state.recording = recording;
  state.lastRecording = null;
  recordDiagnostic(state, "info", "recording-started", "Manual macro demonstration started.", { recordingId: recording.id });
  recording.startSequence = state.diagnosticSequence;
  state.error = null;
  render(state);
}

function stopRecording(state) {
  if (!state.recording) {
    state.error = "Aucune démonstration en cours.";
    render(state);
    return;
  }
  const recording = state.recording;
  recordDiagnostic(state, "info", "recording-stopped", "Manual macro demonstration stopped.", { recordingId: recording.id });
  recording.endSequence = state.diagnosticSequence;
  recording.stoppedAt = new Date().toISOString();
  state.lastRecording = recording;
  state.recording = null;
  state.error = null;
  render(state);
}

async function refresh(state) {
  // Once the extension is connected it owns active-tab tracking. Avoid a
  // needless CDP poll (and its confusing fetch error when Brave was not
  // started with --remote-debugging-port). chrome.debugger and a CDP
  // Runtime.evaluate on the same tab also collide.
  if (process.env.NAV_ASSIST_SKIP_CDP === "1") {
    state.cdpAvailable = false;
    state.error = state.bridgeConnected ? null : state.error;
    render(state);
    return;
  }
  if (state.bridgeConnected) {
    state.cdpUnavailable = false;
    state.error = null;
    render(state);
    return;
  }
  try {
    state.tabs = await listTabs();
    state.cdpAvailable = true;
    state.target = selectTab(state.tabs, state.targetId);
    state.page = await readPageContext(state.target);
    state.contextVersion = contextVersion(state);
    state.error = null;
  } catch (error) {
    state.cdpAvailable = false;
    // CDP is optional when the extension bridge is connected. Keep the
    // extension-provided active-tab context visible instead of presenting a
    // misleading fatal-looking fetch error on every refresh.
    if (!state.bridgeConnected && error.message === "fetch failed") {
      state.cdpUnavailable = true;
      state.error = null;
    } else {
      state.error = state.bridgeConnected ? `CDP indisponible (${error.message})` : error.message;
    }
  }
  render(state);
}

function requestContextRefresh(state) {
  if (activeSocket(state)) {
    requestContextOn(state, activeSocket(state), state.bridgeFocus === "hosted" ? "hosted" : "tui");
    return;
  }
  refresh(state);
}

function requestAssistantRestart(state) {
  if (state.closed) return;
  state.restartRequested = true;
  recordDiagnostic(state, "info", "assistant-restart", "Restart requested.");
  state.shutdown?.();
}

function requestAssistantQuit(state) {
  if (state.closed) return;
  state.restartRequested = false;
  recordDiagnostic(state, "info", "assistant-quit", "Quit requested.");
  state.shutdown?.();
}

export async function runTui() {
  const state = { tabs: [], target: null, targetId: null, page: null, contextVersion: null, bridgeSocket: null, bridgeConnected: false, localAssistantSocket: null, localGatewayUp: false, hostedSocket: null, hostedGatewayUp: false, hostedExtensionConnected: false, hostedContext: null, hostedExtensionVersion: null, bridgeFocus: "local", extensionVersion: null, cdpAvailable: false, cdpUnavailable: false, rpcKinds: new Map(), rpcWaiters: new Map(), scriptRuns: new Map(), error: null, clipboard: null, eventExport: null, recording: null, lastRecording: null, diagnostics: [], diagnosticSequence: 0, closed: false, shutdown: null, restartRequested: false };
  const screen = blessed.screen({ smartCSR: true, title: "Cogentia Navigation Assistant", fullUnicode: true, cursor: { artificial: false } });
  const panel = blessed.box({ top: 0, left: 0, width: "100%", height: "100%", tags: false, padding: { left: 1, right: 1 }, scrollable: false });
  screen.append(panel);
  state.screen = screen;
  state.panel = panel;
  const stopLocalGw = startGatewayClient(state, LOCAL_GATEWAY_URL, "local");
  const stopHostedGw = startGatewayClient(state, HOSTED_GATEWAY_URL, "hosted");
  await new Promise((resolve) => setTimeout(resolve, LOCAL_GATEWAY_WAIT_MS));
  const bridge = state.localGatewayUp ? { close() {} } : startBridge(state);
  const interval = setInterval(() => { if (!state.closed) refresh(state); }, REFRESH_MS);
  await refresh(state);
  return new Promise((resolve) => {
    const shutdown = () => {
      if (state.closed) return;
        state.closed = true;
        clearInterval(interval);
        state.bridgeSocket?.destroy();
        stopLocalGw?.();
        stopHostedGw?.();
        bridge.close();
        screen.destroy();
        resolve({ restartRequested: state.restartRequested });
    };
    state.shutdown = shutdown;
    screen.key("q", () => requestAssistantRestart(state));
    screen.key(["x", "C-c"], () => requestAssistantQuit(state));
    screen.key(["c", "r"], async () => {
      if (!state.closed) {
        requestContextRefresh(state);
      }
    });
    screen.key("i", async () => {
      if (!state.closed) {
        try {
          await insertDraft(state);
        } catch (error) {
          state.error = error.message;
        }
        await refresh(state);
      }
    });
    screen.key("p", async () => {
      if (!state.closed) {
        try {
          await saveClipboardToDraftOut(state);
        } catch (error) {
          state.error = `Presse-papiers : ${error.message}`;
          recordDiagnostic(state, "error", "clipboard-read-failed", "Could not read the clipboard.", { error: error.message });
          render(state);
        }
      }
    });
    screen.key("e", async () => {
      if (!state.closed) {
        try {
          await exportEventSequence(state);
        } catch (error) {
          state.error = `Export : ${error.message}`;
          recordDiagnostic(state, "error", "event-sequence-export-failed", "Could not export event sequence.", { error: error.message });
          render(state);
        }
      }
    });
    screen.key("[", () => { if (!state.closed) startRecording(state); });
    screen.key("]", () => { if (!state.closed) stopRecording(state); });
    screen.key("t", async () => {
      if (!state.closed) {
        state.targetId = null;
        await refresh(state);
      }
    });
    screen.key("l", () => {
      if (!state.closed) {
        state.bridgeFocus = "local";
        render(state);
      }
    });
    screen.key("h", () => {
      if (!state.closed) {
        state.bridgeFocus = "hosted";
        render(state);
      }
    });
  });
}

if (process.argv[1] && process.argv[1].endsWith("navigation-assistant-tui.js")) {
    runTui().then((result) => {
      if (result?.restartRequested) {
        process.exitCode = 75;
        if (process.env.NAV_ASSIST_SUPERVISED !== "1") {
          process.stderr.write("navigation-assistant-tui: restart requested; run pnpm navigation-assistant:supervisor to respawn\n");
        }
        return;
      }
      process.exitCode = 0;
    }).catch((error) => {
    console.error(`navigation-assistant-tui: ${error.message}`);
    process.exitCode = 1;
  });
}
