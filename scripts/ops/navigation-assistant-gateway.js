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
          // Notifications are not shared across agents until explicit scoped subscriptions exist.
          if (sockets.extension.size === 1) broadcast("assistant", JSON.stringify(message));
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
