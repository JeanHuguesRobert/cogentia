import {safeFormFocusCode} from "./form-field-focus.js";
import {projectFrameTree} from "./frame-tree.js";
import {verifyFrameTarget} from "./frame-target.js";
import { selectTargetTab, ensureExpectedUrl } from "./tab-target.js";
import { reconnectDelayMs, nextFailureCount, OPEN_TIMEOUT_MS } from "./reconnect-policy.js";
// Minimal bridge: the extension initiates the WebSocket (it cannot listen).
const DEFAULT_ENDPOINT = "ws://127.0.0.1:8765/ws";
let ENDPOINT = DEFAULT_ENDPOINT;
let BROWSER_INSTANCE_ID = null;
let socket = null;
let retry = 0;
let retryTimer = null;
let heartbeatTimer = null;
let connectTimeout = null;
let openedAt = 0;
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

async function ensureSameDocumentTarget(tab, params = {}) {
  const current = await chrome.tabs.get(tab.id);
  ensureExpectedUrl(current, { expectedUrl: params.expectedUrl ?? tab.url });
  return current;
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

function scheduleReconnect() {
  retryTimer = setTimeout(() => { retryTimer = null; connect(); }, reconnectDelayMs(retry));
}

function connect() {
  if (socket || retryTimer) return;
  // WebSocket cannot listen inside an extension: the extension is always the client.
  let ws;
  try { ws = new WebSocket(ENDPOINT); }
  catch { retry = nextFailureCount(retry, 0); scheduleReconnect(); return; }
  socket = ws;
  openedAt = 0;
  connectTimeout = setTimeout(() => {
    if (socket === ws && ws.readyState === WebSocket.CONNECTING) {
      // WebSocket.close() may reject while CONNECTING; bound the attempt and retry.
      try { ws.close(); } catch { /* failure is accounted for below */ }
      if (socket === ws) {
        socket = null;
        retry = nextFailureCount(retry, 0);
        scheduleReconnect();
      }
    }
  }, OPEN_TIMEOUT_MS);
  ws.onopen = () => {
    if (socket !== ws) { ws.close(); return; }
    clearTimeout(connectTimeout);
    connectTimeout = null;
    openedAt = Date.now();
    if (BROWSER_INSTANCE_ID) emit({ jsonrpc: "2.0", method: "browser.register", params: { browser_instance_id: BROWSER_INSTANCE_ID } });
    emit({ type: "bridge.hello", extensionVersion: chrome.runtime.getManifest().version, protocolVersion: 2 });
    trace("info", "socket-open", { endpoint: ENDPOINT });
    announceActiveTab().catch((error) => trace("error", "active-tab-read-failed", { error: error.message }));
    clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => emit({ jsonrpc: "2.0", method: "bridge.ping", params: {} }), 20000);
  };
  ws.onmessage = async (event) => {
    try { await handleCommand(JSON.parse(event.data)); }
    catch (error) { emit({ type: "bridge.error", message: error.message }); }
  };
  ws.onclose = () => {
    if (socket !== ws) return;
    clearTimeout(connectTimeout);
    connectTimeout = null;
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    socket = null;
    retry = nextFailureCount(retry, openedAt ? Date.now() - openedAt : 0);
    openedAt = 0;
    scheduleReconnect();
  };
  ws.onerror = () => ws.close();
}

