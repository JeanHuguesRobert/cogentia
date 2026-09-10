// Minimal bridge: the extension initiates the WebSocket (it cannot listen).
const DEFAULT_ENDPOINT = "ws://127.0.0.1:8765/ws";
let ENDPOINT = DEFAULT_ENDPOINT;
let socket = null;
let retry = 0;
let retryTimer = null;
let heartbeatTimer = null;
let currentAttachedTabId = null;
let desiredTabId = null;

async function ensureAttached(tabId) {
  desiredTabId = tabId;
  if (currentAttachedTabId === tabId) return;
  if (currentAttachedTabId !== null) await chrome.debugger.detach({ tabId: currentAttachedTabId }).catch(() => {});
  try {
    await chrome.debugger.attach({ tabId }, "1.3");
  } catch (error) {
    // A service-worker restart can lose currentAttachedTabId while Chromium
    // keeps this extension's prior attachment. Detach only our own stale
    // session, then retry once; if detaching fails, preserve any other
    // debugger's attachment rather than taking it over.
    if (!/Another debugger is already attached/i.test(error.message || "")) throw error;
    try {
      await chrome.debugger.detach({ tabId });
      currentAttachedTabId = null;
      trace("info", "stale-debugger-detached", { tabId });
    } catch {
      throw error;
    }
    await chrome.debugger.attach({ tabId }, "1.3");
    trace("info", "debugger-reattached", { tabId });
  }
  await chrome.debugger.sendCommand({ tabId }, "Runtime.enable");
  await chrome.debugger.sendCommand({ tabId }, "Runtime.addBinding", { name: "CogentiaBridgeEvent" });
  currentAttachedTabId = tabId;
}

async function announceActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return;
  desiredTabId = tab.id;
  emit({ jsonrpc: "2.0", method: "page.activeChanged", params: {
    tab: { id: tab.id, title: tab.title || "", url: tab.url || "", windowId: tab.windowId, status: tab.status || "" },
    attached: currentAttachedTabId === tab.id,
    currentAttachedTabId,
    desiredTabId,
  } });
}

function notify(method, params) { emit({ jsonrpc: "2.0", method, params }); }

function emit(message) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ channel: "control", ...message }));
}

function trace(level, event, details = {}) {
  emit({ jsonrpc: "2.0", method: "bridge.trace", params: { level, event, ...details } });
}

function connect() {
  if (socket || retryTimer) return;
  socket = new WebSocket(ENDPOINT);
  socket.onopen = () => {
    retry = 0;
    emit({ type: "bridge.hello", extensionVersion: chrome.runtime.getManifest().version, protocolVersion: 2 });
    trace("info", "socket-open", { endpoint: ENDPOINT });
    announceActiveTab().catch((error) => trace("error", "active-tab-read-failed", { error: error.message }));
    heartbeatTimer = setInterval(() => emit({ jsonrpc: "2.0", method: "bridge.ping", params: {} }), 20000);
  };
  socket.onmessage = async (event) => {
    try { await handleCommand(JSON.parse(event.data)); }
    catch (error) { emit({ type: "bridge.error", message: error.message }); }
  };
  socket.onclose = () => {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    socket = null;
    retry += 1;
    retryTimer = setTimeout(() => { retryTimer = null; connect(); }, Math.min(60000, 1000 * (2 ** retry)));
  };
  socket.onerror = () => socket?.close();
}

