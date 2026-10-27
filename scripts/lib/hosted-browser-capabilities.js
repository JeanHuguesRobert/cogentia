/** Hosted Chromium capabilities over the Fracta2 navigation-assistant extension. */

const DEFAULT_GATEWAY = "ws://127.0.0.1:8776/assistant";
const DEFAULT_HEALTH = "http://127.0.0.1:8776/health";

export function createHostedBrowserCapabilities(options = {}) {
  const gateway = String(options.gateway || process.env.COGENTIA_HOSTED_BROWSER_GATEWAY || DEFAULT_GATEWAY).trim();
  const health = String(options.health || process.env.COGENTIA_HOSTED_BROWSER_HEALTH || DEFAULT_HEALTH).trim();
  const timeoutMs = boundedInteger(options.timeoutMs, 10000, 500, 30000);

  return [
    {
      name: "browser.hosted.inspect",
      kind: "tool",
      risk: "read_only",
      resultVisibility: "reasoner",
      costUnits: 1,
      description: "Inspect the authenticated Fracta2 hosted browser connection, tabs, or visible context of the active tab.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["status", "tabs", "context"] },
          max_chars: { type: "integer", minimum: 1, maximum: 12000 },
          include_url: { type: "boolean" },
        },
        required: ["action"],
        additionalProperties: false,
      },
      async execute(input = {}) {
        const action = String(input.action || "");
        if (action === "status") {
          const response = await fetch(health, { signal: AbortSignal.timeout(timeoutMs) });
          if (!response.ok) throw capabilityError("BROWSER_GATEWAY_UNAVAILABLE");
          return response.json();
        }
        if (action === "tabs") {
          const result = await rpc(gateway, "tabs.list", {}, timeoutMs);
          return {
            tabs: Array.isArray(result.tabs)
              ? result.tabs.map((tab) => summarizeTab(tab, input.include_url === true))
              : [],
          };
        }
        if (action === "context") {
          const maxChars = boundedInteger(input.max_chars, 4000, 1, 12000);
          const result = await rpc(gateway, "page.evaluate", {
            code: "(() => ({title:document.title,url:location.href,text:(document.body?.innerText||\"\").slice(0," + maxChars + ")}))()",
          }, timeoutMs);
          const page = result.value || {};
          return {
            tab: result.tab ? summarizeTab(result.tab, input.include_url === true) : null,
            title: page.title || "",
            url: input.include_url === true ? page.url || "" : originOf(page.url),
            text: String(page.text || "").slice(0, maxChars),
          };
        }
        throw capabilityError("BROWSER_ACTION_NOT_ALLOWED");
      },
    },
    {
      name: "browser.hosted.interact",
      kind: "tool",
      risk: "internal_recoverable",
      resultVisibility: "reasoner",
      costUnits: 1,
      description: "Perform an explicitly requested recoverable action in the hosted browser: activate, open, close a tab, or insert supplied text into the focused field.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["activate", "open", "close", "insert_text"] },
          tab_id: { type: "integer", minimum: 1 },
          url: { type: "string", maxLength: 4096 },
          active: { type: "boolean" },
          text: { type: "string", maxLength: 12000 },
        },
        required: ["action"],
        additionalProperties: false,
      },
      async execute(input = {}) {
        const action = String(input.action || "");
        if (action === "activate") return rpc(gateway, "tabs.activate", { tabId: positiveInt(input.tab_id, "tab_id") }, timeoutMs);
        if (action === "open") {
          const url = String(input.url || "");
          if (!/^https?:\/\//i.test(url)) throw capabilityError("BROWSER_URL_INVALID");
          return rpc(gateway, "tabs.create", { url, active: input.active !== false }, timeoutMs);
        }
        if (action === "close") return rpc(gateway, "tabs.close", { tabId: positiveInt(input.tab_id, "tab_id") }, timeoutMs);
        if (action === "insert_text") {
          const text = String(input.text || "");
          if (!text || text.length > 12000) throw capabilityError("BROWSER_TEXT_INVALID");
          return rpc(gateway, "page.insertText", { text }, timeoutMs);
        }
        throw capabilityError("BROWSER_ACTION_NOT_ALLOWED");
      },
    },
    {
      name: "browser.hosted.evaluate",
      kind: "tool",
      risk: "external_write",
      resultVisibility: "reasoner",
      costUnits: 2,
      description: "Evaluate explicitly supplied JavaScript in the active hosted page. Requires this exact capability to be confirmed by the caller; page code can cause external effects.",
      inputSchema: {
        type: "object",
        properties: { code: { type: "string", minLength: 1, maxLength: 16000 } },
        required: ["code"],
        additionalProperties: false,
      },
      async execute(input = {}) {
        const code = String(input.code || "");
        if (!code || code.length > 16000) throw capabilityError("BROWSER_SCRIPT_INVALID");
        return rpc(gateway, "page.evaluate", { code });
      },
    },
  ];
}

async function rpc(endpoint, method, params, timeoutMs) {
  if (typeof WebSocket !== "function") throw capabilityError("BROWSER_WEBSOCKET_UNAVAILABLE");
  const socket = new WebSocket(endpoint);
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => finish(capabilityError("BROWSER_EXTENSION_TIMEOUT")), timeoutMs);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.close(); } catch { /* already closed */ }
      if (error) reject(error);
      else resolve(value);
    }
    socket.addEventListener("open", () => socket.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })));
    socket.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message.id !== 1) return;
      if (message.error) finish(capabilityError("BROWSER_EXTENSION_REQUEST_FAILED"));
      else finish(null, message.result || {});
    });
    socket.addEventListener("error", () => finish(capabilityError("BROWSER_GATEWAY_UNAVAILABLE")));
    socket.addEventListener("close", () => {
      if (!settled) finish(capabilityError("BROWSER_EXTENSION_DISCONNECTED"));
    });
  });
}

function originOf(value) {
  try { return new URL(value).origin; } catch { return ""; }
}
function summarizeTab(tab, includeUrl = false) {
  return {
    id: tab.id,
    title: tab.title || "",
    url: includeUrl ? (tab.url || "") : originOf(tab.url),
    windowId: tab.windowId,
    active: Boolean(tab.active),
  };
}
function positiveInt(value, name) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw capabilityError("BROWSER_" + name.toUpperCase() + "_INVALID");
  return number;
}
function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
}
function capabilityError(code) {
  const error = new Error("Hosted browser capability failed");
  error.name = "CapabilityError";
  error.code = code;
  return error;
}
