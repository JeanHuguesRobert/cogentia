#!/usr/bin/env node
/**
 * Tailscale-perimeter relay: the hosted extension connects in (it cannot
 * listen), the operator assistant on a trusted PC connects in, messages
 * are forwarded raw. Not a public service.
 */

import http from "node:http";
import { spawnSync } from "node:child_process";
import { WebSocketServer } from "ws";

export const DEFAULT_PORT = Number(process.env.NAV_ASSIST_GATEWAY_PORT || 8776);
export const DEFAULT_INSTANCE = process.env.NAV_ASSIST_GATEWAY_INSTANCE || "hosted";

export function isTailscaleOrLoopback(address) {
  const ip = String(address || "").replace(/^::ffff:/, "");
  if (ip === "127.0.0.1" || ip === "::1" || ip === "" || ip === "localhost") return true;
  const parts = ip.split(".").map(Number);
  return parts.length === 4 && parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127
    && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
}

export function tailscaleIpv4() {
  const probe = spawnSync("tailscale", ["ip", "-4"], { encoding: "utf8", windowsHide: true });
  if (probe.error || probe.status !== 0) return "";
  return String(probe.stdout || "").trim().split(/\s+/)[0] || "";
}

function sendJson(socket, value) {
  if (socket?.readyState === 1) socket.send(JSON.stringify(value));
}

function roleFromUrl(url) {
  try {
    const path = new URL(url, "http://gateway.local").pathname;
    if (path === "/extension" || path === "/ws") return "extension";
    if (path === "/assistant") return "assistant";
  } catch { /* ignore */ }
  return null;
}

