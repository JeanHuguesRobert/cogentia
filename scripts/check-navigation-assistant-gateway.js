#!/usr/bin/env node
import assert from "node:assert/strict";
import { createNavigationGateway, isTailscaleOrLoopback } from "./ops/navigation-assistant-gateway.js";
import { WebSocket } from "ws";

assert.equal(isTailscaleOrLoopback("127.0.0.1"), true);
assert.equal(isTailscaleOrLoopback("::1"), true);
assert.equal(isTailscaleOrLoopback("100.84.109.87"), true);
assert.equal(isTailscaleOrLoopback("8.8.8.8"), false);
assert.equal(isTailscaleOrLoopback("11.0.0.1"), false);

const gateway = createNavigationGateway({ instance: "test" });
await gateway.listen(0, ["127.0.0.1"]);
const port = gateway._bound[0].address().port;

const health = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.json());
assert.equal(health.ok, true);
assert.equal(health.extensionConnected, false);

function open(path) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
    const queue = [];
    const waiters = [];
    ws.next = () => new Promise((res) => {
      if (queue.length) res(queue.shift());
      else waiters.push(res);
    });
    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (waiters.length) waiters.shift()(msg);
      else queue.push(msg);
    });
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

const assistant = await open("/assistant");
const hello = await assistant.next();
assert.equal(hello.type, "gateway.hello");
assert.equal(hello.extensionConnected, false);

assistant.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tabs.list", params: {} }));
const missing = await assistant.next();
assert.equal(missing.error.code, -32020);

const extension = await open("/extension");
const joined = await assistant.next();
assert.equal(joined.type, "gateway.extensionConnected");

assistant.send(JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tabs.list", params: {} }));
const forwarded = await extension.next();
assert.equal(forwarded.id, 7);
assert.equal(forwarded.method, "tabs.list");

extension.send(JSON.stringify({ jsonrpc: "2.0", id: 7, result: { tabs: [{ title: "x", url: "https://example.com/secret" }] } }));
const back = await assistant.next();
assert.equal(back.result.tabs[0].title, "x");

await gateway.close();
console.log("navigation assistant gateway: ok");