async function handleCommand(message) {
  if (message.jsonrpc === "2.0" && message.method === "tabs.list" && message.id !== undefined) {
    const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
    emit({ jsonrpc: "2.0", id: message.id, result: {
      tabs: tabs.map((tab) => ({ id: tab.id, title: tab.title || "", url: tab.url || "", windowId: tab.windowId, active: Boolean(tab.active) })),
    } });
    return;
  }
  if (message.jsonrpc === "2.0" && message.method === "tabs.activate" && message.id !== undefined) {
    const tabId = Number(message.params?.tabId);
    if (!Number.isInteger(tabId)) {
      emit({ jsonrpc: "2.0", id: message.id, error: { code: -32602, message: "tabs.activate requires an integer tabId" } });
      return;
    }
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
      const active = await chrome.tabs.update(tabId, { active: true });
      await announceActiveTab();
      trace("info", "tab-activated", { tab: { id: active.id, title: active.title || "", url: active.url || "" } });
      emit({ jsonrpc: "2.0", id: message.id, result: { tab: { id: active.id, title: active.title || "", url: active.url || "", windowId: active.windowId } } });
    } catch (error) {
      emit({ jsonrpc: "2.0", id: message.id, error: { code: -32010, message: error.message } });
    }
    return;
  }
  if (message.jsonrpc === "2.0" && message.method === "tabs.create" && message.id !== undefined) {
    const url = String(message.params?.url || "");
    if (!/^https?:\/\//i.test(url)) {
      emit({ jsonrpc: "2.0", id: message.id, error: { code: -32602, message: "tabs.create requires an http(s) URL" } });
      return;
    }
    try {
      const tab = await chrome.tabs.create({ url, active: message.params?.active !== false });
      if (tab.active) await announceActiveTab();
      trace("info", "tab-created", { tab: { id: tab.id, title: tab.title || "", url: tab.url || "" }, active: Boolean(tab.active) });
      emit({ jsonrpc: "2.0", id: message.id, result: { tab: { id: tab.id, title: tab.title || "", url: tab.url || "", windowId: tab.windowId, active: Boolean(tab.active) } } });
    } catch (error) {
      emit({ jsonrpc: "2.0", id: message.id, error: { code: -32011, message: error.message } });
    }
    return;
  }
  if (message.jsonrpc === "2.0" && message.method === "tabs.close" && message.id !== undefined) {
    const tabId = Number(message.params?.tabId);
    if (!Number.isInteger(tabId)) {
      emit({ jsonrpc: "2.0", id: message.id, error: { code: -32602, message: "tabs.close requires an integer tabId" } });
      return;
    }
    try {
      await chrome.tabs.remove(tabId);
      trace("info", "tab-closed", { tabId });
      emit({ jsonrpc: "2.0", id: message.id, result: { closedTabId: tabId } });
    } catch (error) {
      emit({ jsonrpc: "2.0", id: message.id, error: { code: -32012, message: error.message } });
    }
    return;
  }
  if (message.jsonrpc === "2.0" && message.method === "page.evaluate" && message.id !== undefined && typeof message.params?.code === "string") {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];
    if (!tab?.id || !tab.url || /^(chrome|brave|edge|about):\/\//i.test(tab.url)) {
      emit({ jsonrpc: "2.0", id: message.id, error: { code: -32001, message: "No executable active web tab" } });
      return;
    }
    try {
      trace("info", "evaluate-start", { id: message.id, tab: { id: tab.id, title: tab.title || "", url: tab.url || "" }, codeLength: message.params.code.length });
      await ensureAttached(tab.id);
      const result = await chrome.debugger.sendCommand({ tabId: tab.id }, "Runtime.evaluate", { expression: message.params.code, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) {
        const exception = result.exceptionDetails;
        const details = { text: exception.text, description: exception.exception?.description, lineNumber: exception.lineNumber, columnNumber: exception.columnNumber, url: exception.url };
        trace("error", "evaluate-exception", { id: message.id, tabId: tab.id, exception: details });
        emit({ jsonrpc: "2.0", id: message.id, error: { code: -32002, message: exception.exception?.description || exception.text || "Page evaluation failed", data: details } });
      } else {
        trace("info", "evaluate-complete", { id: message.id, tabId: tab.id });
        emit({ jsonrpc: "2.0", id: message.id, result: { value: result.result?.value ?? null, tab: { id: tab.id, title: tab.title, url: tab.url } } });
      }
    } catch (error) {
      trace("error", "evaluate-failed", { id: message.id, tabId: tab.id, error: error.message });
      emit({ jsonrpc: "2.0", id: message.id, error: { code: -32003, message: error.message } });
    } finally { /* Keep the desired active tab attached for the next request. */ }
    return;
  }
  if (message.jsonrpc === "2.0" && message.method === "page.insertText" && message.id !== undefined && typeof message.params?.text === "string") {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];
    if (!tab?.id || !tab.url || /^(chrome|brave|edge|about):\/\//i.test(tab.url)) {
      emit({ jsonrpc: "2.0", id: message.id, error: { code: -32001, message: "No executable active web tab" } });
      return;
    }
    try {
      await ensureAttached(tab.id);
      await chrome.debugger.sendCommand({ tabId: tab.id }, "Input.insertText", { text: message.params.text });
      trace("info", "native-text-inserted", { id: message.id, tabId: tab.id, textLength: message.params.text.length });
      emit({ jsonrpc: "2.0", id: message.id, result: { insertedLength: message.params.text.length, tab: { id: tab.id, title: tab.title, url: tab.url } } });
    } catch (error) {
      trace("error", "native-text-insert-failed", { id: message.id, tabId: tab.id, error: error.message });
      emit({ jsonrpc: "2.0", id: message.id, error: { code: -32004, message: error.message } });
    }
    return;
  }
  if (message.channel !== "control" || message.type !== "execute" || !message.requestId || typeof message.code !== "string") return;
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs[0];
  if (!tab?.id || !tab.url || /^(chrome|brave|edge|about):\/\//i.test(tab.url)) {
    emit({ type: "execute.result", requestId: message.requestId, ok: false, error: "No executable active web tab." });
    return;
  }
  try {
    await ensureAttached(tab.id);
    const result = await chrome.debugger.sendCommand({ tabId: tab.id }, "Runtime.evaluate", { expression: message.code, returnByValue: true, awaitPromise: true });
    emit({ type: "execute.result", requestId: message.requestId, ok: !result.exceptionDetails, value: result.result?.value ?? null, error: result.exceptionDetails?.text || null });
  } catch (error) {
    emit({ type: "execute.result", requestId: message.requestId, ok: false, error: error.message });
  } finally { /* Keep the desired active tab attached for the next request. */ }
}