export function createNavigationGateway(options = {}) {
  const instance = options.instance || DEFAULT_INSTANCE;
  const sockets = { extension: new Set(), assistant: new Set() };
  const pending = new Map();
  const subscriptions = new Map();
  const leases = new Map();
  function leaseKey(browserId, tabId) { return `${browserId}:${tabId}`; }
  function currentLease(key) {
    const lease = leases.get(key);
    if (lease && lease.expiresAt <= Date.now()) { leases.delete(key); return null; }
    return lease || null;
  }
  function matchesSubscription(subscription, source, message) {
    if (subscription.browserInstanceId !== source.browserInstanceId) return false;
    if (!message.method?.startsWith("page.")) return false;
    if (subscription.methods && !subscription.methods.includes(message.method)) return false;
    if (subscription.tabIds) {
      const tabId = message.params?.tabId ?? message.params?.tab?.id;
      if (!subscription.tabIds.includes(tabId)) return false;
    }
    return true;
  }
  let sequence = 0;
  function fail(ws, id, code, message) {
    sendJson(ws, { jsonrpc: "2.0", id, error: { code, message } });
  }
  function clearPending(ws) {
    for (const [id, request] of pending) {
      if (request.assistant === ws || request.extension === ws) {
        clearTimeout(request.timer);
        pending.delete(id);
        if (request.extension === ws && request.assistant.readyState === 1)
          fail(request.assistant, request.originalId, -32021, "extension disconnected");
      }
    }
  }

  function snapshot() {
    return {
      ok: true,
      instance,
      extensionConnected: sockets.extension.size > 0,
      assistants: sockets.assistant.size,
    };
  }

  function broadcast(role, raw) {
    for (const peer of sockets[role]) {
      if (peer.readyState === 1) peer.send(raw);
    }
  }

  const server = http.createServer((request, response) => {
    const path = new URL(request.url || "/", "http://gateway.local").pathname;
    if (request.method === "GET" && path === "/health") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(snapshot()));
      return;
    }
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("not found");
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    const remote = request.socket.remoteAddress;
    if (!isTailscaleOrLoopback(remote)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    const role = roleFromUrl(request.url);
    if (!role) {
      socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.role = role;
      sockets[role].add(ws);
      if (role === "assistant") sendJson(ws, { type: "gateway.hello", instance, extensionConnected: sockets.extension.size > 0, protocolVersion: 2 });
      if (role === "extension") {
        for (const assistant of sockets.assistant) {
          sendJson(assistant, { type: "gateway.extensionConnected", instance });
        }
      }
      ws.on("message", (data) => {
        let message;
        try { message = JSON.parse(data.toString()); } catch { return; }
        if (role === "extension") {
          if (message.method === "browser.register" && typeof message.params?.browser_instance_id === "string") {
            const id = message.params.browser_instance_id.trim();
            if (!id || [...sockets.extension].some((other) => other !== ws && other.browserInstanceId === id)) {
              if (message.id !== undefined) fail(ws, message.id, -32022, "duplicate or invalid browser instance");
              return;
            }
            ws.browserInstanceId = id;
            if (message.id !== undefined) sendJson(ws, { jsonrpc: "2.0", id: message.id, result: { registered: true, browser_instance_id: id } });
            return;
          }
          if (Object.prototype.hasOwnProperty.call(message, "id") && ("result" in message || "error" in message)) {
            const req = pending.get(message.id);
            if (!req || req.extension !== ws) return;
            pending.delete(message.id);
            clearTimeout(req.timer);
            sendJson(req.assistant, { ...message, id: req.originalId });
            return;
          }
          if (message.method?.startsWith("page.") && ws.browserInstanceId) {
            for (const [assistant, rules] of subscriptions) {
              if (rules.some((rule) => matchesSubscription(rule, ws, message)))
                sendJson(assistant, { ...message, params: { ...message.params, browser_instance_id: ws.browserInstanceId } });
            }
          } else if (sockets.extension.size === 1) {
            // Legacy compatibility for unscoped bridge notifications on a single browser.
            broadcast("assistant", JSON.stringify(message));
          }
          return;
        }
        if (message.method === "tabs.lease.acquire" && message.id !== undefined) {
          const { browser_instance_id: browserId, tabId, ttlMs = 30000 } = message.params || {};
          if (typeof browserId !== "string" || !browserId || !Number.isInteger(tabId) || tabId < 0 || !Number.isInteger(ttlMs) || ttlMs < 1000 || ttlMs > 120000) {
            fail(ws, message.id, -32602, "Invalid tab lease parameters"); return;
          }
          if (![...sockets.extension].some((peer) => peer.browserInstanceId === browserId && peer.readyState === 1)) {
            fail(ws, message.id, -32020, "browser extension is not connected"); return;
          }
          const key = leaseKey(browserId, tabId);
          const held = currentLease(key);
          if (held && held.owner !== ws) { fail(ws, message.id, -32026, "tab is leased by another agent connection"); return; }
          const expiresAt = Date.now() + ttlMs;
          leases.set(key, { owner: ws, expiresAt });
          sendJson(ws, { jsonrpc: "2.0", id: message.id, result: { acquired: true, browser_instance_id: browserId, tabId, expiresAt } });
          return;
        }
        if (message.method === "tabs.lease.release" && message.id !== undefined) {
          const { browser_instance_id: browserId, tabId } = message.params || {};
          if (typeof browserId !== "string" || !Number.isInteger(tabId)) { fail(ws, message.id, -32602, "Invalid tab lease parameters"); return; }
          const key = leaseKey(browserId, tabId);
          const held = currentLease(key);
          if (held && held.owner !== ws) { fail(ws, message.id, -32026, "tab is leased by another agent connection"); return; }
          if (held) leases.delete(key);
          sendJson(ws, { jsonrpc: "2.0", id: message.id, result: { released: Boolean(held) } });
          return;
        }
        if (message.method === "events.subscribe" && message.id !== undefined) {
          const { browser_instance_id: browserId, methods, tabIds } = message.params || {};
          const validMethods = methods === undefined || (Array.isArray(methods) && methods.length <= 32 && methods.every((m) => typeof m === "string" && /^page\.[a-zA-Z]+$/.test(m)));
          const validTabs = tabIds === undefined || (Array.isArray(tabIds) && tabIds.length <= 100 && tabIds.every((id) => Number.isInteger(id) && id >= 0));
          if (typeof browserId !== "string" || !browserId || !validMethods || !validTabs) {
            fail(ws, message.id, -32602, "Invalid scoped event subscription"); return;
          }
          const rules = subscriptions.get(ws) || [];
          if (rules.length >= 32) { fail(ws, message.id, -32025, "subscription limit reached"); return; }
          rules.push({ browserInstanceId: browserId, methods: methods || null, tabIds: tabIds || null });
          subscriptions.set(ws, rules);
          sendJson(ws, { jsonrpc: "2.0", id: message.id, result: { subscribed: true, count: rules.length } });
          return;
        }
        if (message.method === "events.unsubscribeAll" && message.id !== undefined) {
          subscriptions.delete(ws);
          sendJson(ws, { jsonrpc: "2.0", id: message.id, result: { subscribed: false } });
          return;
        }
        if (message.method === "browser.instances" && message.id !== undefined) {
          sendJson(ws, { jsonrpc: "2.0", id: message.id, result: {
            browsers: [...sockets.extension].filter((peer) => peer.readyState === 1).map((peer) => ({
              browser_instance_id: peer.browserInstanceId || null,
              registered: Boolean(peer.browserInstanceId),
            })),
          } });
          return;
        }
        if (message.method === "tabs.list" && message.id === undefined) return;
        if (message.id === undefined || !message.method) return;
        const targetId = message.params?.browser_instance_id;
        let candidates = [...sockets.extension].filter((peer) => peer.readyState === 1);
        if (targetId !== undefined) candidates = candidates.filter((peer) => peer.browserInstanceId === targetId);
        if (candidates.length !== 1) {
          fail(ws, message.id, candidates.length ? -32023 : -32020,
            candidates.length ? "browser instance is ambiguous" : "browser extension is not connected");
          return;
        }
        const target = candidates[0];
        // An implicitly chosen active tab could bypass a tab-specific lease.
        // Fail closed while any lease exists for this browser; explicit targets
        // remain available through the owner or after release.
        const tabId = message.params?.tabId;
        const guardedMethods = ["page.evaluate", "page.insertText", "page.form.fill", "page.frames.list", "tabs.activate", "tabs.close"];
        if (guardedMethods.includes(message.method)) {
          if (!Number.isInteger(tabId)) {
            const hasLease = [...leases.keys()].some((key) => key.startsWith(`${target.browserInstanceId}:`) && currentLease(key));
            if (hasLease) { fail(ws, message.id, -32027, "explicit tabId required while browser has active leases"); return; }
          } else {
            const held = currentLease(leaseKey(target.browserInstanceId, tabId));
            if (held && held.owner !== ws) { fail(ws, message.id, -32026, "tab is leased by another agent connection"); return; }
          }
        }
        const wireId = ++sequence;
        const timer = setTimeout(() => {
          const req = pending.get(wireId);
          if (!req) return;
          pending.delete(wireId);
          fail(req.assistant, req.originalId, -32024, "browser request timed out");
        }, 30000);
        timer.unref?.();
        pending.set(wireId, { assistant: ws, extension: target, originalId: message.id, timer });
        const params = { ...(message.params || {}) };
        delete params.browser_instance_id;
        sendJson(target, { ...message, id: wireId, params });
      });
      ws.on("close", () => {
        clearPending(ws);
        subscriptions.delete(ws);
        for (const [key, lease] of leases) {
          if (lease.owner === ws || (role === "extension" && key.startsWith(`${ws.browserInstanceId}:`))) leases.delete(key);
        }
        sockets[role].delete(ws);
        if (role === "extension") {
          for (const assistant of sockets.assistant) {
            sendJson(assistant, { type: "gateway.extensionDisconnected", instance });
          }
        }
      });
    });
  });

  return {
    server,
    snapshot,
    async listen(port, hosts) {
      const list = hosts?.length ? hosts : ["127.0.0.1"];
      this._bound = [];
      for (const host of list) {
        const bound = http.createServer((req, res) => server.emit("request", req, res));
        bound.on("upgrade", (req, socket, head) => server.emit("upgrade", req, socket, head));
        await new Promise((resolve, reject) => {
          bound.once("error", (error) => {
            bound.close();
            reject(error);
          });
          bound.listen(port, host, resolve);
        });
        this._bound.push(bound);
      }
      return this;
    },
    async close() {
      for (const set of Object.values(sockets)) {
        for (const ws of set) ws.terminate();
      }
      const closing = (this._bound || [server]).map((s) => new Promise((resolve) => s.close(() => resolve())));
      wss.close();
      await Promise.all(closing);
    },
  };
}

export async function main(argv = process.argv.slice(2)) {
  const port = Number(argv[0] || DEFAULT_PORT);
  const ts = tailscaleIpv4();
  const hosts = ["127.0.0.1"];
  if (ts && !hosts.includes(ts)) hosts.push(ts);
  const gateway = createNavigationGateway();
  await gateway.listen(port, hosts);
  process.stdout.write(`navigation-assistant-gateway listening ${hosts.map((h) => `${h}:${port}`).join(" ")} instance=${DEFAULT_INSTANCE}\n`);
  return gateway;
}

if (process.argv[1] && String(process.argv[1]).replaceAll("\\", "/").split("/").at(-1) === "navigation-assistant-gateway.js") {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
