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
        const raw = data.toString();
        if (role === "extension") broadcast("assistant", raw);
        else if (role === "assistant") {
          if (sockets.extension.size === 0) {
            sendJson(ws, { jsonrpc: "2.0", error: { code: -32020, message: "hosted extension is not connected" } });
            return;
          }
          broadcast("extension", raw);
        }
      });
      ws.on("close", () => {
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
          bound.once("error", reject);
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