async function loadEndpoint() {
  try {
    const data = await fetch(chrome.runtime.getURL("endpoint.json")).then((r) => r.json());
    if (typeof data.endpoint === "string" && /^wss?:\/\//i.test(data.endpoint)) return data.endpoint;
  } catch { /* packed default */ }
  return DEFAULT_ENDPOINT;
}

loadEndpoint().then((endpoint) => {
  ENDPOINT = endpoint;
  connect();
});
chrome.tabs.onActivated.addListener(() => { announceActiveTab().catch((error) => emit({ type: "bridge.error", message: error.message })); });
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status) notify(`page.navigation${changeInfo.status === "loading" ? "Started" : "Completed"}`, { tab: { id: tabId, title: tab.title || "", url: tab.url || "" } });
});
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentAttachedTabId) currentAttachedTabId = null;
  if (tabId === desiredTabId) desiredTabId = null;
  notify("page.tabRemoved", { tabId, currentAttachedTabId, desiredTabId });
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  notify("page.windowFocusChanged", { windowId });
  if (windowId !== chrome.windows.WINDOW_ID_NONE) announceActiveTab().catch((error) => trace("error", "active-tab-read-failed", { error: error.message }));
});
chrome.debugger.onDetach.addListener((source, reason) => {
  if (source.tabId === currentAttachedTabId) currentAttachedTabId = null;
  notify("page.debuggerDetached", { tabId: source.tabId, reason });
});
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method !== "Runtime.bindingCalled" || params.name !== "CogentiaBridgeEvent") return;
  try { notify("page.event", { tabId: source.tabId, event: JSON.parse(params.payload) }); }
  catch { notify("page.event", { tabId: source.tabId, event: { type: "invalid", payload: params.payload } }); }
});