async function handleCommand(message) {
  if (message.jsonrpc === "2.0" && message.method === "tabs.list" && message.id !== undefined) {
    const tabs = await chrome.tabs.query({});
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
  // General-purpose frame identities, scoped to a selected tab. No HTML,
  // values, full URLs, JS evaluation or credential access.
  if(message.jsonrpc === "2.0" && message.method === "page.frames.list" && message.id !== undefined){
    let tab;
    try {
      if(!Number.isInteger(message.params?.tabId) || typeof message.params?.expectedUrl !== 'string')
        throw Error('frame_target_invalid');
      const tabs=await chrome.tabs.query({});
      tab=ensureExpectedUrl(selectTargetTab(tabs,message.params),message.params);
      await ensureAttached(tab.id);
      await ensureSameDocumentTarget(tab,message.params);
      const tree=await chrome.debugger.sendCommand({tabId:tab.id},'Page.getFrameTree');
      await ensureSameDocumentTarget(tab,message.params);
      const projection=projectFrameTree(tree.frameTree);
      emit({jsonrpc:'2.0',id:message.id,result:{...projection,tab_id:tab.id}});
    } catch {
      emit({jsonrpc:'2.0',id:message.id,error:{code:-32029,message:'Frame inspection unavailable'}});
    }
    return;
  }
  if (message.jsonrpc === "2.0" && message.method === "page.evaluate" && message.id !== undefined && typeof message.params?.code === "string") {
    const tabs = await chrome.tabs.query({});
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const available = tabs.map((candidate) => ({ ...candidate, lastFocusedWindow: candidate.id === activeTab?.id }));
    let tab;
    try { tab = ensureExpectedUrl(selectTargetTab(available, message.params), message.params); }
    catch (error) { emit({ jsonrpc: "2.0", id: message.id, error: { code: -32602, message: error.message } }); return; }
    if (!tab?.id || !tab.url || /^(chrome|brave|edge|about):\/\//i.test(tab.url)) {
      emit({ jsonrpc: "2.0", id: message.id, error: { code: -32001, message: "No executable active web tab" } });
      return;
    }
    try {
      trace("info", "evaluate-start", { id: message.id, tab: { id: tab.id, title: tab.title || "", url: tab.url || "" }, codeLength: message.params.code.length });
      await ensureAttached(tab.id);
      await ensureSameDocumentTarget(tab, message.params);
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
  // Generic, non-secret form assistance: one extension operation, not two
  // independently routable focus/insert RPCs. Never echoes input text.
  if (message.jsonrpc === "2.0" && message.method === "page.form.fill" && message.id !== undefined) {
    const index = message.params?.fieldIndex;
    const value = message.params?.text;
    if (!Number.isInteger(index) || index < 0 || index > 79 ||
        typeof value !== "string" || !value || value.length > 2048 ||
        typeof message.params?.expectedUrl !== "string" ||
        !message.params.expectedUrl.startsWith("https://") ||
        !Number.isInteger(message.params?.tabId)) {
      emit({jsonrpc:"2.0",id:message.id,error:{code:-32602,message:"Invalid bounded form fill"}});
      return;
    }
    let tab;
    try {
      const tabs=await chrome.tabs.query({});
      tab=ensureExpectedUrl(selectTargetTab(tabs,message.params),message.params);
      await ensureAttached(tab.id);
      await ensureSameDocumentTarget(tab,message.params);
      const scopedFrame=message.params?.frameId!==undefined || message.params?.expectedFrameOrigin!==undefined;
      if(scopedFrame && (!message.params?.frameId || !message.params?.expectedFrameOrigin))
        throw Error('frame_scope_incomplete');
      let contextId;
      if(scopedFrame){
        const tree=await chrome.debugger.sendCommand({tabId:tab.id},'Page.getFrameTree');
        verifyFrameTarget(tree.frameTree,{frameId:message.params.frameId,expectedOrigin:message.params.expectedFrameOrigin});
        // A frame-specific isolated world is mandatory. If the frame lives in
        // another CDP target (OOPIF) and Chromium rejects this operation, fail
        // closed rather than focusing another field or switching to raw CDP.
        const world=await chrome.debugger.sendCommand({tabId:tab.id},'Page.createIsolatedWorld',
          {frameId:message.params.frameId,worldName:'cogentia-form-assist'});
        if(!Number.isInteger(world?.executionContextId))throw Error('frame_context_unavailable');
        contextId=world.executionContextId;
      }
      const focused=await chrome.debugger.sendCommand({tabId:tab.id},"Runtime.evaluate",
        {expression:safeFormFocusCode(index),returnByValue:true,awaitPromise:false,
         ...(scopedFrame?{contextId}:{})});
      if(focused.exceptionDetails||focused.result?.value?.ok!==true)
        throw new Error("Target field not focusable");
      // Revalidate document and frame identity before inserting; never submit/click.
      await ensureSameDocumentTarget(tab,message.params);
      if(scopedFrame){
        const latest=await chrome.debugger.sendCommand({tabId:tab.id},'Page.getFrameTree');
        verifyFrameTarget(latest.frameTree,{frameId:message.params.frameId,expectedOrigin:message.params.expectedFrameOrigin});
      }
      await chrome.debugger.sendCommand({tabId:tab.id},"Input.insertText",{text:value});
      trace("info","form-fill-complete",{tabId:tab.id,fieldIndex:index,insertedLength:value.length});
      emit({jsonrpc:"2.0",id:message.id,result:{ok:true,insertedLength:value.length,tabId:tab.id,fieldIndex:index,
        ...(scopedFrame?{frameId:message.params.frameId}:{}),submitted:false}});
    } catch(error) {
      trace("error","form-fill-failed",{tabId:tab?.id||null});
      emit({jsonrpc:"2.0",id:message.id,error:{code:-32028,message:"Bounded form fill failed"}});
    }
    return;
  }
  if (message.jsonrpc === "2.0" && message.method === "page.insertText" && message.id !== undefined && typeof message.params?.text === "string") {
    const tabs = await chrome.tabs.query({});
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const available = tabs.map((candidate) => ({ ...candidate, lastFocusedWindow: candidate.id === activeTab?.id }));
    let tab;
    try { tab = ensureExpectedUrl(selectTargetTab(available, message.params), message.params); }
    catch (error) { emit({ jsonrpc: "2.0", id: message.id, error: { code: -32602, message: error.message } }); return; }
    if (!tab?.id || !tab.url || /^(chrome|brave|edge|about):\/\//i.test(tab.url)) {
      emit({ jsonrpc: "2.0", id: message.id, error: { code: -32001, message: "No executable active web tab" } });
      return;
    }
    try {
      await ensureAttached(tab.id);
      await ensureSameDocumentTarget(tab, message.params);
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
    if (typeof data.endpoint === "string" && /^wss?:\/\//i.test(data.endpoint)) return data;
  } catch { /* packed default */ }
  return { endpoint: DEFAULT_ENDPOINT };
}

loadEndpoint().then((config) => {
  ENDPOINT = config.endpoint;
  BROWSER_INSTANCE_ID = typeof config.browser_instance_id === "string" ? config.browser_instance_id : null;
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
  try { notify("page.event", { tabId: source.tabId, event: JSON.parse(params.payload), via: "debugger" }); }
  catch { notify("page.event", { tabId: source.tabId, event: { type: "invalid", payload: params.payload }, via: "debugger" }); }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "cogentia.page.event" || !message.event) return;
  const tabId = sender.tab?.id;
  if (!tabId) return;
  notify("page.event", { tabId, event: message.event, via: "content-script" });
});

// MV3 may terminate an idle service worker during prolonged disconnects.
// Alarms wake it again; the active WebSocket itself is kept alive by 20s pings.
const RECONNECT_ALARM = "cogentia-navigation-reconnect";
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RECONNECT_ALARM && !socket && !retryTimer) connect();
});
chrome.alarms.create(RECONNECT_ALARM, { periodInMinutes: 0.5 });
